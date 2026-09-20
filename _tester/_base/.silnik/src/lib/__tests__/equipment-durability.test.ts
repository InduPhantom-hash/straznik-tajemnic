import { applyEquipmentEventsToParty } from '../character/apply-equipment-events';
import { extractEquipmentEvents } from '../parsers/equipment-parser';
import type { Character } from '../types';

describe('Equipment Durability and Event Lifecycle (Issue #401)', () => {
  const mockCharacter: Character = {
    id: 'char_1',
    name: 'Edward Carnby',
    occupation: 'Detektyw',
    age: 32,
    background: 'Bada zagadkowe zjawiska w Nowej Anglii.',
    playerName: 'Tester',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 10 },
    developmentHistory: [],
    str: 60,
    con: 60,
    siz: 65,
    dex: 70,
    int: 75,
    pow: 60,
    app: 50,
    edu: 70,
    hp: 12,
    mp: 12,
    san: 60,
    luck: 50,
    skills: {},
    equipment: [
      {
        id: 'item_medkit',
        name: 'Apteczka pierwszej pomocy',
        category: 'medical',
        charges: 3,
        maxCharges: 3,
        condition: 'working',
      },
      {
        id: 'item_revolver',
        name: 'Rewolwer Colt .38',
        category: 'weapon',
        currentAmmo: 6,
        maxAmmo: 6,
      },
      {
        id: 'item_matches',
        name: 'Pudełko zapałek',
        category: 'tool',
        quantity: 5,
      },
      {
        id: 'item_letter',
        name: 'Tajemniczy list',
        category: 'document',
      },
    ],
  };

  it('zużywa ładunek apteczki i zmienia stan na depleted przy osiągnięciu 0', () => {
    // Pierwsze użycie: 3 -> 2
    const res1 = applyEquipmentEventsToParty([mockCharacter], mockCharacter, '[EKWIPUNEK: ZUŻYJ | Apteczka pierwszej pomocy | 1]');
    expect(res1.changed).toBe(true);
    const medkit1 = res1.activeCharacter.equipment?.find((it) => it.id === 'item_medkit');
    expect(medkit1?.charges).toBe(2);
    expect(medkit1?.condition).toBe('working');

    // Kolejne użycie: 2 -> 0 (zużycie 2 ładunków na raz)
    const charAfter1 = res1.activeCharacter;
    const res2 = applyEquipmentEventsToParty([charAfter1], charAfter1, '[EKWIPUNEK: ZUZYJ | Apteczka pierwszej pomocy | 2]');
    expect(res2.changed).toBe(true);
    const medkit2 = res2.activeCharacter.equipment?.find((it) => it.id === 'item_medkit');
    expect(medkit2?.charges).toBe(0);
    expect(medkit2?.condition).toBe('depleted');
  });

  it('zmniejsza amunicję w broni palnej przy strzale', () => {
    const res = applyEquipmentEventsToParty([mockCharacter], mockCharacter, '[EKWIPUNEK: ZUŻYJ | Rewolwer Colt .38 | 2]');
    expect(res.changed).toBe(true);
    const revolver = res.activeCharacter.equipment?.find((it) => it.id === 'item_revolver');
    expect(revolver?.currentAmmo).toBe(4);
    expect(revolver?.maxAmmo).toBe(6);
  });

  it('obsługuje polskie tagi utraty przedmiotu (stracono, utracono, zgubiono, lost)', () => {
    const events = extractEquipmentEvents(
      'W ucieczce przez bagna [EKWIPUNEK: STRACONO | Tajemniczy list] oraz [EKWIPUNEK: ZGUBIONO | Pudełko zapałek].'
    );
    expect(events).toHaveLength(2);
    expect(events[0].action).toBe('remove');
    expect(events[0].itemName).toBe('Tajemniczy list');
    expect(events[1].action).toBe('remove');
    expect(events[1].itemName).toBe('Pudełko zapałek');

    const res = applyEquipmentEventsToParty(
      [mockCharacter],
      mockCharacter,
      '[EKWIPUNEK: UTRACONO | Tajemniczy list]'
    );
    expect(res.changed).toBe(true);
    expect(res.activeCharacter.equipment?.some((it) => it.name === 'Tajemniczy list')).toBe(false);
  });
});
