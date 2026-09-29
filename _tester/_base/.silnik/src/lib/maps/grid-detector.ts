/**
 * Detekcja siatki i estymacja skali planów lokacji metodą 2D FFT.
 * 
 * Analizuje luminancję planu/handoutu, wykrywa dominujące częstotliwości
 * harmoniczne kratki i generuje diegetyczne wytyczne skali dla promptu Mistrza Gry.
 */

import {
  fft2d,
  computePowerSpectrum,
  nextPowerOfTwo,
  Complex2DMatrix,
} from '../math/fft2d';

export interface ImageLuminanceInput {
  width: number;
  height: number;
  /**
   * Znormalizowana luminancja (0.0 do 1.0) lub surowe wartości pikseli (0 do 255).
   * Długość tablicy musi wynosić width * height.
   */
  luminance: Float32Array | Uint8Array | Uint8ClampedArray;
}

export interface ImageRgbaInput {
  width: number;
  height: number;
  /**
   * Surowe piksele RGBA (4 bajty na piksel).
   * Długość tablicy: width * height * 4.
   */
  data: Uint8Array | Uint8ClampedArray;
}

export type GridDetectorInput = ImageLuminanceInput | ImageRgbaInput;

export interface GridDetectorOptions {
  /** Rozmiar macierzy FFT (potęga dwójki, domyślnie 256) */
  fftSize?: number;
  /** Minimalny oczekiwany rozmiar komórki w pikselach (domyślnie 15 px) */
  minCellSizePx?: number;
  /** Maksymalny oczekiwany rozmiar komórki w pikselach (domyślnie 300 px) */
  maxCellSizePx?: number;
  /** Próg ufności uznania, że plan posiada regularną siatkę (0.0 - 1.0, domyślnie 0.35) */
  confidenceThreshold?: number;
  /** Metry na jedną kratkę (domyślnie 1.5 m) */
  metersPerCell?: number;
  /** Stopy na jedną kratkę (domyślnie 5 ft) */
  feetPerCell?: number;
  /** Kroki dorosłego człowieka na kratkę (domyślnie 2) */
  stepsPerCell?: number;
}

export interface ScaleNarrative {
  metersPerCell: number;
  feetPerCell: number;
  humanStepsPerCell: number;
  totalWidthMeters: number;
  totalHeightMeters: number;
  /** Diegetyczna dyrektywa zasilająca prompt Mistrza Gry */
  promptDirectivePl: string;
  promptDirectiveEn: string;
}

export interface GridDetectionResult {
  hasGrid: boolean;
  confidence: number;
  cellSizePx?: number;
  cellSizeX?: number;
  cellSizeY?: number;
  gridDimensions?: {
    cols: number;
    rows: number;
  };
  scaleNarrative?: ScaleNarrative;
}

/**
 * Wyodrębnia znormalizowaną luminancję z wejścia RGBA lub Luminance.
 */
export function extractLuminance(input: GridDetectorInput): {
  width: number;
  height: number;
  luminance: Float32Array;
} {
  const { width, height } = input;
  const count = width * height;
  const luminance = new Float32Array(count);

  if ('data' in input) {
    const rgba = input.data;
    for (let i = 0; i < count; i++) {
      const offset = i * 4;
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      // ITU-R BT.601 standard luminance
      luminance[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
    }
  } else {
    const raw = input.luminance;
    let maxVal = 0;
    for (let i = 0; i < Math.min(count, 100); i++) {
      if (raw[i] > maxVal) maxVal = raw[i];
    }
    const isByteScale = maxVal > 1.0;

    for (let i = 0; i < count; i++) {
      luminance[i] = isByteScale ? raw[i] / 255.0 : raw[i];
    }
  }

  return { width, height, luminance };
}

/**
 * Przeskalowuje obraz luminancji do kwadratowej siatki N x N (potęga dwójki).
 * Używa uśredniania obszarowego (box filter) dla ochrony cienkich linii siatki przed aliasingiem.
 */
function resampleToPowerOfTwo(
  src: Float32Array,
  srcW: number,
  srcH: number,
  targetSize: number
): Float32Array {
  const dst = new Float32Array(targetSize * targetSize);
  const scaleX = srcW / targetSize;
  const scaleY = srcH / targetSize;

  for (let y = 0; y < targetSize; y++) {
    const y0 = Math.floor(y * scaleY);
    const y1 = Math.max(y0 + 1, Math.min(srcH, Math.floor((y + 1) * scaleY)));
    const rowOffset = y * targetSize;

    for (let x = 0; x < targetSize; x++) {
      const x0 = Math.floor(x * scaleX);
      const x1 = Math.max(x0 + 1, Math.min(srcW, Math.floor((x + 1) * scaleX)));

      let sum = 0;
      let count = 0;
      for (let sy = y0; sy < y1; sy++) {
        const srcRow = sy * srcW;
        for (let sx = x0; sx < x1; sx++) {
          sum += src[srcRow + sx];
          count++;
        }
      }

      dst[rowOffset + x] = count > 0 ? sum / count : src[y0 * srcW + x0];
    }
  }

  return dst;
}

interface AxisPeakResult {
  bestFreqBin: number;
  peakPower: number;
  confidence: number;
  cellSizeOrigPx: number;
}

/**
 * Pomocniczy odczyt wartości widma w punkcie k z ochroną granic.
 */
function getSpectrumVal(spectrum: Float32Array, k: number, maxIdx: number): number {
  if (k < 0 || k > maxIdx) return 0;
  return spectrum[k];
}

/**
 * Zwraca maksymalną wartość w otoczeniu binów [k-1, k, k+1].
 */
function getLocalPeak(spectrum: Float32Array, k: number, maxIdx: number): number {
  return Math.max(
    getSpectrumVal(spectrum, k - 1, maxIdx),
    getSpectrumVal(spectrum, k, maxIdx),
    getSpectrumVal(spectrum, k + 1, maxIdx)
  );
}

/**
 * Szuka dominującej częstotliwości podstawowej (fundamental frequency) w 1D profilu widma mocy.
 * Zabezpiecza przed fałszywym wyborem wyższych harmonicznych (2k, 3k) zamiast częstotliwości bazowej.
 */
function findDominantFrequency(
  spectrum1D: Float32Array,
  fftSize: number,
  origDimension: number,
  minCellPx: number,
  maxCellPx: number
): AxisPeakResult {
  const half = fftSize >> 1;
  const maxIdx = half - 1;

  // k = origDimension / cellSizeOrig
  const minK = Math.max(1, Math.floor(origDimension / maxCellPx));
  const maxK = Math.min(maxIdx, Math.ceil(origDimension / minCellPx));

  if (minK > maxK) {
    return { bestFreqBin: 0, peakPower: 0, confidence: 0, cellSizeOrigPx: 0 };
  }

  // Średnia wartość tła
  let sum = 0;
  let count = 0;
  for (let k = minK; k <= maxK; k++) {
    sum += spectrum1D[k];
    count++;
  }
  const mean = count > 0 ? sum / count : 1;

  // 1. Wyznaczenie kandydata z najwyższym wynikiem harmonicznym (Harmonic Summation)
  let bestScore = -1;
  let bestCandidateK = 0;

  for (let k = minK; k <= maxK; k++) {
    const p1 = spectrum1D[k];
    if (p1 <= mean) continue;

    // Suma ważona harmonicznych (k, 2k, 3k, 4k)
    const p2 = getLocalPeak(spectrum1D, k * 2, maxIdx);
    const p3 = getLocalPeak(spectrum1D, k * 3, maxIdx);
    const p4 = getLocalPeak(spectrum1D, k * 4, maxIdx);

    const harmonicScore = p1 + 0.6 * p2 + 0.4 * p3 + 0.2 * p4;

    if (harmonicScore > bestScore) {
      bestScore = harmonicScore;
      bestCandidateK = k;
    }
  }

  if (bestCandidateK === 0) {
    return { bestFreqBin: 0, peakPower: 0, confidence: 0, cellSizeOrigPx: 0 };
  }

  // 2. Weryfikacja subharmonicznych (odrzucenie przetaktowania na wyższe harmoniczne)
  let fundamentalK = bestCandidateK;
  for (const divisor of [4, 3, 2]) {
    const subK = Math.round(bestCandidateK / divisor);
    if (subK >= minK) {
      const subPower = getLocalPeak(spectrum1D, subK, maxIdx);
      // Jeśli subharmoniczna ma wyraźną energię ponad tło (> 1.4 * mean) i stanowi min. 20% energii kandydata
      if (subPower > mean * 1.4 && subPower >= 0.2 * spectrum1D[bestCandidateK]) {
        // Znajdź dokładny lokalny szczyt wokół subK
        let maxSubVal = -1;
        let exactSubK = subK;
        for (let delta = -1; delta <= 1; delta++) {
          const checkK = subK + delta;
          if (checkK >= minK && checkK <= maxK) {
            const v = spectrum1D[checkK];
            if (v > maxSubVal) {
              maxSubVal = v;
              exactSubK = checkK;
            }
          }
        }
        fundamentalK = exactSubK;
        break;
      }
    }
  }

  // 3. Interpolacja paraboliczna wokół fundamentalK dla precyzyjnego rozmiaru komórki
  const val = spectrum1D[fundamentalK];
  const valLeft = getSpectrumVal(spectrum1D, fundamentalK - 1, maxIdx);
  const valRight = getSpectrumVal(spectrum1D, fundamentalK + 1, maxIdx);

  let deltaK = 0;
  const denom = 2 * (2 * val - valLeft - valRight);
  if (denom > 1e-6) {
    deltaK = (valRight - valLeft) / denom;
    if (deltaK < -0.5) deltaK = -0.5;
    if (deltaK > 0.5) deltaK = 0.5;
  }
  const refinedK = fundamentalK + deltaK;

  const peakToMean = mean > 0 ? val / mean : 0;
  const rawConfidence = Math.min(1.0, Math.max(0.0, (peakToMean - 1.2) / 3.0));
  const cellSizeOrigPx = refinedK > 0 ? origDimension / refinedK : 0;

  return {
    bestFreqBin: fundamentalK,
    peakPower: val,
    confidence: rawConfidence,
    cellSizeOrigPx,
  };
}

/**
 * Główna funkcja detekcji siatki 2D FFT i estymacji skali planów.
 */
export function detectGridAndScale(
  input: GridDetectorInput,
  options: GridDetectorOptions = {}
): GridDetectionResult {
  const {
    fftSize = 256,
    minCellSizePx = 15,
    maxCellSizePx = 300,
    confidenceThreshold = 0.35,
    metersPerCell = 1.5,
    feetPerCell = 5.0,
    stepsPerCell = 2.0,
  } = options;

  const validFftSize = nextPowerOfTwo(fftSize);
  const { width, height, luminance } = extractLuminance(input);

  // 1. Resampling do kwadratu potęgi dwójki (np. 256 x 256)
  const resampled = resampleToPowerOfTwo(luminance, width, height, validFftSize);

  // 2. Normalizacja: usunięcie składowej stałej (DC offset) przez odjęcie średniej
  let meanLum = 0;
  const totalPixels = validFftSize * validFftSize;
  for (let i = 0; i < totalPixels; i++) {
    meanLum += resampled[i];
  }
  meanLum /= totalPixels;

  const real = new Float32Array(totalPixels);
  const imag = new Float32Array(totalPixels);

  // Delikatne okno Hann dla zmniejszenia wycieku widmowego przy krawędziach
  for (let y = 0; y < validFftSize; y++) {
    const winY = 0.5 * (1 - Math.cos((2 * Math.PI * y) / (validFftSize - 1)));
    const offset = y * validFftSize;
    for (let x = 0; x < validFftSize; x++) {
      const winX = 0.5 * (1 - Math.cos((2 * Math.PI * x) / (validFftSize - 1)));
      const windowFactor = winX * winY;
      real[offset + x] = (resampled[offset + x] - meanLum) * windowFactor;
      imag[offset + x] = 0;
    }
  }

  // 3. Obliczenie 2D FFT
  const matrix: Complex2DMatrix = {
    width: validFftSize,
    height: validFftSize,
    real,
    imag,
  };
  fft2d(matrix, false);

  // 4. Obliczenie widma mocy
  const power = computePowerSpectrum(matrix);

  // 5. Rzutowanie widma na osie X i Y (Profile harmoniczne)
  const half = validFftSize >> 1;
  const specX = new Float32Array(half);
  const specY = new Float32Array(half);

  // Dla osi X (pionowe linie siatki generują częstotliwości wzdłuż X)
  for (let u = 0; u < half; u++) {
    let sum = 0;
    for (let v = 0; v < validFftSize; v++) {
      sum += power[v * validFftSize + u];
    }
    specX[u] = sum;
  }

  // Dla osi Y (poziome linie siatki generują częstotliwości wzdłuż Y)
  for (let v = 0; v < half; v++) {
    let sum = 0;
    for (let u = 0; u < validFftSize; u++) {
      sum += power[v * validFftSize + u];
    }
    specY[v] = sum;
  }

  // 6. Detekcja szczytów harmonicznych w osi X i Y
  const peakX = findDominantFrequency(
    specX,
    validFftSize,
    width,
    minCellSizePx,
    maxCellSizePx
  );
  const peakY = findDominantFrequency(
    specY,
    validFftSize,
    height,
    minCellSizePx,
    maxCellSizePx
  );

  // Średnia ufność z obu osi
  const avgConfidence = (peakX.confidence + peakY.confidence) / 2.0;

  // Sprawdź czy proporcja komórki X do Y jest zbliżona do kwadratu (w granicach 25%)
  const ratio =
    peakX.cellSizeOrigPx > 0 && peakY.cellSizeOrigPx > 0
      ? peakX.cellSizeOrigPx / peakY.cellSizeOrigPx
      : 0;
  const isSquareAspect = ratio >= 0.75 && ratio <= 1.33;

  const finalConfidence = isSquareAspect ? avgConfidence : avgConfidence * 0.5;

  if (finalConfidence < confidenceThreshold || peakX.cellSizeOrigPx === 0 || peakY.cellSizeOrigPx === 0) {
    return {
      hasGrid: false,
      confidence: Math.round(finalConfidence * 100) / 100,
    };
  }

  // Obliczenie uśrednionego rozmiaru kratki
  const avgCellPx = Math.round((peakX.cellSizeOrigPx + peakY.cellSizeOrigPx) / 2.0);
  const cols = Math.max(1, Math.round(width / avgCellPx));
  const rows = Math.max(1, Math.round(height / avgCellPx));

  const totalWidthMeters = Math.round(cols * metersPerCell * 10) / 10;
  const totalHeightMeters = Math.round(rows * metersPerCell * 10) / 10;

  // Przygotowanie diegetycznej narracji skali dla promptu MG
  const promptDirectivePl =
    `[SKALA_LOKACJI] Wykryto siatkę planu: 1 kratka to ok. ${metersPerCell} m ` +
    `(${stepsPerCell} kroki dorosłego człowieka / ok. ${feetPerCell} stóp). ` +
    `Wymiary całej lokacji: ok. ${cols}x${rows} kratek (${totalWidthMeters} x ${totalHeightMeters} m). ` +
    `Opisując dystans i rozmiary pomieszczeń, używaj metrów lub kroków, unikając żargonu planszowego.`;

  const promptDirectiveEn =
    `[LOCATION_SCALE] Map grid detected: 1 square is approx. ${metersPerCell} m ` +
    `(${stepsPerCell} paces / approx. ${feetPerCell} ft). ` +
    `Total area dimensions: approx. ${cols}x${rows} squares (${totalWidthMeters} x ${totalHeightMeters} m). ` +
    `When narrating distances and room dimensions, use meters or steps, avoiding tactical tabletop jargon.`;

  return {
    hasGrid: true,
    confidence: Math.round(finalConfidence * 100) / 100,
    cellSizePx: avgCellPx,
    cellSizeX: Math.round(peakX.cellSizeOrigPx),
    cellSizeY: Math.round(peakY.cellSizeOrigPx),
    gridDimensions: {
      cols,
      rows,
    },
    scaleNarrative: {
      metersPerCell,
      feetPerCell,
      humanStepsPerCell: stepsPerCell,
      totalWidthMeters,
      totalHeightMeters,
      promptDirectivePl,
      promptDirectiveEn,
    },
  };
}
