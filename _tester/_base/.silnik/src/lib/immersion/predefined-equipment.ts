import type { EquipmentCategory, EquipmentItem } from '@/lib/types';

export type PresetEra = 'gaslight' | 'classic' | 'modern';
export type PresetArchetype =
  | 'investigator'
  | 'scholar'
  | 'action'
  | 'healer'
  | 'mystic';

interface PresetEquipmentContext {
  id: string;
  era: PresetEra;
  archetype: PresetArchetype;
  equipment?: EquipmentItem[];
}

type EquipmentSeed = Omit<EquipmentItem, 'id' | 'imageUrl'>;

const CATEGORY_IMAGES: Record<EquipmentCategory, string> = {
  weapon: '/equipment/predefined/weapon.svg',
  armor: '/equipment/predefined/armor.svg',
  tool: '/equipment/predefined/tool.svg',
  document: '/equipment/predefined/document.svg',
  artifact: '/equipment/predefined/artifact.svg',
  personal: '/equipment/predefined/personal.svg',
  medical: '/equipment/predefined/medical.svg',
  occult: '/equipment/predefined/occult.svg',
};

const ERA_KITS: Record<PresetEra, EquipmentSeed[]> = {
  gaslight: [
    {
      name: 'Zegarek kieszonkowy',
      category: 'personal',
      description: 'Mosiężny zegarek na łańcuszku, niezawodny w podróży.',
    },
    {
      name: 'Skórzane rękawiczki',
      category: 'personal',
      description: 'Chronią dłonie i pozwalają ostrożnie badać ślady.',
    },
    {
      name: 'Dokumenty podróżne',
      category: 'document',
      description: 'Bilety, listy polecające i dokumenty tożsamości.',
    },
  ],
  classic: [
    {
      name: 'Latarka elektryczna',
      category: 'tool',
      description: 'Ciężka metalowa latarka z zapasową baterią.',
    },
    {
      name: 'Pudełko zapałek',
      category: 'personal',
      description: 'Woskowane zapałki zabezpieczone przed wilgocią.',
    },
    {
      name: 'Dokumenty i bilety',
      category: 'document',
      description: 'Dowód tożsamości, wizytówki i bilety kolejowe.',
    },
  ],
  modern: [
    {
      name: 'Telefon z ładowarką',
      category: 'tool',
      description: 'Smartfon z mapami offline i zabezpieczonym notatnikiem.',
    },
    {
      name: 'Powerbank',
      category: 'tool',
      description: 'Zapas energii na długi dzień pracy w terenie.',
    },
    {
      name: 'Kieszonkowa apteczka',
      category: 'medical',
      description: 'Opatrunki, środek odkażający i leki przeciwbólowe.',
    },
  ],
};

const ARCHETYPE_KITS: Record<PresetArchetype, EquipmentSeed[]> = {
  investigator: [
    {
      name: 'Aparat fotograficzny',
      category: 'tool',
      description: 'Dokumentuje miejsca, osoby i ślady na potrzeby śledztwa.',
    },
    {
      name: 'Koperty na dowody',
      category: 'document',
      description: 'Opisane koperty do zabezpieczania drobnych znalezisk.',
    },
  ],
  scholar: [
    {
      name: 'Notes badawczy',
      category: 'document',
      description: 'Indeks źródeł, cytatów i hipotez badawczych.',
    },
    {
      name: 'Lupa terenowa',
      category: 'tool',
      description: 'Składana lupa do oględzin druku, znaków i artefaktów.',
    },
  ],
  action: [
    {
      name: 'Mocna lina',
      category: 'tool',
      description: 'Piętnaście metrów liny z karabińczykiem.',
    },
    {
      name: 'Opatrunek uciskowy',
      category: 'medical',
      description: 'Podstawowy opatrunek na obrażenia odniesione w terenie.',
    },
  ],
  healer: [
    {
      name: 'Torba medyczna',
      category: 'medical',
      description: 'Narzędzia i środki do udzielania pierwszej pomocy.',
      modifiers: { skill: 'Pierwsza Pomoc', bonus: 10 },
    },
    {
      name: 'Środek uspokajający',
      category: 'medical',
      description: 'Odmierzona dawka leku do użycia w nagłym przypadku.',
    },
  ],
  mystic: [
    {
      name: 'Kreda rytualna',
      category: 'occult',
      description: 'Biała kreda do oznaczania symboli i granic ochronnych.',
    },
    {
      name: 'Talizman ochronny',
      category: 'occult',
      description: 'Osobista pamiątka używana podczas praktyk duchowych.',
    },
  ],
};

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('pl-PL');
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function withLocalImage(item: EquipmentItem): EquipmentItem {
  return {
    ...item,
    source: item.source ?? 'starting',
    condition: item.condition ?? 'used',
    imageUrl: item.imageUrl ?? CATEGORY_IMAGES[item.category],
  };
}

/**
 * Rozbudowuje osobisty ekwipunek presetu o zestaw epoki i archetypu.
 * Nazwy są deduplikowane, a każdy przedmiot dostaje lokalną miniaturę kategorii,
 * dzięki czemu gotowy badacz nie uruchamia generatora obrazów przez API.
 */
export function buildPredefinedEquipment(
  preset: PresetEquipmentContext
): EquipmentItem[] {
  const result = (preset.equipment ?? []).map(withLocalImage);
  const names = new Set(result.map((item) => normalizeName(item.name)));

  [...ERA_KITS[preset.era], ...ARCHETYPE_KITS[preset.archetype]].forEach(
    (seed) => {
      const normalized = normalizeName(seed.name);
      if (names.has(normalized)) return;
      names.add(normalized);
      result.push(
        withLocalImage({
          ...seed,
          id: `eq_${slugify(preset.id)}_${slugify(seed.name)}`,
        })
      );
    }
  );

  return result;
}

export { CATEGORY_IMAGES };
