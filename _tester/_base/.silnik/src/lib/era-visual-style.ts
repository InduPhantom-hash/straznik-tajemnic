/**
 * Wspólny język koloru dla renderów i portretów. Profil jest subtelny - obraz
 * pozostaje czytelny, ale od razu sygnalizuje epokę zamiast udawać współczesne
 * zdjęcie z przypadkową sepią.
 */

export type EraVisualProfile =
  | '1890s'
  | '1920s'
  | '1940s'
  | 'prl-1970s'
  | 'modern';

const ERA_IMAGE_FILTERS: Record<EraVisualProfile, string> = {
  '1890s': 'sepia(0.5) saturate(0.58) contrast(1.06) brightness(0.96)',
  '1920s': 'sepia(0.22) saturate(0.76) contrast(1.04) brightness(0.98)',
  '1940s': 'sepia(0.1) saturate(0.56) contrast(1.1) brightness(0.94)',
  'prl-1970s': 'sepia(0.08) saturate(0.7) contrast(0.96) brightness(0.98)',
  modern: 'none',
};

/** Obsługuje zarówno identyfikatory, jak i lata przekazywane przez starsze widoki. */
export function resolveEraVisualProfile(
  eraOrYear: string | undefined
): EraVisualProfile {
  const value = eraOrYear?.toLowerCase() ?? '';
  if (value === 'gaslight' || /^189\d/.test(value)) return '1890s';
  if (value === 'classic' || /^(?:192|193)\d/.test(value)) return '1920s';
  if (value === 'noir' || /^194\d/.test(value)) return '1940s';
  if (value === 'prl' || /prl/.test(value) || /^(?:196|197|198)\d/.test(value))
    return 'prl-1970s';
  if (value === 'modern' || /^(?:19\d{2}|20\d{2})/.test(value)) return 'modern';
  return '1920s';
}

export function getEraImageFilter(eraOrYear: string | undefined): string {
  return ERA_IMAGE_FILTERS[resolveEraVisualProfile(eraOrYear)];
}

/** Tekstowy odpowiednik filtra, używany przez generatory obrazów. */
export function getEraColorDirection(eraOrYear: string | undefined): string {
  switch (resolveEraVisualProfile(eraOrYear)) {
    case '1890s':
      return 'muted sepia monochrome, warm archival print character';
    case '1920s':
      return 'warm, slightly faded early color film, restrained sepia undertone';
    case '1940s':
      return 'muted wartime color photography, low saturation and firm contrast';
    case 'prl-1970s':
      return 'faded 1970s Eastern European analog color, subdued reds and greens';
    case 'modern':
      return 'neutral full color, true-to-life saturation and white balance';
  }
}
