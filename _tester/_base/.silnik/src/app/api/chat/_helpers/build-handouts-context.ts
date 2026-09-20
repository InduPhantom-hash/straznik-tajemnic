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
import type { AdventureHandout, AdventurePuzzle } from '@/lib/adventures-data';

export function buildHandoutsContext(
  handouts?: AdventureHandout[] | null,
  puzzles?: AdventurePuzzle[] | null
): string {
  let context = '';

  if (handouts && handouts.length > 0) {
    const list = handouts
      .map((h) => `- ${h.title} → wstaw dokładnie: \`![${h.title}](${h.image})\``)
      .join('\n');

    context += (
      `\n## DOSTĘPNE HANDOUTY (realne dokumenty tej przygody)\n` +
      `Masz prawdziwe materiały do POKAZANIA graczom (mapy, dokumenty, listy). Reguły:\n` +
      `- Wstaw handout TYLKO gdy postacie fizycznie go widzą/otrzymują w fikcji (znajdują mapę, dostają kopertę).\n` +
      `- Użyj DOKŁADNIE podanego markdownu (skopiuj 1:1) w osobnej linii, po opisie sceny.\n` +
      `- NIE wymyślaj własnych ścieżek ani handoutów spoza tej listy. Każdy pokaż maksymalnie raz, w naturalnym momencie.\n\n` +
      list + '\n'
    );
  }

  if (puzzles && puzzles.length > 0) {
    const puzzleList = puzzles
      .map((p) => {
        const clues = (p.clues || []).map((c) => `  * Poszlaka: ${c}`).join('\n');
        return `### Zagadka: ${p.title}\n- Opis: ${p.description}\n- Rozwiązanie (Tylko dla MG): ${p.solutionSummary}\n- Poszlaki:\n${clues}\n- Reguła Idea Roll (RAW CoC 7e): ${p.ideaRollPrompt}`;
      })
      .join('\n\n');

    context += (
      `\n## ZAGADKI LOGICZNE I ŁAMIGŁÓWKI ŚLEDZTWA (RAW)\n` +
      `Scenariusz zawiera zdefiniowane wyzwania dedukcyjne dla graczy:\n` +
      `- Nie zdradzaj rozwiązania od razu! Pozwól graczom analizować zebrane materiały (handouty) i dedukować.\n` +
      `- ZASADA IDEA ROLL (Rzut na Pomysł - INT): Jeśli gracze utkną lub deklarują próbę dedukcji/powiązania faktów, zaproponuj Rzut na Pomysł (Idea Roll).\n` +
      `- ZASADA FAIL-FORWARD: Sukces w Idea Roll oznacza bezpośrednią dedukcję/wskazówkę. Porażka w rzucie na pomysł RÓWNIEŻ popycha śledztwo naprzód (gracze wpadają na trop), ale sprowadza natychmiastowe zagrożenie lub komplikację (zasadzka, alarm, utrata cennego czasu).\n\n` +
      puzzleList + '\n'
    );
  }

  return context;
}
