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

export interface OfficialPublication {
  id: string;
  profile: RulebookProfile;
  titlePl: string;
  titleEn: string;
  patterns: string[];
  adventureType?: 'one_shot' | 'scenario_anthology' | 'mega_campaign';
}

/**
 * Zamknięty katalog oficjalnych publikacji Black Monk Games (PL) oraz Chaosium (EN) dla 7. edycji.
 */
export const OFFICIAL_PUBLICATIONS: OfficialPublication[] = [
  // --- PODRĘCZNIKI GŁÓWNE I ZASADY (CORE & RULES) ---
  {
    id: 'keeper-rulebook',
    profile: 'core-d100',
    titlePl: 'Księga Zasad Głównych d100 (Core Book)',
    titleEn: 'Call of Cthulhu: Keeper Rulebook',
    patterns: [
      'ksiega straznika',
      'ksiegastraznika',
      'podrecznik straznika',
      'keeper rulebook',
      "keeper's rulebook",
      'core rules',
      'core_rules',
    ],
  },
  {
    id: 'investigator-handbook',
    profile: 'investigator_handbook',
    titlePl: 'Księga Badacza d100 (Investigator Handbook)',
    titleEn: 'Call of Cthulhu: Investigator Handbook',
    patterns: [
      'ksiega badacza',
      'ksiega badaczy',
      'podrecznik badacza',
      'podrecznik badaczy',
      'investigator handbook',
      "investigator's handbook",
      'investigators handbook',
    ],
  },
  {
    id: 'starter-set',
    profile: 'starter-d100',
    titlePl: 'Zestaw Startowy d100 (Starter Set)',
    titleEn: 'Call of Cthulhu: Starter Set',
    adventureType: 'one_shot',
    patterns: [
      'zestaw startowy',
      'starter set',
      'zasady wprowadzajace',
      'zasady skrocone',
      'quick-start rules',
      'quickstart rules',
      'zc_starter',
      'zc-starter',
      'zc starter',
      'quick-start',
      'quickstart',
      'starter',
    ],
  },
  {
    id: 'pulp-cthulhu',
    profile: 'pulp-d100',
    titlePl: 'Pulp d100: Księga Zasad (Pulp Ruleset)',
    titleEn: 'Pulp d100: Rulebook',
    patterns: ['pulp cthulhu', 'pulp-cthulhu'],
  },
  {
    id: 'grand-grimoire',
    profile: 'grimoire',
    titlePl: 'Wielki Grymuar Magii Mitów Cthulhu',
    titleEn: 'The Grand Grimoire of Cthulhu Mythos Magic',
    patterns: ['wielki grymuar', 'grand grimoire', 'grymuar magii mitow'],
  },
  {
    id: 'malleus-monstrorum',
    profile: 'bestiary',
    titlePl: 'Malleus Monstrorum: Bestiariusz Mitów Cthulhu',
    titleEn: 'Malleus Monstrorum: Cthulhu Mythos Bestiary',
    patterns: [
      'malleus monstrorum',
      'bestiariusz mitow cthulhu',
      'bestiariusz mitow',
      'ksiega bestii',
    ],
  },
  {
    id: 'petersen-field-guide',
    profile: 'bestiary',
    titlePl: 'Przewodnik Petersena po potworach i bóstwach Mitów Cthulhu',
    titleEn: "Petersen's Field Guide to Lovecraftian Horrors",
    patterns: [
      'przewodnik petersena',
      'przewodnik_petersena',
      'field guide to lovecraftian',
      "petersen's field guide",
      'petersens field guide',
      'petersen field guide',
    ],
  },

  // --- WIELKIE KAMPANIE (MEGA-CAMPAIGNS) ---
  {
    id: 'masks-of-nyarlathotep',
    profile: 'mega_campaign',
    titlePl: 'Maski Nyarlathotepa',
    titleEn: 'Masks of Nyarlathotep',
    adventureType: 'mega_campaign',
    patterns: ['maski nyarlathotepa', 'masks of nyarlathotep', 'maski nyarlathotep'],
  },
  {
    id: 'horror-on-the-orient-express',
    profile: 'mega_campaign',
    titlePl: 'Horror w Orient Expressie',
    titleEn: 'Horror on the Orient Express',
    adventureType: 'mega_campaign',
    patterns: ['horror w orient expressie', 'horror on the orient express', 'orient express'],
  },
  {
    id: 'a-time-to-harvest',
    profile: 'mega_campaign',
    titlePl: 'Czas Żniw',
    titleEn: 'A Time to Harvest',
    adventureType: 'mega_campaign',
    patterns: ['czas zniw', 'time to harvest'],
  },
  {
    id: 'the-children-of-fear',
    profile: 'mega_campaign',
    titlePl: 'Dzieci Snów',
    titleEn: 'The Children of Fear',
    adventureType: 'mega_campaign',
    patterns: ['dzieci snow', 'children of fear'],
  },
  {
    id: 'two-headed-serpent',
    profile: 'mega_campaign',
    titlePl: 'Dwugłowy Wąż',
    titleEn: 'The Two-Headed Serpent',
    adventureType: 'mega_campaign',
    patterns: ['dwuglowy waz', 'dwa weze', 'two-headed serpent', 'two headed serpent'],
  },
  {
    id: 'beyond-mountains-of-madness',
    profile: 'mega_campaign',
    titlePl: 'W Górach Szaleństwa',
    titleEn: 'Beyond the Mountains of Madness',
    adventureType: 'mega_campaign',
    patterns: ['beyond the mountains of madness', 'w gorach szalenstwa'],
  },
  {
    id: 'shadows-of-yog-sothoth',
    profile: 'mega_campaign',
    titlePl: 'Cienie Yog-Sothotha',
    titleEn: 'Shadows of Yog-Sothoth',
    adventureType: 'mega_campaign',
    patterns: ['cienie yog-sothotha', 'shadows of yog-sothoth', 'cienie yog sothotha'],
  },

  // --- ANTOLOGIE I ZBIORY SCENARIUSZY (SCENARIO ANTHOLOGIES) ---
  {
    id: 'cienie-tatr',
    profile: 'scenario_anthology',
    titlePl: 'Cienie Tatr',
    titleEn: 'Shadows over Tatras (Cienie Tatr)',
    adventureType: 'scenario_anthology',
    patterns: ['cienie tatr'],
  },
  {
    id: 'horror-nad-warta',
    profile: 'scenario_anthology',
    titlePl: 'Horror nad Wartą',
    titleEn: 'Horror on the Warta River',
    adventureType: 'scenario_anthology',
    patterns: ['horror nad warta'],
  },
  {
    id: 'doors-to-darkness',
    profile: 'scenario_anthology',
    titlePl: 'Wrota Mroku',
    titleEn: 'Doors to Darkness',
    adventureType: 'scenario_anthology',
    patterns: ['wrota mroku', 'doors to darkness'],
  },
  {
    id: 'mansions-of-madness',
    profile: 'scenario_anthology',
    titlePl: 'Posiadłości Szaleństwa',
    titleEn: 'Mansions of Madness',
    adventureType: 'scenario_anthology',
    patterns: ['posiadlosci szalenstwa', 'mansions of madness'],
  },
  {
    id: 'nameless-horrors',
    profile: 'scenario_anthology',
    titlePl: 'Nienazwane Zgrozy',
    titleEn: 'Nameless Horrors',
    adventureType: 'scenario_anthology',
    patterns: ['nienazwane zgrozy', 'nameless horrors'],
  },
  {
    id: 'gateways-to-terror',
    profile: 'scenario_anthology',
    titlePl: 'Wrota Grozy',
    titleEn: 'Gateways to Terror',
    adventureType: 'scenario_anthology',
    patterns: ['wrota grozy', 'gateways to terror'],
  },
  {
    id: 'dead-light',
    profile: 'scenario_anthology',
    titlePl: 'Zimne Światło',
    titleEn: 'Dead Light and Other Dark Turns',
    adventureType: 'scenario_anthology',
    patterns: ['zimne swiatlo', 'dead light'],
  },
  {
    id: 'cults-of-cthulhu',
    profile: 'scenario_anthology',
    titlePl: 'Kulty Cthulhu',
    titleEn: 'Cults of Cthulhu',
    adventureType: 'scenario_anthology',
    patterns: ['kulty cthulhu', 'cults of cthulhu'],
  },
  {
    id: 'uslysz-zew-cthulhu',
    profile: 'scenario_anthology',
    titlePl: 'Usłysz Zew Cthulhu',
    titleEn: 'Hear the Call of Cthulhu',
    adventureType: 'scenario_anthology',
    patterns: ['uslysz zew cthulhu'],
  },
  {
    id: 'kwiat-paproci',
    profile: 'scenario_anthology',
    titlePl: 'Kwiat Paproci',
    titleEn: 'The Fern Flower',
    adventureType: 'scenario_anthology',
    patterns: ['kwiat paproci', 'kwiatpaproci'],
  },
  {
    id: 'does-love-forgive',
    profile: 'scenario_anthology',
    titlePl: 'Miłość ci wszystko wybaczy?',
    titleEn: 'Does Love Forgive?',
    adventureType: 'scenario_anthology',
    patterns: ['milosc ci wszystko wybaczy', 'does love forgive'],
  },
  {
    id: 'pisk-wizg-odlamek',
    profile: 'scenario_anthology',
    titlePl: 'Pisk, wizg i Odłamek',
    titleEn: 'Squeak, Screech and Shard',
    adventureType: 'scenario_anthology',
    patterns: ['pisk, wizg', 'pisk wizg'],
  },
  {
    id: 'uwierz-w-duchy',
    profile: 'scenario_anthology',
    titlePl: 'Uwierz w duchy',
    titleEn: 'Believe in Ghosts',
    adventureType: 'scenario_anthology',
    patterns: ['uwierz w duchy'],
  },
  {
    id: 'no-time-to-scream',
    profile: 'scenario_anthology',
    titlePl: 'Nie czas na krzyk',
    titleEn: 'No Time to Scream',
    adventureType: 'scenario_anthology',
    patterns: ['nie czas na krzyk', 'no time to scream'],
  },

  // --- SETTINGI, EPOKI I ALMANACHY (SETTING EXPANSIONS) ---
  {
    id: 'berlin-wicked-city',
    profile: 'setting_expansion',
    titlePl: 'Berlin: Miasto Grzechu',
    titleEn: 'Berlin: The Wicked City',
    patterns: ['berlin: the wicked city', 'berlin the wicked city', 'berlin: miasto grzechu', 'berlin miasto grzechu'],
  },
  {
    id: 'down-darker-trails',
    profile: 'setting_expansion',
    titlePl: 'Down Darker Trails - Dziki Zachód',
    titleEn: 'Down Darker Trails',
    patterns: ['down darker trails'],
  },
  {
    id: 'cthulhu-dark-ages',
    profile: 'setting_expansion',
    titlePl: 'Cthulhu: Mroczne Wieki',
    titleEn: 'Cthulhu Dark Ages',
    patterns: ['dark ages', 'mroczne wieki'],
  },
  {
    id: 'cthulhu-by-gaslight',
    profile: 'setting_expansion',
    titlePl: 'Cthulhu by Gaslight',
    titleEn: 'Cthulhu by Gaslight',
    patterns: ['by gaslight', 'gaslight', 'swiatlo gazowych latarni'],
  },
  {
    id: 'regency-cthulhu',
    profile: 'setting_expansion',
    titlePl: 'Regency Cthulhu',
    titleEn: 'Regency Cthulhu',
    patterns: ['regency cthulhu'],
  },
  {
    id: 'harlem-unbound',
    profile: 'setting_expansion',
    titlePl: 'Harlem Unbound',
    titleEn: 'Harlem Unbound',
    patterns: ['harlem unbound'],
  },
  {
    id: 'reign-of-terror',
    profile: 'setting_expansion',
    titlePl: 'Rządy Terroru',
    titleEn: 'Reign of Terror',
    patterns: ['reign of terror', 'rzady terroru'],
  },
  {
    id: 'arkham-unveiled',
    profile: 'setting_expansion',
    titlePl: 'Arkham: Miasto Legend',
    titleEn: 'Call of Cthulhu: Arkham',
    patterns: ['call of cthulhu arkham', 'secrets of arkham', 'arkham unveiled'],
  },
  {
    id: 'powrot-do-rlyeh',
    profile: 'setting_expansion',
    titlePl: "Powrót do R'lyeh - Almanach Strażnika",
    titleEn: "Return to R'lyeh - Keeper Almanac",
    patterns: ['powrot do rlyeh', 'powrotdorlyeh', 'almanach straznika'],
  },
  {
    id: 'postaci-historyczne',
    profile: 'setting_expansion',
    titlePl: 'Postaci Historyczne',
    titleEn: 'Historical Characters',
    patterns: ['postaci historyczne', 'postaci_historyczne', 'postaci-historyczne'],
  },
  {
    id: 'miniporadnik-oni',
    profile: 'setting_expansion',
    titlePl: 'Miniporadnik: ONI',
    titleEn: 'Keeper Guide: THEM',
    patterns: ['miniporadnik_oni', 'miniporadnik: oni', 'miniporadnik oni'],
  },
  {
    id: 'miniporadnik-martwy-punkt',
    profile: 'setting_expansion',
    titlePl: 'Miniporadnik: W martwym punkcie',
    titleEn: 'Keeper Guide: Dead Point',
    patterns: ['w_martwym_punkcie', 'w martwym punkcie'],
  },
  {
    id: 'miniporadnik-wrak',
    profile: 'setting_expansion',
    titlePl: 'Miniporadnik: Wrak',
    titleEn: 'Keeper Guide: The Wreck',
    patterns: ['miniporadnik_wrak', 'miniporadnik: wrak', 'miniporadnik wrak'],
  },

  // --- OFICJALNE JEDNOSTRZAŁY (ONE-SHOTS) ---
  {
    id: 'trzeba-karmic-ogien',
    profile: 'one_shot',
    titlePl: 'Trzeba karmić ogień',
    titleEn: 'Feed the Fire',
    adventureType: 'one_shot',
    patterns: ['trzeba karmic ogien', 'trzeba_karmic'],
  },
  {
    id: 'lightless-beacon',
    profile: 'one_shot',
    titlePl: 'Mroczna Latarnia',
    titleEn: 'The Lightless Beacon',
    adventureType: 'one_shot',
    patterns: ['mroczna latarnia', 'mrocznalatarnia', 'mroczna_latarnia', 'lightless beacon'],
  },
  {
    id: 'w-czelusciach-sklepow',
    profile: 'one_shot',
    titlePl: 'W czeluściach sklepów',
    titleEn: 'In the Depths of the Stores',
    adventureType: 'one_shot',
    patterns: ['w czelusciach sklepow', 'w_czelusciach_sklepow', 'w-czelusciach-sklepow'],
  },
  {
    id: 'krakowska-enigma',
    profile: 'one_shot',
    titlePl: 'Krakowska Enigma',
    titleEn: 'The Krakow Enigma',
    adventureType: 'one_shot',
    patterns: ['krakowska enigma', 'krakowska_enigma', 'krakowska-enigma'],
  },
  {
    id: 'noc-zaglady',
    profile: 'one_shot',
    titlePl: 'World War Cthulhu: Noc Zagłady',
    titleEn: 'World War Cthulhu: The Night of Doom',
    adventureType: 'one_shot',
    patterns: ['noc zaglady', 'noc_zaglady', 'noc-zaglady'],
  },
  {
    id: 'pelzajaca-kontrrewolucja',
    profile: 'one_shot',
    titlePl: 'Pełzająca kontrrewolucja',
    titleEn: 'The Creeping Counter-Revolution',
    adventureType: 'one_shot',
    patterns: ['pelzajaca kontrrewolucja', 'kontrrewolucja'],
  },
  {
    id: 'the-haunting',
    profile: 'one_shot',
    titlePl: 'Nawiedzony Dom',
    titleEn: 'The Haunting',
    adventureType: 'one_shot',
    patterns: ['nawiedzony dom', 'the haunting', 'dom corbitta'],
  },
  {
    id: 'edge-of-darkness',
    profile: 'one_shot',
    titlePl: 'Na Krawędzi Ciemności',
    titleEn: 'Edge of Darkness',
    adventureType: 'one_shot',
    patterns: ['na krawedzi ciemnosci', 'edge of darkness'],
  },
  {
    id: 'dead-boarder',
    profile: 'one_shot',
    titlePl: 'Nieboszczyk w hotelu',
    titleEn: 'The Dead Boarder',
    adventureType: 'one_shot',
    patterns: ['nieboszczyk w hotelu', 'dead boarder'],
  },
  {
    id: 'blackwater-creek',
    profile: 'one_shot',
    titlePl: 'Czarne Wody',
    titleEn: 'Blackwater Creek',
    adventureType: 'one_shot',
    patterns: ['blackwater creek', 'czarne wody'],
  },
  {
    id: 'crimson-letters',
    profile: 'one_shot',
    titlePl: 'Szkarłatne Litery',
    titleEn: 'Crimson Letters',
    adventureType: 'one_shot',
    patterns: ['szkarlatne litery', 'crimson letters'],
  },
  {
    id: 'among-ancient-trees',
    profile: 'one_shot',
    titlePl: 'Pośród Pradawnych Drzew',
    titleEn: 'Among the Ancient Trees',
    adventureType: 'one_shot',
    patterns: ['posrod pradawnych drzew', 'among the ancient trees'],
  },
  {
    id: 'missed-dues',
    profile: 'one_shot',
    titlePl: 'Zaległe Należności',
    titleEn: 'Missed Dues',
    adventureType: 'one_shot',
    patterns: ['zalegle naleznosci', 'missed dues'],
  },
  {
    id: 'scritch-scratch',
    profile: 'one_shot',
    titlePl: 'Drap Drap',
    titleEn: 'Scritch Scratch',
    adventureType: 'one_shot',
    patterns: ['drap drap', 'scritch scratch'],
  },
  {
    id: 'the-derelict',
    profile: 'one_shot',
    titlePl: 'Wrak',
    titleEn: 'The Derelict',
    adventureType: 'one_shot',
    patterns: ['the derelict'],
  },
  {
    id: 'dead-man-stomp',
    profile: 'one_shot',
    titlePl: 'Trupia Sambita',
    titleEn: 'Dead Man Stomp',
    adventureType: 'one_shot',
    patterns: ['dead man stomp', 'trupia sambita'],
  },
];

/**
 * Szuka dopasowania do zamkniętego katalogu oficjalnych publikacji.
 */
export function matchOfficialPublication(
  cleanFileName: string,
  titleHeaderSample: string,
  profileFilter?: RulebookProfile
): OfficialPublication | null {
  if (cleanFileName) {
    for (const pub of OFFICIAL_PUBLICATIONS) {
      if (profileFilter && pub.profile !== profileFilter) continue;
      for (const pattern of pub.patterns) {
        if (cleanFileName.includes(pattern)) {
          return pub;
        }
      }
    }
  }

  if (titleHeaderSample) {
    let earliestMatch: { pub: OfficialPublication; pos: number } | null = null;
    for (const pub of OFFICIAL_PUBLICATIONS) {
      if (profileFilter && pub.profile !== profileFilter) continue;
      for (const pattern of pub.patterns) {
        const pos = titleHeaderSample.indexOf(pattern);
        if (pos !== -1) {
          if (!earliestMatch || pos < earliestMatch.pos) {
            earliestMatch = { pub, pos };
          }
        }
      }
    }
    if (earliestMatch) {
      return earliestMatch.pub;
    }
  }

  return null;
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
  const hasPolishDiacritics = /[ąćęłńóśźż]/i.test(fileName) || /[ąćęłńóśźż]/i.test(rawSample);

  const plMarkers = [
    'poczytalnosc',
    'badacz',
    'badacze',
    'badaczy',
    'straznik tajemnic',
    'straznik',
    'kosc',
    'kosci',
    'k100',
    'wspolczynniki',
    'sila',
    'kondycja',
    'zrecznosc',
    'przygoda',
    'przygody',
    'scenariusz',
    'scenariusze',
    'poszlaki',
    'rekwizyt',
    'rekwizyty',
    'kampania',
    'edycja',
    'rozdzial',
    'tajemnice',
    'mitow',
    'zew cthulhu',
    'postaci',
  ];
  const enMarkers = [
    'sanity',
    'investigator',
    'investigators',
    'keeper of arcane lore',
    'keeper',
    'dice',
    'd100',
    'characteristics',
    'strength',
    'constitution',
    'dexterity',
    'adventure',
    'adventures',
    'scenario',
    'scenarios',
    'clues',
    'handout',
    'handouts',
    'campaign',
    'edition',
    'chapter',
    'call of cthulhu',
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
    hasPolishDiacritics || (plHits > enHits && plHits >= 1)
      ? 'pl'
      : enHits > plHits && enHits >= 1
      ? 'en'
      : 'unknown';

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
    sample.includes('pulp-o-meter') ||
    sample.includes('creating pulp heroes') ||
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

  // H. Starter (Zasady Skrócone / Quick-Start / Zestaw Startowy)
  const isStarterIndicator =
    !isScenarioHeader &&
    !isAnthologyHeader &&
    !isKeeperGuideHeader &&
    (cleanFileName.includes('starter') ||
      cleanFileName.includes('quick-start') ||
      cleanFileName.includes('quick_start') ||
      cleanFileName.includes('quickstart') ||
      cleanFileName.includes('zestaw startowy') ||
      cleanFileName.includes('zestaw_startowy') ||
      cleanFileName.includes('zasady_wprowadzajace') ||
      cleanFileName.includes('zasady-wprowadzajace') ||
      cleanFileName.includes('zasady wprowadzajace') ||
      cleanFileName.includes('zasady skrocone') ||
      cleanFileName.includes('zasady_skrocone') ||
      normalizedHeaderSample.includes('zestaw startowy') ||
      normalizedHeaderSample.includes('starter set') ||
      normalizedHeaderSample.includes('quick-start rules') ||
      normalizedHeaderSample.includes('zasady wprowadzajace') ||
      normalizedHeaderSample.includes('zasady skrocone') ||
      sample.includes('zestaw startowy') ||
      sample.includes('starter set') ||
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
    !hasPulpTalents &&
    (cleanFileName.includes('ksiega straznika') ||
      cleanFileName.includes('ksiegastraznika') ||
      cleanFileName.includes('ksiega_straznika') ||
      cleanFileName.includes('podrecznik straznika') ||
      cleanFileName.includes('podrecznik_straznika') ||
      cleanFileName.includes('keeper rulebook') ||
      cleanFileName.includes('keeper_rulebook') ||
      cleanFileName.includes("keeper's rulebook") ||
      cleanFileName.includes('core_rules') ||
      cleanFileName.includes('core-rules') ||
      titleHeaderSample.includes('ksiega straznika') ||
      titleHeaderSample.includes('podrecznik straznika') ||
      titleHeaderSample.includes('keeper rulebook') ||
      titleHeaderSample.includes("keeper's rulebook") ||
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
      titleHeaderSample.includes('wielki grymuar') ||
      titleHeaderSample.includes('grand grimoire') ||
      titleHeaderSample.includes('grimoire') ||
      titleHeaderSample.includes('grymuar') ||
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
      cleanFileName.includes('ksiega bestii') ||
      cleanFileName.includes('ksiega_bestii') ||
      cleanFileName.includes('field guide') ||
      cleanFileName.includes('field_guide') ||
      normalizedHeaderSample.includes('malleus monstrorum') ||
      normalizedHeaderSample.includes('field guide to lovecraftian') ||
      normalizedHeaderSample.includes('bestiariusz mitow') ||
      normalizedHeaderSample.includes('ksiega bestii') ||
      titleHeaderSample.includes('malleus monstrorum') ||
      titleHeaderSample.includes('bestiariusz') ||
      titleHeaderSample.includes('field guide') ||
      (hasCreatures &&
        (sample.includes('bostwa') || sample.includes('deities')) &&
        !hasSpells &&
        !hasCombatRules &&
        !hasChaseRules)) &&
    !hasChaseRules &&
    !hasInvestigatorCreation;

  // C. Podręcznik Badacza / Księga Badacza (Investigator Handbook)
  const isInvestigatorHandbookIndicator =
    !isExplicitCoreBook &&
    !isScenarioHeader &&
    !isAnthologyHeader &&
    !isKeeperGuideHeader &&
    (cleanFileName.includes('podrecznik badacza') ||
      cleanFileName.includes('podrecznik_badacza') ||
      cleanFileName.includes('podrecznik badaczy') ||
      cleanFileName.includes('podrecznik_badaczy') ||
      cleanFileName.includes('ksiega badacza') ||
      cleanFileName.includes('ksiega_badacza') ||
      cleanFileName.includes('ksiega badaczy') ||
      cleanFileName.includes('ksiega_badaczy') ||
      cleanFileName.includes('investigator handbook') ||
      cleanFileName.includes('investigator_handbook') ||
      cleanFileName.includes("investigator's handbook") ||
      cleanFileName.includes('investigators handbook') ||
      cleanFileName.includes('investigators_handbook') ||
      normalizedHeaderSample.includes('podrecznik badacza') ||
      normalizedHeaderSample.includes('podrecznik badaczy') ||
      normalizedHeaderSample.includes('ksiega badacza') ||
      normalizedHeaderSample.includes('ksiega badaczy') ||
      normalizedHeaderSample.includes('investigator handbook') ||
      normalizedHeaderSample.includes("investigator's handbook") ||
      normalizedHeaderSample.includes('investigators handbook') ||
      titleHeaderSample.includes('ksiega badacza') ||
      titleHeaderSample.includes('podrecznik badacza') ||
      titleHeaderSample.includes('investigator handbook') ||
      titleHeaderSample.includes("investigator's handbook")) &&
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
    !isPulpIndicator &&
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
    !isPulpIndicator &&
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
  } else if (isStarterIndicator) {
    profile = 'starter-d100';
    title =
      detectedLanguage === 'pl'
        ? (cleanFileName.includes('zestaw') || normalizedHeaderSample.includes('zestaw startowy') || cleanFileName.includes('starter')
          ? 'Zestaw Startowy d100 (Starter Set)'
          : 'Zasady Skrócone d100 (Quick-Start Rules)')
        : (cleanFileName.includes('starter') || normalizedHeaderSample.includes('starter set')
          ? 'Starter Set d100'
          : 'Quick-Start Rules d100');
    confidence = 0.95;
    adventureType = 'one_shot';
  } else {
    const officialPub = matchOfficialPublication(cleanFileName, titleHeaderSample);
    if (officialPub && (!isScenarioHeader || officialPub.profile === 'one_shot')) {
      profile = officialPub.profile;
      const pubTitlePlClean = stripDiacritics(officialPub.titlePl.toLowerCase());
      const pubTitleEnClean = stripDiacritics(officialPub.titleEn.toLowerCase());
      const matchesPlTitle =
        cleanFileName.includes(pubTitlePlClean) ||
        titleHeaderSample.includes(pubTitlePlClean);
      const matchesEnTitle =
        cleanFileName.includes(pubTitleEnClean) ||
        titleHeaderSample.includes(pubTitleEnClean);

      const isPolishPublication =
        detectedLanguage === 'pl' ||
        (detectedLanguage !== 'en' && matchesPlTitle) ||
        (matchesPlTitle && !matchesEnTitle);

      title = isPolishPublication ? officialPub.titlePl : officialPub.titleEn;
      if (officialPub.adventureType) {
        adventureType = officialPub.adventureType;
      }
      confidence = 0.98;
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
        ? (cleanFileName.includes('ksiega') || normalizedHeaderSample.includes('ksiega badacz')
          ? 'Księga Badacza d100 (Investigator Handbook)'
          : 'Podręcznik Badacza d100 (Investigator Handbook)')
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
  } else if (isCoreIndicator) {
    profile = 'core-d100';
    title =
      detectedLanguage === 'pl'
        ? 'Księga Zasad Głównych d100 (Core Book)'
        : 'Core Rulebook d100 (Core Book)';
    confidence = 0.95;
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
    profile = 'unknown';
    title =
      detectedLanguage === 'pl'
        ? 'Nierozpoznany dokument PDF'
        : 'Unrecognized PDF Document';
    confidence = 0.1;
  }
}

  if (profile === 'unknown') {
    return {
      profile: 'unknown',
      title:
        detectedLanguage === 'en'
          ? 'Unrecognized PDF Document'
          : 'Nierozpoznany dokument PDF',
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

  if (hasCombatRules || hasChaseRules || hasSanityRules || isPulpIndicator || isInvestigatorHandbookIndicator || profile === 'investigator_handbook' || profile === 'pulp-d100') {
    detectedCategories.push('MECHANIKA');
    estimatedEntities.rules = true;
  }
  if (hasCreatures || isBestiaryIndicator || isCoreIndicator || profile === 'bestiary') {
    detectedCategories.push('BESTIARIUSZ');
    estimatedEntities.creatures = true;
  }
  if (hasSpells || hasMagicRules || isGrimoireIndicator || isCoreIndicator || profile === 'grimoire') {
    detectedCategories.push('CZARY');
    estimatedEntities.spells = true;
  }
  const scenarioSearchText =
    profile === 'core-d100' || profile === 'pulp-d100'
      ? (text.length > 150000
          ? `${sample} ${stripDiacritics(text.slice(150000).toLowerCase())}`
          : sample
        ).replace(/\s+/g, ' ')
      : sample.replace(/\s+/g, ' ');

  const hasCoreBuiltInScenarios =
    profile === 'core-d100' &&
    (scenarioSearchText.includes('posrod pradawnych drzew') ||
      scenarioSearchText.includes('wsrod prastarych drzew') ||
      scenarioSearchText.includes('wsrod pradawnych drzew') ||
      scenarioSearchText.includes('posrod prastarych drzew') ||
      scenarioSearchText.includes('amidst the ancient trees') ||
      scenarioSearchText.includes('szkarlatne litery') ||
      scenarioSearchText.includes('karmazynowe litery') ||
      scenarioSearchText.includes('crimson letters'));

  const hasPulpBuiltInScenarios =
    profile === 'pulp-d100' &&
    (scenarioSearchText.includes('the disintegrator') ||
      scenarioSearchText.includes('dezintegrator') ||
      scenarioSearchText.includes('waiting for the hurricane') ||
      scenarioSearchText.includes('czekajac na huragan') ||
      scenarioSearchText.includes("pandora's box") ||
      scenarioSearchText.includes('pandora’s box') ||
      scenarioSearchText.includes('pandoras box') ||
      scenarioSearchText.includes('puszka pandory') ||
      scenarioSearchText.includes('slow boat to china') ||
      scenarioSearchText.includes('wolny statek do chin'));

  const hasDetectedScenarios =
    Boolean(adventureType) ||
    isAnthologyIndicator ||
    isMegaCampaignIndicator ||
    isOneShotIndicator ||
    isStarterIndicator ||
    hasCoreBuiltInScenarios ||
    hasPulpBuiltInScenarios;

  if (hasDetectedScenarios) {
    detectedCategories.push('FABULA');
    detectedCategories.push('NPC');
    estimatedEntities.npcs = true;
    estimatedEntities.locations = true;
    estimatedEntities.clues = true;
  }
  if (hasHandouts || hasDetectedScenarios) {
    detectedCategories.push('REKWIZYTY');
    estimatedEntities.handouts = true;
  }

  const semanticPlan: SemanticExtractionPlan = {
    detectedCategories: Array.from(new Set(detectedCategories)),
    estimatedEntities,
    adventureType,
    multiPartDetected:
      profile === 'mega_campaign' ||
      profile === 'scenario_anthology' ||
      hasCoreBuiltInScenarios ||
      hasPulpBuiltInScenarios,
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
      hasScenarios: Boolean(adventureType) || hasCoreBuiltInScenarios || hasPulpBuiltInScenarios,
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
    profile === 'starter-d100' ||
    profile === 'core-d100' ||
    profile === 'pulp-d100'
  );
}

