import { applyCatalogTemplate, findEquipmentTemplate } from '../equipment-catalog';
import { isWeapon } from '../combat/weapon-context';

describe('Equipment Matching Regression (Issue #365)', () => {
  it('nigdy nie przekształca zapasowych baterii w skórzany bicz ani broń', () => {
    const rawBatteries = {
      id: 'eq_batteries_test',
      name: 'Zapasowe baterie (R6/AA)',
      category: 'tool' as const,
      description: 'Zestaw baterii alkalicznych do latarki i dyktafonu.',
    };

    const enriched = applyCatalogTemplate(rawBatteries, '1990s');

    expect(enriched.category).toBe('tool');
    expect(enriched.templateId).toBe('tool.batteries-aa');
    expect(enriched.modifiers?.damage).toBeUndefined();
    expect(isWeapon(enriched)).toBe(false);
  });

  it('nie dopasowuje podciągów słów do krótkich aliasów (np. "bat" w "herbata" lub "baterie")', () => {
    const tea = applyCatalogTemplate(
      {
        id: 'eq_tea',
        name: 'Herbata w puszce',
        category: 'personal' as const,
      },
      '1920s'
    );
    expect(tea.templateId).not.toBe('weapon.leather-whip-shared');
    expect(isWeapon(tea)).toBe(false);

    const kettle = applyCatalogTemplate(
      {
        id: 'eq_kettle',
        name: 'Miedziany kociołek turystyczny',
        category: 'tool' as const,
      },
      '1920s'
    );
    expect(kettle.templateId).not.toBe('personal.blanket');

    const passport = applyCatalogTemplate(
      {
        id: 'eq_passport',
        name: 'Paszport dyplomatyczny',
        category: 'document' as const,
      },
      '1920s'
    );
    expect(passport.templateId).not.toBe('tool.rope');
  });

  it('gwarantuje, że przedmioty z zestawu 1990s zachowują poprawne kategorie i nie są bronią', () => {
    const brickPhone = applyCatalogTemplate(
      {
        id: 'eq_phone_90s',
        name: 'Telefon komórkowy (cegła)',
        category: 'tool' as const,
        description: 'Wczesny telefon komórkowy z anteną i ładowarką sieciową.',
      },
      '1990s'
    );
    expect(brickPhone.category).toBe('tool');
    expect(brickPhone.templateId).toBe('tool.brick-cellphone-prl');
    expect(isWeapon(brickPhone)).toBe(false);

    const docs = applyCatalogTemplate(
      {
        id: 'eq_docs_90s',
        name: 'Dokumenty tożsamości',
        category: 'document' as const,
        description: 'Portfel z dokumentami.',
      },
      '1990s'
    );
    expect(docs.category).toBe('document');
    expect(docs.templateId).toBe('document.letter');
    expect(isWeapon(docs)).toBe(false);
  });
});
