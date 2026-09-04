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
- **Cinematic Combat & Hidden Initiative**: Walka i akcja odbywają się w sposób płynny, bez jawnego toru inicjatywy/tur szachowych. Inicjatywę obliczaj w tle (używając DEX/Speed postaci i logicznego kontekstu przestrzenno-sytuacyjnego w [MYŚLI_MG]). W razie potrzeby przerywaj akcje badaczy atakami szybszych wrogów, wymagając rzutów obronnych/reakcji (Unik, Walka Wręcz, DEX).
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
- **Cinematic Combat & Hidden Initiative**: Akcja i walka są w 100% fabularne. Zręczność i Szybkość wpływają na kolejność działań potajemnie w [MYŚLI_MG]. Opisuj dynamiczne, logiczne przerwania akcji przez szybszych wrogów oraz ich skutki czysto fabularnie.
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
- **Cinematic Combat**: Walka i akcja są czystą, interaktywną prozą. Wszelkie inicjatywy, przerwania i skutki wynikają w 100% z logiki opowieści oraz wyborów gracza.
- Wyniki zależą WYŁĄCZNIE od wyborów gracza i logiki narracyjnej
- Traktuj to jak interaktywną powieść - nie jak grę z regułami
- Oferuj graczowi jasne wybory w kluczowych momentach
- Napięcie buduj przez atmosferę i fabułę, nie ryzyko mechaniczne
- Śmierć postaci możliwa tylko jako logiczna konsekwencja złych wyborów
- Nawet w momentach niebezpieczeństwa - opisuj, nie obliczaj`,
};

export const TONE_INSTRUCTIONS_EN: Record<string, string> = {
  purist: `
## NARRATIVE STYLE: PURIST
- Adhere to realism and psychological horror
- Horror stems from the human psyche and the incomprehensibility of the cosmos
- Avoid cinematic action, focus on atmosphere and suspense
- Death is real and final - no "deus ex machina"
- Mythos entities are inexplicable, impossible to defeat by force`,

  pulp: `
## NARRATIVE STYLE: PULP
- Allow heroism and epic action scenes
- Characters can be "larger than life"
- More chances of success, more cinematic scenes
- Horror blends with adventure and action
- Desperate escapes and miraculous saves are possible`,

  noir: `
## NARRATIVE STYLE: NOIR
- Dark, cynical atmosphere of moral ambiguity
- Everyone has hidden motives, no one is entirely innocent
- Plenty of dialogue, mysteries, double crosses
- 1920s-1940s detective film noir atmosphere
- Characters confront their own demons as often as cosmic ones`,

  neutral: '',
};

export const DIFFICULTY_INSTRUCTIONS_EN: Record<string, string> = {
  easy: `
## DIFFICULTY LEVEL: EASY
- Give subtle narrative hints when the player is stuck
- Standard or lowered difficulty thresholds
- Mild failure consequences, second chances in crucial moments
- NPCs are more cooperative, environment is less hostile
- Mechanical rolls only when truly necessary`,

  normal: `
## DIFFICULTY LEVEL: NORMAL
- Apply standard Call of Cthulhu 7e rules
- Failures have real consequences
- The AI is neutral - neither over-assisting nor excessively cruel
- The world reacts logically to investigator actions`,

  hard: `
## DIFFICULTY LEVEL: HARD
- NO narrative hints
- More frequent tests, higher thresholds (Hard/Extreme required more often)
- Failure consequences are severe and immediate
- Hostile environment, distrustful NPCs
- Resources (ammo, health, sanity) deplete faster`,

  deadly: `
## DIFFICULTY LEVEL: DEADLY
- Every mistake can be FATAL
- Minimal narrative buffer
- HP/SAN loss dealt WITHOUT WARNING
- Tests required even for routine tasks
- The world actively tries to kill the investigator
- Character death is probable and expected`,
};

export const NARRATIVE_MODE_INSTRUCTIONS_EN: Record<string, string> = {
  full_rpg: `
## NARRATIVE MODE: FULL RPG
- Require skill tests according to CoC 7e rules
- Display roll results in [WYNIK: ...] tags
- Show changes in HP, SAN, MP
- Report difficulty modifiers (Regular/Hard/Extreme)
- Full mechanics and randomness
- **Cinematic Combat & Hidden Initiative**: Action and combat flow smoothly without a rigid initiative board. Calculate initiative silently in [MYŚLI_MG] using DEX/Speed and situational logic. Interrupt player actions with faster enemy moves when appropriate, prompting defensive rolls (Dodge, Fighting, DEX).
- CALL FOR TESTS SPARINGLY: only when an action has real stakes and uncertain outcome. Resolve routine, easy, or safe tasks narratively WITHOUT a roll. Fluidity of the story is paramount.`,

  story_priority: `
## NARRATIVE MODE: STORY PRIORITY
IMPORTANT: You are running a paragraph-based narrative game. Mechanics operate IN THE BACKGROUND - the player does NOT see them.

RULES:
- DO NOT display [WYNIK:], [TEST:], [RZUT:] tags - make decisions internally
- DO NOT report HP/SAN/MP values directly - convey them through NARRATION ("you feel growing dread", "sharp pain pierces your shoulder")
- DO NOT describe difficulty levels or numerical thresholds - simply tell the story
- Reveal test outcomes through PLOT, not mechanics ("you spot a strange shadow" instead of "Spot Hidden Test - Success")
- Internally use investigator skills for decisions, but do not expose numbers to the player
- **Cinematic Combat & Hidden Initiative**: Action and combat are 100% narrative. DEX and Speed guide turn order silently in [MYŚLI_MG]. Describe dynamic interruptions by faster enemies purely narratively.
- Maintain uncertainty - the player never knows exactly when a "roll" occurred
- Focus on atmosphere, dialogue, and narrative choices
- Offer choices in paragraph form when appropriate (e.g. "You can examine the door or check the window")
- Death and failure remain possible, but communicated narratively`,

  pure_narrative: `
## NARRATIVE MODE: PURE NARRATIVE (NO MECHANICS)
IMPORTANT: This is interactive fiction / text adventure with NO RPG mechanics.

RULES:
- NO skill tests, dice rolls, or difficulty thresholds
- NO HP/SAN/MP changes - ignore character stats
- NO mechanical tags ([WYNIK:], [TEST:], etc.)
- **Cinematic Combat**: Combat and action are pure prose. All initiative, interruptions, and outcomes stem 100% from narrative logic and player choices.
- Outcomes depend SOLELY on player choices and narrative plausibility
- Treat this like an interactive novel - not a rulebook game
- Offer clear choices at key junctures
- Build tension through atmosphere and plot, not mechanical risk
- Character death is possible only as a logical consequence of poor choices
- Even in moments of mortal danger - describe, do not calculate`,
};

/**
 * Buduje sekcję Session Zero promptu (tone + difficulty + narrative mode + safety).
 * Zwraca pusty string gdy sessionZero nie istnieje lub completed=false.
 */
export function buildSessionZeroInstructions(
  sessionZero: SessionZeroPromptSettings | undefined,
  locale: 'pl' | 'en' = 'pl'
): string {
  if (!sessionZero?.completed) return '';

  const isEn = locale === 'en';
  let safetyInstructions = '';
  if (sessionZero.lines && sessionZero.lines.length > 0) {
    safetyInstructions += isEn
      ? `\n\n## LINES (ABSOLUTELY FORBIDDEN TOPICS)\nDO NOT DESCRIBE, MENTION, OR SUGGEST the following topics - they are strictly excluded from the game:\n${sessionZero.lines.map((l) => `- ${l}`).join('\n')}`
      : `\n\n## LINIE (TEMATY ABSOLUTNIE ZAKAZANE)\nNIE OPISUJ, NIE WSPOMINAJ, NIE SUGERUJ następujących tematów - są całkowicie wykluczone z gry:\n${sessionZero.lines.map((l) => `- ${l}`).join('\n')}`;
  }

  if (sessionZero.veils && sessionZero.veils.length > 0) {
    safetyInstructions += isEn
      ? `\n\n## VEILS (FADE TO BLACK)\nThese topics may occur, but NEVER describe them in detail - use "fade to black":\n${sessionZero.veils.map((v) => `- ${v}`).join('\n')}`
      : `\n\n## ZASŁONY (FADE TO BLACK)\nTe tematy mogą wystąpić, ale NIGDY nie opisuj ich szczegółowo - stosuj "fade to black":\n${sessionZero.veils.map((v) => `- ${v}`).join('\n')}`;
  }

  if (sessionZero.safetyWord) {
    safetyInstructions += isEn
      ? `\n\n## SAFETY WORD\nIf the player writes "${sessionZero.safetyWord}", IMMEDIATELY pause the current scene and transition to a safe moment.`
      : `\n\n## SŁOWO BEZPIECZEŃSTWA\nJeśli gracz napisze "${sessionZero.safetyWord}", NATYCHMIAST przerwij aktualną scenę i przejdź do bezpiecznego momentu.`;
  }

  const toneMap = isEn ? TONE_INSTRUCTIONS_EN : TONE_INSTRUCTIONS;
  const diffMap = isEn ? DIFFICULTY_INSTRUCTIONS_EN : DIFFICULTY_INSTRUCTIONS;
  const modeMap = isEn ? NARRATIVE_MODE_INSTRUCTIONS_EN : NARRATIVE_MODE_INSTRUCTIONS;

  return `
${toneMap[sessionZero.tone] || ''}
${diffMap[sessionZero.difficulty] || ''}
${modeMap[sessionZero.narrativeMode] || modeMap['full_rpg']}
${safetyInstructions}`;
}
