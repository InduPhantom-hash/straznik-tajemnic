import { convertEntriesToBoardNodes } from './convert-entries';
import { ExtendedJournalEntry } from '@/lib/types';
import { EvidenceNode } from '@/types/investigator-board';

describe('convertEntriesToBoardNodes', () => {
  it('should ignore entries of type "journal" and "note"', () => {
    const entries: ExtendedJournalEntry[] = [
      {
        id: '1',
        title: 'Wpis notatnika',
        content: 'Banalne spostrzeżenia',
        type: 'journal',
        tags: [],
      },
      {
        id: '2',
        title: 'Byle co',
        content: 'Banalne przemyślenia',
        type: 'note',
        tags: [],
      },
    ];

    const result = convertEntriesToBoardNodes(entries, []);
    expect(result).toHaveLength(0);
  });

  it('should map encyclopedia_character and encyclopedia_location to correct types', () => {
    const entries: ExtendedJournalEntry[] = [
      {
        id: 'npc1',
        title: 'Thomas Black',
        content: 'Kultysta',
        type: 'encyclopedia_character',
        tags: [],
      },
      {
        id: 'loc1',
        title: 'Zaułek',
        content: 'Ciemny zaułek',
        type: 'encyclopedia_location',
        tags: [],
      },
    ];

    const result = convertEntriesToBoardNodes(entries, []);
    expect(result).toHaveLength(2);
    expect(result.find((n) => n.id === 'node_npc1')?.type).toBe('suspect');
    expect(result.find((n) => n.id === 'node_loc1')?.type).toBe('location');
  });

  it('should preserve existing nodes and their custom X, Y positions', () => {
    const existingNodes: EvidenceNode[] = [
      {
        id: 'node_test1',
        title: 'Old clue',
        description: 'Placed manually',
        type: 'clue',
        status: 'hypothesis',
        position: { x: 333, y: 444 },
        tags: [],
        createdAt: '2025',
      },
    ];

    const entries: ExtendedJournalEntry[] = [
      {
        id: 'test1', // To powinno się zmapować na id 'node_test1'
        title: 'This should be ignored',
        content: 'Because it already exists',
        type: 'quest',
        tags: [],
      },
    ];

    const result = convertEntriesToBoardNodes(entries, existingNodes);
    expect(result).toHaveLength(1);
    expect(result[0].position.x).toBe(333);
    expect(result[0].position.y).toBe(444);
    expect(result[0].title).toBe('Old clue');
  });

  it('should cascade new nodes using offset to avoid stacking directly on top of each other', () => {
    const entries: ExtendedJournalEntry[] = [
      { id: 'new1', title: 'A', content: 'A', type: 'quest', tags: [] },
      { id: 'new2', title: 'B', content: 'B', type: 'quest', tags: [] },
      { id: 'new3', title: 'C', content: 'C', type: 'quest', tags: [] },
    ];

    const result = convertEntriesToBoardNodes(entries, []);
    expect(result).toHaveLength(3);
    
    // First node at offset 0 (50 + 0 * 30)
    expect(result[0].position).toEqual({ x: 50, y: 50 });
    // Second node at offset 1 (50 + 1 * 30)
    expect(result[1].position).toEqual({ x: 80, y: 80 });
    // Third node at offset 2 (50 + 2 * 30)
    expect(result[2].position).toEqual({ x: 110, y: 110 });
  });
});
