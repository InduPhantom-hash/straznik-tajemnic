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
      eraLabel: `PRL - lata 70. (${prlYear})`,
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
      eraLabel: `Klasyczne lata 20. (${y})`,
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
      eraLabel: `Lata 30. / Noir (${y})`,
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
      eraLabel: `Wiktoriańska / Gaslight (${y})`,
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
      eraLabel: `Czasy współczesne (${y})`,
      yearRange: `${y}`,
      activeSceneYear: y,
    };
  }

  // Domyślnie klasyczne lata 20.
  const fallbackYear = years[0] || 1925;
  return {
    era: 'classic',
    eraLabel: `Klasyczne lata 20. (${fallbackYear})`,
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

  // Polskie lokacje
  if (
    /warszaw|krakow|lwow|poznan|gdansk|wilno|zakopan|tatr|prabut|wroclaw|lodz|szczecin|baltyk|polsce|polska/i.test(
      sample
    )
  ) {
    let loc = 'Polska';
    if (/warszaw/i.test(sample)) loc = 'Warszawa';
    else if (/krakow/i.test(sample)) loc = 'Kraków';
    else if (/tatr|zakopan/i.test(sample)) loc = 'Tatry i Zakopane';
    else if (/prabut/i.test(sample)) loc = 'Prabuty';
    else if (/gdansk|baltyk/i.test(sample)) loc = 'Gdańsk i Wybrzeże';
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
    return { location: 'Polska / Europa Środkowa', country: 'Polska' };
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
 * Buduje gotowy obiekt CustomAdventure w 100% lokalnie
 */
export function buildLocalCustomAdventure(
  pdfText: string,
  fingerprint: RulebookFingerprintResult,
  overlay: OverlayDescriptor,
  fileName: string,
  pdfPagesCount: number,
  existingAdventureId?: string
): CustomAdventure {
  const titleClean =
    fingerprint.title && fingerprint.title !== 'Nieznany dokument'
      ? fingerprint.title
      : fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();

  const id = existingAdventureId || `custom-${Date.now()}-${slugifyText(titleClean)}`;
  const eraInfo = detectEraAndYears(pdfText);
  const locationInfo = detectLocationAndCountry(pdfText, fingerprint.detectedLanguage);
  const toneInfo = detectToneAndOccupations(pdfText);
  const graph = buildAdventureGraph(overlay, eraInfo, locationInfo);

  // Określenie typu dokumentu
  let documentType: DocumentType = 'scenario';
  if (fingerprint.profile === 'mega_campaign') {
    documentType = 'campaign';
  } else if (fingerprint.profile === 'setting_expansion') {
    documentType = 'setting';
  } else if (fingerprint.profile === 'bestiary' || fingerprint.profile === 'grimoire') {
    documentType = 'compendium';
  }

  const hook = `Śledztwo w regionie ${locationInfo.location} (${eraInfo.eraLabel}). Wątki tajemniczych zdarzeń i mrocznych kultów czekają na zbadanie przez dociekliwych Badaczy.`;
  const description = `Autorski scenariusz d100 wyekstrahowany w trybie lokalnym z pliku "${fileName}". Dokument zawiera ${pdfPagesCount} stron, ${graph.npcs.length} kluczowych postaci dramatu oraz ${graph.clues.length} zidentyfikowanych poszlak i rekwizytów.`;

  return {
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
    attachedLorebookIds: [],
  };
}
