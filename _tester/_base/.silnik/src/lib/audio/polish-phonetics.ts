/**
 * Polish Phonetics & Pronunciation Normalizer for Gemini TTS (Issue #173)
 *
 * Problem:
 * Modele wielojęzyczne Gemini TTS (np. gemini-2.5-flash-preview-tts) czytają
 * tekst na podstawie tokenów. Gdy dyrektywa audio jest po angielsku
 * lub słowo wygląda identycznie/podobnie do angielskiego, model ma tendencję do:
 * 1. Zniekształcania polskich słów na modłę angielską (np. sklepowe „lady” -> „lejdi”,
 *    „post” -> „połst”, „bary” -> „beri”, „molo” -> „moulo”, „pie” -> „paj”).
 * 2. Seplenienia lub połykania polskich głosek szeleszczących i szczelinowych
 *    (sz, cz, rz, ż, ź, ć, ś, ł, ą, ę) przy zbitkach spółgłoskowych.
 *
 * Rozwiązanie (Dwuwarstwowy Pancerz Fonetyczny):
 * 1. Dyrektywa wokalna (Audio Direction): Bezwzględny nakaz czystej, polskiej artykulacji
 *    z wyraźnym wymawianiem polskich głosek.
 * 2. Normalizator leksykalno-fonetyczny: Zamiana homografów polsko-angielskich na formy
 *    jednoznaczne fonetycznie dla silnika TTS.
 */

/**
 * Podstawowa dyrektywa artykulacyjna dla polskiego lektora Gemini TTS.
 * Dołączana do audioDirection dla języka polskiego.
 */
export const POLISH_PHONETIC_AUDIO_DIRECTIVE =
  'Use clear, natural Polish pronunciation with accurate Polish sounds (sz, cz, rz, ż, ź, ć, ś, ł, ą, ę).';

/**
 * Słownik homografów i słów wrażliwych fonetycznie:
 * Słowa w języku polskim, które model TTS może omyłkowo przeczytać po angielsku.
 */
interface HomographRule {
  /** Wyrażenie regularne dopasowujące słowo (z uwzględnieniem granic słowa \b) */
  pattern: RegExp;
  /** Zastępnik zapewniający jednoznaczną polską fonetykę dla TTS */
  replacement: string | ((substring: string, ...args: (string | number)[]) => string);
}

/**
 * Reguły zamian fonetycznych dla języka polskiego.
 * Ostrożne zamiany całosłowne (word-boundary) bez niszczenia fleksji.
 */
export const POLISH_HOMOGRAPH_RULES: HomographRule[] = [
  // 1. „lady” (sklepowej, barowej) vs angielskie „lady” (dama / lejdi)
  // Przykłady w RPG: „zza lady”, „na ladzie”, „do lady”, „blat lady”
  {
    pattern: /\b(zza|zza drewnianej|zza kamiennej|zza wysokiej|do|przy|na|obok|wzdłuż|spod|blat|blacie)\s+lady\b/gi,
    replacement: (_match, prefix) => `${prefix} laddy`, // podwójne d wymusza twarde, krótkie polskie 'la-dy'
  },
  {
    pattern: /\blady\s+(sklepowej|barowej|recepcyjnej|drewnianej|szklanej|kantoru)\b/gi,
    replacement: (_match, suffix) => `laddy ${suffix}`,
  },
  // Izolowane "lady" gdy poprzedzone rodzajnikiem polskim lub zaimkiem
  {
    pattern: /\b(tej|tamtej|swojej|starej)\s+lady\b/gi,
    replacement: (_match, prefix) => `${prefix} laddy`,
  },

  // 2. „post” (w poście, religijny, wstrzemięźliwość) vs angielskie „post” (połst)
  {
    pattern: /(?:^|[^\p{L}\p{N}])(ścisły|surowy|długi|złamany)\s+post\b/giu,
    replacement: (_match, prefix) => ` ${prefix} posst`,
  },
  {
    pattern: /\bpost\s+(ścisły|religijny|o chlebie i wodzie)\b/giu,
    replacement: (_match, suffix) => `posst ${suffix}`,
  },

  // 3. „pie” (od pies / psu / pie w archaizmach) vs angielskie „pie” (ciasto / paj)
  {
    pattern: /\b(o|przy|o tym|o wiernym)\s+pie\b/gi,
    replacement: (_match, prefix) => `${prefix} psie`,
  },

  // 4. Normalizacja pauz i półpauz rozbijających zbitki
  {
    pattern: /[—–]/g,
    replacement: ' - ',
  },
];

/**
 * Normalizuje tekst w języku polskim pod kątem fonetyki syntezatora mowy Gemini TTS.
 *
 * @param text Tekst do przetworzenia
 * @param locale Język sesji ('pl' lub 'en')
 * @returns Znormalizowany tekst zoptymalizowany pod poprawną fonetykę
 */
export function normalizePhoneticsForTts(
  text: string,
  locale: 'pl' | 'en' = 'pl'
): string {
  if (!text || locale !== 'pl') {
    return text;
  }

  let normalized = text;

  // Zastosuj reguły zamian fonetycznych
  for (const rule of POLISH_HOMOGRAPH_RULES) {
    if (typeof rule.replacement === 'function') {
      normalized = normalized.replace(rule.pattern, rule.replacement);
    } else {
      normalized = normalized.replace(rule.pattern, rule.replacement);
    }
  }

  // Usuń podwójne/potrójne spacje powstałe po zamianach
  normalized = normalized.replace(/[ \t]+/g, ' ').trim();

  return normalized;
}

/**
 * Wzbogaca instrukcję reżyserską (audioDirection) o dyrektywę polskiej fonetyki,
 * jeśli generujemy mowę w języku polskim.
 *
 * @param audioDirection Bazowa instrukcja stylu mowy
 * @param locale Język syntezy ('pl' lub 'en')
 * @returns Instrukcja rozszerzona o dyrektywę artykulacyjną
 */
export function enhanceAudioDirectionWithPhonetics(
  audioDirection: string,
  locale: 'pl' | 'en' = 'pl'
): string {
  if (locale !== 'pl') {
    return audioDirection;
  }

  if (!audioDirection) {
    return POLISH_PHONETIC_AUDIO_DIRECTIVE;
  }

  // Jeśli dyrektywa już zawiera wskazówki polskiej fonetyki, nie dubluj
  if (audioDirection.includes('Polish pronunciation')) {
    return audioDirection;
  }

  // Dołącz klauzulę fonetyczną do instrukcji reżyserskiej
  return `${audioDirection.trim()} ${POLISH_PHONETIC_AUDIO_DIRECTIVE}`;
}
