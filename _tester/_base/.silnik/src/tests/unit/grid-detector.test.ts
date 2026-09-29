/**
 * Testy jednostkowe dla autodetekcji siatki i estymacji skali planów metodą 2D FFT.
 */

import {
  nextPowerOfTwo,
  isPowerOfTwo,
  fft1d,
  fft2d,
  computePowerSpectrum,
  fftShift2d,
  Complex2DMatrix,
} from '../../lib/math/fft2d';
import {
  detectGridAndScale,
  extractLuminance,
} from '../../lib/maps/grid-detector';

describe('fft2d (Radix-2 Cooley-Tukey)', () => {
  test('poprawnie wyznacza potęgi dwójki', () => {
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(2)).toBe(true);
    expect(isPowerOfTwo(64)).toBe(true);
    expect(isPowerOfTwo(65)).toBe(false);
    expect(isPowerOfTwo(0)).toBe(false);

    expect(nextPowerOfTwo(10)).toBe(16);
    expect(nextPowerOfTwo(64)).toBe(64);
    expect(nextPowerOfTwo(250)).toBe(256);
  });

  test('1D FFT impulsu jednostkowego daje stałą amplitudę', () => {
    const n = 8;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    real[0] = 1.0;

    fft1d(real, imag, false);

    for (let i = 0; i < n; i++) {
      expect(real[i]).toBeCloseTo(1.0, 5);
      expect(imag[i]).toBeCloseTo(0.0, 5);
    }
  });

  test('1D IFFT odwraca transformatę FFT do stanu początkowego', () => {
    const n = 16;
    const original = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const real = new Float32Array(original);
    const imag = new Float32Array(n);

    fft1d(real, imag, false);
    fft1d(real, imag, true);

    for (let i = 0; i < n; i++) {
      expect(real[i]).toBeCloseTo(original[i], 4);
      expect(imag[i]).toBeCloseTo(0.0, 4);
    }
  });

  test('2D FFT poprawnie przetwarza macierz 4x4', () => {
    const width = 4;
    const height = 4;
    const real = new Float32Array(width * height);
    const imag = new Float32Array(width * height);
    real[0] = 16.0; // Impuls w lewym górnym rogu

    const matrix: Complex2DMatrix = { width, height, real, imag };
    fft2d(matrix, false);

    const power = computePowerSpectrum(matrix);
    for (let i = 0; i < power.length; i++) {
      expect(power[i]).toBeCloseTo(256.0, 2);
    }
  });

  test('fftShift2d przenosi składową DC do środka macierzy', () => {
    const w = 4;
    const h = 4;
    const data = new Float32Array(w * h);
    data[0] = 99.0; // DC w (0, 0)

    const shifted = fftShift2d(data, w, h);
    // Po przesunięciu o w/2=2, h/2=2, wartość powinna być w (2, 2) => index 2 * 4 + 2 = 10
    expect(shifted[10]).toBe(99.0);
    expect(shifted[0]).toBe(0.0);
  });
});

describe('grid-detector (Detekcja siatki i estymacja skali planów)', () => {
  test('wyodrębnia poprawnie luminancję z bufora RGBA', () => {
    const width = 2;
    const height = 2;
    // 4 piksele: biały, czarny, czerwony, zielony
    const data = new Uint8Array([
      255, 255, 255, 255, // biały: Y = 1.0
      0, 0, 0, 255,       // czarny: Y = 0.0
      255, 0, 0, 255,     // czerwony: Y = 0.299
      0, 255, 0, 255,     // zielony: Y = 0.587
    ]);

    const result = extractLuminance({ width, height, data });
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.luminance[0]).toBeCloseTo(1.0, 2);
    expect(result.luminance[1]).toBeCloseTo(0.0, 2);
    expect(result.luminance[2]).toBeCloseTo(0.299, 2);
    expect(result.luminance[3]).toBeCloseTo(0.587, 2);
  });

  test('wykrywa syntetyczną regularną siatkę 32px na planie 512x512', () => {
    const width = 512;
    const height = 512;
    const cellSize = 32;
    const luminance = new Float32Array(width * height);

    // Wypełnij tło jasnym kolorem, a linie siatki ciemnym
    luminance.fill(0.9);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x % cellSize === 0 || y % cellSize === 0) {
          luminance[y * width + x] = 0.1;
        }
      }
    }

    const result = detectGridAndScale(
      { width, height, luminance },
      { fftSize: 256, minCellSizePx: 16, maxCellSizePx: 128 }
    );

    expect(result.hasGrid).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.35);
    expect(result.cellSizePx).toBeGreaterThanOrEqual(30);
    expect(result.cellSizePx).toBeLessThanOrEqual(34);
    expect(result.gridDimensions?.cols).toBe(16); // 512 / 32 = 16
    expect(result.gridDimensions?.rows).toBe(16);
    expect(result.scaleNarrative).toBeDefined();
    expect(result.scaleNarrative?.promptDirectivePl).toContain('1 kratka to ok. 1.5 m');
    expect(result.scaleNarrative?.promptDirectivePl).toContain('2 kroki');
    expect(result.scaleNarrative?.promptDirectiveEn).toContain('1 square is approx. 1.5 m');
  });

  test('wykrywa siatkę 64px podaną w formacie RGBA', () => {
    const width = 512;
    const height = 512;
    const cellSize = 64;
    const data = new Uint8Array(width * height * 4);

    // Tło białe (240), linie siatki ciemne (30)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const isLine = x % cellSize === 0 || y % cellSize === 0;
        const val = isLine ? 30 : 240;
        data[offset] = val;
        data[offset + 1] = val;
        data[offset + 2] = val;
        data[offset + 3] = 255;
      }
    }

    const result = detectGridAndScale(
      { width, height, data },
      { fftSize: 256, minCellSizePx: 20, maxCellSizePx: 150 }
    );

    expect(result.hasGrid).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.35);
    expect(result.cellSizePx).toBeGreaterThanOrEqual(60);
    expect(result.cellSizePx).toBeLessThanOrEqual(68);
    expect(result.gridDimensions?.cols).toBe(8); // 512 / 64 = 8
    expect(result.gridDimensions?.rows).toBe(8);
    expect(result.scaleNarrative?.totalWidthMeters).toBe(12); // 8 * 1.5m = 12m
  });

  test('odrzuca obraz bez siatki (losowy szum organiczny)', () => {
    const width = 256;
    const height = 256;
    const luminance = new Float32Array(width * height);

    // Szum pseudolosowy
    let seed = 12345;
    for (let i = 0; i < luminance.length; i++) {
      seed = (seed * 16807) % 2147483647;
      luminance[i] = (seed % 1000) / 1000.0;
    }

    const result = detectGridAndScale(
      { width, height, luminance },
      { fftSize: 256, confidenceThreshold: 0.4 }
    );

    expect(result.hasGrid).toBe(false);
    expect(result.cellSizePx).toBeUndefined();
    expect(result.scaleNarrative).toBeUndefined();
  });

  test('rzuca błąd gdy wymiar wektora FFT nie jest potęgą dwójki', () => {
    const real = new Float32Array(10);
    const imag = new Float32Array(10);
    expect(() => fft1d(real, imag)).toThrow(/musi być potęgą liczby 2/);
  });

  test('rzuca błąd gdy wymiary macierzy 2D FFT nie są potęgami dwójki', () => {
    const matrix: Complex2DMatrix = {
      width: 10,
      height: 16,
      real: new Float32Array(160),
      imag: new Float32Array(160),
    };
    expect(() => fft2d(matrix)).toThrow(/muszą być potęgami liczby 2/);
  });

  test('wykrywa siatkę 40px na prostokątnej mapie 800x600 z niestandardową skalą', () => {
    const width = 800;
    const height = 600;
    const cellSize = 40;
    const luminance = new Float32Array(width * height);
    luminance.fill(0.85);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x % cellSize === 0 || y % cellSize === 0) {
          luminance[y * width + x] = 0.15;
        }
      }
    }

    const result = detectGridAndScale(
      { width, height, luminance },
      {
        fftSize: 256,
        minCellSizePx: 20,
        maxCellSizePx: 80,
        metersPerCell: 2.0,
        stepsPerCell: 3.0,
      }
    );

    expect(result.hasGrid).toBe(true);
    expect(result.cellSizePx).toBeGreaterThanOrEqual(38);
    expect(result.cellSizePx).toBeLessThanOrEqual(42);
    expect(result.gridDimensions?.cols).toBe(20); // 800 / 40 = 20
    expect(result.gridDimensions?.rows).toBe(15); // 600 / 40 = 15
    expect(result.scaleNarrative?.metersPerCell).toBe(2.0);
    expect(result.scaleNarrative?.totalWidthMeters).toBe(40); // 20 * 2.0m = 40m
    expect(result.scaleNarrative?.totalHeightMeters).toBe(30); // 15 * 2.0m = 30m
    expect(result.scaleNarrative?.promptDirectivePl).toContain('1 kratka to ok. 2 m');
    expect(result.scaleNarrative?.promptDirectivePl).toContain('3 kroki');
  });
});

