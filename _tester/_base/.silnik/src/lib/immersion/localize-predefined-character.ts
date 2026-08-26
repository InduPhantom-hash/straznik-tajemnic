import type { Character, EquipmentItem, SkillValue } from '@/lib/types';

type Translate = ((key: string) => string) & { has?: (key: string) => boolean };

const TEXT_FIELDS = [
  'occupation',
  'background',
  'birthplace',
  'residence',
  'characterConcept',
  'ideology',
  'significantPerson',
  'meaningfulLocation',
  'treasuredPossession',
  'description',
  'backstory',
  'tacticalNotes',
] as const;

/**
 * Zwraca kopię gotowego badacza z tekstami słownika. Wywołujący przekazuje
 * stabilne `presetId`, dlatego żadna postać stworzona przez gracza nie może
 * trafić do tej ścieżki przez przypadkową zgodność treści.
 */
export function localizePredefinedCharacter<T extends Character>(
  character: T,
  presetId: string | undefined,
  locale: string,
  t: Translate
): T {
  if (locale !== 'en' || !presetId) return character;

  const base = `characters.${presetId}.data`;
  const localized = { ...character } as T;
  const message = (key: string, fallback: string) =>
    t.has?.(key) ? t(key) : fallback;

  TEXT_FIELDS.forEach((field) => {
    const value = character[field];
    if (typeof value === 'string' && value) {
      Object.assign(localized, {
        [field]: message(`${base}.${field}`, value),
      });
    }
  });

  if (character.traits) {
    localized.traits = character.traits.map((_, index) =>
      message(`${base}.traits.${index}`, character.traits![index])
    );
  }

  localized.skills = Object.fromEntries(
    Object.entries(character.skills).map(([skill, value]) => [
      message(`${base}.skills.${skill}`, skill),
      value as SkillValue,
    ])
  );

  localized.equipment = character.equipment?.map((item): EquipmentItem => {
    const personal = `${base}.equipment.${item.id}`;
    const system = `systemEquipment.${item.id}`;
    const itemBase = t.has?.(`${personal}.name`) ? personal : system;
    return {
      ...item,
      name: message(`${itemBase}.name`, item.name),
      ...(item.description
        ? { description: message(`${itemBase}.description`, item.description) }
        : {}),
    };
  });

  return localized;
}
