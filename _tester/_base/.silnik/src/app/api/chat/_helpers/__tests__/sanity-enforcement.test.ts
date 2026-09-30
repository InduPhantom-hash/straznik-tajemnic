import { createSseStream } from '../create-sse-stream';
import { detectPendingSanityTestResolution } from '../sanity-resolution';
import { applyStatChangesToParty } from '@/lib/character/apply-stat-changes';
import { TextDecoder, TextEncoder } from 'node:util';
import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { StreamChunk } from '@/lib/ai-providers/types';
import type { Character } from '@/lib/types';

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  ReadableStream: NodeReadableStream,
});

jest.mock('@/lib/telemetry', () => ({
  logApiEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/vector-db/conversation-memory', () => ({
  conversationMemory: { saveConversationTurn: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('@/lib/director-state', () => ({
  updateDirectorState: jest.fn(),
}));

jest.mock('@/lib/user-usage', () => ({
  recordUserUsage: jest.fn().mockResolvedValue(undefined),
}));

async function* streamChunks(...texts: string[]): AsyncGenerator<StreamChunk> {
  for (const text of texts) {
    yield { text };
  }
}

async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) return output;
    output += decoder.decode(value, { stream: true });
  }
}

function extractFullTextFromSse(sseOutput: string): string {
  return sseOutput
    .trim()
    .split('\n\n')
    .map((block) => {
      const line = block.trim();
      if (!line.startsWith('data: ')) return null;
      try {
        const parsed = JSON.parse(line.slice('data: '.length));
        return parsed.type === 'text' ? (parsed.content as string) : null;
      } catch {
        return null;
      }
    })
    .filter((c): c is string => typeof c === 'string')
    .join('');
}

const baseCharacter: Character = {
  id: 'char-edward',
  name: 'Edward Carnby',
  hp: 12,
  maxHp: 12,
  san: 50,
  maxSan: 99,
  mp: 10,
  maxMp: 10,
  luck: 55,
  dailySanLoss: 0,
  skills: {
    Poczytalność: 50,
    Spostrzegawczość: 60,
  },
} as unknown as Character;

describe('Issue #564: Automatyczne egzekwowanie utraty Poczytalności (SAN)', () => {
  describe('detectPendingSanityTestResolution', () => {
    it('wykrywa nieudany test Poczytalności z Tacki (porażka)', () => {
      const msg = `[🎲 Test: Poczytalność (50%)]\nWynik: 67 → ❌ Porażka\nProgi: Zwykły ≤50 | Trudny ≤25 | Ekstremalny ≤10\n(Rzut wirtualny)`;
      const resolutions = detectPendingSanityTestResolution(msg);
      expect(resolutions).toHaveLength(1);
      expect(resolutions[0]).toEqual({
        characterName: undefined,
        failed: true,
        skillName: 'Poczytalność',
      });
    });

    it('wykrywa pech (fumble) na Poczytalność jako porażkę', () => {
      const msg = `[🎲 Test: Poczytalność (50%)]\nWynik: 100 → 💥 Pech (Fumble)\nProgi: Zwykły ≤50\n(Rzut wirtualny)`;
      const resolutions = detectPendingSanityTestResolution(msg);
      expect(resolutions).toHaveLength(1);
      expect(resolutions[0].failed).toBe(true);
    });

    it('wykrywa udany test Poczytalności (sukces) i oznacza failed: false', () => {
      const msg = `[🎲 Test: Poczytalność (50%)]\nWynik: 25 → ✅ Zwykły sukces\nProgi: Zwykły ≤50\n(Rzut wirtualny)`;
      const resolutions = detectPendingSanityTestResolution(msg);
      expect(resolutions).toHaveLength(1);
      expect(resolutions[0].failed).toBe(false);
    });

    it('wykrywa imię badacza w formacie Duet [🎲 Test: @Imię:...]', () => {
      const msg = `[🎲 Test: @Margaret Sullivan: Poczytalność (45%)]\nWynik: 78 → ❌ Porażka\n(Rzut wirtualny)`;
      const resolutions = detectPendingSanityTestResolution(msg);
      expect(resolutions).toHaveLength(1);
      expect(resolutions[0]).toEqual({
        characterName: 'Margaret Sullivan',
        failed: true,
        skillName: 'Poczytalność',
      });
    });

    it('wykrywa testy ze zbiorczej wiadomości Duet (oba rzuty)', () => {
      const msg = `Wyniki testów obojga badaczy:
[DICE_ROLL] @Margaret Sullivan: test umiejętności "Poczytalność" (50%): wynik 75, PORAŻKA - PORAŻKA
[DICE_ROLL] @Prof. William Dyer: test umiejętności "Poczytalność" (40%): wynik 20, SUKCES - SUKCES`;
      const resolutions = detectPendingSanityTestResolution(msg);
      expect(resolutions).toHaveLength(2);
      expect(resolutions[0]).toEqual({
        characterName: 'Margaret Sullivan',
        failed: true,
        skillName: 'Poczytalność',
      });
      expect(resolutions[1]).toEqual({
        characterName: 'Prof. William Dyer',
        failed: false,
        skillName: 'Poczytalność',
      });
    });

    it('ignoruje rzuty na inne umiejętności (np. Spostrzegawczość)', () => {
      const msg = `[🎲 Test: Spostrzegawczość (60%)]\nWynik: 75 → ❌ Porażka\n(Rzut wirtualny)`;
      const resolutions = detectPendingSanityTestResolution(msg);
      expect(resolutions).toHaveLength(0);
    });
  });

  describe('createSseStream - doklejanie fallbacku SAN', () => {
    it('dokleja fallback [SANITY: -1: Szok psychiczny (auto-sędzia)] gdy model pominął tag przy porażce', async () => {
      const playerMessage = `[🎲 Test: Poczytalność (50%)]\nWynik: 67 → ❌ Porażka\n(Rzut wirtualny)`;
      const stream = createSseStream({
        providerStream: streamChunks('Widzisz potworny kształt wyłaniający się z mroku.'),
        getUsage: async () => null,
        getFinishReason: () => 'STOP',
        message: playerMessage,
        modelId: 'gemini-test',
        traceId: 'trace-test',
        timer: { elapsed: () => 0 },
        ragVersion: 'v1',
        embeddingDim: 768,
        userId: 'local',
        character: baseCharacter,
        characters: [baseCharacter],
      });

      const sseOutput = await readStream(stream);
      const fullText = extractFullTextFromSse(sseOutput);

      expect(fullText).toContain('Widzisz potworny kształt wyłaniający się z mroku.');
      expect(fullText).toContain('[SANITY: -1: Szok psychiczny (auto-sędzia)]');

      // Weryfikacja odliczenia punktu przez applyStatChangesToParty
      const statResult = applyStatChangesToParty([baseCharacter], baseCharacter, fullText);
      expect(statResult.changed).toBe(true);
      expect(statResult.activeCharacter.san).toBe(49);
    });

    it('w trybie Duet dokleja fallback z prefiksem @ImięBadacza', async () => {
      const char1: Character = { ...baseCharacter, id: 'char-1', name: 'Margaret Sullivan', san: 50 };
      const char2: Character = { ...baseCharacter, id: 'char-2', name: 'Prof. William Dyer', san: 60 };

      const playerMessage = `[🎲 Test: @Margaret Sullivan: Poczytalność (50%)]\nWynik: 75 → ❌ Porażka\n(Rzut wirtualny)`;
      const stream = createSseStream({
        providerStream: streamChunks('Krzyk zamiera Margaret w gardle.'),
        getUsage: async () => null,
        getFinishReason: () => 'STOP',
        message: playerMessage,
        modelId: 'gemini-test',
        traceId: 'trace-test',
        timer: { elapsed: () => 0 },
        ragVersion: 'v1',
        embeddingDim: 768,
        userId: 'local',
        character: char1,
        characters: [char1, char2],
      });

      const sseOutput = await readStream(stream);
      const fullText = extractFullTextFromSse(sseOutput);

      expect(fullText).toContain('[SANITY: @Margaret Sullivan: -1: Szok psychiczny (auto-sędzia)]');

      const statResult = applyStatChangesToParty([char1, char2], char1, fullText);
      expect(statResult.changed).toBe(true);
      const updatedMargaret = statResult.characters.find((c) => c.name === 'Margaret Sullivan');
      const updatedDyer = statResult.characters.find((c) => c.name === 'Prof. William Dyer');
      expect(updatedMargaret?.san).toBe(49);
      expect(updatedDyer?.san).toBe(60);
    });

    it('NIE dokleja fallbacku gdy test Poczytalności zakończył się sukcesem', async () => {
      const playerMessage = `[🎲 Test: Poczytalność (50%)]\nWynik: 20 → ✅ Zwykły sukces\n(Rzut wirtualny)`;
      const stream = createSseStream({
        providerStream: streamChunks('Udało ci się zachować zimną krew.'),
        getUsage: async () => null,
        getFinishReason: () => 'STOP',
        message: playerMessage,
        modelId: 'gemini-test',
        traceId: 'trace-test',
        timer: { elapsed: () => 0 },
        ragVersion: 'v1',
        embeddingDim: 768,
        userId: 'local',
        character: baseCharacter,
        characters: [baseCharacter],
      });

      const sseOutput = await readStream(stream);
      const fullText = extractFullTextFromSse(sseOutput);

      expect(fullText).not.toContain('[SANITY:');
      const statResult = applyStatChangesToParty([baseCharacter], baseCharacter, fullText);
      expect(statResult.changed).toBe(false);
      expect(statResult.activeCharacter.san).toBe(50);
    });

    it('NIE dokleja fallbacku gdy model AI samodzielnie wyemitował znacznik [SANITY:...]', async () => {
      const playerMessage = `[🎲 Test: Poczytalność (50%)]\nWynik: 67 → ❌ Porażka\n(Rzut wirtualny)`;
      const stream = createSseStream({
        providerStream: streamChunks('Widok trupa jest wstrząsający. [SANITY: -1k4: makabryczne zwłoki]'),
        getUsage: async () => null,
        getFinishReason: () => 'STOP',
        message: playerMessage,
        modelId: 'gemini-test',
        traceId: 'trace-test',
        timer: { elapsed: () => 0 },
        ragVersion: 'v1',
        embeddingDim: 768,
        userId: 'local',
        character: baseCharacter,
        characters: [baseCharacter],
      });

      const sseOutput = await readStream(stream);
      const fullText = extractFullTextFromSse(sseOutput);

      expect(fullText).not.toContain('(auto-sędzia)');
      expect(fullText).toContain('[SANITY: -1k4: makabryczne zwłoki]');
    });

    it('w trybie Duet gdy obaj oblali, ale model obsłużył tylko jednego, uzupełnia fallback wyłącznie dla drugiego', async () => {
      const char1: Character = { ...baseCharacter, id: 'char-1', name: 'Margaret Sullivan', san: 50 };
      const char2: Character = { ...baseCharacter, id: 'char-2', name: 'Prof. William Dyer', san: 60 };

      const playerMessage = `Wyniki testów obojga badaczy:
[DICE_ROLL] @Margaret Sullivan: test umiejętności "Poczytalność" (50%): wynik 75, PORAŻKA - PORAŻKA
[DICE_ROLL] @Prof. William Dyer: test umiejętności "Poczytalność" (40%): wynik 80, PORAŻKA - PORAŻKA`;

      const stream = createSseStream({
        providerStream: streamChunks('Margaret osuwa się na kolana. [SANITY: @Margaret Sullivan: -3: groza] Dyer zamarł.'),
        getUsage: async () => null,
        getFinishReason: () => 'STOP',
        message: playerMessage,
        modelId: 'gemini-test',
        traceId: 'trace-test',
        timer: { elapsed: () => 0 },
        ragVersion: 'v1',
        embeddingDim: 768,
        userId: 'local',
        character: char1,
        characters: [char1, char2],
      });

      const sseOutput = await readStream(stream);
      const fullText = extractFullTextFromSse(sseOutput);

      // Margaret ma swój tag z modelu, nie dostaje auto-sędziego
      expect(fullText).not.toContain('@Margaret Sullivan: -1: Szok psychiczny (auto-sędzia)');
      // Dyer nie miał tagu z modelu, dostaje auto-sędziego
      expect(fullText).toContain('[SANITY: @Prof. William Dyer: -1: Szok psychiczny (auto-sędzia)]');

      const statResult = applyStatChangesToParty([char1, char2], char1, fullText);
      expect(statResult.changed).toBe(true);
      const updatedMargaret = statResult.characters.find((c) => c.name === 'Margaret Sullivan');
      const updatedDyer = statResult.characters.find((c) => c.name === 'Prof. William Dyer');
      expect(updatedMargaret?.san).toBe(47); // 50 - 3 (z narracji modelu)
      expect(updatedDyer?.san).toBe(59); // 60 - 1 (z auto-sędziego)
    });

    it('obsługuje synonimy Poczytalności (SAN, Sanity, Rozsądek)', () => {
      const msgSan = `[🎲 Test: SAN (40%)]\nWynik: 65 → ❌ Porażka\n(Rzut wirtualny)`;
      const msgSanity = `[🎲 Test: Sanity (40%)]\nWynik: 65 → ❌ Porażka\n(Rzut wirtualny)`;
      const msgRozsadek = `[🎲 Test: Rozsądek (40%)]\nWynik: 65 → ❌ Porażka\n(Rzut wirtualny)`;

      expect(detectPendingSanityTestResolution(msgSan)[0].failed).toBe(true);
      expect(detectPendingSanityTestResolution(msgSanity)[0].failed).toBe(true);
      expect(detectPendingSanityTestResolution(msgRozsadek)[0].failed).toBe(true);
    });

    it('zwraca pustą listę dla zwykłej wiadomości dialogowej/fabularnej', () => {
      expect(detectPendingSanityTestResolution('')).toHaveLength(0);
      expect(detectPendingSanityTestResolution('Otwieram stare biurko w bibliotece.')).toHaveLength(0);
    });
  });
});
