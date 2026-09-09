'use client';

/**
 * @file HazardDialog.tsx
 * Dialog rozstrzygania zagrożeń środowiskowych i trucizn Call of Cthulhu 7e RAW.
 * Estetyka: Dark Art Déco.
 *
 * Zapewnia deterministyczne rzuty obronne (Skakanie, Kondycja) oraz
 * wyliczanie obrażeń według Księgi Strażnika CoC 7e (Tabela III i IV).
 */

import React, { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Flame,
  Skull,
  Wind,
  ArrowDownCircle,
  Dices,
  ShieldAlert,
  Send,
  CheckCircle2,
} from 'lucide-react';
import {
  type HazardType,
  type FallingSurface,
  type FireIntensity,
  type AcidPotency,
  type AirlessKind,
  type PoisonSeverity,
  COC7E_POISONS,
  normalizePoisonSeverity,
  resolveFallingDamage,
  resolveFireDamage,
  resolveAcidDamage,
  resolveSuffocationRound,
  resolvePoisonEffect,
  type FallingResolution,
  type FireResolution,
  type AcidResolution,
  type SuffocationResolution,
  type PoisonResolution,
} from '@/lib/hazards-engine';
import type { HazardEventData } from '@/lib/types';

export interface HazardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hazard?: HazardEventData;
  playerCon?: number;
  playerHp?: number;
  playerJump?: number;
  playerDodge?: number;
  playerName?: string;
  onApplyDamage?: (damage: number, reason: string) => void;
  onSendToChat?: (message: string) => void;
  onComplete?: () => void;
  canApply?: boolean;
}

export function HazardDialog({
  open,
  onOpenChange,
  hazard,
  playerCon = 50,
  playerHp,
  playerJump = 20,
  onApplyDamage,
  onSendToChat,
  onComplete,
  canApply = true,
}: HazardDialogProps) {
  const t = useTranslations('Hazards');
  const locale = useLocale();
  const formatDice = (formula: string) => locale === 'pl' ? formula.replace(/d/gi, 'k') : formula;

  // Aktywna zakładka / typ zagrożenia
  const tabForType = (type?: HazardType) =>
    type === 'acid' ? 'fire' : type === 'drowning' ? 'suffocation' : type || 'falling';
  const initialType = tabForType(hazard?.type);
  const [activeTab, setActiveTab] = useState<string>(initialType);

  useEffect(() => {
    if (hazard?.type) {
      setActiveTab(tabForType(hazard.type));
    }
  }, [hazard]);

  // Stan dla upadku
  const [fallHeight, setFallHeight] = useState<number>(hazard?.fallHeightMeters || 3);
  const [fallSurface, setFallSurface] = useState<FallingSurface>(hazard?.surface || 'normal');
  const [fallResult, setFallResult] = useState<FallingResolution | null>(null);

  // Stan dla ognia
  const [fireIntensity, setFireIntensity] = useState<FireIntensity>(
    hazard?.fireIntensity || 'minor'
  );
  const [fireRounds, setFireRounds] = useState<number>(hazard?.fireRounds || 1);
  const [damageSource, setDamageSource] = useState<'fire' | 'acid'>(hazard?.type === 'acid' ? 'acid' : 'fire');
  const [acidPotency, setAcidPotency] = useState<AcidPotency>(hazard?.acidPotency || 'splash');
  const [fireResult, setFireResult] = useState<FireResolution | null>(null);
  const [acidResult, setAcidResult] = useState<AcidResolution | null>(null);

  // Stan dla uduszenia / tonięcia
  const [airlessRound, setAirlessRound] = useState<number>(hazard?.roundWithoutAir || 1);
  const [airlessKind, setAirlessKind] = useState<AirlessKind>(hazard?.airlessKind || (hazard?.type === 'drowning' ? 'water' : 'smoke'));
  const [suffocationResult, setSuffocationResult] = useState<SuffocationResolution | null>(null);

  // Stan dla trucizny
  const initialPoisonSeverity = hazard?.poisonSeverity
    ?? normalizePoisonSeverity(hazard?.poisonId || hazard?.poisonName, hazard?.poisonPotency)
    ?? (hazard?.poisonName ? '' : 'mild');
  const [selectedPoisonId, setSelectedPoisonId] = useState<PoisonSeverity | ''>(initialPoisonSeverity);
  const [poisonResult, setPoisonResult] = useState<PoisonResolution | null>(null);

  // Flaga zatwierdzenia
  const [isApplied, setIsApplied] = useState<boolean>(false);

  // Reset stanu po otwarciu
  useEffect(() => {
    if (open) {
      setIsApplied(false);
      setFallResult(null);
      setFireResult(null);
      setAcidResult(null);
      setSuffocationResult(null);
      setPoisonResult(null);
      if (hazard?.fallHeightMeters) setFallHeight(hazard.fallHeightMeters);
      setFallSurface(hazard?.surface || 'normal');
      if (hazard?.fireIntensity) setFireIntensity(hazard.fireIntensity);
      setFireRounds(hazard?.fireRounds || 1);
      setDamageSource(hazard?.type === 'acid' ? 'acid' : 'fire');
      setAcidPotency(hazard?.acidPotency || 'splash');
      setAirlessRound(hazard?.roundWithoutAir || 1);
      setAirlessKind(hazard?.airlessKind || (hazard?.type === 'drowning' ? 'water' : 'smoke'));
      setSelectedPoisonId(
        hazard?.poisonSeverity
          ?? normalizePoisonSeverity(hazard?.poisonId || hazard?.poisonName, hazard?.poisonPotency)
          ?? (hazard?.poisonName ? '' : 'mild')
      );
    }
  }, [open, hazard]);

  // Obsługa rzutu na upadek
  const handleRollFalling = (attemptJump: boolean) => {
    const res = resolveFallingDamage(fallHeight, {
      surface: fallSurface,
      jumpSkillValue: attemptJump ? playerJump : undefined,
      skipJumpCheck: !attemptJump,
    });
    setFallResult(res);
  };

  // Obsługa ognia
  const handleRollFire = () => {
    if (damageSource === 'acid') {
      setAcidResult(resolveAcidDamage(acidPotency));
      setFireResult(null);
    } else {
      setFireResult(resolveFireDamage(fireIntensity, fireRounds));
      setAcidResult(null);
    }
  };

  // Obsługa uduszenia
  const handleRollSuffocation = () => {
    const res = resolveSuffocationRound(playerCon, airlessRound, {
      kind: airlessKind,
      conFailed: hazard?.conFailed,
      currentHp: playerHp,
    });
    setSuffocationResult(res);
  };

  // Obsługa trucizny
  const handleRollPoison = () => {
    if (!selectedPoisonId) return;
    const res = resolvePoisonEffect(selectedPoisonId, playerCon);
    setPoisonResult(res);
  };

  // Zastosowanie wyniku
  const handleApplyResolution = (damage: number, reason: string, fullSummary: string) => {
    if (!canApply || isApplied) return;
    if (onApplyDamage && damage > 0) {
      onApplyDamage(damage, reason);
    }
    if (onSendToChat) {
      const chatReport = `[WYNIK_ZAGROŻENIA: id=${hazard?.id || 'manual'} | Obrażenia: -${damage} HP | ${reason}]\n${fullSummary}`;
      onSendToChat(chatReport);
    }
    setIsApplied(true);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-brass/50 bg-card text-foreground shadow-deco overflow-hidden">
        <DialogHeader className="border-b border-brass/20 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-brass" />
              <DialogTitle className="font-display text-lg tracking-wider text-brass uppercase">
                {t('dialogTitle')}
              </DialogTitle>
            </div>
            <Badge className="bg-brass/20 text-brass border-brass/40 text-xs font-mono">
              CoC 7e RAW
            </Badge>
          </div>
          <DialogDescription className="text-muted-foreground text-sm mt-1">
            {hazard?.description || t('dialogSubtitle')}
          </DialogDescription>
        </DialogHeader>

        {!canApply && (
          <p className="text-xs text-destructive">{t('targetCharacterMissing')}</p>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-4 bg-card border border-brass/30">
            <TabsTrigger value="falling" className="data-[state=active]:bg-brass/20 data-[state=active]:text-brass text-xs">
              <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5" />
              {t('tabFalling')}
            </TabsTrigger>
            <TabsTrigger value="fire" className="data-[state=active]:bg-brass/20 data-[state=active]:text-brass text-xs">
              <Flame className="w-3.5 h-3.5 mr-1.5" />
              {t('tabFire')}
            </TabsTrigger>
            <TabsTrigger value="suffocation" className="data-[state=active]:bg-brass/20 data-[state=active]:text-brass text-xs">
              <Wind className="w-3.5 h-3.5 mr-1.5" />
              {t('tabSuffocation')}
            </TabsTrigger>
            <TabsTrigger value="poison" className="data-[state=active]:bg-brass/20 data-[state=active]:text-brass text-xs">
              <Skull className="w-3.5 h-3.5 mr-1.5" />
              {t('tabPoison')}
            </TabsTrigger>
          </TabsList>

          {/* ZAKŁADKA 1: UPADEK */}
          <TabsContent value="falling" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('heightLabel')}:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={fallHeight}
                    onChange={(e) => setFallHeight(parseInt(e.target.value) || 1)}
                    className="w-20 bg-input border border-brass/40 rounded px-2 py-1 text-foreground text-center font-mono"
                  />
                  <span className="text-muted-foreground">m ({Math.min(10, Math.max(1, Math.ceil(fallHeight / 3)))} {t(Math.ceil(fallHeight / 3) === 1 ? 'diceUnit' : 'diceUnits')})</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('surfaceLabel')}:</label>
                <select
                  value={fallSurface}
                  onChange={(e) => setFallSurface(e.target.value as FallingSurface)}
                  className="w-full bg-input border border-brass/40 rounded px-2 py-1 text-foreground text-sm"
                >
                  <option value="normal">{t('surfaceNormal')}</option>
                  <option value="hard">{t('surfaceHard')}</option>
                  <option value="soft">{t('surfaceSoft')}</option>
                  <option value="water">{t('surfaceWater')}</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleRollFalling(true)}
                className="flex-1 bg-brass hover:bg-brass/80 text-background font-medium"
              >
                <Dices className="w-4 h-4 mr-2" />
                {t('actionJumpCheck', { skill: playerJump })}
              </Button>
              <Button
                onClick={() => handleRollFalling(false)}
                variant="outline"
                className="border-border text-foreground hover:bg-muted"
              >
                {t('actionDirectFall')}
              </Button>
            </div>

            {fallResult && (
              <Card className="bg-card/70 border border-brass/40 p-3 space-y-2 shadow-deco">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t('rawBaseDice')}: {formatDice(fallResult.damageFormula)}</span>
                  {fallResult.jumpRoll && (
                    <Badge variant={fallResult.jumpRoll.outcome === 'fail' ? 'destructive' : 'default'}>
                      {t('jumpOutcome')}: {fallResult.jumpRoll.outcome} (-{fallResult.jumpRoll.diceReduced} {t('diceUnits')})
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/60">
                  <span className="text-foreground font-medium text-base">
                    {t('finalDamage')}: <strong className="text-destructive text-lg">{fallResult.finalDamage} HP</strong>
                  </span>
                  <Button
                    size="sm"
                    disabled={isApplied || !canApply}
                    onClick={() =>
                      handleApplyResolution(
                        fallResult.finalDamage,
                        t('reasonFalling', { height: fallResult.heightMeters }),
                        t('summaryFalling', { height: fallResult.heightMeters, formula: formatDice(fallResult.damageFormula), damage: fallResult.finalDamage })
                      )
                    }
                    className="bg-destructive hover:bg-destructive/80 text-destructive-foreground text-xs"
                  >
                    {isApplied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                    {isApplied ? t('applied') : t('applyToCharacter')}
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ZAKŁADKA 2: OGIEŃ I KWAS */}
          <TabsContent value="fire" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={damageSource === 'fire' ? 'default' : 'outline'} onClick={() => setDamageSource('fire')}>
                {t('sourceFire')}
              </Button>
              <Button type="button" variant={damageSource === 'acid' ? 'default' : 'outline'} onClick={() => setDamageSource('acid')}>
                {t('sourceAcid')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {damageSource === 'fire' ? (
                <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('fireIntensityLabel')}:</label>
                <select
                  value={fireIntensity}
                  onChange={(e) => setFireIntensity(e.target.value as FireIntensity)}
                  className="w-full bg-input border border-brass/40 rounded px-2 py-1 text-foreground text-sm"
                >
                  <option value="minor">{t('fireMinor')} ({formatDice('1d6')})</option>
                  <option value="moderate">{t('fireModerate')} ({formatDice('1d6')}/{t('roundShort')})</option>
                  <option value="major">{t('fireMajor')} ({formatDice('1d10')}/{t('roundShort')})</option>
                  <option value="inferno">{t('fireInferno')} ({formatDice('1d10')}/{t('roundShort')})</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('roundsCount')}:</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={fireRounds}
                  onChange={(e) => setFireRounds(parseInt(e.target.value) || 1)}
                  className="w-20 bg-input border border-brass/40 rounded px-2 py-1 text-foreground text-center font-mono"
                />
              </div>
                </>
              ) : (
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('acidStrengthLabel')}:</label>
                  <select value={acidPotency} onChange={(e) => setAcidPotency(e.target.value as AcidPotency)} className="w-full bg-input border border-brass/40 rounded px-2 py-1 text-foreground text-sm">
                    <option value="splash">{t('acidMild')} ({formatDice('1d3')})</option>
                    <option value="immersion">{t('acidStrong')} ({formatDice('1d6')})</option>
                  </select>
                </div>
              )}
            </div>

            <p className="text-xs text-brass italic">
              ⚠️ {t('armorIgnoredNotice')}
            </p>

            <Button
              onClick={handleRollFire}
              className="w-full bg-brass hover:bg-brass/80 text-background font-medium"
            >
              <Dices className="w-4 h-4 mr-2" />
              {damageSource === 'acid' ? t('actionRollAcidDamage') : t('actionRollFireDamage')}
            </Button>

            {(fireResult || acidResult) && (
              <Card className="bg-card/70 border border-brass/40 p-3 space-y-2 shadow-deco">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{t('fireFormula')}: {formatDice(fireResult?.damageFormula || acidResult?.damageFormula || '')}</span>
                  <Badge variant="destructive">{t('armorBypassed')}</Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/60">
                  <span className="text-foreground font-medium text-base">
                    {t('finalDamage')}: <strong className="text-destructive text-lg">{fireResult?.damageRolled ?? acidResult?.damageRolled ?? 0} HP</strong>
                  </span>
                  <Button
                    size="sm"
                    disabled={isApplied || !canApply}
                    onClick={() =>
                      handleApplyResolution(
                        fireResult?.damageRolled ?? acidResult?.damageRolled ?? 0,
                        damageSource === 'acid' ? t('reasonAcid') : t('reasonFire'),
                        damageSource === 'acid'
                          ? t('summaryAcid', { formula: formatDice(acidResult?.damageFormula || ''), damage: acidResult?.damageRolled || 0 })
                          : t('summaryFire', { formula: formatDice(fireResult?.damageFormula || ''), damage: fireResult?.damageRolled || 0 })
                      )
                    }
                    className="bg-destructive hover:bg-destructive/80 text-destructive-foreground text-xs"
                  >
                    {isApplied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                    {isApplied ? t('applied') : t('applyToCharacter')}
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ZAKŁADKA 3: UDUSZENIE I TONIĘCIE */}
          <TabsContent value="suffocation" className="space-y-4 pt-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('roundWithoutAirLabel')}:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={airlessRound}
                  onChange={(e) => setAirlessRound(parseInt(e.target.value) || 1)}
                  className="w-20 bg-input border border-brass/40 rounded px-2 py-1 text-foreground text-center font-mono"
                />
              </div>
              <select value={airlessKind} onChange={(e) => setAirlessKind(e.target.value as AirlessKind)} className="w-full bg-input border border-brass/40 rounded px-2 py-1 text-foreground text-sm">
                <option value="smoke">{t('airlessSmoke')} ({formatDice('1d3')})</option>
                <option value="water">{t('airlessWater')} ({formatDice('1d6')})</option>
                <option value="vacuum">{t('airlessVacuum')} ({formatDice('1d6')})</option>
              </select>
              <p className="text-xs text-muted-foreground">{hazard?.conFailed ? t('conAlreadyFailedNotice') : t('conEveryRoundNotice')}</p>
            </div>

            <Button
              onClick={handleRollSuffocation}
              className="w-full bg-brass hover:bg-brass/80 text-background font-medium"
            >
              <Dices className="w-4 h-4 mr-2" />
              {t('actionRollSuffocationCon', { con: playerCon })}
            </Button>

            {suffocationResult && (
              <Card className="bg-card/70 border border-brass/40 p-3 space-y-2 shadow-deco">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {suffocationResult.conRoll
                      ? `${t('conCheckOutcome')}: ${suffocationResult.conRoll.total} / ${playerCon}`
                      : t('damageContinuesNotice')}
                  </span>
                  <Badge variant={suffocationResult.conRoll?.success ? 'default' : 'destructive'}>
                    {suffocationResult.conRoll?.success ? t('breathHeldSuccess') : t('breathFailDamage')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/60">
                  <span className="text-foreground font-medium text-base">
                    {t('finalDamage')}: <strong className="text-destructive text-lg">{suffocationResult.damageTaken} HP</strong>
                  </span>
                  <Button
                    size="sm"
                    disabled={isApplied || !canApply}
                    onClick={() =>
                      handleApplyResolution(
                        suffocationResult.damageTaken,
                        t('reasonAirless', { round: suffocationResult.roundWithoutAir }),
                        t('summaryAirless', { round: suffocationResult.roundWithoutAir, formula: formatDice(suffocationResult.damageFormula), damage: suffocationResult.damageTaken })
                      )
                    }
                    className="bg-destructive hover:bg-destructive/80 text-destructive-foreground text-xs"
                  >
                    {isApplied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                    {isApplied ? t('applied') : t('applyToCharacter')}
                  </Button>
                </div>
                {suffocationResult.deathAtZero && (
                  <p className="text-xs font-medium text-destructive">
                    {t('deathAtZeroNotice')}
                  </p>
                )}
              </Card>
            )}
          </TabsContent>

          {/* ZAKŁADKA 4: TRUCIZNY I TOKSYNY */}
          <TabsContent value="poison" className="space-y-4 pt-3">
            <div className="space-y-2 text-sm">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">{t('selectPoisonLabel')}:</label>
              <select
                value={selectedPoisonId}
                onChange={(e) => setSelectedPoisonId(e.target.value as PoisonSeverity | '')}
                className="w-full bg-input border border-brass/40 rounded px-2 py-1.5 text-foreground text-sm font-serif"
              >
                <option value="">{t('poisonCategoryPlaceholder')}</option>
                {COC7E_POISONS.map((poison) => (
                  <option key={poison.id} value={poison.id}>
                    {t(poison.nameKey)} ({formatDice(poison.damageFormula)})
                  </option>
                ))}
              </select>
              {!selectedPoisonId && <p className="text-xs text-destructive">{t('poisonCategoryRequired')}</p>}
            </div>

            <Button
              onClick={handleRollPoison}
              disabled={!selectedPoisonId}
              className="w-full bg-brass hover:bg-brass/80 text-background font-medium"
            >
              <Dices className="w-4 h-4 mr-2" />
              {t('actionRollPoisonCon', { con: playerCon })}
            </Button>

            {poisonResult && (
              <Card className="bg-card/70 border border-brass/40 p-3 space-y-2 shadow-deco">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {t('conCheckOutcome')}: {poisonResult.conRoll.total} / {playerCon} ({poisonResult.conRoll.outcome})
                  </span>
                  <Badge variant={poisonResult.conRoll.extremeSuccess ? 'default' : 'destructive'}>
                    {poisonResult.conRoll.extremeSuccess ? t('poisonResisted') : t('poisonFailed')}
                  </Badge>
                </div>

                {poisonResult.halvedByExtremeCon && <p className="text-xs text-emerald-400">{t('poisonDamageHalved')}</p>}

                <div className="flex justify-between items-center pt-2 border-t border-border/60">
                  <span className="text-foreground font-medium text-base">
                    {t('finalDamage')}: <strong className="text-destructive text-lg">{poisonResult.damageTaken} HP</strong>
                  </span>
                  <Button
                    size="sm"
                    disabled={isApplied || !canApply}
                    onClick={() =>
                      handleApplyResolution(
                        poisonResult.damageTaken,
                        t('reasonPoison', { category: t(poisonResult.poison.nameKey) }),
                        t('summaryPoison', { category: t(poisonResult.poison.nameKey), outcome: poisonResult.conRoll.outcome, damage: poisonResult.damageTaken })
                      )
                    }
                    className="bg-destructive hover:bg-destructive/80 text-destructive-foreground text-xs"
                  >
                    {isApplied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                    {isApplied ? t('applied') : t('applyToCharacter')}
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
