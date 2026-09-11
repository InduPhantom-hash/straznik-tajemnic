import { WEAPONS_II_RP, ALL_EQUIPMENT } from './equipment-data';
import { findEquipmentTemplate } from './equipment-catalog';
import { inferWeaponSkill, isMeleeWeapon } from './combat/weapon-context';
import { categorizeItem, generateItemLore } from './character/item-helpers';

describe('equipment-iirp (Podrecznik Badacza CoC 7ed, s. 214-216)', () => {
  it('zawiera co najmniej 15 historycznych modeli broni II Rzeczypospolitej', () => {
    expect(WEAPONS_II_RP.length).toBeGreaterThanOrEqual(15);

    const expectedTemplateIds = [
      'weapon.nagant-1895',
      'weapon.reichsrevolver-m1879',
      'weapon.browning-fn1900',
      'weapon.browning-fn1905',
      'weapon.browning-m1910',
      'weapon.p08-parabellum',
      'weapon.mauser-c96',
      'weapon.colt-m1911',
      'weapon.vis-wz35',
      'weapon.karabin-wz98',
      'weapon.karabinek-wz91-98-23',
      'weapon.karabin-ppanc-ur-wz35',
      'weapon.pm-mors',
      'weapon.dubeltowka-mysliwska',
      'weapon.sztucer-mysliwski',
      'weapon.rkm-chauchat',
    ];

    expectedTemplateIds.forEach((templateId) => {
      const weapon = WEAPONS_II_RP.find((w) => w.templateId === templateId);
      expect(weapon).toBeDefined();
    });
  });

  it('kazda bron II RP posiada poprawne statystyki RAW CoC 7e w modifiers', () => {
    WEAPONS_II_RP.forEach((w) => {
      expect(w.category).toBe('weapon');
      expect(typeof w.name).toBe('string');
      expect(typeof w.description).toBe('string');

      const m = w.modifiers;
      expect(m).toBeDefined();
      expect(typeof m?.damage).toBe('string');
      expect(typeof m?.range).toBe('string');
      expect(m?.attacks).toBeDefined();
      expect(typeof m?.capacity).toBe('number');
      expect((m?.capacity ?? 0)).toBeGreaterThan(0);
      expect(typeof m?.malfunction).toBe('number');
      // Chauchat ma zawodnosc 70 ze wzgledu na wyciecia w magazynku, inne 90-100
      expect((m?.malfunction ?? 0)).toBeGreaterThanOrEqual(70);
      expect((m?.malfunction ?? 0)).toBeLessThanOrEqual(100);

      // Ceny w zlotych z epoki i dostepnosc
      expect(typeof m?.availability).toBe('string');
      expect(typeof m?.priceZl).toBe('number');
      expect((m?.priceZl ?? 0)).toBeGreaterThan(0);
    });
  });

  it('wszystkie bronie II RP znajduja sie w ALL_EQUIPMENT', () => {
    WEAPONS_II_RP.forEach((w) => {
      const found = ALL_EQUIPMENT.find(
        (item) => item.templateId === w.templateId && item.name === w.name
      );
      expect(found).toBeDefined();
    });
  });

  it('kazda bron II RP posiada odpowiednik w EQUIPMENT_CATALOG', () => {
    WEAPONS_II_RP.forEach((w) => {
      const template = findEquipmentTemplate(w.templateId || w.name || '');
      expect(template).toBeDefined();
      expect(template?.category).toBe('weapon');
      expect(template?.availableIn).toBeDefined();
      expect(template?.availableIn.length).toBeGreaterThan(0);
    });
  });

  it('weryfikuje konkretne statystyki RAW kluczowych modeli z podrecznika', () => {
    // Rewolwer Nagant wz. 1895: 1d8, beben 7, zawodnosc 100, 80 zl
    const nagant = WEAPONS_II_RP.find((w) => w.templateId === 'weapon.nagant-1895');
    expect(nagant?.modifiers?.damage).toBe('1d8');
    expect(nagant?.modifiers?.capacity).toBe(7);
    expect(nagant?.modifiers?.malfunction).toBe(100);
    expect(nagant?.modifiers?.priceZl).toBe(80);

    // Browning FN 1905: 1d6, magazynek 6, zawodnosc 98, 120 zl
    const browning = WEAPONS_II_RP.find((w) => w.templateId === 'weapon.browning-fn1905');
    expect(browning?.modifiers?.damage).toBe('1d6');
    expect(browning?.modifiers?.capacity).toBe(6);
    expect(browning?.modifiers?.malfunction).toBe(98);
    expect(browning?.modifiers?.priceZl).toBe(120);

    // Karabin ppanc wz. 35 Ur: 2d10+4, zasieg 150 m, zawodnosc 99, 2000 zl
    const ur = WEAPONS_II_RP.find((w) => w.templateId === 'weapon.karabin-ppanc-ur-wz35');
    expect(ur?.modifiers?.damage).toBe('2d10+4');
    expect(ur?.modifiers?.range).toBe('150 m');
    expect(ur?.modifiers?.malfunction).toBe(99);
    expect(ur?.modifiers?.priceZl).toBe(2000);

    // Vis wz. 35: 1d10, magazynek 8, zasieg 15 m, 200 zl
    const vis = WEAPONS_II_RP.find((w) => w.templateId === 'weapon.vis-wz35');
    expect(vis?.modifiers?.damage).toBe('1d10');
    expect(vis?.modifiers?.capacity).toBe(8);
    expect(vis?.modifiers?.malfunction).toBe(98);
    expect(vis?.modifiers?.priceZl).toBe(200);
  });

  it('jednoznacznie dopasowuje szablony Colt M1911 i Sztucer mysliwski bez kolizji z bronia ogolna', () => {
    const colt = findEquipmentTemplate('Colt M1911');
    expect(colt?.id).toBe('weapon.colt-m1911');
    expect(colt?.modifiers?.priceZl).toBe(200);
    expect(colt?.modifiers?.range).toBe('15 m');

    const sztucer = findEquipmentTemplate('Sztucer myśliwski');
    expect(sztucer?.id).toBe('weapon.sztucer-mysliwski');
    expect(sztucer?.modifiers?.priceZl).toBe(350);
    expect(sztucer?.modifiers?.range).toBe('100 m');
  });

  it('poprawnie wnioskuje umiejetnosci bojowe CoC 7e dla wszystkich 16 broni II RP (inferWeaponSkill)', () => {
    const handguns = [
      'Nagant wz. 1895',
      'Reichsrevolver M1879',
      'Browning FN 1900',
      'Browning FN 1905',
      'Browning M1910',
      'P08 Parabellum',
      'Mauser C96',
      'Colt M1911',
      'Vis wz. 35',
      'Pistolet maszynowy Mors wz. 39',
    ];

    handguns.forEach((name) => {
      const item = { id: `test-${name}`, name, category: 'weapon' as const };
      const skill = inferWeaponSkill(item);
      expect(skill).toBe('Broń Palna');
      expect(isMeleeWeapon(item)).toBe(false);
    });

    const longGuns = [
      'Karabin wz. 98 / Karabin wz. 29',
      'Karabinek wz. 91/98/23',
      'Karabin ppanc wz. 35 Ur',
      'Karabin maszynowy Chauchat',
      'Dubeltówka myśliwska',
      'Sztucer myśliwski',
    ];

    longGuns.forEach((name) => {
      const item = { id: `test-${name}`, name, category: 'weapon' as const };
      const skill = inferWeaponSkill(item);
      expect(skill).toBe('Broń Palna (Karabin)');
      expect(isMeleeWeapon(item)).toBe(false);
    });
  });

  it('przypisuje kategorie weapon dla wszystkich 16 modeli broni w categorizeItem', () => {
    WEAPONS_II_RP.forEach((w) => {
      expect(categorizeItem(w.name || '')).toBe('weapon');
    });
  });

  it('generuje dwujezyczne lore bojowe w generateItemLore dla broni II RP', () => {
    const nagantLorePl = generateItemLore('Nagant wz. 1895', 'pl');
    expect(nagantLorePl).toMatch(/Starannie utrzymana broń/i);

    const nagantLoreEn = generateItemLore('Nagant wz. 1895', 'en');
    expect(nagantLoreEn).toMatch(/Carefully maintained firearm/i);

    const visLorePl = generateItemLore('Vis wz. 35', 'pl');
    expect(visLorePl).toMatch(/Starannie utrzymana broń/i);

    const sztucerLorePl = generateItemLore('Sztucer myśliwski', 'pl');
    expect(sztucerLorePl).toMatch(/Solidna broń długa o dużej sile rażenia/i);
  });
});
