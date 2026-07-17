export interface ParsedEvent {
  type:
    | 'npc'
    | 'location'
    | 'item'
    | 'combat'
    | 'sanity'
    | 'discovery'
    | 'death';
  title: string;
  description: string;
  timestamp: string;
}

export interface CombatState {
  isActive: boolean;
  trigger?: 'start' | 'damage_player' | 'damage_npc' | 'end';
  damage?: number;
  target?: string;
  description?: string;
}

export interface DialogueLine {
  speaker: string; // nazwa NPC lub "narrator"
  text: string;
  emotion?: 'neutral' | 'fear' | 'anger' | 'sadness' | 'joy' | 'mysterious';
  gender?: 'male' | 'female' | 'unknown';
  age?: 'young' | 'middle' | 'old' | 'unknown';
  context?: string; // kontekst przed dialogiem
  contextAfter?: string; // kontekst po dialogu
  audioTags?: string; // audio tags dla ElevenLabs v3 ([whispers], [angrily], etc.)
}

export interface ImageRequest {
  prompt: string;
  style?: 'horror' | 'vintage' | 'realistic' | 'artistic';
  priority?: 'high' | 'normal';
}

export interface SFXRequest {
  presetId?: string; // ID presetu z sfx-presets.ts
  category:
    | 'horror'
    | 'city_1920s'
    | 'nature'
    | 'combat'
    | 'supernatural'
    | 'ambient';
  prompt?: string; // Opis do dynamicznego generowania
  priority: 'high' | 'normal';
}

export interface JournalTagEntry {
  type:
    | 'combat'
    | 'discovery'
    | 'npc'
    | 'sanity'
    | 'clue'
    | 'location'
    | 'ritual'
    | 'death'
    | 'bookmark'
    | 'note';
  title: string;
  content: string;
  inGameDate?: string;
  /** Duet/Hot Seat: imię z prefiksu [DZIENNIK:@Imię:...] - właściciel wpisu (do mapowania na postać). */
  who?: string;
}

// === SYSTEM ROZWOJU COC 7E ===

export interface SkillTestModifier {
  type: 'bonus' | 'penalty';
  reason: string;
  count: number;
}

export interface SkillTestData {
  id: string;
  skillName: string;
  skillValue: number;
  difficulty: 'zwykly' | 'trudny' | 'ekstremalny';
  modifiers: SkillTestModifier[];
  justification: string;
}

export interface TimeUpdate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface SkillTestResult {
  skillName: string; // Nazwa umiejętności
  result: 'critical' | 'extreme' | 'hard' | 'regular' | 'failure' | 'fumble';
  rollValue: number; // Wynik rzutu D100
  threshold: number; // Próg sukcesu
  usedLuck: boolean; // Czy użyto Luck (Szczęścia)
  luckSpent?: number; // Ile Luck wydano
  shouldMark: boolean; // Czy oznaczyć do rozwoju
  reason?: string; // Powód (nie)oznaczenia
}

/** Pozycja tagu [NPC: Imię] w tekście odpowiedzi - do cross-reference z dialogami */
export interface NPCPosition {
  name: string;
  charIndex: number;
}

export interface ParsedResponse {
  events: ParsedEvent[];
  combat: CombatState | null;
  dialogues: DialogueLine[];
  illustrations: ImageRequest[];
  sfx: SFXRequest[];
  journalEntries: JournalTagEntry[];
  skillTests: SkillTestData[];
  skillResults: SkillTestResult[];
  timeUpdate: TimeUpdate | null;
  gmMetadata?: { thoughts?: string; mood?: string; narrativeGoal?: string };
  rawText: string;
}
