// ============================================================
// CONTENT LIBRARY TYPES - Typy używane w bibliotece treści
// ============================================================

/**
 * Archetyp NPC dla Call of Cthulhu
 */
export interface NPCArchetype {
    id: string;
    name: string;
    type: 'witness' | 'suspect' | 'cultist' | 'victim' | 'skeptic' | 'ally' | 'contact';
    personality: string;
    appearance: string[];
    speechPatterns: string[];
    motivations: string[];
    secrets?: string[];
    conversationLevers: {
        money?: string;
        protection?: string;
        empathy?: string;
        threat?: string;
        knowledge?: string;
    };
    sampleDialogue: string[];
    illustrationTags: string[];
}

/**
 * Statystyki bojowe istoty Mitów Cthulhu (CoC 7e)
 */
export interface CreatureCombatStats {
    str: number;
    con: number;
    siz: number;
    dex: number;
    int: number;
    pow: number;
    hp: number;
    mp: number;
    armor: number;
    movement: number;
    attacks: CreatureAttack[];
    specialAbilities?: string[];
    dodgeValue?: number;
}

export interface CreatureAttack {
    name: string;
    skill: number;       // wartość % testu
    damage: string;      // np. '1d6+db', '2d6'
    attacksPerRound: number;
    description?: string;
}

/**
 * Istota Mitów Cthulhu
 */
export interface MythosCreature {
    id: string;
    name: string;
    alternativeNames: string[];
    type: 'servitor' | 'greater' | 'outer_god' | 'great_old_one' | 'independent';
    sanLoss: string;
    combatStats?: CreatureCombatStats;
    firstGlimpse: string[];
    fullDescription: string[];
    atmospheric: string[];
    behaviors: string[];
    weaknesses?: string[];
    associatedCults?: string[];
    illustrationTags: string[];
}

/**
 * Lokacja w grze - uwaga: różni się od Location w types.ts!
 */
export interface ContentLocation {
    id: string;
    name: string;
    type: 'building' | 'outdoor' | 'underground' | 'coastal' | 'urban';
    era: '1920s' | '1930s' | 'timeless';
    sights: string[];
    sounds: string[];
    smells: string[];
    touches: string[];
    atmosphere: string[];
    secrets: string[];
    dangers: string[];
    clues: string[];
    illustrationTags: string[];
    spotifyPlaylist?: string;
}

/**
 * Hak scenariuszowy
 */
export interface ScenarioHook {
    id: string;
    title: string;
    category: 'inheritance' | 'mystery' | 'supernatural' | 'social' | 'academic' | 'occult';
    era: '1920s' | '1930s' | 'timeless';
    location: string;
    hook: string;
    openingScene: string;
    suggestedNPCs: string[];
    keyLocations: string[];
    initialClues: string[];
    redHerrings?: string[];
    potentialDevelopments: string[];
    climaxSuggestions: string[];
    suggestedSkills: string[];
    estimatedSAN: string;
    difficulty: 'purist' | 'pulp' | 'either';
}

/**
 * Losowe wydarzenie
 */
export interface RandomEvent {
    id: string;
    category: 'atmospheric' | 'complication' | 'clue' | 'horror' | 'social';
    title: string;
    description: string;
    timeOfDay?: 'day' | 'night' | 'either';
    mechanicalEffect?: string;
}

/**
 * Fragment księgi Mitów
 */
export interface MythosBookFragment {
    id: string;
    title: string;
    content: string;
    sanCost?: string;
    revealedSecrets?: string[];
}

/**
 * Księga Mitów Cthulhu
 */
export interface MythosBook {
    id: string;
    name: string;
    originalTitle?: string;
    author?: string;
    language: 'polish' | 'english' | 'latin' | 'arabic' | 'ancient' | 'unknown';
    era: string;
    rarity: 'common' | 'rare' | 'unique';
    studyTime: {
        initial: string;
        full: string;
        hoursPerDay?: number;
    };
    effects: {
        sanLoss: string;
        cthulhuMythosGain: string;
        spellsContained: string[];
    };
    physicalDescription: string;
    reputation: string;
    fragments: MythosBookFragment[];
    illustrationTags: string[];
}

/**
 * Szablon sesji
 */
export interface SessionTemplate {
    id: string;
    type: 'intro' | 'outro' | 'cliffhanger' | 'time_passage' | 'checkpoint';
    title: string;
    text: string;
    atmosphere?: string;
    followUp?: string;
}

/**
 * Dźwięk otoczenia
 */
export interface AmbientSound {
    id: string;
    locationType: string;
    keywords: string[];
    prompt: string;
    duration: number;
    loopable: boolean;
}

/**
 * Polski folklor - stworzenie
 */
export interface PolishCreature {
    name: string;
    description: string;
    sanLoss: string;
    weakness: string;
}

/**
 * Polski folklor - lokacja
 */
export interface PolishLocation {
    name: string;
    setting: string;
    features: string[];
}

/**
 * Polski folklor - zbiór
 */
export interface PolishFolklore {
    creatures: PolishCreature[];
    locations: PolishLocation[];
    handoutNewspapers: string[];
}
