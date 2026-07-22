import { findEntityVisualReference, normalizeEntityName } from './entity-visual-resolver';
import type { Character, NPC, Location } from '@/lib/types';

describe('entity-visual-resolver', () => {
  it('normalizuje nazwy usuwając tytuły i małe/duże litery', () => {
    expect(normalizeEntityName('Dr. Henrick Weston')).toBe('henrick weston');
    expect(normalizeEntityName('Ojciec Klimuszko')).toBe('klimuszko');
    expect(normalizeEntityName('Pan Jan')).toBe('jan');
  });

  it('odnajduje wizerunek referencyjny dla postaci gracza', () => {
    const character: Partial<Character> = {
      name: 'Henrick Weston',
      portraitUrl: 'data:image/png;base64,mockCharacterPortrait',
      description: 'Badacz mitów',
    };

    const ref = findEntityVisualReference('Dr. Henrick Weston', { character: character as Character });
    expect(ref).not.toBeNull();
    expect(ref?.imageUrl).toBe('data:image/png;base64,mockCharacterPortrait');
    expect(ref?.type).toBe('character');
  });

  it('odnajduje wizerunek referencyjny dla NPC', () => {
    const npcs: Partial<NPC>[] = [
      {
        name: 'Ojciec Klimuszko',
        portraitUrl: 'data:image/png;base64,mockNpcPortrait',
        appearance: 'Starszy kapłan w sutannie',
      },
    ];

    const ref = findEntityVisualReference('Klimuszko', { npcs: npcs as NPC[] });
    expect(ref).not.toBeNull();
    expect(ref?.imageUrl).toBe('data:image/png;base64,mockNpcPortrait');
    expect(ref?.type).toBe('npc');
  });

  it('odnajduje wizerunek referencyjny dla lokacji', () => {
    const locations: Partial<Location>[] = [
      {
        name: 'Kościół w Prabutach',
        mapUrl: 'data:image/png;base64,mockLocationMap',
        appearance: 'Mroczna gotycka świątynia',
      },
    ];

    const ref = findEntityVisualReference('Kościół w Prabutach', { locations: locations as Location[] });
    expect(ref).not.toBeNull();
    expect(ref?.imageUrl).toBe('data:image/png;base64,mockLocationMap');
    expect(ref?.type).toBe('location');
  });
});
