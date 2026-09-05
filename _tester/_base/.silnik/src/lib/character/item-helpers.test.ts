import { generateItemLore, generateVisualDescription, categorizeItem } from './item-helpers';

describe('item-helpers bilingual lore and descriptions', () => {
  it('generates rich polish lore by default and handles specific categories', () => {
    expect(generateItemLore('Rewolwer .38')).toMatch(/Starannie utrzymana broń/i);
    expect(generateItemLore('Latarka')).toMatch(/Niezawodne źródło światła/i);
    expect(generateItemLore('Lampa naftowa')).toMatch(/Niezawodne źródło światła/i);
    expect(generateItemLore('Notatnik i ołówek')).toMatch(/Podniszczony zeszyt pełen notatek/i);
    expect(generateItemLore('Lupa w mosiężnej oprawie')).toMatch(/Szkło powiększające w mosiężnej oprawie/i);
    expect(generateItemLore('Nietypowy rekwizyt')).toMatch(/Przydatny przedmiot z ekwipunku badacza/i);
  });

  it('generates english lore when locale is en', () => {
    expect(generateItemLore('Rewolwer .38', 'en')).toMatch(/Carefully maintained firearm/i);
    expect(generateItemLore('.38 Revolver', 'en')).toMatch(/Carefully maintained firearm/i);
    expect(generateItemLore('Flashlight', 'en')).toMatch(/steady beam of light/i);
    expect(generateItemLore('Oil Lantern', 'en')).toMatch(/steady beam of light/i);
    expect(generateItemLore('Notebook', 'en')).toMatch(/worn notebook filled with field observations/i);
    expect(generateItemLore('Magnifying Glass', 'en')).toMatch(/magnifying lens set in a polished brass rim/i);
    expect(generateItemLore('Custom Prop', 'en')).toMatch(/dependable item from an investigator's kit/i);
  });

  it('generates visual descriptions in both languages', () => {
    expect(generateVisualDescription('Złoty zegarek kieszonkowy', 'pl')).toMatch(/srebrna koperta/i);
    expect(generateVisualDescription('Pocket watch', 'en')).toMatch(/silver case with engraved ornaments/i);
    expect(generateVisualDescription('Złoty pierścień', 'pl')).toMatch(/złoty band/i);
    expect(generateVisualDescription('Gold ring', 'en')).toMatch(/gold band with subtle pattern/i);
    expect(generateVisualDescription('Stary przedmiot', 'en')).toMatch(/antique personal item/i);
  });
});
