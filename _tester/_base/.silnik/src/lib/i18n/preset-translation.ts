import type { Character } from '@/lib/types';

/**
 * Nakładka tłumaczeń presetów postaci (SSOT: messages/*.json ->
 * PredefinedCharacters.characters.<sourcePresetId>).
 *
 * Zapisane pola postaci (localStorage) pozostają NIEZMIENIONE - nakładka działa
 * wyłącznie na warstwę wyświetlania, więc przełączenie języka nie mutuje danych
 * gracza. Pola bez tłumaczenia w słowniku spadają do wartości zapisanej.
 */

interface PresetEquipmentTranslation {
  name?: string;
  description?: string;
}

interface PresetTranslation {
  occupation?: string;
  equipment?: Record<string, PresetEquipmentTranslation>;
  data?: {
    occupation?: string;
    background?: string;
    birthplace?: string;
    residence?: string;
    characterConcept?: string;
    ideology?: string;
    significantPerson?: string;
    meaningfulLocation?: string;
    treasuredPossession?: string;
    description?: string;
    backstory?: string;
    tacticalNotes?: string;
    traits?: string[];
    skills?: Record<string, string>;
  };
}

type MessagesBag = {
  PredefinedCharacters?: {
    characters?: Record<string, PresetTranslation>;
    systemEquipment?: Record<string, PresetEquipmentTranslation>;
  };
};

export function localizeSystemEquipment<T extends { id: string; name: string; description?: string }>(
  item: T,
  messages: unknown
): T {
  const translated = (messages as MessagesBag)?.PredefinedCharacters?.systemEquipment?.[item.id];
  return translated ? { ...item, name: translated.name ?? item.name, description: translated.description ?? item.description } : item;
}

export function applyPresetTranslation(
  character: Character,
  messages: unknown
): Character {
  const presetId = character.sourcePresetId;
  if (!presetId) return character;

  const dict = (messages as MessagesBag)?.PredefinedCharacters?.characters?.[
    presetId
  ];
  if (!dict) return character;

  const data = dict.data ?? {};
  const pick = (translated: string | undefined, current: string | undefined) =>
    translated ?? current ?? '';

  return {
    ...character,
    occupation: pick(dict.occupation ?? data.occupation, character.occupation),
    background: pick(data.background, character.background),
    backstory: pick(data.backstory, character.backstory),
    birthplace: pick(data.birthplace, character.birthplace),
    residence: pick(data.residence, character.residence),
    characterConcept: pick(data.characterConcept, character.characterConcept),
    ideology: pick(data.ideology, character.ideology),
    significantPerson: pick(
      data.significantPerson,
      character.significantPerson
    ),
    meaningfulLocation: pick(
      data.meaningfulLocation,
      character.meaningfulLocation
    ),
    treasuredPossession: pick(
      data.treasuredPossession,
      character.treasuredPossession
    ),
    description: pick(data.description, character.description),
    tacticalNotes: pick(data.tacticalNotes, character.tacticalNotes),
    traits:
      Array.isArray(data.traits) && data.traits.length > 0
        ? data.traits
        : character.traits,
    equipment: Array.isArray(character.equipment) ? character.equipment.map((item) => {
      const system = localizeSystemEquipment(item, messages);
      const personal = dict.equipment?.[item.id];
      return { ...system, name: personal?.name ?? system.name, description: personal?.description ?? system.description };
    }) : [],
  };
}

/** Labels only: game rules keep canonical skill keys in saved Character data. */
export function getPresetSkillLabels(
  character: Character,
  messages: unknown
): Record<string, string> {
  const presetId = character.sourcePresetId;
  if (!presetId) return {};
  return (messages as MessagesBag)?.PredefinedCharacters?.characters?.[presetId]
    ?.data?.skills ?? {};
}
