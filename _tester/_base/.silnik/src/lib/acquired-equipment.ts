import type {
  AcquiredItemProposal,
  EquipmentCategory,
  EquipmentItem,
} from '@/lib/types';
import { findEquipmentTemplate } from '@/lib/equipment-catalog';

/**
 * Jedyny tag, który może zaoferować dodanie przedmiotu do ekwipunku.
 * `[PRZEDMIOT]` pozostaje wyłącznie wpisem encyklopedycznym/dziennikowym.
 *
 * `[ZDOBYTY_PRZEDMIOT: @Anna | Latarka | Stalowa, lekko obtłuczona | zwykly]`
 */
const ACQUIRED_ITEM_TAG =
  /\[ZDOBYTY_PRZEDMIOT:\s*(?:@([^|\]]+)\|\s*)?([^|\]]+)\|\s*([^|\]]+?)(?:\|\s*(zwykly|zwykły|mundane|nadprzyrodzony|supernatural))?\s*\]/gi;

function visualTreatment(value: string | undefined): 'mundane' | 'supernatural' {
  return /nadprzyrodzony|supernatural/i.test(value ?? '')
    ? 'supernatural'
    : 'mundane';
}

/** Czyste parsowanie, celowo bez zgadywania na podstawie zwykłej prozy MG. */
export function extractAcquiredItemProposals(
  text: string,
  messageId: string
): AcquiredItemProposal[] {
  const result: AcquiredItemProposal[] = [];
  const regex = new RegExp(ACQUIRED_ITEM_TAG.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const name = match[2]?.trim();
    const description = match[3]?.trim();
    if (!name || !description) continue;
    result.push({
      id: `${messageId}:acquired:${result.length}`,
      recipientName: match[1]?.trim() || undefined,
      name,
      description,
      visualTreatment: visualTreatment(match[4]),
      status: 'pending',
    });
  }
  return result;
}

/** Bezpieczny fallback dla unikalnych znalezisk, których nie ma w katalogu. */
export function inferAcquiredItemCategory(
  proposal: Pick<AcquiredItemProposal, 'name' | 'description' | 'visualTreatment'>
): EquipmentCategory {
  const catalog = findEquipmentTemplate(proposal.name);
  if (catalog) return catalog.category;
  if (proposal.visualTreatment === 'supernatural') return 'artifact';

  const text = `${proposal.name} ${proposal.description}`.toLocaleLowerCase(
    'pl-PL'
  );
  if (/list|dziennik|notat|mapa|zdjęci|fotografi|dokument|telegram/.test(text))
    return 'document';
  if (/aptecz|bandaż|opatrun|strzykawk|lek/.test(text)) return 'medical';
  if (/pistolet|rewolwer|karabin|strzelb|nóż|maczet/.test(text)) return 'weapon';
  if (/latark|lina|klucz|aparat|lornet|kompas|wytrych|narzędzi/.test(text))
    return 'tool';
  return 'personal';
}

import { inferWeaponDamage, inferWeaponSkill, isWeapon } from '@/lib/combat/weapon-context';

export function createAcquiredEquipmentSeed(
  proposal: AcquiredItemProposal
): Partial<EquipmentItem> {
  const template = findEquipmentTemplate(proposal.name);
  const category = template ? template.category : inferAcquiredItemCategory(proposal);
  
  const dummyItem: EquipmentItem = {
    id: proposal.id || 'seed',
    name: proposal.name,
    category,
    description: proposal.description,
  };

  const looksWeapon = category === 'weapon' || isWeapon(dummyItem);
  const weaponInfo = looksWeapon ? inferWeaponDamage(dummyItem) : undefined;
  const damageStr = typeof weaponInfo === 'string' ? weaponInfo : weaponInfo?.damage;
  const rangeStr = typeof weaponInfo === 'object' ? weaponInfo?.range : undefined;
  const skill = looksWeapon ? inferWeaponSkill(dummyItem) : undefined;

  return {
    ...(template
      ? {
          templateId: template.id,
          category: template.category,
        }
      : { category: looksWeapon ? 'weapon' : category }),
    name: proposal.name,
    description: proposal.description,
    visualTreatment: proposal.visualTreatment,
    ...(damageStr || skill || rangeStr
      ? {
          modifiers: {
            ...(damageStr ? { damage: damageStr } : {}),
            ...(rangeStr ? { range: rangeStr } : {}),
            ...(skill ? { skill } : {}),
          },
        }
      : {}),
  };
}
