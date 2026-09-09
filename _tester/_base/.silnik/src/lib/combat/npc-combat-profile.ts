import type {
  Character,
  EquipmentItem,
  NPC,
  NPCCombatProfile,
} from '@/lib/types';
import type { MeleeAttackReference } from '@/lib/parsers/types';
import { findEquipmentTemplate } from '@/lib/equipment-catalog';
import { getDamageAndBuild } from '@/lib/character/derived-stats';
import { normalizeDiceFormula, type PendingMeleeAttack } from './combat-resolver';

export interface MeleeAttackEnrichmentResult {
  attacks: PendingMeleeAttack[];
  rejected: Array<{ ordinal: number; reason: string }>;
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('pl-PL')
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function npcSkillValue(npc: NPC, skillId: string): number | null {
  const needle = normalizeKey(skillId);
  const match = Object.entries(npc.skills).find(
    ([name]) => normalizeKey(name) === needle
  );
  const value = match?.[1];
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : null;
}

export function isValidNpcCombatProfile(
  profile: NPCCombatProfile | undefined
): profile is NPCCombatProfile {
  if (
    !profile ||
    profile.schemaVersion !== 1 ||
    !Number.isInteger(profile.attacksPerRound) ||
    profile.attacksPerRound < 1 ||
    profile.attacksPerRound > 10 ||
    !Array.isArray(profile.attackOptions) ||
    profile.attackOptions.length === 0
  ) return false;

  const ids = new Set<string>();
  return profile.attackOptions.every((option) => {
    if (!option.attackOptionId || ids.has(option.attackOptionId)) return false;
    ids.add(option.attackOptionId);
    if (option.kind === 'equipment') {
      return Boolean(option.equipmentTemplateId && option.combatSkillId);
    }
    if (option.kind === 'natural') {
      try {
        normalizeDiceFormula(option.damageFormula);
      } catch {
        return false;
      }
      return Boolean(
        option.name &&
          option.combatSkillId &&
          Number.isFinite(option.skillValue) &&
          option.skillValue > 0 &&
          (option.damageClass === 'impaling' ||
            option.damageClass === 'non_impaling')
      );
    }
    return false;
  });
}

function resolveFullArmorFromTemplateIds(ids: string[] | undefined): number {
  if (!ids?.length) return 0;
  return ids.reduce((best, id) => {
    const profile = findEquipmentTemplate(id)?.combatProfile;
    if (
      profile?.kind !== 'armor' ||
      profile.coverage !== 'full' ||
      (profile.protectsAgainst !== 'all' && profile.protectsAgainst !== 'melee')
    ) return best;
    return Math.max(best, profile.armorValue);
  }, 0);
}

export function resolveCharacterMeleeArmor(character: Character): number {
  const ids = (character.equipment ?? [])
    .filter((item: EquipmentItem) => item.condition !== 'broken' && item.condition !== 'damaged')
    .map((item: EquipmentItem) => item.templateId)
    .filter((id): id is string => Boolean(id));
  return resolveFullArmorFromTemplateIds(ids);
}

export function enrichMeleeAttackReferences(params: {
  references: MeleeAttackReference[];
  npcs: NPC[];
  characters: Character[];
  assistantMessageId: string;
}): MeleeAttackEnrichmentResult {
  const attacks: PendingMeleeAttack[] = [];
  const rejected: Array<{ ordinal: number; reason: string }> = [];
  const countByNpc = new Map<string, number>();

  params.references.forEach((reference, ordinal) => {
    const npc = params.npcs.find((candidate) => candidate.id === reference.attackerNpcId);
    if (!npc || !isValidNpcCombatProfile(npc.combatProfile)) {
      rejected.push({ ordinal, reason: 'invalid_npc_combat_profile' });
      return;
    }

    const nextCount = (countByNpc.get(npc.id) ?? 0) + 1;
    countByNpc.set(npc.id, nextCount);
    if (nextCount > npc.combatProfile.attacksPerRound) {
      rejected.push({ ordinal, reason: 'attacks_per_round_exceeded' });
      return;
    }

    const target = params.characters.find(
      (candidate) => candidate.name.trim() === reference.targetCharacterName.trim()
    );
    if (!target) {
      rejected.push({ ordinal, reason: 'target_not_found' });
      return;
    }

    const option = npc.combatProfile.attackOptions.find(
      (candidate) => candidate.attackOptionId === reference.attackOptionId
    );
    if (!option) {
      rejected.push({ ordinal, reason: 'attack_option_not_found' });
      return;
    }

    let weapon: PendingMeleeAttack['weapon'];
    let attackSkill: number | null;
    if (option.kind === 'equipment') {
      const template = findEquipmentTemplate(option.equipmentTemplateId);
      const profile = template?.combatProfile;
      if (!template || profile?.kind !== 'melee_weapon') {
        rejected.push({ ordinal, reason: 'weapon_profile_not_found' });
        return;
      }
      attackSkill = npcSkillValue(npc, option.combatSkillId);
      weapon = {
        attackOptionId: option.attackOptionId,
        catalogId: template.id,
        name: template.name,
        damageFormula: normalizeDiceFormula(profile.damageFormula),
        damageClass: profile.damageClass,
      };
    } else {
      attackSkill = option.skillValue;
      weapon = {
        attackOptionId: option.attackOptionId,
        name: option.name,
        damageFormula: normalizeDiceFormula(option.damageFormula),
        damageClass: option.damageClass,
      };
    }

    if (!attackSkill) {
      rejected.push({ ordinal, reason: 'attack_skill_not_found' });
      return;
    }

    const derived = getDamageAndBuild(npc.str, npc.siz);
    attacks.push({
      schemaVersion: 1,
      eventId: `${params.assistantMessageId}:melee:${ordinal}`,
      roundId: params.assistantMessageId,
      ordinal,
      intent: reference.intent,
      attacker: {
        id: npc.id,
        name: npc.name,
        build: derived.build,
        hp: npc.hp,
        maxHp: npc.maxHp,
        armor: resolveFullArmorFromTemplateIds(npc.combatProfile.armorTemplateIds),
        attackSkill,
        damageBonus: derived.damageBonus,
      },
      target: { characterId: target.id, name: target.name },
      weapon,
    });
  });

  return { attacks, rejected };
}

export function buildNpcMeleeOptionsContext(npcs: NPC[]): string {
  const lines = npcs.flatMap((npc) => {
    if (!isValidNpcCombatProfile(npc.combatProfile)) return [];
    return npc.combatProfile.attackOptions.map(
      (option) =>
        `- npcId=${npc.id}; ${npc.name}; attackOptionId=${option.attackOptionId}; ${
          option.kind === 'natural'
            ? option.name
            : findEquipmentTemplate(option.equipmentTemplateId)?.name ?? option.attackOptionId
        }`
    );
  });
  if (lines.length === 0) return '';
  return `\n## DOZWOLONE ATAKI WRĘCZ NPC\n${lines.join('\n')}\nUżywaj wyłącznie powyższych identyfikatorów w tagu ATAK_WRĘCZ.`;
}
