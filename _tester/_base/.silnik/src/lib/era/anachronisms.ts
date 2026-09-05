/**
 * @file src/lib/era/anachronisms.ts
 * 
 * Silnik detekcji anachronizmów (Anachronism Engine).
 * Analizuje tekst wprowadzony przez gracza pod kątem technologii, instytucji i procedur,
 * które w danym roku historycznym jeszcze nie istniały, i zwraca historyczny odpowiednik.
 */

import { getEraHardGuardrails } from './baseline';

export interface AnachronismDetection {
  detected: boolean;
  term?: string;
  category?: 'tech' | 'institution' | 'forensics';
  reason?: string;
  alternative?: string;
}

interface KeywordRule {
  pattern: RegExp;
  term: string;
  category: 'tech' | 'institution' | 'forensics';
  maxYear: number;
  reasonPl: string;
  alternativePl: string;
  reasonEn: string;
  alternativeEn: string;
  regions?: ('PL' | 'USA')[];
}

/**
 * Zestaw reguł detekcji kluczowych anachronizmów z granicą roku ich wprowadzenia.
 */
const ANACHRONISM_RULES: KeywordRule[] = [
  // 1. Smartfony i urządzenia mobilne
  {
    pattern: /\b(smartfon\w*|smartphone\w*|iphone\w*|android\w*|tablet\w*|ekran\w*\s+dotykow\w*)\b/i,
    term: 'smartfon',
    category: 'tech',
    maxYear: 2006,
    reasonPl: 'Smartfony i ekrany dotykowe pojawiły się dopiero pod koniec lat 2000.',
    alternativePl: 'budka telefoniczna, telefon stacjonarny lub telefon komórkowy z klawiaturą (od lat 90.)',
    reasonEn: 'Smartphones and touchscreens did not exist until the late 2000s.',
    alternativeEn: 'phone booth, landline telephone, or keypad mobile phone (from the 1990s)'
  },
  // 2. Telefonia komórkowa ogółem (przed latami 90.)
  {
    pattern: /\b(komórk\w*|komorce|telefon\w*\s+komórkow\w*|cell\s*phone\w*|mobile\s*phone\w*)\b/i,
    term: 'telefon komórkowy',
    category: 'tech',
    maxYear: 1989,
    reasonPl: 'Powszechna telefonia komórkowa nie była dostępna przed latami 90.',
    alternativePl: 'telefon stacjonarny, automat na monety/żetony lub telegraf',
    reasonEn: 'Mobile cellphones were not available before the 1990s.',
    alternativeEn: 'landline telephone, payphone, or telegraph'
  },
  // 3. Internet i sieć
  {
    pattern: /\b(internet\w*|wi-?fi\b|sieci\s+www\b|przeglądark\w*\s+internetow\w*|wyszukiwark\w*|google\b)\b/i,
    term: 'internet',
    category: 'tech',
    maxYear: 1990,
    reasonPl: 'Sieć internetowa nie była dostępna dla obywateli ani badaczy przed latami 90.',
    alternativePl: 'biblioteka miejska, czytelnia czasopism lub archiwum miejskie',
    reasonEn: 'The internet was not available to the general public or investigators before the 1990s.',
    alternativeEn: 'public library, newspaper archives, or town records'
  },
  // 4. GPS i nawigacja cyfrowa
  {
    pattern: /\b(gps\b|nawigacj\w*\s+satelitarn\w*|satelit\w*\s+gps)\b/i,
    term: 'nawigacja GPS',
    category: 'tech',
    maxYear: 1995,
    reasonPl: 'Cywilna nawigacja satelitarna GPS nie była dostępna przed drugą połową lat 90.',
    alternativePl: 'papierowa mapa topograficzna, atlas samochodowy lub kompas',
    reasonEn: 'Civilian GPS satellite navigation was not available before the late 1990s.',
    alternativeEn: 'paper road atlas, topographic map, or magnetic compass'
  },
  // 5. Kryminalistyka: DNA
  {
    pattern: /\b(badani\w*\s+dna|test\w*\s+dna|analiz\w*\s+dna|kod\w*\s+dna|próbk\w*\s+dna)\b/i,
    term: 'badania DNA',
    category: 'forensics',
    maxYear: 1986,
    reasonPl: 'Profilowanie genetyczne DNA w kryminalistyce wprowadzono pod koniec lat 80.',
    alternativePl: 'badanie grupy krwi A/B/O, analiza mikroskopowa tkanek i odcisków palców',
    reasonEn: 'Forensic DNA profiling was not introduced until the late 1980s.',
    alternativeEn: 'A/B/O blood typing, microscopic hair/fiber analysis, and manual fingerprinting'
  },
  // 6. Numery alarmowe 911 / 112
  {
    pattern: /\b(911\b|112\b|numer\w*\s+alarmow\w*)\b/i,
    term: 'numer alarmowy (911/112)',
    category: 'institution',
    maxYear: 1968,
    reasonPl: 'Zintegrowany numer ratunkowy nie istniał w tej epoce.',
    alternativePl: 'połączenie przez telefonistkę z lokalnym komisariatem policji lub wezwanie dyżurnego',
    reasonEn: 'Integrated emergency dispatch numbers did not exist in this era.',
    alternativeEn: 'asking the central operator to connect to the local police precinct or hospital'
  },
  // 7. Płatności bezgotówkowe: Blik / Karta płatnicza
  {
    pattern: /\b(blik\w*|płatnoś\w*\s+kart\w*|kart\w*\s+kredytow\w*|kart\w*\s+płatnicz\w*|karcie\s+kredytowej)\b/i,
    term: 'płatność kartą / BLIK',
    category: 'tech',
    maxYear: 1950,
    reasonPl: 'Płatności kartami kredytowymi nie istniały przed latami 50. XX wieku.',
    alternativePl: 'gotówka (banknoty i monety z epoki), książeczka czekowa lub weksel',
    reasonEn: 'Credit card payments did not exist before the 1950s.',
    alternativeEn: 'cash (period bills and coins), bank check, or letter of credit'
  },
  // 8. Długopisy kulkowe (przed 1938 r.)
  {
    pattern: /\b(długopis\w*|ballpoint\s+pen\w*)\b/i,
    term: 'długopis',
    category: 'tech',
    maxYear: 1938,
    reasonPl: 'Długopisy kulkowe opatentowano i spopularyzowano dopiero pod koniec lat 30.',
    alternativePl: 'wieczne pióro z kałamarzem, stalówka lub ołówek kopiowy',
    reasonEn: 'Ballpoint pens were not patented or produced until the late 1930s.',
    alternativeEn: 'fountain pen with ink, dip pen, or pencil'
  },
  // 9. Samochody w epoce wiktoriańskiej (przed 1900 r.)
  {
    pattern: /\b(samochód\w*|samochod\w*|samochodzie|auto\b|auta\b|autem\b|współczesny\s+samochód)\b/i,
    term: 'samochód',
    category: 'tech',
    maxYear: 1899,
    reasonPl: 'W epoce wiktoriańskiej samochody spalinowe nie były powszechnie dostępne.',
    alternativePl: 'dorożka, powóz konny, fiakier lub pociąg parowy',
    reasonEn: 'Automobiles were not commercially available or common in the Victorian era.',
    alternativeEn: 'horse-drawn carriage, hansom cab, or steam locomotive'
  },
  // 10. Prywatny detektyw w PRL
  {
    pattern: /\b(prywatn\w*\s+detektyw\w*|biur\w*\s+detektywistyczn\w*|agencj\w*\s+detektywistyczn\w*)\b/i,
    term: 'prywatny detektyw',
    category: 'institution',
    maxYear: 1989,
    regions: ['PL'],
    reasonPl: 'W PRL prywatna działalność detektywistyczna była nielegalna (monopol MO i SB).',
    alternativePl: 'kontakt z funkcjonariuszem Milicji Obywatelskiej (MO), adwokatem lub zaufanym informatorem',
    reasonEn: 'Private detective agencies were illegal in socialist Poland (state police monopoly).',
    alternativeEn: 'contacting a trusted Milicja officer, investigative journalist, or legal advocate'
  }
];

/**
 * Wykrywa anachronizmy w tekście gracza dla wskazanego roku i regionu.
 */
export function detectAnachronism(
  text: string,
  year: number,
  countryOrRegion = 'US',
  locale: 'pl' | 'en' = 'pl'
): AnachronismDetection | null {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  const normRegion = (countryOrRegion ?? '').toUpperCase().trim();
  const isPl = normRegion === 'PL' || normRegion === 'POLSKA' || normRegion === 'POLAND';
  const regionCode: 'PL' | 'USA' = isPl ? 'PL' : 'USA';

  // 1. Sprawdzenie reguł słownikowych
  for (const rule of ANACHRONISM_RULES) {
    if (year <= rule.maxYear) {
      if (rule.regions && !rule.regions.includes(regionCode)) {
        continue;
      }
      if (rule.pattern.test(text)) {
        return {
          detected: true,
          term: rule.term,
          category: rule.category,
          reason: locale === 'en' ? rule.reasonEn : rule.reasonPl,
          alternative: locale === 'en' ? rule.alternativeEn : rule.alternativePl
        };
      }
    }
  }

  // 2. Dodatkowa weryfikacja z hardGuardrails z baseline'u
  const guardrails = getEraHardGuardrails(year, countryOrRegion);
  if (guardrails) {
    const lowerText = text.toLowerCase();
    for (const forbidden of guardrails.forbiddenTech) {
      if (forbidden.length > 3 && lowerText.includes(forbidden.toLowerCase())) {
        const alt = guardrails.historicalAlternatives[forbidden] || 'tradycyjne metody z epoki';
        return {
          detected: true,
          term: forbidden,
          category: 'tech',
          reason: locale === 'en'
            ? `Technology '${forbidden}' did not exist or was unavailable in ${year}.`
            : `Technologia '${forbidden}' nie istniała lub nie była dostępna w ${year} roku.`,
          alternative: alt
        };
      }
    }
  }

  return null;
}
