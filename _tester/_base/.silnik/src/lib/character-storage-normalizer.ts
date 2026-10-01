import type { Character, EquipmentItem } from '@/lib/types';
import { isDeprecatedEmptyStartingEquipment } from '@/lib/equipment-catalog';

/** Bezpieczna granica między danymi zapisu a kodem mechaniki/UI. */
export function getEquipmentItems(value: unknown): EquipmentItem[] {
  if (!Array.isArray(value)) return [];
  return (value as EquipmentItem[]).filter(
    (item) => !isDeprecatedEmptyStartingEquipment(item)
  );
}

/**
 * Dane z localStorage nie mają kontroli typów. Starsza wersja aplikacji mogła
 * zapisać `equipment` jako inny typ niż tablica, co blokowało cały widok przy
 * późniejszym renderowaniu. Zachowujemy resztę postaci, a wadliwy ekwipunek
 * zastępujemy pustą listą.
 */
export function normalizeStoredCharacters(value: unknown): Character[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (character): character is Record<string, unknown> =>
        character !== null && typeof character === 'object'
    )
    .map((character) => ({
      ...character,
      equipment: getEquipmentItems(character.equipment),
    })) as Character[];
}
