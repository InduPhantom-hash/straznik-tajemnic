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
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Flame,
  Skull,
  Wind,
  ArrowDownCircle,
  Dices,
  Shield,
  ShieldAlert,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  type HazardType,
  type FallingSurface,
  type FireIntensity,
  type PoisonDefinition,
  COC7E_POISONS,
  resolveFallingDamage,
  resolveFireDamage,
  resolveAcidDamage,
  resolveSuffocationRound,
  resolvePoisonEffect,
  type FallingResolution,
  type FireResolution,
  type SuffocationResolution,
  type PoisonResolution,
} from '@/lib/hazards-engine';
import type { HazardEventData } from '@/lib/types';
import type { RollOutcome } from '@/lib/dice-utils';

export interface HazardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hazard?: HazardEventData;
  playerCon?: number;
  playerJump?: number;
  playerDodge?: number;
  playerName?: string;
  onApplyDamage?: (damage: number, reason: string) => void;
  onSendToChat?: (message: string) => void;
  onComplete?: () => void;
}

export function HazardDialog({
  open,
  onOpenChange,
  hazard,
  playerCon = 50,
  playerJump = 20,
  playerDodge = 25,
  playerName = 'Badacz',
  onApplyDamage,
  onSendToChat,
  onComplete,
}: HazardDialogProps) {
  const t = useTranslations('Hazards');

  // Aktywna zakładka / typ zagrożenia
  const initialType: HazardType = hazard?.type || 'falling';
  const [activeTab, setActiveTab] = useState<string>(initialType);

  useEffect(() => {
    if (hazard?.type) {
      setActiveTab(hazard.type);
    }
  }, [hazard]);

  // Stan dla upadku
  const [fallHeight, setFallHeight] = useState<number>(hazard?.fallHeightMeters || 3);
  const [fallSurface, setFallSurface] = useState<FallingSurface>('normal');
  const [fallResult, setFallResult] = useState<FallingResolution | null>(null);

  // Stan dla ognia
  const [fireIntensity, setFireIntensity] = useState<FireIntensity>(
    hazard?.fireIntensity || 'minor'
  );
  const [fireRounds, setFireRounds] = useState<number>(1);
  const [fireResult, setFireResult] = useState<FireResolution | null>(null);

  // Stan dla uduszenia / tonięcia
  const [airlessRound, setAirlessRound] = useState<number>(1);
  const [suffocationResult, setSuffocationResult] = useState<SuffocationResolution | null>(null);

  // Stan dla trucizny
  const [selectedPoisonId, setSelectedPoisonId] = useState<string>(
    hazard?.poisonName ? (COC7E_POISONS.find(p => p.id === hazard.poisonName || hazard.poisonName?.toLowerCase().includes(p.id))?.id || 'cyanide') : 'cyanide'
  );
  const [poisonResult, setPoisonResult] = useState<PoisonResolution | null>(null);

  // Flaga zatwierdzenia
  const [isApplied, setIsApplied] = useState<boolean>(false);

  // Reset stanu po otwarciu
  useEffect(() => {
    if (open) {
      setIsApplied(false);
      setFallResult(null);
      setFireResult(null);
      setSuffocationResult(null);
      setPoisonResult(null);
      if (hazard?.fallHeightMeters) setFallHeight(hazard.fallHeightMeters);
      if (hazard?.fireIntensity) setFireIntensity(hazard.fireIntensity);
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
    const res = resolveFireDamage(fireIntensity, fireRounds);
    setFireResult(res);
  };

  // Obsługa uduszenia
  const handleRollSuffocation = () => {
    const res = resolveSuffocationRound(playerCon, airlessRound);
    setSuffocationResult(res);
  };

  // Obsługa trucizny
  const handleRollPoison = () => {
    const res = resolvePoisonEffect(selectedPoisonId, playerCon);
    setPoisonResult(res);
  };

  // Zastosowanie wyniku
  const handleApplyResolution = (damage: number, reason: string, fullSummary: string) => {
    if (onApplyDamage && damage > 0) {
      onApplyDamage(damage, reason);
    }
    if (onSendToChat) {
      const chatReport = `[WYNIK: Zagrożenie | Obrażenia: -${damage} HP | ${reason}]\n${fullSummary}`;
      onSendToChat(chatReport);
    }
    setIsApplied(true);
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border border-amber-900/40 text-amber-100 shadow-2xl">
        <DialogHeader className="border-b border-amber-900/30 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
              <DialogTitle className="text-xl font-serif tracking-wider text-amber-200">
                {t('dialogTitle')}
              </DialogTitle>
            </div>
            <Badge variant="outline" className="border-amber-700/60 text-amber-400 font-mono text-xs">
              CoC 7e RAW
            </Badge>
          </div>
          <DialogDescription className="text-zinc-400 text-sm mt-1">
            {hazard?.description || t('dialogSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-4 bg-zinc-900/90 border border-amber-900/30">
            <TabsTrigger value="falling" className="data-[state=active]:bg-amber-950/60 data-[state=active]:text-amber-200 text-xs">
              <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5" />
              {t('tabFalling')}
            </TabsTrigger>
            <TabsTrigger value="fire" className="data-[state=active]:bg-amber-950/60 data-[state=active]:text-amber-200 text-xs">
              <Flame className="w-3.5 h-3.5 mr-1.5" />
              {t('tabFire')}
            </TabsTrigger>
            <TabsTrigger value="suffocation" className="data-[state=active]:bg-amber-950/60 data-[state=active]:text-amber-200 text-xs">
              <Wind className="w-3.5 h-3.5 mr-1.5" />
              {t('tabSuffocation')}
            </TabsTrigger>
            <TabsTrigger value="poison" className="data-[state=active]:bg-amber-950/60 data-[state=active]:text-amber-200 text-xs">
              <Skull className="w-3.5 h-3.5 mr-1.5" />
              {t('tabPoison')}
            </TabsTrigger>
          </TabsList>

          {/* ZAKŁADKA 1: UPADEK */}
          <TabsContent value="falling" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase tracking-wider">{t('heightLabel')}:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={fallHeight}
                    onChange={(e) => setFallHeight(parseInt(e.target.value) || 1)}
                    className="w-20 bg-zinc-900 border border-amber-900/40 rounded px-2 py-1 text-amber-200 text-center font-mono"
                  />
                  <span className="text-zinc-400">m ({Math.min(10, Math.max(1, Math.floor(fallHeight / 3)))}k6)</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase tracking-wider">{t('surfaceLabel')}:</label>
                <select
                  value={fallSurface}
                  onChange={(e) => setFallSurface(e.target.value as FallingSurface)}
                  className="w-full bg-zinc-900 border border-amber-900/40 rounded px-2 py-1 text-amber-200 text-sm"
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
                className="flex-1 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-medium"
              >
                <Dices className="w-4 h-4 mr-2" />
                {t('actionJumpCheck', { skill: playerJump })}
              </Button>
              <Button
                onClick={() => handleRollFalling(false)}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                {t('actionDirectFall')}
              </Button>
            </div>

            {fallResult && (
              <Card className="bg-zinc-900/70 border border-amber-900/40 p-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">{t('rawBaseDice')}: {fallResult.baseDiceCount}k6</span>
                  {fallResult.jumpRoll && (
                    <Badge variant={fallResult.jumpRoll.outcome === 'fail' ? 'destructive' : 'default'}>
                      {t('jumpOutcome')}: {fallResult.jumpRoll.outcome} (-{fallResult.jumpRoll.diceReduced}k6)
                    </Badge>
                  )}
                </div>
                {fallResult.halvedBySurface && (
                  <p className="text-xs text-emerald-400 italic">
                    {t('surfaceHalvedNotice')}
                  </p>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-amber-900/20">
                  <span className="text-amber-300 font-medium text-base">
                    {t('finalDamage')}: <strong className="text-red-400 text-lg">{fallResult.finalDamage} HP</strong>
                  </span>
                  <Button
                    size="sm"
                    disabled={isApplied}
                    onClick={() =>
                      handleApplyResolution(
                        fallResult.finalDamage,
                        `Upadek z ${fallResult.heightMeters}m`,
                        `Upadek z wysokości ${fallResult.heightMeters}m. Obrażenia: ${fallResult.finalDamage} HP.`
                      )
                    }
                    className="bg-red-800 hover:bg-red-700 text-white text-xs"
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase tracking-wider">{t('fireIntensityLabel')}:</label>
                <select
                  value={fireIntensity}
                  onChange={(e) => setFireIntensity(e.target.value as FireIntensity)}
                  className="w-full bg-zinc-900 border border-amber-900/40 rounded px-2 py-1 text-amber-200 text-sm"
                >
                  <option value="minor">{t('fireMinor')} (1k6)</option>
                  <option value="moderate">{t('fireModerate')} (1k6/rd)</option>
                  <option value="major">{t('fireMajor')} (2k6/rd)</option>
                  <option value="inferno">{t('fireInferno')} (3k6/rd)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase tracking-wider">{t('roundsCount')}:</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={fireRounds}
                  onChange={(e) => setFireRounds(parseInt(e.target.value) || 1)}
                  className="w-20 bg-zinc-900 border border-amber-900/40 rounded px-2 py-1 text-amber-200 text-center font-mono"
                />
              </div>
            </div>

            <p className="text-xs text-amber-500/80 italic">
              ⚠️ {t('armorIgnoredNotice')}
            </p>

            <Button
              onClick={handleRollFire}
              className="w-full bg-amber-700 hover:bg-amber-600 text-zinc-950 font-medium"
            >
              <Dices className="w-4 h-4 mr-2" />
              {t('actionRollFireDamage')}
            </Button>

            {fireResult && (
              <Card className="bg-zinc-900/70 border border-amber-900/40 p-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">{t('fireFormula')}: {fireResult.damageFormula}</span>
                  <Badge variant="destructive">{t('armorBypassed')}</Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-amber-900/20">
                  <span className="text-amber-300 font-medium text-base">
                    {t('finalDamage')}: <strong className="text-red-400 text-lg">{fireResult.damageRolled} HP</strong>
                  </span>
                  <Button
                    size="sm"
                    disabled={isApplied}
                    onClick={() =>
                      handleApplyResolution(
                        fireResult.damageRolled,
                        `Oparzenia (${fireResult.intensity})`,
                        `Obrażenia od ognia (${fireResult.intensity}, ${fireResult.rounds} rund): ${fireResult.damageRolled} HP.`
                      )
                    }
                    className="bg-red-800 hover:bg-red-700 text-white text-xs"
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
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>{t('maxBreathSpokoj')}: <strong>{Math.floor(playerCon / 5)} rund</strong></span>
                <span>{t('maxBreathWysilek')}: <strong>{Math.floor(playerCon / 10)} rund</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-zinc-400 uppercase tracking-wider">{t('roundWithoutAirLabel')}:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={airlessRound}
                  onChange={(e) => setAirlessRound(parseInt(e.target.value) || 1)}
                  className="w-20 bg-zinc-900 border border-amber-900/40 rounded px-2 py-1 text-amber-200 text-center font-mono"
                />
                <span className="text-xs text-zinc-400">
                  {airlessRound === 1 && t('penaltyNone')}
                  {airlessRound === 2 && t('penaltyOne')}
                  {airlessRound >= 3 && t('penaltyTwo')}
                </span>
              </div>
            </div>

            <Button
              onClick={handleRollSuffocation}
              className="w-full bg-amber-700 hover:bg-amber-600 text-zinc-950 font-medium"
            >
              <Dices className="w-4 h-4 mr-2" />
              {t('actionRollSuffocationCon', { con: playerCon })}
            </Button>

            {suffocationResult && (
              <Card className="bg-zinc-900/70 border border-amber-900/40 p-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">
                    {t('conCheckOutcome')}: {suffocationResult.conRoll.total} / {playerCon}
                  </span>
                  <Badge variant={suffocationResult.conRoll.success ? 'default' : 'destructive'}>
                    {suffocationResult.conRoll.success ? t('breathHeldSuccess') : t('breathFailDamage')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-amber-900/20">
                  <span className="text-amber-300 font-medium text-base">
                    {t('finalDamage')}: <strong className="text-red-400 text-lg">{suffocationResult.damageTaken} HP</strong>
                  </span>
                  <Button
                    size="sm"
                    disabled={isApplied}
                    onClick={() =>
                      handleApplyResolution(
                        suffocationResult.damageTaken,
                        `Brak tchu (runda ${suffocationResult.roundWithoutAir})`,
                        `Uduszenie/Tonięcie: runda ${suffocationResult.roundWithoutAir} bez powietrza. Obrażenia: ${suffocationResult.damageTaken} HP.`
                      )
                    }
                    className="bg-red-800 hover:bg-red-700 text-white text-xs"
                  >
                    {isApplied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                    {isApplied ? t('applied') : t('applyToCharacter')}
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ZAKŁADKA 4: TRUCIZNY I TOKSYNY */}
          <TabsContent value="poison" className="space-y-4 pt-3">
            <div className="space-y-2 text-sm">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">{t('selectPoisonLabel')}:</label>
              <select
                value={selectedPoisonId}
                onChange={(e) => setSelectedPoisonId(e.target.value)}
                className="w-full bg-zinc-900 border border-amber-900/40 rounded px-2 py-1.5 text-amber-200 text-sm font-serif"
              >
                {COC7E_POISONS.map((poison) => (
                  <option key={poison.id} value={poison.id}>
                    {poison.id.toUpperCase()} (Moc: {poison.potency}, Wymóg: {poison.difficulty})
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleRollPoison}
              className="w-full bg-amber-700 hover:bg-amber-600 text-zinc-950 font-medium"
            >
              <Dices className="w-4 h-4 mr-2" />
              {t('actionRollPoisonCon', { con: playerCon })}
            </Button>

            {poisonResult && (
              <Card className="bg-zinc-900/70 border border-amber-900/40 p-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">
                    {t('conCheckOutcome')}: {poisonResult.conRoll.total} / {playerCon} ({poisonResult.conRoll.outcome})
                  </span>
                  <Badge variant={poisonResult.conRoll.passedRequirement ? 'default' : 'destructive'}>
                    {poisonResult.conRoll.passedRequirement ? t('poisonResisted') : t('poisonFailed')}
                  </Badge>
                </div>

                {poisonResult.isFatal && (
                  <p className="text-xs text-red-500 font-bold tracking-wider uppercase">
                    💀 {t('lethalPoisonNotice')}
                  </p>
                )}
                {poisonResult.unconscious && (
                  <p className="text-xs text-amber-400 italic">
                    💤 {t('unconsciousNotice')}
                  </p>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-amber-900/20">
                  <span className="text-amber-300 font-medium text-base">
                    {t('finalDamage')}: <strong className="text-red-400 text-lg">{poisonResult.damageTaken} HP</strong>
                  </span>
                  <Button
                    size="sm"
                    disabled={isApplied}
                    onClick={() =>
                      handleApplyResolution(
                        poisonResult.damageTaken,
                        `Zatrucie: ${poisonResult.poison.id}`,
                        `Test przeciw truciznie ${poisonResult.poison.id}. Wynik: ${poisonResult.conRoll.outcome}. Obrażenia: ${poisonResult.damageTaken} HP.`
                      )
                    }
                    className="bg-red-800 hover:bg-red-700 text-white text-xs"
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
