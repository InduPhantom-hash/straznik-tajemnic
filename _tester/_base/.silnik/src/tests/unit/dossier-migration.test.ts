import {
  migrateLegacyJournalToDossier,
  inferClueCategory,
  inferClueStatus,
  ensureCharacterDossier,
} from '@/lib/journal/dossier-migration';
import { createEmptyDossier } from '@/lib/journal/dossier-types';

describe('Dossier Migration & Anti-cRPG Normalization (CoC 7e RAW)', () => {
  describe('inferClueCategory', () => {
    it('prawidłowo rozpoznaje kategorię forensic (ślady, medycyna sądowa)', () => {
      expect(
        inferClueCategory({
          title: 'Ślady krwi na dywanie',
          content: 'Oględziny zwłok wykazały rany kłute.',
        })
      ).toBe('forensic');

      expect(
        inferClueCategory({
          title: 'Odciski palców',
          tags: ['autopsja', 'sekcja'],
        })
      ).toBe('forensic');
    });

    it('prawidłowo rozpoznaje kategorię document (akta, listy, prasa)', () => {
      expect(
        inferClueCategory({
          title: 'Wycinek z Boston Globe',
          content: 'Artykuł o pożarze w magazynie.',
        })
      ).toBe('document');

      expect(
        inferClueCategory({
          title: 'List od wuja',
          tags: ['telegram', 'dokument'],
        })
      ).toBe('document');
    });

    it('prawidłowo rozpoznaje kategorię testimony (zeznania świadków)', () => {
      expect(
        inferClueCategory({
          title: 'Rozmowa z barmanem',
          content: 'Świadek widział podejrzanego mężczyznę w kapeluszu.',
        })
      ).toBe('testimony');

      expect(
        inferClueCategory({
          title: 'Przesłuchanie dozorcy',
          tags: ['zeznanie'],
        })
      ).toBe('testimony');
    });

    it('prawidłowo rozpoznaje kategorię occult (mity, okultyzm, rytuały)', () => {
      expect(
        inferClueCategory({
          title: 'Rzeźbiony symbol Cthulhu',
          content: 'Bluźnierczy rytuał w piwnicy.',
        })
      ).toBe('occult');

      expect(
        inferClueCategory({
          title: 'Księga Eibona',
          tags: ['mity', 'artefakt'],
        })
      ).toBe('occult');
    });

    it('zwraca forensic jako bezpieczny domyślny fallback', () => {
      expect(
        inferClueCategory({
          title: 'Dziwny klucz',
          content: 'Mosiężny kluczyk znaleziony w szufladzie.',
        })
      ).toBe('forensic');
    });
  });

  describe('inferClueStatus', () => {
    it('konwertuje cRPG questStatus: completed lub confirmed na confirmed', () => {
      expect(inferClueStatus({ questStatus: 'completed' })).toBe('confirmed');
      expect(inferClueStatus({ hypothesisStatus: 'confirmed' })).toBe('confirmed');
    });

    it('konwertuje cRPG questStatus: failed lub disproven na disproven', () => {
      expect(inferClueStatus({ questStatus: 'failed' })).toBe('disproven');
      expect(inferClueStatus({ hypothesisStatus: 'disproven' })).toBe('disproven');
    });

    it('zwraca unconfirmed dla aktywnych lub nieokreślonych wpisów', () => {
      expect(inferClueStatus({ questStatus: 'active' })).toBe('unconfirmed');
      expect(inferClueStatus({})).toBe('unconfirmed');
    });
  });

  describe('migrateLegacyJournalToDossier', () => {
    it('obsługuje puste, null i nieprawidłowe dane wejściowe bez crasha', () => {
      const empty1 = migrateLegacyJournalToDossier(null);
      expect(empty1.clues).toEqual([]);
      expect(empty1.npcs).toEqual([]);
      expect(empty1.locations).toEqual([]);
      expect(empty1.notes).toEqual([]);

      const empty2 = migrateLegacyJournalToDossier(undefined);
      expect(empty2.clues).toEqual([]);

      const empty3 = migrateLegacyJournalToDossier(['nie-obiekt', null, 123, {}]);
      expect(empty3.clues.length).toBe(1); // pusty obiekt przekształcony w bezpieczny wpis
      expect(empty3.clues[0].title).toBe('Nieopisana poszlaka');
    });

    it('konwertuje stare questy cRPG na poszlaki z zachowaniem celów', () => {
      const legacyQuests = [
        {
          id: 'quest_1',
          type: 'quest',
          title: 'Tajemnica Domu Corbitta',
          content: 'Zbadaj dziwne zjawiska w starym domostwie.',
          questStatus: 'completed' as const,
          tags: ['mit', 'rytuał'],
          objectives: [
            {
              id: 'obj_1',
              description: 'Przeszukaj piwnicę',
              completed: true,
              dateCompleted: '12.10.1925',
            },
            {
              id: 'obj_2',
              description: 'Znajdź dziennik pastora',
              completed: true,
            },
          ],
        },
      ];

      const dossier = migrateLegacyJournalToDossier(legacyQuests);
      expect(dossier.clues.length).toBe(1);

      const clue = dossier.clues[0];
      expect(clue.id).toBe('quest_1');
      expect(clue.title).toBe('Tajemnica Domu Corbitta');
      expect(clue.status).toBe('confirmed');
      expect(clue.category).toBe('occult');
      expect(clue.description).toContain('Cele śledcze:');
      expect(clue.description).toContain('- [x] Przeszukaj piwnicę (odnotowano: 12.10.1925)');
      expect(clue.description).toContain('- [x] Znajdź dziennik pastora');
    });

    it('konwertuje wpisy NPC do katalogu npcs', () => {
      const legacyEntries = [
        {
          id: 'npc_1',
          type: 'encyclopedia_character',
          title: 'Profesor Armitage',
          content: 'Główny bibliotekarz Uniwersytetu Miskatonic.',
          category: 'Naukowiec',
          tags: ['przyjazny', 'arkham'],
          investigatorInsight: 'Wie dużo o księdze Necronomicon.',
        },
      ];

      const dossier = migrateLegacyJournalToDossier(legacyEntries);
      expect(dossier.npcs.length).toBe(1);
      const npc = dossier.npcs[0];
      expect(npc.id).toBe('npc_1');
      expect(npc.name).toBe('Profesor Armitage');
      expect(npc.occupation).toBe('Naukowiec');
      expect(npc.relationshipStatus).toBe('friendly');
      expect(npc.keyInformation).toBe('Wie dużo o księdze Necronomicon.');
    });

    it('konwertuje wpisy lokacji do katalogu locations', () => {
      const legacyEntries = [
        {
          id: 'loc_1',
          type: 'encyclopedia_location',
          title: 'Szpital Psychiatryczny w Arkham',
          content: 'Ponury gmach na wzgórzu.',
          category: 'Arkham, Northside',
          tags: ['szpital'],
        },
      ];

      const dossier = migrateLegacyJournalToDossier(legacyEntries);
      expect(dossier.locations.length).toBe(1);
      const loc = dossier.locations[0];
      expect(loc.id).toBe('loc_1');
      expect(loc.name).toBe('Szpital Psychiatryczny w Arkham');
      expect(loc.addressOrRegion).toBe('Arkham, Northside');
      expect(loc.searchStatus).toBe('partially_searched');
    });

    it('konwertuje notatki gracza do katalogu notes', () => {
      const legacyEntries = [
        {
          id: 'note_1',
          type: 'note',
          title: 'Moja teoria',
          content: 'Uważam, że pastor sfingował swoją śmierć.',
        },
      ];

      const dossier = migrateLegacyJournalToDossier(legacyEntries);
      expect(dossier.notes.length).toBe(1);
      const note = dossier.notes[0];
      expect(note.id).toBe('note_1');
      expect(note.title).toBe('Moja teoria');
      expect(note.content).toBe('Uważam, że pastor sfingował swoją śmierć.');
    });

    it('jest idempotentny i zapobiega duplikacji wpisów o tych samych ID', () => {
      const initialDossier = createEmptyDossier();
      initialDossier.clues.push({
        id: 'clue_unique',
        title: 'Istniejący dowód',
        description: 'Nie powinien być zduplikowany',
        category: 'forensic',
        status: 'confirmed',
      });

      const legacyEntries = [
        {
          id: 'clue_unique',
          title: 'Stary duplikat',
          content: 'Treść',
        },
        {
          id: 'clue_new',
          title: 'Nowy dowód',
          content: 'Treść',
        },
      ];

      const result = migrateLegacyJournalToDossier(legacyEntries, initialDossier);
      expect(result.clues.length).toBe(2);
      expect(result.clues.find((c) => c.id === 'clue_unique')?.title).toBe('Istniejący dowód');
      expect(result.clues.find((c) => c.id === 'clue_new')?.title).toBe('Nowy dowód');
    });
  });

  describe('ensureCharacterDossier', () => {
    it('wzbogaca obiekt postaci o akta śledcze gdy ich brak', () => {
      const mockChar = {
        id: 'char_1',
        name: 'Edward Pierce',
        journal: [
          {
            id: 'j_1',
            type: 'clue',
            title: 'Ślady błota',
            content: 'Na progu gabinetu.',
          },
        ],
      };

      const enriched = ensureCharacterDossier(mockChar);
      expect(enriched.investigatorDossier).toBeDefined();
      expect(enriched.investigatorDossier.clues.length).toBe(1);
      expect(enriched.investigatorDossier.clues[0].title).toBe('Ślady błota');
    });
  });
});
