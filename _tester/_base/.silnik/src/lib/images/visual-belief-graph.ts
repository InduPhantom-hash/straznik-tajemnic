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
import type { NpcDossierEntry } from '../journal/dossier-types';

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
  portraitUrl?: string; // zapisany portret wygenerowany dla postaci
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

export type VisualNPCInput =
  | NPC
  | NpcDossierEntry
  | {
      id?: string;
      name: string;
      occupation?: string;
      description?: string;
      appearance?: string;
      firstImpression?: string;
      physiologicalDetail?: string;
      sociologicalStatus?: string;
      disposition?: string;
      relationshipStatus?: string;
      avatarUrl?: string;
      portraitUrl?: string;
    };

function sanitizeText(input?: string): string {
  if (!input) return '';
  return input.replace(/\[/g, '(').replace(/\]/g, ')').replace(/[\r\n]+/g, ' ').trim();
}

const TITLES_TO_STRIP = new Set([
  'dr',
  'dr.',
  'doktor',
  'prof',
  'prof.',
  'profesor',
  'kapitan',
  'kpt',
  'kpt.',
  'pan',
  'pani',
  'lord',
  'lady',
  'ojciec',
  'brat',
  'siostra',
  'inspektor',
  'detektyw',
  'pastor',
  'ks.',
  'ksiądz',
]);

/**
 * Wyodrębnia pierwsze imię postaci, pomijając honoryfikatywy i tytuły (np. "Dr Henry Armitage" -> "Henry").
 */
export function extractCleanFirstName(fullName: string): string {
  if (!fullName) return '';
  const tokens = fullName.trim().split(/\s+/);
  for (const token of tokens) {
    const cleanToken = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase();
    if (cleanToken && !TITLES_TO_STRIP.has(cleanToken)) {
      return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    }
  }
  return tokens[0] ? tokens[0].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') : '';
}

/**
 * Pobiera rdzeń imienia (pierwsze 4 znaki lowercase) do elastycznego dopasowania odmian i zdrobnień.
 */
export function extractStem(name: string): string {
  const clean = extractCleanFirstName(name).toLowerCase();
  return clean.length >= 4 ? clean.slice(0, 4) : '';
}

/**
 * Wydobywa spójne cechy ubioru i rekwizytów z zawodu na potrzeby Visual DNA.
 */
export function deriveClothingFromOccupation(occupation?: string, era: string = '1920s'): string {
  if (!occupation) return '';
  const occ = occupation.toLowerCase();

  if (/lekarz|psychiatr|chirurg|doktor|doctor|physician|medic|nurse|pielęgniark/i.test(occ)) {
    return 'starched white clinical coat, waistcoat, formal leather shoes, pocket watch chain';
  }
  if (/policj|constable|szeryf|sheriff|officer|strażnik|detektyw|investigator|gumshoe/i.test(occ)) {
    return 'tailored dark trench coat, woolen fedora, heavy brogues, concealed holster silhouette';
  }
  if (/profesor|scholar|naukowiec|historyk|antiquarian|bibliotekarz|librarian|kustosz|curator|archiwist/i.test(occ)) {
    return 'tweed three-piece suit, round wire-rimmed spectacles, patterned necktie, wool cardigan';
  }
  if (/dozorca|janitor|caretaker|mechanik|mechanic|robotnik|laborer|driver|kierowca|ślusarz/i.test(occ)) {
    return 'heavy canvas work jacket, durable dungarees, brass ring with keys, oil-stained leather work boots';
  }
  if (/marynarz|sailor|kapitan|szyp|fisherman|rybak|dockworker|stokowiec/i.test(occ)) {
    return 'thick knit sea-captain woolen sweater, heavy peacoat, salt-worn dark trousers, sturdy sailor boots';
  }
  if (/dziedzic|dziedziczka|arystokrat|szlach|noble|heiress|bankier|banker|przemysłowiec|industrialist|lord|lady/i.test(occ)) {
    return 'luxurious tailored bespoke garments, silk accents, pearl or gold accessories, refined high-society poise';
  }
  if (/ksiądz|pastor|kapłan|priest|clergyman|monk|zakonnik|minister/i.test(occ)) {
    return 'austere black clerical cassock, crisp white collar, worn prayer book or crucifix in hand';
  }
  if (/artyst|malarz|painter|poet|pisarz|author|dziennikarz|journalist|reporter/i.test(occ)) {
    return 'bohemian corduroy jacket, loose scarf, rumpled button-down shirt, ink-stained cuffs';
  }
  if (/gangster|mobster|złodziej|thief|przemytnik|smuggler|przestępc/i.test(occ)) {
    return 'sharp double-breasted pinstripe suit, broad-brimmed fedora pulled low, polished dress shoes';
  }
  if (/kupiec|handlowiec|merchant|sklepikarz|shopkeeper|clerk|urzędnik/i.test(occ)) {
    return 'pressed collar shirt, dark woolen vest, sleeve garters, sensible leather shoes';
  }

  return `period-appropriate ${era} attire suitable for a ${occupation}`;
}

/**
 * Wydobywa postawę i wyraz twarzy z nastawienia postaci na potrzeby Visual DNA.
 */
export function deriveDemeanorFromDisposition(disposition?: string): string {
  if (!disposition) return '';
  const disp = disposition.toLowerCase();

  if (/hostile|wrogi/i.test(disp)) {
    return 'tense defensive posture, clenched jaw, sharp suspicious glare';
  }
  if (/suspicious|podejrzliwy/i.test(disp)) {
    return 'guarded posture, watchful narrowed eyes, cautious body language';
  }
  if (/friendly|przyjazny/i.test(disp)) {
    return 'open warm stance, gentle approachable expression, attentive gaze';
  }
  if (/neutral|neutralny/i.test(disp)) {
    return 'calm measured demeanor, impassive poker face, reserved posture';
  }
  if (/fanatical|fanatyczn/i.test(disp)) {
    return 'feverish unblinking stare, unnerving rigid posture, intense aura';
  }
  if (/fearful|terrified|przerażon|zastraszon/i.test(disp)) {
    return 'trembling hands, pale anxious complexion, restless darting eyes';
  }

  return '';
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

  const occClothing = deriveClothingFromOccupation(char.occupation, era);
  if (occClothing) {
    parts.push(occClothing);
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
    portraitUrl: char.portraitUrl || undefined,
  };
}

/**
 * Buduje Visual DNA profilu NPC na podstawie encji NPC lub Dossier.
 * Jeśli brak jawnego opisu ubioru/wyglądu, wydobywa cechy z zawodu, nastawienia i epoki.
 */
export function extractNPCVisualProfile(npc: VisualNPCInput, era: string = '1920s'): CharacterVisualProfile {
  const parts: string[] = [];

  const name = sanitizeText(npc.name);
  const occ = sanitizeText(npc.occupation) || '';
  const desc = 'description' in npc && npc.description ? sanitizeText(npc.description) : '';
  const appearance = 'appearance' in npc && npc.appearance ? sanitizeText(npc.appearance) : '';
  const physiological =
    'physiologicalDetail' in npc && npc.physiologicalDetail ? sanitizeText(npc.physiologicalDetail) : '';
  const firstImpression =
    'firstImpression' in npc && npc.firstImpression ? sanitizeText(npc.firstImpression) : '';
  const sociological =
    'sociologicalStatus' in npc && npc.sociologicalStatus ? sanitizeText(npc.sociologicalStatus) : '';
  const rawDisposition =
    'disposition' in npc && npc.disposition
      ? npc.disposition
      : 'relationshipStatus' in npc
        ? npc.relationshipStatus
        : undefined;

  parts.push(`${name}${occ ? `, ${occ}` : ', person'}`);

  let hasExplicitLook = false;
  if (appearance.trim()) {
    parts.push(appearance.trim());
    hasExplicitLook = true;
  }
  if (physiological.trim() && physiological !== appearance) {
    parts.push(physiological.trim());
    hasExplicitLook = true;
  }
  if (!hasExplicitLook && firstImpression.trim()) {
    parts.push(firstImpression.trim());
    hasExplicitLook = true;
  }
  if (!hasExplicitLook && desc.trim()) {
    parts.push(desc.slice(0, 150).trim());
    hasExplicitLook = true;
  }

  // Wzbogać profil kotwicami ubioru z zawodu
  const occClothing = deriveClothingFromOccupation(occ, era);
  if (occClothing) {
    parts.push(occClothing);
  }

  // Wzbogać profil manieryzmem / nastawieniem
  const dispDemeanor = deriveDemeanorFromDisposition(rawDisposition);
  if (dispDemeanor) {
    parts.push(dispDemeanor);
  }

  if (sociological.trim()) {
    parts.push(sociological.trim());
  }

  parts.push(`authentic ${era} period clothing and demeanor`);

  const visualDna = parts.join(', ');

  const portraitUrl =
    ('portraitUrl' in npc && npc.portraitUrl) ||
    ('avatarUrl' in npc && npc.avatarUrl) ||
    undefined;

  return {
    id: npc.id || npc.name,
    name,
    isPlayer: false,
    occupation: occ || undefined,
    apparentEraStyle: era,
    visualDnaPrompt: visualDna,
    portraitUrl,
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
    const fullNameLower = char.name.toLowerCase().trim();
    this.state.characters[fullNameLower] = profile;
    this.state.characters[char.id] = profile;

    const firstName = extractCleanFirstName(char.name).toLowerCase();
    if (firstName && firstName !== fullNameLower) {
      this.state.characters[firstName] = profile;
    }
    const stem = extractStem(char.name);
    if (stem.length >= 4 && !this.state.characters[stem]) {
      this.state.characters[stem] = profile;
    }
  }

  public registerNPC(npc: VisualNPCInput, era: string = '1920s'): void {
    const profile = extractNPCVisualProfile(npc, era);
    const fullNameLower = profile.name.toLowerCase().trim();
    this.state.characters[fullNameLower] = profile;
    if (profile.id) {
      this.state.characters[profile.id] = profile;
    }

    const firstName = extractCleanFirstName(profile.name).toLowerCase();
    if (firstName && firstName !== fullNameLower) {
      this.state.characters[firstName] = profile;
    }
    const stem = extractStem(profile.name);
    if (stem.length >= 4 && !this.state.characters[stem]) {
      this.state.characters[stem] = profile;
    }
  }

  public setPortrait(nameOrId: string, portraitUrl: string): boolean {
    const profile = this.getCharacterProfile(nameOrId);
    if (profile) {
      profile.portraitUrl = portraitUrl;
      return true;
    }
    return false;
  }

  public getCharacterProfile(nameOrId: string): CharacterVisualProfile | undefined {
    if (!nameOrId || typeof nameOrId !== 'string') return undefined;
    const rawKey = nameOrId.trim();
    if (!rawKey) return undefined;
    const lowerKey = rawKey.toLowerCase();

    // 1. Exact match w mapie postaci (pełna nazwa, ID, zarejestrowane aliasy/stemy)
    if (this.state.characters[lowerKey]) return this.state.characters[lowerKey];
    if (this.state.characters[rawKey]) return this.state.characters[rawKey];

    // Pobierz unikalne profile
    const uniqueProfiles = Object.values(this.state.characters).filter(
      (c, idx, arr) => arr.findIndex((x) => x.id === c.id || x.name.toLowerCase() === c.name.toLowerCase()) === idx
    );

    const cleanQuery = extractCleanFirstName(rawKey).toLowerCase();
    const queryStem = extractStem(rawKey);

    // Sprawdź czy queryStem istnieje bezpośrednio w zarejestrowanych kluczach
    if (queryStem.length >= 4 && this.state.characters[queryStem]) {
      return this.state.characters[queryStem];
    }

    // 2. Szukanie po pierwszym imieniu (exact clean first name)
    if (cleanQuery) {
      for (const profile of uniqueProfiles) {
        const profFirstName = extractCleanFirstName(profile.name).toLowerCase();
        if (profFirstName && profFirstName === cleanQuery) {
          return profile;
        }
      }
    }

    // 3. Szukanie po podciągu (substring match w pełnym imieniu)
    for (const profile of uniqueProfiles) {
      const profLower = profile.name.toLowerCase();
      if (profLower.includes(lowerKey) || (lowerKey.length >= 3 && profLower.split(/\s+/).some((w) => w.includes(lowerKey)))) {
        return profile;
      }
    }

    // 4. Szukanie po wspólnym rdzeniu imienia (stem >= 4 znaki)
    if (queryStem.length >= 4) {
      for (const profile of uniqueProfiles) {
        const profStem = extractStem(profile.name);
        if (profStem.length >= 4 && profStem === queryStem) {
          return profile;
        }
      }
    }

    return undefined;
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
      (c, idx, arr) => arr.findIndex((x) => x.id === c.id || x.name.toLowerCase() === c.name.toLowerCase()) === idx
    );

    if (activeChars.length > 0) {
      lines.push(
        isEn
          ? '### VISUAL BELIEF GRAPH (CHARACTER ANCHORS):'
          : '### VISUAL BELIEF GRAPH (KOTWICE WIZUALNE POSTACI):'
      );
      for (const char of activeChars.slice(0, 6)) {
        lines.push(`- **${char.name}**: ${char.visualDnaPrompt}`);
      }
    }

    if (this.state.currentLocationName) {
      const loc = this.getLocation(this.state.currentLocationName);
      if (loc) {
        lines.push(
          isEn
            ? '### VISUAL BELIEF GRAPH (CURRENT LOCATION STATE):'
            : '### VISUAL BELIEF GRAPH (STAN BIEŻĄCEJ LOKACJI):'
        );
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
