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
  const headerSample = sample.slice(0, 18000);
  const normalizedHeaderSample = headerSample.replace(/\s+/g, ' ');
  const titleHeaderSample = normalizedHeaderSample.slice(0, 4500);

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
    sample.includes('chase track');

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
    sample.includes('pomoc dla gracz') ||
    sample.includes('pomoce dla gracz') ||
    sample.includes('dokument dla graczy') ||
    sample.includes('wycinek prasowy') ||
    sample.includes('newspaper clipping');

  const hasInvestigatorCreation =
    sample.includes('tworzenie badacza') ||
    sample.includes('tworzenie badaczy') ||
    sample.includes('tworzenie postaci') ||
    sample.includes('creating investigators') ||
    sample.includes('creating your investigator') ||
    sample.includes('investigator generation') ||
    sample.includes('zawody badacza') ||
    sample.includes('occupations');

  const hasPulpTalents =
    sample.includes('pulpowe archetypy') ||
    sample.includes('pulp archetypes') ||
    sample.includes('pulp talents') ||
    sample.includes('pulpomet') ||
    sample.includes('talenty pulpu') ||
    cleanFileName.includes('pulp') ||
    titleHeaderSample.includes('pulp cthulhu');

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

  // 3. Rozpoznawanie nagłówków typów publikacji (Chroniące przed fałszywymi dopasowaniami z reklam i notek biograficznych)
  const isScenarioHeader =
    normalizedHeaderSample.includes('scenariusz do 7. edycji') ||
    normalizedHeaderSample.includes('scenariusz do zewu cthulhu') ||
    normalizedHeaderSample.includes('sponsor scenariusza') ||
    normalizedHeaderSample.includes('scenariusz wprowadzajacy') ||
    normalizedHeaderSample.includes('polski prolog do kampanii') ||
    normalizedHeaderSample.includes('scenario for call of cthulhu') ||
    cleanFileName.includes('krakowska_enigma') ||
    cleanFileName.includes('krakowska-enigma') ||
    cleanFileName.includes('trzeba_karmic_ogien') ||
    cleanFileName.includes('mrocznalatarnia') ||
    cleanFileName.includes('mroczna_latarnia') ||
    cleanFileName.includes('noc_zaglady') ||
    cleanFileName.includes('kontrrewolucja') ||
    cleanFileName.includes('w-czelusciach-sklepow') ||
    cleanFileName.includes('w_czelusciach_sklepow');

  const isAnthologyHeader =
    normalizedHeaderSample.includes('zbior scenariuszy') ||
    normalizedHeaderSample.includes('antologia scenariuszy') ||
    normalizedHeaderSample.includes('collection of scenarios') ||
    (cleanFileName.includes('cienie') && cleanFileName.includes('tatr')) ||
    (cleanFileName.includes('horror') && cleanFileName.includes('warta')) ||
    cleanFileName.includes('uslysz') ||
    cleanFileName.includes('kwiatpaproci') ||
    cleanFileName.includes('kwiat_paproci') ||
    cleanFileName.includes('kwiat-paproci') ||
    cleanFileName.includes('miosc-ci-wszystko-wybaczy') ||
    cleanFileName.includes('milosc-ci-wszystko-wybaczy') ||
    cleanFileName.includes('pisk-wizg') ||
    cleanFileName.includes('uwierz-w-duchy') ||
    cleanFileName.includes('antologia');

  const isKeeperGuideHeader =
    !isScenarioHeader &&
    !isAnthologyHeader &&
    (normalizedHeaderSample.includes('poradnik do 7. edycji zewu cthulhu') ||
      normalizedHeaderSample.includes('almanach straznika tajemnic') ||
      cleanFileName.includes('miniporadnik') ||
      cleanFileName.includes('almanach') ||
      cleanFileName.includes('powrot-do-rlyeh') ||
      cleanFileName.includes('powrotdorlyeh') ||
      cleanFileName.includes('postaci-historyczne') ||
      cleanFileName.includes('postaci_historyczne') ||
      normalizedHeaderSample.includes('postaci historyczne'));

  // H. Starter (Zasady Skrócone / Quick-Start)
  const isStarterIndicator =
    !isScenarioHeader &&
    !isAnthologyHeader &&
    !isKeeperGuideHeader &&
    (cleanFileName.includes('starter') ||
      cleanFileName.includes('quick-start') ||
      cleanFileName.includes('quickstart') ||
      sample.includes('zasady skrocone') ||
      sample.includes('skrocone zasady') ||
      sample.includes('quick-start') ||
      sample.includes('starter') ||
      sample.includes('zasady wprowadzajace'));

  // J0. Jawna Księga Strażnika (Core Rulebook) - najwyższy priorytet przed reklamami kampanii w przedmowie
  const isExplicitCoreBook =
    !isScenarioHeader &&
    !isAnthologyHeader &&
    !isKeeperGuideHeader &&
    !isStarterIndicator &&
    (cleanFileName.includes('ksiega straznika') ||
      cleanFileName.includes('ksiegastraznika') ||
      cleanFileName.includes('ksiega_straznika') ||
      cleanFileName.includes('keeper rulebook') ||
      cleanFileName.includes('keeper_rulebook') ||
      cleanFileName.includes('core_rules') ||
      cleanFileName.includes('core-rules') ||
      titleHeaderSample.includes('ksiega straznika') ||
      titleHeaderSample.includes('keeper rulebook') ||
      (normalizedHeaderSample.includes('rozdzial 3 tworzenie badaczy') &&
        normalizedHeaderSample.includes('rozdzial 7 poscigi') &&
        normalizedHeaderSample.includes('rozdzial 8 poczytalnosc')));

  // A. Grymuar Magii (np. The Grand Grimoire, Wielki Grymuar Magii Mitów Cthulhu)
  const isGrimoireIndicator =
    !isExplicitCoreBook &&
    !isScenarioHeader &&
    !isAnthologyHeader &&
    !isKeeperGuideHeader &&
    !sample.includes('ksiega straznika') &&
    !sample.includes('keeper rulebook') &&
    (cleanFileName.includes('grymuar') ||
      cleanFileName.includes('grimoire') ||
      normalizedHeaderSample.includes('wielki grymuar') ||
      normalizedHeaderSample.includes('grand grimoire') ||
      (hasSpells &&
        (sample.includes('gleboka magia') ||
          sample.includes('deep magic') ||
          sample.includes('alfabetyczny spis zaklec'))));

  // B. Bestiariusz (np. Malleus Monstrorum, Petersen's Field Guide)
  const isBestiaryIndicator =
    !isExplicitCoreBook &&
    !isScenarioHeader &&
    !isAnthologyHeader &&
    !isKeeperGuideHeader &&
    !isGrimoireIndicator &&
    (cleanFileName.includes('malleus') ||
      cleanFileName.includes('bestiariusz') ||
      cleanFileName.includes('field guide') ||
      normalizedHeaderSample.includes('malleus monstrorum') ||
      normalizedHeaderSample.includes('field guide to lovecraftian') ||
      normalizedHeaderSample.includes('bestiariusz mitow') ||
      (hasCreatures &&
        (sample.includes('bostwa') || sample.includes('deities')) &&
        !hasSpells &&
        !hasCombatRules &&
        !hasChaseRules)) &&
    !hasChaseRules &&
    !hasInvestigatorCreation;

  // C. Podręcznik Badacza (Investigator Handbook)
  const isInvestigatorHandbookIndicator =
    !isExplicitCoreBook &&
    !isScenarioHeader &&
    !isAnthologyHeader &&
    !isKeeperGuideHeader &&
    (cleanFileName.includes('podrecznik badacza') ||
      cleanFileName.includes('podrecznik_badacza') ||
      cleanFileName.includes('investigator handbook') ||
      cleanFileName.includes('investigator_handbook') ||
      normalizedHeaderSample.includes('podrecznik badacza') ||
      normalizedHeaderSample.includes('investigator handbook')) &&
    !sample.includes('ksiega straznika') &&
    !sample.includes('keeper rulebook');

  // D. Pulp Cthulhu (Księga zasad Pulp, a nie scenariusz ze wzmianką o Pulp Cthulhu)
  const isPulpIndicator =
    !isExplicitCoreBook &&
    !isScenarioHeader &&
    !isAnthologyHeader &&
    !isKeeperGuideHeader &&
    hasPulpTalents;

  // E. Setting / Epoka / Poradnik Strażnika (np. Down Darker Trails, Gaslight, Dark Ages, Berlin, Powrót do R'lyeh, Miniporadniki, Postaci Historyczne)
  const isSettingIndicator =
    !isExplicitCoreBook &&
    !isScenarioHeader &&
    !isAnthologyHeader &&
    (isKeeperGuideHeader ||
      sample.includes('down darker trails') ||
      sample.includes('dark ages') ||
      sample.includes('by gaslight') ||
      sample.includes('berlin: the wicked city') ||
      sample.includes('regency cthulhu') ||
      sample.includes('harlem unbound'));

  // G. Antologia / Zbiór scenariuszy (np. Cienie Tatr, Horror nad Wartą, Usłysz Zew Cthulhu, Kwiat Paproci, Wrota Mroku)
  const isAnthologyIndicator =
    !isExplicitCoreBook &&
    !isStarterIndicator &&
    !isScenarioHeader &&
    !isKeeperGuideHeader &&
    (isAnthologyHeader ||
      normalizedHeaderSample.includes('cienie tatr') ||
      normalizedHeaderSample.includes('horror nad warta') ||
      normalizedHeaderSample.includes('uslysz zew cthulhu') ||
      normalizedHeaderSample.includes('kwiat paproci') ||
      normalizedHeaderSample.includes('milosc ci wszystko wybaczy') ||
      normalizedHeaderSample.includes('pisk, wizg') ||
      normalizedHeaderSample.includes('uwierz w duchy') ||
      normalizedHeaderSample.includes('wrota mroku') ||
      normalizedHeaderSample.includes('doors to darkness') ||
      normalizedHeaderSample.includes('posiadlosci szalenstwa') ||
      normalizedHeaderSample.includes('mansions of madness') ||
      normalizedHeaderSample.includes('nameless horrors') ||
      (sample.includes('scenariusz 1') && sample.includes('scenariusz 2')) ||
      (sample.includes('rozdzial 1') &&
        sample.includes('rozdzial 2') &&
        (sample.includes('spis tresci') || sample.includes('zbior scenariuszy'))));

  // F. Mega-Kampania (np. Maski Nyarlathotepa, Horror w Orient Expressie, Czas Żniw, Dwa Węże)
  const isMegaCampaignIndicator =
    !isExplicitCoreBook &&
    !isStarterIndicator &&
    !isScenarioHeader &&
    !isAnthologyIndicator &&
    !isKeeperGuideHeader &&
    (((cleanFileName.includes('nyarlathotep') ||
      cleanFileName.includes('orient express') ||
      cleanFileName.includes('czas zniw') ||
      titleHeaderSample.includes('maski nyarlathotepa') ||
      titleHeaderSample.includes('masks of nyarlathotep') ||
      titleHeaderSample.includes('horror w orient expressie') ||
      titleHeaderSample.includes('horror on the orient express') ||
      titleHeaderSample.includes('czas zniw') ||
      titleHeaderSample.includes('a time to harvest') ||
      titleHeaderSample.includes('two-headed serpent') ||
      titleHeaderSample.includes('dwa weze')) &&
      !normalizedHeaderSample.includes('prolog do')) ||
      (sample.includes('kampania') &&
        (sample.includes('akt 1') || sample.includes('akt i') || sample.includes('rozdzial 1:')) &&
        (sample.includes('akt 2') || sample.includes('akt ii') || sample.includes('rozdzial 2:')) &&
        (sample.includes('akt 3') || sample.includes('akt iii') || sample.includes('rozdzial 3:'))));

  // I. One-Shot / Pojedynczy scenariusz (np. Trzeba karmić ogień, Mroczna Latarnia, Krakowska Enigma, Noc Zagłady, Pełzająca kontrrewolucja, W czeluściach sklepów)
  const isOneShotIndicator =
    !isExplicitCoreBook &&
    !isStarterIndicator &&
    !isAnthologyIndicator &&
    !isMegaCampaignIndicator &&
    !isKeeperGuideHeader &&
    !isGrimoireIndicator &&
    !isBestiaryIndicator &&
    !isInvestigatorHandbookIndicator &&
    !isPulpIndicator &&
    (isScenarioHeader ||
      sample.includes('trzeba karmic ogien') ||
      sample.includes('mroczna latarnia') ||
      sample.includes('w czelusciach sklepow') ||
      sample.includes('krakowska enigma') ||
      sample.includes('noc zaglady') ||
      sample.includes('pelzajaca kontrrewolucja') ||
      sample.includes('wrak') ||
      sample.includes('w martwym punkcie') ||
      sample.includes('dead boarder') ||
      sample.includes('lightless beacon') ||
      sample.includes('scenariusz jedno-sesyjny') ||
      sample.includes('jednostrzal') ||
      sample.includes('one-shot') ||
      ((cleanFileName.includes('przygoda') ||
        cleanFileName.includes('scenariusz') ||
        cleanFileName.includes('adventure') ||
        cleanFileName.includes('scenario') ||
        sample.includes('scenariusz') ||
        sample.includes('scenario') ||
        sample.includes('przygoda') ||
        sample.includes('adventure') ||
        sample.includes('dramatis personae') ||
        sample.includes('poszlaki') ||
        sample.includes('clues') ||
        hasHandouts) &&
        !sample.includes('ksiega straznika') &&
        !sample.includes('keeper rulebook')));

  // J. Core Book (Księga Strażnika)
  const isCoreIndicator =
    isExplicitCoreBook ||
    (!isStarterIndicator &&
      !isScenarioHeader &&
      !isAnthologyIndicator &&
      !isMegaCampaignIndicator &&
      !isKeeperGuideHeader &&
      !isGrimoireIndicator &&
      !isBestiaryIndicator &&
      !isInvestigatorHandbookIndicator &&
      !isPulpIndicator &&
      !isOneShotIndicator &&
      (sample.includes('ksiega straznika') ||
        sample.includes('keeper rulebook') ||
        (hasChaseRules && hasMagicRules) ||
        sample.includes('rozdzial 8') ||
        sample.includes('chapter 8')));

  let profile: RulebookProfile = 'custom-d100';
  let title = '';
  let confidence = 0.7;
  let adventureType: 'one_shot' | 'scenario_anthology' | 'mega_campaign' | undefined = undefined;

  if (isExplicitCoreBook) {
    profile = 'core-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Księga Zasad Głównych d100 (Core Book)'
        : 'Core Rulebook d100 (Core Book)';
    confidence = 0.96;
  } else if (isGrimoireIndicator) {
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
  } else if (isAnthologyIndicator) {
    profile = 'scenario_anthology';
    if (cleanFileName.includes('horror') && cleanFileName.includes('warta') || normalizedHeaderSample.includes('horror nad warta')) {
      title = 'Horror nad Wartą';
    } else if ((cleanFileName.includes('cienie') && cleanFileName.includes('tatr')) || normalizedHeaderSample.includes('cienie tatr')) {
      title = 'Cienie Tatr';
    } else if (cleanFileName.includes('uslysz') || normalizedHeaderSample.includes('uslysz zew cthulhu')) {
      title = 'Usłysz Zew Cthulhu';
    } else if (cleanFileName.includes('kwiat') || normalizedHeaderSample.includes('kwiat paproci')) {
      title = 'Kwiat Paproci';
    } else if (cleanFileName.includes('miosc') || cleanFileName.includes('milosc') || normalizedHeaderSample.includes('milosc ci wszystko wybaczy')) {
      title = 'Miłość ci wszystko wybaczy?';
    } else if (cleanFileName.includes('pisk') || normalizedHeaderSample.includes('pisk, wizg')) {
      title = 'Pisk, wizg i Odłamek';
    } else if (cleanFileName.includes('uwierz') || normalizedHeaderSample.includes('uwierz w duchy')) {
      title = 'Uwierz w duchy';
    } else {
      title =
        detectedLanguage === 'pl'
          ? 'Antologia Scenariuszy d100'
          : 'd100 Scenario Anthology';
    }
    confidence = 0.92;
    adventureType = 'scenario_anthology';
  } else if (isMegaCampaignIndicator) {
    profile = 'mega_campaign';
    title =
      detectedLanguage === 'pl'
        ? 'Wielka Kampania d100 (Epic Campaign)'
        : 'd100 Epic Mega-Campaign';
    confidence = 0.95;
    adventureType = 'mega_campaign';
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
    if (cleanFileName.includes('powrot') || normalizedHeaderSample.includes('powrot do r')) {
      title = "Powrót do R'lyeh - Almanach Strażnika";
    } else if (cleanFileName.includes('postaci-historyczne') || cleanFileName.includes('postaci_historyczne') || normalizedHeaderSample.includes('postaci historyczne')) {
      title = 'Postaci Historyczne';
    } else if (cleanFileName.includes('miniporadnik_oni')) {
      title = 'Miniporadnik: ONI';
    } else if (cleanFileName.includes('w_martwym_punkcie')) {
      title = 'Miniporadnik: W martwym punkcie';
    } else {
      title =
        detectedLanguage === 'pl'
          ? 'Rozszerzenie Settingowe / Epoka d100 (Setting Expansion)'
          : 'd100 Era & Setting Expansion';
    }
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
    if (cleanFileName.includes('trzeba_karmic') || normalizedHeaderSample.includes('trzeba karmic ogien')) {
      title = 'Trzeba karmić ogień';
    } else if (cleanFileName.includes('mrocznalatarnia') || cleanFileName.includes('mroczna_latarnia') || normalizedHeaderSample.includes('m r o c z n a l a t a r n i a') || normalizedHeaderSample.includes('mroczna latarnia')) {
      title = 'Mroczna Latarnia';
    } else if (cleanFileName.includes('w-czelusciach-sklepow') || cleanFileName.includes('w_czelusciach_sklepow') || normalizedHeaderSample.includes('w c z e l u s c i a c h s k l e p o w')) {
      title = 'W czeluściach sklepów';
    } else if (cleanFileName.includes('krakowska_enigma') || cleanFileName.includes('krakowska-enigma') || normalizedHeaderSample.includes('krakowska enigma')) {
      title = 'Krakowska Enigma';
    } else if (cleanFileName.includes('noc_zaglady') || normalizedHeaderSample.includes('n o c z a g l a d y') || normalizedHeaderSample.includes('noc zaglady')) {
      title = 'World War Cthulhu: Noc Zagłady';
    } else if (cleanFileName.includes('kontrrewolucja') || normalizedHeaderSample.includes('pelzajaca kontrrewolucja')) {
      title = 'Pełzająca kontrrewolucja';
    } else {
      title =
        detectedLanguage === 'pl'
          ? 'Scenariusz Jednorazowy d100 (One-Shot Adventure)'
          : 'd100 One-Shot Scenario';
    }
    confidence = 0.9;
    adventureType = 'one_shot';
  } else if (hasInvestigatorCreation && (hasCombatRules || hasSanityRules)) {
    profile = 'custom-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Podręcznik systemu d100 / BRP'
        : 'Custom d100 / BRP Rulebook';
    confidence = 0.75;
  } else {
    profile = 'one_shot';
    title =
      detectedLanguage === 'pl'
        ? 'Scenariusz Jednorazowy d100 (One-Shot Adventure)'
        : 'd100 One-Shot Scenario';
    confidence = 0.75;
    adventureType = 'one_shot';
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

/**
 * Zwraca true, jeśli profil dostarcza bazową mechanikę d100 wymaganą do uruchomienia gry
 * (Starter lub Księga Strażnika / Core / własny system d100).
 */
export function isBaseRulebookProfile(profile: RulebookProfile): boolean {
  return profile === 'starter-d100' || profile === 'core-d100' || profile === 'custom-d100';
}

/**
 * Zwraca true, jeśli profil jest rozszerzeniem zasad (Pulp Cthulhu lub Podręcznik Badacza),
 * które trafia do lewej kolumny (Podręczniki zasad), ale samo w sobie nie zastępuje bazowej mechaniki.
 */
export function isRulebookExpansionProfile(profile: RulebookProfile): boolean {
  return profile === 'pulp-d100' || profile === 'investigator_handbook';
}

/**
 * Zwraca true, jeśli profil należy do lewej kolumny (Podręczniki Zasad i Dodatki Mechaniczne).
 */
export function isRulebookColumnProfile(profile: RulebookProfile): boolean {
  return isBaseRulebookProfile(profile) || isRulebookExpansionProfile(profile);
}

/**
 * Zwraca true, jeśli profil należy do prawej kolumny (Przygody, Kampanie, Bestiariusze, Grymuary, Lorebooki).
 */
export function isOptionalColumnProfile(profile: RulebookProfile): boolean {
  return (
    profile === 'one_shot' ||
    profile === 'scenario_anthology' ||
    profile === 'mega_campaign' ||
    profile === 'bestiary' ||
    profile === 'grimoire' ||
    profile === 'setting_expansion'
  );
}

/**
 * Zwraca true, jeśli podręcznik lub dodatek zawiera scenariusze gotowe do ekstrakcji do Manual Setup.
 */
export function isAdventureBearingProfile(profile: RulebookProfile): boolean {
  return (
    profile === 'one_shot' ||
    profile === 'scenario_anthology' ||
    profile === 'mega_campaign' ||
    profile === 'starter-d100'
  );
}

