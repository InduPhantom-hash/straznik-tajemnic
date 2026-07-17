/**
 * buildHandoutsContext - sekcja promptu z realnymi handoutami aktywnej przygody
 * (DriveThruRPG: mapy/dokumenty w public/handouts/).
 *
 * MG dostaje listę dostępnych handoutów + DOKŁADNY markdown obrazu do skopiowania.
 * Gdy scena tego wymaga (gracze znajdują mapę, dostają list), MG wstawia ten markdown
 * w narracji - istniejący renderer obrazów (render-narrative-with-images) pokazuje
 * realny skan zamiast obrazu generowanego przez AI. Zero zmian w komponentach czatu.
 *
 * Pure function, bez side effects. Pusty string gdy przygoda nie ma handoutów.
 */
import type { AdventureHandout } from '@/lib/adventures-data';

export function buildHandoutsContext(
  handouts?: AdventureHandout[] | null
): string {
  if (!handouts || handouts.length === 0) return '';

  const list = handouts
    .map((h) => `- ${h.title} → wstaw dokładnie: \`![${h.title}](${h.image})\``)
    .join('\n');

  return (
    `\n## DOSTĘPNE HANDOUTY (realne dokumenty tej przygody)\n` +
    `Masz prawdziwe materiały do POKAZANIA graczom (mapy, dokumenty, listy). Reguły:\n` +
    `- Wstaw handout TYLKO gdy postacie fizycznie go widzą/otrzymują w fikcji (znajdują mapę, dostają kopertę).\n` +
    `- Użyj DOKŁADNIE podanego markdownu (skopiuj 1:1) w osobnej linii, po opisie sceny.\n` +
    `- NIE wymyślaj własnych ścieżek ani handoutów spoza tej listy. Każdy pokaż maksymalnie raz, w naturalnym momencie.\n\n` +
    list
  );
}
