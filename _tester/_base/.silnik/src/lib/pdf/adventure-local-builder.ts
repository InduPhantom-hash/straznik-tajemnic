/**
 * adventure-local-builder.ts - Lokalny generator struktury i grafu przygody (Clean Room BYOB)
 *
 * Doktryna "Czystego Emulatora BYOB" (Zero-Cytowań, bez wysyłania dokumentu do chmury).
 * Analizuje sparsowany tekst PDF, profil regułowy oraz nakładkę semantyczną w pamięci RAM,
 * budując pełny obiekt CustomAdventure z grafem śledztwa (AdventureGraph) dla MG i Dossier.
 */

import type { CustomAdventure } from '@/lib/adventures-data';
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

  const isPulp = /pulp|dwuglowy\s+waz|punkty\s+pulpu|talent\s+pulpu|bohater|heroic/i.test(sample);
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
export function parseScenariosFromAnthologyText(
  pdfText: string,
  fileName: string
): Array<{ num: string; title: string; rawTitle: string; textSlice: string }> {
  // Podział na strony
  const pages = pdfText.split(/<!--\s*Strona\s*\d+\s*-->|\f/);
  const samplePages = pages.length > 1 ? pages : [pdfText];

  // Szukamy stron spisu treści (zazwyczaj strony 2-6)
  let tocText = '';
  for (let p = 0; p < Math.min(samplePages.length, 8); p++) {
    if (/spis\s+tre[sś]ci|table\s+of\s+contents/i.test(samplePages[p])) {
      tocText = samplePages[p];
      if (p + 1 < samplePages.length && !/rozdzia[lł]\s+1\b/i.test(samplePages[p + 1])) {
        tocText += '\n' + samplePages[p + 1];
      }
      break;
    }
  }

  if (!tocText) {
    tocText = samplePages.slice(0, 6).join('\n');
  }

  const lines = tocText.split('\n').map((l) => l.trim()).filter(Boolean);
  const scenariosMeta: Array<{ num: string; title: string; rawTitle: string }> = [];
  const seenNumbers = new Set<string>();

  const isIgnoredTitle = (t: string) =>
    /wstęp|wstep|przedmowa|wprowadzenie|dodatki|dodatek|karty badaczy|zasady|indeks|o autorach|statystyki|pomocnicze|tabele/i.test(t);

  // Wzorzec A: ROZDZIAŁ X \n TYTUŁ (np. Horror nad Wartą)
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
        const formatted = titleClean
          .toLowerCase()
          .split(' ')
          .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
          .join(' ');
        scenariosMeta.push({
          num,
          title: formatted,
          rawTitle: titleClean,
        });
      }
    }
  }

  // Wzorzec B: Linijka spisu treści: TYTUŁ ... STRONA (np. Cienie Tatr)
  if (scenariosMeta.length < 2) {
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
          const formatted = titleClean
            .toLowerCase()
            .split(' ')
            .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
            .join(' ');
          scenariosMeta.push({
            num: String(idx++),
            title: formatted,
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
    const pattern = new RegExp(`(?:ROZDZIAŁ\\s*${s.num}[\\s\\S]{0,30})?${s.rawTitle.replace(/\s+/g, '\\s+')}`, 'i');
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
            : fingerprint.title || fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();

      return detectedScenarios.map((scen, idx) => {
        const id =
          existingAdventureId && idx === 0
            ? existingAdventureId
            : `custom-${Date.now()}-${idx + 1}-${slugifyText(scen.title)}`;

        const eraInfo = detectEraAndYears(scen.textSlice);
        const locationInfo = detectLocationAndCountry(scen.textSlice, fingerprint.detectedLanguage);
        const toneInfo = detectToneAndOccupations(scen.textSlice);
        const graph = buildAdventureGraph(overlay, eraInfo, locationInfo);

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
          : `Śledztwo w regionie ${locationInfo.location} (${eraInfo.eraLabel}). Wątki tajemniczych zdarzeń czekają na zbadanie przez Badaczy.`;

        const description = `Scenariusz "${scen.title}" z antologii "${sourceTitle}". Miejsce akcji: ${locationInfo.location}, czas: ${eraInfo.eraLabel} (${eraInfo.yearRange}).`;

        return {
          id,
          title: scen.title,
          era: eraInfo.era,
          eraLabel: eraInfo.eraLabel,
          yearRange: eraInfo.yearRange,
          activeSceneYear: eraInfo.activeSceneYear,
          location: locationInfo.location,
          country: locationInfo.country,
          tone: toneInfo.tone,
          themes: toneInfo.themes,
          suggestedOccupations: toneInfo.suggestedOccupations,
          suggestedArchetypes: ['investigator', 'scholar', 'action', 'mystic'],
          hook,
          description,
          estimatedSessions: '2-3',
          playerCount: '1-4',
          difficulty: 'normal',
          isCustom: true,
          pdfUrl: '',
          geminiFileUri: '',
          fileName,
          uploadedAt: new Date().toISOString(),
          isAnalyzed: true,
          documentType: 'scenario',
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
    const id = existingAdventureId || `custom-${Date.now()}-starter-scenariusz`;
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

  // 3. Grymuar, Bestiariusz lub Rozszerzenie Settingowe (Lorebook / Compendium)
  if (
    fingerprint.profile === 'grimoire' ||
    fingerprint.profile === 'bestiary' ||
    fingerprint.profile === 'setting_expansion'
  ) {
    const docType: DocumentType =
      fingerprint.profile === 'setting_expansion' ? 'setting' : 'compendium';
    const id = existingAdventureId || `custom-${Date.now()}-${slugifyText(fingerprint.title || fileName)}`;
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
        title: fingerprint.title || fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim(),
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
        source: fingerprint.title || fileName.replace(/\.pdf$/i, ''),
        sourceCategory: 'core',
        sourceBookId: slugifyText(fingerprint.title || fileName),
        attachedLorebookIds: [],
        lorebookData: {
          id: `lore-${id}`,
          title: fingerprint.title || fileName.replace(/\.pdf$/i, ''),
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
  const titleClean =
    fingerprint.title && fingerprint.title !== 'Nieznany dokument'
      ? fingerprint.title
      : fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();

  const id = existingAdventureId || `custom-${Date.now()}-${slugifyText(titleClean)}`;
  const eraInfo = detectEraAndYears(pdfText);
  const locationInfo = detectLocationAndCountry(pdfText, fingerprint.detectedLanguage);
  const toneInfo = detectToneAndOccupations(pdfText);
  const graph = buildAdventureGraph(overlay, eraInfo, locationInfo);

  let documentType: DocumentType = 'scenario';
  if (fingerprint.profile === 'mega_campaign') {
    documentType = 'campaign';
  }

  const hook = `Śledztwo w regionie ${locationInfo.location} (${eraInfo.eraLabel}). Wątki tajemniczych zdarzeń czekają na zbadanie przez dociekliwych Badaczy.`;
  const description = `Autorski scenariusz d100 wyekstrahowany w trybie lokalnym z pliku "${fileName}". Dokument zawiera ${pdfPagesCount} stron, ${graph.npcs.length} kluczowych postaci dramatu oraz ${graph.clues.length} zidentyfikowanych poszlak i rekwizytów.`;

  return [
    {
      id,
      title: titleClean,
      era: eraInfo.era,
      eraLabel: eraInfo.eraLabel,
      yearRange: eraInfo.yearRange,
      activeSceneYear: eraInfo.activeSceneYear,
      location: locationInfo.location,
      country: locationInfo.country,
      tone: toneInfo.tone,
      themes: toneInfo.themes,
      suggestedOccupations: toneInfo.suggestedOccupations,
      suggestedArchetypes: ['investigator', 'scholar', 'action', 'mystic'],
      hook,
      description,
      estimatedSessions: documentType === 'campaign' ? '10+' : '2-3',
      playerCount: '1-4',
      difficulty: 'normal',
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
