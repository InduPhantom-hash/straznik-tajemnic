/**
 * rulebook-fingerprint.ts - Fingerprint i walidacja podręcznika zasad CoC 7e
 * Doktryna "Czystego Emulatora BYOB" (Clean Room Engine / Model ScummVM & RetroArch).
 *
 * Silnik Strażnik Tajemnic AI weryfikuje profil wgranego podręcznika gracza
 * (np. darmowy Starter d100 vs pełna Księga Strażnika 7e), potwierdzając obecność
 * kluczowych reguł i ustalając profil silnika bez przechowywania zastrzeżonych treści.
 */

export type RulebookProfile = 'starter-d100' | 'core-d100' | 'custom-d100' | 'unknown';

export interface RulebookFingerprintResult {
  profile: RulebookProfile;
  title: string;
  confidence: number;
  detectedFeatures: {
    hasCombatRules: boolean;
    hasSanityRules: boolean;
    hasChaseRules: boolean;
    hasMagicRules: boolean;
  };
  detectedLanguage: 'pl' | 'en' | 'unknown';
}

function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L");
}

/**
 * Analizuje tekst podręcznika PDF i wykrywa jego profil systemowy
 */
export function detectRulebookProfile(text: string): RulebookFingerprintResult {
  if (!text || typeof text !== 'string' || text.trim().length < 50) {
    return {
      profile: 'unknown',
      title: 'Nieznany dokument',
      confidence: 0,
      detectedFeatures: {
        hasCombatRules: false,
        hasSanityRules: false,
        hasChaseRules: false,
        hasMagicRules: false,
      },
      detectedLanguage: 'unknown',
    };
  }

  const rawSample = text.slice(0, 100000).toLowerCase();
  const sample = stripDiacritics(rawSample);

  // Detekcja języka dokumentu
  const plMarkers = [
    'poczytalnosc',
    'badacz',
    'straznik tajemnic',
    'kosc',
    'k100',
    'wspolczynniki',
    'sila',
    'kondycja',
    'zrecznosc',
  ];
  const enMarkers = [
    'sanity',
    'investigator',
    'keeper of arcane lore',
    'dice',
    'd100',
    'characteristics',
    'strength',
    'constitution',
    'dexterity',
  ];

  let plHits = 0;
  let enHits = 0;
  for (const m of plMarkers) {
    if (sample.includes(m)) plHits++;
  }
  for (const m of enMarkers) {
    if (sample.includes(m)) enHits++;
  }

  const detectedLanguage: 'pl' | 'en' | 'unknown' =
    plHits > enHits && plHits >= 2 ? 'pl' : enHits > plHits && enHits >= 2 ? 'en' : 'unknown';

  // Detekcja podsystemów regułowych
  const hasSanityRules =
    sample.includes('poczytalnos') ||
    sample.includes('szalenstw') ||
    sample.includes('sanity') ||
    sample.includes('bouts of madness') ||
    sample.includes('insanity');

  const hasCombatRules =
    sample.includes('walka') ||
    sample.includes('obrazenia') ||
    sample.includes('combat') ||
    sample.includes('damage') ||
    sample.includes('bron palna') ||
    sample.includes('firearms');

  const hasChaseRules =
    sample.includes('poscig') ||
    sample.includes('tor poscigu') ||
    sample.includes('chase') ||
    sample.includes('chase track') ||
    sample.includes('predkosc') ||
    sample.includes('speed');

  const hasMagicRules =
    sample.includes('magia') ||
    sample.includes('zaklecia') ||
    sample.includes('czary') ||
    sample.includes('tomiska') ||
    sample.includes('grimoire') ||
    sample.includes('spells') ||
    sample.includes('mythos tomes');

  // Weryfikacja czy dokument posiada cechy mechaniki d100 / CoC
  const isD100 =
    sample.includes('k100') ||
    sample.includes('d100') ||
    sample.includes('chaosium') ||
    sample.includes('cthulhu') ||
    hasSanityRules;

  if (!isD100) {
    return {
      profile: 'unknown',
      title: detectedLanguage === 'en' ? 'Unrecognized PDF Document' : 'Nierozpoznany dokument PDF',
      confidence: 0.1,
      detectedFeatures: {
        hasCombatRules,
        hasSanityRules,
        hasChaseRules,
        hasMagicRules,
      },
      detectedLanguage,
    };
  }

  // Weryfikacja: Core Book (Księga Strażnika) vs Starter (Zasady Skrócone)
  const isCoreIndicator =
    sample.includes('ksiega straznika') ||
    sample.includes('keeper rulebook') ||
    (hasChaseRules && hasMagicRules) ||
    sample.includes('rozdzial 8') ||
    sample.includes('chapter 8');

  const isStarterIndicator =
    sample.includes('zasady skrocone') ||
    sample.includes('quick-start') ||
    sample.includes('starter') ||
    sample.includes('zasady wprowadzajace') ||
    sample.includes('nawiedzony dom') ||
    sample.includes('the haunting');

  let profile: RulebookProfile = 'custom-d100';
  let title = '';
  let confidence = 0.7;

  if (isCoreIndicator && !isStarterIndicator) {
    profile = 'core-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Call of Cthulhu 7e: Księga Strażnika (Core Book)'
        : 'Call of Cthulhu 7e: Keeper Rulebook (Core Book)';
    confidence = 0.95;
  } else if (isStarterIndicator || (!hasChaseRules && !hasMagicRules)) {
    profile = 'starter-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Call of Cthulhu 7e: Zasady Skrócone (Quick-Start Rules)'
        : 'Call of Cthulhu 7e: Quick-Start Rules';
    confidence = 0.9;
  } else {
    profile = 'custom-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Podręcznik systemu d100 / BRP'
        : 'Custom d100 / BRP Rulebook';
    confidence = 0.75;
  }

  return {
    profile,
    title,
    confidence,
    detectedFeatures: {
      hasCombatRules,
      hasSanityRules,
      hasChaseRules,
      hasMagicRules,
    },
    detectedLanguage,
  };
}
