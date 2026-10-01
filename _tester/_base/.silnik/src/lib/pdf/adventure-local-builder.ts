/**
 * adventure-local-builder.ts - Lokalny generator struktury i grafu przygody (Clean Room BYOB)
 *
 * Doktryna "Czystego Emulatora BYOB" (Zero-Cytowań, bez wysyłania dokumentu do chmury).
 * Analizuje sparsowany tekst PDF, profil regułowy oraz nakładkę semantyczną w pamięci RAM,
 * budując pełny obiekt CustomAdventure z grafem śledztwa (AdventureGraph) dla MG i Dossier.
 */

import type {
  CustomAdventure,
  InvestigatorRequirements,
  PregenCharacterConcept,
  AdventurePuzzle,
  AdventureHandout,
} from '@/lib/adventures-data';
import type {
  AdventureGraph,
  AdventureNPC,
  AdventureLocation,
  AdventureClue,
  GraphConnection,
} from '@/lib/types';
import type { DocumentType } from '@/types/adventure';
import type {
  OverlayDescriptor,
  OverlayNPC,
  OverlayHandout,
  OverlayAdventureNode,
} from './semantic-overlay-engine';
import type { RulebookFingerprintResult } from './rulebook-fingerprint';

export function slugifyText(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (c) => {
        const map: Record<string, string> = {
          ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
        };
        return map[c] || c;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'adventure'
  );
}

/**
 * Wykrywa erę i zakres lat z tekstu scenariusza
 */
export function detectEraAndYears(text: string): {
  era: 'classic' | 'gaslight' | 'noir' | 'prl' | 'modern' | 'custom';
  eraLabel: string;
  yearRange: string;
  activeSceneYear?: number;
} {
  const sample = text.slice(0, 60000);

  // Szukanie 4-cyfrowych lat (1880-2030)
  const yearsFound = sample.match(/\b(18[89]\d|19[0-9]\d|20[0-2]\d)\b/g);
  const years = yearsFound ? Array.from(new Set(yearsFound.map(Number))) : [];

  // Wykrywanie PRL
  if (/prl|milicj|sb|sluzb[ay]\s+bezpieczenstw|pzpr|komitet\s+centraln/i.test(sample)) {
    const prlYear = years.find((y) => y >= 1950 && y <= 1989) || 1974;
    return {
      era: 'prl',
      eraLabel: 'PRL - lata 70.',
      yearRange: `${prlYear}`,
      activeSceneYear: prlYear,
    };
  }

  // Wykrywanie lat 20. (Classic CoC)
  const twentiesYear = years.find((y) => y >= 1920 && y <= 1929);
  if (twentiesYear || /lata\s+20|roaring\s+twenties|klasyczn|192\d/i.test(sample)) {
    const y = twentiesYear || 1925;
    return {
      era: 'classic',
      eraLabel: 'Klasyczne lata 20.',
      yearRange: `${y}`,
      activeSceneYear: y,
    };
  }

  // Wykrywanie lat 30. (Noir)
  const thirtiesYear = years.find((y) => y >= 1930 && y <= 1939);
  if (thirtiesYear || /lata\s+30|wielki\s+kryzys|great\s+depression|noir/i.test(sample)) {
    const y = thirtiesYear || 1933;
    return {
      era: 'noir',
      eraLabel: 'Lata 30. / Noir',
      yearRange: `${y}`,
      activeSceneYear: y,
    };
  }

  // Wykrywanie Wiktoriańskiej (Gaslight)
  const gaslightYear = years.find((y) => y >= 1880 && y <= 1905);
  if (gaslightYear || /gaslight|wiktori|victorian|krolowa\s+wiktoria|189\d/i.test(sample)) {
    const y = gaslightYear || 1895;
    return {
      era: 'gaslight',
      eraLabel: 'Wiktoriańska / Gaslight',
      yearRange: `${y}`,
      activeSceneYear: y,
    };
  }

  // Wykrywanie Modern
  const modernYear = years.find((y) => y >= 1990);
  if (modernYear || /wspolczesn|smartfon|internet|komputer|modern/i.test(sample)) {
    const y = modernYear || 2024;
    return {
      era: 'modern',
      eraLabel: y >= 1990 && y <= 1999 ? 'Lata 90.' : 'Czasy współczesne',
      yearRange: `${y}`,
      activeSceneYear: y,
    };
  }

  // Domyślnie klasyczne lata 20.
  const fallbackYear = years[0] || 1925;
  return {
    era: 'classic',
    eraLabel: 'Klasyczne lata 20.',
    yearRange: `${fallbackYear}`,
    activeSceneYear: fallbackYear,
  };
}

/**
 * Wykrywa lokację i kraj ze scenariusza
 */
export function detectLocationAndCountry(
  text: string,
  detectedLanguage: 'pl' | 'en' | 'unknown'
): { location: string; country: string } {
  const sample = text.slice(0, 60000);

  // Syberia / Rosja
  if (/syberi|siktja|jakucj|tajg/i.test(sample)) {
    return { location: 'Syberia (Siktja)', country: 'Rosja' };
  }

  // Polskie lokacje
  if (
    /warszaw|krakow|lwow|poznan|gdansk|wilno|zakopan|tatr|prabut|wroclaw|lodz|szczecin|baltyk|katowic|slask|wodzislaw|rybnik|brwinow|czestochow|walim|riese|sowi|polsce|polska/i.test(
      sample
    )
  ) {
    let loc = 'Polska';
    if (/warszaw|polonia\s+palace/i.test(sample)) loc = 'Warszawa';
    else if (/krakow|gorc|beskid/i.test(sample)) loc = 'Kraków i Gorce';
    else if (/tatr|zakopan/i.test(sample)) loc = 'Tatry i Zakopane';
    else if (/poznan|warta|fort\s+iii/i.test(sample)) loc = 'Poznań';
    else if (/brwinow/i.test(sample)) loc = 'Brwinów (pod Warszawą)';
    else if (/czestochow|sokol|jura/i.test(sample)) loc = 'Częstochowa i Sokole Góry';
    else if (/katowic|slask|wodzislaw|syryni|pszow/i.test(sample)) loc = 'Górny Śląsk (Katowice / Wodzisław)';
    else if (/walim|riese|sowi/i.test(sample)) loc = 'Dolny Śląsk (Walim / Góry Sowie)';
    else if (/prabut/i.test(sample)) loc = 'Prabuty';
    else if (/gdansk|trojmiast|sopot|gdyni|baltyk|falowiec|westerplatte/i.test(sample)) loc = 'Gdańsk i Trójmiasto';
    return { location: loc, country: 'Polska' };
  }

  // Arkham Country / USA
  if (
    /arkham|miskatonic|boston|innsmouth|kingsport|dunwich|nowy\s+jork|new\s+york|massachusetts|vermont|gloucester/i.test(
      sample
    )
  ) {
    let loc = 'Arkham / Massachusetts';
    if (/innsmouth/i.test(sample)) loc = 'Innsmouth / Massachusetts';
    else if (/kingsport/i.test(sample)) loc = 'Kingsport / Massachusetts';
    else if (/dunwich/i.test(sample)) loc = 'Dunwich / Massachusetts';
    else if (/nowy\s+jork|new\s+york/i.test(sample)) loc = 'Nowy Jork';
    else if (/boston/i.test(sample)) loc = 'Boston / Massachusetts';
    return { location: loc, country: 'USA' };
  }

  // Anglia / Wielka Brytania
  if (/londyn|london|angli|oxford|cambridge|brytani|england/i.test(sample)) {
    return { location: 'Londyn i prowincja', country: 'Wielka Brytania' };
  }

  // Egipt
  if (/kair|cairo|aleksandr|egipt|egypt|nile|nilu/i.test(sample)) {
    return { location: 'Kair i Dolina Nilu', country: 'Egipt' };
  }

  // Fallback bazowany na języku dokumentu
  if (detectedLanguage === 'pl') {
    return { location: 'Polska', country: 'Polska' };
  }

  return { location: 'Arkham / Massachusetts', country: 'USA' };
}

/**
 * Wykrywa ton i sugerowane profesje
 */
export function detectToneAndOccupations(text: string): {
  tone: 'purist' | 'pulp' | 'noir';
  themes: string[];
  suggestedOccupations: string[];
} {
  const sample = text.slice(0, 60000);

  const isPulp = /pulp\s*cthulhu|punkty\s+pulpu|talent(?:y)?\s+pulpu|archetyp\s+pulpu|dwugłow(?:y|ego)\s+węż|pulpowe\s+zasady/i.test(sample);
  const isNoir = /noir|detektyw|szpicel|mafi|gangster|korupcj|ciemne\s+zauki/i.test(sample);

  const tone: 'purist' | 'pulp' | 'noir' = isPulp ? 'pulp' : isNoir ? 'noir' : 'purist';

  const themes: string[] = ['Tajemnica', 'Śledztwo'];
  if (/okultyzm|rytua|sekta|kult/i.test(sample)) themes.push('Okultyzm');
  if (/obled|szalenstwo|psychiatr/i.test(sample)) themes.push('Szaleństwo');
  if (/nauka|profesor|uniwersytet|badania/i.test(sample)) themes.push('Badania naukowe');
  if (isPulp) themes.push('Przygoda Pulp');
  if (isNoir) themes.push('Świat Przestępczy');

  const suggestedOccupations: string[] = [
    'Prywatny detektyw',
    'Dziennikarz',
    'Profesor uniwersytetu',
    'Lekarz / Psychiatra',
  ];

  if (/policj|milicj|inspektor/i.test(sample)) {
    suggestedOccupations.unshift('Funkcjonariusz śledczy');
  }
  if (/antykwariusz|muzealnik|archeolog/i.test(sample)) {
    suggestedOccupations.unshift('Archeolog / Antykwariusz');
  }

  return {
    tone,
    themes: Array.from(new Set(themes)).slice(0, 5),
    suggestedOccupations: Array.from(new Set(suggestedOccupations)).slice(0, 5),
  };
}

/**
 * Głęboki ekstraktor metadanych scenariusza z tekstu (Clean Room BYOB):
 * - Oficjalna LEGENDA OZNACZENIA SCENARIUSZY: gwiazdki trudności 1-5 i cyfry sesji w kółkach 1-10
 * - Precyzyjna chronologia i epoka
 * - Wymogi Badaczy (wiek, sugerowane profesje, pregeny)
 * - Pomoce dla graczy (handouty) i zagadki logiczne (AdventurePuzzle)
 */
export function extractScenarioDetailedMetadata(
  textSlice: string,
  title: string,
  detectedLanguage: 'pl' | 'en' | 'unknown'
): {
  difficultyStars: number;
  difficulty: 'easy' | 'normal' | 'hard';
  estimatedSessions: string;
  yearRange: string;
  era: 'classic' | 'gaslight' | 'noir' | 'prl' | 'modern' | 'custom';
  eraLabel: string;
  activeSceneYear?: number;
  investigatorRequirements?: InvestigatorRequirements;
  puzzles?: AdventurePuzzle[];
  handouts?: AdventureHandout[];
  documentType: DocumentType;
} {
  const introSample = textSlice.slice(0, 5000);
  const broaderSample = textSlice.slice(0, 20000);

  // 1. Trudność z gwiazdek (LEGENDA OZNACZENIA SCENARIUSZY)
  // W Black Monk: Bardzo łatwy  (1), Łatwy  (2), Średni  (3), Trudny  (4), Bardzo trudny  (5)
  let difficultyStars = 3;
  let difficulty: 'easy' | 'normal' | 'hard' = 'normal';

  const starBlockMatch = introSample.match(/(?:[★*]\s*){1,5}/);
  if (starBlockMatch) {
    const starCount = (starBlockMatch[0].match(/[★*]/g) || []).length;
    if (starCount >= 1 && starCount <= 5) {
      difficultyStars = starCount;
      if (starCount <= 2) difficulty = 'easy';
      else if (starCount === 3) difficulty = 'normal';
      else difficulty = 'hard';
    }
  } else if (/bardzo\s+łatwy/i.test(introSample)) {
    difficultyStars = 1;
    difficulty = 'easy';
  } else if (/bardzo\s+trudny/i.test(introSample)) {
    difficultyStars = 5;
    difficulty = 'hard';
  } else if (/trudny/i.test(introSample)) {
    difficultyStars = 4;
    difficulty = 'hard';
  } else if (/łatwy/i.test(introSample)) {
    difficultyStars = 2;
    difficulty = 'easy';
  }

  // 2. Liczba sesji (kółka ➊-➓ lub wzmianki w tekście)
  let estimatedSessions = '2-3';
  const circleMatch = introSample.match(/([➊➋➌➍➎➏➐➑➒➓])/);
  if (circleMatch) {
    const circleMap: Record<string, string> = {
      '➊': '1', '➋': '2', '➌': '3', '➍': '4', '➎': '5',
      '➏': '6', '➐': '7', '➑': '8', '➒': '9', '➓': '10',
    };
    estimatedSessions = circleMap[circleMatch[1]] || '2-3';
  } else if (/jedno\s+spotkanie|jedn(?:ej|a)\s+sesj/i.test(introSample)) {
    estimatedSessions = '1';
  } else if (/dw(?:ie|óch)\s+sesj/i.test(introSample)) {
    estimatedSessions = '2';
  } else if (/trzech\s+sesj/i.test(introSample)) {
    estimatedSessions = '3';
  } else if (/czterech\s+sesj/i.test(introSample)) {
    estimatedSessions = '4';
  } else if (/pięciu\s+sesj/i.test(introSample)) {
    estimatedSessions = '5';
  }

  // 3. Precyzyjna chronologia (rok z tekstu)
  let yearRange = '1920s';
  let activeSceneYear: number | undefined;
  let era: 'classic' | 'gaslight' | 'noir' | 'prl' | 'modern' | 'custom' = 'classic';
  let eraLabel = 'Klasyczne lata 20.';

  const yearMatch = broaderSample.match(
    /(?:w\s+)?(18\d{2}|19\d{2}|20\d{2})\s*(?:r(?:oku|\.)|r\b)?|(?:styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień)\s+(18\d{2}|19\d{2}|20\d{2})|(?:wiosn(?:a|y|ą)|lat(?:o|a|em)|jesien(?:ią|i)|zim(?:a|y|ą))\s+(18\d{2}|19\d{2}|20\d{2})/i
  );

  const foundYear = yearMatch ? Number(yearMatch[1] || yearMatch[2] || yearMatch[3]) : null;
  if (foundYear && foundYear >= 1800 && foundYear <= 2030) {
    yearRange = String(foundYear);
    activeSceneYear = foundYear;
    if (foundYear >= 1990) {
      era = 'modern';
      eraLabel = foundYear <= 1999 ? 'Lata 90.' : 'Czasy współczesne';
    } else if (foundYear >= 1950 && foundYear < 1990) {
      era = 'prl';
      eraLabel = 'PRL';
    } else if (foundYear >= 1930 && foundYear < 1945) {
      era = 'classic';
      eraLabel = 'Lata 30.';
    } else if (foundYear >= 1918 && foundYear < 1930) {
      era = 'classic';
      eraLabel = 'Klasyczne lata 20.';
    } else if (foundYear < 1918) {
      era = 'gaslight';
      eraLabel = 'Przełom wieków';
    }
  } else {
    const baseEra = detectEraAndYears(textSlice);
    era = baseEra.era;
    eraLabel = baseEra.eraLabel;
    yearRange = baseEra.yearRange;
    activeSceneYear = baseEra.activeSceneYear;
  }

  // 4. Wymogi Badaczy (InvestigatorRequirements)
  let investigatorRequirements: InvestigatorRequirements | undefined;
  const ageMatch = broaderSample.match(/wiek[u]?\s*(?:od\s*)?(\d{1,2})\s*(?:do|-)\s*(\d{1,2})\s*lat/i);
  const minAge = ageMatch ? Number(ageMatch[1]) : undefined;
  const maxAge = ageMatch ? Number(ageMatch[2]) : undefined;

  let summary = '';
  let requiredOccupations: string[] | undefined;

  if (minAge && maxAge) {
    summary = `Młodociani badacze w wieku ${minAge}-${maxAge} lat`;
    requiredOccupations = ['Uczeń / Nastolatek', 'Młodociany sportowiec (BMX)', 'Pasjonat kina i VHS', 'Młody majsterkowicz'];
  } else if (/wydział\s*x|służb[ay]\s+bezpieczeństw|sb\b|funkcjonariusz/i.test(broaderSample)) {
    summary = 'Funkcjonariusze Wydziału X Służby Bezpieczeństwa (SB)';
    requiredOccupations = ['Funkcjonariusz SB / Milicjant', 'Specjalista ds. anomalii', 'Oficer śledczy'];
  } else if (/mineralogi|uniwersytet\s+jagiellońsk|ekspedycj/i.test(broaderSample)) {
    summary = 'Ekspedycja badawcza Uniwersytetu Jagiellońskiego';
    requiredOccupations = ['Naukowiec / Geolog', 'Student uniwersytetu', 'Badacz terenowy'];
  } else if (/filmowc|sztolni|riese|film\s+dokumentaln/i.test(broaderSample)) {
    summary = 'Ekipa filmowa (dokumentaliści)';
    requiredOccupations = ['Reżyser / Dokumentalista', 'Operator kamery', 'Dźwiękowiec'];
  }

  // Ekstrakcja pregenów (Badacz A, B, C, D)
  const pregenCharacters: PregenCharacterConcept[] = [];
  const pregenBlocks = textSlice.match(/Badacz\s+([A-D])[\s\S]{10,500}?(?=(?:Badacz\s+[A-D]|Rozdział|\n\n\n|$))/gi);
  if (pregenBlocks && pregenBlocks.length > 0) {
    pregenBlocks.forEach((block, bIdx) => {
      const charLetterMatch = block.match(/Badacz\s+([A-D])/i);
      const letter = charLetterMatch ? charLetterMatch[1].toUpperCase() : String.fromCharCode(65 + bIdx);
      const cleanDesc = block.replace(/Badacz\s+[A-D]/i, '').trim().replace(/\s+/g, ' ');
      pregenCharacters.push({
        id: `pregen-${slugifyText(title)}-${letter.toLowerCase()}`,
        name: `Badacz ${letter}`,
        occupation: letter === 'A' ? 'Mieszczanin / Podróżnik' : letter === 'B' ? 'Krewny piekarza' : letter === 'C' ? 'Arystokrata / Artysta' : 'Absolwent uniwersytetu',
        background: cleanDesc.slice(0, 300),
      });
    });
    if (!summary) {
      summary = 'Zdefiniowane archetypy Badaczy (A, B, C, D)';
    }
  }

  if (summary || minAge || pregenCharacters.length > 0) {
    investigatorRequirements = {
      minAge,
      maxAge,
      requiredOccupations,
      summary: summary || 'Dedykowani badacze powiązani ze scenariuszem',
      pregenCharacters: pregenCharacters.length > 0 ? pregenCharacters : undefined,
    };
  }

  // 5. Zagadki Logiczne
  const puzzles: AdventurePuzzle[] = [];
  if (/zagadka\s+z\s+mapą/i.test(textSlice)) {
    puzzles.push({
      id: `puz-${slugifyText(title)}-mapa`,
      title: 'Zagadka z mapą',
      description: 'Zlokalizowanie miejsca ukrycia ofiar porwań poprzez triangulację promieni od punktów zaginięć.',
      solutionSummary: 'Od każdego z 4 punktów zaginięć należy odmierzyć promień 1 km według skali. Wspólny wyznaczony obszar to las Brzózki przy granicy Brwinowa.',
      clues: ['Sklep Społem (ul. Lilpopa i Wilsona)', 'Skrzyżowanie ul. Leśnej i Sportowej', 'Skrzyżowanie ul. Borkowej i Prusa', 'Karczma przy ul. Piastowej i Kępińskiej'],
      ideaRollPrompt: 'Sukces (rzut <= INT): Badacz zauważa zbieżność odległości 1 km wokół lasu Brzózki. Porażka (Fail-forward): Gracz również odkrywa rejon Brzózek, lecz badaczy dopadają opryszkowie Kruegera (wymagany test ucieczki lub bójka).',
      handoutSlugs: ['pomoc-dla-graczy-1-mapa'],
    });
  }

  // 6. Pomoce dla graczy (Handouty)
  const handouts: AdventureHandout[] = [];
  const handoutMatches = Array.from(
    textSlice.matchAll(/(?:POMOC(?:Y)?\s+DLA\s+GRACZ[YÓW]\s*(?:#|NR\s*)?(\d+)|DODATEK\s+([A-Z0-9]+))(?::|\s*-)?\s*([^\n]+)?/gi)
  );

  handoutMatches.slice(0, 10).forEach((hm, hIdx) => {
    const num = hm[1] || hm[2] || String(hIdx + 1);
    const label = hm[3]?.trim() || `Pomoc dla graczy #${num}`;
    const slug = slugifyText(`${slugifyText(title)}-pomoc-${num}`);
    const isMap = /mapa|plan/i.test(label) || /mapa/i.test(hm[0]);
    const isReport = /raport|analiza|ekspertyza|milicj/i.test(label);
    const isLetter = /list|pami|zapiski|telegram/i.test(label);
    const handoutType = isMap ? 'map' : isReport ? 'report' : isLetter ? 'letter' : 'newspaper';

    handouts.push({
      slug,
      title: label.length > 50 ? `Pomoc #${num}` : label,
      image: `/handouts/placeholder-${handoutType}.webp`,
      handoutType,
      textContent: `Załącznik śledczy powiązany ze scenariuszem "${title}".`,
    });
  });

  // 7. Rozróżnienie scenariusz vs setting
  const isSetting =
    /tajemnice\s+wydziału\s+x,\s+czyli\s+zew\s+cthulhu\s+w\s+prl|wprowadzenie\s+do\s+realiów|przewodnik\s+po\s+mieście|opis\s+realiów/i.test(title) ||
    (!circleMatch && !starBlockMatch && /przewodnik|realia|nomenklatura|jednostka\s+sb/i.test(textSlice.slice(0, 1500)));

  const documentType: DocumentType = isSetting ? 'setting' : 'scenario';

  return {
    difficultyStars,
    difficulty,
    estimatedSessions,
    yearRange,
    era,
    eraLabel,
    activeSceneYear,
    investigatorRequirements,
    puzzles: puzzles.length > 0 ? puzzles : undefined,
    handouts: handouts.length > 0 ? handouts : undefined,
    documentType,
  };
}

/**
 * Buduje spójny graf przygody (AdventureGraph) z wyekstrahowanych jednostek overlay
 */
export function buildAdventureGraph(
  overlay: OverlayDescriptor,
  eraInfo: { eraLabel: string; yearRange: string },
  locationInfo: { location: string; country: string }
): AdventureGraph {
  const rawNpcs = overlay.entities.npcs || [];
  const rawHandouts = overlay.entities.handouts || [];
  const rawAdventures = overlay.entities.adventures || [];

  // 1. Postacie niezależne (AdventureNPC)
  const npcs: AdventureNPC[] = rawNpcs.map((n: OverlayNPC, idx: number) => ({
    id: n.id || `npc-${idx + 1}`,
    name: n.name || `Świadek ${idx + 1}`,
    description: n.role || n.description || 'Postać powiązana ze śledztwem',
    secret: n.hiddenGoal || 'Ukrywa istotny motyw lub powiązanie',
    statsSummary: n.mask || `Postać niezależna (${locationInfo.location})`,
  }));

  // Jeśli brak wykrytych NPC, stwórz postacie bazowe na podstawie klimatu
  if (npcs.length === 0) {
    npcs.push(
      {
        id: 'npc-informator',
        name: 'Główny Informator',
        description: 'Świadek pierwszych niepokojących zdarzeń wprowadzający badaczy w sprawę.',
        secret: 'Obawia się odwetu osób zaangażowanych w kult.',
        statsSummary: 'Świadek kluczowy',
      },
      {
        id: 'npc-podejrzany',
        name: 'Kluczowa Postać',
        description: 'Osoba w centrum dziwnych wydarzeń lub powiązana z miejscem zbrodni.',
        secret: 'Posiada wiedzę o mrocznych rytuałach lub ukrytych poszlakach.',
        statsSummary: 'Podejrzany / Antagonista',
      }
    );
  }

  // 2. Lokacje i Sceny (AdventureLocation)
  const locations: AdventureLocation[] = [];
  const seenLocs = new Set<string>();

  // Dodaj lokację główną
  locations.push({
    id: `loc-main`,
    name: locationInfo.location,
    description: `Główny obszar śledztwa w regionie ${locationInfo.country} (${eraInfo.eraLabel}).`,
    atmosphere: 'Mglista, posępna atmosfera niepokoju i mrocznych tajemnic.',
  });
  seenLocs.add(locationInfo.location.toLowerCase());

  // Zbieraj węzły scenariuszy
  for (const adv of rawAdventures) {
    const nodes: OverlayAdventureNode[] = [
      ...(adv.nodes || []),
      ...(adv.subAdventures?.flatMap((s) => s.nodes || []) || []),
    ];

    for (const node of nodes) {
      if (!seenLocs.has(node.title.toLowerCase())) {
        seenLocs.add(node.title.toLowerCase());
        locations.push({
          id: node.id,
          name: node.title,
          description: node.description || 'Węzeł dochodzenia śledczego.',
          atmosphere: 'Ślady obecności nieznanych sił i narastające napięcie.',
        });
      }
    }
  }

  // 3. Poszlaki i Dowody (AdventureClue)
  const clues: AdventureClue[] = rawHandouts.map((h: OverlayHandout, idx: number) => ({
    id: h.id || `clue-${idx + 1}`,
    name: h.title || `Poszlaka ${idx + 1}`,
    description: h.content || 'Dokument lub rekwizyt wymagający zbadania.',
    isRedHerring: false,
  }));

  if (clues.length === 0) {
    clues.push(
      {
        id: 'clue-wstepny-trop',
        name: 'Wstępny Trop / List Zlecający',
        description: 'Początkowy dokument wprowadzający badaczy w sprawę.',
        isRedHerring: false,
      },
      {
        id: 'clue-dziennik-zapisków',
        name: 'Tajemnicze Notatki',
        description: 'Fragmenty zapisków wskazujące na powiązania z lokalną anomalią.',
        isRedHerring: false,
      }
    );
  }

  // 4. Relacje w grafie (GraphConnection)
  const connections: GraphConnection[] = [];

  // Połącz NPC z lokacją główną i poszlakami
  npcs.forEach((npc, i) => {
    const targetLoc = locations[i % locations.length] || locations[0];
    connections.push({
      fromId: npc.id,
      toId: targetLoc.id,
      description: 'Często widywany w tym miejscu lub posiada tam swoje biuro/mieszkanie.',
    });

    if (clues[i]) {
      connections.push({
        fromId: npc.id,
        toId: clues[i].id,
        description: 'Powiązany z powstaniem lub odnalezieniem tej poszlaki.',
      });
    }
  });

  return {
    npcs,
    locations,
    clues,
    connections,
  };
}

/**
 * Ekstrahuje poszczególne scenariusze z tomu antologii na podstawie spisu treści i nagłówków rozdziałów.
 */
const GENERIC_FINGERPRINT_TITLES = new Set([
  'Nieznany dokument',
  'Nierozpoznany dokument PDF',
  'Unrecognized PDF Document',
  'Scenariusz Jednorazowy d100 (One-Shot Adventure)',
  'd100 One-Shot Scenario',
  'Wielka Kampania d100 (Epic Campaign)',
  'd100 Epic Mega-Campaign',
  'Antologia Scenariuszy d100 (Scenario Anthology)',
  'd100 Scenario Anthology',
  'Rozszerzenie Settingowe / Epoka d100 (Setting Expansion)',
  'd100 Era & Setting Expansion',
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatScenarioTitle(rawTitle: string): string {
  return rawTitle
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export function parseScenariosFromAnthologyText(
  pdfText: string,
  _fileName?: string
): Array<{ num: string; title: string; rawTitle: string; textSlice: string }> {
  void _fileName;
  // Podział na strony (gdy brak podziału stron z pdf-parse, bierzemy pierwsze 25000 znaków obejmujące pełny spis treści)
  const pages = pdfText.split(/<!--\s*Strona\s*\d+\s*-->|\f/);
  let tocText = '';

  if (pages.length > 1) {
    for (let p = 0; p < Math.min(pages.length, 8); p++) {
      if (/spis\s+tre[sś]ci|table\s+of\s+contents/i.test(pages[p])) {
        tocText = pages[p];
        if (p + 1 < pages.length && !/rozdzia[lł]\s+1\b/i.test(pages[p + 1])) {
          tocText += '\n' + pages[p + 1];
        }
        break;
      }
    }
    if (!tocText) {
      tocText = pages.slice(0, 6).join('\n');
    }
  } else {
    tocText = pdfText.slice(0, 25000);
  }

  const lines = tocText.split('\n').map((l) => l.trim()).filter(Boolean);
  const scenariosMeta: Array<{ num: string; title: string; rawTitle: string }> = [];
  const seenNumbers = new Set<string>();

  const isIgnoredTitle = (t: string) =>
    /wstęp|wstep|przedmowa|wprowadzenie|dodatki|dodatek|karty badaczy|gotowi badacze|zasady|indeks|o autorach|statystyki|pomocnicze|tabele|legenda oznaczenia|autorstwo|twórcy|twórczynie|edycja polska|edycja angielska|nota autorska|podziękowania/i.test(
      t
    );

  // Wzorzec A: ROZDZIAŁ X \n TYTUŁ (np. Horror nad Wartą, Cienie Tatr, Usłysz Zew Cthulhu)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const chMatch = line.match(/^(?:ROZDZIAŁ|SCENARIUSZ|CHAPTER|SCENARIO)\s*(\d+|[IVXLCDM]+)$/i);
    if (chMatch && i + 1 < lines.length) {
      const num = chMatch[1];
      if (seenNumbers.has(num)) continue;

      const nextLine = lines[i + 1];
      const titleClean = nextLine.replace(/\s+\d+$/, '').replace(/[\.·…]+$/, '').trim();

      if (
        titleClean &&
        titleClean.length >= 3 &&
        titleClean.length <= 60 &&
        !titleClean.endsWith('-') &&
        !/^[a-z]/.test(titleClean) &&
        !isIgnoredTitle(titleClean)
      ) {
        seenNumbers.add(num);
        scenariosMeta.push({
          num,
          title: formatScenarioTitle(titleClean),
          rawTitle: titleClean,
        });
      }
    }
  }

  // Wzorzec A2: Samodzielne nagłówki wielkimi literami w spisie treści poprzedzające podsekcje z wykropkowaniem (np. PISK, WIZG / ODŁAMEK)
  if (scenariosMeta.length < 2) {
    seenNumbers.clear();
    scenariosMeta.length = 0;
    let idx = 1;
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      const isUppercaseHeading =
        line.length >= 3 &&
        line.length <= 50 &&
        !/\d/.test(line) &&
        !/[\.·…]{2,}/.test(line) &&
        line === line.toUpperCase() &&
        /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(line);
      const isFollowedBySubitem = /^(?:Przygotowanie do gry|Przedmowa|Wstęp|Dramatis Personae|Zawiązanie akcji|Wprowadzenie)\b.*[\.·…]{2,}\s*\d+$/i.test(
        nextLine
      );
      if (isUppercaseHeading && isFollowedBySubitem && !isIgnoredTitle(line)) {
        scenariosMeta.push({
          num: String(idx++),
          title: formatScenarioTitle(line),
          rawTitle: line,
        });
      }
    }
  }

  // Wzorzec B: Linijka spisu treści z wykropkowaniem: TYTUŁ ... STRONA (gdy dokument zawiera jawny nagłówek Spis treści)
  const hasExplicitTocHeader = lines.some((l) => /^(?:spis\s+tre[sś]ci|table\s+of\s+contents)$/i.test(l));
  if (scenariosMeta.length < 2 && hasExplicitTocHeader) {
    seenNumbers.clear();
    scenariosMeta.length = 0;
    let idx = 1;
    for (const line of lines) {
      const m = line.match(/^(.*?)(?:[\.·…\s]{2,}|\s+)(\d+)$/);
      if (m) {
        const titleClean = m[1].replace(/[\.·…]+$/, '').trim();
        if (
          titleClean &&
          titleClean.length >= 3 &&
          titleClean.length <= 60 &&
          !isIgnoredTitle(titleClean) &&
          !/spis\s+tre/i.test(titleClean)
        ) {
          scenariosMeta.push({
            num: String(idx++),
            title: formatScenarioTitle(titleClean),
            rawTitle: titleClean,
          });
        }
      }
    }
  }

  if (scenariosMeta.length < 2) return [];

  // Szukamy pozycji rozdziałów w pełnym tekście (omijamy pierwsze 8% lub 25000 znaków na spis treści)
  const bodyTextStartIndex = Math.min(25000, Math.floor(pdfText.length * 0.08));
  const bodyText = pdfText.slice(bodyTextStartIndex);

  const scenarioPositions: Array<{ num: string; title: string; rawTitle: string; pos: number }> = [];
  for (const s of scenariosMeta) {
    const escapedNum = escapeRegExp(s.num);
    const escapedTitle = escapeRegExp(s.rawTitle).replace(/\s+/g, '\\s+');
    const pattern = new RegExp(`(?:ROZDZIAŁ\\s*${escapedNum}[\\s\\S]{0,30})?${escapedTitle}`, 'i');
    const match = bodyText.match(pattern);
    const pos = match && typeof match.index === 'number' ? match.index : bodyText.indexOf(s.rawTitle);
    scenarioPositions.push({
      ...s,
      pos: pos !== -1 ? bodyTextStartIndex + pos : -1,
    });
  }

  scenarioPositions.sort((a, b) => (a.pos !== -1 ? a.pos : 0) - (b.pos !== -1 ? b.pos : 0));

  const result: Array<{ num: string; title: string; rawTitle: string; textSlice: string }> = [];
  for (let i = 0; i < scenarioPositions.length; i++) {
    const s = scenarioPositions[i];
    const startIdx = s.pos !== -1 ? s.pos : 0;
    const endIdx =
      i + 1 < scenarioPositions.length && scenarioPositions[i + 1].pos !== -1
        ? scenarioPositions[i + 1].pos
        : pdfText.length;

    const slice = pdfText.slice(startIdx, endIdx);
    result.push({
      num: s.num,
      title: s.title,
      rawTitle: s.rawTitle,
      textSlice: slice,
    });
  }

  return result;
}

/**
 * Buduje listę obiektów CustomAdventure w 100% lokalnie (z dekompozycją antologii i obsługą lorebooków).
 */
export function buildLocalCustomAdventures(
  pdfText: string,
  fingerprint: RulebookFingerprintResult,
  overlay: OverlayDescriptor,
  fileName: string,
  pdfPagesCount: number,
  existingAdventureId?: string
): CustomAdventure[] {
  const cleanFileName = fileName.toLowerCase();
  const cleanedFileBaseTitle = fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
  const fileSlug = slugifyText(cleanedFileBaseTitle || fingerprint.title || 'custom');
  const hasSpecificFingerprintTitle =
    Boolean(fingerprint.title) && !GENERIC_FINGERPRINT_TITLES.has(fingerprint.title);

  // 1. Antologia z wieloma scenariuszami
  const isAnthology =
    fingerprint.profile === 'scenario_anthology' ||
    cleanFileName.includes('antologia') ||
    (cleanFileName.includes('cienie') && cleanFileName.includes('tatr')) ||
    (cleanFileName.includes('horror') && cleanFileName.includes('warta'));

  if (isAnthology) {
    const detectedScenarios = parseScenariosFromAnthologyText(pdfText, fileName);
    if (detectedScenarios.length >= 2) {
      const sourceTitle =
        cleanFileName.includes('horror') && cleanFileName.includes('warta')
          ? 'Horror nad Wartą'
          : cleanFileName.includes('cienie') && cleanFileName.includes('tatr')
            ? 'Cienie Tatr'
            : hasSpecificFingerprintTitle
              ? fingerprint.title
              : cleanedFileBaseTitle || fingerprint.title;

      return detectedScenarios.map((scen, idx) => {
        const id =
          existingAdventureId && idx === 0
            ? existingAdventureId
            : `custom-${fileSlug}-${idx + 1}-${slugifyText(scen.title)}`;

        const meta = extractScenarioDetailedMetadata(scen.textSlice, scen.title, fingerprint.detectedLanguage);
        const locationInfo = detectLocationAndCountry(scen.textSlice, fingerprint.detectedLanguage);
        const toneInfo = detectToneAndOccupations(scen.textSlice);
        const graph = buildAdventureGraph(overlay, { eraLabel: meta.eraLabel, yearRange: meta.yearRange }, locationInfo);

        // Ekstrakcja otwierającego akapitu scenariusza
        const paragraphs = scen.textSlice
          .split('\n\n')
          .map((p) => p.trim())
          .filter(
            (p) =>
              p.length > 50 &&
              !/jakub orłowski|rozdział|spis treści|autorzy:|redakcja:/i.test(p) &&
              !p.startsWith('<!--')
          );
        const dramaticOpening = paragraphs[0]?.replace(/\s+/g, ' ').slice(0, 240);
        const hook = dramaticOpening
          ? `${dramaticOpening}...`
          : `Śledztwo w regionie ${locationInfo.location} (${meta.eraLabel}). Wątki tajemniczych zdarzeń czekają na zbadanie przez Badaczy.`;

        const description = `Scenariusz "${scen.title}" z antologii "${sourceTitle}". Miejsce akcji: ${locationInfo.location}, czas: ${meta.eraLabel} (${meta.yearRange}).`;

        return {
          id,
          title: scen.title,
          era: meta.era,
          eraLabel: meta.eraLabel,
          yearRange: meta.yearRange,
          activeSceneYear: meta.activeSceneYear,
          location: locationInfo.location,
          country: locationInfo.country,
          tone: toneInfo.tone,
          themes: toneInfo.themes,
          suggestedOccupations: meta.investigatorRequirements?.requiredOccupations || toneInfo.suggestedOccupations,
          suggestedArchetypes: ['investigator', 'scholar', 'action', 'mystic'],
          hook,
          description,
          estimatedSessions: meta.estimatedSessions,
          playerCount: '1-4',
          difficulty: meta.difficulty,
          difficultyStars: meta.difficultyStars,
          investigatorRequirements: meta.investigatorRequirements,
          puzzles: meta.puzzles,
          handouts: meta.handouts,
          isCustom: true,
          pdfUrl: '',
          geminiFileUri: '',
          fileName,
          uploadedAt: new Date().toISOString(),
          isAnalyzed: true,
          documentType: meta.documentType,
          isCampaign: false,
          graph,
          source: sourceTitle,
          sourceCategory: 'anthology',
          sourceBookId: slugifyText(sourceTitle),
          attachedLorebookIds: [],
        };
      });
    }
  }

  // 2. Starter d100 z wbudowaną przygodą
  if (fingerprint.profile === 'starter-d100' || cleanFileName.includes('starter')) {
    const id = existingAdventureId || `custom-${fileSlug}-starter-scenariusz`;
    const isHaunting = /nawiedzony\s+dom|haunting|corbitt/i.test(pdfText);
    const scenTitle = isHaunting ? 'Nawiedzony dom' : 'Przygoda ze Startera d100';
    const eraInfo: { era: 'classic'; eraLabel: string; yearRange: string; activeSceneYear: number } = {
      era: 'classic',
      eraLabel: 'Klasyczne lata 20.',
      yearRange: '1924',
      activeSceneYear: 1924,
    };
    const locationInfo = { location: 'Boston / Massachusetts', country: 'USA' };
    const toneInfo = detectToneAndOccupations(pdfText);
    const graph = buildAdventureGraph(overlay, eraInfo, locationInfo);

    const hook = isHaunting
      ? 'Pan Knott wynajmuje Badaczy do zbadania starej posiadłości Corbitta w Bostonie, w której poprzedni lokatorzy popadli w obłęd lub zginęli w niewyjaśnionych okolicznościach.'
      : 'Wprowadzający scenariusz śledczy dla początkujących Badaczy, badających niepokojące zdarzenia powiązane z Mitami Cthulhu.';

    const description = `Scenariusz wprowadzający wyekstrahowany ze Startera d100. Klasyczne śledztwo w Bostonie w realiach lat 20. XX wieku.`;

    return [
      {
        id,
        title: scenTitle,
        era: eraInfo.era,
        eraLabel: eraInfo.eraLabel,
        yearRange: eraInfo.yearRange,
        activeSceneYear: eraInfo.activeSceneYear,
        location: locationInfo.location,
        country: locationInfo.country,
        tone: toneInfo.tone,
        themes: toneInfo.themes,
        suggestedOccupations: toneInfo.suggestedOccupations,
        suggestedArchetypes: ['investigator', 'scholar', 'action'],
        hook,
        description,
        estimatedSessions: '1-2',
        playerCount: '1-4',
        difficulty: 'easy',
        isCustom: true,
        pdfUrl: '',
        geminiFileUri: '',
        fileName,
        uploadedAt: new Date().toISOString(),
        isAnalyzed: true,
        documentType: 'scenario',
        isCampaign: false,
        graph,
        source: 'Starter d100',
        sourceCategory: 'starter',
        sourceBookId: 'starter-d100',
        recommendedForBeginners: true,
        attachedLorebookIds: [],
      },
    ];
  }

  // 2b. Księga Strażnika (core-d100) z wbudowanymi scenariuszami ("Wśród prastarych drzew" / "Pośród pradawnych drzew" oraz "Szkarłatne litery" / "Crimson Letters")
  if (fingerprint.profile === 'core-d100') {
    const isEn = fingerprint.detectedLanguage === 'en';
    const coreSourceLabel = isEn ? 'Keeper Rulebook' : 'Księga Strażnika';
    const coreAdventures: CustomAdventure[] = [];

    const hasAncientTrees =
      /po[sś]r[oó]d\s+pradawnych\s+drzew|w[sś]r[oó]d\s+prastarych\s+drzew|w[sś]r[oó]d\s+pradawnych\s+drzew|po[sś]r[oó]d\s+prastarych\s+drzew|amidst\s+the\s+ancient\s+trees/i.test(
        pdfText
      );
    const hasCrimsonLetters =
      /szkar[lł]atne\s+litery|karmazynowe\s+litery|crimson\s+letters/i.test(pdfText);

    if (hasAncientTrees) {
      const treesTitle = /w[sś]r[oó]d\s+prastarych\s+drzew/i.test(pdfText)
        ? 'Wśród prastarych drzew'
        : /po[sś]r[oó]d\s+pradawnych\s+drzew/i.test(pdfText)
          ? 'Pośród pradawnych drzew'
          : /w[sś]r[oó]d\s+pradawnych\s+drzew/i.test(pdfText)
            ? 'Wśród pradawnych drzew'
            : /po[sś]r[oó]d\s+prastarych\s+drzew/i.test(pdfText)
              ? 'Pośród prastarych drzew'
              : 'Amidst the Ancient Trees';

      const id =
        existingAdventureId && coreAdventures.length === 0
          ? existingAdventureId
          : `custom-${fileSlug}-core-${slugifyText(treesTitle)}`;
      const eraInfo: { era: 'classic'; eraLabel: string; yearRange: string; activeSceneYear: number } = {
        era: 'classic',
        eraLabel: isEn ? 'Classic 1920s' : 'Klasyczne lata 20.',
        yearRange: '1925',
        activeSceneYear: 1925,
      };
      const locationInfo = {
        location: isEn
          ? 'Bennington / Green Mountain, Vermont'
          : 'Bennington / Las Green Mountain (Vermont)',
        country: 'USA',
      };
      const graph = buildAdventureGraph(overlay, eraInfo, locationInfo);

      coreAdventures.push({
        id,
        title: treesTitle,
        era: eraInfo.era,
        eraLabel: eraInfo.eraLabel,
        yearRange: eraInfo.yearRange,
        activeSceneYear: eraInfo.activeSceneYear,
        location: locationInfo.location,
        country: locationInfo.country,
        tone: 'purist',
        themes: ['Porwanie i pościg', 'Las i dzicz', 'Senne Wezwania', 'Gla’aki'],
        suggestedOccupations: [
          'Prywatny detektyw',
          'Traper / Myśliwy',
          'Lekarz',
          'Dziennikarz',
          'Policjant',
        ],
        suggestedArchetypes: ['investigator', 'action', 'scholar'],
        hook: isEn
          ? 'The daughter of local industrialist Lucas Strong has been kidnapped, and the ransom drop ended in a shootout on the edge of Green Mountain National Forest. The investigators join the search posse in the woods, unaware of an ancient horror stirring by the lake.'
          : 'Córka miejscowego przemysłowca Lucasa Stronga została porwana, a przekazanie okupu zakończyło się strzelaniną na obrzeżach Lasu Narodowego Green Mountain. Badacze dołączają do grupy pościgowej w gęstwinie, nie wiedząc, że w głębi puszczy budzi się prastara groza.',
        description: isEn
          ? 'Classic Keeper Rulebook scenario set in the summer of 1925 in the forests of Vermont, combining a wilderness manhunt with the cosmic terror of Gla’aki.'
          : `Scenariusz "${treesTitle}" wyodrębniony z podręcznika ${coreSourceLabel}. Leśna obława w stanie Vermont (czerwiec 1925 r.), która przeradza się w konfrontację ze sługami Wielkiego Przedwiecznego Gla’akiego.`,
        estimatedSessions: '1-2',
        playerCount: '2-5',
        difficulty: 'normal',
        difficultyStars: 3,
        isCustom: true,
        pdfUrl: '',
        geminiFileUri: '',
        fileName,
        uploadedAt: new Date().toISOString(),
        isAnalyzed: true,
        documentType: 'scenario',
        isCampaign: false,
        graph,
        source: coreSourceLabel,
        sourceCategory: 'core',
        sourceBookId: 'core-d100',
        recommendedForBeginners: true,
        attachedLorebookIds: [],
      });
    }

    if (hasCrimsonLetters) {
      const crimsonTitle = /szkar[lł]atne\s+litery/i.test(pdfText)
        ? 'Szkarłatne litery'
        : /karmazynowe\s+litery/i.test(pdfText)
          ? 'Karmazynowe litery'
          : 'Crimson Letters';

      const id =
        existingAdventureId && coreAdventures.length === 0
          ? existingAdventureId
          : `custom-${fileSlug}-core-${slugifyText(crimsonTitle)}`;
      const eraInfo: { era: 'classic'; eraLabel: string; yearRange: string; activeSceneYear: number } = {
        era: 'classic',
        eraLabel: isEn ? 'Classic 1920s' : 'Klasyczne lata 20.',
        yearRange: '1925',
        activeSceneYear: 1925,
      };
      const locationInfo = {
        location: isEn ? 'Arkham / Miskatonic University' : 'Arkham / Uniwersytet Miskatonic',
        country: 'USA',
      };
      const graph = buildAdventureGraph(overlay, eraInfo, locationInfo);

      coreAdventures.push({
        id,
        title: crimsonTitle,
        era: eraInfo.era,
        eraLabel: eraInfo.eraLabel,
        yearRange: eraInfo.yearRange,
        activeSceneYear: eraInfo.activeSceneYear,
        location: locationInfo.location,
        country: locationInfo.country,
        tone: 'purist',
        themes: [
          'Śledztwo akademickie',
          'Procesy czarownic',
          'Przeklęte manuskrypty',
          'Piaskownica śledcza',
        ],
        suggestedOccupations: [
          'Profesor uniwersytetu',
          'Antykwariusz',
          'Prywatny detektyw',
          'Dziennikarz',
          'Okultysta',
        ],
        suggestedArchetypes: ['scholar', 'investigator', 'mystic'],
        hook: isEn
          ? 'The sudden, inexplicable death of Professor Charles Leiter at Miskatonic University and the theft of priceless Arkham witch-trial papers. Dean Bryce Fallon hires the investigators to discreetly recover the cursed documents before scandal erupts or the Horror in Ink is unleashed.'
          : 'Nagła i niewytłumaczalna śmierć profesora Charlesa Leitera na Uniwersytecie Miskatonic oraz zaginięcie bezcennych akt z procesów czarownic w Arkham. Prorektor Bryce Fallon wynajmuje Badaczy do dyskretnego odnalezienia przeklętych dokumentów, zanim wybuchnie skandal lub uwolniony zostanie Koszmar z Atramentu.',
        description: isEn
          ? 'Non-linear sandbox investigative scenario from the Keeper Rulebook, set in Arkham around Miskatonic University in autumn 1925.'
          : `Scenariusz śledczy typu piaskownica (sandbox) "${crimsonTitle}" wyodrębniony z podręcznika ${coreSourceLabel}. Akcja toczy się w Arkham wokół Uniwersytetu Miskatonic jesienią 1925 roku.`,
        estimatedSessions: '2-3',
        playerCount: '2-5',
        difficulty: 'normal',
        difficultyStars: 3,
        isCustom: true,
        pdfUrl: '',
        geminiFileUri: '',
        fileName,
        uploadedAt: new Date().toISOString(),
        isAnalyzed: true,
        documentType: 'scenario',
        isCampaign: false,
        graph,
        source: coreSourceLabel,
        sourceCategory: 'core',
        sourceBookId: 'core-d100',
        attachedLorebookIds: [],
      });
    }

    return coreAdventures;
  }

  // 2c. Pulp Cthulhu (pulp-d100) z 4 wbudowanymi scenariuszami (Rozdziały 10-13)
  if (fingerprint.profile === 'pulp-d100') {
    const isEn = fingerprint.detectedLanguage === 'en';
    const pulpSourceLabel = 'Pulp Cthulhu';
    const pulpSpecs: Array<{
      pattern: RegExp;
      plPattern: RegExp;
      plTitle: string;
      enTitle: string;
      slug: string;
      year: number;
      locationPl: string;
      locationEn: string;
      country: string;
      sessions: string;
      recommended?: boolean;
      themes: string[];
      occupations: string[];
      hookPl: string;
      hookEn: string;
      descPl: string;
      descEn: string;
    }> = [
      {
        pattern: /\bthe\s+disintegrator\b|\bdezintegrator\b/i,
        plPattern: /\bdezintegrator\b/i,
        plTitle: 'Dezintegrator',
        enTitle: 'The Disintegrator',
        slug: 'the-disintegrator',
        year: 1935,
        locationPl: 'Nowa Anglia (Odległy hotel)',
        locationEn: 'New England (Secluded Hotel)',
        country: 'USA',
        sessions: '1-2',
        recommended: true,
        themes: ['Szalona nauka (Weird Science)', 'Tajna aukcja', 'Przygoda Pulp', 'Intryga'],
        occupations: [
          'Naukowiec / Wynalazca',
          'Prywatny detektyw',
          'Dziennikarz śledczy',
          'Agent federalny',
          'Awanturnik',
        ],
        hookPl:
          'Zamożny zleceniodawca wynajmuje bohaterów, aby zinfiltrowali prywatną aukcję w odosobnionym hotelu i przejęli niezwykłe urządzenie szalonej nauki znane jako „dezintegrator”.',
        hookEn:
          'A wealthy scientist hires the heroes to gatecrash a private auction at a secluded hotel and acquire a weird-science device known as a “disintegrator.”',
        descPl:
          'Scenariusz z podręcznika Pulp Cthulhu (Rozdział 10) łączący tajną aukcję, szaloną naukę i wartką akcję w realiach lat 30.',
        descEn:
          'Pulp Cthulhu scenario (Chapter 10) blending a covert auction, weird science, and two-fisted action in the 1930s.',
      },
      {
        pattern: /waiting\s+for\s+the\s+hurricane|czekaj[aą]c\s+na\s+huragan/i,
        plPattern: /czekaj[aą]c\s+na\s+huragan/i,
        plTitle: 'Czekając na huragan',
        enTitle: 'Waiting for the Hurricane',
        slug: 'waiting-for-the-hurricane',
        year: 1935,
        locationPl: 'Florida Keys (Key West)',
        locationEn: 'Florida Keys (Key West)',
        country: 'USA',
        sessions: '1-2',
        recommended: true,
        themes: ['Huragan w tropikach', 'Kult Mitów', 'Przygoda Pulp', 'Walka o przetrwanie'],
        occupations: [
          'Pilot / Marynarz',
          'Prywatny detektyw',
          'Reporter',
          'Przemytnik',
          'Awanturnik',
        ],
        hookPl:
          'Uwięzieni na wyspie archipelagu Florida Keys podczas niszczycielskiego huraganu z 1935 roku, bohaterowie muszą przetrwać żywioł i pokrzyżować plany złowrogiego kultu wykorzystującego burzę jako zasłonę dymną.',
        hookEn:
          'Stranded on an island in the Florida Keys, the heroes must ride a hurricane to safety and uproot the sinister plans of a cult seeking to use the weather as a cover for their dark deeds.',
        descPl:
          'Dynamiczny scenariusz z podręcznika Pulp Cthulhu (Rozdział 11) osadzony na Florydzie w trakcie historycznego huraganu z 1935 roku.',
        descEn:
          'High-octane Pulp Cthulhu scenario (Chapter 11) set in the Florida Keys during the historic 1935 hurricane.',
      },
      {
        pattern: /pandora['’]?s\s+box|puszka\s+pandory/i,
        plPattern: /puszka\s+pandory/i,
        plTitle: 'Puszka Pandory',
        enTitle: "Pandora's Box",
        slug: 'pandoras-box',
        year: 1935,
        locationPl: 'San Francisco / Kalifornia',
        locationEn: 'San Francisco / California',
        country: 'USA',
        sessions: '1-2',
        themes: ['Nocny klub i gangsterzy', 'Przeklęty artefakt', 'Przygoda Pulp', 'Noir'],
        occupations: [
          'Prywatny detektyw',
          'Artysta estradowy',
          'Dziennikarz',
          'Archeolog / Antykwariusz',
          'Gangster',
        ],
        hookPl:
          'Legendarny artefakt znany jako „Puszka Pandory” zostaje wystawiony w nocnym klubie jako chwyt reklamowy, lecz każdego, kto się do niego zbliży, prześladuje złowrogie, nadprzyrodzone fatum.',
        hookEn:
          'The fabled artifact “Pandora’s Box” is now housed in a local nightclub as a publicity stunt, but otherworldly bad luck seems to follow all those who chance upon it.',
        descPl:
          'Miejski scenariusz z podręcznika Pulp Cthulhu (Rozdział 12) pełen gangsterów, nocnych klubów i starożytnej klątwy w realiach lat 30.',
        descEn:
          'Urban Pulp Cthulhu scenario (Chapter 12) featuring gangsters, nightclubs, and an ancient curse in the 1930s.',
      },
      {
        pattern: /slow\s+boat\s+to\s+china|wolny\s+statek\s+do\s+chin/i,
        plPattern: /wolny\s+statek\s+do\s+chin/i,
        plTitle: 'Wolny statek do Chin',
        enTitle: 'Slow Boat to China',
        slug: 'slow-boat-to-china',
        year: 1936,
        locationPl: 'Pacyfik (rejs San Francisco - Szanghaj)',
        locationEn: 'Pacific Ocean (San Francisco to Shanghai)',
        country: 'USA',
        sessions: '2-3',
        themes: ['Rejs transoceaniczny', 'Złowrogi spisek', 'Przygoda Pulp', 'Daleki Wschód'],
        occupations: [
          'Awanturnik / Podróżnik',
          'Dziennikarz',
          'Dyplomata',
          'Lekarz okrętowy',
          'Detektyw',
        ],
        hookPl:
          'Rejs z San Francisco do Szanghaju na pokładzie transatlantyku zapowiada się jako zasłużony wypoczynek, jednak siły pragnące zawładnąć mocami spoza naszego świata zamieniają podróż w walkę o przetrwanie.',
        hookEn:
          'A voyage from San Francisco to Shanghai promises rest and relaxation, but an evil intent on controlling powers from beyond ensures this trip will be anything but restful.',
        descPl:
          'Pełen rozmachu scenariusz z podręcznika Pulp Cthulhu (Rozdział 13) rozgrywający się podczas rejsu przez Pacyfik z San Francisco do Szanghaju.',
        descEn:
          'Globe-trotting Pulp Cthulhu scenario (Chapter 13) set aboard a trans-Pacific liner sailing from San Francisco to Shanghai.',
      },
    ];

    const pulpAdventures: CustomAdventure[] = [];
    for (const spec of pulpSpecs) {
      if (!spec.pattern.test(pdfText)) continue;

      const resolvedTitle = spec.plPattern.test(pdfText) ? spec.plTitle : spec.enTitle;
      const id =
        existingAdventureId && pulpAdventures.length === 0
          ? existingAdventureId
          : `custom-${fileSlug}-pulp-${spec.slug}`;
      const eraInfo: { era: 'noir'; eraLabel: string; yearRange: string; activeSceneYear: number } = {
        era: 'noir',
        eraLabel: isEn ? '1930s / Pulp Era' : 'Lata 30. / Pulp',
        yearRange: String(spec.year),
        activeSceneYear: spec.year,
      };
      const locationInfo = {
        location: isEn ? spec.locationEn : spec.locationPl,
        country: spec.country,
      };
      const graph = buildAdventureGraph(overlay, eraInfo, locationInfo);

      pulpAdventures.push({
        id,
        title: resolvedTitle,
        era: eraInfo.era,
        eraLabel: eraInfo.eraLabel,
        yearRange: eraInfo.yearRange,
        activeSceneYear: eraInfo.activeSceneYear,
        location: locationInfo.location,
        country: locationInfo.country,
        tone: 'pulp',
        themes: spec.themes,
        suggestedOccupations: spec.occupations,
        suggestedArchetypes: ['action', 'investigator', 'scholar', 'mystic'],
        hook: isEn ? spec.hookEn : spec.hookPl,
        description: isEn ? spec.descEn : spec.descPl,
        estimatedSessions: spec.sessions,
        playerCount: '2-5',
        difficulty: 'normal',
        difficultyStars: 3,
        isCustom: true,
        pdfUrl: '',
        geminiFileUri: '',
        fileName,
        uploadedAt: new Date().toISOString(),
        isAnalyzed: true,
        documentType: 'scenario',
        isCampaign: false,
        graph,
        source: pulpSourceLabel,
        sourceCategory: 'core',
        sourceBookId: 'pulp-d100',
        ...(spec.recommended ? { recommendedForBeginners: true } : {}),
        attachedLorebookIds: [],
      });
    }

    return pulpAdventures;
  }

  // 2d. Pozostałe podręczniki czysto mechaniczne (Podręcznik Badacza, własny system d100) bez wbudowanych scenariuszy
  if (
    fingerprint.profile === 'investigator_handbook' ||
    fingerprint.profile === 'custom-d100'
  ) {
    return [];
  }

  // 3. Grymuar, Bestiariusz lub Rozszerzenie Settingowe (Lorebook / Compendium)
  if (
    fingerprint.profile === 'grimoire' ||
    fingerprint.profile === 'bestiary' ||
    fingerprint.profile === 'setting_expansion'
  ) {
    const docType: DocumentType =
      fingerprint.profile === 'setting_expansion' ? 'setting' : 'compendium';
    const compendiumTitle = hasSpecificFingerprintTitle
      ? fingerprint.title
      : cleanedFileBaseTitle || fingerprint.title;
    const id = existingAdventureId || `custom-${fileSlug}-${slugifyText(compendiumTitle || fileName)}`;
    const eraInfo = detectEraAndYears(pdfText);
    const locationInfo = detectLocationAndCountry(pdfText, fingerprint.detectedLanguage);
    const toneInfo = detectToneAndOccupations(pdfText);

    let hook = '';
    let description = '';

    if (fingerprint.profile === 'grimoire') {
      hook = 'Oficjalny grymuar wiedzy tajemnej zawierający zaklęcia, rytuały, koszty Poczytalności oraz reguły głębokiej magii dla Mistrza Gry.';
      description = `Księga wiedzy magicznej wyekstrahowana z pliku "${fileName}". Służy jako referencyjny zbiór zaklęć i formuł dla Mistrza Gry.`;
    } else if (fingerprint.profile === 'bestiary') {
      hook = 'Kompendium plugawych istot, potworów i bóstw Mitów Cthulhu wraz z profilami bojowymi, modyfikatorami poczytalności i cechami dla Mistrza Gry.';
      description = `Bestiariusz wyekstrahowany z pliku "${fileName}". Służy jako kompendium istot i monstualnych zagrożeń dla Mistrza Gry.`;
    } else {
      hook = `Przewodnik regionalny i tło historyczne rozszerzające świat gry o nowe lokacje (${locationInfo.location}) i realia epoki.`;
      description = `Suplement settingowy wyekstrahowany z pliku "${fileName}". Wzbogaca świat gry i realia historyczne.`;
    }

    return [
      {
        id,
        title: compendiumTitle,
        era: eraInfo.era,
        eraLabel: eraInfo.eraLabel,
        yearRange: eraInfo.yearRange,
        activeSceneYear: eraInfo.activeSceneYear,
        location: locationInfo.location,
        country: locationInfo.country,
        tone: toneInfo.tone,
        themes: toneInfo.themes,
        suggestedOccupations: toneInfo.suggestedOccupations,
        suggestedArchetypes: ['scholar', 'mystic', 'investigator'],
        hook,
        description,
        estimatedSessions: '-',
        playerCount: '1-4',
        difficulty: 'normal',
        isCustom: true,
        pdfUrl: '',
        geminiFileUri: '',
        fileName,
        uploadedAt: new Date().toISOString(),
        isAnalyzed: true,
        documentType: docType,
        isCampaign: false,
        source: compendiumTitle || fileName.replace(/\.pdf$/i, ''),
        sourceCategory: 'core',
        sourceBookId: slugifyText(compendiumTitle || fileName),
        attachedLorebookIds: [],
        lorebookData: {
          id: `lore-${id}`,
          title: compendiumTitle || fileName.replace(/\.pdf$/i, ''),
          documentType: docType,
          regionOrTheme: fingerprint.profile === 'grimoire' ? 'Zaklęcia i Rytuały' : fingerprint.profile === 'bestiary' ? 'Bestiariusz i Bóstwa' : locationInfo.location,
          summary: description,
          factions: overlay.entities.npcs?.map((n, i) => ({
            id: `fac-${i + 1}`,
            name: n.name,
            influence: 'Lokalna obecność w regionie',
            agenda: n.role || 'Nieznane dążenia',
          })) || [],
          compendiumEntities: overlay.entities.spells?.map((s, i) => ({
            id: `ent-${i + 1}`,
            name: s.name,
            category: 'spell' as const,
            summary: s.description || 'Zaklęcie z grymuaru',
          })) || [],
        },
      },
    ];
  }

  // 4. Pojedynczy scenariusz / One-Shot domyślny
  const titleClean = hasSpecificFingerprintTitle
    ? fingerprint.title
    : cleanedFileBaseTitle || fingerprint.title || 'Scenariusz d100';

  const id = existingAdventureId || `custom-${fileSlug}-${slugifyText(titleClean)}`;
  const meta = extractScenarioDetailedMetadata(pdfText, titleClean, fingerprint.detectedLanguage);
  const locationInfo = detectLocationAndCountry(pdfText, fingerprint.detectedLanguage);
  const toneInfo = detectToneAndOccupations(pdfText);
  const graph = buildAdventureGraph(overlay, { eraLabel: meta.eraLabel, yearRange: meta.yearRange }, locationInfo);

  let documentType: DocumentType = meta.documentType;
  if (fingerprint.profile === 'mega_campaign') {
    documentType = 'campaign';
  }

  const hook = `Śledztwo w regionie ${locationInfo.location} (${meta.eraLabel}). Wątki tajemniczych zdarzeń czekają na zbadanie przez dociekliwych Badaczy.`;
  const description = `Autorski scenariusz d100 wyekstrahowany w trybie lokalnym z pliku "${fileName}". Dokument zawiera ${pdfPagesCount} stron, ${graph.npcs.length} kluczowych postaci dramatu oraz ${graph.clues.length} zidentyfikowanych poszlak i rekwizytów.`;

  return [
    {
      id,
      title: titleClean,
      era: meta.era,
      eraLabel: meta.eraLabel,
      yearRange: meta.yearRange,
      activeSceneYear: meta.activeSceneYear,
      location: locationInfo.location,
      country: locationInfo.country,
      tone: toneInfo.tone,
      themes: toneInfo.themes,
      suggestedOccupations: meta.investigatorRequirements?.requiredOccupations || toneInfo.suggestedOccupations,
      suggestedArchetypes: ['investigator', 'scholar', 'action', 'mystic'],
      hook,
      description,
      estimatedSessions: documentType === 'campaign' ? '10+' : meta.estimatedSessions,
      playerCount: '1-4',
      difficulty: meta.difficulty,
      difficultyStars: meta.difficultyStars,
      investigatorRequirements: meta.investigatorRequirements,
      puzzles: meta.puzzles,
      handouts: meta.handouts,
      isCustom: true,
      pdfUrl: '',
      geminiFileUri: '',
      fileName,
      uploadedAt: new Date().toISOString(),
      isAnalyzed: true,
      documentType,
      isCampaign: documentType === 'campaign',
      graph,
      source: titleClean,
      sourceCategory: 'custom',
      attachedLorebookIds: [],
    },
  ];
}

/**
 * Buduje gotowy obiekt CustomAdventure w 100% lokalnie (wrapper dla pierwszego scenariusza)
 */
export function buildLocalCustomAdventure(
  pdfText: string,
  fingerprint: RulebookFingerprintResult,
  overlay: OverlayDescriptor,
  fileName: string,
  pdfPagesCount: number,
  existingAdventureId?: string
): CustomAdventure {
  const adventures = buildLocalCustomAdventures(
    pdfText,
    fingerprint,
    overlay,
    fileName,
    pdfPagesCount,
    existingAdventureId
  );
  return adventures[0];
}
