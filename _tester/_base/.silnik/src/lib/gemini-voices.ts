/**
 * Gemini TTS prebuilt voice catalog (IND-49 + IND-165)
 *
 * Lista 30 prebuilds z dokumentacji Google AI:
 * https://ai.google.dev/gemini-api/docs/speech-generation
 *
 * Sesja 77 IND-165 — uzupełnienie z 5 → 30 voices po empirycznym
 * research docs Google (last updated 2026-05-07).
 *
 * Ograniczenia:
 * - Brak dedykowanych głosów PL — używaj `languageCode: 'pl-PL'` na voice prebuilt
 *   (smoke test wymagany — jakość polskiego akcentu niezweryfikowana per voice).
 * - Nazwy mityczne/astronomiczne (Kore = Persephone, Puck = Snu nocy letniej,
 *   Aoede/Erinome/Sulafat/Achernar/Alnilam/Schedar = gwiazdy/satelity).
 * - Audio tags (whisper/trembling/serious itp.) WSPIERANE przez Gemini TTS API
 *   per docs — działają z każdym voice'em z tej listy.
 */

export type GeminiVoiceRole =
  | 'narrator'
  | 'male'
  | 'female'
  | 'monster'
  | 'young'
  | 'old';

export interface GeminiVoice {
  voiceId: string;
  name: string;
  characteristic: string;
  description: string;
  role: GeminiVoiceRole;
}

/**
 * 30 prebuilt voices Gemini TTS API.
 *
 * Mapowanie role per voice jest subiektywne na bazie `characteristic` z docs
 * Google + sugestii dla narracji RPG horror (CoC 7e Lovecraft).
 * Smoke test A/B PL akcent zalecany dla finalnego wyboru per kategoria.
 */
export const GEMINI_VOICES: readonly GeminiVoice[] = [
  // === NARRATORZY (firm, informative, even) ===
  {
    voiceId: 'Kore',
    name: 'Kore',
    characteristic: 'Firm',
    description: 'Stabilny narrator — dobry domyślny',
    role: 'narrator',
  },
  {
    voiceId: 'Charon',
    name: 'Charon',
    characteristic: 'Informative',
    description: 'Neutralny narratorski',
    role: 'narrator',
  },
  {
    voiceId: 'Iapetus',
    name: 'Iapetus',
    characteristic: 'Clear',
    description: 'Czysty męski narrator',
    role: 'narrator',
  },
  {
    voiceId: 'Rasalgethi',
    name: 'Rasalgethi',
    characteristic: 'Informative',
    description: 'Alternatywa Charona — narratorski',
    role: 'narrator',
  },
  {
    voiceId: 'Schedar',
    name: 'Schedar',
    characteristic: 'Even',
    description: 'Neutralny, wyważony narrator',
    role: 'narrator',
  },
  {
    voiceId: 'Sadaltager',
    name: 'Sadaltager',
    characteristic: 'Knowledgeable',
    description: 'Uczony narratorski (profesor Miskatonic)',
    role: 'narrator',
  },
  {
    voiceId: 'Erinome',
    name: 'Erinome',
    characteristic: 'Clear',
    description: 'Czysta kobieca narratorka',
    role: 'narrator',
  },
  {
    voiceId: 'Zephyr',
    name: 'Zephyr',
    characteristic: 'Bright',
    description: 'Jasny ton narratorski',
    role: 'narrator',
  },
  // === MĘŻCZYŹNI ===
  {
    voiceId: 'Puck',
    name: 'Puck',
    characteristic: 'Upbeat',
    description: 'Młody, energiczny — postacie żywe',
    role: 'male',
  },
  {
    voiceId: 'Fenrir',
    name: 'Fenrir',
    characteristic: 'Excitable',
    description: 'Dynamiczny — bohaterowie akcji',
    role: 'male',
  },
  {
    voiceId: 'Orus',
    name: 'Orus',
    characteristic: 'Firm',
    description: 'Autorytatywny męski',
    role: 'male',
  },
  {
    voiceId: 'Umbriel',
    name: 'Umbriel',
    characteristic: 'Easy-going',
    description: 'Spokojny męski',
    role: 'male',
  },
  {
    voiceId: 'Algieba',
    name: 'Algieba',
    characteristic: 'Smooth',
    description: 'Gładki męski',
    role: 'male',
  },
  {
    voiceId: 'Alnilam',
    name: 'Alnilam',
    characteristic: 'Firm',
    description: 'Autorytatywny męski (alt. Orus)',
    role: 'male',
  },
  {
    voiceId: 'Achird',
    name: 'Achird',
    characteristic: 'Friendly',
    description: 'Przyjazny męski (NPC sklepikarze)',
    role: 'male',
  },
  {
    voiceId: 'Zubenelgenubi',
    name: 'Zubenelgenubi',
    characteristic: 'Casual',
    description: 'Luźny męski (NPC bywalcy)',
    role: 'male',
  },
  // === KOBIETY ===
  {
    voiceId: 'Sulafat',
    name: 'Sulafat',
    characteristic: 'Warm',
    description: 'Ciepły kobiecy — narracja / NPC',
    role: 'female',
  },
  {
    voiceId: 'Aoede',
    name: 'Aoede',
    characteristic: 'Breezy',
    description: 'Lekka kobieca',
    role: 'female',
  },
  {
    voiceId: 'Callirrhoe',
    name: 'Callirrhoe',
    characteristic: 'Easy-going',
    description: 'Spokojna kobieca',
    role: 'female',
  },
  {
    voiceId: 'Autonoe',
    name: 'Autonoe',
    characteristic: 'Bright',
    description: 'Jasny ton kobiecy',
    role: 'female',
  },
  {
    voiceId: 'Despina',
    name: 'Despina',
    characteristic: 'Smooth',
    description: 'Gładka kobieca',
    role: 'female',
  },
  {
    voiceId: 'Achernar',
    name: 'Achernar',
    characteristic: 'Soft',
    description: 'Cicha kobieca (przerażone NPC)',
    role: 'female',
  },
  {
    voiceId: 'Pulcherrima',
    name: 'Pulcherrima',
    characteristic: 'Forward',
    description: 'Asertywna kobieca',
    role: 'female',
  },
  {
    voiceId: 'Vindemiatrix',
    name: 'Vindemiatrix',
    characteristic: 'Gentle',
    description: 'Łagodna kobieca',
    role: 'female',
  },
  // === MŁODZI (dzieci, młodzież) ===
  {
    voiceId: 'Leda',
    name: 'Leda',
    characteristic: 'Youthful',
    description: 'Młoda kobieca',
    role: 'young',
  },
  {
    voiceId: 'Laomedeia',
    name: 'Laomedeia',
    characteristic: 'Upbeat',
    description: 'Młoda energiczna',
    role: 'young',
  },
  {
    voiceId: 'Sadachbia',
    name: 'Sadachbia',
    characteristic: 'Lively',
    description: 'Młoda żywa',
    role: 'young',
  },
  // === STARZY / MROCZNI ===
  {
    voiceId: 'Gacrux',
    name: 'Gacrux',
    characteristic: 'Mature',
    description: 'Dojrzały męski (starszy NPC, profesor)',
    role: 'old',
  },
  {
    voiceId: 'Algenib',
    name: 'Algenib',
    characteristic: 'Gravelly',
    description: 'Szorstki głos (stary marynarz, kultysta)',
    role: 'old',
  },
  // === POTWORY / NIEPOKOJĄCY ===
  {
    voiceId: 'Enceladus',
    name: 'Enceladus',
    characteristic: 'Breathy',
    description: 'Chrapliwy (Deep Ones, opętani)',
    role: 'monster',
  },
] as const;

export const DEFAULT_GEMINI_VOICE = 'Kore';

export function isValidGeminiVoice(voiceId: string): boolean {
  return GEMINI_VOICES.some((v) => v.voiceId === voiceId);
}

/**
 * Zwraca głosy filtered po roli.
 * Pomocne dla UI picker grouped by role (IND-165 follow-up).
 */
export function getGeminiVoicesByRole(
  role: GeminiVoiceRole
): readonly GeminiVoice[] {
  return GEMINI_VOICES.filter((v) => v.role === role);
}
