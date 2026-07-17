/**
 * weapon-context - osadzenie broni z ekwipunku w narracyjnym przepływie walki.
 *
 * Walka w Zew Home jest narracyjna: AI opisuje starcie i emituje `[TEST: umiejętność]`,
 * a gracz rzuca przez Tackę (skillValue dociągany z karty postaci przez resolveTestValue).
 * Mechaniczny `CombatSystem` jest odłączony od UI, więc broń osadzamy tam, gdzie walka
 * faktycznie żyje - w kontekście promptu AI.
 *
 * Ten moduł:
 *   1. rozpoznaje przedmioty będące bronią (`isWeapon`),
 *   2. wnioskuje umiejętność bojową CoC 7e (`inferWeaponSkill`) - broń palna krótka,
 *      palna długa (karabin/strzelba) lub biała,
 *   3. składa sekcję promptu (`buildPlayerWeaponContext`), dzięki której AI wie czym
 *      postać walczy, emituje właściwy `[TEST: ...]` i opisuje obrażenia wg formuły RAW.
 *
 * Pure functions - bez side effects, bez async. Reużywa `resolveTestValue`
 * (skill-test-resolver) dla wartości umiejętności, tak jak Tacka w useChat.
 */

import type { Character, EquipmentItem } from '@/lib/types';
import { resolveTestValue } from '@/lib/skill-test-resolver';
import { findEquipmentByName } from '@/lib/equipment-data';

// Nazwy kanoniczne z src/lib/data/character/skills.ts (BASE_SKILLS).
const SKILL_FIREARM_HANDGUN = 'Broń Palna'; // baza 20%
const SKILL_FIREARM_LONG = 'Broń Palna (Karabin)'; // baza 25%
const SKILL_MELEE = 'Walka Wręcz'; // baza 25% (broń biała + bijatyka)

// Broń długa (karabin/strzelba) - sprawdzane PRZED krótką, bo "hunting rifle" itp.
const LONG_GUN_PATTERN =
  /rifle|shotgun|carbine|musket|karabin|strzelb|sztucer|dubeltów/i;
// Broń palna krótka (pistolety/rewolwery) + typowe kalibry 1920s.
const HANDGUN_PATTERN =
  /revolver|automatic|pistol|handgun|rewolwer|pistolet|\.32|\.38|\.45|luger|colt/i;
// Broń biała (do jawnego rozpoznania broni po nazwie, gdy brak kategorii/obrażeń).
const MELEE_WEAPON_PATTERN =
  /knife|nóż|noz|dagger|sztylet|machete|maczet|club|baton|pałk|palk|kij|cudgel|axe|topór|topor|siekier|hammer|młot|mlot|sword|miecz|szabla|bagnet|bayonet/i;

// Podtypy broni palnej / białej dla doboru domyślnych obrażeń (RAW, spójne z equipment-data).
const SHOTGUN_PATTERN = /shotgun|strzelb|dubeltów/i;
const CLUB_PATTERN = /club|baton|pałk|palk|kij|cudgel|hammer|młot|mlot/i;
const KNIFE_PATTERN = /knife|nóż|noz|dagger|sztylet|bagnet|bayonet/i;

/**
 * Czy nazwa przedmiotu wygląda na broń (palną długą/krótką lub białą). Czyta wyłącznie
 * `item.name`. Pozwala rozpoznać broń, której generator nie dostał z szablonu i zapisał
 * jako `category: 'personal'` bez `modifiers` (np. „Rewolwer .38" z OCCUPATION_EQUIPMENT).
 */
export function looksLikeWeapon(item: EquipmentItem): boolean {
  const name = item.name.toLowerCase();
  return (
    LONG_GUN_PATTERN.test(name) ||
    HANDGUN_PATTERN.test(name) ||
    MELEE_WEAPON_PATTERN.test(name)
  );
}

/**
 * Czy przedmiot jest bronią. Broń = kategoria 'weapon' LUB ma formułę obrażeń
 * (np. zaimprowizowana broń z `modifiers.damage` nadana przez AI/narrację) LUB jej
 * nazwa wygląda na broń (`looksLikeWeapon`).
 */
export function isWeapon(item: EquipmentItem): boolean {
  return (
    item.category === 'weapon' ||
    Boolean(item.modifiers?.damage) ||
    looksLikeWeapon(item)
  );
}

/**
 * Wnioskuje formułę obrażeń (i zasięg) broni, gdy `modifiers.damage` nie został nadany.
 * Najpierw próbuje trafić szablon (`findEquipmentByName` - nazwy anglojęzyczne), a w
 * ostateczności stosuje domyślne wartości CoC 7e per typ broni (spójne z szablonami
 * w equipment-data). Zwraca null, gdy przedmiot nie wygląda na broń.
 */
export function inferWeaponDamage(
  item: EquipmentItem
): { damage: string; range?: string } | null {
  const template = findEquipmentByName(item.name);
  if (template?.modifiers?.damage) {
    return {
      damage: template.modifiers.damage,
      range: template.modifiers.range,
    };
  }
  if (!looksLikeWeapon(item)) return null;

  const name = item.name.toLowerCase();
  if (SHOTGUN_PATTERN.test(name)) return { damage: '2d6+2', range: '10 yards' };
  if (LONG_GUN_PATTERN.test(name))
    return { damage: '2d6+4', range: '110 yards' };
  if (HANDGUN_PATTERN.test(name)) return { damage: '1d10', range: '15 yards' };
  if (CLUB_PATTERN.test(name)) return { damage: '1d6' };
  if (KNIFE_PATTERN.test(name)) return { damage: '1d4+2' };
  return { damage: '1d4' }; // domyślna broń biała
}

/**
 * Wnioskuje umiejętność bojową CoC 7e na podstawie nazwy broni.
 * Kolejność: broń długa → krótka → (domyślnie) biała. Zwracana nazwa jest kanoniczna,
 * więc `resolveTestValue` dopasuje ją do karty postaci (fuzzy match obejmuje warianty
 * typu "Broń Palna (Krótka)").
 */
export function inferWeaponSkill(item: EquipmentItem): string {
  const name = item.name.toLowerCase();
  if (LONG_GUN_PATTERN.test(name)) return SKILL_FIREARM_LONG;
  if (HANDGUN_PATTERN.test(name)) return SKILL_FIREARM_HANDGUN;
  return SKILL_MELEE;
}

/**
 * Czy broń jest biała (walka wręcz). RAW: tylko broń biała dolicza modyfikator do
 * obrażeń postaci (Damage Bonus); broń palna NIE.
 */
export function isMeleeWeapon(item: EquipmentItem): boolean {
  return inferWeaponSkill(item) === SKILL_MELEE;
}

/**
 * Składa sekcję promptu o uzbrojeniu postaci gracza. Zwraca pusty string gdy postać
 * nie ma broni (caller pomija push). Każdą broń opisuje: umiejętność + wartość % z karty
 * (lub "baza" gdy postać jej nie ma), formuła obrażeń i zasięg. Broń biała sygnalizuje
 * doliczenie DB postaci.
 */
export function buildPlayerWeaponContext(character: Character | null): string {
  if (!character) return '';
  const weapons = (character.equipment ?? []).filter(isWeapon);
  if (weapons.length === 0) return '';

  const damageBonus = character.damageBonus?.trim();
  const hasDb =
    Boolean(damageBonus) && damageBonus !== '0' && damageBonus !== '-';

  const lines = weapons.map((w) => {
    const skill = inferWeaponSkill(w);
    const skillVal = resolveTestValue(skill, character);
    const skillStr =
      skillVal !== null ? `${skill} ${skillVal}%` : `${skill} (baza)`;
    // Dopełnij obrażenia/zasięg, gdy broń nie dostała ich z szablonu (np. broń z
    // OCCUPATION_EQUIPMENT zapisana jako 'personal' bez modifiers).
    const inferred =
      w.modifiers?.damage && w.modifiers?.range ? null : inferWeaponDamage(w);
    const damage = w.modifiers?.damage ?? inferred?.damage ?? '?';
    const melee = isMeleeWeapon(w);
    const damageStr = melee && hasDb ? `${damage} ${damageBonus}` : damage;
    const rangeVal = w.modifiers?.range ?? inferred?.range;
    const range = rangeVal ? `, zasięg ${rangeVal}` : '';
    return `- **${w.name}**: test ${skillStr}, obrażenia ${damageStr}${range}`;
  });

  return (
    '\n## UZBROJENIE POSTACI\n' +
    'Gdy postać używa broni w walce, wezwij `[TEST: <umiejętność>]` z poniższej listy, ' +
    'a po sukcesie opisz obrażenia wg podanej formuły. Broń biała dolicza modyfikator do ' +
    'obrażeń postaci (DB); broń palna nie.\n' +
    lines.join('\n')
  );
}
