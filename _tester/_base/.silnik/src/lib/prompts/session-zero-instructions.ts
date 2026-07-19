import type { SessionZeroSettings } from '../ai-settings/types';

type SessionZeroPromptSettings = Pick<
  SessionZeroSettings,
  | 'tone'
  | 'difficulty'
  | 'narrativeMode'
  | 'lines'
  | 'veils'
  | 'safetyWord'
  | 'completed'
>;

export const TONE_INSTRUCTIONS: Record<string, string> = {
  purist: `
## STYL NARRACJI: PURYSTYCZNY
- Trzymaj się realizmu i psychologicznego horroru
- Horror pochodzi z ludzkiej psychiki i niemożności zrozumienia kosmosu
- Unikaj akcji filmowej, skup się na atmosferze i napięciu
- Śmierć jest realna i ostateczna - brak "deus ex machina"
- Mistyczne istoty są niewytłumaczalne, nie do pokonania siłą`,

  pulp: `
## STYL NARRACJI: PULPOWY
- Dopuszczaj heroizm i epickie sceny akcji
- Postaci mogą być "większe niż życie"
- Więcej szans na sukces, bardziej cinematograficzne sceny
- Horror miesza się z przygodą i akcją
- Możliwe są desperackie ucieczki i cudowne ocalenia`,

  noir: `
## STYL NARRACJI: NOIR
- Mroczna, cyniczna atmosfera moralnej szarości
- Wszyscy mają ukryte motywy, nikt nie jest całkowicie niewinny
- Dużo dialogów, tajemnic, podwójnych gier
- Klimat filmów detektywistycznych lat 20-40
- Postaci mierzą się z własnymi demonami równie często jak z kosmicznymi`,

  neutral: '',
};

export const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  easy: `
## POZIOM TRUDNOŚCI: ŁATWY
- Dawaj subtelne podpowiedzi narracyjne gdy gracz utknął
- Progi trudności standardowe lub obniżone
- Konsekwencje porażek łagodne, druga szansa na ważne momenty
- NPC są bardziej pomocni, otoczenie mniej wrogie
- Testy mechaniczne tylko gdy naprawdę konieczne`,

  normal: `
## POZIOM TRUDNOŚCI: NORMALNY
- Stosuj standardowe zasady Call of Cthulhu 7e
- Porażki mają realne konsekwencje
- AI jest neutralny - nie pomaga ani nie szkodzi nadmiernie
- Świat reaguje logicznie na działania postaci`,

  hard: `
## POZIOM TRUDNOŚCI: TRUDNY
- ŻADNYCH podpowiedzi narracyjne
- Częstsze testy, wyższe progi (Hard/Extreme częściej wymagane)
- Konsekwencje porażek są surowe i natychmiastowe
- Świat jest wrogi, NPC nieufni
- Zasoby (amunicja, zdrowie, poczytalność) szybciej się wyczerpują`,

  deadly: `
## POZIOM TRUDNOŚCI: MORDERCZY
- Każdy błąd może być FATALNY
- Minimalna narracyjna osłona
- Strata PŻ/PR przyznawana BEZ OSTRZEŻENIA
- Testy nawet dla rutynowych czynności
- Świat aktywnie próbuje zabić postać
- Śmierć postaci jest prawdopodobna i oczekiwana`,
};

export const NARRATIVE_MODE_INSTRUCTIONS: Record<string, string> = {
  full_rpg: `
## TRYB NARRACJI: PEŁNE RPG
- Wymagaj testów umiejętności zgodnie z zasadami CoC 7e
- Wyświetlaj wyniki rzutów w tagach [WYNIK: ...]
- Pokazuj zmiany PŻ, PR, PM
- Informuj o przelicznikach trudności (Normalny/Trudny/Ekstremalny)
- Gra z pełnymi mechanikami i losowością
- WZYWAJ TESTY OSZCZĘDNIE: tylko gdy akcja ma realną stawkę i niepewny wynik. Rutynowe, łatwe lub bezpieczne czynności rozstrzygaj narracyjnie BEZ rzutu. Płynność opowieści jest ważniejsza niż liczba rzutów (poziom trudności może to modyfikować - na trudnym/morderczym testów jest więcej).`,

  story_priority: `
## TRYB NARRACJI: PRIORYTET FABUŁY
WAŻNE: Grasz narracyjną grę paragrafową. Mechaniki działają W TLE - gracz ich NIE WIDZI.

ZASADY:
- NIE wyświetlaj tagów [WYNIK:], [TEST:], [RZUT:] - podejmuj decyzje wewnętrznie
- NIE informuj o wartościach PŻ/PR/PM bezpośrednio - pokazuj przez NARRACJĘ ("czujesz niepokój", "ból przeszywa ramię")
- NIE opisuj poziomów trudności ani progów - po prostu opowiadaj historię
- Wyniki testów ujawniaj przez FABUŁĘ, nie przez mechanikę ("zauważasz dziwny cień" zamiast "Test Spostrzegawczości - Sukces")
- Wewnętrznie używaj umiejętności postaci do decyzji, ale nie ujawniaj tego graczowi
- Zachowaj element niepewności - gracz nie wie, kiedy "rzut" się odbywa
- Skup się na atmosferze, dialogach i wyborach narracyjnych
- Podawaj wybory w formie paragrafowej gdy to stosowne (np. "Możesz zbadać drzwi lub sprawdzić okno")
- Śmierć i porażka nadal są możliwe, ale komunikowane narracyjnie`,

  pure_narrative: `
## TRYB NARRACJI: CZYSTA NARRACJA (BEZ MECHANIK)
WAŻNE: To interaktywna fikcja / gra paragrafowa BEZ żadnych mechanik RPG.

ZASADY:
- ŻADNYCH testów umiejętności, rzutów kości, progów trudności
- ŻADNYCH zmian PŻ/PR/PM - ignoruj statystyki postaci
- ŻADNYCH tagów mechanicznych ([WYNIK:], [TEST:], etc.)
- Wyniki zależą WYŁĄCZNIE od wyborów gracza i logiki narracyjnej
- Traktuj to jak interaktywną powieść - nie jak grę z regułami
- Oferuj graczowi jasne wybory w kluczowych momentach
- Napięcie buduj przez atmosferę i fabułę, nie ryzyko mechaniczne
- Śmierć postaci możliwa tylko jako logiczna konsekwencja złych wyborów
- Nawet w momentach niebezpieczeństwa - opisuj, nie obliczaj`,
};

/**
 * Buduje sekcję Session Zero promptu (tone + difficulty + narrative mode + safety).
 * Zwraca pusty string gdy sessionZero nie istnieje lub completed=false.
 */
export function buildSessionZeroInstructions(
  sessionZero: SessionZeroPromptSettings | undefined
): string {
  if (!sessionZero?.completed) return '';

  let safetyInstructions = '';
  if (sessionZero.lines && sessionZero.lines.length > 0) {
    safetyInstructions += `
## LINIE (TEMATY ABSOLUTNIE ZAKAZANE)
NIE OPISUJ, NIE WSPOMINAJ, NIE SUGERUJ następujących tematów - są całkowicie wykluczone z gry:
${sessionZero.lines.map((l) => `- ${l}`).join('\n')}`;
  }

  if (sessionZero.veils && sessionZero.veils.length > 0) {
    safetyInstructions += `
## ZASŁONY (FADE TO BLACK)
Te tematy mogą wystąpić, ale NIGDY nie opisuj ich szczegółowo - stosuj "fade to black":
${sessionZero.veils.map((v) => `- ${v}`).join('\n')}`;
  }

  if (sessionZero.safetyWord) {
    safetyInstructions += `
## SŁOWO BEZPIECZEŃSTWA
Jeśli gracz napisze "${sessionZero.safetyWord}", NATYCHMIAST przerwij aktualną scenę i przejdź do bezpiecznego momentu.`;
  }

  return `
${TONE_INSTRUCTIONS[sessionZero.tone] || ''}
${DIFFICULTY_INSTRUCTIONS[sessionZero.difficulty] || ''}
${NARRATIVE_MODE_INSTRUCTIONS[sessionZero.narrativeMode] || NARRATIVE_MODE_INSTRUCTIONS['full_rpg']}
${safetyInstructions}`;
}
