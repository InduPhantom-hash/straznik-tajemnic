/**
 * official-campaigns.ts
 *
 * Kanoniczny rejestr oficjalnych kampanii Zewu Cthulhu 7ed wydanych przez
 * Black Monk Games (edycje polskie) oraz Chaosium (edycje anglojęzyczne).
 *
 * Wykorzystywany do precyzyjnego rozpoznawania wgrywanych plików PDF
 * oraz rozstrzygania, czy przygoda to wieloczęściowa kampania (dopuszczająca
 * lub wymagająca patrona / Stowarzyszenia Badaczy), czy też oneshot / antologia.
 *
 * @module official-campaigns
 */

export interface OfficialCampaign {
  id: string;
  title: {
    pl: string;
    en: string;
  };
  publisher: 'Black Monk Games' | 'Chaosium';
  isPolishEditionAvailable: boolean;
  era: string;
  chaptersCount?: number;
  /**
   * Dedykowany patron kampanii, jeśli jest z góry narzucony przez autorów
   * (np. fundacja Caduceus w Dwugłowym Wężu, Uniwersytet Miskatonic w Czasie Żniw).
   */
  campaignPatron?: {
    pl: string;
    en: string;
  };
  description: {
    pl: string;
    en: string;
  };
  aliases: string[];
}

export const OFFICIAL_CAMPAIGNS: OfficialCampaign[] = [
  {
    id: 'masks-of-nyarlathotep',
    title: {
      pl: 'Maski Nyarlathotepa',
      en: 'Masks of Nyarlathotep',
    },
    publisher: 'Black Monk Games',
    isPolishEditionAvailable: true,
    era: '1920s',
    chaptersCount: 7,
    campaignPatron: {
      pl: 'Ekspedycja Carlyle\'a i Jackson Elias (spuścizna śledcza)',
      en: 'The Carlyle Expedition & Jackson Elias (investigative legacy)',
    },
    description: {
      pl: 'Monumentalna globalna kampania na 6 kontynentach badająca losy zaginionej ekspedycji Rogera Carlyle\'a i kultowe macki Nyarlathotepa.',
      en: 'Monumental globe-spanning campaign across six continents investigating the fate of the Carlyle Expedition and the cults of Nyarlathotep.',
    },
    aliases: [
      'maski nyarlathotepa',
      'masks of nyarlathotep',
      'nyarlathotep',
      'carlyle expedition',
      'ekspedycja carlyle',
    ],
  },
  {
    id: 'horror-on-the-orient-express',
    title: {
      pl: 'Horror w Orient Expressie',
      en: 'Horror on the Orient Express',
    },
    publisher: 'Black Monk Games',
    isPolishEditionAvailable: true,
    era: '1920s',
    chaptersCount: 19,
    campaignPatron: {
      pl: 'Profesor Julius Smith i zlecenia arystokratyczne w Europie',
      en: 'Professor Julius Smith and European aristocratic commissions',
    },
    description: {
      pl: 'Epicka podróż z Londynu do Konstantynopola luksusowym pociągiem przez całą Europę w poszukiwaniu artefaktu Sedefkar Simulacrum.',
      en: 'Epic rail journey from London to Constantinople tracking the pieces of the Sedefkar Simulacrum across Europe.',
    },
    aliases: [
      'horror w orient expressie',
      'horror on the orient express',
      'orient express',
      'sedefkar',
      'julius smith',
    ],
  },
  {
    id: 'reign-of-terror',
    title: {
      pl: 'Wielki Terror',
      en: 'Reign of Terror',
    },
    publisher: 'Black Monk Games',
    isPolishEditionAvailable: true,
    era: 'gaslight', // Rewolucja Francuska (1789/1794)
    chaptersCount: 2,
    campaignPatron: {
      pl: 'Królewscy dragoni / Żandarmeria i tajne służby Rewolucji',
      en: 'Royal dragoons / Revolutionary secret police and gendarmerie',
    },
    description: {
      pl: 'Dwuczęściowa minikampania historyczna osadzona w Paryżu w dobie Rewolucji Francuskiej i Terroru, powiązana z Orient Expressem.',
      en: 'Two-part historical mini-campaign set in Paris during the French Revolution and the Terror, tied to Horror on the Orient Express.',
    },
    aliases: [
      'wielki terror',
      'reign of terror',
      'rewolucja francuska',
      'paryz 1789',
    ],
  },
  {
    id: 'a-cold-fire-within',
    title: {
      pl: 'Zimne Płomienie',
      en: 'A Cold Fire Within',
    },
    publisher: 'Black Monk Games',
    isPolishEditionAvailable: true,
    era: '1930s',
    chaptersCount: 6,
    campaignPatron: {
      pl: 'Otwarte dochodzenie spirytystyczne i ekspedycja Agharti',
      en: 'Spiritualist investigation and Agharti expedition',
    },
    description: {
      pl: 'Kampania Pulp Cthulhu skupiona na telepatycznych mocach, zjawiskach parapsychicznych i zaginionej krainie Agharti.',
      en: 'Pulp Cthulhu campaign exploring psychic powers, ancient telepathic cults, and the lost realm of Agharti.',
    },
    aliases: [
      'zimne plomienie',
      'zimne płomienie',
      'a cold fire within',
      'agharti',
    ],
  },
  {
    id: 'the-two-headed-serpent',
    title: {
      pl: 'Dwugłowy Wąż',
      en: 'The Two-Headed Serpent',
    },
    publisher: 'Chaosium',
    isPolishEditionAvailable: false,
    era: '1930s',
    chaptersCount: 9,
    campaignPatron: {
      pl: 'Fundacja Medyczna Caduceus (Caduceus Foundation)',
      en: 'Caduceus Medical Foundation',
    },
    description: {
      pl: 'Pulpowa kampania dookoła świata przeciwko spiskowi Wężoludzi, prowadzona pod szyldem medycznej fundacji Caduceus.',
      en: 'High-octane Pulp Cthulhu campaign spanning the globe against the Serpent People, operating under the Caduceus Foundation.',
    },
    aliases: [
      'dwuglowy waz',
      'dwugłowy wąż',
      'the two-headed serpent',
      'two headed serpent',
      'caduceus',
    ],
  },
  {
    id: 'a-time-to-harvest',
    title: {
      pl: 'Czas Żniw',
      en: 'A Time to Harvest',
    },
    publisher: 'Chaosium',
    isPolishEditionAvailable: false,
    era: '1920s',
    chaptersCount: 6,
    campaignPatron: {
      pl: 'Uniwersytet Miskatonic w Arkham (Miskatonic University)',
      en: 'Miskatonic University in Arkham',
    },
    description: {
      pl: 'Sześcioczęściowa kampania w stanie Vermont koncentrująca się na ekspedycji studentów Miskatonic i inwazji Mi-Go.',
      en: 'Six-part campaign set in rural Vermont revolving around Miskatonic University student field trips and the Mi-Go harvest.',
    },
    aliases: [
      'czas zniw',
      'czas żniw',
      'a time to harvest',
      'time to harvest',
      'cobb\'s corners',
    ],
  },
  {
    id: 'the-children-of-fear',
    title: {
      pl: 'Dzieci Snów',
      en: 'The Children of Fear',
    },
    publisher: 'Chaosium',
    isPolishEditionAvailable: false,
    era: '1920s',
    chaptersCount: 8,
    campaignPatron: {
      pl: 'Międzynarodowa ekspedycja naukowa i tybetańska misja poszukiwawcza',
      en: 'International academic expedition & Tibetan search mission',
    },
    description: {
      pl: 'Epicka kampania w Chinach, północnych Indiach i Tybecie badająca starożytne wierzenia, koszmary i tajemnice dolin Himalajów.',
      en: 'Epic Asian campaign spanning China, Northern India, and Tibet uncovering ancient occult nightmares and mountain mysteries.',
    },
    aliases: [
      'dzieci snow',
      'dzieci snów',
      'the children of fear',
      'children of fear',
      'tybet',
    ],
  },
  {
    id: 'the-order-of-the-stone',
    title: {
      pl: 'Zakon Kamienia',
      en: 'The Order of the Stone',
    },
    publisher: 'Chaosium',
    isPolishEditionAvailable: false,
    era: '1920s',
    chaptersCount: 3,
    campaignPatron: {
      pl: 'Irlandzkie towarzystwo archeologiczne / Instytut Nowej Anglii',
      en: 'Irish archaeological society / New England institute',
    },
    description: {
      pl: 'Trzyczęściowa kampania z 2024 roku łącząca wykopaliska archeologiczne w Irlandii z pradawną grozą w lasach Massachusetts.',
      en: 'Three-part 2024 campaign connecting archaeological excavations in Ireland with ancient terror in rural Massachusetts.',
    },
    aliases: [
      'zakon kamienia',
      'the order of the stone',
      'order of the stone',
    ],
  },
];

/**
 * Sprawdza, czy dany tytuł lub identyfikator odpowiada oficjalnej kampanii Zewu Cthulhu 7ed.
 */
export function isOfficialCampaign(titleOrId: string): boolean {
  return Boolean(findOfficialCampaign(titleOrId));
}

/**
 * Wyszukuje oficjalną kampanię na podstawie ID, tytułu lub aliasu.
 */
export function findOfficialCampaign(query: string): OfficialCampaign | undefined {
  if (!query) return undefined;
  const normalized = query.toLowerCase().trim();

  return OFFICIAL_CAMPAIGNS.find((c) => {
    if (c.id.toLowerCase() === normalized) return true;
    if (c.title.pl.toLowerCase() === normalized) return true;
    if (c.title.en.toLowerCase() === normalized) return true;
    if (c.aliases.some((alias) => normalized.includes(alias.toLowerCase()))) return true;
    return false;
  });
}

/**
 * Heurystyka klasyfikująca dokument jako kampanię lub scenariusz/oneshot.
 */
export function classifyDocumentAsCampaign(
  title: string,
  textSnippet: string = ''
): {
  isCampaign: boolean;
  campaign?: OfficialCampaign;
  detectedPatron?: string;
  reason: string;
} {
  // 1. Sprawdzenie po oficjalnej liście kampanii Black Monk / Chaosium
  const official = findOfficialCampaign(title);
  if (official) {
    return {
      isCampaign: true,
      campaign: official,
      detectedPatron: official.campaignPatron?.pl,
      reason: `Wykryto oficjalną kanoniczną kampanię Zewu Cthulhu 7ed: "${official.title.pl}" (${official.publisher}).`,
    };
  }

  const combined = `${title} ${textSnippet}`.toLowerCase();

  // 2. Wyszukiwanie oficjalnych aliasów w tekście
  for (const c of OFFICIAL_CAMPAIGNS) {
    if (c.aliases.some((alias) => combined.includes(alias.toLowerCase()))) {
      return {
        isCampaign: true,
        campaign: c,
        detectedPatron: c.campaignPatron?.pl,
        reason: `Wykryto odniesienie do oficjalnej kampanii: "${c.title.pl}".`,
      };
    }
  }

  // 3. Wskaźniki strukturalne wieloczęściowej kampanii (wieloaktowość, rozdziały, epizody)
  const hasCampaignKeyword = /\b(kampania|campaign|mega-kampania|megakampania)\b/i.test(combined);
  const hasMultiChapterStructure =
    /\b(rozdział\s+[1-9]|chapter\s+[1-9]|epizod\s+[1-9]|akt\s+(i{1,3}|iv|v))\b/i.test(combined) &&
    /\b(rozdział\s+[2-9]|chapter\s+[2-9]|epizod\s+[2-9]|akt\s+(ii|iii))\b/i.test(combined);

  if (hasCampaignKeyword && hasMultiChapterStructure) {
    return {
      isCampaign: true,
      reason: 'Wykryto strukturę wieloaktowej kampanii (wiele rozdziałów/epizodów z ciągłością Badaczy).',
    };
  }

  return {
    isCampaign: false,
    reason: 'Dokument nie jest kampanią (jest pojedynczym scenariuszem, antologią lub oneshotem).',
  };
}
