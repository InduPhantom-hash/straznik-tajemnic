import type { Character } from '@/lib/types';
import { resolveTestValue } from '@/lib/skill-test-resolver';
import type { CombatDefenseWeaponOption } from './weapon-context';
import { resolveCharacterMeleeArmor } from './npc-combat-profile';
import {
  applyCombatDamage,
  normalizeDiceFormula,
  resolveMeleeEngagement,
  resolveOutnumberedBonus,
  type CombatResolution,
  type DefenseChoice,
  type PendingMeleeAttack,
} from './combat-resolver';

export const COMBAT_JOURNAL_STORAGE_KEY = 'combat_round_journal_v1';

export interface CombatRoundJournal {
  schemaVersion: 1;
  phase: 'resolving' | 'committing' | 'committed';
  roundId: string;
  roundSeed: string;
  attacks: PendingMeleeAttack[];
  choices: Record<
    string,
    { choice: Exclude<DefenseChoice, 'maneuver'>; defenderWeaponId?: string }
  >;
  resolutions: CombatResolution[];
  rosterBefore: Character[];
  nextRoster: Character[];
  resultMessageId?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function hash32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicDie(seed: string, label: string, sides: number): number {
  if (!Number.isInteger(sides) || sides < 1) throw new Error('invalid_die_sides');
  return (hash32(`${seed}:${label}`) % sides) + 1;
}

export function deterministicPercentile(
  seed: string,
  label: string,
  bonusDice = 0
): number {
  const ones = deterministicDie(seed, `${label}:ones`, 10) - 1;
  const tensCount = Math.max(1, 1 + bonusDice);
  const candidates = Array.from({ length: tensCount }, (_, index) => {
    const tens = deterministicDie(seed, `${label}:tens:${index}`, 10) - 1;
    return tens === 0 && ones === 0 ? 100 : tens * 10 + ones;
  });
  return Math.min(...candidates);
}

export function deterministicFormulaRoll(
  seed: string,
  label: string,
  formula: string
): number {
  const normalized = normalizeDiceFormula(formula);
  const integer = normalized.match(/^([+-]?\d+)$/);
  if (integer) return Number(integer[1]);
  const match = normalized.match(/^(\d*)d(\d+)(?:([+-])(\d+))?$/i);
  if (!match) throw new Error('invalid_dice_formula');
  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  if (count < 1 || count > 20 || sides < 2 || sides > 1000) {
    throw new Error('unsafe_dice_formula');
  }
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += deterministicDie(seed, `${label}:die:${index}`, sides);
  }
  const modifier = match[4] ? Number(match[4]) : 0;
  return total + (match[3] === '-' ? -modifier : modifier);
}

export function createCombatRoundJournal(params: {
  attacks: PendingMeleeAttack[];
  roster: Character[];
  roundSeed: string;
}): CombatRoundJournal {
  if (params.attacks.length === 0) throw new Error('empty_combat_round');
  const roundId = params.attacks[0].roundId;
  if (params.attacks.some((attack) => attack.roundId !== roundId)) {
    throw new Error('mixed_combat_rounds');
  }
  return {
    schemaVersion: 1,
    phase: 'resolving',
    roundId,
    roundSeed: params.roundSeed,
    attacks: params.attacks,
    choices: {},
    resolutions: [],
    rosterBefore: params.roster,
    nextRoster: params.roster,
  };
}

export function saveCombatJournal(
  storage: StorageLike,
  journal: CombatRoundJournal
): void {
  storage.setItem(COMBAT_JOURNAL_STORAGE_KEY, JSON.stringify(journal));
}

export function loadCombatJournal(storage: StorageLike): CombatRoundJournal | null {
  const raw = storage.getItem(COMBAT_JOURNAL_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CombatRoundJournal>;
    if (
      parsed.schemaVersion !== 1 ||
      !parsed.roundId ||
      !parsed.roundSeed ||
      !Array.isArray(parsed.attacks) ||
      !Array.isArray(parsed.resolutions) ||
      !Array.isArray(parsed.nextRoster) ||
      (parsed.phase !== 'resolving' &&
        parsed.phase !== 'committing' &&
        parsed.phase !== 'committed')
    ) return null;
    return parsed as CombatRoundJournal;
  } catch {
    return null;
  }
}

function currentNpcHp(
  attack: PendingMeleeAttack,
  resolutions: CombatResolution[]
): number {
  const last = [...resolutions]
    .reverse()
    .find((resolution) => resolution.attackerId === attack.attacker.id);
  return last?.attackerHpAfter ?? attack.attacker.hp;
}

export function resolveCombatJournalEvent(params: {
  journal: CombatRoundJournal;
  eventId: string;
  choice: Exclude<DefenseChoice, 'maneuver'>;
  defenderWeapon?: CombatDefenseWeaponOption;
}): CombatRoundJournal {
  if (params.journal.resolutions.some((item) => item.eventId === params.eventId)) {
    return params.journal;
  }
  const attack = params.journal.attacks.find((item) => item.eventId === params.eventId);
  if (!attack) throw new Error('combat_event_not_found');
  const defenderIndex = params.journal.nextRoster.findIndex(
    (character) => character.id === attack.target.characterId
  );
  if (defenderIndex < 0) throw new Error('combat_defender_not_found');
  const defender = params.journal.nextRoster[defenderIndex];
  if (defender.isDead) throw new Error('combat_defender_dead');
  if (params.choice === 'fight_back' && !params.defenderWeapon) {
    throw new Error('combat_weapon_required');
  }

  const defensesUsed = params.journal.resolutions.filter(
    (resolution) => resolution.defenderId === defender.id
  ).length;
  const attackerBonusDice = resolveOutnumberedBonus(defensesUsed).bonusDiceToAttacker;
  const eventSeed = `${params.journal.roundSeed}:${attack.eventId}`;
  const attackerRoll = deterministicPercentile(eventSeed, 'attacker', attackerBonusDice);
  const defenderRoll = deterministicPercentile(eventSeed, 'defender');
  const attackerHpBefore = currentNpcHp(attack, params.journal.resolutions);
  let damageIndex = 0;
  const engagement = resolveMeleeEngagement({
    attackerName: attack.attacker.name,
    defenderName: defender.name,
    attackerRoll,
    attackerSkill: attack.attacker.attackSkill,
    defenderRoll,
    defenderSkill:
      params.choice === 'dodge'
        ? resolveTestValue('Unik', defender) ?? 0
        : params.defenderWeapon?.skillValue ?? 0,
    defenseChoice: params.choice,
    attackerWeaponFormula: attack.weapon.damageFormula,
    attackerDamageBonusFormula: attack.attacker.damageBonus,
    attackerDamageType: attack.weapon.damageClass,
    defenderWeaponFormula: params.defenderWeapon?.damageFormula,
    defenderDamageBonusFormula: defender.damageBonus,
    defenderDamageType: params.defenderWeapon?.damageType,
    defenderArmor: resolveCharacterMeleeArmor(defender),
    attackerArmor: attack.attacker.armor,
    defenderMaxHp: defender.maxHp ?? defender.hp,
    attackerMaxHp: attack.attacker.maxHp,
    rollFn: (formula) =>
      deterministicFormulaRoll(eventSeed, `damage:${damageIndex++}`, formula),
  });

  let nextDefender = defender;
  let defenderHealth: CombatResolution['defenderHealth'];
  let attackerHpAfter = attackerHpBefore;
  if (engagement.damage && engagement.damageDealtTo === 'defender') {
    const conRoll = deterministicPercentile(eventSeed, 'con');
    defenderHealth = applyCombatDamage({
      hp: defender.hp,
      maxHp: defender.maxHp ?? defender.hp,
      con: defender.con,
      damage: engagement.damage.effectiveDamage,
      hadMajorWound: defender.hasMajorWound,
      conRoll,
    });
    nextDefender = {
      ...defender,
      hp: defenderHealth.hpAfter,
      hasMajorWound: defenderHealth.hasMajorWound,
      isUnconscious: defenderHealth.isUnconscious,
      isDying: defenderHealth.isDying,
      isDead: defenderHealth.isDead,
    };
  } else if (engagement.damage && engagement.damageDealtTo === 'attacker') {
    attackerHpAfter = Math.max(0, attackerHpBefore - engagement.damage.effectiveDamage);
  }

  const resolution: CombatResolution = {
    schemaVersion: 1,
    eventId: attack.eventId,
    roundId: attack.roundId,
    attackerId: attack.attacker.id,
    attackerName: attack.attacker.name,
    defenderId: defender.id,
    defenderName: defender.name,
    defenseChoice: params.choice,
    defenderWeaponId: params.defenderWeapon?.id,
    defenderWeaponName: params.defenderWeapon?.name,
    attackerRoll,
    defenderRoll,
    attackerOutcome: engagement.attackerOutcome,
    defenderOutcome: engagement.defenderOutcome,
    attackerBonusDice,
    winner: engagement.winner,
    damageDealtTo: engagement.damageDealtTo,
    damage: engagement.damage
      ? { ...engagement.damage, armor: engagement.damage.totalDamage - engagement.damage.effectiveDamage }
      : undefined,
    defenderHealth,
    attackerHpBefore,
    attackerHpAfter,
  };
  const nextRoster = [...params.journal.nextRoster];
  nextRoster[defenderIndex] = nextDefender;
  return {
    ...params.journal,
    choices: {
      ...params.journal.choices,
      [params.eventId]: {
        choice: params.choice,
        defenderWeaponId: params.defenderWeapon?.id,
      },
    },
    resolutions: [...params.journal.resolutions, resolution],
    nextRoster,
  };
}

export function formatCombatRoundMessage(
  resolutions: CombatResolution[],
  locale: 'pl' | 'en'
): string {
  const lines = resolutions.map((result) => {
    const choice = result.defenseChoice === 'dodge'
      ? locale === 'en' ? 'Dodge' : 'Unik'
      : locale === 'en' ? 'Fight Back' : 'Kontratak';
    const damage = result.damage?.effectiveDamage ?? 0;
    return locale === 'en'
      ? `${result.defenderName}: ${choice}. Attack ${result.attackerRoll} (${result.attackerOutcome}), defense ${result.defenderRoll} (${result.defenderOutcome}), damage ${damage}.`
      : `${result.defenderName}: ${choice}. Atak ${result.attackerRoll} (${result.attackerOutcome}), obrona ${result.defenderRoll} (${result.defenderOutcome}), obrażenia ${damage}.`;
  });
  return lines.join('\n');
}
