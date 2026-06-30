/**
 * Chat UI constants - single source of truth (IND-145)
 *
 * Eliminuje magic numbers w hookach chat (useChat, generateImages cooldown).
 */

/**
 * Cooldown między generowaniem obrazów (ms) - wartość bazowa (poziom 3, "często").
 * Zachowana dla wstecznej kompatybilności / testów. Faktyczny cooldown w grze
 * jest dynamiczny, zależny od poziomu częstotliwości - patrz imageCooldownMsForLevel.
 */
export const IMAGE_COOLDOWN_MS = 20000;

/**
 * Twardy throttle generowania obrazów w zależności od poziomu częstotliwości
 * (0-3) wyliczonego z trybu narracji + suwaka (resolveImageLevel).
 * Im niższy poziom (więcej narracji), tym dłuższa przerwa = mniej obrazów.
 *   0 = minimalnie (90s) · 1 = rzadko (60s) · 2 = umiarkowanie (40s) · 3 = często (20s)
 */
export function imageCooldownMsForLevel(level: number): number {
  switch (level) {
    case 0:
      return 90000;
    case 1:
      return 60000;
    case 2:
      return 40000;
    default:
      return IMAGE_COOLDOWN_MS; // 20s (poziom 3)
  }
}

/**
 * 2026-06-28: twardy limit obrazów na JEDNĄ scenę (scena = lokacja). Obok cap
 * 1/turę (slice) i cooldownu międzyturowego (imageCooldownMsForLevel) - ten cap
 * OGRANICZA serię obrazów w obrębie jednej lokacji. Licznik zeruje się przy
 * zmianie lokacji (useChat). Sceny z <3 obrazami działają jak dotąd.
 */
export const MAX_IMAGES_PER_SCENE = 3;
