/**
 * Kontekstowy builder promptów do generowania obrazów ekwipunku
 * Rozwiązuje problem niespójnych miniatur - wzbogaca prompty o kontekst ery, stylu, specyfikę przedmiotu
 */

import { EquipmentItem, EquipmentCategory } from './types';

// === MODYFIKATORY ERY ===

const ERA_MODIFIERS: Record<string, string> = {
  '1890s': 'Victorian era, gaslight, ornate brass and wood, sepia tones',
  '1900s': 'Edwardian era, elegant, polished brass and leather',
  '1920s':
    'Roaring Twenties, art deco, vintage brass and leather, sepia tones, prohibition era',
  '1930s': 'Great Depression era, worn, utilitarian, weathered',
  '1940s': 'World War II era, military surplus, practical',
  modern: 'contemporary, realistic, clean design',
  timeless: 'classic design, neutral era styling',
};

// === MODYFIKATORY KATEGORII ===

const CATEGORY_STYLES: Record<EquipmentCategory, string> = {
  weapon:
    'detailed weapon photography, dramatic side lighting, dark background, metallic finish',
  armor: 'protective gear, solid materials, worn leather and metal',
  tool: 'practical equipment, used condition, authentic vintage tools',
  document:
    'aged paper, handwritten text, weathered edges, coffee stains, vintage typography',
  artifact:
    'mysterious ancient object, eldritch symbols, otherworldly glow, Lovecraftian horror aesthetic',
  personal:
    'intimate personal item, well-used, sentimental value, vintage accessory',
  medical:
    'vintage medical equipment, leather case, glass vials, brass instruments, clinical precision',
  occult:
    'mystical ritual objects, candlelight, arcane symbols, dark atmosphere, forbidden knowledge',
};

// === MATERIAŁY TYPOWE DLA KATEGORII ===

const CATEGORY_MATERIALS: Record<EquipmentCategory, string> = {
  weapon: 'blued steel, walnut wood grip, brass fittings',
  armor: 'thick leather, steel plates, canvas straps',
  tool: 'polished brass, hardwood handles, steel components',
  document: 'cream paper, brown ink, wax seal',
  artifact: 'ancient stone, tarnished silver, unknown metal',
  personal: 'sterling silver, leather, polished wood',
  medical: 'nickel-plated steel, borosilicate glass, brown leather',
  occult: 'beeswax, pigment chalk, aged parchment, silver',
};

// === STYL LOVECRAFTA ===

const LOVECRAFT_AESTHETIC =
  'Lovecraftian horror aesthetic, cosmic dread undertones, ' +
  'Call of Cthulhu RPG style, mysterious atmosphere, ' +
  'detailed product photography, isolated on dark textured background';

/**
 * Buduje wzbogacony prompt do generowania obrazu przedmiotu
 * @param item - Przedmiot ekwipunku
 * @param era - Era przygody (np. "1920s")
 * @param adventureTheme - Opcjonalny temat przygody (np. "Innsmouth", "Egypt")
 * @returns Wzbogacony prompt
 */
export function buildEquipmentImagePrompt(
  item: EquipmentItem,
  era: string = '1920s',
  adventureTheme?: string
): string {
  const parts: string[] = [];

  // 1. Nazwa przedmiotu z kontekstem
  parts.push(`Vintage ${era} ${item.name}`);

  // 2. Opis jeśli dostępny
  if (item.description) {
    parts.push(item.description);
  }

  // 3. Styl kategorii
  const categoryStyle =
    CATEGORY_STYLES[item.category] || CATEGORY_STYLES.personal;
  parts.push(categoryStyle);

  // 4. Materiały typowe dla kategorii
  const materials =
    CATEGORY_MATERIALS[item.category] || CATEGORY_MATERIALS.personal;
  parts.push(materials);

  // 5. Modyfikator ery
  const eraModifier = ERA_MODIFIERS[era] || ERA_MODIFIERS['1920s'];
  parts.push(eraModifier);

  // 6. Temat przygody jeśli podany
  if (adventureTheme) {
    parts.push(`${adventureTheme} theme, regional styling`);
  }

  // 7. Stan przedmiotu
  if (item.condition) {
    const conditionDesc: Record<string, string> = {
      new: 'pristine condition, polished',
      used: 'well-used, slight wear, authentic patina',
      damaged: 'visibly damaged, scratches, dents',
      broken: 'broken, cracked, dysfunctional appearance',
    };
    parts.push(conditionDesc[item.condition] || conditionDesc.used);
  }

  // 8. Estetyka Lovecrafta
  parts.push(LOVECRAFT_AESTHETIC);

  // 9. Parametry techniczne
  parts.push('high quality, 4K, detailed textures, studio lighting');

  return parts.join(', ');
}

/**
 * Przykłady transformacji promptów:
 *
 * Input: "First Aid Kit" (category: medical, era: 1920s)
 * Output: "Vintage 1920s First Aid Kit, Apteczka pierwszej pomocy z bandażami i jodyną,
 *          vintage medical equipment, leather case, glass vials, brass instruments, clinical precision,
 *          nickel-plated steel, borosilicate glass, brown leather,
 *          Roaring Twenties, art deco, vintage brass and leather, sepia tones, prohibition era,
 *          well-used, slight wear, authentic patina,
 *          Lovecraftian horror aesthetic, cosmic dread undertones..."
 *
 * Input: ".38 Revolver" (category: weapon, era: 1920s)
 * Output: "Vintage 1920s .38 Revolver, Standardowy rewolwer policyjny,
 *          detailed weapon photography, dramatic side lighting, dark background, metallic finish,
 *          blued steel, walnut wood grip, brass fittings,
 *          Roaring Twenties, art deco, vintage brass and leather, sepia tones..."
 */

/**
 * Zwraca skrócony prompt dla miniaturek (szybsze generowanie)
 */
export function buildThumbnailPrompt(
  item: EquipmentItem,
  era: string = '1920s'
): string {
  const categoryStyle =
    CATEGORY_STYLES[item.category] || CATEGORY_STYLES.personal;
  const eraModifier = ERA_MODIFIERS[era] || ERA_MODIFIERS['1920s'];

  return `Vintage ${era} ${item.name}, ${categoryStyle}, ${eraModifier}, realistic vintage product photography, dark background`;
}

/**
 * Zwraca sugerowany styl dla danej kategorii (do UI)
 */
export function getCategoryStyle(category: EquipmentCategory): string {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.personal;
}

/**
 * Listę dostępnych er do wyboru
 */
export function getAvailableEras(): { value: string; label: string }[] {
  return [
    { value: '1890s', label: 'Epoka Wiktoriańska (1890s)' },
    { value: '1920s', label: 'Szalone Lata 20. (1920s)' },
    { value: '1930s', label: 'Wielki Kryzys (1930s)' },
    { value: 'modern', label: 'Współczesność' },
  ];
}
