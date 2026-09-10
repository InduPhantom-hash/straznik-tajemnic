import {
  dramatronToAdventureContext,
  dramatronToInvestigatorDossier,
  dramatronToRAGDocuments,
  maskDramatronForPlayer,
} from '../dossier-converter';
import { DramatronEngine } from '../dramatron-engine';

describe('DossierConverter (Dramatron to CoC 7e & Dossier)', () => {
  const engine = new DramatronEngine();
  const sampleDramatron = engine.generateDeterministic({
    era: 'classic',
    theme: 'Klątwa Miskatonic',
    location: 'Arkham',
  });

  describe('dramatronToAdventureContext', () => {
    it('konwertuje dramatron do formatu AdventureContext zachowując kompatybilność silnika', () => {
      const context = dramatronToAdventureContext(sampleDramatron);

      expect(context.id).toBeDefined();
      expect(context.title).toBe(sampleDramatron.premise.title);
      expect(context.era).toBe(sampleDramatron.premise.era);
      expect(context.yearRange).toBe(sampleDramatron.premise.exactYear);
      expect(context.location).toBe(sampleDramatron.premise.location);
      expect(context.country).toBe(sampleDramatron.premise.country);

      // Graf śledztwa
      expect(context.graph).toBeDefined();
      expect(context.graph?.npcs.length).toBe(sampleDramatron.cast.length);
      expect(context.graph?.locations.length).toBe(sampleDramatron.locations.length);
      expect(context.graph?.connections.length).toBe(sampleDramatron.clueWeb.connections.length);

      // Prawda świata i opis założeń MG
      expect(context.customDescription).toContain(sampleDramatron.clueWeb.truthAnchor.culprit);
    });

    it('usuwa prawdę świata i sekrety NPC z kontekstu przygody gdy forPlayer = true', () => {
      const playerContext = dramatronToAdventureContext(sampleDramatron, true);

      expect(playerContext.customDescription).not.toContain(sampleDramatron.clueWeb.truthAnchor.culprit);
      expect(playerContext.customDescription).toBe(sampleDramatron.premise.investigatorHook);

      // Sekrety NPC w grafie gracza są usunięte
      for (const npc of playerContext.graph?.npcs || []) {
        expect(npc.secret).toBeUndefined();
      }
    });
  });

  describe('maskDramatronForPlayer', () => {
    it('maskuje wszystkie elementy intrygi przed graczem', () => {
      const masked = maskDramatronForPlayer(sampleDramatron);

      expect(masked.premise.keeperTruthOverview).toBe('');
      expect(masked.premise.centralMystery).toBe('[UKRYTE DLA BADACZA]');
      expect(masked.premise.mythosEntity).toBe('[UKRYTE DLA BADACZA]');
      expect(masked.clueWeb.truthAnchor.culprit).toBe('[UKRYTE]');
      expect(masked.clueWeb.connections.length).toBe(0);
      expect(masked.scenes.length).toBe(0);

      for (const npc of masked.cast) {
        expect(npc.secret).toBe('[SEKRET MG]');
        expect(npc.psychologicalAgenda).toBe('');
      }

      for (const loc of masked.locations) {
        expect(loc.lockedRoomMystery).toBeUndefined();
      }

      for (const clue of masked.clueWeb.clues) {
        expect(clue.leadsToNodeId).toBe('');
        expect(clue.alternativeClueIds).toEqual([]);
      }
    });
  });

  describe('dramatronToInvestigatorDossier', () => {
    it('generuje pełne dossier dla Mistrza Gry (forPlayer = false)', () => {
      const dossier = dramatronToInvestigatorDossier(sampleDramatron, false);

      expect(dossier.adventureId).toBeDefined();
      expect(dossier.truthAnchor).toBeDefined();
      expect(dossier.truthAnchor?.culprit).toBe(sampleDramatron.clueWeb.truthAnchor.culprit);
      expect(dossier.truthAnchor?.motive).toBe(sampleDramatron.clueWeb.truthAnchor.motive);

      // Sprawdzenie sekretów NPC
      const firstNpc = dossier.npcs[0];
      expect(firstNpc.secret).toBeDefined();
      expect(firstNpc.secret).not.toBe('[SEKRET MG]');

      // Sceny
      expect(dossier.scenes?.length).toBe(sampleDramatron.scenes.length);
      expect(dossier.scenes?.[0].beats.length).toBeGreaterThan(0);
    });

    it('maskuje sekrety i prawdę świata dla gracza (forPlayer = true)', () => {
      const playerDossier = dramatronToInvestigatorDossier(sampleDramatron, true);

      // Brak kotwicy prawdy (Sealed Envelope)
      expect(playerDossier.truthAnchor).toBeUndefined();

      // Sekrety NPC zamaskowane
      for (const npc of playerDossier.npcs) {
        expect(npc.secret).toBe('[SEKRET MG]');
      }

      // Brak sekretnych hintów w lokacjach (zagadki Carra)
      for (const loc of playerDossier.locations) {
        expect(loc.lockedRoomMystery?.investigationHint).toBeUndefined();
      }

      // Poszlaki nie mają flagi isKeyClue ani spoilerowego opisu
      for (const clue of playerDossier.clues) {
        expect(clue.isKeyClue).toBe(false);
      }
    });
  });

  describe('dramatronToRAGDocuments', () => {
    it('tworzy dokumenty RAG z epistemicznymi tagami sekretów MG dla bazy wektorowej', () => {
      const docs = dramatronToRAGDocuments(sampleDramatron);

      expect(docs.length).toBeGreaterThanOrEqual(4);

      const premiseDoc = docs.find((d) => d.metadata.contentType === 'adventure_premise');
      expect(premiseDoc).toBeDefined();
      expect(premiseDoc?.text).toContain('PRAWDA MISTRZA GRY:');

      const cluesDoc = docs.find((d) => d.metadata.contentType === 'clue_network');
      expect(cluesDoc).toBeDefined();
      expect(cluesDoc?.text).toContain(sampleDramatron.clueWeb.truthAnchor.culprit);
    });
  });
});
