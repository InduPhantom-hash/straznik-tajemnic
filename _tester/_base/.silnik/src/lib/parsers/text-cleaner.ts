// Ciało tagu odporne na 1 poziom zagnieżdżenia [...]. AI bywa wplata audio-tag
// emocji (np. [serious], [trembling]) w środek [NASTRÓJ: ...]; naiwne [^\]]*
// ucinałoby na pierwszym wewnętrznym `]` i ogon treści przeciekał do lektora.
// Bliźniacza stała w narrative/cleanup.ts (warstwa display). `[^\[\]]` matchuje
// też `\n`, więc multiline tagi są zachowane.
const NESTED_TAG_BODY = '(?:[^\\[\\]]|\\[[^\\]]*\\])*';

/**
 * Czyści tekst odpowiedzi AI z artefaktów technicznych, przygotowując go do TTS
 */
export function cleanResponseText(text: string): string {
  if (!text) return '';

  return (
    text
      // Prefiksy AI
      .replace(
        /^(A|AI|Assistant|MG|GM|Mistrz Gry|Game Master):\s*(Assistant:\s*)?/gi,
        ''
      )
      .replace(/^(Assistant:\s*)?/i, '')
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
      .replace(/test:\s*[^\]]*\]/gi, '') // Poprawiony regex dla [Test: ...]
      .replace(/\[Test:[^\]]*\]/gi, '')
      .replace(/Wynik:\s*\d+\s*→[^.!\n]*/gi, '')
      .replace(/Progi:[^\n]*/gi, '')
      .replace(/\(Rzut\s+(ręczny|automatyczny)\)/gi, '')
      .replace(/^ℹ️\s*🎲\s*Test:[^\n]*/gm, '')
      .replace(/^MG:\s*/gm, '')
      // Tagi AI ([ILUSTRACJA], [WYNIK], etc) - usunięte z TTS
      // Rozszerzona lista tagów obrazów i innych technicznych
      .replace(
        /\[(?:ILUSTRACJA|OBRAZ|GRAFIKA|RYSUNEK|ZDJĘCIE|SCENA|PORTRET|WIZUALIZACJA|IMAGE|PICTURE|ILLUSTRATION|SHOW|VISUALIZE|SCENE|PORTRAIT)[^\]]*\]/gi,
        ''
      )
      // GM Protocol tags - jawne usuwanie przed generycznym catch-all.
      // Ciało odporne na zagnieżdżony [...] (audio-tag wpleciony w [NASTRÓJ:]).
      .replace(new RegExp(`\\[MYŚLI_MG:${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(new RegExp(`\\[NASTRÓJ:${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(new RegExp(`\\[CEL_NARRACYJNY:${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(/\[NPC:[^\]]*\]/gi, '')
      .replace(/\[LOKACJA:[^\]]*\]/gi, '')
      .replace(/\[PRZEDMIOT:[^\]]*\]/gi, '')
      .replace(/\[ZDOBYTY_PRZEDMIOT:[^\]]*\]/gi, '')
      .replace(/\[WALKA:[^\]]*\]/gi, '')
      .replace(/\[SANITY:[^\]]*\]/gi, '')
      .replace(/\[DZIENNIK:[^\]]*\]/gi, '')
      .replace(/\[\/DZIENNIK\]/gi, '')
      // Catch-all: dowolny [TAG...], odporny na 1 poziom zagnieżdżenia [...]
      .replace(new RegExp(`\\[${NESTED_TAG_BODY}\\]`, 'g'), '')
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
      .replace(/```(?:json|javascript|typescript)?\s*[\s\S]*?```/gi, '') // code fences
      .replace(/\[DZIENNIK:[^\]]*\][\s\S]*?\[\/DZIENNIK\]/gi, '') // blok dziennika z treścią
      // każdy [TAG:...] (spans \n), odporny na zagnieżdżony [...]
      .replace(new RegExp(`\\[${NESTED_TAG_BODY}\\]`, 'g'), '')
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
  return (
    text
      // GM Protocol tags - jawne (ciało odporne na zagnieżdżony [...])
      .replace(new RegExp(`\\[MYŚLI_MG:${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(new RegExp(`\\[NASTRÓJ:${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(new RegExp(`\\[CEL_NARRACYJNY:${NESTED_TAG_BODY}\\]`, 'gi'), '')
      .replace(/\[NPC:[^\]]*\]/gi, '')
      .replace(/\[LOKACJA:[^\]]*\]/gi, '')
      .replace(/\[PRZEDMIOT:[^\]]*\]/gi, '')
      .replace(/\[ZDOBYTY_PRZEDMIOT:[^\]]*\]/gi, '')
      .replace(/\[WALKA:[^\]]*\]/gi, '')
      .replace(/\[SANITY:[^\]]*\]/gi, '')
      .replace(/\[DZIENNIK:[^\]]*\]/gi, '')
      .replace(/\[\/DZIENNIK\]/gi, '')
      // Media i mechaniki
      .replace(/\[(?:ILUSTRACJA|OBRAZ|TEST|WYNIK)[^\]]*\]/gi, '')
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
