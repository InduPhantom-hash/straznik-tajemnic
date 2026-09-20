/**
 * rulebook-fingerprint.ts - Fingerprint i walidacja podręcznika zasad d100 / Weird Fiction RPG
 * Doktryna "Czystego Emulatora BYOB" (Clean Room Engine / Model ScummVM & RetroArch).
 *
 * Silnik Strażnik Tajemnic AI weryfikuje profil wgranego podręcznika gracza
 * (np. darmowy Starter d100 vs pełna Księga Strażnika vs Malleus Monstrorum vs Maski Nyarlathotepa),
 * potwierdzając obecność kluczowych reguł i ustalając profil silnika bez przechowywania zastrzeżonych treści.
 */

export type RulebookProfile =
  | 'starter-d100'
  | 'core-d100'
  | 'pulp-d100'
  | 'investigator_handbook'
  | 'one_shot'
  | 'scenario_anthology'
  | 'mega_campaign'
  | 'setting_expansion'
  | 'bestiary'
  | 'grimoire'
  | 'custom-d100'
  | 'unknown';

export type SemanticTag = 'NPC' | 'FABULA' | 'MECHANIKA' | 'CZARY' | 'BESTIARIUSZ' | 'REKWIZYTY';

export interface SemanticExtractionPlan {
  detectedCategories: SemanticTag[];
  estimatedEntities: {
    npcs: boolean;
    locations: boolean;
    clues: boolean;
    handouts: boolean;
    spells: boolean;
    creatures: boolean;
    rules: boolean;
  };
  adventureType?: 'one_shot' | 'scenario_anthology' | 'mega_campaign';
  multiPartDetected?: boolean;
}

export interface RulebookFingerprintResult {
  profile: RulebookProfile;
  title: string;
  confidence: number;
  detectedFeatures: {
    hasCombatRules: boolean;
    hasSanityRules: boolean;
    hasChaseRules: boolean;
    hasMagicRules: boolean;
    hasCreatures?: boolean;
    hasSpells?: boolean;
    hasHandouts?: boolean;
    hasScenarios?: boolean;
    hasPulpTalents?: boolean;
    hasInvestigatorCreation?: boolean;
  };
  detectedLanguage: 'pl' | 'en' | 'unknown';
  semanticPlan: SemanticExtractionPlan;
}

function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L");
}

/**
 * Analizuje tekst podręcznika PDF i wykrywa jego profil systemowy oraz plan ekstrakcji semantycznej.
 */
export function detectRulebookProfile(text: string, fileName: string = ''): RulebookFingerprintResult {
  const emptyPlan: SemanticExtractionPlan = {
    detectedCategories: [],
    estimatedEntities: {
      npcs: false,
      locations: false,
      clues: false,
      handouts: false,
      spells: false,
      creatures: false,
      rules: false,
    },
  };

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
        hasCreatures: false,
        hasSpells: false,
        hasHandouts: false,
        hasScenarios: false,
      },
      detectedLanguage: 'unknown',
      semanticPlan: emptyPlan,
    };
  }

  const cleanFileName = stripDiacritics((fileName || '').toLowerCase());
  const rawSample = text.slice(0, 150000).toLowerCase();
  const sample = stripDiacritics(rawSample);
  const normalizedSample = sample.replace(/\s+/g, ' ');
  const textLength = text.length;

  // 1. Detekcja języka dokumentu
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
    'przygoda',
    'scenariusz',
    'poszlaki',
    'rekwizyt',
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
    'adventure',
    'scenario',
    'clues',
    'handout',
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

  // 2. Detekcja podsystemów regułowych i cech
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

  const hasCreatures =
    sample.includes('bestiariusz') ||
    sample.includes('ksiega bestii') ||
    sample.includes('malleus monstrorum') ||
    sample.includes('field guide') ||
    sample.includes('potwory mitow') ||
    sample.includes('monsters') ||
    sample.includes('bostwa mitow') ||
    sample.includes('deities');

  const hasSpells =
    sample.includes('grymuar') ||
    sample.includes('grimoire') ||
    sample.includes('koszt magii') ||
    sample.includes('punkty magii') ||
    sample.includes('magic points') ||
    sample.includes('czas rzucania') ||
    sample.includes('casting time') ||
    sample.includes('gleboka magia') ||
    sample.includes('deep magic');

  const hasHandouts =
    sample.includes('rekwizyt') ||
    sample.includes('handout') ||
    sample.includes('dokument dla graczy') ||
    sample.includes('wycinek prasowy') ||
    sample.includes('newspaper clipping');

  const hasInvestigatorCreation =
    sample.includes('tworzenie badacza') ||
    sample.includes('tworzenie postaci') ||
    sample.includes('creating investigators') ||
    sample.includes('investigator generation') ||
    sample.includes('zawody badacza') ||
    sample.includes('occupations');

  const hasPulpTalents =
    sample.includes('pulp cthulhu') ||
    sample.includes('pulpowe archetypy') ||
    sample.includes('pulp talents') ||
    sample.includes('pulpomet') ||
    sample.includes('talenty pulpu');

  // Weryfikacja pokrewieństwa z d100 / RPG
  const isD100 =
    sample.includes('k100') ||
    sample.includes('d100') ||
    sample.includes('chaosium') ||
    sample.includes('cthulhu') ||
    sample.includes('badacz') ||
    sample.includes('investigator') ||
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
        hasCreatures,
        hasSpells,
        hasHandouts,
        hasScenarios: false,
        hasPulpTalents,
        hasInvestigatorCreation,
      },
      detectedLanguage,
      semanticPlan: emptyPlan,
    };
  }

  // 3. Rozpoznawanie profilu podręcznika / suplementu

  // A. Grymuar Magii (np. The Grand Grimoire, Wielki Grymuar Magii Mitów Cthulhu)
  const isGrimoireIndicator =
    cleanFileName.includes('grymuar') ||
    cleanFileName.includes('grimoire') ||
    normalizedSample.includes('wielki grymuar') ||
    normalizedSample.includes('grand grimoire') ||
    (hasSpells && (sample.includes('czas rzucania') || sample.includes('casting time') || sample.includes('gleboka magia') || sample.includes('deep magic')));

  // B. Bestiariusz (np. Malleus Monstrorum, Petersen's Field Guide)
  const isBestiaryIndicator =
    !isGrimoireIndicator &&
    (cleanFileName.includes('malleus') ||
      cleanFileName.includes('bestiariusz') ||
      cleanFileName.includes('field guide') ||
      normalizedSample.includes('malleus monstrorum') ||
      normalizedSample.includes('field guide to lovecraftian') ||
      normalizedSample.includes('bestiariusz mitow') ||
      (hasCreatures && (sample.includes('bostwa') || sample.includes('deities')) && !hasSpells && !hasCombatRules && !hasChaseRules)) &&
    !hasChaseRules &&
    !hasInvestigatorCreation;

  // C. Podręcznik Badacza (Investigator Handbook)
  const isInvestigatorHandbookIndicator =
    (cleanFileName.includes('podrecznik badacza') || cleanFileName.includes('investigator handbook') || sample.includes('podrecznik badacza') || sample.includes('investigator handbook')) &&
    !sample.includes('ksiega straznika') &&
    !sample.includes('keeper rulebook');

  // D. Pulp Cthulhu
  const isPulpIndicator = hasPulpTalents || cleanFileName.includes('pulp');

  // E. Setting / Epoka (np. Down Darker Trails, Gaslight, Dark Ages, Berlin)
  const isSettingIndicator =
    sample.includes('down darker trails') ||
    sample.includes('dark ages') ||
    sample.includes('by gaslight') ||
    sample.includes('berlin: the wicked city') ||
    sample.includes('regency cthulhu') ||
    sample.includes('harlem unbound');

  // F. Mega-Kampania (np. Maski Nyarlathotepa, Horror w Orient Expressie, Czas Żniw, Dwa Węże)
  const isMegaCampaignIndicator =
    cleanFileName.includes('nyarlathotep') ||
    cleanFileName.includes('orient express') ||
    cleanFileName.includes('czas zniw') ||
    sample.includes('maski nyarlathotepa') ||
    sample.includes('masks of nyarlathotep') ||
    sample.includes('horror w orient expressie') ||
    sample.includes('horror on the orient express') ||
    sample.includes('czas zniw') ||
    sample.includes('a time to harvest') ||
    sample.includes('two-headed serpent') ||
    sample.includes('dwa weze') ||
    (sample.includes('kampania') &&
      (sample.includes('akt 1') || sample.includes('akt i') || sample.includes('rozdzial 1:')) &&
      (sample.includes('akt 2') || sample.includes('akt ii') || sample.includes('rozdzial 2:')) &&
      (sample.includes('akt 3') || sample.includes('akt iii') || sample.includes('rozdzial 3:')));

  // G. Antologia / Zbiór scenariuszy (np. Cienie Tatr, Horror nad Wartą, Wrota Mroku, Posiadłości Szaleństwa)
  const isAnthologyIndicator =
    (cleanFileName.includes('cienie') && cleanFileName.includes('tatr')) ||
    (cleanFileName.includes('horror') && cleanFileName.includes('warta')) ||
    cleanFileName.includes('antologia') ||
    normalizedSample.includes('cienie tatr') ||
    normalizedSample.includes('horror nad warta') ||
    normalizedSample.includes('wrota mroku') ||
    normalizedSample.includes('doors to darkness') ||
    normalizedSample.includes('posiadlosci szalenstwa') ||
    normalizedSample.includes('mansions of madness') ||
    normalizedSample.includes('nameless horrors') ||
    normalizedSample.includes('zbior scenariuszy') ||
    normalizedSample.includes('antologia scenariuszy') ||
    normalizedSample.includes('collection of scenarios') ||
    (sample.includes('scenariusz 1') && sample.includes('scenariusz 2')) ||
    (sample.includes('rozdział 1') && sample.includes('rozdział 2') && (sample.includes('spis treści') || sample.includes('spis tresci'))) ||
    (sample.includes('rozdział 1') && sample.includes('rozdział 2') && sample.includes('scenariusz'));

  // H. Starter (Zasady Skrócone / Quick-Start)
  const isStarterIndicator =
    cleanFileName.includes('starter') ||
    cleanFileName.includes('quick-start') ||
    sample.includes('zasady skrocone') ||
    sample.includes('quick-start') ||
    sample.includes('starter') ||
    sample.includes('zasady wprowadzajace');

  // I. One-Shot / Broszura (np. Trzeba karmić ogień, Wrak, Krakowska Enigma, pojedyncze przygody)
  const isOneShotIndicator =
    !isStarterIndicator &&
    (sample.includes('trzeba karmic ogien') ||
      sample.includes('wrak') ||
      sample.includes('krakowska enigma') ||
      sample.includes('w martwym punkcie') ||
      sample.includes('dead boarder') ||
      sample.includes('lightless beacon') ||
      sample.includes('scenariusz jedno-sesyjny') ||
      sample.includes('jednostrzal') ||
      sample.includes('one-shot') ||
      ((sample.includes('scenariusz') || sample.includes('scenario')) &&
        !sample.includes('ksiega straznika') &&
        !sample.includes('keeper rulebook') &&
        !hasChaseRules &&
        !hasCombatRules &&
        textLength < 250000));

  // J. Core Book (Księga Strażnika)
  const isCoreIndicator =
    sample.includes('ksiega straznika') ||
    sample.includes('keeper rulebook') ||
    (hasChaseRules && hasMagicRules) ||
    sample.includes('rozdzial 8') ||
    sample.includes('chapter 8');

  let profile: RulebookProfile = 'custom-d100';
  let title = '';
  let confidence = 0.7;
  let adventureType: 'one_shot' | 'scenario_anthology' | 'mega_campaign' | undefined = undefined;

  if (isGrimoireIndicator) {
    profile = 'grimoire';
    title =
      cleanFileName.includes('wielki') || sample.includes('wielki grymuar')
        ? 'Wielki Grymuar Magii Mitów Cthulhu'
        : detectedLanguage === 'pl'
          ? 'Grymuar Magii d100'
          : 'Grimoire of Arcane Magic';
    confidence = 0.95;
  } else if (isBestiaryIndicator) {
    profile = 'bestiary';
    title =
      cleanFileName.includes('malleus') || sample.includes('malleus monstrorum')
        ? 'Malleus Monstrorum: Bestiariusz Mitów Cthulhu'
        : detectedLanguage === 'pl'
          ? 'Bestiariusz Mitów d100'
          : 'd100 Mythos Bestiary';
    confidence = 0.95;
  } else if (isMegaCampaignIndicator) {
    profile = 'mega_campaign';
    title =
      detectedLanguage === 'pl'
        ? 'Wielka Kampania d100 (Epic Campaign)'
        : 'd100 Epic Mega-Campaign';
    confidence = 0.95;
    adventureType = 'mega_campaign';
  } else if (isAnthologyIndicator) {
    profile = 'scenario_anthology';
    if (cleanFileName.includes('horror') && cleanFileName.includes('warta')) {
      title = 'Horror nad Wartą';
    } else if (cleanFileName.includes('cienie') && cleanFileName.includes('tatr')) {
      title = 'Cienie Tatr';
    } else {
      title =
        detectedLanguage === 'pl'
          ? 'Antologia Scenariuszy d100'
          : 'd100 Scenario Anthology';
    }
    confidence = 0.92;
    adventureType = 'scenario_anthology';
  } else if (isInvestigatorHandbookIndicator) {
    profile = 'investigator_handbook';
    title =
      detectedLanguage === 'pl'
        ? 'Podręcznik Badacza d100 (Investigator Handbook)'
        : 'd100 Investigator Handbook';
    confidence = 0.95;
  } else if (isPulpIndicator) {
    profile = 'pulp-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Pulp d100: Księga Zasad (Pulp Ruleset)'
        : 'Pulp d100: Rulebook';
    confidence = 0.95;
  } else if (isSettingIndicator) {
    profile = 'setting_expansion';
    title =
      detectedLanguage === 'pl'
        ? 'Rozszerzenie Settingowe / Epoka d100 (Setting Expansion)'
        : 'd100 Era & Setting Expansion';
    confidence = 0.9;
  } else if (isCoreIndicator && !isStarterIndicator) {
    profile = 'core-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Księga Zasad Głównych d100 (Core Book)'
        : 'Core Rulebook d100 (Core Book)';
    confidence = 0.95;
  } else if (isStarterIndicator) {
    profile = 'starter-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Zasady Skrócone d100 (Quick-Start Rules)'
        : 'Quick-Start Rules d100';
    confidence = 0.9;
    adventureType = 'one_shot';
  } else if (isOneShotIndicator) {
    profile = 'one_shot';
    title =
      detectedLanguage === 'pl'
        ? 'Scenariusz Jednorazowy d100 (One-Shot Adventure)'
        : 'd100 One-Shot Scenario';
    confidence = 0.9;
    adventureType = 'one_shot';
  } else if (!hasChaseRules && !hasMagicRules) {
    profile = 'starter-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Zasady Skrócone d100 (Quick-Start Rules)'
        : 'Quick-Start Rules d100';
    confidence = 0.85;
    adventureType = 'one_shot';
  } else {
    profile = 'custom-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Podręcznik systemu d100 / BRP'
        : 'Custom d100 / BRP Rulebook';
    confidence = 0.75;
  }

  // 4. Budowanie planu ekstrakcji semantycznej (Semantic Extraction Plan)
  const detectedCategories: SemanticTag[] = [];
  const estimatedEntities = {
    npcs: false,
    locations: false,
    clues: false,
    handouts: false,
    spells: false,
    creatures: false,
    rules: false,
  };

  if (hasCombatRules || hasChaseRules || hasSanityRules || isPulpIndicator || isInvestigatorHandbookIndicator) {
    detectedCategories.push('MECHANIKA');
    estimatedEntities.rules = true;
  }
  if (hasCreatures || isBestiaryIndicator || isCoreIndicator) {
    detectedCategories.push('BESTIARIUSZ');
    estimatedEntities.creatures = true;
  }
  if (hasSpells || hasMagicRules || isGrimoireIndicator || isCoreIndicator) {
    detectedCategories.push('CZARY');
    estimatedEntities.spells = true;
  }
  if (adventureType || isAnthologyIndicator || isMegaCampaignIndicator || isOneShotIndicator || isStarterIndicator) {
    detectedCategories.push('FABULA');
    detectedCategories.push('NPC');
    estimatedEntities.npcs = true;
    estimatedEntities.locations = true;
    estimatedEntities.clues = true;
  }
  if (hasHandouts || adventureType || isAnthologyIndicator || isMegaCampaignIndicator) {
    detectedCategories.push('REKWIZYTY');
    estimatedEntities.handouts = true;
  }

  const semanticPlan: SemanticExtractionPlan = {
    detectedCategories: Array.from(new Set(detectedCategories)),
    estimatedEntities,
    adventureType,
    multiPartDetected: profile === 'mega_campaign' || profile === 'scenario_anthology',
  };

  return {
    profile,
    title,
    confidence,
    detectedFeatures: {
      hasCombatRules,
      hasSanityRules,
      hasChaseRules,
      hasMagicRules,
      hasCreatures,
      hasSpells,
      hasHandouts,
      hasScenarios: !!adventureType,
      hasPulpTalents,
      hasInvestigatorCreation,
    },
    detectedLanguage,
    semanticPlan,
  };
}

