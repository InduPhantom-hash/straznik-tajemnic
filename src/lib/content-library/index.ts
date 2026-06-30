// ============================================================
// CONTENT LIBRARY INDEX - Re-exports all content modules
// ============================================================

// Types
export type {
    NPCArchetype,
    MythosCreature,
    ContentLocation,
    ScenarioHook,
    RandomEvent,
    MythosBook,
    MythosBookFragment,
    SessionTemplate,
    AmbientSound,
    PolishCreature,
    PolishLocation,
    PolishFolklore
} from './types';

// Re-export Location alias for backward compatibility
export type { ContentLocation as Location } from './types';

// Data exports
export { NPC_ARCHETYPES } from './npc-archetypes';
export { MYTHOS_CREATURES } from './mythos-creatures';
export { LOCATIONS } from './locations';
export { SCENARIO_HOOKS, getRandomScenarioHook, generateScenarioIntro } from './scenario-hooks';
export {
    RANDOM_EVENTS,
    MYTHOS_BOOKS,
    POLISH_FOLKLORE,
    SESSION_TEMPLATES,
    AMBIENT_SOUNDS,
    getRandomEvent,
    getRandomBookFragment,
    calculateStudyProgress,
    getRandomSessionTemplate,
    formatSessionTemplate,
    getAmbientSoundForLocation
} from './random-tables';

// Default export with all data and functions
import { NPC_ARCHETYPES } from './npc-archetypes';
import { MYTHOS_CREATURES } from './mythos-creatures';
import { LOCATIONS } from './locations';
import { SCENARIO_HOOKS, getRandomScenarioHook, generateScenarioIntro } from './scenario-hooks';
import {
    RANDOM_EVENTS,
    MYTHOS_BOOKS,
    POLISH_FOLKLORE,
    SESSION_TEMPLATES,
    AMBIENT_SOUNDS,
    getRandomEvent,
    getRandomBookFragment,
    calculateStudyProgress,
    getRandomSessionTemplate,
    formatSessionTemplate,
    getAmbientSoundForLocation
} from './random-tables';

export default {
    NPC_ARCHETYPES,
    MYTHOS_CREATURES,
    LOCATIONS,
    SCENARIO_HOOKS,
    RANDOM_EVENTS,
    POLISH_FOLKLORE,
    MYTHOS_BOOKS,
    SESSION_TEMPLATES,
    AMBIENT_SOUNDS,
    getRandomBookFragment,
    calculateStudyProgress,
    getRandomScenarioHook,
    generateScenarioIntro,
    getRandomEvent,
    getRandomSessionTemplate,
    formatSessionTemplate,
    getAmbientSoundForLocation
};
