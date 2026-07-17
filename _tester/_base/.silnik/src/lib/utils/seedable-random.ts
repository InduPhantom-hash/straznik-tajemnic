/**
 * Seedable RNG — mulberry32 PRNG
 *
 * Default behavior (no seed) = `Math.random` passthrough (backward compat).
 * Z seed = deterministic mulberry32 sequence (sesja replay deterministyczna).
 *
 * Wzorzec: per-call rng instance dla każdego "rzutu kośćmi" w random character /
 * character development. Caller tworzy `const rng = createSeededRandom(seed)` raz,
 * potem wywołuje `rng()` wielokrotnie — sekwencja deterministyczna gdy seed podany.
 *
 * IND-127 B5: 17× Math.random non-seedable w random-character-generator + character-development.
 */

/**
 * Mulberry32 PRNG (Tommy Ettinger, public domain).
 * Bardzo lekki (12 lin), dobry dla testów regresji + sesja replay.
 * NIE używaj dla crypto — to NIE jest cryptographic random.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tworzy RNG funkcję — z seed deterministyczne mulberry32, bez seed Math.random.
 *
 * @param seed - opcjonalny seed (integer). Bez seed → Math.random.
 * @returns funkcja zwracająca [0, 1)
 *
 * @example
 *   const rng = createSeededRandom(42);
 *   const roll = Math.floor(rng() * 6) + 1; // deterministic
 */
export function createSeededRandom(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  return mulberry32(seed);
}
