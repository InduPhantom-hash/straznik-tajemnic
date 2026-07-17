import { ParsedResponse, ParsedEvent, NPCPosition } from './types';
import { extractNPCs, extractLocations, extractItems } from './event-parser';
import { detectCombat, detectSanity, extractSkillTests, extractSkillResults } from './mechanics-parser';
import { extractDialogues } from './dialogue-parser';
import { extractImages, detectSFX } from './media-parser';
import { extractJournalTags } from './journal-parser';

import { extractTimeUpdate } from './time-parser';
import {
    TAG_NPC_PATTERN,
    TAG_LOCATION_PATTERN,
    TAG_ITEM_PATTERN,
    TAG_GM_THOUGHTS_PATTERN,
    TAG_MOOD_PATTERN,
    TAG_NARRATIVE_GOAL_PATTERN,
    TAG_COMBAT_PATTERN,
    TAG_SANITY_PATTERN,
} from './patterns';

export * from './types';
export * from './patterns';
export * from './event-parser';
export * from './mechanics-parser';
export * from './dialogue-parser';
export * from './media-parser';
export * from './journal-parser';
export * from './time-parser';
export * from './text-cleaner';

// ============================================================================
// GM PROTOCOL - TAG-BASED EXTRACTION (Priorytet wysoki)
// ============================================================================

/** Ekstrakcja NPC z tagów [NPC: Imię: Opis] */
function extractTagNPCs(text: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    const regex = new RegExp(TAG_NPC_PATTERN.source, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
        events.push({
            type: 'npc',
            title: match[1].trim(),
            description: match[2].trim(),
            timestamp: new Date().toISOString(),
        });
    }
    return events;
}

/** Ekstrakcja lokacji z tagów [LOKACJA: Nazwa: Opis] */
function extractTagLocations(text: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    const regex = new RegExp(TAG_LOCATION_PATTERN.source, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
        events.push({
            type: 'location',
            title: match[1].trim(),
            description: match[2].trim(),
            timestamp: new Date().toISOString(),
        });
    }
    return events;
}

/** Ekstrakcja przedmiotów z tagów [PRZEDMIOT: Nazwa: Opis] */
function extractTagItems(text: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    const regex = new RegExp(TAG_ITEM_PATTERN.source, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
        events.push({
            type: 'item',
            title: match[1].trim(),
            description: match[2].trim(),
            timestamp: new Date().toISOString(),
        });
    }
    return events;
}

/** Ekstrakcja walki z tagów [WALKA: START/KONIEC] */
function extractTagCombat(text: string): { isActive: boolean; trigger?: 'start' | 'end' } | null {
    const regex = new RegExp(TAG_COMBAT_PATTERN.source, 'gi');
    let match;
    let result: { isActive: boolean; trigger?: 'start' | 'end' } | null = null;
    while ((match = regex.exec(text)) !== null) {
        const value = match[1].toUpperCase();
        if (value === 'START') {
            result = { isActive: true, trigger: 'start' };
        } else if (value === 'KONIEC') {
            result = { isActive: false, trigger: 'end' };
        }
    }
    return result;
}

/** Ekstrakcja utraty poczytalności z tagów [SANITY: -X: powód] */
function extractTagSanity(text: string): ParsedEvent | null {
    const regex = new RegExp(TAG_SANITY_PATTERN.source, 'gi');
    const match = regex.exec(text);
    if (match) {
        return {
            type: 'sanity',
            title: `Utrata poczytalności: ${match[1]} pkt`,
            description: match[2].trim(),
            timestamp: new Date().toISOString(),
        };
    }
    return null;
}

/** Ekstrakcja metadanych GM Protocol (myśli, nastrój, cel) — do logowania/debugowania */
export function extractGMMetadata(text: string): { thoughts?: string; mood?: string; narrativeGoal?: string } {
    const meta: { thoughts?: string; mood?: string; narrativeGoal?: string } = {};

    const thoughtsRegex = new RegExp(TAG_GM_THOUGHTS_PATTERN.source, 'gi');
    const thoughtsMatch = thoughtsRegex.exec(text);
    if (thoughtsMatch) meta.thoughts = thoughtsMatch[1].trim();

    const moodRegex = new RegExp(TAG_MOOD_PATTERN.source, 'gi');
    const moodMatch = moodRegex.exec(text);
    if (moodMatch) meta.mood = moodMatch[1].trim();

    const goalRegex = new RegExp(TAG_NARRATIVE_GOAL_PATTERN.source, 'gi');
    const goalMatch = goalRegex.exec(text);
    if (goalMatch) meta.narrativeGoal = goalMatch[1].trim();

    return meta;
}

/** Ekstrakcja pozycji tagów [NPC: Imię] do cross-reference z dialogami */
function extractNPCPositions(text: string): NPCPosition[] {
    const positions: NPCPosition[] = [];
    const regex = /\[NPC:\s*([^:\]]+)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
        positions.push({ name: match[1].trim(), charIndex: match.index });
    }
    return positions;
}

// === GŁÓWNA FUNKCJA ===

export function parseAIResponse(responseText: string): ParsedResponse {
    const events: ParsedEvent[] = [];

    // === PRIORYTET 1: Tagi GM Protocol (strukturalne) ===
    const tagNPCs = extractTagNPCs(responseText);
    const tagLocations = extractTagLocations(responseText);
    const tagItems = extractTagItems(responseText);
    const tagCombat = extractTagCombat(responseText);
    const tagSanity = extractTagSanity(responseText);

    events.push(...tagNPCs, ...tagLocations, ...tagItems);
    if (tagSanity) events.push(tagSanity);

    // === PRIORYTET 2: Legacy regex (fallback — kompatybilność wsteczna) ===
    // Dodaj legacy events TYLKO jeśli tagi nie wykryły nic w danej kategorii
    if (tagNPCs.length === 0) events.push(...extractNPCs(responseText));
    if (tagLocations.length === 0) events.push(...extractLocations(responseText));
    if (tagItems.length === 0) events.push(...extractItems(responseText));

    // Poczytalność (legacy fallback)
    if (!tagSanity) {
        const sanityEvent = detectSanity(responseText);
        if (sanityEvent) events.push(sanityEvent);
    }

    // Wykrywanie walki (tag > legacy)
    const combat = tagCombat
        ? { isActive: tagCombat.isActive, trigger: tagCombat.trigger as any }
        : detectCombat(responseText);

    // Ekstrakcja dialogów (z NPC position cross-reference dla lepszej atrybucji)
    const npcPositions = extractNPCPositions(responseText);
    const dialogues = extractDialogues(responseText, npcPositions);

    // Ekstrakcja ilustracji
    const illustrations = extractImages(responseText);

    // Ekstrakcja efektów dźwiękowych (SFX)
    const sfx = detectSFX(responseText, combat);

    // Ekstrakcja wpisów dziennika oznaczonych przez AI
    const journalEntries = extractJournalTags(responseText);

    // NOWE: Ekstrakcja testów umiejętności
    const skillTests = extractSkillTests(responseText);

    // NOWE: Ekstrakcja wyników testów (dla systemu rozwoju CoC 7e)
    const skillResults = extractSkillResults(responseText);

    // Ekstrakcja czasu gry
    const timeUpdate = extractTimeUpdate(responseText);

    // Extract GM metadata (for Director's State persistence + debug)
    const gmMeta = extractGMMetadata(responseText);
    if (gmMeta.thoughts || gmMeta.mood || gmMeta.narrativeGoal) {
        console.log('🎭 GM Protocol:', {
            mood: gmMeta.mood,
            goal: gmMeta.narrativeGoal,
            thoughts: gmMeta.thoughts?.slice(0, 80) + '...',
        });
    }

    return {
        events,
        combat,
        dialogues,
        illustrations,
        sfx,
        journalEntries,
        skillTests,
        skillResults,
        timeUpdate,
        gmMetadata: (gmMeta.thoughts || gmMeta.mood || gmMeta.narrativeGoal) ? gmMeta : undefined,
        rawText: responseText,
    };
}

