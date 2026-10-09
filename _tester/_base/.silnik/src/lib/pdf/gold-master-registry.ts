/**
 * gold-master-registry.ts - Systemowy Rejestr Certyfikowanych Przygód & Bramka Jakości (Issue #737)
 *
 * Zastępuje kruche heurystyki parsowania PDF deterministycznym załadowaniem
 * zweryfikowanych pakietów Gold Master (1:1 NPC, pomoce i graf węzłowy)
 * oraz chroni silnik przed zanieczyszczeniem zepsutymi PDF-ami (Reject Gate).
 */

import type { CustomAdventure } from '@/lib/adventures-data';
import type { AdventureGraph, AdventureNPC, AdventureLocation, AdventureClue, GraphConnection, AdventureNode } from '@/lib/types';
import type { RulebookProfile } from './rulebook-fingerprint';
import { STARTER_HAUNTING_ADVENTURE, HAUNTING_HANDOUTS } from '@/lib/starter-haunting-data';

export interface QualityGateResult {
  isValid: boolean;
  reason?: string;
  issues?: string[];
}

/**
 * Buduje certyfikowany graf śledztwa The Alexandrian dla Nawiedzonego Domu.
 */
function buildHauntingGoldMasterGraph(): AdventureGraph {
  const nodes: AdventureNode[] = [
    {
      id: 'node-knott-office',
      name: 'Biuro Stevena Knotta',
      description: 'Eleganckie biuro właściciela kamienicy w bostońskim Downtown. Punkt wyjścia śledztwa.',
      type: 'location',
      leadInClueIds: [],
      leadOutClueIds: ['clue-knott-keys'],
      npcIds: ['npc-steven-knott'],
      locationId: 'loc-boston-downtown',
    },
    {
      id: 'node-boston-globe',
      name: 'Redakcja i Archiwum „Boston Globe”',
      description: 'Zatłoczona redakcja gazety oraz podziemna „kostnica” wycinków prasowych prowadzona przez Arty\'ego Wilmota.',
      type: 'location',
      leadInClueIds: ['clue-knott-keys'],
      leadOutClueIds: ['clue-globe-article-1918'],
      npcIds: ['npc-arty-wilmot'],
      locationId: 'loc-globe-office',
    },
    {
      id: 'node-city-hall',
      name: 'Bostońskie Archiwum Miejskie i Rejestr Gruntów',
      description: 'Dział starych ksiąg wieczystych i spraw sądowych hrabstwa Suffolk. Biuro Ruth Blake.',
      type: 'location',
      leadInClueIds: ['clue-knott-keys'],
      leadOutClueIds: ['clue-land-registry-1852', 'clue-lawsuit-1853', 'clue-obituary-1866', 'clue-executor-record'],
      npcIds: ['npc-ruth-blake'],
      locationId: 'loc-city-archives',
    },
    {
      id: 'node-sanatorium',
      name: 'Bostońskie Sanatorium dla Obłąkanych',
      description: 'Szpital psychiatryczny, w którym przebywa Vittorio Macario, dawny lokator kamienicy.',
      type: 'location',
      leadInClueIds: ['clue-globe-article-1918'],
      leadOutClueIds: ['clue-macario-testimony'],
      npcIds: ['npc-vittorio-macario'],
      locationId: 'loc-sanatorium',
    },
    {
      id: 'node-chapel-ruins',
      name: 'Zgliszcza Kaplicy Kontemplacji',
      description: 'Spalone w 1912 roku ruiny świątyni Kościoła Dawcy Tajemnic przy bostońskich dokach.',
      type: 'location',
      leadInClueIds: ['clue-executor-record'],
      leadOutClueIds: ['clue-police-raid-file', 'clue-cult-symbol-sketch'],
      npcIds: [],
      locationId: 'loc-chapel-ruins',
    },
    {
      id: 'node-corbitt-house',
      name: 'Corbitt House – Parter i Piętro',
      description: 'Opuszczona kamienica z czerwonej cegły. Nawiedzone sypialnie na piętrze, latające łóżko i zacieki krwi na suficie.',
      type: 'location',
      leadInClueIds: ['clue-knott-keys', 'clue-lawsuit-1853'],
      leadOutClueIds: [],
      npcIds: [],
      locationId: 'loc-corbitt-house',
    },
    {
      id: 'node-corbitt-basement',
      name: 'Piwnica Corbitt House i Ukryta Komora',
      description: 'Wilgotna piwnica z węglarką i podwójną ścianą z desek. Grobowiec, w którym spoczywa nieumarły Walter Corbitt.',
      type: 'climax',
      isClimax: true,
      leadInClueIds: ['clue-obituary-1866', 'clue-police-raid-file', 'clue-macario-testimony'],
      leadOutClueIds: ['clue-corbitt-journal'],
      npcIds: ['npc-walter-corbitt'],
      locationId: 'loc-corbitt-house',
    },
  ];

  const npcs: AdventureNPC[] = [
    {
      id: 'npc-steven-knott',
      name: 'Steven Knott',
      description: 'Zamożny, nerwowy bostończyk w nienagannym tweedowym garniturze. Pragnie oczyścić reputację domu i znaleźć nowych lokatorów.',
      secret: 'Poprzedni najemcy, rodzina Macario, popadli w obłęd, co zrujnowało wartość rynkową kamienicy.',
      statsSummary: 'STR 45, CON 50, SIZ 60, DEX 40, INT 70, POW 50, APP 65, EDU 75, SAN 50, HP 11. Umiejętności: Perswazja 60%, Księgowość 55%, Prawo 45%.',
    },
    {
      id: 'npc-arty-wilmot',
      name: 'Arty Wilmot',
      description: 'Doświadczony archiwista prasowy w okularach bez oprawek, z wieczną plamą atramentu na palcach. Zna każdą mroczną tajemnicę Bostonu.',
      secret: 'Naczelny zablokował publikację artykułu o Corbitt House w 1918 roku pod naciskiem wpływowych prawników.',
      statsSummary: 'STR 40, CON 55, SIZ 50, DEX 60, INT 75, POW 60, APP 50, EDU 80, SAN 58, HP 10. Umiejętności: Korzystanie z Bibliotek 75%, Spostrzegawczość 65%.',
    },
    {
      id: 'npc-ruth-blake',
      name: 'Ruth Blake',
      description: 'Rzeczowa, skrupulatna kobieta w średnim wieku, pilnująca porządku w wiekowych bostońskich rejestrach hipotecznych.',
      secret: 'Pamięta, że wielebny Michael Thomas z Kaplicy Kontemplacji osobiście wstrzymywał sprawę pochówku Corbitta.',
      statsSummary: 'STR 40, CON 50, SIZ 50, DEX 55, INT 70, POW 65, APP 55, EDU 75, SAN 65, HP 10. Umiejętności: Korzystanie z Bibliotek 70%, Prawo 60%.',
    },
    {
      id: 'npc-vittorio-macario',
      name: 'Vittorio Macario',
      description: 'Złamany psychicznie mężczyzna przebywający w bostońskim Sanatorium. Mówi urywanymi zdaniami o czerwonych oczach w ścianach.',
      secret: 'Próbował zamordować swoją żonę i dzieci pod wpływem niewidzialnego głosu sączącego się z piwnicy.',
      statsSummary: 'STR 65, CON 60, SIZ 65, DEX 45, INT 50, POW 20, APP 40, EDU 40, SAN 15, HP 12. Umiejętności: Ślusarstwo 45%, Siła 65%.',
    },
    {
      id: 'npc-walter-corbitt',
      name: 'Walter Corbitt',
      description: 'Wyschnięte, mumifikowane ciało spoczywające w grobowcu pod deskami piwnicy. Posiada nienaturalnie długie pazury i hipnotyzujący wzrok.',
      secret: 'Od 1866 roku czerpie siły życiowe z kolejnych lokatorów za pomocą Istoty w Ścianach.',
      statsSummary: 'STR 90, CON 115, SIZ 55, DEX 35, INT 80, POW 90, APP 5, EDU 85, SAN 0, HP 17. Czary: Przemieszczenie Ciała, Przywołanie Wymiarowego Łowcy.',
    },
  ];

  const locations: AdventureLocation[] = [
    { id: 'loc-boston-downtown', name: 'Downtown Boston', description: 'Centrum handlowe i administracyjne miasta.' },
    { id: 'loc-globe-office', name: 'Redakcja Boston Globe', description: 'Budynek redakcji z archiwum w piwnicy.' },
    { id: 'loc-city-archives', name: 'Bostońskie Archiwum Miejskie', description: 'Gmach administracji miejskiej z księgami wieczystymi.' },
    { id: 'loc-sanatorium', name: 'Bostońskie Sanatorium dla Obłąkanych', description: 'Prywatna klinika psychiatryczna pod Bostonem.' },
    { id: 'loc-chapel-ruins', name: 'Zgliszcza Kaplicy Kontemplacji', description: 'Spalone ruiny sekty w pobliżu portu.' },
    { id: 'loc-corbitt-house', name: 'Corbitt House', description: 'Ceglana kamienica z ponurą aurą i piwnicą grobową.' },
  ];

  const clues: AdventureClue[] = [
    {
      id: 'clue-knott-keys',
      name: 'Klucze i zlecenie Stevena Knotta',
      description: 'Pęk mosiężnych kluczy do kamienicy oraz 25$ zaliczki na koszty śledztwa.',
      clueType: 'core',
      sourceType: 'material',
      sourceNodeId: 'node-knott-office',
      targetNodeId: 'node-corbitt-house',
    },
    {
      id: 'clue-globe-article-1918',
      name: 'Niepublikowany artykuł z 1918 roku',
      description: 'Archiwalny maszynopis dokumentujący tragedie kolejnych rodzin w Corbitt House (1880, 1914, 1918).',
      clueType: 'core',
      sourceType: 'document',
      sourceNodeId: 'node-boston-globe',
      targetNodeId: 'node-sanatorium',
    },
    {
      id: 'clue-land-registry-1852',
      name: 'Wpis w rejestrze gruntów (1852)',
      description: 'Zapis o nabyciu posiadłości przez Waltera Corbitta od zamożnego kupca.',
      clueType: 'flavor',
      sourceType: 'document',
      sourceNodeId: 'node-city-hall',
      targetNodeId: 'node-corbitt-house',
    },
    {
      id: 'clue-lawsuit-1853',
      name: 'Pozew sąsiedzki przeciw Corbittowi (1853)',
      description: 'Sądowy wniosek mieszkańców o eksmisję Corbitta ze względu na podejrzane hałasy i ohydne nawyki.',
      clueType: 'core',
      sourceType: 'document',
      sourceNodeId: 'node-city-hall',
      targetNodeId: 'node-corbitt-house',
    },
    {
      id: 'clue-obituary-1866',
      name: 'Nekrolog Waltera Corbitta (1866)',
      description: 'Informacja o śmierci Corbitta w trakcie procesu uniemożliwiającego pochówek w piwnicy.',
      clueType: 'core',
      sourceType: 'document',
      sourceNodeId: 'node-city-hall',
      targetNodeId: 'node-corbitt-basement',
    },
    {
      id: 'clue-executor-record',
      name: 'Wzmianka o pastorze Michaelu Thomasie',
      description: 'Wskazanie wykonawcy testamentu – pastora Kaplicy Kontemplacji.',
      clueType: 'core',
      sourceType: 'document',
      sourceNodeId: 'node-city-hall',
      targetNodeId: 'node-chapel-ruins',
    },
    {
      id: 'clue-police-raid-file',
      name: 'Raport z nalotu policji na Kaplicę Kontemplacji (1912)',
      description: 'Dokumentacja strzelaniny w świątyni i ucieczki pastora Thomasa w 1917 roku.',
      clueType: 'core',
      sourceType: 'document',
      sourceNodeId: 'node-chapel-ruins',
      targetNodeId: 'node-corbitt-basement',
    },
    {
      id: 'clue-cult-symbol-sketch',
      name: 'Glif Kaplicy Kontemplacji',
      description: 'Rysunek symbolu oka z promieniami, identyczny ze znakami wydrapanymi na belkach stropowych Corbitt House.',
      clueType: 'flavor',
      sourceType: 'anomaly',
      sourceNodeId: 'node-chapel-ruins',
      targetNodeId: 'node-corbitt-house',
    },
    {
      id: 'clue-macario-testimony',
      name: 'Zeznanie Vittorio Macario',
      description: 'Relacja z koszmarów sennych, wołania spod podłogi i potwornego spojrzenia w ciemności.',
      clueType: 'core',
      sourceType: 'testimony',
      sourceNodeId: 'node-sanatorium',
      targetNodeId: 'node-corbitt-basement',
    },
    {
      id: 'clue-corbitt-journal',
      name: 'Dziennik okultystyczny Waltera Corbitta',
      description: 'Czarna księga z zapiskami rytuałów, czarem Przemieszczenia Ciała i kultem Dawcy Tajemnic.',
      clueType: 'core',
      sourceType: 'document',
      sourceNodeId: 'node-corbitt-basement',
      targetNodeId: 'node-corbitt-basement',
    },
  ];

  const connections: GraphConnection[] = [
    { fromId: 'node-knott-office', toId: 'node-boston-globe', description: 'Wskazówka o wzmiankach w prasie' },
    { fromId: 'node-knott-office', toId: 'node-city-hall', description: 'Zbadanie rejestrów własności' },
    { fromId: 'node-knott-office', toId: 'node-corbitt-house', description: 'Bezpośrednie udanie się na miejsce z kluczami' },
    { fromId: 'node-boston-globe', toId: 'node-sanatorium', description: 'Informacja o losie rodziny Macario' },
    { fromId: 'node-city-hall', toId: 'node-chapel-ruins', description: 'Wzmianka o pastorze Michaelu Thomasie' },
    { fromId: 'node-chapel-ruins', toId: 'node-corbitt-basement', description: 'Odkrycie powiązania kultu z piwnicą' },
    { fromId: 'node-sanatorium', toId: 'node-corbitt-basement', description: 'Świadectwo o dźwiękach z piwnicy' },
    { fromId: 'node-corbitt-house', toId: 'node-corbitt-basement', description: 'Zejście schodami do piwnicy i sforsowanie desek' },
  ];

  return { nodes, npcs, locations, clues, connections };
}

function slugify(text: string): string {
  const map: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  };
  return (
    text
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (c) => map[c] || c)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'starter'
  );
}

/**
 * Certyfikowana definicja Gold Master dla scenariusza Nawiedzony Dom.
 */
function createHauntingGoldMasterAdventure(params?: { existingAdventureId?: string; fileName?: string }): CustomAdventure {
  const base = STARTER_HAUNTING_ADVENTURE;
  const graph = buildHauntingGoldMasterGraph();

  const fileSlug = params?.fileName
    ? slugify(params.fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim())
    : 'starter';
  const id = params?.existingAdventureId || `custom-${fileSlug}-starter-scenariusz`;

  return {
    id,
    title: 'Nawiedzony dom',
    era: base.era,
    eraLabel: base.eraLabel,
    yearRange: base.yearRange,
    activeSceneYear: base.activeSceneYear,
    location: base.location,
    country: base.country,
    tone: base.tone,
    themes: base.themes,
    suggestedOccupations: base.suggestedOccupations,
    suggestedArchetypes: base.suggestedArchetypes,
    hook: base.hook,
    description: base.description,
    investigatorIntro: base.investigatorIntro,
    estimatedSessions: base.estimatedSessions,
    playerCount: base.playerCount,
    difficulty: base.difficulty,
    isCustom: true,
    pdfUrl: '',
    geminiFileUri: '',
    fileName: params?.fileName || 'Zew_Cthulhu_Starter_7e.pdf',
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
    handouts: HAUNTING_HANDOUTS,
    settingTrivia: base.settingTrivia,
  };
}

/**
 * Sprawdza, czy wejściowy dokument PDF odpowiada certyfikowanemu pakietowi Gold Master.
 */
export function findGoldMasterMatch(
  text: string,
  fileName?: string,
  profile?: RulebookProfile,
  existingAdventureId?: string
): CustomAdventure | null {
  if (!text) return null;
  const sample = text.slice(0, 100000);
  const cleanFileName = (fileName || '').toLowerCase();

  // Dopasowanie Startera Zew Cthulhu 7e / Nawiedzony Dom / The Haunting
  const isStarter =
    profile === 'starter-d100' ||
    cleanFileName.includes('starter') ||
    cleanFileName.includes('haunting') ||
    cleanFileName.includes('nawiedzony');

  const hasHauntingSignals =
    /nawiedzony\s+dom/i.test(sample) ||
    /the\s+haunting/i.test(sample) ||
    /walter[a-z\s]*corbitt/i.test(sample) ||
    /steven[a-z\s]*knott/i.test(sample) ||
    /kaplic[aęy]\s+kontemplacji/i.test(sample);

  if (isStarter && hasHauntingSignals) {
    return createHauntingGoldMasterAdventure({
      existingAdventureId,
      fileName,
    });
  }

  return null;
}

/**
 * Twarda Bramka Jakości (Reject Gate) dla nieznanych/dowolnych plików PDF.
 * Zapobiega zanieczyszczeniu biblioteki atrapami bez węzłów śledztwa, postaci i poszlak.
 */
export function validateAdventureQualityGate(
  adventure: CustomAdventure,
  rawPdfText: string
): QualityGateResult {
  const issues: string[] = [];

  if (!rawPdfText || rawPdfText.trim().length < 200) {
    issues.push('Zbyt krótka lub pusta warstwa tekstowa PDF (możliwy skan bez OCR).');
  }

  const nodes = adventure.graph?.nodes || [];
  if (nodes.length < 2) {
    issues.push('Brak wystarczającej liczby węzłów śledztwa (minimum 2 węzły).');
  }

  const npcs = adventure.graph?.npcs || [];
  if (npcs.length === 0) {
    issues.push('Brak rozpoznanych postaci niezależnych (NPC).');
  }

  const clues = adventure.graph?.clues || [];
  const handouts = adventure.handouts || [];
  if (clues.length === 0 && handouts.length === 0) {
    issues.push('Brak zidentyfikowanych poszlak lub handoutów.');
  }

  if (issues.length > 0) {
    return {
      isValid: false,
      reason: issues.join(' '),
      issues,
    };
  }

  return { isValid: true };
}
