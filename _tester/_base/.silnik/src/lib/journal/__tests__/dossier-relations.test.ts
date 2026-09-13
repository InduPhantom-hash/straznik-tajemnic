/**
 * @file dossier-relations.test.ts
 *
 * Testy jednostkowe dla uszczelnionych relacji w Aktach Śledczych (Investigator's Dossier CoC 7e RAW):
 * - Fakt <-> NPC <-> Lokacja
 * - linkClueNpcLocation
 * - processCharacterJournalAndDossier (tagi pipe ze świadkiem i lokacją)
 * - migrateLegacyJournalToDossier
 */

import {
  linkClueNpcLocation,
  type InvestigatorDossier,
  type ClueEntry,
  type NpcDossierEntry,
  type LocationDossierEntry,
} from '@/lib/journal/dossier-types';
import { appendJournalFromText } from '@/lib/journal/apply-journal-tags';
import { migrateLegacyJournalToDossier } from '@/lib/journal/dossier-migration';
import type { Character, JournalEntry } from '@/lib/types';

describe('Dossier Bidirectional Relations (Fact <-> NPC <-> Location)', () => {
  const createBaseCharacter = (): Character => ({
    id: 'char-test-1',
    name: 'Harvey Walters',
    playerName: 'Tester',
    str: 50,
    dex: 50,
    con: 50,
    app: 50,
    pow: 50,
    edu: 50,
    siz: 50,
    int: 75,
    luck: 50,
    hp: 10,
    san: 50,
    mp: 10,
    skills: {},
    occupation: 'Dziennikarz',
    age: 40,
    background: 'Śledczy z Bostonu',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 10 },
    developmentHistory: [],
    investigatorDossier: {
      clues: [],
      npcs: [],
      locations: [],
      notes: [],
    },
  });

  describe('linkClueNpcLocation', () => {
    it('synchronizuje relacje między Poszlaką, Postacią (NPC) i Lokacją na podstawie nazw', () => {
      const clue: ClueEntry = {
        id: 'clue-1',
        title: 'Cyfrowy kod do sejfu',
        description: 'Znaleziony w bibliotece',
        category: 'document',
        status: 'confirmed',
        sourceNpc: 'Lokaj Jenkins',
        foundLocation: 'Posiadłość Blackwoodów',
      };

      const npc: NpcDossierEntry = {
        id: 'npc-jenkins',
        name: 'Lokaj Jenkins',
        relationshipStatus: 'neutral',
        location: 'Posiadłość Blackwoodów',
      };

      const location: LocationDossierEntry = {
        id: 'loc-blackwood',
        name: 'Posiadłość Blackwoodów',
        searchStatus: 'partially_searched',
      };

      const dossier: InvestigatorDossier = {
        clues: [clue],
        npcs: [npc],
        locations: [location],
        notes: [],
      };

      const changed = linkClueNpcLocation(dossier);

      expect(changed).toBe(true);

      // Poszlaka otrzymała ID NPC i Lokacji
      expect(clue.sourceNpcId).toBe('npc-jenkins');
      expect(clue.foundLocationId).toBe('loc-blackwood');

      // NPC otrzymał ID Lokacji oraz ID powiązanej poszlaki
      expect(npc.locationId).toBe('loc-blackwood');
      expect(npc.relatedClueIds).toContain('clue-1');

      // Lokacja otrzymała ID NPC oraz ID poszlaki
      expect(location.npcIds).toContain('npc-jenkins');
      expect(location.discoveredClueIds).toContain('clue-1');

      // Drugie wywołanie powinno być idempotentne (zwraca false, bo brak zmian)
      const secondRun = linkClueNpcLocation(dossier);
      expect(secondRun).toBe(false);
      expect(npc.relatedClueIds?.filter((id) => id === 'clue-1')).toHaveLength(1);
      expect(location.discoveredClueIds?.filter((id) => id === 'clue-1')).toHaveLength(1);
      expect(location.npcIds?.filter((id) => id === 'npc-jenkins')).toHaveLength(1);
    });

    it('uzupełnia nazwy na podstawie przekazanych ID', () => {
      const clue: ClueEntry = {
        id: 'clue-2',
        title: 'Zakrwawiony sztylet',
        description: 'Ukryty w szafie',
        category: 'forensic',
        status: 'confirmed',
        sourceNpcId: 'npc-mary',
        foundLocationId: 'loc-attic',
      };

      const npc: NpcDossierEntry = {
        id: 'npc-mary',
        name: 'Mary Kelly',
        relationshipStatus: 'suspicious',
        locationId: 'loc-attic',
      };

      const location: LocationDossierEntry = {
        id: 'loc-attic',
        name: 'Poddasze kamienicy',
        searchStatus: 'partially_searched',
      };

      const dossier: InvestigatorDossier = {
        clues: [clue],
        npcs: [npc],
        locations: [location],
        notes: [],
      };

      const changed = linkClueNpcLocation(dossier);

      expect(changed).toBe(true);
      expect(clue.sourceNpc).toBe('Mary Kelly');
      expect(clue.foundLocation).toBe('Poddasze kamienicy');
      expect(npc.location).toBe('Poddasze kamienicy');
      expect(npc.relatedClueIds).toContain('clue-2');
      expect(location.discoveredClueIds).toContain('clue-2');
      expect(location.npcIds).toContain('npc-mary');
    });
  });

  describe('processCharacterJournalAndDossier integration', () => {
    it('parsuje tagi ze świadkiem i lokacją oraz automatycznie wiąże je w Dossier', () => {
      const character = createBaseCharacter();
      const narrativeText = `
Wchodzimy do biblioteki uniwersyteckiej.
[LOKACJA: Biblioteka Orne: Stary gmach uniwersytecki]
[NPC: Profesor Armitage: Główny bibliotekarz | relacja: friendly | lokacja: Biblioteka Orne]
[DZIENNIK:clue:Necronomicon z przekładem Dee | świadek: Profesor Armitage | lokacja: Biblioteka Orne]Profesor pokazuje nam zniszczone woluminy.[/DZIENNIK]
Profesor pokazuje nam zniszczone woluminy.
      `;

      const updated = appendJournalFromText(character, narrativeText, 'msg-orne-1');

      const dossier = updated.investigatorDossier;
      expect(dossier).toBeDefined();

      const clues = dossier?.clues || [];
      const npcs = dossier?.npcs || [];
      const locations = dossier?.locations || [];

      expect(clues.length).toBeGreaterThanOrEqual(1);
      expect(npcs.length).toBeGreaterThanOrEqual(1);
      expect(locations.length).toBeGreaterThanOrEqual(1);

      const necronomicon = clues.find((c) => c.title.includes('Necronomicon'));
      const armitage = npcs.find((n) => n.name.includes('Armitage'));
      const library = locations.find((l) => l.name.includes('Biblioteka Orne'));

      expect(necronomicon).toBeDefined();
      expect(armitage).toBeDefined();
      expect(library).toBeDefined();

      // Weryfikacja powiązań dwukierunkowych
      expect(necronomicon?.sourceNpc).toBe('Profesor Armitage');
      expect(necronomicon?.sourceNpcId).toBe(armitage?.id);
      expect(necronomicon?.foundLocation).toBe('Biblioteka Orne');
      expect(necronomicon?.foundLocationId).toBe(library?.id);

      expect(armitage?.location).toBe('Biblioteka Orne');
      expect(armitage?.locationId).toBe(library?.id);
      expect(armitage?.relatedClueIds).toContain(necronomicon?.id);

      expect(library?.npcIds).toContain(armitage?.id);
      expect(library?.discoveredClueIds).toContain(necronomicon?.id);
    });
  });

  describe('migrateLegacyJournalToDossier integration', () => {
    it('uszczelnia relacje starych wpisów po migracji', () => {
      const legacyJournal: JournalEntry[] = [
        {
          id: 'legacy-loc',
          title: 'Zaułek Rybacki',
          content: 'Mroczny zaułek portowy',
          type: 'location',
          timestamp: new Date(),
          tags: [],
          isBookmarked: false,
        },
        {
          id: 'legacy-npc',
          title: 'Stary Rybak Zadok',
          content: 'Miejscowy pijak',
          type: 'npc',
          timestamp: new Date(),
          tags: ['lokacja: Zaułek Rybacki'],
          isBookmarked: false,
        },
        {
          id: 'legacy-clue',
          title: 'Złoty Medalion Dagon',
          content: 'Przedziwny medalion z głębin',
          type: 'clue',
          timestamp: new Date(),
          tags: ['świadek: Stary Rybak Zadok', 'lokacja: Zaułek Rybacki'],
          isBookmarked: false,
        },
      ];

      const dossier = migrateLegacyJournalToDossier(legacyJournal);

      const zadok = dossier.npcs.find((n) => n.name === 'Stary Rybak Zadok');
      const alley = dossier.locations.find((l) => l.name === 'Zaułek Rybacki');
      const medallion = dossier.clues.find((c) => c.title === 'Złoty Medalion Dagon');

      expect(zadok).toBeDefined();
      expect(alley).toBeDefined();
      expect(medallion).toBeDefined();

      expect(medallion?.sourceNpcId).toBe(zadok?.id);
      expect(medallion?.foundLocationId).toBe(alley?.id);

      expect(zadok?.locationId).toBe(alley?.id);
      expect(zadok?.relatedClueIds).toContain(medallion?.id);

      expect(alley?.npcIds).toContain(zadok?.id);
      expect(alley?.discoveredClueIds).toContain(medallion?.id);
    });
  });
});
