import { InvestigatorBoardState } from '@/types/investigator-board';

// === WIADOMOŚĆ CZATU ===
// Przeniesiona z page.tsx dla centralizacji typów
// SkillTestData zdefiniowane lokalnie niżej (~lin 597) - używane przez Message.skillTests.

// === SYSTEM CZASU I PODRÓŻY (Campaign Clock & Chrono-Travel) ===

/** Faza księżyca - istotne dla rytuałów i atmosfery */
export type MoonPhase =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

/** Czas w grze - deterministyczny zegar kampanii */
export interface GameTime {
  year: number;
  month: number; // 0-11
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
}

/** Epoka gry - wpływa na dostępne środki transportu i komunikacji */
export type GameEra =
  | '1890s'
  | '1920s'
  | '1940s'
  | 'prl-1970s'
  | '1990s'
  | '2000s'
  | 'modern'
  | 'future';

/** Ustawienia epoki - definiują realia technologiczne świata */
export interface EraSettings {
  id: GameEra;
  name: string;
  description: string;
  transport: {
    flight: {
      available: 'none' | 'rare' | 'common';
      risk: 'low' | 'medium' | 'high';
      avgSpeedKmh: number;
    };
    train: {
      available: 'none' | 'rare' | 'common';
      risk: 'low' | 'medium' | 'high';
      avgSpeedKmh: number;
    };
    ship: {
      available: 'none' | 'rare' | 'common';
      risk: 'low' | 'medium' | 'high';
      avgSpeedKmh: number;
    };
    car: {
      available: 'none' | 'rare' | 'common';
      risk: 'low' | 'medium' | 'high';
      avgSpeedKmh: number;
    };
    horse: {
      available: 'none' | 'rare' | 'common';
      risk: 'low' | 'medium' | 'high';
      avgSpeedKmh: number;
    };
  };
  communication: 'instant' | 'hours' | 'days' | 'weeks';
  worldRules: string; // Tekstowy prompt wstrzykiwany do AI
}

// === SYSTEM PAMIĘCI RAG (Eternal Memory) ===

/** Wpis indeksu pamięci - przechowywany w GCS dla wyszukiwania semantycznego */
export interface MemoryIndexEntry {
  chunkId: string;
  embedding: number[]; // Wektor 768-wymiarowy (Gemini Embedding-001)
  summary: string; // Krótkie streszczenie chunka
  gameTimestamp: string; // Czas w grze (np. "14 Stycznia 1925, 22:45")
  realTimestamp: string; // ISO timestamp zapisu
  tags: string[]; // ['NPC:Jackson', 'LOC:London', 'PLOT:Ritual']
  messageRange: { start: number; end: number };
}

/** Pełny indeks pamięci - ładowany do pamięci serwera przy starcie sesji */
export interface MemoryIndex {
  version: string;
  sessionId: string;
  entries: MemoryIndexEntry[];
  lastUpdated: string;
}

export interface IllustrationElement {
  type: 'character' | 'location' | 'item' | 'creature';
  name: string;
  description: string;
  context: string;
  importance: 'high' | 'medium' | 'low';
  style: 'realistic' | 'artistic' | 'horror' | 'vintage';
}

export interface MessageIllustration {
  element: IllustrationElement;
  imageUrl: string;
  prompt: string;
  timestamp: Date;
}

/** Propozycja ekwipunku wykryta w narracji, zanim gracz potwierdzi jej zabranie. */
export interface AcquiredItemProposal {
  id: string;
  name: string;
  description: string;
  /** Postać wskazana przez MG w tagu; brak = aktualnie aktywny badacz. */
  recipientName?: string;
  visualTreatment: EquipmentVisualTreatment;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  gameTime?: GameTime; // Czas w grze w momencie wysłania wiadomości
  illustrations?: MessageIllustration[];
  generatedImages?: string[]; // URL-e wygenerowanych obrazów (base64 w sesji; stripowane z localStorage przez sanitizer)
  // IND-262: klucze obrazów w IndexedDB (persistentMediaCache, store chat-images).
  // Lekkie - przeżywają localStorage (sanitizer wycina tylko base64). Po reloadzie
  // hydrują generatedImages z cache → obrazy "wracają na miejsce".
  generatedImageCacheIds?: string[];
  skillTests?: SkillTestData[]; // Tacka testów [TEST:...] (skillValue dociągnięte z karty postaci)
  acquiredItems?: AcquiredItemProposal[];
  cliffhanger?: {
    question: string;
    type: 'dramatic_question' | 'external_event' | 'dilemma';
    options?: string[];
  };
}

// Typy wydarzeń dziennika sesji
export type JournalEventType =
  | 'combat' // ⚔️ Walka
  | 'discovery' // 🔍 Odkrycie
  | 'npc' // 👤 NPC
  | 'sanity' // 🧠 Poczytalność
  | 'clue' // 📜 Trop
  | 'location' // 📍 Lokacja
  | 'ritual' // 🕯️ Rytuał
  | 'death' // 💀 Śmierć
  | 'bookmark' // ⭐ Zakładka
  | 'note'; // 📝 Notatka

// Wpis dziennika sesji
export interface JournalEntry {
  id: string;
  timestamp: Date; // Rzeczywisty czas
  date?: string; // Opcjonalna strunowa data (ISO / formatted) dla kompatybilności
  updatedAt?: Date; // Ostatnia ręczna zmiana wpisu
  adventureJournalId?: string; // Konkretny przebieg przygody, nie sam scenariusz
  inGameDate?: string; // Data w grze (np. "11 grudnia 1925, 14:32")
  type: JournalEventType;
  title: string;
  content: string;
  tags: string[];
  isBookmarked: boolean;
  metadata?: {
    hpChange?: number; // Zmiana HP (np. -4)
    sanChange?: number; // Zmiana SAN
    mpChange?: number; // Zmiana MP
    npcName?: string; // Nazwa NPC
    locationName?: string; // Nazwa lokacji
    skillUsed?: string; // Użyta umiejętność
    rollResult?: number; // Wynik rzutu
  };
  /** Powiązane identyfikatory innych wpisów z dziennika (relacje na Tablicy Dowodów) */
  linkedEntryIds?: string[];
  /** Status weryfikacji hipotezy lub dowodu */
  hypothesisStatus?: 'unverified' | 'confirmed' | 'disproven';
  /** Opcjonalny adres URL obrazka / ilustracji wpisu */
  imageUrl?: string;
  /** Prompt użyty do wygenerowania obrazu */
  imagePrompt?: string;
  /** Status asynchronicznego generowania ilustracji */
  imageStatus?: 'pending' | 'ready' | 'failed';
}

// === SYSTEM EKWIPUNKU (CoC 7e) ===

export type EquipmentCategory =
  | 'weapon' // Broń (pistolety, noże, maczety)
  | 'armor' // Ochrona (kamizelki, hełmy)
  | 'tool' // Narzędzia (latarka, lina, wytrych)
  | 'document' // Dokumenty (listy, mapy, dzienniki)
  | 'artifact' // Artefakty mythos (amulety, księgi)
  | 'personal' // Przedmioty osobiste (zegarek, obrączka)
  | 'medical' // Medyczne (apteczka, morfina)
  | 'occult'; // Okultystyczne (świece, kreda, kadzidło)

/** Profil wizualny, według którego wybieramy lokalny render katalogowy. */
export type EquipmentVisualEra =
  | '1890s'
  | '1920s'
  | '1940s'
  | 'prl-1970s'
  | 'modern';

/** Pochodzenie grafiki przypisanej do konkretnego egzemplarza przedmiotu. */
export type EquipmentVisualSource = 'catalog' | 'generated' | 'fallback';

/** Zwykły przedmiot nie może dostać estetyki Mythos tylko przez klimat sesji. */
export type EquipmentVisualTreatment = 'mundane' | 'supernatural';

/**
 * Niezmienny wzorzec katalogowy. `EquipmentItem.id` dalej identyfikuje fizyczny
 * egzemplarz należący do postaci, a `id` szablonu opisuje jego typ i assety.
 */
export interface EquipmentTemplate {
  id: string;
  name: string;
  aliases: string[];
  category: EquipmentCategory;
  description?: string;
  visualTreatment: EquipmentVisualTreatment;
  availableIn: EquipmentVisualEra[];
  assetPaths?: Partial<Record<EquipmentVisualEra | 'shared', string>>;
}

export interface EquipmentModifiers {
  skill?: string; // Umiejętność na którą wpływa (np. "First Aid")
  bonus?: number; // Bonus do testu (np. +20)
  damage?: string; // Obrażenia broni (np. "1d6+2")
  range?: string; // Zasięg broni (np. "50 yards")
  malfunction?: number; // Awaria na (np. 100 = jam on 100)
  sanLoss?: string; // Strata SAN przy czytaniu (np. "1d4/1d8")
}

export type DocumentSubType =
  | 'press_pass' // Legitymacja prasowa
  | 'id_card' // Dowód tożsamości / legitymacja służbowa
  | 'evidence_envelope' // Koperta / teczka na dowody policyjne
  | 'letter' // List osobisty / telegram
  | 'newspaper' // Artykuł / wycinek z prasowy
  | 'official_document' // Oficjalne pismo rządowe / urzędowe
  | 'journal_page'; // Pamiętnik / notatka ręczna

export interface EquipmentItem {
  id: string;
  /** Stabilny identyfikator wzorca katalogowego, jeśli ten egzemplarz go ma. */
  templateId?: string;
  name: string;
  category: EquipmentCategory;
  description?: string;

  // Mechanika CoC
  modifiers?: EquipmentModifiers;

  // Metadane
  weight?: number; // Waga w funtach
  value?: number; // Wartość w dolarach 1920s
  condition?: 'new' | 'used' | 'damaged' | 'broken';
  source?: 'starting' | 'acquired' | 'found';
  obtainedAt?: Date;

  // Obraz i Multimedia
  imageUrl?: string;
  imagePrompt?: string; // Zachowany wzbogacony prompt do regeneracji
  visualSource?: EquipmentVisualSource;
  visualTreatment?: EquipmentVisualTreatment;
  audioUrl?: string; // Opcjonalny URL nagrania audio / pliku .mp3
  mapUrl?: string; // Opcjonalny URL pliku z mapą
  isMap?: boolean; // Czy przedmiot jest mapą
  // Czytelne przedmioty fabularne
  isReadable?: boolean; // Czy przedmiot posiada tekst do przeczytania (np. list, pamietnik)
  readableContent?: string; // Wygenerowana lub predefiniowana tresc diegetyczna dokumentu
  readableContentStatus?: 'none' | 'generating' | 'ready' | 'error'; // Status asynchronicznego generowania
  documentType?: DocumentSubType; // Dedykowany podtyp rekwizytu diegetycznego
}

// === SYSTEM ROZWOJU POSTACI (CoC 7e) ===

/**
 * Dane umiejętności z obsługą oznaczania do rozwoju
 * Zgodne z zasadami Call of Cthulhu 7th Edition
 */
export interface SkillData {
  value: number; // Wartość procentowa (0-99)
  markedForImprovement: boolean; // Czy oznaczona do rozwoju (udany test bez Luck)
  lastUsedSuccessfully?: Date; // Kiedy ostatnio udany test
  improvementHistory?: {
    // Historia rozwoju tej umiejętności
    date: Date;
    oldValue: number;
    newValue: number;
    method: 'development_phase' | 'training' | 'study' | 'special';
    rollValue?: number; // Wynik rzutu D100 (dla development_phase)
    improvementRoll?: number; // Wynik rzutu D10 (ile punktów dodano)
  }[];
}

/**
 * Typ umiejętności - wspiera zarówno stary format (number) jak i nowy (SkillData)
 * Dla wstecznej kompatybilności z istniejącymi postaciami
 */
export type SkillValue = number | SkillData;

/**
 * Helper do pobierania wartości umiejętności niezależnie od formatu
 */
export function getSkillValue(skill: SkillValue | undefined): number {
  if (skill === undefined) return 0;
  if (typeof skill === 'number') return skill;
  return skill.value;
}

/**
 * Helper do sprawdzenia czy umiejętność jest oznaczona do rozwoju
 */
export function isSkillMarked(skill: SkillValue | undefined): boolean {
  if (skill === undefined) return false;
  if (typeof skill === 'number') return false;
  return skill.markedForImprovement;
}

export interface Character {
  id: string;
  /** Identyfikator wzorca, jeśli postać powstała z gotowego badacza. */
  sourcePresetId?: string;
  name: string;
  // Cechy podstawowe (według CoC7)
  str: number; // Siła
  dex: number; // Zręczność
  con: number; // Kondycja
  app: number; // Wygląd
  pow: number; // Siła Woli
  edu: number; // Wykształcenie
  siz: number; // Budowa Ciała
  int: number; // Inteligencja
  luck: number; // Szczęście

  // Cechy pochodne (obliczane automatycznie)
  hp: number; // Punkty Życia
  san: number; // Punkty Rozsądku
  mp: number; // Punkty Magii

  // Umiejętności zawodowe (według CoC7)
  // Wspiera zarówno stary format (number) jak i nowy (SkillData) dla wstecznej kompatybilności
  skills: { [key: string]: SkillValue };

  // Dodatkowe informacje
  occupation: string;
  age: number;
  background: string;

  // Informacje o graczu (dla lokalnej gry przy stole)
  playerName: string; // Imię gracza
  campaignId?: string; // ID kampanii do której należy postać
  isActive: boolean; // Czy postać jest aktualnie aktywna w grze
  lastUsed: Date; // Kiedy ostatnio używana
  notes: string; // Notatki gracza o postaci

  // System levelowania
  experience: {
    totalXP: number; // Całkowite doświadczenie
    availableXP: number; // Dostępne do wydania
    earnedThisSession: number; // Zdobyte w tej sesji
    maxEarnedThisSession: number; // Limit na sesję
  };

  // Śledzenie Luck zużytego w sesji (dla systemu oznaczania umiejętności)
  // Sukces z użyciem Luck NIE oznacza umiejętności do rozwoju
  luckSpentThisSession?: number;

  // Czas rozpoczęcia aktualnej sesji
  sessionStartTime?: Date;

  // Historia rozwoju
  developmentHistory: {
    id: string;
    timestamp: Date;
    type: 'skill' | 'attribute' | 'new_skill' | 'special';
    target: string; // Nazwa umiejętności/cechy
    oldValue: number;
    newValue: number;
    xpCost: number;
    description: string;
  }[];

  // Ekwipunek postaci
  equipment?: EquipmentItem[];

  // Ekonomia CoC 7e (RAW) - zamożność wynika z umiejętności "Majętność" (Credit Rating).
  // Spending Level/Cash/Assets wyliczane z CR przez lib/economy/credit-rating.ts;
  // poniższe pola to opcjonalne override'y wpisane ręcznie na karcie.
  cash?: number; // Gotówka pod ręką ($)
  assets?: string; // Opisowy majątek (np. "Dom w Arkham, samochód")

  journal?: JournalEntry[];
  investigatorBoard?: InvestigatorBoardState;

  // Pochodne - maksymalne wartości
  maxHp?: number;
  maxSan?: number;
  maxMp?: number;
  move?: number;
  damageBonus?: string;
  build?: number;

  // Dane dodatkowe dla karty postaci
  portraitUrl?: string;
  gender?: 'male' | 'female';
  residence?: string;
  birthplace?: string;
  occupationalSkills?: string[];

  // Historia postaci (z kreatora)
  ideology?: string;
  significantPerson?: string;
  meaningfulLocation?: string;
  treasuredPossession?: string;
  traits?: string[];
  backstory?: string;
  description?: string; // Krótki opis postaci (wygląd, osobowość)
  characterConcept?: string; // Koncept postaci z kreatora (archetyp, motywacja)

  // === ROZSZERZONE SEKCJE (TODO.md: Widok Karty Postaci) ===

  // Ważne osoby (z avatarami) - NPC/postacie z życia postaci
  importantPeople?: Array<{
    id: string;
    name: string;
    relationship: string; // "matka", "mentor", "wróg", "przyjaciel"
    description?: string;
    status: 'alive' | 'dead' | 'unknown' | 'missing';
    avatarUrl?: string;
    notes?: string;
  }>;

  // Znaczące miejsca z historii postaci
  significantPlaces?: Array<{
    id: string;
    name: string;
    type: 'birthplace' | 'home' | 'work' | 'memory' | 'trauma' | 'other';
    description?: string;
    imageUrl?: string;
    visited?: boolean;
  }>;

  // Cenne przedmioty (z głębszym znaczeniem niż zwykły ekwipunek)
  valuableItems?: Array<{
    id: string;
    name: string;
    significance: string; // Dlaczego jest ważny
    origin?: string; // Skąd pochodzi
    imageUrl?: string;
  }>;

  // Cechy charakteru (do wykorzystania w narracji szaleństwa)
  characterTraits?: {
    phobias: string[]; // Fobie (mogą być eksploatowane przy utracie poczytalności)
    manias: string[]; // Manie
    beliefs: string[]; // Głębokie przekonania
    habits: string[]; // Nawyki
    quirks: string[]; // Dziwactwa
    secrets: string[]; // Sekrety (tylko dla gracza/MG)
  };
}

// System kampanii dla lokalnej gry przy stole
export interface Campaign {
  id: string;
  name: string;
  description: string;
  scenario: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  characters: string[]; // ID postaci w kampanii
  currentSession: string; // ID aktualnej sesji
  gmNotes: string; // Notatki mistrza gry
}

// Stan aktywnej gry
export interface ActiveGameState {
  currentCharacter: Character | null;
  campaign: Campaign | null;
  session: GameSession | null;
  players: {
    characterId: string;
    playerName: string;
    isPresent: boolean;
  }[];
}

// Sesja gry (rozszerzenie istniejącego)
export interface GameSession {
  id: string;
  name: string;
  date: Date;
  character: Character;
  messages: Message[];
  adventureText: string;
  notes: string;
  status: 'active' | 'paused' | 'completed';
  campaignId?: string; // NOWE: ID kampanii
  participants: string[]; // NOWE: Lista graczy w sesji
}

// NPC dla menedżera GM
export interface NPC {
  id: string;
  name: string;
  type: 'friendly' | 'neutral' | 'hostile' | 'monster';
  occupation: string;

  // Statystyki CoC7
  str: number;
  dex: number;
  con: number;
  app: number;
  pow: number;
  edu: number;
  siz: number;
  int: number;
  luck: number;

  // Cechy pochodne
  hp: number;
  maxHp: number;
  san: number;
  maxSan: number;
  mp: number;
  maxMp: number;

  // Umiejętności
  skills: { [key: string]: number };

  // Dodatkowe informacje
  description: string;
  appearance: string;
  personality: string;
  motivations: string;
  relationshipWithPlayer: string;
  location: string;
  locationId?: string; // ID lokacji z menedżera lokacji

  // Status i efekty
  status: 'alive' | 'dead' | 'unknown';
  statusEffects: Array<{
    id: string;
    name: string;
    type: 'injury' | 'disease' | 'madness' | 'other';
    description: string;
    timestamp: Date;
  }>;

  // Portret
  portraitUrl?: string;
  portraitGenerated?: boolean;
  portraitCacheId?: string; // ID w IndexedDB cache (persistentMediaCache)

  // Głos NPC (persystentna konfiguracja)
  voiceConfig?: {
    voiceId: string; // ID głosu Google TTS
    voiceName?: string; // Nazwa dla UI
    pitch?: number; // Pitch (-20 to 20)
    rate?: number; // Speed (0.25 to 4.0)
    languageCode?: string; // np. 'pl-PL'
  };

  // Tagi i kategorie
  tags: string[]; // np. "Świadek", "Sprzymierzeniec", "Antagonista"

  // Notatki GM
  gmNotes: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  sessionId?: string; // ID sesji w której był użyty

  // Historia zmian
  changeHistory: Array<{
    id: string;
    timestamp: Date;
    type: 'stat' | 'status' | 'skill' | 'other';
    field: string;
    oldValue: unknown;
    newValue: unknown;
    reason: string;
  }>;
}

// Lokacja dla menedżera GM
export interface Location {
  id: string;
  name: string;
  type: 'city' | 'building' | 'wilderness' | 'laboratory' | 'temple' | 'other';
  era: '1920s' | '1930s' | 'modern' | 'other';

  // Opis
  description: string;
  appearance: string;
  atmosphere: string;

  // Lokalizacja geograficzna
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };

  // Powiązania
  connectedLocations: string[]; // ID innych lokacji
  npcs: string[]; // ID NPC przypisanych do lokacji
  items: Array<{
    id: string;
    name: string;
    description: string;
    hidden: boolean; // Czy przedmiot jest ukryty
  }>;

  // Tajemnice
  secrets: Array<{
    id: string;
    title: string;
    description: string;
    discovered: boolean;
    requirements?: string; // Co jest potrzebne do odkrycia
  }>;

  // Mapa/ilustracja
  mapUrl?: string;
  mapGenerated?: boolean;
  imageCacheId?: string; // ID w IndexedDB cache (persistentMediaCache)

  // Dźwięki otoczenia (cache SFX)
  ambientSfx?: Array<{
    id: string;
    prompt: string; // Opis dźwięku do wygenerowania
    cacheId?: string; // ID w IndexedDB cache
    volume?: number; // Głośność (0-100)
    loop?: boolean; // Czy zapętlać
  }>;

  // Notatki GM
  gmNotes: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastVisited?: Date;
  visitedByPlayer: boolean;
  discoveryRequirements?: string; // Warunki odkrycia lokacji
}

// === HOT SEAT MULTIPLAYER ===

// Gracz w trybie Hot Seat
export interface HotSeatPlayer {
  id: string;
  name: string;
  color: string; // Kolor UI dla odróżnienia graczy (np. '#4ade80', '#f472b6')
  characterId: string; // ID powiązanej postaci
  isActive: boolean; // Czy to aktywny gracz
  turnCount: number; // Liczba wykonanych tur
}

// Konfiguracja trybu Hot Seat
export interface HotSeatConfig {
  enabled: boolean;
  adventureJournalId?: string; // Stabilny identyfikator dziennika tego przebiegu
  players: HotSeatPlayer[];
  activePlayerIndex: number;
  allowInterruptions: boolean; // Czy gracze mogą się przerywać
  showPlayerIndicator: boolean; // Pokaż kto obecnie gra
}

// Stan Hot Seat w sesji
export interface HotSeatState {
  config: HotSeatConfig;
  sessionStartTime: Date;
  switchCount: number; // Ile razy zmieniono gracza
}

// === SKILL TEST CARD SYSTEM ===

// Modyfikator testu (kość bonusowa/karna)
export interface SkillTestModifier {
  type: 'bonus' | 'penalty';
  reason: string;
  count: number; // liczba kości (1 lub 2)
}

// Dane testu umiejętności (parsowane z odpowiedzi AI)
export interface SkillTestData {
  id: string;
  skillName: string;
  skillValue: number; // wartość z karty postaci
  difficulty: 'zwykly' | 'trudny' | 'ekstremalny';
  modifiers: SkillTestModifier[];
  justification: string; // fabularny opis sytuacji
  characterName?: string; // adresat testu w duecie
  characterId?: string; // ID rozwiązane z rosteru sesji
  groupId?: string; // testy z jednej odpowiedzi MG
}

// Aktywny test oczekujący na wynik gracza
export interface ActiveSkillTest {
  id: string;
  skillName: string;
  skillValue: number;
  threshold: number; // Obliczony próg (np. 22 dla trudnego przy 45%)
  bonusDice: number; // Bilans kości (-2 do +2)
  difficulty: 'zwykly' | 'trudny' | 'ekstremalny';
  createdAt: Date;
}

// === CUTSCENE SYSTEM (Auto-GM) ===

// Segment cutscenki (jeden akapit narracji)
export interface CutsceneSegment {
  id: string;
  text: string; // Tekst narracji
  imagePrompt?: string; // Prompt do generowania obrazu
  imageUrl?: string; // Wygenerowany obraz
  duration?: number; // Czas wyświetlania (ms) - auto jeśli TTS
  voiceUrl?: string; // URL audio TTS
}

// Stan aktywnej cutscenki
export interface CutsceneState {
  isActive: boolean;
  segments: CutsceneSegment[];
  currentIndex: number;
  isPaused: boolean;
  isMuted: boolean;
}

// === PDF MEMORY & ADVENTURE CONTEXT ===

export interface PdfMemory {
  rulesUrl?: string;
  adventureUrl?: string;
  rulesFileName?: string;
  adventureFileName?: string;
  isProcessing?: boolean;
}

export interface AdventureContext {
  id?: string;
  title: string;
  isCustom?: boolean;

  // Metadata
  era?: 'classic' | 'gaslight' | 'noir' | 'prl' | 'modern' | 'custom';
  eraLabel?: string;
  yearRange?: string;
  location?: string;
  country?: string;
  tone?: 'purist' | 'pulp' | 'noir';
  themes?: string[];

  // Content
  hook?: string;
  description?: string;

  // Files
  geminiFileUri?: string;
  fileUrl?: string;

  // Dynamic Setup & Conflicts (Bunkry Nieliniowości z poradników)
  conflicts?: AdventureConflict[];
  setupAsymmetry?: {
    rumors: string[];         // Lista sprzecznych plotek rozdawanych postaciom
    characterHooks: Array<{ characterId: string; personalHook: string }>;
  };
}

export interface ConflictFaction {
  id: string;
  name: string;
  description: string;
  goal: string;         // Czego pożąda w konflikcie
  motivation: string;   // Dlaczego (motywacja)
}

export interface AdventureConflict {
  factions: ConflictFaction[]; // Min. 2 sprzeczne strony
  resource: string;            // Wspólny punkt zderzenia (np. las, przedmiot, wiedza)
}

