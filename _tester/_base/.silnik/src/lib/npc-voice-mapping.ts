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

/**
 * Rozszerzony interfejs konfiguracji głosu NPC (2026-07-25).
 *
 * Pozwala na sztywne przypisanie głosu ElevenLabs z parametrami aktorskimi
 * do konkretnych postaci NPC (efekt słuchowiska radiowego).
 *
 * Gdy `provider` nie jest ustawiony, domyślnie stosowany jest Gemini TTS.
 */
export interface ElevenLabsNpcVoiceConfig {
  provider: 'elevenlabs';
  voiceId: string; // ElevenLabs voice_id (zależny od konta użytkownika)
  modelKey?: 'multilingual_v2' | 'turbo_v2_5';
  settings?: {
    stability?: number; // 0.0-1.0 (niższe = bardziej emocjonalny)
    similarity_boost?: number; // 0.0-1.0 (wyższe = bliżej oryginału)
    style?: number; // 0.0-1.0 (ekspresja aktorska)
    use_speaker_boost?: boolean;
  };
}

// Tytuły wskazujące bezpośrednio na płeć postaci
export const FEMALE_TITLES = [
  'pani',
  'panna',
  'miss',
  'mrs',
  'ms',
  'madam',
  'madame',
  'lady',
  'siostra',
  'matka',
  'wdowa',
  'ciotka',
  'babcia',
  'profesorka',
  'doktorka',
  'redaktorka',
  'hrabina',
  'księżna',
  'królowa',
];

export const MALE_TITLES = [
  'pan',
  'mr',
  'sir',
  'lord',
  'ojciec',
  'brat',
  'dziadek',
  'wuj',
  'wujek',
  'ksiądz',
  'pastor',
  'doktor',
  'dr',
  'profesor',
  'prof',
  'inspektor',
  'insp',
  'kapitan',
  'kap',
  'sierżant',
  'detektyw',
  'policjant',
  'oficer',
  'generał',
  'pułkownik',
  'major',
  'hrabia',
  'książę',
  'król',
];

// Męskie imiona kończące się na -a (wyjątki od polskiej reguły żeńskiej końcówki -a)
export const MALE_A_NAMES = new Set([
  'kuba',
  'barnaba',
  'kosma',
  'sasza',
  'jarema',
  'zawisza',
  'bonawentura',
  'jona',
  'kolasa',
  'foma',
  'mustafa',
  'luca',
  'andrea',
  'joshua',
]);

// Popularne imiona żeńskie (polskie, epokowe 1920/1970 oraz anglosaskie)
export const KNOWN_FEMALE_NAMES = new Set([
  'anna',
  'maria',
  'elżbieta',
  'krystyna',
  'barbara',
  'teresa',
  'zofia',
  'helena',
  'helen',
  'jadwiga',
  'danuta',
  'halina',
  'irena',
  'stanisława',
  'eleonora',
  'eleanor',
  'agnes',
  'agnieszka',
  'mary',
  'sarah',
  'sara',
  'elizabeth',
  'margaret',
  'ruth',
  'dorothy',
  'alice',
  'grace',
  'claire',
  'evelyn',
  'emily',
  'jane',
  'rose',
  'florence',
  'beatrice',
  'constance',
  'martha',
  'edith',
  'lucy',
  'charlotte',
  'emma',
  'anne',
  'marie',
  'clara',
  'victoria',
  'patricia',
  'joan',
  'judith',
  'nancy',
  'betty',
  'doris',
  'shirley',
  'mildred',
  'frances',
  'lillian',
  'edna',
  'gladys',
  'ethel',
  'hazel',
  'marjorie',
  'esther',
  'pauline',
  'ruby',
  'eva',
  'mabel',
  'alma',
  'gertrude',
  'louise',
  'myrtle',
  'bertha',
  'ada',
  'ida',
  'hilda',
  'viola',
  'lucille',
  'minnie',
  'pearl',
]);

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

export type NpcVoiceInput = Partial<
  Pick<
    NPC,
    | 'type'
    | 'occupation'
    | 'description'
    | 'appearance'
    | 'personality'
    | 'name'
    | 'voiceConfig'
  >
>;

/**
 * Łączy pola tekstowe NPC w jeden lowercase string do keyword matching.
 */
function npcSearchText(npc: NpcVoiceInput): string {
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
 * Precyzyjna heurystyka płci na podstawie imienia i tytułów.
 * Rozpoznaje polskie końcówki żeńskie (-a z wykluczeniem wyjątków męskich),
 * tytuły (Pani, Panna, Miss, Siostra, Pan, Ojciec itp.) oraz popularne imiona.
 */
export function inferGenderFromName(name: string): 'female' | 'male' | null {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  const words = clean.split(/[\s,.-]+/).filter(Boolean);
  if (words.length === 0) return null;

  // 1. Sprawdź obecność tytułów w dowolnym segmencie imienia
  for (const word of words) {
    if (FEMALE_TITLES.includes(word)) return 'female';
    if (MALE_TITLES.includes(word)) return 'male';
  }

  // 2. Sprawdź pierwsze słowo (imię)
  const firstName = words[0];
  if (KNOWN_FEMALE_NAMES.has(firstName)) {
    return 'female';
  }

  // 3. Sprawdź drugie słowo jeśli pierwsze to np. inicjał/tytuł bez kropki
  if (words.length > 1 && KNOWN_FEMALE_NAMES.has(words[1])) {
    return 'female';
  }

  // 4. Polskie imię żeńskie: końcówka -a (z wyłączeniem wyjątków męskich np. Kuba, Barnaba)
  if (firstName.endsWith('a') && !MALE_A_NAMES.has(firstName) && firstName.length >= 3) {
    return 'female';
  }

  return null;
}

/**
 * Heurystyka: zgaduje gender NPC z imienia, tytułu, occupation, description, appearance.
 * Priorytet ma imię/tytuł, a następnie słowa kluczowe w opisie.
 */
export function inferGenderFromNPC(npc: NpcVoiceInput): 'female' | 'male' | null {
  // 1. Priorytet: analiza imienia i tytułów
  if (npc.name) {
    const fromName = inferGenderFromName(npc.name);
    if (fromName) return fromName;
  }

  // 2. Słowa kluczowe w opisach
  const text = npcSearchText(npc);
  const male = matchesAny(text, MALE_KEYWORDS);
  const female = matchesAny(text, FEMALE_KEYWORDS);
  if (male && female) return null;
  if (female) return 'female';
  if (male) return 'male';
  return null;
}

/**
 * Heurystyka: zgaduje wiek (young/old) lub null jeśli nieoznaczony.
 */
export function inferAgeFromNPC(npc: NpcVoiceInput): 'young' | 'old' | null {
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
export function inferRoleFromNPC(npc: NpcVoiceInput): GeminiVoiceRole {
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
export function getVoiceForNPC(npc: NpcVoiceInput): string {
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

export interface NpcToneOfVoiceResult {
  voiceId: string;
  role: GeminiVoiceRole;
  gender: 'female' | 'male';
  audioDirection: string;
}

/**
 * Generuje zindywidualizowany profil Tone of Voice i dobiera głos Gemini TTS.
 * Uwzględnia płeć, wiek, zawód/wykształcenie, stan psychiczny i epokę.
 */
export function buildNpcToneOfVoice(
  npc: NpcVoiceInput,
  options?: {
    mood?: string;
    era?: string;
  }
): NpcToneOfVoiceResult {
  const gender = inferGenderFromNPC(npc) || 'male';
  const role = inferRoleFromNPC(npc);
  const voiceId =
    npc.voiceConfig?.voiceId ||
    (gender === 'female' ? 'Aoede' : getVoiceForNPC(npc));

  const occupation = npc.occupation || '';
  const personality = npc.personality || '';
  const description = npc.description || '';
  const mood = options?.mood || '';

  // Dobór specyfiki stylu mowy (Tone of Voice)
  let trait = 'natural, character-driven dramatic';
  if (role === 'monster') {
    trait = 'eerie, rasping, and chillingly inhuman';
  } else if (mood && /panik|strach|groza|przeraż/i.test(mood)) {
    trait = 'terrified, breathless, and hurried';
  } else if (/kultysta|fanatyk|obłąkan/i.test(personality + ' ' + description)) {
    trait = 'feverish, fanatical, and unsettling';
  } else if (/profesor|nauk|badacz|lekarz|doktor|historyk/i.test(occupation)) {
    trait = 'intellectual, scholarly, and articulate';
  } else if (/robotnik|rybak|kowal|marynarz|żołnierz/i.test(occupation)) {
    trait = 'gruff, earthy, and hardened';
  } else if (/sekretarka|urzędni|artyst|aktork|redaktor/i.test(occupation)) {
    trait = 'eloquent, brisk, and poised';
  } else if (role === 'old') {
    trait = 'mature, weathered, and gravelly';
  } else if (role === 'young') {
    trait = 'youthful, emotional, and expressive';
  }

  const genderStr = gender === 'female' ? 'female' : 'male';
  const audioDirection = `Read the following in clear, natural Polish pronunciation with a ${trait} ${genderStr} character voice and a steady, engaging pace:`;

  return {
    voiceId,
    role,
    gender,
    audioDirection,
  };
}

/**
 * Dynamiczne wyszukiwanie lub tworzenie profilu wokalnego NPC w locie.
 * Zapewnia, że kobieta ZAWSZE otrzymuje głos kobiecy (Aoede), a mężczyzna głos męski (Puck/Fenrir),
 * eliminując niepożądany fallback na basowy głos narratora.
 */
export function resolveDynamicNpcVoice(
  speakerName: string,
  npcVoiceMap: Map<string, string>,
  dynamicCache?: Map<string, { voiceId: string; audioDirection: string }>,
  context?: {
    occupation?: string;
    description?: string;
    personality?: string;
    mood?: string;
    type?: NPC['type'];
  }
): { voiceId: string; audioDirection: string } {
  const rawLower = speakerName.trim().toLowerCase();

  // 1. Sprawdź dynamiczny cache w pamięci
  if (dynamicCache && dynamicCache.has(rawLower)) {
    return dynamicCache.get(rawLower)!;
  }

  // 2. Sprawdź czy postać istnieje w mapie głosów (np. z localStorage gm_npcs)
  const existingVoiceId = resolveNpcVoice(speakerName, npcVoiceMap);

  // 3. Rozpoznaj płeć
  const gender =
    inferGenderFromName(speakerName) ||
    (context
      ? inferGenderFromNPC({ name: speakerName, ...context } as NPC)
      : null) ||
    'male';

  // 4. Przypisz odpowiedni głos
  let voiceId = existingVoiceId;
  if (!voiceId) {
    if (context?.type === 'monster') {
      voiceId = 'Enceladus';
    } else if (gender === 'female') {
      voiceId = 'Aoede'; // Bezkompromisowo żeński głos
    } else {
      voiceId = 'Puck'; // Męski głos postaci
    }
  } else if (gender === 'female' && voiceId === 'Charon') {
    // Bezpiecznik: jeśli w starych danych zapisał się Charon dla kobiety, nadpisz na Aoede!
    voiceId = 'Aoede';
  }

  // 5. Zbuduj Tone of Voice
  const tone = buildNpcToneOfVoice(
    {
      name: speakerName,
      type: context?.type || 'neutral',
      occupation: context?.occupation || '',
      description: context?.description || '',
      personality: context?.personality || '',
      voiceConfig: { voiceId },
    },
    { mood: context?.mood }
  );

  const result = { voiceId, audioDirection: tone.audioDirection };

  if (dynamicCache) {
    dynamicCache.set(rawLower, result);
  }
  npcVoiceMap.set(rawLower, voiceId);

  return result;
}

/**
 * Inicjalizuje bazę postaci NPC ze scenariusza na etapie setupowania przygody.
 * Zapisuje kompletne profile wokalne (Tone of Voice) w localStorage ('gm_npcs').
 */
export function initializeAdventureNpcVoices(
  adventure: {
    id?: string;
    title?: string;
    description?: string;
    hook?: string;
    era?: string;
    graph?: {
      npcs?: Array<{
        id?: string;
        name: string;
        description?: string;
        secret?: string;
        statsSummary?: string;
      }>;
    };
  }
): Partial<NPC>[] {
  if (typeof window === 'undefined') return [];

  try {
    const existingRaw = window.localStorage.getItem('gm_npcs');
    const existingNpcs: Partial<NPC>[] = existingRaw ? JSON.parse(existingRaw) : [];
    const npcMap = new Map<string, Partial<NPC>>();

    for (const n of existingNpcs) {
      if (n.name) {
        npcMap.set(n.name.toLowerCase().trim(), n);
      }
    }

    const graphNpcs = adventure.graph?.npcs || [];
    for (const gn of graphNpcs) {
      if (!gn.name) continue;
      const key = gn.name.toLowerCase().trim();
      const existing = npcMap.get(key);
      const gender = inferGenderFromName(gn.name) || 'male';
      const toneResult = buildNpcToneOfVoice(
        {
          name: gn.name,
          description: gn.description || '',
          personality: gn.secret || '',
          occupation: '',
        },
        { era: adventure.era }
      );

      const updatedNpc: Partial<NPC> = {
        id: gn.id || existing?.id || `npc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: gn.name,
        description: gn.description || existing?.description || '',
        personality: gn.secret || existing?.personality || '',
        voiceConfig: {
          voiceId:
            (existing?.voiceConfig?.voiceId &&
              !(gender === 'female' && existing.voiceConfig.voiceId === 'Charon'))
              ? existing.voiceConfig.voiceId
              : toneResult.voiceId,
          voiceName: toneResult.voiceId,
          languageCode: 'pl-PL',
          rate: 1.15,
        },
      };

      npcMap.set(key, { ...existing, ...updatedNpc });
    }

    const result = Array.from(npcMap.values());
    window.localStorage.setItem('gm_npcs', JSON.stringify(result));
    return result;
  } catch (err) {
    console.warn('Failed to initialize adventure NPC voices:', err);
    return [];
  }
}

/**
 * Ładuje mapę `name (lowercase) → portraitUrl` z localStorage gm_npcs.
 */
export function loadNpcPortraitMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof window === 'undefined') return map;

  try {
    const saved = window.localStorage.getItem('gm_npcs');
    if (!saved) return map;
    const npcs = JSON.parse(saved) as Array<Partial<NPC>>;
    for (const npc of npcs) {
      if (npc.name && npc.portraitUrl) {
        map.set(npc.name.toLowerCase(), npc.portraitUrl);
      }
    }
  } catch {
    // localStorage corruption
  }

  return map;
}

/**
 * Wyszukuje portret NPC z mapy lub próbuje dopasować do predefiniowanego awatara.
 */
export function resolveNpcPortrait(
  speakerName: string,
  npcPortraitMap?: Map<string, string>
): string | undefined {
  if (!speakerName) return undefined;

  const rawLower = speakerName.trim().toLowerCase();
  
  if (npcPortraitMap) {
    const directMatch = npcPortraitMap.get(rawLower);
    if (directMatch) return directMatch;
  }

  const cleanName = rawLower.replace(
    /^(doktor|dr|profesor|prof|inspektor|insp|kapitan|kap|pan|pani|panna|ojciec|brat|siostra|sierżant|detektyw)\.?\s+/i,
    ''
  );

  if (npcPortraitMap && cleanName && npcPortraitMap.has(cleanName)) {
    return npcPortraitMap.get(cleanName);
  }

  // Fallback: zgadujemy ścieżkę do predefiniowanego pliku w /public/portraits/predefined/
  const dashName = (cleanName || rawLower).replace(/['"]/g, '').trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (dashName) {
    return `/portraits/predefined/${dashName}.webp`;
  }

  return undefined;
}


/**
 * Wyszukuje obiekt NPC z localStorage na podstawie nazwy mówcy.
 */
export function resolveNpcObject(
  speakerName: string
): Partial<NPC> | undefined {
  if (!speakerName || typeof window === 'undefined') return undefined;

  try {
    const saved = window.localStorage.getItem('gm_npcs');
    if (!saved) return undefined;
    const npcs = JSON.parse(saved) as Array<Partial<NPC>>;
    const rawLower = speakerName.trim().toLowerCase();
    const cleanName = rawLower.replace(
      /^(doktor|dr|profesor|prof|inspektor|insp|kapitan|kap|pan|pani|panna|ojciec|brat|siostra|sierżant|detektyw)\.?\s+/i,
      ''
    );

    for (const npc of npcs) {
      if (!npc.name) continue;
      const nLower = npc.name.toLowerCase();
      if (nLower === rawLower || nLower === cleanName || nLower.includes(cleanName) || cleanName.includes(nLower)) {
        return npc;
      }
    }
  } catch {
    // ignore
  }

  return undefined;
}
