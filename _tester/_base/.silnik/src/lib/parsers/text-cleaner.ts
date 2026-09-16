// Ciało tagu odporne na 1 poziom zagnieżdżenia [...]. AI bywa wplata audio-tag
// emocji (np. [serious], [trembling]) w środek [NASTRÓJ: ...]; naiwne [^\]]*
// ucinałoby na pierwszym wewnętrznym `]` i ogon treści przeciekał do lektora.
// Bliźniacza stała w narrative/cleanup.ts (warstwa display). `[^\[\]]` matchuje
// też `\n`, więc multiline tagi są zachowane.
const NESTED_TAG_BODY = '(?:[^\\[\\]]|\\[[^\\]]*\\])*';

export const GEMINI_TTS_EMOTION_TAGS =
  'whispers|whispering|trembling|gasp|panicked|serious|curious|sarcastic|sarcastically|tired|crying|amazed|excited|mischievously|sighs|giggles|laughs|shouting|very fast|very slow';

/** Removes blocks that are never allowed to enter campaign memory. */
export function stripHiddenMemoryContent(text: string): string {
  return text
    .replace(/\[(?:OBSERWACJA|OBSERVATION)(?::[^\]]*)?\][\s\S]*?\[\/(?:OBSERWACJA|OBSERVATION)\]/gi, '')
    .replace(/\[(?:SEKRETY_MG|KEEPER_SECRETS)(?::[^\]]*)?\][\s\S]*?\[\/(?:SEKRETY_MG|KEEPER_SECRETS)\]/gi, '');
}

export interface DiegeticProseOptions {
  /** Czy wymuszać formatowanie dialogów myślnikiem maszynopisu lat 20. (- ) */
  normalizeDialogues?: boolean;
  /** Czy usuwać wycieki nagłówków formularzy i baz danych (np. "Cechy fizyczne:", "Wymiar:") */
  stripFormHeaders?: boolean;
  /** Czy czyścić zbędne nawiasy klamrowe {} */
  cleanBraces?: boolean;
}

export const FORM_HEADER_REGEX =
  /^[ \t]*[-*•_]*[ \t]*(?:[*_]{1,2})?(?:Cechy fizyczne(?: i manieryzm)?|Wymiar fizjologiczny|Pozycja społeczna|Wymiar socjologiczny|Ukryty cel|Wymiar psychologiczny|Status relacji|Nastawienie psychologiczne|Agenda|Stan zdrowia|Ekwipunek|Statystyki|Opis postaci|Physical traits|Physiological dimension|Social status|Sociological dimension|Hidden agenda|Psychological dimension|Relationship status|Psychological disposition|Health status|Equipment|Stats|Character description)[ \t]*[*_]{0,2}[ \t]*[:–—-][ \t]*[*_]{0,2}[ \t]*/gim;

/**
 * Sanitizuje wszelkie techniczne i mechaniczne znaczniki silnika RPG / CoC 7e,
 * gwarantując brak wycieków tagów [TEST:], [DZIENNIK:], [NPC:], [STAN:], [WALKA:] itp.
 */
export function sanitizeMechanicalTags(text: string): string {
  if (!text) return '';
  return text
    // Dziennik bloki z zawartością i pojedyncze tagi
    .replace(/\[(?:DZIENNIK|JOURNAL):[^\]]*\][\s\S]*?\[\/(?:DZIENNIK|JOURNAL)\]/gi, '')
    .replace(/\[(?:DZIENNIK|JOURNAL):[^\]]*\]/gi, '')
    .replace(/\[\/(?:DZIENNIK|JOURNAL)\]/gi, '')
    // Bloki obserwacji i sekretów MG
    .replace(/\[(?:OBSERWACJA|OBSERVATION)(?::[^\]]*)?\][\s\S]*?\[\/(?:OBSERWACJA|OBSERVATION)\]/gi, '')
    .replace(/\[(?:SEKRETY_MG|KEEPER_SECRETS)(?::[^\]]*)?\][\s\S]*?\[\/(?:SEKRETY_MG|KEEPER_SECRETS)\]/gi, '')
    .replace(/\[(?:OBSERWACJA|OBSERVATION)(?::[^\]]*)?\]/gi, '')
    .replace(/\[(?:SEKRETY_MG|KEEPER_SECRETS)(?::[^\]]*)?\]/gi, '')
    .replace(/\[\/(?:OBSERWACJA|OBSERVATION|SEKRETY_MG|KEEPER_SECRETS)\]/gi, '')
    // Testy kości i wyników
    .replace(/\[(?:TEST|WYNIK|KOŚĆ|KOSC|DICE|ROLL):[^\]]*\]/gi, '')
    .replace(/\[🎲[^\]]*\]/gi, '')
    .replace(/test:\s*[^\]]*\]/gi, '')
    .replace(/\[Test:[^\]]*\]/gi, '')
    .replace(/Wynik:\s*\d+\s*→[^.!\n]*/gi, '')
    .replace(/Progi:[^\n]*/gi, '')
    .replace(/\(Rzut\s+(?:ręczny|automatyczny)\)/gi, '')
    // Postacie, relacje, obecność NPC
    .replace(/\[(?:NPC|OBECNI_NPC|PRESENT_NPCS|POSTAĆ|POSTAC|CHARACTER|RELACJA):[^\]]*\]/gi, '')
    // Lokacje i sceny
    .replace(/\[(?:LOKACJA|LOCATION|MIEJSCE|SCENA|SCENE):[^\]]*\]/gi, '')
    // Przedmioty i ekwipunek
    .replace(/\[(?:PRZEDMIOT|ITEM|ZDOBYTY_PRZEDMIOT|EKWIPUNEK|EQUIPMENT):[^\]]*\]/gi, '')
    // Mechanika stanu, ran i cech
    .replace(/\[(?:STAN|STAN_POSTACI|HP|MP|SANITY|SAN|POCZYTALNOŚĆ|POCZYTALNOSC|OBRAŻENIA|OBRAZENIA|RANY|GAME_OVER|KONIEC_GRY|WETO_SEDZIEGO|WETO|REFEREE_VETO):[^\]]*\]/gi, '')
    // Walka, obrona, pościgi, magia, tomy
    .replace(/\[(?:WALKA|WALKA_ATAK|OBRONA_WALKA|ATAK_WALKA|COMBAT|ATAK_WRĘCZ|ATAK_WRECZ|MELEE_ATTACK|OPPOSED_MELEE|MELEE_DEFENSE|DIVE_FOR_COVER|RZUT_ZA_OSŁONĘ|RZUT_ZA_OSLONE|OBRONA|DEFENSE|POŚCIG|POSCIG|CHASE|ZAGROŻENIE|ZAGROZENIE|HAZARD|CZAR|SPELL|MAGIA|TOM|TOME|KSIĘGA|KSIEGA|STUDIUM|OBRONA_MAGIA|MAGIA_OBRONA|OPPOSED_MAGIC|MAGIA_SPONTANICZNA|SPONTANEOUS_MAGIC):[^\]]*\]/gi, '')
    .replace(/\[(?:WYNIK_WALKI|COMBAT_RESULT|WYNIK_CZARU|SPELL_RESULT|WYNIK_OBRONY_MAGII|OPPOSED_MAGIC_RESULT|WYNIK_TOMU|TOME_RESULT|WYNIK_POŚCIGU|WYNIK_POSCIGU|CHASE_RESULT|WYNIK_ZAGROŻENIA|WYNIK_ZAGROZENIA|HAZARD_RESULT):[^\]]*\]/gi, '')
    // GM thoughts, mood, narrative goal
    .replace(new RegExp(`\\[(?:MYŚLI_MG|MYSLI_MG|THOUGHTS|NASTRÓJ|NASTROJ|MOOD|CEL_NARRACYJNY|NARRATIVE_GOAL):${NESTED_TAG_BODY}\\]`, 'gi'), '')
    // Depth Injection / Pacing / Author's Note tags (SillyTavern Adaptation - bloki multiline oraz tagi pojedyncze)
    .replace(/\[(?:PRZYPOMNIENIE DLA MG|GM DIRECTIVE|DYNAMIC SCENE|PACING INJECTION|AUTHOR'S NOTE)[^\]]*\][\s\S]*?\[\/(?:PRZYPOMNIENIE DLA MG|GM DIRECTIVE|DYNAMIC SCENE|PACING INJECTION|AUTHOR'S NOTE)\]/gi, '')
    .replace(/\[(?:DYNAMIC SCENE|PACING INJECTION|AUTHOR'S NOTE|PRZYPOMNIENIE DLA MG|GM DIRECTIVE|PACING)[^\]]*\]/gi, '')
    .replace(/\[\/(?:DYNAMIC SCENE|PACING INJECTION|AUTHOR'S NOTE|PRZYPOMNIENIE DLA MG|GM DIRECTIVE|PACING)\]/gi, '')
    // Tagi multimedialne i ilustracje
    .replace(/\[(?:ILUSTRACJA|OBRAZ|GRAFIKA|RYSUNEK|ZDJĘCIE|ZDJECIE|PORTRET|WIZUALIZACJA|IMAGE|PICTURE|ILLUSTRATION|SHOW|VISUALIZE|PORTRAIT|SFX|DŹWIĘK|DZWIEK|AUDIO|NAGRANIE|PROMPT)[^\]]*\]/gi, '')
    // Czas i pogoda
    .replace(new RegExp(`\\[(?:POGODA|WEATHER|AKTUALNY CZAS|AKTUALNY_CZAS|TIME|KONIEC_SESJI|END_SESSION):${NESTED_TAG_BODY}\\]`, 'gi'), '')
    // Niedomknięty tag techniczny na końcu uciętego streamu
    .replace(/\[[A-ZŁŚŻŹĆŃ_]{2,}(?::[^\]]*)?$/g, '');
}

/**
 * Diegetic Prose Cleaner (adaptacja Regex Scripts z SillyTavern)
 * Gwarantuje brak wycieków tagów technicznych i nagłówków bazodanowych
 * oraz formatuje tekst do estetyki maszynopisu lat 20. XX wieku.
 */
export function sanitizeDiegeticProse(
  text: string,
  options: DiegeticProseOptions = {}
): string {
  if (!text) return '';

  const {
    normalizeDialogues = true,
    stripFormHeaders = true,
    cleanBraces = true,
  } = options;

  let cleaned = stripHiddenMemoryContent(text);
  cleaned = sanitizeMechanicalTags(cleaned);

  // Usuwanie prefiksów asystenta/MG
  cleaned = cleaned
    .replace(/^(?:MG|GM|AI|Assistant|Mistrz Gry|Game Master):\s*(?:Assistant:\s*)?/gim, '')
    .replace(/^Assistant:\s*/gim, '')
    .trim();

  // Usuwanie bloków kodu i JSON
  cleaned = cleaned
    .replace(/```(?:json|javascript|typescript)?\s*[\s\S]*?(?:```|$)/gi, '')
    .replace(/\{\s*"[^"]*"[\s\S]*?\}/g, '');

  // Czyszczenie wycieków formularzy/bazy danych (Anti-Form Leakage)
  if (stripFormHeaders) {
    cleaned = cleaned.replace(FORM_HEADER_REGEX, '');
  }

  // Zamiana didaskaliów w klamrach {Didaskalia...} -> Didaskalia...
  if (cleanBraces) {
    cleaned = cleaned.replace(/\{([^}]+)\}/g, '$1');
  }

  // Normalizacja dialogów lat 20. (styl maszynopisu: pojedynczy myślnik "- ")
  if (normalizeDialogues) {
    // Zamiana półpauz/pauz (—, –) na zwykły myślnik (-)
    cleaned = cleaned.replace(/[—–]/g, '-');
    // Normalizacja dialogów z kwestią mówioną i atrybucją narracyjną ("Tekst" - rzekł / „Tekst” - dodał)
    cleaned = cleaned.replace(
      /^[ \t]*["„»]([^"”«\n]+)["”«](?:[ \t]*-?[ \t]*([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]))/gm,
      '- $1 - $2'
    );
    // Normalizacja dialogów rozpoczynających się od cudzysłowu na początku linii (samodzielna kwestia)
    cleaned = cleaned.replace(/^[ \t]*["„»]([^"”«\n]+)["”«][ \t]*$/gm, '- $1');
  }

  // Usuwanie podwójnych spacji
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  // Usuwanie nadmiarowych pustych linii (> 2 -> 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Czyści tekst odpowiedzi AI z artefaktów technicznych, przygotowując go do TTS
 */
export function cleanResponseText(text: string): string {
  if (!text) return '';

  const diegeticClean = sanitizeDiegeticProse(text, { normalizeDialogues: false });

  return (
    diegeticClean
      // JSON Artifacts
      .replace(/```(?:json|javascript|typescript)?\s*[\s\S]*?```/gi, '')
      .replace(/\{\s*"[^"]+"\s*:\s*[^\}]*\}/g, '')
      // Technical orders
      .replace(/Order\s*#\d+/gi, '')
      .replace(/iOrder\s*#\d+/gi, '')
      .replace(/SkillCheckRequest\s*\{[^\}]*\}/gi, '')
      // Didaskalia w klamrach (do odczytu: {Budzisz się...} -> Budzisz się...)
      .replace(/\{([^}]*)\}/g, '$1')
      // Testy kości i wyniki - USUWAMY z TTS
      .replace(/\[🎲[^\]]*\]/g, '')
      .replace(/test:\s*[^\]]*\]/gi, '')
      .replace(/\[Test:[^\]]*\]/gi, '')
      .replace(/Wynik:\s*\d+\s*→[^.!\n]*/gi, '')
      .replace(/Progi:[^\n]*/gi, '')
      .replace(/\(Rzut\s+(ręczny|automatyczny)\)/gi, '')
      .replace(/^ℹ️\s*🎲\s*Test:[^\n]*/gm, '')
      .replace(/^MG:\s*/gm, '')
      // GM Protocol & Media tags
      .replace(
        /\[(?:ILUSTRACJA|OBRAZ|GRAFIKA|RYSUNEK|ZDJĘCIE|SCENA|PORTRET|WIZUALIZACJA|IMAGE|PICTURE|ILLUSTRATION|SHOW|VISUALIZE|SCENE|PORTRAIT)[^\]]*\]/gi,
        ''
      )
      .replace(new RegExp(`\\[MYŚLI_MG:${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(new RegExp(`\\[NASTRÓJ:${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(new RegExp(`\\[CEL_NARRACYJNY:${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(/\[NPC:[^\]]*\]/gi, '')
      .replace(/\[(?:OBECNI_NPC|PRESENT_NPCS):[^\]]*\]/gi, '')
      .replace(/\[POSTAĆ:[^\]]*\]/gi, '')
      .replace(/\[(?:LOKACJA|LOCATION):[^\]]*\]/gi, '')
      .replace(/\[PRZEDMIOT:[^\]]*\]/gi, '')
      .replace(/\[ZDOBYTY_PRZEDMIOT:[^\]]*\]/gi, '')
      .replace(/\[WALKA:[^\]]*\]/gi, '')
      .replace(/\[(?:ATAK_WRĘCZ|ATAK_WRECZ|MELEE_ATTACK):[^\]]*\]/gi, '')
      .replace(/\[(?:WYNIK_WALKI|COMBAT_RESULT):[^\]]*\]/gi, '')
      .replace(/\[(?:OBRONA|DEFENSE):[^\]]*\]/gi, '')
      .replace(/\[(?:COMBAT):[^\]]*\]/gi, '')
      .replace(/\[(?:ZAGROŻENIE|ZAGROZENIE|HAZARD):[^\]]*\]/gi, '')
      .replace(/\[(?:CZAR|SPELL|MAGIA|OBRONA_MAGIA|MAGIA_OBRONA|OPPOSED_MAGIC|MAGIA_SPONTANICZNA|SPONTANEOUS_MAGIC):[^\]]*\]/gi, '')
      .replace(/\[(?:WYNIK_CZARU|SPELL_RESULT|WYNIK_OBRONY_MAGII|OPPOSED_MAGIC_RESULT):[^\]]*\]/gi, '')
      .replace(/\[(?:TOM|TOME|KSIĘGA|KSIEGA|STUDIUM):[^\]]*\]/gi, '')
      .replace(/\[(?:WYNIK_TOMU|TOME_RESULT):[^\]]*\]/gi, '')
      .replace(/\[(?:POŚCIG|POSCIG|CHASE):[^\]]*\]/gi, '')
      .replace(/\[(?:WYNIK_POŚCIGU|WYNIK_POSCIGU|CHASE_RESULT):[^\]]*\]/gi, '')
      .replace(/\[(?:WYNIK_ZAGROŻENIA|WYNIK_ZAGROZENIA|HAZARD_RESULT):[^\]]*\]/gi, '')
      .replace(/\[SANITY:[^\]]*\]/gi, '')
      .replace(/\[(?:OBSERWACJA|OBSERVATION):[^\]]*\]/gi, '')
      .replace(/\[(?:SEKRETY_MG|KEEPER_SECRETS):[^\]]*\]/gi, '')
      .replace(/\[\/(?:OBSERWACJA|OBSERVATION|SEKRETY_MG|KEEPER_SECRETS)\]/gi, '')
      .replace(/\[(?:DZIENNIK|JOURNAL):[^\]]*\]/gi, '')
      .replace(/\[\/(?:DZIENNIK|JOURNAL)\]/gi, '')
      .replace(/\[EKSPOZYCJA:[^\]]*\]/gi, '')
      .replace(/\[KLIMAT:[^\]]*\]/gi, '')
      .replace(/\[(?:SFX|DŹWIĘK|DZWIEK):[^\]]*\]/gi, '')
      .replace(/\[(?:AUDIO|NAGRANIE):[^\]]*\]/gi, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // Catch-all: dowolny [TAG...], z wyjątkiem oficjalnych tagów audio Gemini TTS ([whispers], [trembling] itp.)
      .replace(new RegExp(`\\[(?!(?:${GEMINI_TTS_EMOTION_TAGS})\\])[^\\]]*\\]`, 'gi'), '')
      // Markdown removal
      .replace(/\*\*/g, '')
      .replace(/\*([^*]+?)\*/g, '$1')
      .replace(/__/g, '')
      .replace(/_([^_]+?)_/g, '$1')
      .replace(/`/g, '')
      .replace(/^#{1,6}\s+/gm, '')
      // Usunięcie cudzysłowów (zapobiega czytaniu "cudzysłów")
      .replace(/["„”«»]/g, '')
      // Emojis
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      // Spaces
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * IND-193: usuwa bloki TECHNICZNE mogące obejmować wiele zdań/linii (tagi [TAG:...],
 * DZIENNIK z treścią, code fences ```, multiline JSON {"..."}) z CAŁEGO tekstu PRZED
 * cięciem na zdania. W przeciwieństwie do cleanResponseText ZACHOWUJE `\n`/whitespace -
 * kluczowe, by split zdań po `\n` (multi-voice TTS) nadal działał. Czyszczenie per-zdanie
 * (markdown, emoji, cudzysłowy, single-line tagi) robi cleanResponseText na pojedynczych zdaniach.
 *
 * `{narration}` (bez cudzysłowu) NIE jest usuwane - per-zdanie cleanResponseText wyciągnie treść.
 */
export function stripMultilineArtifacts(text: string): string {
  if (!text) return '';
  return (
    text
      .replace(/```(?:json|javascript|typescript)?\s*[\s\S]*?(?:```|$)/gi, '') // code fences
      .replace(/\[(?:DZIENNIK|JOURNAL):[^\]]*\][\s\S]*?(?:\[\/(?:DZIENNIK|JOURNAL)\]|$)/gi, '') // blok dziennika z treścią
      // Zamknięte bloki OBSERWACJA i SEKRETY_MG (z opcjonalnym nagłówkiem po dwukropku)
      .replace(/\[(?:OBSERWACJA|OBSERVATION)(?::[^\]]*)?\][\s\S]*?\[\/(?:OBSERWACJA|OBSERVATION)\]/gi, '')
      .replace(/\[(?:SEKRETY_MG|KEEPER_SECRETS)(?::[^\]]*)?\][\s\S]*?\[\/(?:SEKRETY_MG|KEEPER_SECRETS)\]/gi, '')
      // Niezamknięte bloki OBSERWACJA i SEKRETY_MG podczas streamingu (|$ na końcu)
      .replace(/\[(?:OBSERWACJA|OBSERVATION)\][\s\S]*$/gi, '')
      .replace(/\[(?:SEKRETY_MG|KEEPER_SECRETS)\][\s\S]*$/gi, '')
      // Zamknięte bloki Depth Injection / Pacing Directive
      .replace(/\[(?:PRZYPOMNIENIE DLA MG|GM DIRECTIVE|DYNAMIC SCENE|PACING INJECTION|AUTHOR'S NOTE)[^\]]*\][\s\S]*?\[\/(?:PRZYPOMNIENIE DLA MG|GM DIRECTIVE|DYNAMIC SCENE|PACING INJECTION|AUTHOR'S NOTE)\]/gi, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // każdy [TAG:...], odporny na zagnieżdżony [...], z ochroną dozwolonych tagów emocji lektora
      .replace(new RegExp(`\\[(?!(?:${GEMINI_TTS_EMOTION_TAGS})\\])${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(/\{\s*"[^"]*"[^}]{0,500}\}/g, '')
  ); // multiline JSON {"..."}
}

/**
 * Lekki stripper tagów AI - usuwa TYLKO tagi w nawiasach kwadratowych.
 * W przeciwieństwie do cleanResponseText() NIE usuwa markdown, cudzysłowów, emoji.
 * Przeznaczony do czyszczenia opisów ekwipunku, lokacji itp.
 */
export function stripAITags(text: string): string {
  if (!text) return '';
  const mechanicallyCleaned = sanitizeMechanicalTags(text);
  return (
    mechanicallyCleaned
      // Catch-all: [UPPERCASE_TAG...] (min 3 wielkie litery/podkreślenia),
      // odporny na zagnieżdżony [...]
      .replace(new RegExp(`\\[[A-ZŁŚŻŹĆŃ_]{3,}${NESTED_TAG_BODY}\\]`, 'g'), '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/**
 * Sprawdza czy słowo to typowe słowo (nie imię)
 */
export function isCommonWord(word: string): boolean {
  const commonWords = [
    'ten',
    'ta',
    'to',
    'on',
    'ona',
    'ono',
    'ty',
    'ja',
    'my',
    'wy',
    'oni',
    'one',
    'tak',
    'nie',
    'ale',
    'więc',
    'bo',
    'że',
    'czy',
    'jak',
    'co',
    'kto',
    'stary',
    'młody',
    'mały',
    'duży',
    'wysoki',
    'niski',
    'mężczyzna',
    'kobieta',
    'człowiek',
    'osoba',
    'postać',
    'chwilę',
    'nagle',
    'potem',
    'wtedy',
    'teraz',
    'zaraz',
  ];
  return commonWords.includes(word.toLowerCase());
}
