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
    expect(docs.templateId).toBe('document.id-card');
    expect(isWeapon(docs)).toBe(false);
  });

  it('inicjalizuje amunicję, ładunki i akcje diegetyczne przy aplikowaniu szablonu', () => {
    const revolver = applyCatalogTemplate(
      {
        id: 'eq_revolver_test',
        name: 'Rewolwer Colt Police Positive .38',
        category: 'weapon' as const,
      },
      '1920s'
    );
    expect(revolver.category).toBe('weapon');
    expect(isWeapon(revolver)).toBe(true);
    expect(revolver.currentAmmo).toBe(6);
    expect(revolver.maxAmmo).toBe(6);
    expect(revolver.suggestedAction).toBe('shoot');
    expect(revolver.actionDeclaration).toContain('Rewolwer Colt Police Positive .38');

    const medKit = applyCatalogTemplate(
      {
        id: 'eq_firstaid_test',
        name: 'Apteczka pierwszej pomocy',
        category: 'medical' as const,
      },
      '1920s'
    );
    expect(medKit.category).toBe('medical');
    expect(isWeapon(medKit)).toBe(false);
    expect(medKit.charges).toBe(3);
    expect(medKit.maxCharges).toBe(3);
    expect(medKit.suggestedAction).toBe('first_aid');
    expect(medKit.actionDeclaration).toContain('Apteczka pierwszej pomocy');

    const flashlight = applyCatalogTemplate(
      {
        id: 'eq_flash_test',
        name: 'Latarka',
        category: 'tool' as const,
      },
      '1920s'
    );
    expect(flashlight.category).toBe('tool');
    expect(isWeapon(flashlight)).toBe(false);
    expect(flashlight.condition).toBe('working');
    expect(flashlight.suggestedAction).toBe('use_in_scene');
  });
});
