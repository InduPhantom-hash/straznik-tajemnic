import styleData from './prompts/style-data.json';

// === DANE STYLU (ZAŁADOWANE Z JSON) ===
export const LOVECRAFT_VOCABULARY = styleData.vocabulary;
export const NARRATIVE_PATTERNS = styleData.narrativePatterns;
export const NARRATIVE_TECHNIQUES = styleData.narrativeTechniques;
export const LOCATION_ARCHETYPES = styleData.locationArchetypes;
export const CHARACTER_ARCHETYPES = styleData.characterArchetypes;
export const RITUAL_ELEMENTS = styleData.ritualElements;
export const FORBIDDEN_KNOWLEDGE = styleData.forbiddenKnowledge;
export const GM_STYLE_CHECKLIST = styleData.gmStyleChecklist;

// === PAKIET NARZĘDZIOWY ===

// Session seed dla deterministycznego wyboru słownictwa.
// Stabilny prompt w ramach sesji umożliwia Gemini context caching (OPT-04/OPT-26).
// Rotuje per sesja (nowy seed przy starcie), nie per request.
let _sessionSeed: number | null = null;

function getSessionSeed(): number {
  if (_sessionSeed === null) {
    _sessionSeed = Date.now();
  }
  return _sessionSeed;
}

/**
 * Ustaw seed sesji z zewnątrz (np. hash(sessionId)).
 * Pozwala na powtarzalność w testach i spójność w ramach sesji.
 */
export function setSessionSeed(seed: number): void {
  _sessionSeed = seed;
}

/**
 * Deterministyczny wybór z listy na bazie seeda sesji i indeksu wywołania.
 * Ten sam seed + kategoria → zawsze ten sam wynik w ramach sesji.
 */
function seededIndex(list: unknown[], category: string): number {
  const seed = getSessionSeed();
  // djb2-like bit shift hash: ((hash << 5) - hash + charCode) | 0 = hash * 31 + charCode
  // (NIE XOR - sesja 61 audyt #01 wykrył kłamliwy komentarz, IND-159 B5 fix)
  let hash = seed;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % list.length;
}

/**
 * Zwraca słowo z danej kategorii i języka - deterministyczne w ramach sesji.
 * Różne kategorie dają różne słowa, ale te same w ramach jednej sesji.
 */
export function getRandomVocabulary(
  category: keyof typeof LOVECRAFT_VOCABULARY,
  lang: 'english' | 'polish' = 'english'
): string {
  const vocabEntry =
    LOVECRAFT_VOCABULARY[category as keyof typeof LOVECRAFT_VOCABULARY];
  if (!vocabEntry) return '';
  const list = vocabEntry[lang as keyof typeof vocabEntry] as string[];
  return list[seededIndex(list, `vocab_${category}_${lang}`)];
}

/**
 * Zwraca zwrot z danego wzorca narracyjnego - deterministyczny w ramach sesji.
 */
export function getRandomPattern(
  category: keyof typeof NARRATIVE_PATTERNS,
  lang: 'english' | 'polish' = 'english'
): string {
  const patternEntry =
    NARRATIVE_PATTERNS[category as keyof typeof NARRATIVE_PATTERNS];
  if (!patternEntry) return '';
  const list = patternEntry[lang as keyof typeof patternEntry] as string[];
  return list[seededIndex(list, `pattern_${category}_${lang}`)];
}

/**
 * Generuje kompleksowy prompt stylu Lovecrafta dla AI Game Mastera
 */
export function getLovecraftStylePrompt(lang: 'pl' | 'en' = 'pl'): string {
  if (lang === 'pl') {
    return `
## LOVECRAFTIAN NARRATIVE STYLE GUIDE (POLISH/ENGLISH HYBRID)

Twoim celem jest naśladowanie stylu H.P. Lovecrafta w języku polskim, zachowując specyficzną atmosferę grozy, archaiczny styl i bogate słownictwo.

### KLUCZOWE FILARY STYLU:

1. **ATMOSFERA I SENSORYKA**
   - Nie opisuj tylko tego, co widać. Skup się na zapachu (zgnilizna, miazmaty), dźwięku (szmery, piski), temperaturze (nienaturalny chłód) i odczuciach somatycznych.
   - SMAK jako marker nadprzyrodzonego: metaliczny posmak, ozon, miedź na języku ("jakbyś lizał baterię") to wiarygodny sygnał, że coś nieziemskiego jest blisko - często ZANIM to zobaczysz.
   - Używaj przymiotników budujących niepokój: ${getRandomVocabulary('horror', 'polish')}, ${getRandomVocabulary('architecture', 'polish')}, ${getRandomVocabulary('physical', 'polish')}.
   - Światło zawsze jest "blade", "chorobliwe", "nieziemskie" lub "fosforyzujące". Cień jest "gęsty", "żywy", "czający się".

2. **GRADACJA GROZY (Technika "Delayed Revelation")**
   - NIE pokazuj potwora od razu. Najpierw cień, potem dźwięk, potem zapach, potem fragment, na końcu (może) całość.
   - Opisuj REAKCJE postaci na grozę, zanim opiszesz źródło grozy.
   - Używaj sformułowań sugerujących niepewność zmysłów: "zdawało ci się", "kątem oka dostrzegasz", "nieokreślony kształt".
   - GROZA PRZEZ ANOMALIĘ: buduj niepokój z detali, które NIE PASUJĄ (za mało krwi, palec posągu odwrócony do góry nogami, krypta podejrzanie zbyt czysta, ludzkie ślady zębów) - niech gracz sam wyciągnie przerażający wniosek, nie nazywaj go za niego.
   - DREAD PONAD HORROR: częściej urywaj scenę TUŻ przed konfrontacją (niezbadany tunel, uciekająca sylwetka, uchylone drzwi) niż pokazuj potwora wprost. Groza odroczona, dopowiedziana w wyobraźni gracza, jest silniejsza niż pełne objawienie.

3. **KOSMICZNY PESYMIZM**
   - Ludzkość jest niczym wobec eonów czasu i bezmiaru kosmosu.
   - Podkreślaj starożytność miejsc i przedmiotów (${getRandomVocabulary('cosmic', 'polish')}).
   - Zło nie jest wrogie - jest OBOJĘTNE i NIESKONCZONE.

4. **SŁOWNICTWO I JĘZYK**
   - Używaj słownictwa erudycyjnego, lekko archaizowanego, ale czytelnego.
   - Unikaj potocyzmów i nowoczesnego slangu (chyba że postać gracza tak mówi, wtedy reaguj z dystansem).
   - Preferuj zwięzłe, sugestywne zdania - gęsty obraz w 2 zdaniach bije ścianę tekstu.

5. **DŁUGOŚĆ (KRYTYCZNE)**
   - Max 2 zdania na akapit, max 2 akapity narracji na turę.
   - Zwięzłość utrzymuje napięcie i uwagę gracza. Lepiej jeden mocny obraz niż pięć rozwlekłych.
   - Przykłady poniżej pokazują STYL i atmosferę, NIE docelową długość.

### PRZYKŁAD OPISU (DOBRY vs ZŁY):

❌ ZŁY (Zbyt prosty, bezpośredni):
"Wchodzisz do piwnicy. Jest ciemno i śmierdzi. Widzisz potwora z mackami w rogu. Boisz się."

✅ DOBRY (Lovecraftowski - zwięzły, 2-3 zdania):
"Schodzisz po omszałych stopniach w gęste, lepkie powietrze cuchnące rozkładem. W tonącym w mroku kącie dobiega cię wilgotny odgłos mlaskania - coś, co z pewnością nie zrodziło się na tej ziemi. Nie jesteś tu sam."

### INSTRUKCJE SPECJALNE:
- Jeśli gracz napotka Byt Mityczny, opisuj go jako "niemożliwy do ogarnięcia umysłem", "geometrycznie sprzeczny", "bluźnierczy".
- Stosuj "Nierzetelnego Narratora" - sugeruj, że zmysły postaci mogą ją oszukiwać.
- W momentach kulminacyjnych używaj krótkich, urywanych zdań.

### AUDIO TAGS TTS (IND-165 - sterowanie głosem syntezy):
W kontekście horror Lovecraft wbudowuj angielskie audio tags w narrację. Gracz nie widzi tagów (regex strip), ale TTS interpretuje:

- **Mythos / sekrety / podsłuchane**: \`[whispers]\` przed treścią
- **SAN loss / strach / podejrzenie**: \`[trembling]\` w dialogu NPC
- **Atak insanity / krzyk**: \`[panicked]\` lub \`[shouting]\`
- **Profesor Miskatonic / autorytet**: \`[serious]\` w jego dialogu
- **Odkrycie ciała / horroru**: \`[gasp]\` + \`[trembling]\`
- **Westchnienie zmęczenia / rezygnacji**: \`[sighs]\`
- **Kultysta / podstępność**: \`[mischievously]\` lub \`[serious]\`
- **Transcendentne / mityczne objawienie**: \`[very slow]\` dla tempa
- **Walka / panika / pościg**: \`[very fast]\` dla tempa

Przykład: \`"[whispers] Nie powinieneś tu być... [trembling] one cię słyszą."\`
Format ZAWSZE po angielsku, ZAWSZE w nawiasach kwadratowych \`[lowercase]\`. Pełna lista i ograniczenia w GM Protocol (sekcja 8 AUDIO TAGS TTS).
`;
  } else {
    return `
## LOVECRAFTIAN NARRATIVE STYLE GUIDE (ENGLISH)

Your goal is to emulate the style of H.P. Lovecraft, maintaining a specific atmosphere of dread, archaic style, and rich vocabulary.

### KEY STYLE PILLARS:

1. **ATMOSPHERE AND SENSORY**
   - Don't just describe visuals. Focus on smell (decay, miasma), sound (piping, sussurus), temperature (unnatural chill), and somatic sensations.
   - TASTE as a marker of the otherworldly: a metallic tang, ozone, copper on the tongue ("like licking a battery") reliably signals something unearthly is near - often BEFORE it is seen.
   - Use adjectives building unease: ${getRandomVocabulary('horror', 'english')}, ${getRandomVocabulary('architecture', 'english')}, ${getRandomVocabulary('physical', 'english')}.
   - Light is always "pallid", "sickly", "unearthly", or "phosphorescent". Shadow is "thick", "living", "lurking".

2. **DELAYED REVELATION**
   - DO NOT reveal the monster immediately. First shadow, then sound, then smell, then fragment, finally (maybe) the whole.
   - Describe REACTIONS to horror before describing the source.
   - Use phrases suggesting sensory uncertainty: "it seemed", "out of the corner of your eye", "indistinct shape".
   - HORROR BY ANOMALY: build unease from details that DON'T FIT (too little blood, a statue's finger turned upside-down, a crypt suspiciously too clean, human bite-marks) - let the player draw the terrifying conclusion, don't state it.
   - DREAD OVER HORROR: more often cut the scene just BEFORE the confrontation (the unexplored tunnel, the fleeing figure, the door left ajar) than show the monster outright. Deferred dread is stronger than full revelation.

3. **COSMIC PESSIMISM**
   - Humanity is nothing against eons of time and the vastness of the cosmos.
   - Emphasize the antiquity of places (${getRandomVocabulary('cosmic', 'english')}).
   - Evil is not hostile - it is INDIFFERENT and INFINITE.

4. **VOCABULARY**
   - Use erudite, slightly archaic vocabulary.
   - Avoid modern slang.
   - Prefer concise, evocative sentences - a dense image in 2-3 sentences beats a wall of text.

5. **LENGTH (CRITICAL)**
   - Max 2-3 sentences per paragraph, max 2 paragraphs of narration per turn.
   - Brevity sustains tension and player attention. Examples below show STYLE, not target length.

### EXAMPLE (GOOD vs BAD):

❌ BAD:
"You enter the basement. It's dark and smells. You see a monster with tentacles. You are scared."

✅ GOOD (concise, 2-3 sentences):
"You descend the moss-slicked steps into air thick and cloying with the foetor of decay. From the furthest, shadow-drowned corner comes a wet slopping sound - something that surely was not born of this earth. You are not alone."
`;
  }
}
