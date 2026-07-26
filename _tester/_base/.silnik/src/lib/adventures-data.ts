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
  era: 'classic' | 'gaslight' | 'noir' | 'prl' | 'modern' | 'custom';
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
  /** Opcjonalne zewnętrzne linki do mediów / źródeł (np. Wikipedia, Filmweb, Player.pl). */
  externalLinks?: Array<{ label: string; url: string }>;
  /** Czy scenariusz jest częścią autorskiej serii Strefa 11 */
  isStrefa11?: boolean;
}

// ============================================================================
// AUTORSKIE PRZYGODY INSPROWANE PROGRAMEM STREFA 11 (TVN / NIE DO WIARY)
// ============================================================================

export const STREFA_11_ADVENTURES: AdventureContext[] = [
  {
    id: 'cien-nad-prabutami',
    title: 'Cień nad Prabutami: Widzenie Ojca Klimuszki',
    era: 'prl',
    eraLabel: 'PRL - lata 70.',
    yearRange: '1973-1974',
    location: 'Warszawa - Elbląg - Prabuty',
    country: 'Polska',
    tone: 'noir',
    themes: ['Jasnowidzenie', 'Służba Bezpieczeństwa', 'Trauma wojenna', 'Cztery wymiary'],
    suggestedOccupations: ['Dziennikarz', 'Parapsycholog', 'Egzorcysta', 'Milicjant'],
    suggestedArchetypes: ['investigator', 'scholar', 'mystic', 'action'],
    hook: 'Weryfikacja феноmenów ojca Klimuszki doprowadza badaczy do tajnych teczek SB i anomalii wymiarowej w Prabutach.',
    description: 'Badacze zostają zaangażowani przez redaktorkę Helenę Krawczyk z programu "Sygnały Nieznanego" po Międzynarodowym Kongresie Psychotronicznym w Pradze. Ich zadaniem jest weryfikacja niezwykłych fenomenów ojca Klimuszki – franciszkanina z Elbląga.',
    estimatedSessions: '1-2',
    playerCount: '1-4',
    difficulty: 'easy',
    source: 'Strefa 11 / Nie do wiary',
    sourceCategory: 'oneshot',
    recommendedForBeginners: true,
    isStrefa11: true,
    externalLinks: [
      { label: 'Wikipedia (Nie do wiary)', url: 'https://pl.wikipedia.org/wiki/Nie_do_wiary' },
      { label: 'Filmweb (Serial Nie do wiary)', url: 'https://www.filmweb.pl/serial/Nie+do+wiary-1996-161405' },
      { label: 'Oficjalny Player.pl TVN', url: 'https://player.pl' },
    ],
  },
  {
    id: 'tajemnica-pendnika-lagiewki',
    title: 'Tajemnica Pędnika: Genialny Wynalazca z Kowar',
    era: 'custom',
    eraLabel: 'Lata 90.',
    yearRange: '1995-1999',
    location: 'Kowary - Karkonosze',
    country: 'Polska',
    tone: 'pulp',
    themes: ['Genialny wynalazek', 'Pochłaniacz kinetyczny', 'Tajne służby AOR', 'Technologia Mi-Go'],
    suggestedOccupations: ['Inżynier', 'Dziennikarz Śledczy', 'Kierowca Testowy', 'Fizyk'],
    suggestedArchetypes: ['scholar', 'investigator', 'action'],
    hook: 'Zderzak Łągiewki eliminuje przeciążenia zderzeń, lecz jego Pędnik łamie prawa fizyki, czerpiąc z technologii Mi-Go z Gór Szaleństwa.',
    description: 'Badacze trafiają na ślad odkryć Lucjana Łągiewki z Kowar, którego zderzaki kinetyczne eliminują przeciążenia. Kiedy tworzy silnik bezwładnościowy działający w próżni, w warsztacie zjawiają się agenci AOR.',
    estimatedSessions: '2-3',
    playerCount: '1-4',
    difficulty: 'normal',
    source: 'Strefa 11 / Nie do wiary',
    sourceCategory: 'oneshot',
    recommendedForBeginners: true,
    isStrefa11: true,
    externalLinks: [
      { label: 'Wikipedia (Nie do wiary)', url: 'https://pl.wikipedia.org/wiki/Nie_do_wiary' },
      { label: 'Filmweb (Serial Nie do wiary)', url: 'https://www.filmweb.pl/serial/Nie+do+wiary-1996-161405' },
      { label: 'Oficjalny Player.pl TVN', url: 'https://player.pl' },
    ],
  },
  {
    id: 'tajemnica-dzieci-z-traszyna',
    title: 'Tajemnica Dzieci z Traszyna: Klucz i Odwrócony Krzyż',
    era: 'custom',
    eraLabel: 'Lata 90. (Y2K)',
    yearRange: '1983-1999',
    location: 'Traszyn k. Lublina',
    country: 'Polska',
    tone: 'purist',
    themes: ['Seans z książką i kluczem', 'Nocne paraliże', 'Poltergeist', 'Egzorcyzmy'],
    suggestedOccupations: ['Psycholog', 'Etnograf', 'Radiesteta / Bioenergoterapeuta', 'Leśnik'],
    suggestedArchetypes: ['mystic', 'healer', 'investigator'],
    hook: 'W 1983 roku troje dzieci w stodole wywołało ducha. Po 16 latach byt powraca z uderzeniem pioruna i wypalonym odwróconym krzyżem.',
    description: 'Badacze zostają wezwani przez egzorcystę i bioenergoterapeutę Tomasza Nowickiego do Traszyna. Po 16 latach od młodzieńczego seansu z książką i kluczem byt powraca, wywołując nocne paraliże.',
    estimatedSessions: '2',
    playerCount: '1-4',
    difficulty: 'normal',
    source: 'Strefa 11 / Nie do wiary',
    sourceCategory: 'oneshot',
    recommendedForBeginners: false,
    isStrefa11: true,
    externalLinks: [
      { label: 'Wikipedia (Nie do wiary)', url: 'https://pl.wikipedia.org/wiki/Nie_do_wiary' },
      { label: 'Filmweb (Serial Nie do wiary)', url: 'https://www.filmweb.pl/serial/Nie+do+wiary-1996-161405' },
      { label: 'Oficjalny Player.pl TVN', url: 'https://player.pl' },
    ],
  },
  {
    id: 'przybysz-z-matriksa-glogow',
    title: 'Przybysz z Matriksa: Przepowiednie i Zjawisko z Głogowa',
    era: 'modern',
    eraLabel: 'Przełom Tysiącleci',
    yearRange: '2001',
    location: 'Głogów - Legnica',
    country: 'Polska',
    tone: 'noir',
    themes: ['Sygnał z VHS', 'Anomalia czasowa', 'Audycje z przyszłości', 'Podziemia twierdzy'],
    suggestedOccupations: ['Programistka Y2K', 'Dziennikarka TV', 'Radioamator', 'Detektyw'],
    suggestedArchetypes: ['scholar', 'investigator', 'action', 'mystic'],
    hook: 'Nagrania VHS radioamatora wykazują audycje z przyszłości i zakłócenia sygnału z nocy 14 listopada. Byt z podziemi manipuluje czasem.',
    description: 'Badacze trafiają do Głogowa po serii zjawisk rejestrowanych na kasetach VHS. Świadkowie zgłaszają nocne błyski, zaniki pamięci i audycje z przyszłości, a śledztwo prowadzi do podziemi Twierdzy Głogów.',
    estimatedSessions: '2-3',
    playerCount: '1-4',
    difficulty: 'hard',
    source: 'Strefa 11 / Nie do wiary',
    sourceCategory: 'oneshot',
    recommendedForBeginners: false,
    isStrefa11: true,
    externalLinks: [
      { label: 'Wikipedia (Nie do wiary)', url: 'https://pl.wikipedia.org/wiki/Nie_do_wiary' },
      { label: 'Filmweb (Serial Nie do wiary)', url: 'https://www.filmweb.pl/serial/Nie+do+wiary-1996-161405' },
      { label: 'Oficjalny Player.pl TVN', url: 'https://player.pl' },
    ],
  },
];

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
  era: 'classic' | 'gaslight' | 'noir' | 'prl' | 'modern' | 'custom'
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
  if (era === 'noir' || era === 'prl') {
    return MODERN_ONLY;
  }
  return []; // modern - wszystko dostępne
}
