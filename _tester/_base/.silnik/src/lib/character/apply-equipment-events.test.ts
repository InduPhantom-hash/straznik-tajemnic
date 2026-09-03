import { applyEquipmentEventsToParty } from './apply-equipment-events';
import type { Character, EquipmentItem } from '../types';

describe('applyEquipmentEventsToParty', () => {
  const createMockCharacter = (id: string, name: string, equipment: EquipmentItem[] = []): Character => ({
    id,
    name,
    occupation: 'Detektyw',
    age: 35,
    str: 50,
    con: 50,
    siz: 50,
    dex: 50,
    app: 50,
    int: 50,
    pow: 50,
    edu: 50,
    skills: {},
    hp: 10,
    san: 50,
    maxSan: 99,
    luck: 50,
    mp: 10,
    equipment,
    background: '',
    playerName: 'Gracz',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 0,
    },
    developmentHistory: [],
  });

  it('decrements consumable item quantity on use tag', () => {
    const morphine: EquipmentItem = {
      id: 'item-1',
      name: 'Morfina',
      category: 'medical',
      quantity: 5,
      maxQuantity: 5,
      isConsumable: true,
    };
    const active = createMockCharacter('char-1', 'Edward Carnby', [morphine]);
    const text = 'Wstrzykujesz dawkę leku rannemu koledze. [EKWIPUNEK: ZUZYJ | Morfina | 1]';

    const result = applyEquipmentEventsToParty([active], active, text);
    expect(result.changed).toBe(true);
    expect(result.activeCharacter.equipment?.[0].quantity).toBe(4);
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toEqual({
      type: 'use',
      itemName: 'Morfina',
      quantity: 1,
      remaining: 4,
      characterName: 'Edward Carnby',
    });
  });

  it('removes item completely when quantity drops to 0 or below', () => {
    const bandage: EquipmentItem = {
      id: 'item-2',
      name: 'Bandaże',
      category: 'medical',
      quantity: 1,
      isConsumable: true,
    };
    const active = createMockCharacter('char-1', 'Edward Carnby', [bandage]);
    const text = 'Zużywasz ostatni bandaż. [EKWIPUNEK: ZUZYJ | Bandaże]';

    const result = applyEquipmentEventsToParty([active], active, text);
    expect(result.changed).toBe(true);
    expect(result.activeCharacter.equipment).toHaveLength(0);
    expect(result.notifications[0]).toEqual({
      type: 'remove',
      itemName: 'Bandaże',
      remaining: 0,
      characterName: 'Edward Carnby',
    });
  });

  it('removes item on USUN tag', () => {
    const key: EquipmentItem = {
      id: 'item-3',
      name: 'Zardzewiały klucz',
      category: 'tool',
    };
    const active = createMockCharacter('char-1', 'Edward Carnby', [key]);
    const text = 'Klucz łamie się w zamku i wypada w głąb studni. [EKWIPUNEK: USUN | Zardzewiały klucz]';

    const result = applyEquipmentEventsToParty([active], active, text);
    expect(result.changed).toBe(true);
    expect(result.activeCharacter.equipment).toHaveLength(0);
  });

  it('adds a new item on DODAJ tag', () => {
    const active = createMockCharacter('char-1', 'Edward Carnby', []);
    const text = 'W kredensie znajdujesz stary dziennik. [EKWIPUNEK: DODAJ | Dziennik kultysty | document | Zapiski w obcym języku]';

    const result = applyEquipmentEventsToParty([active], active, text);
    expect(result.changed).toBe(true);
    expect(result.activeCharacter.equipment).toHaveLength(1);
    const added = result.activeCharacter.equipment?.[0];
    expect(added?.name).toBe('Dziennik kultysty');
    expect(added?.category).toBe('document');
    expect(added?.description).toBe('Zapiski w obcym języku');
  });

  it('supports target character attribution with @CharacterName', () => {
    const char1 = createMockCharacter('c1', 'Edward Carnby', []);
    const char2 = createMockCharacter('c2', 'Margaret Sullivan', [
      { id: 'm1', name: 'Apteczka', category: 'medical', quantity: 3, isConsumable: true },
    ]);

    const text = '[EKWIPUNEK:@Margaret Sullivan: ZUZYJ | Apteczka | 1]';
    const result = applyEquipmentEventsToParty([char1, char2], char1, text);

    expect(result.changed).toBe(true);
    const updatedC2 = result.characters.find((c) => c.id === 'c2');
    expect(updatedC2?.equipment?.[0].quantity).toBe(2);
  });
});
