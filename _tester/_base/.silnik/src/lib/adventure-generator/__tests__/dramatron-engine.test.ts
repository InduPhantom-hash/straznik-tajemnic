import { DramatronEngine } from '../dramatron-engine';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe('DramatronEngine', () => {
  let engine: DramatronEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new DramatronEngine();
  });

  describe('generateDeterministic', () => {
    it('generuje poprawny scenariusz CoC 7e RAW dla epoki classic', () => {
      const adv = engine.generateDeterministic({
        era: 'classic',
        theme: 'Tajemnica w Arkham',
        location: 'Arkham',
        country: 'USA',
      });

      expect(adv).toBeDefined();
      expect(adv.premise.title).toBeDefined();
      expect(adv.premise.mythosEntity).toBeDefined();

      // Egri 3D Dramatis Personae
      expect(adv.cast.length).toBeGreaterThanOrEqual(2);
      for (const npc of adv.cast) {
        expect(npc.physiologicalDetail).toBeDefined();
        expect(npc.sociologicalStatus).toBeDefined();
        expect(npc.psychologicalAgenda).toBeDefined();
        expect(npc.mask).toBeDefined();
        expect(npc.secret).toBeDefined();
      }

      // Alexandrian 3-Clue Clue Web & Sealed Truth Anchor
      expect(adv.clueWeb.truthAnchor).toBeDefined();
      expect(adv.clueWeb.truthAnchor.culprit).toBeDefined();
      expect(adv.clueWeb.truthAnchor.motive).toBeDefined();
      expect(adv.clueWeb.truthAnchor.murderWeapon).toBeDefined();
      expect(adv.clueWeb.clues.length).toBeGreaterThanOrEqual(3);
      expect(adv.clueWeb.connections.length).toBeGreaterThan(0);

      // John Dickson Carr locked room mystery
      expect(adv.locations.length).toBeGreaterThanOrEqual(2);
      const carrLoc = adv.locations.find((l) => l.lockedRoomMystery !== undefined);
      expect(carrLoc).toBeDefined();
      expect(carrLoc?.lockedRoomMystery?.type).toBeDefined();
      expect(carrLoc?.lockedRoomMystery?.anomalyDescription).toBeDefined();
      expect(carrLoc?.lockedRoomMystery?.investigationHint).toBeDefined();

      // 4 Acts of Madness & Scene Beats
      expect(adv.scenes.length).toBe(4);
      for (const scene of adv.scenes) {
        expect(scene.act).toBeDefined();
        expect(scene.beats.length).toBeGreaterThan(0);
        for (const beat of scene.beats) {
          expect(beat.id).toBeDefined();
          expect(beat.description).toBeDefined();
        }
      }
    });

    it('generuje scenariusze dla wszystkich wspieranych epok', () => {
      const eras = ['classic', 'gaslight', 'noir', 'prl', 'modern'] as const;
      for (const era of eras) {
        const adv = engine.generateDeterministic({ era });
        expect(adv.premise.era).toBe(era);
        expect(adv.cast.length).toBeGreaterThan(0);
        expect(adv.locations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateAI', () => {
    it('wykonuje bezpieczny fallback na tryb deterministyczny przy braku klucza API', async () => {
      const originalEnv = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const adv = await engine.generateAI({
        era: 'noir',
        theme: 'Mroczne zaułki',
      });

      expect(adv).toBeDefined();
      expect(adv.premise.era).toBe('noir');
      expect(mockGenerateContent).not.toHaveBeenCalled();

      process.env.GEMINI_API_KEY = originalEnv;
    });

    it('parsuje poprawny JSON wygenerowany przez model Gemini', async () => {
      const fakeDramatron = engine.generateDeterministic({ era: 'classic' });
      fakeDramatron.premise.title = 'AI Gemini Wygenerowana Tajemnica';

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(fakeDramatron),
      });

      const adv = await engine.generateAI({
        apiKey: 'fake-test-key',
        era: 'classic',
        theme: 'Test AI',
      });

      expect(adv.premise.title).toBe('AI Gemini Wygenerowana Tajemnica');
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('fallbackuje na deterministyczną strukturę gdy Gemini zwróci błędny JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'To nie jest poprawny JSON! Error 500.',
      });

      const adv = await engine.generateAI({
        apiKey: 'fake-test-key',
        era: 'gaslight',
        theme: 'Mgła nad Tamizą',
      });

      expect(adv).toBeDefined();
      expect(adv.premise.era).toBe('gaslight');
      expect(adv.scenes.length).toBe(4);
    });
  });
});
