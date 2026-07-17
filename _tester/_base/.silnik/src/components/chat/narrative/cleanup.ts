/**
 * NarrativeFormatter cleanup - IND-144 micro 2/8 (extract z NarrativeFormatter.tsx)
 *
 * ~30 cleanup regex chain stripping AI artifacts (prefixes, image tags, GM Protocol,
 * JSON code blocks, orphan braces). Pure function bez state.
 *
 * Wycięto 1:1 z formatNarrative (lin 39-126 post-F1). Zachowuje kolejność regex i
 * komentarze (IND-165 Audio TTS whitelist + IND-145 cleanup nawiasów klamrowych).
 */

// Ciało tagu odporne na 1 poziom zagnieżdżenia [...]. AI bywa wplata audio-tag
// emocji (np. [serious], [trembling]) w środek [NASTRÓJ: ...]; naiwne [^\]]*
// ucinałoby na pierwszym wewnętrznym `]` (tym od [serious]) i zostawiało ogon
// treści w czacie + lektorze. (?:[^\[\]]|\[[^\]]*\])* = znak nie-nawias ALBO
// zagnieżdżona para [...], więc cały tag znika. Linia 63 (gola linia) domyka
// skrajne przypadki (samotny niezamknięty `[`).
const NESTED_TAG_BODY = '(?:[^\\[\\]]|\\[[^\\]]*\\])*';

export function cleanupContent(content: string): string {
  // Usuń prefiksy AI z początku tekstu (MG: Assistant:, GM:, itp.)
  let cleanContent = content
    .replace(
      /^(MG|GM|AI|Assistant|Mistrz Gry|Game Master):\s*(Assistant:\s*)?/gi,
      ''
    )
    .replace(/^(Assistant:\s*)?/i, '')
    .trim();

  // === KLUCZOWA NAPRAWA: Wyciągnij treść z nawiasów klamrowych ===
  // AI używa {} do narracji/didaskaliów - treść powinna być WYŚWIETLANA bez nawiasów
  // {Budzisz się w gabinecie...} → Budzisz się w gabinecie...
  cleanContent = cleanContent.replace(/\{([^}]+)\}/g, '$1').trim();

  // Usuń tagi ilustracji/obrazów
  cleanContent = cleanContent
    .replace(/\[ILUSTRACJA:[^\]]*\]/gi, '')
    .replace(/\[ILLUSTRATION:[^\]]*\]/gi, '')
    .replace(/\[IMAGE:[^\]]*\]/gi, '')
    .replace(/\[OBRAZ:[^\]]*\]/gi, '')
    .replace(/\[GRAFIKA:[^\]]*\]/gi, '')
    .replace(/\[SCENA:[^\]]*\]/gi, '')
    .replace(/\[PORTRET:[^\]]*\]/gi, '')
    // Usuń tagi testów umiejętności (renderowane osobno przez SkillTestCard)
    .replace(/\[TEST:[^\]]*\]/gi, '')
    .replace(/\[WYNIK:[^\]]*\]/gi, '')
    // GM Protocol tags - ukryte metadane, nie do wyświetlania.
    // MYŚLI_MG/NASTRÓJ/CEL_NARRACYJNY niosą swobodny tekst, w który AI wplata
    // audio-tagi - dlatego ciało odporne na zagnieżdżenie (NESTED_TAG_BODY).
    .replace(new RegExp(`\\[MYŚLI_MG:${NESTED_TAG_BODY}\\]`, 'gi'), '')
    .replace(new RegExp(`\\[NASTRÓJ:${NESTED_TAG_BODY}\\]`, 'gi'), '')
    .replace(new RegExp(`\\[CEL_NARRACYJNY:${NESTED_TAG_BODY}\\]`, 'gi'), '')
    .replace(/\[NPC:[^\]]*\]/gi, '')
    .replace(/\[LOKACJA:[^\]]*\]/gi, '')
    .replace(/\[PRZEDMIOT:[^\]]*\]/gi, '')
    .replace(/\[WALKA:[^\]]*\]/gi, '')
    .replace(/\[SANITY:[^\]]*\]/gi, '')
    // [HP: ±N: powód] - utrata/odzysk życia (aplikowane do karty, niewidoczne
    // w czacie). Krótszy niż 3 znaki, więc catch-all niżej go NIE łapie - explicit.
    .replace(/\[HP:[^\]]*\]/gi, '')
    // clock-debt: znacznik czasu [AKTUALNY CZAS: ...] przesuwa zegar gry
    // (parsowany przez extractTimeUpdate), ale nie pokazujemy go w czacie
    .replace(/\[AKTUALNY CZAS:[^\]]*\]/gi, '')
    // Dziennik - wieloliniowy tag [DZIENNIK:typ:tytuł]treść[/DZIENNIK]
    .replace(/\[DZIENNIK:[^\]]*\][\s\S]*?\[\/DZIENNIK\]/gi, '')
    .replace(/\[DZIENNIK:[^\]]*\]/gi, '')
    .replace(/\[\/DZIENNIK\]/gi, '')
    // IND-224: warianty BEZ nawiasów lub niedomknięte (Flash gubi `[`/`]`) - strip
    // całej linii nagłówka tagu protokołu. Bez tego przeciekają do czatu, a linia
    // "DZIENNIK:..." myli parser (brana za handout newspaper → fałszywy "WYCINEK
    // PRASOWY"). Wymóg ':' tuż po słowie-kluczu chroni prozę ("Dziennik leżał na
    // biurku" - brak dwukropka - oraz tytuł gazety "Dziennik Polski" zostają).
    .replace(
      /^\s*\[?(?:MYŚLI_MG|NASTRÓJ|CEL_NARRACYJNY|DZIENNIK)\s*:[^\n]*$/gim,
      ''
    )
    // IND-165 - Audio tags TTS (Gemini Flash TTS): regex restrictive whitelist
    // tagów oficjalnych z docs Google. LLM emituje, TTS interpretuje, UI strip.
    // NIE łapie legitimate `[Skill check: X]` ani `[handout: list]` bo nie pasują
    // do whitelisty pojedynczego lowercase słowa lub fraz typu "very fast".
    .replace(
      /\[(?:whispers|trembling|panicked|serious|curious|sarcastic|tired|crying|amazed|excited|mischievously|sighs|gasp|giggles|laughs|shouting|very fast|very slow|sarcastically)\]/gi,
      ''
    )
    // Usuń ukryte instrukcje MG i tagi techniczne (już wyciągnięte z {})
    .replace(
      /(?:INSTRUKCJA|GM|META|UKRYTE|HIDDEN|SFX|DŹWIĘK|DZWIEK|THINKING|SYSTEM|ACTION|AKCJA):[^\n]*/gi,
      ''
    )
    // Catch-all dla HALUCYNOWANYCH tagów protokołu [SŁOWO_KLUCZ: ...] - model
    // (zwłaszcza Flash) wymyśla tagi spoza listy, np. [SAN_LOSS: 1D4]. Wymóg ':'
    // po UPPERCASE słowie (min 3 znaki) chroni prozę i whisper [Co robisz?] (małe
    // litery, brak ':'). TTS ma już catch-all [...] (text-cleaner stripAITags) -
    // to domyka asymetrię display vs lektor. NESTED_TAG_BODY: też gdy halucynowany
    // tag ma w środku zagnieżdżony [...].
    .replace(
      new RegExp(`\\[[A-ZŁŚŻŹĆŃ_]{3,}\\s*:${NESTED_TAG_BODY}\\]`, 'g'),
      ''
    )
    .trim();

  // === Usuwanie artefaktów technicznych (Problem #2) ===

  // Usuń bloki kodu markdown z zawartością JSON-ową
  cleanContent = cleanContent.replace(
    /```(?:json|javascript|typescript)?\s*[\s\S]*?```/gi,
    ''
  );
  // Usuń inline JSON objects (max 500 znaków) - rozszerzone
  cleanContent = cleanContent.replace(/\{\s*"[^"]*"[^}]{0,500}\}/g, '');
  // Usuń Order #ID i podobne artefakty
  cleanContent = cleanContent.replace(/\b[iO]rder\s*#\d+/gi, '');
  cleanContent = cleanContent.replace(/SkillCheckRequest\s*\{[^\}]*\}/gi, '');

  // Usuń orphan opening/closing braces na osobnych liniach
  cleanContent = cleanContent.replace(/^\s*\{\s*$/gm, '');
  cleanContent = cleanContent.replace(/^\s*\}\s*$/gm, '');

  // Usuń linie zawierające tylko { lub } (nawet z tekstem przed/po)
  cleanContent = cleanContent.replace(/^[^\S\n]*[\{\}][^\S\n]*$/gm, '');

  // Usuń pozostałości po formatowaniu JSON
  cleanContent = cleanContent.replace(/^\s*\[\{[\s\S]*?\}\]\s*$/gm, '');
  cleanContent = cleanContent.replace(/^\s*\{[\s\S]{0,20}\s*$/gm, '');

  // Usuń linie zawierające tylko klucze JSON lub orphan znaki
  cleanContent = cleanContent.replace(/^\s*"[^"]+"\s*:\s*$/gm, '');
  cleanContent = cleanContent.replace(/^\s*["'\[\]{}]\s*$/gm, '');

  // Usuń pozostałe samotne nawiasy klamrowe otoczone spacjami
  cleanContent = cleanContent.replace(/\s+\{\s+/g, ' ');
  cleanContent = cleanContent.replace(/\s+\}\s+/g, ' ');

  // Inline [Co robisz?] - Flash wstawia go w środek akapitu zamiast w osobnej
  // linii, przez co parser (wymaga tagu na osobnej linii) renderuje go jako surowy
  // tekst zamiast przycisku. Przenieś do osobnej linii, by trafił do whisper.
  cleanContent = cleanContent.replace(
    /(\S)[ \t]*(\[Co robisz\?\])/gi,
    '$1\n\n$2'
  );

  // Usuń nadmiarowe puste linie
  cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  return cleanContent;
}
