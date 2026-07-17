/**
 * Adventures Data - Wbudowane przygody i kontekst dla kreatora postaci
 * Scenariusze z Podręcznika Strażnika CoC 7ed
 */

import { ADVENTURE_CATALOG } from './adventures-catalog.generated';

// ============================================================================
// TYPY
// ============================================================================

/** Pojedynczy element rozkładu przygody (nazwa + zwięzły opis). */
export interface AdventureBreakdownEntry {
  name: string;
  description: string;
}

/**
 * Rozkład scenariusza na czynniki pierwsze - wynik analizy AI (PEŁNY, może być
 * spoilerowy). Służy MG/AI jako kontekst sesji (kto/gdzie/co), NIE jest pokazywany
 * graczowi jako zajawka - od tego są bezspoilerowe `hook`/`description`.
 */
export interface AdventureBreakdown {
  characters: AdventureBreakdownEntry[]; // NPC i postacie scenariusza
  locations: AdventureBreakdownEntry[]; // miejsca akcji
  events: AdventureBreakdownEntry[]; // kluczowe zdarzenia/sceny
  items: AdventureBreakdownEntry[]; // przedmioty, handouty, wskazówki
  creatures: AdventureBreakdownEntry[]; // stwory i byty Mitów
}

/**
 * Realny handout przygody (mapa/dokument z legalnie posiadanych materiałów
 * użytkownika). Obraz w public/handouts/ (gitignored, generowany skryptem
 * scripts/extract-handouts.mjs). MG „wręcza" go graczom wstawiając w narracji
 * gotowy markdown `![title](image)` - patrz build-handouts-context.ts.
 */
export interface AdventureHandout {
  /** Stabilny identyfikator handoutu w obrębie przygody (np. 'mapa-walimia'). */
  slug: string;
  /** Tytuł widoczny dla gracza (alt obrazu). */
  title: string;
  /** Ścieżka publiczna obrazu, np. '/handouts/cienie-tatr/pociag_do_szalenstwa-mapa-walimia.png'. */
  image: string;
}

export interface AdventureContext {
  id: string;
  title: string;
  era: 'classic' | 'gaslight' | 'modern' | 'custom';
  eraLabel: string;
  yearRange: string;
  location: string;
  country: string;
  tone: 'purist' | 'pulp' | 'noir';
  themes: string[];
  suggestedOccupations: string[];
  suggestedArchetypes: string[];
  hook: string;
  description: string;
  estimatedSessions: string;
  playerCount: string;
  difficulty: 'easy' | 'normal' | 'hard';
  isCustom?: boolean;
  pdfUrl?: string;
  customDescription?: string; // Opis założeń przygody od użytkownika (dla AI)
  breakdown?: AdventureBreakdown; // Rozkład na czynniki pierwsze (analiza AI)
  // --- Źródło pochodzenia (katalog z metką zbioru) ---
  /** Nazwa zbioru źródłowego do wyświetlenia (np. nazwa antologii lub podręcznika). */
  source?: string;
  /** Kategoria źródła do grupowania w UI. */
  sourceCategory?: 'core' | 'anthology' | 'oneshot' | 'custom';
  /**
   * Slug książki źródłowej. MUSI pokrywać się z tagiem `source:<slug>` zapisanym
   * przez reindex (scripts/reindex-pdfs.ts) - dzięki temu MG przy aktywnej
   * przygodzie czyta z RAG tylko fragmenty jej książki (retrieval-service
   * adventureSource). Przygody z podręcznika ('ksiega-straznika') czerpią treść
   * z namespace 'rules', nie 'adventures'.
   */
  sourceBookId?: string;
  /** Przygoda wprowadzająca dla początkujących (badge "⭐ Dobra na start"). */
  recommendedForBeginners?: boolean;
  /** Strona startu scenariusza w książce źródłowej (informacyjnie). */
  pageStart?: number | null;
  /** Realne handouty (mapy/dokumenty) dostępne MG do pokazania w grze. */
  handouts?: AdventureHandout[];
}

// Własna przygoda wgrana z PDF
export interface CustomAdventure extends AdventureContext {
  pdfUrl: string; // URL pliku PDF w GCS
  geminiFileUri: string; // URI dla Gemini API
  fileName: string; // Oryginalna nazwa pliku
  uploadedAt: string; // ISO timestamp
  isAnalyzed: boolean; // Czy AI przeanalizowało
  analysisError?: string; // Błąd analizy (opcjonalnie)
}

// ============================================================================
// ARCHETYPY POSTACI (dla kroku "Koncepcja postaci")
// ============================================================================

export interface CharacterArchetype {
  id: string;
  name: string;
  icon: string;
  description: string;
  suggestedOccupations: string[];
  suggestedTraits: string[];
  suggestedMotivations: string[];
}

export const CHARACTER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: 'investigator',
    name: 'Śledczy',
    icon: '🔍',
    description:
      'Szukasz prawdy za wszelką cenę. Dociekliwość jest Twoją bronią, a każda zagadka wzywa do rozwiązania.',
    suggestedOccupations: [
      'private_investigator',
      'police_detective',
      'journalist',
    ],
    suggestedTraits: ['dociekliwy', 'uparty', 'sceptyczny'],
    suggestedMotivations: ['odkrycie prawdy', 'sprawiedliwość', 'ciekawość'],
  },
  {
    id: 'scholar',
    name: 'Uczony',
    icon: '📚',
    description:
      'Wiedza jest Twoją bronią. Książki i dokumenty mówią więcej niż ludzie. Rozumiesz, że niektóre prawdy lepiej pozostawić nieodkryte.',
    suggestedOccupations: [
      'professor',
      'librarian',
      'antiquarian',
      'scientist',
    ],
    suggestedTraits: ['ciekawy świata', 'metodyczny', 'zamyślony'],
    suggestedMotivations: [
      'zdobycie wiedzy',
      'ochrona przed zapomnianymi tajemnicami',
      'akademicka sława',
    ],
  },
  {
    id: 'action',
    name: 'Człowiek czynu',
    icon: '💪',
    description:
      'Działasz, nie myślisz. Kiedy inni analizują, Ty już jesteś w środku akcji. Fizyczna siła i odwaga wyróżniają Cię z tłumu.',
    suggestedOccupations: [
      'soldier',
      'athlete',
      'sailor',
      'police_officer',
      'military',
    ],
    suggestedTraits: ['odważny', 'impulsywny', 'lojalny'],
    suggestedMotivations: ['ochrona bliskich', 'przygoda', 'honor'],
  },
  {
    id: 'trickster',
    name: 'Oszust',
    icon: '🎭',
    description:
      'Kłamstwo to Twoje narzędzie, a manipulacja - sztuka. Potrafisz wejść wszędzie i przekonać każdego do wszystkiego.',
    suggestedOccupations: ['criminal', 'entertainer', 'spy', 'dilettante'],
    suggestedTraits: ['przebiegły', 'czarujący', 'wyrachowany'],
    suggestedMotivations: ['zysk', 'emocje', 'ucieczka przed przeszłością'],
  },
  {
    id: 'mystic',
    name: 'Mistyk',
    icon: '🌙',
    description:
      'Czujesz coś więcej niż inni. Granica między światem materialnym a tym, co za nim, zawsze była dla Ciebie cienka.',
    suggestedOccupations: [
      'parapsychologist',
      'clergy',
      'artist',
      'tribe_member',
    ],
    suggestedTraits: ['intuicyjny', 'tajemniczy', 'wrażliwy'],
    suggestedMotivations: [
      'zrozumienie tego, co niewidzialne',
      'ochrona przed złem',
      'odkrycie swojego przeznaczenia',
    ],
  },
  {
    id: 'healer',
    name: 'Uzdrowiciel',
    icon: '⚕️',
    description:
      'Twoje powołanie to niesienie pomocy. Czy to ciału, czy umysłowi - potrafisz leczyć rany, które inni nawet nie widzą.',
    suggestedOccupations: ['doctor', 'nurse', 'clergy'],
    suggestedTraits: ['empatyczny', 'opanowany', 'cierpliwy'],
    suggestedMotivations: [
      'ratowanie życia',
      'zrozumienie ludzkiej natury',
      'pokuta za przeszłość',
    ],
  },
  {
    id: 'custom',
    name: 'Własna koncepcja',
    icon: '✍️',
    description:
      'Masz własną wizję postaci, która nie pasuje do żadnego z powyższych archetypów.',
    suggestedOccupations: [],
    suggestedTraits: [],
    suggestedMotivations: [],
  },
];

// ============================================================================
// WBUDOWANE PRZYGODY
// ============================================================================

// Katalog ładowany z osobnego modułu. Publiczny/testerski build dostaje PUSTY
// katalog (zero treści chronionych); prywatny build autora ma pełny katalog
// przez adventures-catalog.private.ts. Generator: scripts/gen-adventure-catalog.mjs
export const BUILT_IN_ADVENTURES: AdventureContext[] = ADVENTURE_CATALOG;

// ============================================================================
// PRZYGODA CUSTOM (dla własnych PDF)
// ============================================================================

export const CUSTOM_ADVENTURE_TEMPLATE: AdventureContext = {
  id: 'custom',
  title: 'Własna Przygoda',
  era: 'custom',
  eraLabel: 'Określ sam',
  yearRange: '',
  location: '',
  country: '',
  tone: 'purist',
  themes: [],
  suggestedOccupations: [],
  suggestedArchetypes: [],
  hook: 'Załaduj własny scenariusz lub opisz swoją przygodę.',
  description:
    'Wgraj plik PDF ze scenariuszem lub opisz fabułę manualnie. AI dostosuje generowanie postaci do Twojego kontekstu.',
  estimatedSessions: '',
  playerCount: '1-4',
  difficulty: 'normal',
  isCustom: true,
  source: 'Własna przygoda',
  sourceCategory: 'custom',
  sourceBookId: 'custom',
};

// ============================================================================
// HELPERY
// ============================================================================

export function getAdventureById(id: string): AdventureContext | undefined {
  if (id === 'custom') return CUSTOM_ADVENTURE_TEMPLATE;
  return BUILT_IN_ADVENTURES.find((a) => a.id === id);
}

/** Grupa przygód jednej książki źródłowej (do grupowania w selektorze). */
export interface AdventureSourceGroup {
  source: string;
  category: AdventureContext['sourceCategory'];
  items: AdventureContext[];
}

/**
 * Grupuje wbudowane przygody wg książki źródłowej. Kolejność grup = pierwsze
 * wystąpienie w BUILT_IN_ADVENTURES (podręcznik → antologie → one-shoty).
 */
export function getAdventuresGroupedBySource(): AdventureSourceGroup[] {
  const groups: AdventureSourceGroup[] = [];
  for (const adv of BUILT_IN_ADVENTURES) {
    const source = adv.source || 'Pozostałe scenariusze';
    let group = groups.find((g) => g.source === source);
    if (!group) {
      group = { source, category: adv.sourceCategory, items: [] };
      groups.push(group);
    }
    group.items.push(adv);
  }
  return groups;
}

export function getArchetypeById(id: string): CharacterArchetype | undefined {
  return CHARACTER_ARCHETYPES.find((a) => a.id === id);
}

/**
 * Zwraca opis kontekstu przygody dla promptu AI
 */
export function getAdventureContextPrompt(adventure: AdventureContext): string {
  return `KONTEKST PRZYGODY:
- Tytuł: ${adventure.title}
- Era: ${adventure.eraLabel} (${adventure.yearRange})
- Lokalizacja: ${adventure.location}, ${adventure.country}
- Ton: ${adventure.tone === 'purist' ? 'Mroczny, klasyczny horror' : adventure.tone === 'pulp' ? 'Heroiczna akcja' : 'Noir, śledztwo'}
- Motywy: ${adventure.themes.join(', ')}${adventure.source ? `\n- Źródło: ${adventure.source}` : ''}

WYMOGI DLA POSTACI:
- Postać MUSI pasować do lokalizacji: ${adventure.location}
- Postać MUSI mieć powód do przebywania w ${adventure.location} w roku ${adventure.yearRange}
- Zawód MUSI istnieć w epoce ${adventure.eraLabel}
- Styl postaci MUSI pasować do tonu "${adventure.tone}"

SUGEROWANE ZAWODY: ${adventure.suggestedOccupations.join(', ') || 'dowolne pasujące do ery'}`;
}

/**
 * Filtruje zawody według ery przygody
 */
export function filterOccupationsByEra(
  era: 'classic' | 'gaslight' | 'modern' | 'custom'
): string[] {
  // Zawody niedostępne w różnych erach
  const MODERN_ONLY = ['hacker'];
  const EXCLUDE_IN_GASLIGHT = ['hacker', 'pilot']; // samoloty dopiero po 1903

  if (era === 'gaslight') {
    return EXCLUDE_IN_GASLIGHT;
  }
  if (era === 'classic') {
    return MODERN_ONLY;
  }
  return []; // modern - wszystko dostępne
}
