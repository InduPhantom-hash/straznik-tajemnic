import type { NextRequest } from 'next/server';
import {
  buildImageInstructions,
  resolveImageLevel,
} from '@/lib/prompts/image-instructions';
import { POST } from '@/app/api/imagen/route';
import type { AISettings } from '@/lib/ai-settings/types';

const FPP_SCENE_DIRECTIVE =
  "subjective first-person camera POV, view through investigator's eyes, archival noir photography";

const FPP_NO_PLAYER_EXCLUSIONS =
  'no player character face, no protagonist body or hands in frame, no third-person view, no over-the-shoulder shot';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/telemetry', () => ({
  generateTraceId: () => 'test-trace-id',
  startTimer: () => ({ elapsed: () => 1 }),
  logApiEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/user-usage', () => ({
  recordUserUsage: jest.fn().mockResolvedValue(undefined),
}));

function createMockRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {
    'X-Gemini-Api-Key': 'AIzaSyTestKeyForUnitTests',
    'X-Gemini-Tier': 'paid',
  }
): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: {
      get: (name: string) => {
        const found = Object.entries(headers).find(
          ([k]) => k.toLowerCase() === name.toLowerCase()
        );
        return found ? found[1] : null;
      },
    },
  } as unknown as NextRequest;
}

describe('Issue #572: FPP Pure Camera POV & No-Player-Face (Archival Noir 1920s)', () => {
  describe('buildImageInstructions (GM Protocol)', () => {
    const baseSettings = {
      imageGenerationEnabled: true,
      pureTextMode: false,
      sessionZero: { narrativeMode: 'full_rpg' },
      replicateSettings: { imageFrequency: 'normal', maxImagesPerMessage: 2 },
    } as unknown as AISettings;

    it('wymusza regułę Pure Subjective Camera POV (FPP) oraz zakaz twarzy/ciała gracza we wszystkich tierach częstotliwości', () => {
      const tiers: Array<{ narrativeMode: string; imageFrequency: string }> = [
        { narrativeMode: 'pure_narrative', imageFrequency: 'rare' }, // minimal (level 0)
        { narrativeMode: 'full_rpg', imageFrequency: 'normal' }, // moderate (level 2)
        { narrativeMode: 'full_rpg', imageFrequency: 'often' }, // frequent (level 3)
      ];

      for (const t of tiers) {
        const instructions = buildImageInstructions(
          {
            ...baseSettings,
            sessionZero: { narrativeMode: t.narrativeMode },
            replicateSettings: {
              imageFrequency: t.imageFrequency,
              maxImagesPerMessage: 2,
            },
          } as unknown as AISettings,
          false
        );

        expect(instructions).toContain(
          'subjective first-person camera POV'
        );
        expect(instructions).toContain('archival noir photography');
        expect(instructions).toContain(
          'ŻELAZNA ZASADA FPP & NO-PLAYER-FACE (PURE SUBJECTIVE CAMERA POV - ARCHIVAL NOIR 1920s)'
        );
        expect(instructions).toContain(
          'ABSOLUTNY ZAKAZ umieszczania w kadrze twarzy, głowy, pleców, sylwetki ani nawet dłoni czy ramion Badacza gracza!'
        );
        expect(instructions).toContain(
          'ZAKAZ PORTRETÓW GRACZA ([PORTRET:] WYŁĄCZNIE DLA NPC)'
        );
        expect(instructions).toContain(
          'NIGDY nie generuj tagu [PORTRET:] dla postaci gracza (Badacza)'
        );
        // Upewniamy się, że stary nakaz wplatania wyglądu gracza został usunięty
        expect(instructions).not.toContain(
          'Gdy ilustrujesz scenę z udziałem Badacza, ZAWSZE uwzględniaj w opisie jego dokładny profil fizyczny'
        );
      }
    });

    it('poprawnie wylicza poziom częstotliwości obrazów w resolveImageLevel', () => {
      expect(resolveImageLevel('pure_narrative', 'rare')).toBe(0);
      expect(resolveImageLevel('story_priority', 'normal')).toBe(1);
      expect(resolveImageLevel('full_rpg', 'normal')).toBe(2);
      expect(resolveImageLevel('full_rpg', 'often')).toBe(3);
    });
  });

  describe('/api/imagen route.ts (sanitizePrompt & POST)', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('usuwa słowa kluczowe tanich potworów przy isMythos=false i dołącza NEGATIVE_SUFFIX z wykluczeniami twarzy gracza, dłoni i ujęć TPP/over-the-shoulder', async () => {
      let capturedBody = '';
      global.fetch = jest.fn().mockImplementation(async (_url, init) => {
        capturedBody = String(init?.body || '');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'image/png',
                        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const req = createMockRequest({
        prompt: 'dark corridor with giant monster and cthulhu tentacles',
        style: 'horror',
        era: '1920s',
        isMythos: false,
        seed: `seed-sanitize-${Date.now()}`,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(capturedBody).not.toMatch(/\bcthulhu\b/i);
      expect(capturedBody).not.toMatch(/\bgiant monster\b/i);
      expect(capturedBody).toContain('dark corridor with and,');
      expect(capturedBody).toContain('no cartoonish monsters');
      expect(capturedBody).toContain('no oversized tentacles');
      expect(capturedBody).toContain('no player character face');
      expect(capturedBody).toContain('no protagonist body or hands in frame');
      expect(capturedBody).toContain('no third-person view');
      expect(capturedBody).toContain('no over-the-shoulder shot');
      expect(capturedBody).toContain(FPP_NO_PLAYER_EXCLUSIONS);
    });

    it.each(['horror', 'location', 'vintage'] as const)(
      'wzbogaca prompt sceny (%s) o dyrektywę FPP_SCENE_DIRECTIVE i wykluczenia FPP_NO_PLAYER_EXCLUSIONS',
      async (style) => {
        let capturedBody = '';
        global.fetch = jest.fn().mockImplementation(async (_url, init) => {
          capturedBody = String(init?.body || '');
          return {
            ok: true,
            status: 200,
            json: async () => ({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        inlineData: {
                          mimeType: 'image/png',
                          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                        },
                      },
                    ],
                  },
                },
              ],
            }),
          } as unknown as Response;
        });

        const req = createMockRequest({
          prompt: `misty cobblestone street in Arkham (${style})`,
          style,
          era: '1920s',
          seed: `seed-${style}-${Date.now()}`,
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(capturedBody).toContain(FPP_SCENE_DIRECTIVE);
        expect(capturedBody).toContain(FPP_NO_PLAYER_EXCLUSIONS);
        const exclusionOccurrences =
          capturedBody.split(FPP_NO_PLAYER_EXCLUSIONS).length - 1;
        expect(exclusionOccurrences).toBe(1);
      }
    );

    it('dla style="portrait" wymusza portret NPC (head and shoulders shot facing camera) i zachowuje wykluczenia gracza bez nadpisywania kadrem krajobrazowym FPP', async () => {
      let capturedBody = '';
      global.fetch = jest.fn().mockImplementation(async (_url, init) => {
        capturedBody = String(init?.body || '');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'image/png',
                        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const req = createMockRequest({
        prompt: 'elderly professor with wire-rimmed spectacles',
        style: 'portrait',
        era: '1920s',
        seed: `seed-portrait-${Date.now()}`,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(capturedBody).toContain('period-accurate NPC portrait photography');
      expect(capturedBody).not.toContain(FPP_SCENE_DIRECTIVE);
      expect(capturedBody).toContain(FPP_NO_PLAYER_EXCLUSIONS);
      expect(capturedBody.split(FPP_NO_PLAYER_EXCLUSIONS).length - 1).toBe(1);
    });

    it('dla style="item" generuje studium obiektu bez FPP_SCENE_DIRECTIVE, zachowując pojedyncze wykluczenia gracza', async () => {
      let capturedBody = '';
      global.fetch = jest.fn().mockImplementation(async (_url, init) => {
        capturedBody = String(init?.body || '');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'image/png',
                        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const req = createMockRequest({
        prompt: 'ancient leather-bound journal with brass clasp',
        style: 'item',
        era: '1920s',
        seed: `seed-item-${Date.now()}`,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(capturedBody).toContain('photorealistic period object study');
      expect(capturedBody).not.toContain(FPP_SCENE_DIRECTIVE);
      expect(capturedBody).toContain(FPP_NO_PLAYER_EXCLUSIONS);
      expect(capturedBody.split(FPP_NO_PLAYER_EXCLUSIONS).length - 1).toBe(1);
    });

    it('zachowuje pojedyncze wykluczenia FPP_NO_PLAYER_EXCLUSIONS również dla scen oznaczonych jako isMythos=true', async () => {
      let capturedBody = '';
      global.fetch = jest.fn().mockImplementation(async (_url, init) => {
        capturedBody = String(init?.body || '');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'image/png',
                        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const req = createMockRequest({
        prompt: 'eldritch monstrosity emerging from dark waters',
        style: 'horror',
        era: '1920s',
        isMythos: true,
        seed: `seed-mythos-${Date.now()}`,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(capturedBody).toContain('eldritch monstrosity');
      expect(capturedBody).toContain(FPP_SCENE_DIRECTIVE);
      expect(capturedBody).toContain(FPP_NO_PLAYER_EXCLUSIONS);
      expect(capturedBody.split(FPP_NO_PLAYER_EXCLUSIONS).length - 1).toBe(1);
    });

    it('obsługuje VisualSceneSpec bez mythosException (gdy isMythos pominięte): filtruje potwory i dołącza FPP_NO_PLAYER_EXCLUSIONS', async () => {
      let capturedBody = '';
      global.fetch = jest.fn().mockImplementation(async (_url, init) => {
        capturedBody = String(init?.body || '');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'image/png',
                        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const { resolveEraContext } = await import('@/lib/era');
      const eraContext = resolveEraContext({
        userSelection: { year: 1925, country: 'USA' },
      });

      const req = createMockRequest({
        prompt: 'abandoned warehouse with giant monster and cthulhu',
        style: 'horror',
        seed: `seed-scenespec-no-mythos-${Date.now()}`,
        sceneSpec: {
          schemaVersion: 1,
          subject: 'Opuszczony magazyn w porcie',
          location: 'Arkham, doki',
          eraContext,
          entities: [
            { id: 'crate', name: 'drewniana skrzynia', kind: 'prop' },
          ],
          spatialRelations: [],
          forbidden: ['smartfony'],
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(capturedBody).not.toMatch(/\bcthulhu\b/i);
      expect(capturedBody).not.toMatch(/\bgiant monster\b/i);
      expect(capturedBody).toContain('Opuszczony magazyn w porcie');
      expect(capturedBody).toContain(FPP_SCENE_DIRECTIVE);
      expect(capturedBody).toContain(FPP_NO_PLAYER_EXCLUSIONS);
      expect(capturedBody.split(FPP_NO_PLAYER_EXCLUSIONS).length - 1).toBe(1);
    });

    it('obsługuje VisualSceneSpec z jawnym mythosException (gdy isMythos pominięte): zachowuje istoty Mythos i pojedyncze wykluczenia FPP_NO_PLAYER_EXCLUSIONS', async () => {
      let capturedBody = '';
      global.fetch = jest.fn().mockImplementation(async (_url, init) => {
        capturedBody = String(init?.body || '');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'image/png',
                        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        } as unknown as Response;
      });

      const { resolveEraContext } = await import('@/lib/era');
      const eraContext = resolveEraContext({
        userSelection: { year: 1925, country: 'USA' },
      });

      const req = createMockRequest({
        prompt: 'shoggoth and eldritch monstrosity in ritual chamber',
        style: 'horror',
        seed: `seed-scenespec-mythos-${Date.now()}`,
        sceneSpec: {
          schemaVersion: 1,
          subject: 'Rytualna komnata pod kościołem',
          location: 'Arkham, podziemia',
          eraContext,
          entities: [
            { id: 'altar', name: 'kamienny ołtarz', kind: 'furniture' },
          ],
          spatialRelations: [],
          mythosException: {
            kind: 'mythos',
            reason: 'Kulminacyjne objawienie istoty Mythos w finale scenariusza',
            approvedBy: 'scenario',
          },
          forbidden: ['nowoczesna elektronika'],
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(capturedBody).toContain('shoggoth');
      expect(capturedBody).toContain('eldritch monstrosity');
      expect(capturedBody).toContain('JAWNY WYJĄTEK MYTHOS');
      expect(capturedBody).toContain(FPP_SCENE_DIRECTIVE);
      expect(capturedBody).toContain(FPP_NO_PLAYER_EXCLUSIONS);
      expect(capturedBody.split(FPP_NO_PLAYER_EXCLUSIONS).length - 1).toBe(1);
    });
  });
});
