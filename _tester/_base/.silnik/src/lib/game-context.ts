/**
 * Game Context Service
 * 
 * System pamięci kontekstowej działający w tle.
 * Zbiera fakty, NPC, lokacje i zapewnia spójność AI.
 * Niewidoczny dla gracza, zintegrowany z save/load.
 */

import { GameTime, GameEra } from './types';

// ============================================================================
// INTERFEJSY
// ============================================================================

export interface KeyFact {
    id: string;
    content: string;           // "Mordercą jest profesor Armitage"
    source: 'ai' | 'player';   // Kto ustalił ten fakt
    category: 'character' | 'plot' | 'location' | 'npc' | 'mystery' | 'item';
    confidence: number;        // 0.0-1.0 pewność faktu
    timestamp: Date;
    mentioned: number;         // Ile razy AI cytowało ten fakt
}

export interface NPCEntry {
    id: string;
    name: string;
    description: string;
    traits: string[];          // ["podejrzliwy", "starszy", "kulawy"]
    occupation?: string;       // "profesor", "kelnerka"
    lastMentioned: Date;
    firstMentioned: Date;
    relationToPC: string;      // "znajomy z uniwersytetu", "podejrzany"
    status: 'alive' | 'dead' | 'unknown' | 'missing';
    locationId?: string;       // Gdzie ostatnio widziano
    dialogueStyle?: string;    // "formalny", "slangowy"
}

export interface LocationEntry {
    id: string;
    name: string;
    description: string;       // Zapisany opis do spójności
    type: 'indoor' | 'outdoor' | 'underground' | 'other';
    atmosphere: string;        // "mroczny", "przytulny"
    visited: boolean;
    visitCount: number;
    firstVisited?: Date;
    lastVisited?: Date;
    connectedNPCs: string[];   // ID NPC związanych z lokacją
    connectedLocations: string[]; // ID połączonych lokacji
    secrets?: string[];        // Ukryte informacje o lokacji
}

export interface TimelineEvent {
    id: string;
    timestamp: Date;
    type: 'discovery' | 'combat' | 'dialogue' | 'travel' | 'sanity' | 'death' | 'other';
    summary: string;
    involvedNPCs: string[];
    locationId?: string;
    importance: 'minor' | 'normal' | 'major' | 'critical';
}

export interface GameContext {
    version: string;
    sessionId: string;
    keyFacts: KeyFact[];
    npcs: NPCEntry[];
    locations: LocationEntry[];
    timeline: TimelineEvent[];
    lastUpdated: Date;

    // Meta info
    totalInteractions: number;
    currentLocationId?: string;

    // Time & Era (Campaign Clock)
    gameTime?: GameTime;
    currentEra?: GameEra;
}

// ============================================================================
// GAME CONTEXT SERVICE
// ============================================================================

const STORAGE_KEY = 'coc7_game_context';
const CONTEXT_VERSION = '1.0.0';

class GameContextService {
    private context: GameContext;
    private listeners: Array<(ctx: GameContext) => void> = [];

    constructor() {
        this.context = this.createEmptyContext();
        this.loadFromStorage();
    }

    // ============================================================================
    // INICJALIZACJA
    // ============================================================================

    private createEmptyContext(): GameContext {
        return {
            version: CONTEXT_VERSION,
            sessionId: `ctx_${Date.now()}`,
            keyFacts: [],
            npcs: [],
            locations: [],
            timeline: [],
            lastUpdated: new Date(),
            totalInteractions: 0,
        };
    }

    private loadFromStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Konwersja dat
                this.context = {
                    ...parsed,
                    lastUpdated: new Date(parsed.lastUpdated),
                    keyFacts: parsed.keyFacts?.map((f: any) => ({
                        ...f,
                        timestamp: new Date(f.timestamp),
                    })) || [],
                    npcs: parsed.npcs?.map((n: any) => ({
                        ...n,
                        lastMentioned: new Date(n.lastMentioned),
                        firstMentioned: new Date(n.firstMentioned),
                    })) || [],
                    locations: parsed.locations?.map((l: any) => ({
                        ...l,
                        firstVisited: l.firstVisited ? new Date(l.firstVisited) : undefined,
                        lastVisited: l.lastVisited ? new Date(l.lastVisited) : undefined,
                    })) || [],
                    timeline: parsed.timeline?.map((t: any) => ({
                        ...t,
                        timestamp: new Date(t.timestamp),
                    })) || [],
                };
                console.log('📚 GameContext loaded:', this.context.keyFacts.length, 'facts,', this.context.npcs.length, 'NPCs');
            }
        } catch (error) {
            console.error('❌ Error loading GameContext:', error);
        }
    }

    private saveToStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            this.context.lastUpdated = new Date();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.context));
            this.notifyListeners();
        } catch (error) {
            console.error('❌ Error saving GameContext:', error);
        }
    }

    // ============================================================================
    // KEY FACTS
    // ============================================================================

    addFact(fact: Omit<KeyFact, 'id' | 'timestamp' | 'mentioned'>): KeyFact {
        const newFact: KeyFact = {
            ...fact,
            id: `fact_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            timestamp: new Date(),
            mentioned: 0,
        };

        // Sprawdź czy podobny fakt już istnieje
        const existingIndex = this.context.keyFacts.findIndex(
            f => f.content.toLowerCase().includes(fact.content.toLowerCase().slice(0, 30))
        );

        if (existingIndex >= 0) {
            // Aktualizuj istniejący
            this.context.keyFacts[existingIndex] = {
                ...this.context.keyFacts[existingIndex],
                confidence: Math.max(this.context.keyFacts[existingIndex].confidence, fact.confidence),
                mentioned: this.context.keyFacts[existingIndex].mentioned + 1,
            };
            this.saveToStorage();
            return this.context.keyFacts[existingIndex];
        }

        this.context.keyFacts.push(newFact);
        this.saveToStorage();
        console.log('📝 New fact added:', newFact.content.slice(0, 50));
        return newFact;
    }

    getFacts(category?: KeyFact['category']): KeyFact[] {
        if (!category) return this.context.keyFacts;
        return this.context.keyFacts.filter(f => f.category === category);
    }

    getRecentFacts(count: number = 10): KeyFact[] {
        return [...this.context.keyFacts]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, count);
    }

    // ============================================================================
    // NPC MANAGEMENT
    // ============================================================================

    addOrUpdateNPC(npc: Omit<NPCEntry, 'id' | 'firstMentioned' | 'lastMentioned'>): NPCEntry {
        const existingIndex = this.context.npcs.findIndex(
            n => n.name.toLowerCase() === npc.name.toLowerCase()
        );

        if (existingIndex >= 0) {
            // Aktualizuj istniejącego NPC
            this.context.npcs[existingIndex] = {
                ...this.context.npcs[existingIndex],
                ...npc,
                lastMentioned: new Date(),
                // Nie nadpisuj firstMentioned
                firstMentioned: this.context.npcs[existingIndex].firstMentioned,
            };
            this.saveToStorage();
            return this.context.npcs[existingIndex];
        }

        // Nowy NPC
        const newNPC: NPCEntry = {
            ...npc,
            id: `npc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            firstMentioned: new Date(),
            lastMentioned: new Date(),
        };

        this.context.npcs.push(newNPC);
        this.saveToStorage();
        console.log('👤 New NPC added:', newNPC.name);
        return newNPC;
    }

    getNPC(nameOrId: string): NPCEntry | undefined {
        return this.context.npcs.find(
            n => n.id === nameOrId || n.name.toLowerCase() === nameOrId.toLowerCase()
        );
    }

    getActiveNPCs(): NPCEntry[] {
        return this.context.npcs.filter(n => n.status === 'alive' || n.status === 'unknown');
    }

    // ============================================================================
    // LOCATION MANAGEMENT
    // ============================================================================

    addOrUpdateLocation(location: Omit<LocationEntry, 'id' | 'firstVisited' | 'lastVisited' | 'visitCount'>): LocationEntry {
        const existingIndex = this.context.locations.findIndex(
            l => l.name.toLowerCase() === location.name.toLowerCase()
        );

        if (existingIndex >= 0) {
            // Aktualizuj istniejącą lokację
            const existing = this.context.locations[existingIndex];
            this.context.locations[existingIndex] = {
                ...existing,
                ...location,
                visitCount: existing.visitCount + (location.visited ? 1 : 0),
                lastVisited: location.visited ? new Date() : existing.lastVisited,
            };
            this.saveToStorage();
            return this.context.locations[existingIndex];
        }

        // Nowa lokacja
        const newLocation: LocationEntry = {
            ...location,
            id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            visitCount: location.visited ? 1 : 0,
            firstVisited: location.visited ? new Date() : undefined,
            lastVisited: location.visited ? new Date() : undefined,
        };

        this.context.locations.push(newLocation);
        this.saveToStorage();
        console.log('📍 New location added:', newLocation.name);
        return newLocation;
    }

    getLocation(nameOrId: string): LocationEntry | undefined {
        return this.context.locations.find(
            l => l.id === nameOrId || l.name.toLowerCase() === nameOrId.toLowerCase()
        );
    }

    getVisitedLocations(): LocationEntry[] {
        return this.context.locations.filter(l => l.visited);
    }

    setCurrentLocation(locationId: string): void {
        this.context.currentLocationId = locationId;
        const loc = this.context.locations.find(l => l.id === locationId);
        if (loc) {
            loc.visited = true;
            loc.visitCount++;
            loc.lastVisited = new Date();
        }
        this.saveToStorage();
    }

    // ============================================================================
    // TIMELINE
    // ============================================================================

    addTimelineEvent(event: Omit<TimelineEvent, 'id' | 'timestamp'>): TimelineEvent {
        const newEvent: TimelineEvent = {
            ...event,
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            timestamp: new Date(),
        };

        this.context.timeline.push(newEvent);
        this.context.totalInteractions++;
        this.saveToStorage();
        return newEvent;
    }

    getRecentTimeline(count: number = 10): TimelineEvent[] {
        return [...this.context.timeline]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, count);
    }

    getImportantEvents(): TimelineEvent[] {
        return this.context.timeline.filter(e => e.importance === 'major' || e.importance === 'critical');
    }

    // ============================================================================
    // CONTEXT PROMPT BUILDER
    // ============================================================================

    buildContextPrompt(): string {
        const facts = this.getRecentFacts(15);
        const npcs = this.getActiveNPCs();
        const locations = this.getVisitedLocations().slice(-5);
        const events = this.getImportantEvents().slice(-5);

        if (facts.length === 0 && npcs.length === 0 && locations.length === 0) {
            return ''; // Brak kontekstu do dodania
        }

        let prompt = `\n## KONTEKST SESJI (POUFNE - NIE POKAZUJ GRACZOWI)\n`;

        if (facts.length > 0) {
            prompt += `\n### Ustalone fakty:\n`;
            prompt += facts.map(f => `- ${f.content}`).join('\n');
        }

        if (npcs.length > 0) {
            prompt += `\n\n### Postacie niezależne (NPC):\n`;
            prompt += npcs.map(n =>
                `- **${n.name}**${n.occupation ? ` (${n.occupation})` : ''}: ${n.description.slice(0, 80)}${n.traits.length ? ` [${n.traits.join(', ')}]` : ''}`
            ).join('\n');
        }

        if (locations.length > 0) {
            prompt += `\n\n### Odwiedzone lokacje:\n`;
            prompt += locations.map(l =>
                `- **${l.name}**: ${l.description.slice(0, 60)}...`
            ).join('\n');
        }

        if (events.length > 0) {
            prompt += `\n\n### Kluczowe wydarzenia:\n`;
            prompt += events.map(e => `- ${e.summary}`).join('\n');
        }

        prompt += `\n\n**ZASADY SPÓJNOŚCI:**
1. Nie zmieniaj ustalonych faktów
2. NPC zachowują się zgodnie z zapisanymi cechami
3. Lokacje wyglądają tak jak opisałeś wcześniej
4. Nawiązuj do wcześniejszych wydarzeń gdy to naturalne\n`;

        return prompt;
    }

    // ============================================================================
    // IMPORT/EXPORT (dla save/load)
    // ============================================================================

    exportContext(): GameContext {
        return JSON.parse(JSON.stringify(this.context));
    }

    importContext(ctx: GameContext): void {
        this.context = {
            ...ctx,
            lastUpdated: new Date(ctx.lastUpdated),
            keyFacts: ctx.keyFacts?.map(f => ({
                ...f,
                timestamp: new Date(f.timestamp),
            })) || [],
            npcs: ctx.npcs?.map(n => ({
                ...n,
                lastMentioned: new Date(n.lastMentioned),
                firstMentioned: new Date(n.firstMentioned),
            })) || [],
            locations: ctx.locations?.map(l => ({
                ...l,
                firstVisited: l.firstVisited ? new Date(l.firstVisited) : undefined,
                lastVisited: l.lastVisited ? new Date(l.lastVisited) : undefined,
            })) || [],
            timeline: ctx.timeline?.map(t => ({
                ...t,
                timestamp: new Date(t.timestamp),
            })) || [],
        };
        this.saveToStorage();
        console.log('📚 GameContext imported:', this.context.keyFacts.length, 'facts');
    }

    // ============================================================================
    // RESET
    // ============================================================================

    reset(): void {
        this.context = this.createEmptyContext();
        this.saveToStorage();
        console.log('🔄 GameContext reset');
    }

    // ============================================================================
    // LISTENERS
    // ============================================================================

    subscribe(callback: (ctx: GameContext) => void): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(l => l(this.context));
    }

    // ============================================================================
    // GETTERS
    // ============================================================================

    getContext(): GameContext {
        return this.context;
    }

    getStats(): { facts: number; npcs: number; locations: number; events: number } {
        return {
            facts: this.context.keyFacts.length,
            npcs: this.context.npcs.length,
            locations: this.context.locations.length,
            events: this.context.timeline.length,
        };
    }
}

// Singleton export
export const gameContextService = new GameContextService();

// Export types for use in other files
export type { GameContext as GameContextType };
