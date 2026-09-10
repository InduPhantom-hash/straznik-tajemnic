'use client';

/**
 * @file combat-card.tsx
 * Karta starcia wręcz i obrony badacza w oknie czatu (Fiction First).
 * Estetyka: Dark Art Déco 1920s.
 *
 * Eliminuje modal na cały ekran - walka toczy się bezpośrednio w strumieniu narracji.
 * Zapewnia lorowy onboarding (wyjaśnienie zwinności, stawek i ryzyka),
 * rzuty kości K100 obu stron, porównanie stopni sukcesu RAW i natychmiastowe obrażenia.
 */

import React, { useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Swords,
  ShieldAlert,
  Footprints,
  CheckCircle2,
  AlertTriangle,
  Dices,
  Skull,
  HeartPulse,
} from 'lucide-react';
import {
  type PendingMeleeAttack,
  type CombatResolution,
  type DefenseChoice,
  type ManeuverType,
  resolveMeleeEngagement,
  checkManeuverFeasibility,
  resolveOutnumberedBonus,
  checkMajorWound,
  applyCombatDamage,
} from '@/lib/combat/combat-resolver';
import {
  getCombatDefenseWeapons,
  type CombatDefenseWeaponOption,
} from '@/lib/combat/weapon-context';
import { rollD100, type RollOutcome } from '@/lib/dice-utils';
import { resolveTestValue } from '@/lib/skill-test-resolver';
import type { Character } from '@/lib/types';

export interface CombatCardProps {
  attack: PendingMeleeAttack;
  activeCharacter?: Character | null;
  characters?: Character[];
  completed?: boolean;
  resolution?: CombatResolution | null;
  defensesUsedThisRound?: number;
  onCharacterUpdate?: (character: Character) => void;
  onResolveDefense?: (
    attack: PendingMeleeAttack,
    choice: DefenseChoice,
    weapon?: CombatDefenseWeaponOption,
    maneuverType?: ManeuverType
  ) => void;
  onSendChat?: (message: string) => void;
  canAct?: boolean;
  disabled?: boolean;
}

interface CombatCardResolutionState {
  choice: DefenseChoice;
  maneuverType?: ManeuverType;
  weaponUsed?: CombatDefenseWeaponOption;
  attackerRoll: number;
  attackerOutcome: RollOutcome;
  defenderRoll: number;
  defenderOutcome: RollOutcome;
  winner: 'attacker' | 'defender' | 'none';
  damageDealtTo: 'attacker' | 'defender' | 'none';
  effectiveDamage: number;
  defenderHpBefore: number;
  defenderHpAfter: number;
  attackerHpBefore: number;
  attackerHpAfter: number;
  isMajorWound: boolean;
  isDefenderDead: boolean;
  summaryText: string;
}

export function CombatCard({
  attack,
  activeCharacter,
  characters = [],
  completed = false,
  resolution = null,
  defensesUsedThisRound = 0,
  onCharacterUpdate,
  onResolveDefense,
  onSendChat,
  canAct = true,
  disabled = false,
}: CombatCardProps) {
  const t = useTranslations('CombatDefense');
  const locale = useLocale() === 'en' ? 'en' : 'pl';

  const [isResolved, setIsResolved] = useState<boolean>(completed || Boolean(resolution));
  const [selectedManeuver, setSelectedManeuver] = useState<ManeuverType>('knockdown');

  // Obrońca (cel ataku)
  const defender = useMemo(() => {
    const pool = activeCharacter
      ? [activeCharacter, ...characters.filter((c) => c.id !== activeCharacter.id)]
      : characters;
    return (
      pool.find((c) => c.id === attack.target.characterId) ||
      pool.find((c) => c.name.toLowerCase() === attack.target.name.toLowerCase()) ||
      activeCharacter ||
      null
    );
  }, [activeCharacter, characters, attack.target]);

  // Dostępne bronie obrońcy
  const weapons = useMemo(() => getCombatDefenseWeapons(defender), [defender]);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(weapons[0]?.id ?? 'unarmed');
  const selectedWeapon = weapons.find((w) => w.id === selectedWeaponId) ?? weapons[0];

  // Umiejętności obrońcy
  const dodgeSkill = useMemo(() => {
    if (!defender) return 25;
    const resolved = resolveTestValue('Unik', defender);
    if (typeof resolved === 'number') return resolved;
    return Math.floor((defender.dex ?? 50) / 2);
  }, [defender]);

  const brawlSkill = useMemo(() => {
    if (!defender) return 25;
    const resolved = resolveTestValue('Walka Wręcz', defender);
    if (typeof resolved === 'number') return resolved;
    return 25;
  }, [defender]);

  const defenderBuild = defender?.build ?? 0;
  const attackerBuild = attack.attacker.build ?? 0;
  const maneuverCheck = checkManeuverFeasibility(defenderBuild, attackerBuild);

  // Przewaga liczebna (Outnumbered)
  const outnumbered = resolveOutnumberedBonus(defensesUsedThisRound);

  // Stan rozstrzygnięcia
  const [resultState, setResultState] = useState<CombatCardResolutionState | null>(() => {
    if (!resolution || !defender) return null;
    return {
      choice: resolution.defenseChoice,
      attackerRoll: resolution.attackerRoll,
      attackerOutcome: resolution.attackerOutcome,
      defenderRoll: resolution.defenderRoll,
      defenderOutcome: resolution.defenderOutcome,
      winner: resolution.winner,
      damageDealtTo: resolution.damageDealtTo,
      effectiveDamage: resolution.damage?.effectiveDamage ?? 0,
      defenderHpBefore: resolution.defenderHealth?.hpBefore ?? defender.hp,
      defenderHpAfter: resolution.defenderHealth?.hpAfter ?? defender.hp,
      attackerHpBefore: resolution.attackerHpBefore,
      attackerHpAfter: resolution.attackerHpAfter,
      isMajorWound: Boolean(resolution.defenderHealth?.hasMajorWound),
      isDefenderDead: Boolean(resolution.defenderHealth?.isDead),
      summaryText: t('defenseResolved'),
    };
  });

  // Pomocnik do etykiet poziomów sukcesu
  const getOutcomeBadge = (outcome: RollOutcome) => {
    switch (outcome) {
      case 'critical':
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">{t('outcomeCritical')}</Badge>;
      case 'extreme':
        return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">{t('outcomeExtreme')}</Badge>;
      case 'hard':
        return <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">{t('outcomeHard')}</Badge>;
      case 'regular':
        return <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40">{t('outcomeRegular')}</Badge>;
      case 'fail':
        return <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">{t('outcomeFail')}</Badge>;
      case 'fumble':
      default:
        return <Badge className="bg-destructive/30 text-destructive-foreground border-destructive/50">{t('outcomeFumble')}</Badge>;
    }
  };

  // Rozstrzygnięcie wybranej reakcji obronnej
  const handleExecuteDefense = (choice: DefenseChoice) => {
    if (!defender || isResolved || disabled || !canAct) return;

    // Rzuty K100
    // Dla napastnika uwzględniamy kość premiową jeśli obrońca jest outnumbered
    const attackerRoll = rollD100();
    const defenderRoll = rollD100();

    const defenderSkillVal =
      choice === 'dodge'
        ? dodgeSkill
        : choice === 'fight_back'
        ? selectedWeapon?.skillValue ?? brawlSkill
        : brawlSkill;

    const engagement = resolveMeleeEngagement({
      attackerName: attack.attacker.name,
      defenderName: defender.name,
      attackerRoll,
      attackerSkill: attack.attacker.attackSkill,
      defenderRoll,
      defenderSkill: defenderSkillVal,
      defenseChoice: choice,
      attackerWeaponFormula: attack.weapon.damageFormula,
      attackerDamageBonusFormula: attack.attacker.damageBonus,
      attackerDamageType: attack.weapon.damageClass === 'impaling' ? 'impaling' : 'blunt',
      defenderWeaponFormula: selectedWeapon?.damageFormula ?? '1d3',
      defenderDamageBonusFormula: defender.damageBonus ?? '0',
      defenderDamageType: selectedWeapon?.damageType ?? 'blunt',
      defenderArmor: 0,
      attackerArmor: attack.attacker.armor ?? 0,
      defenderMaxHp: defender.maxHp ?? defender.hp,
      attackerMaxHp: attack.attacker.maxHp ?? attack.attacker.hp,
      maneuverType: choice === 'maneuver' ? selectedManeuver : undefined,
      attackerBuild,
      defenderBuild,
    });

    const damageDealt = engagement.damage?.effectiveDamage ?? 0;
    const defenderHpBefore = defender.hp;
    let defenderHpAfter = defenderHpBefore;
    const attackerHpBefore = attack.attacker.hp;
    let attackerHpAfter = attackerHpBefore;
    let hasMajorWound = Boolean(defender.hasMajorWound);
    let isDead = false;

    if (engagement.damageDealtTo === 'defender' && damageDealt > 0) {
      const conRoll = rollD100();
      const healthState = applyCombatDamage({
        hp: defender.hp,
        maxHp: defender.maxHp ?? defender.hp,
        con: defender.con ?? 50,
        damage: damageDealt,
        hadMajorWound: defender.hasMajorWound,
        conRoll,
      });
      defenderHpAfter = healthState.hpAfter;
      hasMajorWound = healthState.hasMajorWound;
      isDead = healthState.isDead;

      if (onCharacterUpdate) {
        onCharacterUpdate({
          ...defender,
          hp: defenderHpAfter,
          hasMajorWound,
          isUnconscious: healthState.isUnconscious,
          isDying: healthState.isDying,
          isDead: healthState.isDead,
        });
      }
    } else if (engagement.damageDealtTo === 'attacker' && damageDealt > 0) {
      attackerHpAfter = Math.max(0, attackerHpBefore - damageDealt);
    }

    let summaryText = '';
    if (choice === 'dodge') {
      summaryText =
        engagement.winner === 'defender'
          ? t('resultDodgeSuccess')
          : t('resultAttackerHits');
    } else if (choice === 'fight_back') {
      summaryText =
        engagement.winner === 'defender'
          ? t('resultCounterSuccess')
          : engagement.winner === 'attacker'
          ? t('resultAttackerHits')
          : t('resultBothMiss');
    } else {
      summaryText =
        engagement.winner === 'defender'
          ? `${t('actionManeuver')}: ${t(
              selectedManeuver === 'disarm'
                ? 'maneuverDisarm'
                : selectedManeuver === 'grapple'
                ? 'maneuverGrapple'
                : 'maneuverKnockdown'
            )} - ${t('outcomeRegular')}`
          : t('resultAttackerHits');
    }

    const state: CombatCardResolutionState = {
      choice,
      maneuverType: selectedManeuver,
      weaponUsed: selectedWeapon,
      attackerRoll,
      attackerOutcome: engagement.attackerOutcome,
      defenderRoll,
      defenderOutcome: engagement.defenderOutcome,
      winner: engagement.winner,
      damageDealtTo: engagement.damageDealtTo,
      effectiveDamage: damageDealt,
      defenderHpBefore,
      defenderHpAfter,
      attackerHpBefore,
      attackerHpAfter,
      isMajorWound: hasMajorWound && !defender.hasMajorWound,
      isDefenderDead: isDead,
      summaryText,
    };

    setResultState(state);
    setIsResolved(true);

    if (onResolveDefense) {
      onResolveDefense(attack, choice, selectedWeapon, selectedManeuver);
    }

    // Wyślij raport diegetyczny dla MG (tag WYNIK_WALKI jest filtrowany przed TTS i graczem)
    if (onSendChat) {
      const chatReport = `[WYNIK_WALKI: id=${attack.eventId} | napastnik=${attack.attacker.name} | cel=${defender.name} | reakcja=${choice} | rzut_napastnika=${attackerRoll} (${engagement.attackerOutcome}) | rzut_obrońcy=${defenderRoll} (${engagement.defenderOutcome}) | zwyciezca=${engagement.winner} | obrazenia=${damageDealt} | cel_ran=${engagement.damageDealtTo}]\n${summaryText}`;
      onSendChat(chatReport);
    }
  };

  return (
    <Card className="my-3 overflow-hidden border border-brass/50 bg-card/95 text-foreground shadow-deco backdrop-blur-sm">
      {/* Nagłówek klimatyczny Dark Art Déco */}
      <div className="border-b border-brass/20 bg-gradient-to-r from-brass/15 via-background/40 to-brass/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-destructive animate-pulse" />
            <span className="font-display text-sm uppercase tracking-widest text-brass">
              {t('cardTitle')}
            </span>
          </div>
          {isResolved ? (
            <Badge className="border-emerald-500/40 bg-emerald-500/20 font-mono text-xs text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {t('statusResolved')}
            </Badge>
          ) : (
            <Badge className="border-destructive/40 bg-destructive/20 font-mono text-xs text-destructive-foreground animate-pulse">
              <ShieldAlert className="mr-1 h-3 w-3 text-destructive" />
              {attack.weapon.name}
            </Badge>
          )}
        </div>

        {/* Opis sytuacji w świecie gry */}
        <div className="mt-2 space-y-1">
          <p className="font-serif text-sm font-medium text-foreground">
            <strong className="text-destructive">{attack.attacker.name}</strong>{' '}
            {t('incomingAttackWithWeapon', {
              attacker: '',
              weapon: attack.weapon.name,
            }).replace(/^:\s*/, '')}
          </p>
          {attack.intent && (
            <p className="font-serif text-xs italic text-muted-foreground">
              „{attack.intent}”
            </p>
          )}
        </div>

        {/* Ostrzeżenie o przewadze liczebnej */}
        {outnumbered.isOutnumbered && !isResolved && (
          <div className="mt-2 flex items-start gap-2 rounded border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>{t('outnumberedWarning')}</span>
          </div>
        )}
      </div>

      <CardContent className="space-y-4 p-4">
        {/* Stan 1: Opcje obrony (gdy starcie czeka na decyzję) */}
        {!isResolved && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Opcja 1: Zwinny Unik (Dodge) */}
            <div className="flex flex-col justify-between rounded-lg border border-sky-500/30 bg-sky-950/20 p-3.5 transition-all hover:border-sky-500/60">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-sky-400">
                    <Footprints className="h-4 w-4" />
                    {t('dodgeTitle')}
                  </span>
                  <Badge className="border-sky-500/40 bg-sky-500/15 font-mono text-xs text-sky-300">
                    {dodgeSkill}%
                  </Badge>
                </div>
                <p className="font-serif text-xs text-muted-foreground leading-relaxed">
                  {t('dodgeLore')}
                </p>
                <div className="border-t border-sky-500/20 pt-1.5 text-[11px] font-mono text-sky-300/80">
                  {t('dodgeThresholds', {
                    regular: dodgeSkill,
                    hard: Math.floor(dodgeSkill / 2),
                    extreme: Math.floor(dodgeSkill / 5),
                  })}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled || !canAct}
                onClick={() => handleExecuteDefense('dodge')}
                className="mt-3 w-full border-sky-500/50 text-sky-300 hover:bg-sky-500/20 hover:text-sky-100"
              >
                {t('dodgeButton')}
              </Button>
            </div>

            {/* Opcja 2: Wejście w Zwarcie / Kontratak (Fight Back) */}
            <div className="flex flex-col justify-between rounded-lg border border-rose-500/40 bg-rose-950/20 p-3.5 transition-all hover:border-rose-500/70">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-rose-400">
                    <Swords className="h-4 w-4" />
                    {t('fightBackTitle')}
                  </span>
                  <Badge className="border-rose-500/40 bg-rose-500/15 font-mono text-xs text-rose-300">
                    {selectedWeapon?.skillValue ?? brawlSkill}%
                  </Badge>
                </div>
                <p className="font-serif text-xs text-muted-foreground leading-relaxed">
                  {t('fightBackLore')}
                </p>

                {/* Wybór broni */}
                <div className="space-y-1 pt-1">
                  <label
                    htmlFor={`weapon-select-${attack.eventId}`}
                    className="block text-[11px] font-serif text-muted-foreground"
                  >
                    {t('weaponSelectLabel')}:
                  </label>
                  <select
                    id={`weapon-select-${attack.eventId}`}
                    value={selectedWeaponId}
                    onChange={(e) => setSelectedWeaponId(e.target.value)}
                    className="w-full rounded border border-rose-500/30 bg-background/90 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    {weapons.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.id === 'unarmed' ? t('unarmed') : w.name} ({w.skillValue}%, {w.damageFormula})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                size="sm"
                disabled={disabled || !canAct}
                onClick={() => handleExecuteDefense('fight_back')}
                className="mt-3 w-full bg-rose-600 font-medium text-white hover:bg-rose-500 shadow-sm"
              >
                {t('fightBackButton')}
              </Button>
            </div>

            {/* Opcja 3: Manewr Taktyczny (Fighting Maneuver) */}
            <div className="flex flex-col justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 transition-all hover:border-amber-500/60">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-amber-400">
                    <ShieldAlert className="h-4 w-4" />
                    {t('maneuverTitle')}
                  </span>
                  <Badge className="border-amber-500/40 bg-amber-500/15 font-mono text-xs text-amber-300">
                    {brawlSkill}%
                  </Badge>
                </div>

                {!maneuverCheck.allowed ? (
                  <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive-foreground">
                    {t('maneuverBuildBlocked')}
                  </div>
                ) : (
                  <>
                    <p className="font-serif text-xs text-muted-foreground leading-relaxed">
                      {t('maneuverLore')}
                    </p>
                    {maneuverCheck.penaltyDice > 0 && (
                      <p className="text-[11px] font-mono text-amber-300">
                        {t('maneuverPenaltyWarn', {
                          buildDiff: maneuverCheck.buildDifference,
                          penalty: maneuverCheck.penaltyDice,
                        })}
                      </p>
                    )}
                    <div className="flex gap-1.5 pt-1">
                      {(['knockdown', 'disarm', 'grapple'] as ManeuverType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedManeuver(type)}
                          className={`flex-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
                            selectedManeuver === type
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'border-border/60 text-muted-foreground hover:bg-background'
                          }`}
                        >
                          {t(
                            type === 'disarm'
                              ? 'maneuverDisarm'
                              : type === 'grapple'
                              ? 'maneuverGrapple'
                              : 'maneuverKnockdown'
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled || !canAct || !maneuverCheck.allowed}
                onClick={() => handleExecuteDefense('maneuver')}
                className="mt-3 w-full border-amber-500/50 text-amber-300 hover:bg-amber-500/20 hover:text-amber-100"
              >
                {t('maneuverButton')}
              </Button>
            </div>
          </div>
        )}

        {/* Stan 2: Wizualizacja rozstrzygnięcia, kości K100 i obrażeń */}
        {isResolved && resultState && (
          <div className="space-y-3 rounded-lg border border-brass/30 bg-background/60 p-4">
            {/* Werdykt starcia */}
            <div className="flex items-center gap-2 font-display text-sm font-semibold">
              {resultState.winner === 'defender' ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{resultState.summaryText}</span>
                </div>
              ) : resultState.damageDealtTo === 'defender' ? (
                <div className="flex items-center gap-2 text-destructive">
                  <Skull className="h-5 w-5" />
                  <span>{resultState.summaryText}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldAlert className="h-5 w-5" />
                  <span>{resultState.summaryText}</span>
                </div>
              )}
            </div>

            {/* Tabela kości (Dice Breakdown) */}
            <div className="grid grid-cols-1 gap-2.5 rounded-md border border-brass/20 bg-card/60 p-3 sm:grid-cols-2 text-xs font-mono">
              {/* Napastnik */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-serif">{attack.attacker.name}</span>
                  <span>{attack.attacker.attackSkill}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dices className="h-4 w-4 text-destructive" />
                  <span className="text-base font-bold text-foreground">
                    K100: {resultState.attackerRoll}
                  </span>
                  {getOutcomeBadge(resultState.attackerOutcome)}
                </div>
              </div>

              {/* Badacz */}
              <div className="space-y-1 border-t border-border/40 pt-2 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-serif">{defender?.name || t('targetLabel', { target: '' })}</span>
                  <span>
                    {resultState.choice === 'dodge'
                      ? `${dodgeSkill}%`
                      : `${resultState.weaponUsed?.skillValue ?? brawlSkill}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Dices className="h-4 w-4 text-sky-400" />
                  <span className="text-base font-bold text-foreground">
                    K100: {resultState.defenderRoll}
                  </span>
                  {getOutcomeBadge(resultState.defenderOutcome)}
                </div>
              </div>
            </div>

            {/* Skutki i bilans zdrowia */}
            <div className="space-y-1.5 pt-1 text-xs">
              {resultState.effectiveDamage > 0 && (
                <div className="flex items-center justify-between font-serif">
                  <span className="text-muted-foreground">
                    {resultState.damageDealtTo === 'defender'
                      ? t('healthStatePlayer', {
                          before: resultState.defenderHpBefore,
                          after: resultState.defenderHpAfter,
                        })
                      : t('healthStateEnemy', {
                          before: resultState.attackerHpBefore,
                          after: resultState.attackerHpAfter,
                        })}
                  </span>
                  <Badge className="border-destructive/40 bg-destructive/20 font-mono text-destructive-foreground">
                    <HeartPulse className="mr-1 h-3 w-3" />
                    {t('damageDealtLabel', { damage: resultState.effectiveDamage })}
                  </Badge>
                </div>
              )}

              {/* Alerty stanów krytycznych */}
              {resultState.isMajorWound && (
                <div className="rounded border border-destructive/50 bg-destructive/15 p-2 text-xs font-semibold text-destructive-foreground">
                  {t('majorWoundAlert')}
                </div>
              )}
              {resultState.isDefenderDead && (
                <div className="rounded border border-destructive bg-destructive/25 p-2 text-xs font-bold text-destructive-foreground">
                  {t('dyingAlert')}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CombatCard;
