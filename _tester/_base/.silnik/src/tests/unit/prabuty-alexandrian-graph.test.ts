import fs from 'fs';
import path from 'path';
import { getAdventureById, STREFA_11_ADVENTURES } from '@/lib/adventures-data';
import { ThreeClueRuleValidator } from '@/lib/pdf/three-clue-rule-validator';
import { normalizeAdventureGraph } from '@/lib/custom-adventures-storage';
import { timeManager } from '@/lib/time-manager';

const STREFA_11_IDS = [
  'cien-nad-prabutami',
  'tajemnica-pendnika-lagiewki',
  'tajemnica-dzieci-z-traszyna',
  'przybysz-z-matriksa-glogow',
] as const;

describe('Issue #658: Strefa 11 - The Alexandrian Graph & Narrative Invariants (Wszystkie 4 scenariusze)', () => {
  describe.each(STREFA_11_IDS)('Scenariusz: %s', (adventureId) => {
    const jsonPath = path.resolve(
      process.cwd(),
      `../../../data/adventures/predefined/${adventureId}.json`
    );

    it('1. SSOT JSON istnieje i jest zsynchronizowany z rekordem w STREFA_11_ADVENTURES', () => {
      expect(fs.existsSync(jsonPath)).toBe(true);
      const rawText = fs.readFileSync(jsonPath, 'utf-8');
      expect(rawText).not.toMatch(/[–—]/);

      const rawJson = JSON.parse(rawText);
      const runtimeAdv = getAdventureById(adventureId)!;

      expect(runtimeAdv).toBeDefined();
      expect(runtimeAdv.id).toBe(rawJson.id);
      expect(runtimeAdv.title).toBe(rawJson.title);
      expect(runtimeAdv.boundarySummary).toBe(rawJson.boundarySummary);
      expect(runtimeAdv.truthAnchor?.culprit).toBe(rawJson.truthAnchor.culprit);
      expect(runtimeAdv.secretsPool?.length).toBe(rawJson.secretsPool.length);
      expect(runtimeAdv.graph?.nodes?.length).toBe(rawJson.nodes.length);
      expect(runtimeAdv.graph?.clues.length).toBe(rawJson.clues.length);
      expect(runtimeAdv.graph?.connections.length).toBe(rawJson.connections.length);
    });

    it('2. Przechodzi rygorystyczny audyt ThreeClueRuleValidator bez potrzeby syntezy brakujących poszlak (0 błędów)', () => {
      const runtimeAdv = getAdventureById(adventureId)!;
      expect(runtimeAdv.graph).toBeDefined();

      const inspection = ThreeClueRuleValidator.inspectGraph(
        runtimeAdv.graph!,
        { era: runtimeAdv.era, yearRange: runtimeAdv.yearRange, eraLabel: runtimeAdv.eraLabel },
        { location: runtimeAdv.location, country: runtimeAdv.country }
      );

      expect(inspection.isValid).toBe(true);
      expect(inspection.totalSynthesizedClues).toBe(0);
      expect(inspection.issues).toHaveLength(0);
      expect(inspection.checkedBottlenecks).toBeGreaterThanOrEqual(4);
    });

    it('3. Każdy węzeł docelowy (poza prologiem) posiada dokładnie 3 niezależne poszlaki wejściowe o 3 różnych źródłach', () => {
      const runtimeAdv = getAdventureById(adventureId)!;
      const normalized = normalizeAdventureGraph(runtimeAdv.graph);

      const targetNodes = normalized.nodes.filter((n) => n.type !== 'intro');
      expect(targetNodes.length).toBe(4);

      for (const node of targetNodes) {
        expect(node.leadInClueIds.length).toBeGreaterThanOrEqual(3);

        const incomingClues = normalized.clues.filter((c) => c.targetNodeId === node.id);
        expect(incomingClues.length).toBeGreaterThanOrEqual(3);

        const distinctSourceTypes = new Set(incomingClues.map((c) => c.sourceType));
        expect(distinctSourceTypes.size).toBeGreaterThanOrEqual(3);
      }
    });

    it('4. Posiada zdefiniowane granice sprawy (boundarySummary), kotwicę prawdy (truthAnchor) oraz pulę sekretów (secretsPool)', () => {
      const runtimeAdv = getAdventureById(adventureId)!;

      expect(runtimeAdv.boundarySummary).toBeDefined();
      expect(runtimeAdv.boundarySummary!.length).toBeGreaterThan(80);

      expect(runtimeAdv.truthAnchor).toBeDefined();
      expect(runtimeAdv.truthAnchor!.immutableFacts?.length).toBeGreaterThanOrEqual(4);

      expect(runtimeAdv.secretsPool).toBeDefined();
      expect(runtimeAdv.secretsPool!.length).toBeGreaterThanOrEqual(6);
    });

    it('5. Konfiguruje Zegar Zagłady (Doom Clock) w TimeManager po wywołaniu resetForAdventure', () => {
      const runtimeAdv = STREFA_11_ADVENTURES.find((a) => a.id === adventureId)!;
      expect(runtimeAdv.doomClock).toBeDefined();
      expect(runtimeAdv.doomClock?.stages).toHaveLength(4);
      expect(runtimeAdv.startDate).toBeDefined();

      const startTime = timeManager.resetForAdventure(runtimeAdv);
      expect(startTime.year).toBe(runtimeAdv.activeSceneYear);

      const deadline = timeManager.getDeadline();
      expect(deadline).not.toBeNull();
      expect(deadline?.year).toBe(runtimeAdv.doomClock?.deadline?.year);
      expect(deadline?.day).toBe(runtimeAdv.doomClock?.deadline?.day);

      // Na starcie -> Faza 0
      expect(timeManager.getDoomClockPhase()).toBe(0);

      // Po upływie całego totalHours -> Faza 3 (Apogeum)
      timeManager.advanceTime((runtimeAdv.doomClock?.totalHours ?? 24) * 60);
      expect(timeManager.getDoomClockPhase()).toBe(3);
    });
  });
});
