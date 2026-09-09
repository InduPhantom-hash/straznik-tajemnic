'use client';

/**
 * @file hazard-card.tsx
 * Karta reakcji na zagrożenie fizyczne lub toksynę w oknie czatu (Fiction First).
 * Estetyka: Dark Art Déco.
 *
 * Automatyczne rozstrzyganie 1-kliknięciem bezpośrednio w czacie bez okien modalnych.
 */

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Flame,
  Skull,
  Wind,
  ArrowDownCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  type HazardType,
  type FallingSurface,
  type FireIntensity,
  type AcidPotency,
  type PoisonSeverity,
  normalizePoisonSeverity,
  resolveFallingDamage,
  resolveFireDamage,
  resolveAcidDamage,
  resolveSuffocationRound,
  resolvePoisonEffect,
} from '@/lib/hazards-engine';
import type { HazardEventData } from '@/lib/types';

export interface HazardCardProps {
  hazard: HazardEventData;
  playerCon?: number;
  playerHp?: number;
  playerJump?: number;
  playerDodge?: number;
  playerName?: string;
  completed?: boolean;
  onApplyDamage?: (damage: number, reason: string) => void;
  onSendChat?: (message: string) => void;
  canApply?: boolean;
}

interface ResolutionSummary {
  damage: number;
  reason: string;
  checkText?: string;
  details: string;
}

export function HazardCard({
  hazard,
  playerCon = 50,
  playerHp,
  playerJump = 20,
  playerDodge = 25,
  playerName = 'Badacz',
  completed = false,
  onApplyDamage,
  onSendChat,
  canApply = true,
}: HazardCardProps) {
  const t = useTranslations('Hazards');
  const locale = useLocale() === 'en' ? 'en' : 'pl';
  const [isCompleted, setIsCompleted] = useState<boolean>(completed);
  const [resolution, setResolution] = useState<ResolutionSummary | null>(null);

  const getHazardIcon = () => {
    switch (hazard.type) {
      case 'fire':
      case 'acid':
        return <Flame className="w-5 h-5 text-brass animate-pulse" />;
      case 'poison':
        return <Skull className="w-5 h-5 text-emerald-500" />;
      case 'suffocation':
      case 'drowning':
        return <Wind className="w-5 h-5 text-cyan-400" />;
      case 'falling':
      default:
        return <ArrowDownCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getHazardTypeLabel = () => {
    switch (hazard.type) {
      case 'fire':
        return t('typeFire');
      case 'acid':
        return t('typeAcid');
      case 'poison':
        return t('typePoison');
      case 'suffocation':
        return t('typeSuffocation');
      case 'drowning':
        return t('typeDrowning');
      case 'falling':
      default:
        return t('typeFalling');
    }
  };

  // Zastosowanie i wysłanie wyniku
  const finishResolution = (
    damage: number,
    reason: string,
    checkText: string | undefined,
    details: string
  ) => {
    if (onApplyDamage && damage > 0 && canApply) {
      onApplyDamage(damage, reason);
    }
    const fullSummary = `${reason}. ${checkText ? `${checkText}. ` : ''}${details}`;
    const chatReport = `[WYNIK_ZAGROŻENIA: id=${hazard.id || 'manual'} | Obrażenia: -${damage} HP | ${reason}]\n${fullSummary}`;
    if (onSendChat) {
      onSendChat(chatReport);
    }
    setResolution({ damage, reason, checkText, details });
    setIsCompleted(true);
  };

  // Rozstrzygnięcie upadku
  const handleResolveFalling = (skipJump: boolean) => {
    const res = resolveFallingDamage(hazard.fallHeightMeters || 3, {
      surface: hazard.surface || 'normal',
      jumpSkillValue: playerJump,
      skipJumpCheck: skipJump,
    });

    const checkText = res.jumpRoll
      ? `${locale === 'en' ? 'Jump Check' : 'Test Skakania'}: ${res.jumpRoll.total}/${res.jumpRoll.skillValue}% (${res.jumpRoll.outcome.toUpperCase()})`
      : undefined;

    const details = `${t('finalDamage')}: ${res.finalDamage} HP (${res.damageFormula})`;
    finishResolution(res.finalDamage, `${t('typeFalling')} (${res.heightMeters}m)`, checkText, details);
  };

  // Rozstrzygnięcie ognia / kwasu
  const handleResolveFireOrAcid = (skipDodge: boolean) => {
    if (hazard.type === 'acid') {
      const res = resolveAcidDamage(hazard.acidPotency || 'splash');
      const details = `${t('sourceAcid')}: ${res.damageRolled} HP (${res.damageFormula})`;
      finishResolution(res.damageRolled, t('typeAcid'), undefined, details);
    } else {
      const intensity = hazard.fireIntensity || 'minor';
      const rounds = hazard.fireRounds || 1;
      const res = resolveFireDamage(intensity, rounds);
      const details = `${t('sourceFire')}: ${res.damageRolled} HP (${res.damageFormula})`;
      finishResolution(res.damageRolled, t('typeFire'), undefined, details);
    }
  };

  // Rozstrzygnięcie uduszenia / tonięcia
  const handleResolveSuffocation = (failDirectly: boolean) => {
    const round = hazard.roundWithoutAir || 1;
    const res = resolveSuffocationRound(playerCon, round, {
      conFailed: failDirectly ? true : hazard.conFailed,
      currentHp: playerHp,
    });

    const checkText = res.conRoll
      ? `${locale === 'en' ? 'CON Check' : 'Test Kondycji'}: ${res.conRoll.total}/${playerCon}% (${res.conRoll.outcome.toUpperCase()})`
      : undefined;

    const details = res.damageTaken > 0
      ? `${t('breathFailDamage')}: -${res.damageTaken} HP`
      : t('breathHeldSuccess');

    finishResolution(res.damageTaken, t(hazard.type === 'drowning' ? 'typeDrowning' : 'typeSuffocation'), checkText, details);
  };

  // Rozstrzygnięcie trucizny
  const handleResolvePoison = (failDirectly: boolean) => {
    const severity: PoisonSeverity =
      hazard.poisonSeverity ||
      normalizePoisonSeverity(hazard.poisonId || hazard.poisonName, hazard.poisonPotency) ||
      'mild';

    const conVal = failDirectly ? 1 : playerCon;
    const res = resolvePoisonEffect(severity, conVal);
    const poisonName = hazard.poisonName || t('typePoison');

    const checkText = `${locale === 'en' ? 'CON Saving Throw' : 'Rzut obronny CON'}: ${res.conRoll.total}/${conVal}% (${res.conRoll.outcome.toUpperCase()})`;
    const details = `${poisonName}: -${res.damageTaken} HP (${res.damageFormulaUsed})`;

    finishResolution(res.damageTaken, `${t('typePoison')}: ${poisonName}`, checkText, details);
  };

  return (
    <Card className="my-2 border border-destructive/50 bg-card/85 shadow-deco backdrop-blur-sm">
      <CardContent className="p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-sm bg-card border border-brass/30 mt-0.5">
              {getHazardIcon()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm font-semibold tracking-wide text-foreground">
                  {getHazardTypeLabel()}
                </span>
                {hazard.fallHeightMeters && (
                  <Badge variant="outline" className="text-xs border-brass/40 text-brass">
                    {hazard.fallHeightMeters}m
                  </Badge>
                )}
                {hazard.poisonName && (
                  <Badge variant="outline" className="text-xs border-emerald-800/60 text-emerald-400 font-mono">
                    {hazard.poisonName}
                  </Badge>
                )}
                {hazard.fireIntensity && (
                  <Badge variant="outline" className="text-xs border-amber-800/60 text-amber-400 font-mono">
                    {t(
                      hazard.fireIntensity === 'minor'
                        ? 'fireMinor'
                        : hazard.fireIntensity === 'moderate'
                        ? 'fireModerate'
                        : hazard.fireIntensity === 'major'
                        ? 'fireMajor'
                        : 'fireInferno'
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hazard.description}
              </p>
              {hazard.defensiveSkill && !isCompleted && (
                <p className="text-[11px] text-brass font-mono">
                  🛡️ {t('suggestedDefense')}: <strong>{hazard.defensiveSkill}</strong>
                </p>
              )}
            </div>
          </div>

          <div>
            {isCompleted && (
              <Badge variant="outline" className="bg-emerald-950/50 text-emerald-400 border-emerald-800 text-xs py-1 px-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('resolved')}
              </Badge>
            )}
          </div>
        </div>

        {/* Sekcja rozstrzygnięcia - wynik lub akcje 1-klik */}
        {isCompleted ? (
          <div className="rounded border border-brass/20 bg-secondary/20 p-2 text-xs space-y-1">
            {resolution ? (
              <>
                {resolution.checkText && (
                  <p className="font-mono text-brass">{resolution.checkText}</p>
                )}
                <p className="font-semibold text-foreground">
                  {resolution.details} {playerName ? `(${playerName})` : ''}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground italic">
                {t('applied')} {playerName ? `(${playerName})` : ''}
              </p>
            )}
          </div>
        ) : (
          <div className="pt-1 flex flex-wrap gap-2">
            {hazard.type === 'falling' && (
              <>
                <Button
                  size="sm"
                  className="bg-brass hover:bg-brass/80 text-background font-medium text-xs shadow-deco"
                  onClick={() => handleResolveFalling(false)}
                >
                  {t('actionJumpCheck', { skill: playerJump })}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-brass/40 text-xs hover:bg-brass/10"
                  onClick={() => handleResolveFalling(true)}
                >
                  {t('actionDirectFall')}
                </Button>
              </>
            )}

            {(hazard.type === 'fire' || hazard.type === 'acid') && (
              <>
                <Button
                  size="sm"
                  className="bg-brass hover:bg-brass/80 text-background font-medium text-xs shadow-deco"
                  onClick={() => handleResolveFireOrAcid(false)}
                >
                  {hazard.type === 'acid' ? t('actionRollAcidDamage') : t('actionRollFireDamage')}
                </Button>
              </>
            )}

            {(hazard.type === 'suffocation' || hazard.type === 'drowning') && (
              <>
                <Button
                  size="sm"
                  className="bg-brass hover:bg-brass/80 text-background font-medium text-xs shadow-deco"
                  onClick={() => handleResolveSuffocation(false)}
                >
                  {t('actionRollSuffocationCon', { con: playerCon })}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-brass/40 text-xs hover:bg-brass/10"
                  onClick={() => handleResolveSuffocation(true)}
                >
                  {t('breathFailDamage')}
                </Button>
              </>
            )}

            {hazard.type === 'poison' && (
              <>
                <Button
                  size="sm"
                  className="bg-brass hover:bg-brass/80 text-background font-medium text-xs shadow-deco"
                  onClick={() => handleResolvePoison(false)}
                >
                  {t('actionRollPoisonCon', { con: playerCon })}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-brass/40 text-xs hover:bg-brass/10"
                  onClick={() => handleResolvePoison(true)}
                >
                  {t('poisonFailed')}
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
