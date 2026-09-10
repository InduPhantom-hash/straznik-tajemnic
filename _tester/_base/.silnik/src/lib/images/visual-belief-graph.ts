/**
 * visual-belief-graph.ts
 *
 * Visual Belief Graph (Graf Przekonań Wizualnych) dla silnika Strażnika Tajemnic AI.
 * Zainspirowany podejściem Google DeepMind (google-deepmind/proactive_t2i_agents).
 *
 * Odpowiada za:
 * 1. Śledzenie stałych cech wizualnych Badacza (Visual DNA) i kluczowych NPC (wiek, postura, ubiór z epoki, znaki szczególne).
 * 2. Śledzenie dynamicznego stanu lokacji (pora dnia, oświetlenie, ślady zniszczeń, ślady Mitów).
 * 3. Enkodowanie i persystencję grafu w pamięci sesji (unikanie dryfu portretów i anachronizmów).
 */

import type { Character, NPC } from '../types';

export interface CharacterVisualProfile {
  id: string;
  name: string;
  isPlayer: boolean;
  age?: number;
  gender?: string;
  occupation?: string;
  apparentEraStyle?: string;
  faceFeatures?: string;
  clothing?: string;
  hairAndGrooming?: string;
  distinguishingMarks?: string; // blizny, okulary, laska, znamiona
  palette?: string; // dominujące kolory (np. ciemny tweed, zgaszony brąz)
  visualDnaPrompt: string; // skonsolidowany anchor do wstrzyknięcia do promptu
}

export interface LocationVisualState {
  locationName: string;
  lighting?: string; // lampa naftowa, mroczny zaułek, jarzeniówka
  atmosphere?: string; // mgła, deszcz, duszny zaduch
  battleDamage?: string; // ślady kul, potłuczone szkło, krew
  mythosCorruption?: string; // śluz, obce symbole, powyginana geometria
  visitedCount: number;
  lastAnchorPrompt?: string;
}

export interface VisualBeliefGraphState {
  version: 1;
  characters: Record<string, CharacterVisualProfile>;
  locations: Record<string, LocationVisualState>;
  currentLocationName?: string;
  effectiveYear?: string;
}

function sanitizeText(input?: string): string {
  if (!input) return '';
  return input.replace(/\[/g, '(').replace(/\]/g, ')').replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Buduje spójny Visual DNA profilu postaci na podstawie karty Badacza.
 */
export function extractPlayerVisualProfile(char: Character, era: string = '1920s'): CharacterVisualProfile {
  const parts: string[] = [];

  const ageStr = char.age ? `${char.age}-year-old` : '30-year-old';
  const genderStr = char.gender ? (char.gender === 'female' ? 'woman' : 'man') : 'individual';
  const occStr = char.occupation ? char.occupation.toLowerCase() : 'investigator';

  parts.push(`${ageStr} ${genderStr}, ${occStr}`);

  if (char.appearance && char.appearance.trim()) {
    parts.push(sanitizeText(char.appearance.trim()));
  }

  if (char.scars && char.scars.length > 0) {
    parts.push(`visible scars: ${sanitizeText(char.scars.slice(0, 2).join(', '))}`);
  }

  // Wstrzyknij stałe akcesoria lub ubiór z epoki
  parts.push(`period-accurate authentic ${era} attire`);

  const visualDna = parts.join(', ');

  return {
    id: char.id,
    name: sanitizeText(char.name),
    isPlayer: true,
    age: char.age,
    gender: char.gender,
    occupation: char.occupation,
    apparentEraStyle: era,
    distinguishingMarks: char.scars ? sanitizeText(char.scars.join(', ')) : undefined,
    visualDnaPrompt: visualDna,
  };
}

/**
 * Buduje Visual DNA profilu NPC na podstawie encji NPC.
 */
export function extractNPCVisualProfile(npc: NPC, era: string = '1920s'): CharacterVisualProfile {
  const parts: string[] = [];

  const desc = npc.description || '';
  const appearance = npc.appearance || '';
  const physiological = npc.physiologicalDetail || '';

  parts.push(`${sanitizeText(npc.name)}, ${sanitizeText(npc.occupation) || 'person'}`);

  if (appearance.trim()) {
    parts.push(sanitizeText(appearance.trim()));
  } else if (physiological.trim()) {
    parts.push(sanitizeText(physiological.trim()));
  } else if (desc.trim()) {
    parts.push(sanitizeText(desc.slice(0, 120).trim()));
  }

  parts.push(`authentic ${era} period clothing and demeanor`);

  return {
    id: npc.id || npc.name,
    name: sanitizeText(npc.name),
    isPlayer: false,
    occupation: npc.occupation,
    apparentEraStyle: era,
    visualDnaPrompt: parts.join(', '),
  };
}

/**
 * Klasa zarządzająca grafem przekonań wizualnych (Visual Belief Graph).
 */
export class VisualBeliefGraph {
  private state: VisualBeliefGraphState;

  constructor(initialState?: Partial<VisualBeliefGraphState>) {
    this.state = {
      version: 1,
      characters: {},
      locations: {},
      ...initialState,
    };
  }

  public getState(): VisualBeliefGraphState {
    return this.state;
  }

  public setEffectiveYear(year: string): void {
    this.state.effectiveYear = year;
  }

  public registerPlayer(char: Character, era: string = '1920s'): void {
    const profile = extractPlayerVisualProfile(char, era);
    this.state.characters[char.name.toLowerCase()] = profile;
    this.state.characters[char.id] = profile;
  }

  public registerNPC(npc: NPC, era: string = '1920s'): void {
    const profile = extractNPCVisualProfile(npc, era);
    this.state.characters[npc.name.toLowerCase()] = profile;
    if (npc.id) {
      this.state.characters[npc.id] = profile;
    }
  }

  public getCharacterProfile(nameOrId: string): CharacterVisualProfile | undefined {
    return this.state.characters[nameOrId.toLowerCase()] || this.state.characters[nameOrId];
  }

  public updateLocation(
    locationName: string,
    updates: Partial<Omit<LocationVisualState, 'locationName' | 'visitedCount'>>
  ): LocationVisualState {
    const key = locationName.toLowerCase().trim();
    const existing = this.state.locations[key] || {
      locationName: locationName.trim(),
      visitedCount: 0,
    };

    const sanitizedUpdates: Partial<Omit<LocationVisualState, 'locationName' | 'visitedCount'>> = {};
    if (updates.lighting) sanitizedUpdates.lighting = sanitizeText(updates.lighting);
    if (updates.atmosphere) sanitizedUpdates.atmosphere = sanitizeText(updates.atmosphere);
    if (updates.battleDamage) sanitizedUpdates.battleDamage = sanitizeText(updates.battleDamage);
    if (updates.mythosCorruption) sanitizedUpdates.mythosCorruption = sanitizeText(updates.mythosCorruption);
    if (updates.lastAnchorPrompt) sanitizedUpdates.lastAnchorPrompt = sanitizeText(updates.lastAnchorPrompt);

    const updated: LocationVisualState = {
      ...existing,
      ...sanitizedUpdates,
      visitedCount: existing.visitedCount + 1,
    };

    this.state.locations[key] = updated;
    this.state.currentLocationName = locationName.trim();
    return updated;
  }

  public getLocation(locationName: string): LocationVisualState | undefined {
    return this.state.locations[locationName.toLowerCase().trim()];
  }

  /**
   * Zwraca zwięzłą dyrektywę Visual Belief Graph do wstrzyknięcia do promptu systemowego MG.
   */
  public toPromptDirective(locale: 'pl' | 'en' = 'pl'): string {
    const isEn = locale === 'en';
    const lines: string[] = [];

    const activeChars = Object.values(this.state.characters).filter(
      (c, idx, arr) => arr.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase()) === idx
    );

    if (activeChars.length > 0) {
      lines.push(isEn ? '### VISUAL BELIEF GRAPH (CHARACTER ANCHORS):' : '### VISUAL BELIEF GRAPH (KOTWICE WIZUALNE POSTACI):');
      for (const char of activeChars.slice(0, 6)) {
        lines.push(`- **${char.name}**: ${char.visualDnaPrompt}`);
      }
    }

    if (this.state.currentLocationName) {
      const loc = this.getLocation(this.state.currentLocationName);
      if (loc) {
        lines.push(isEn ? '### VISUAL BELIEF GRAPH (CURRENT LOCATION STATE):' : '### VISUAL BELIEF GRAPH (STAN BIEŻĄCEJ LOKACJI):');
        let locDesc = `- **${loc.locationName}** (visits: ${loc.visitedCount})`;
        if (loc.lighting) locDesc += `, lighting: ${loc.lighting}`;
        if (loc.atmosphere) locDesc += `, atmosphere: ${loc.atmosphere}`;
        if (loc.battleDamage) locDesc += `, damage: ${loc.battleDamage}`;
        if (loc.mythosCorruption) locDesc += `, mythos taint: ${loc.mythosCorruption}`;
        lines.push(locDesc);
      }
    }

    return lines.join('\n');
  }
}
