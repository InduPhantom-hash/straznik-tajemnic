/**
 * NPC voice auto-mapping (sesja 147 follow-up M6 D3)
 *
 * Heuristic mapper: NPC → Gemini voice. Patrzy na NPC.type, NPC.occupation,
 * NPC.appearance, NPC.description, NPC.personality (PL keywords) i zgaduje
 * gender + age + role. Zwraca pasujący voiceId z `gemini-voices` catalog.
 *
 * Używane przy:
 * - Generowaniu nowego NPC w npc-manager (suggested voice w formie)
 * - Multi-voice dispatch dla ULTRA preset (useTTS lookup po @NPCName: marker)
 *
 * Heurystyka jest świadomie prosta - subjektywne dopasowanie. User może
 * ręcznie nadpisać przez voiceConfig.voiceId w UI.
 */

import type { NPC } from './types';
import {
  GEMINI_VOICES,
  DEFAULT_GEMINI_VOICE,
  type GeminiVoiceRole,
} from './gemini-voices';

// PL keywords (occupation/description/personality) wskazujące gender
const MALE_KEYWORDS = [
  'mężczyzna',
  'pan ',
  'profesor',
  'doktor',
  'ksiądz',
  'kapłan',
  'detektyw',
  'inspektor',
  'marynarz',
  'kapitan',
  'policjant',
  'sierżant',
  'żołnierz',
  'gangster',
  'bandyta',
  'kierownik',
  'właściciel',
  'sklepikarz',
  'barman',
  'kowal',
  'rybak',
  'farmer',
  'rolnik',
  'kultysta',
  'sekciarz',
  'ojciec',
  'syn',
  'brat',
  'dziadek',
  'staruszek',
  'chłopiec',
  'chłopak',
  'on ',
];

const FEMALE_KEYWORDS = [
  'kobieta',
  'pani ',
  'panna',
  'profesorka',
  'doktorka',
  'sekretarka',
  'pielęgniarka',
  'położna',
  'guwernantka',
  'sprzątaczka',
  'pokojówka',
  'kelnerka',
  'aktorka',
  'śpiewaczka',
  'wdowa',
  'matka',
  'córka',
  'siostra',
  'babcia',
  'staruszka',
  'dziewczyna',
  'dziewczynka',
  'ona ',
];

const OLD_KEYWORDS = [
  'stary',
  'starzec',
  'staruszek',
  'staruszka',
  'dziadek',
  'babcia',
  'wdowa',
  'wdowiec',
  'emerytowany',
  'profesor', // CoC 7e typowo starszy
  'sędziwy',
  'wiekowy',
  'leciwy',
  'siwy',
  'siwa',
  'zgrzybiały',
  'pomarszczony',
];

const YOUNG_KEYWORDS = [
  'młody',
  'młoda',
  'młodzieniec',
  'młodzież',
  'student',
  'studentka',
  'uczeń',
  'uczennica',
  'dziecko',
  'dziecię',
  'nastolatek',
  'nastolatka',
  'chłopiec',
  'chłopak',
  'dziewczyna',
  'dziewczynka',
];

const MONSTER_KEYWORDS = [
  'opętany',
  'opętana',
  'głębinowiec',
  'głębinowy',
  'deep one',
  'shoggoth',
  'mythos',
  'nieludzki',
  'nieludzka',
  'pełzający',
  'zdeformowany',
  'mutant',
  'kreatura',
  'potwór',
  'demon',
  'duch',
  'zjawa',
];

/**
 * Łączy pola tekstowe NPC w jeden lowercase string do keyword matching.
 */
function npcSearchText(
  npc: Pick<
    NPC,
    'occupation' | 'description' | 'appearance' | 'personality' | 'name'
  >
): string {
  return [
    npc.name,
    npc.occupation,
    npc.description,
    npc.appearance,
    npc.personality,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Zwraca true jeśli którykolwiek keyword z listy występuje w tekście.
 */
function matchesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

/**
 * Heurystyka: zgaduje gender NPC z occupation/description/appearance.
 * Zwraca null gdy nie pewne (nie wymuszamy default).
 */
export function inferGenderFromNPC(
  npc: Pick<
    NPC,
    'occupation' | 'description' | 'appearance' | 'personality' | 'name'
  >
): 'male' | 'female' | null {
  const text = npcSearchText(npc);
  const male = matchesAny(text, MALE_KEYWORDS);
  const female = matchesAny(text, FEMALE_KEYWORDS);
  // Konflikt (np. opis ma "mąż siostry") → null
  if (male && female) return null;
  if (male) return 'male';
  if (female) return 'female';
  return null;
}

/**
 * Heurystyka: zgaduje wiek (young/old) lub null jeśli nieoznaczony.
 */
export function inferAgeFromNPC(
  npc: Pick<
    NPC,
    'occupation' | 'description' | 'appearance' | 'personality' | 'name'
  >
): 'young' | 'old' | null {
  const text = npcSearchText(npc);
  const young = matchesAny(text, YOUNG_KEYWORDS);
  const old = matchesAny(text, OLD_KEYWORDS);
  if (young && old) return null;
  if (young) return 'young';
  if (old) return 'old';
  return null;
}

/**
 * Mapuje NPC na GeminiVoiceRole bazując na type + age + gender.
 *
 * Priorytet:
 * 1. NPC.type='monster' lub keywords mythos → 'monster'
 * 2. Age young → 'young'
 * 3. Age old → 'old'
 * 4. Gender male → 'male'
 * 5. Gender female → 'female'
 * 6. Fallback 'narrator' (neutralny)
 */
export function inferRoleFromNPC(
  npc: Pick<
    NPC,
    | 'type'
    | 'occupation'
    | 'description'
    | 'appearance'
    | 'personality'
    | 'name'
  >
): GeminiVoiceRole {
  if (npc.type === 'monster') return 'monster';
  const text = npcSearchText(npc);
  if (matchesAny(text, MONSTER_KEYWORDS)) return 'monster';

  const age = inferAgeFromNPC(npc);
  if (age) return age;

  const gender = inferGenderFromNPC(npc);
  if (gender) return gender;

  return 'narrator';
}

/**
 * Główne API: zwraca voiceId dla NPC.
 *
 * Jeśli NPC ma override w `voiceConfig.voiceId` → użyj go.
 * Inaczej: infer role + zwróć pierwszy voice z catalogu pasujący do roli.
 * Fallback: DEFAULT_GEMINI_VOICE.
 */
export function getVoiceForNPC(
  npc: Pick<
    NPC,
    | 'type'
    | 'occupation'
    | 'description'
    | 'appearance'
    | 'personality'
    | 'name'
    | 'voiceConfig'
  >
): string {
  // 1. Ręczne nadpisanie (user wybrał w UI)
  if (npc.voiceConfig?.voiceId) {
    return npc.voiceConfig.voiceId;
  }

  // 2. Heurystyka
  const role = inferRoleFromNPC(npc);
  const voicesOfRole = GEMINI_VOICES.filter((v) => v.role === role);
  if (voicesOfRole.length > 0) {
    return voicesOfRole[0].voiceId;
  }

  // 3. Fallback (nie powinno się zdarzyć - każda rola ma min. 1 voice w catalogu)
  return DEFAULT_GEMINI_VOICE;
}

// ============================================================================
// MULTI-VOICE DISPATCH (Faza 2 sesji 147) - używane przez useTTS dla ULTRA preset
// ============================================================================

/**
 * Ładuje mapę `name (lowercase) → voiceId` z localStorage gm_npcs.
 *
 * Używa `getVoiceForNPC()` aby każdy NPC bez explicit voiceConfig dostał
 * heurystyczny voice. SSR-safe: zwraca pustą mapę gdy `window` undefined.
 */
export function loadNpcVoiceMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof window === 'undefined') return map;

  try {
    const saved = window.localStorage.getItem('gm_npcs');
    if (!saved) return map;
    const npcs = JSON.parse(saved) as Array<Partial<NPC>>;
    for (const npc of npcs) {
      if (npc.name) {
        const voiceId = getVoiceForNPC(npc as NPC);
        map.set(npc.name.toLowerCase(), voiceId);
      }
    }
  } catch {
    // localStorage corruption / quota - zwracamy pustą mapę, dispatch wykryje fallback
  }

  return map;
}

/**
 * Wyszukuje głos NPC z mapy na podstawie nazwy mówcy (z uwzględnieniem tytułów, częściowych nazw i dopasowania imienia/nazwiska).
 */
export function resolveNpcVoice(
  speakerName: string,
  npcVoiceMap: Map<string, string>
): string | undefined {
  if (!speakerName || npcVoiceMap.size === 0) return undefined;

  const rawLower = speakerName.trim().toLowerCase();
  const directMatch = npcVoiceMap.get(rawLower);
  if (directMatch) return directMatch;

  const cleanName = rawLower.replace(
    /^(doktor|dr|profesor|prof|inspektor|insp|kapitan|kap|pan|pani|panna|ojciec|brat|siostra|sierżant|detektyw)\.?\s+/i,
    ''
  );

  if (cleanName && npcVoiceMap.has(cleanName)) {
    return npcVoiceMap.get(cleanName);
  }

  const words = (cleanName || rawLower)
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  for (const [key, voiceId] of npcVoiceMap) {
    const keyClean = key.replace(
      /^(doktor|dr|profesor|prof|inspektor|insp|kapitan|kap|pan|pani|panna|ojciec|brat|siostra|sierżant|detektyw)\.?\s+/i,
      ''
    );
    for (const word of words) {
      if (
        keyClean === word ||
        keyClean.startsWith(word) ||
        keyClean.endsWith(word) ||
        keyClean.includes(word)
      ) {
        return voiceId;
      }
    }
  }

  return undefined;
}
