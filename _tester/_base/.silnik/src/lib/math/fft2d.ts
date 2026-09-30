/**
 * Dwuwymiarowa Szybka Transformata Fouriera (2D FFT Radix-2 Cooley-Tukey).
 * Czysta implementacja matematyczna bez zewnętrznych bibliotek (Clean-Room).
 */

/**
 * Zwraca najmniejszą potęgę dwójki większą bądź równą n.
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) {
    p <<= 1;
  }
  return p;
}

/**
 * Sprawdza czy liczba jest potęgą dwójki.
 */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Odwraca bity liczby n w k-bitowej przestrzeni (0 <= n < 2^k).
 */
function bitReverse(n: number, bits: number): number {
  let reversed = 0;
  for (let i = 0; i < bits; i++) {
    reversed = (reversed << 1) | (n & 1);
    n >>= 1;
  }
  return reversed;
}

/**
 * Jednowymiarowa transformata FFT Radix-2 Cooley-Tukey (in-place).
 * 
 * @param real Część rzeczywista wektora o długości n (n musi być potęgą 2).
 * @param imag Część urojona wektora o długości n.
 * @param inverse Flaga transformaty odwrotnej (IFFT).
 */
export function fft1d(real: Float32Array, imag: Float32Array, inverse = false): void {
  const n = real.length;
  if (!isPowerOfTwo(n)) {
    throw new Error(`Długość wektora FFT (${n}) musi być potęgą liczby 2.`);
  }

  const bits = Math.round(Math.log2(n));

  // Przestawienie bit-reversal
  for (let i = 0; i < n; i++) {
    const rev = bitReverse(i, bits);
    if (i < rev) {
      const tempR = real[i];
      real[i] = real[rev];
      real[rev] = tempR;

      const tempI = imag[i];
      imag[i] = imag[rev];
      imag[rev] = tempI;
    }
  }

  // Obliczenia motylkowe (Cooley-Tukey butterfly)
  const angleSign = inverse ? 1 : -1;

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (angleSign * 2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1.0;
      let wI = 0.0;

      for (let j = 0; j < halfLen; j++) {
        const uR = real[i + j];
        const uI = imag[i + j];

        const vIdx = i + j + halfLen;
        const vR = real[vIdx];
        const vI = imag[vIdx];

        // t = w * v
        const tR = wR * vR - wI * vI;
        const tI = wR * vI + wI * vR;

        real[i + j] = uR + tR;
        imag[i + j] = uI + tI;

        real[vIdx] = uR - tR;
        imag[vIdx] = uI - tI;

        // w = w * wStep
        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  // Normalizacja dla IFFT
  if (inverse) {
    const invN = 1.0 / n;
    for (let i = 0; i < n; i++) {
      real[i] *= invN;
      imag[i] *= invN;
    }
  }
}

export interface Complex2DMatrix {
  width: number;
  height: number;
  real: Float32Array;
  imag: Float32Array;
}

/**
 * Dwuwymiarowa transformata FFT (2D FFT) na macierzy o wymiarach width x height (potęgi 2).
 * Najpierw wykonuje 1D FFT wzdłuż każdego wiersza, a następnie wzdłuż każdej kolumny.
 */
export function fft2d(matrix: Complex2DMatrix, inverse = false): Complex2DMatrix {
  const { width, height, real, imag } = matrix;

  if (!isPowerOfTwo(width) || !isPowerOfTwo(height)) {
    throw new Error(`Wymiary macierzy (${width}x${height}) muszą być potęgami liczby 2.`);
  }

  // 1. Przetwarzanie wierszy (row-wise 1D FFT)
  const rowReal = new Float32Array(width);
  const rowImag = new Float32Array(width);

  for (let y = 0; y < height; y++) {
    const offset = y * width;
    for (let x = 0; x < width; x++) {
      rowReal[x] = real[offset + x];
      rowImag[x] = imag[offset + x];
    }

    fft1d(rowReal, rowImag, inverse);

    for (let x = 0; x < width; x++) {
      real[offset + x] = rowReal[x];
      imag[offset + x] = rowImag[x];
    }
  }

  // 2. Przetwarzanie kolumn (column-wise 1D FFT)
  const colReal = new Float32Array(height);
  const colImag = new Float32Array(height);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      colReal[y] = real[idx];
      colImag[y] = imag[idx];
    }

    fft1d(colReal, colImag, inverse);

    for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      real[idx] = colReal[y];
      imag[idx] = colImag[y];
    }
  }

  return matrix;
}

/**
 * Oblicza widmo mocy (Power Spectrum): P[y, x] = real[y, x]^2 + imag[y, x]^2.
 */
export function computePowerSpectrum(matrix: Complex2DMatrix): Float32Array {
  const { width, height, real, imag } = matrix;
  const power = new Float32Array(width * height);

  for (let i = 0; i < power.length; i++) {
    power[i] = real[i] * real[i] + imag[i] * imag[i];
  }

  return power;
}

/**
 * Przesunięcie widma fouriera (fftshift): przesuwa częstotliwość zerową (DC) do środka macierzy.
 */
export function fftShift2d(
  data: Float32Array,
  width: number,
  height: number
): Float32Array {
  const shifted = new Float32Array(width * height);
  const halfW = width >> 1;
  const halfH = height >> 1;

  for (let y = 0; y < height; y++) {
    const newY = (y + halfH) % height;
    for (let x = 0; x < width; x++) {
      const newX = (x + halfW) % width;
      shifted[newY * width + newX] = data[y * width + x];
    }
  }

  return shifted;
}
