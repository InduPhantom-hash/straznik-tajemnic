import { extractEquipmentEvents } from './equipment-parser';

describe('equipment-parser', () => {
  it('parses ZUZYJ / use tags with default and specified quantities', () => {
    const text = `
    Opatrujesz ranę bandażem z apteczki.
    [EKWIPUNEK: ZUZYJ | Bandaże]
    Ból nieco ustępuje. Następnie wstrzykujesz 2 dawki leku.
    [EKWIPUNEK: ZUŻYJ | Morfina | 2]
    `;

    const events = extractEquipmentEvents(text);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      action: 'use',
      itemName: 'Bandaże',
      quantity: 1,
      characterName: undefined,
      rawText: '[EKWIPUNEK: ZUZYJ | Bandaże]',
    });
    expect(events[1]).toEqual({
      action: 'use',
      itemName: 'Morfina',
      quantity: 2,
      characterName: undefined,
      rawText: '[EKWIPUNEK: ZUŻYJ | Morfina | 2]',
    });
  });

  it('parses USUN / remove tags', () => {
    const text = 'Wrzucasz puste fiolki do pieca. [EKWIPUNEK: USUN | Pusta fiolka]';
    const events = extractEquipmentEvents(text);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      action: 'remove',
      itemName: 'Pusta fiolka',
      characterName: undefined,
      rawText: '[EKWIPUNEK: USUN | Pusta fiolka]',
    });
  });

  it('parses DODAJ / add tags with category and description', () => {
    const text = `
    W szufladzie biurka odnajdujesz stary klucz.
    [EKWIPUNEK: DODAJ | Mosiężny klucz | tool | Ciężki klucz do piwnicy]
    `;
    const events = extractEquipmentEvents(text);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      action: 'add',
      itemName: 'Mosiężny klucz',
      category: 'tool',
      description: 'Ciężki klucz do piwnicy',
      characterName: undefined,
      rawText: '[EKWIPUNEK: DODAJ | Mosiężny klucz | tool | Ciężki klucz do piwnicy]',
    });
  });

  it('supports duet/hot-seat character prefix @Character:', () => {
    const text = `
    [EKWIPUNEK:@Margaret Sullivan: ZUZYJ | Apteczka | 1]
    [EKWIPUNEK:@Tomasz: DODAJ | Gazeta poranna | document | Wycinek z kroniki]
    `;
    const events = extractEquipmentEvents(text);
    expect(events).toHaveLength(2);
    expect(events[0].characterName).toBe('Margaret Sullivan');
    expect(events[0].action).toBe('use');
    expect(events[1].characterName).toBe('Tomasz');
    expect(events[1].action).toBe('add');
    expect(events[1].category).toBe('document');
  });

  it('returns empty array when no equipment tags are present', () => {
    const text = 'Zwykły opis sceny bez żadnych znaczników.';
    expect(extractEquipmentEvents(text)).toEqual([]);
  });
});
