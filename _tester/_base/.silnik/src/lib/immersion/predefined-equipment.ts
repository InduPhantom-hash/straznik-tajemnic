import type {
  EquipmentCategory,
  EquipmentItem,
  EquipmentVisualEra,
} from '@/lib/types';
import {
  applyCatalogTemplate,
  CATEGORY_FALLBACK_ASSETS,
} from '@/lib/equipment-catalog';

export type PresetEra = 'gaslight' | 'classic' | 'noir' | 'prl' | 'modern';
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

const CATEGORY_IMAGES: Record<EquipmentCategory, string> =
  CATEGORY_FALLBACK_ASSETS;

const PRESET_VISUAL_ERAS: Record<PresetEra, EquipmentVisualEra> = {
  gaslight: '1890s',
  classic: '1920s',
  noir: '1940s',
  prl: 'prl-1970s',
  modern: 'modern',
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
  noir: [
    {
      name: 'Latarka elektryczna',
      category: 'tool',
      description: 'Metalowa latarka z zapasową płaską baterią.',
    },
    {
      name: 'Dokumenty służbowe',
      category: 'document',
      description: 'Legitymacja, bilety i notatki podróżne.',
    },
    {
      name: 'Kieszonkowa apteczka',
      category: 'medical',
      description: 'Opatrunki i środek odkażający w płóciennym etui.',
    },
  ],
  prl: [
    {
      name: 'Latarka elektryczna',
      category: 'tool',
      description: 'Prosta metalowa latarka z ciężką baterią.',
    },
    {
      name: 'Notes badawczy',
      category: 'document',
      description: 'Kratkowany notes, ołówek i zapas kartek.',
    },
    {
      name: 'Kieszonkowa apteczka',
      category: 'medical',
      description: 'Bandaże, plaster i podstawowe środki opatrunkowe.',
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

function withLocalImage(
  item: EquipmentItem,
  era: EquipmentVisualEra
): EquipmentItem {
  const hasCategoryFallback = Object.values(CATEGORY_IMAGES).includes(
    item.imageUrl ?? ''
  );
  const catalogItem = applyCatalogTemplate(
    {
      ...item,
      source: item.source ?? 'starting',
      condition: item.condition ?? 'used',
      imageUrl: hasCategoryFallback ? undefined : item.imageUrl,
    },
    era
  );

  return {
    ...catalogItem,
    imageUrl: catalogItem.imageUrl ?? CATEGORY_IMAGES[catalogItem.category],
    visualSource: 'catalog',
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
  const visualEra = PRESET_VISUAL_ERAS[preset.era];
  const result = (preset.equipment ?? []).map((item) =>
    withLocalImage(item, visualEra)
  );
  const names = new Set(result.map((item) => normalizeName(item.name)));

  [...ERA_KITS[preset.era], ...ARCHETYPE_KITS[preset.archetype]].forEach(
    (seed) => {
      const normalized = normalizeName(seed.name);
      if (names.has(normalized)) return;
      names.add(normalized);
      result.push(
        withLocalImage(
          {
            ...seed,
            id: `eq_${slugify(preset.id)}_${slugify(seed.name)}`,
          },
          visualEra
        )
      );
    }
  );

  // Niektóre osobiste elementy celowo pokrywają się z zestawem epoki (np.
  // latarka kolejarza). Dajemy wtedy neutralny, użyteczny dodatek zamiast
  // dublować przedmiot i pozostawiać gotową postać z uboższym zestawem.
  if (result.length < 6) {
    result.push(
      withLocalImage(
        {
          id: `eq_${slugify(preset.id)}_mapnik-terenowy`,
          name: 'Mapnik terenowy',
          category: 'document',
          description: 'Składany mapnik na notatki, bilety i szkice trasy.',
        },
        visualEra
      )
    );
  }

  return result;
}

export { CATEGORY_IMAGES };
