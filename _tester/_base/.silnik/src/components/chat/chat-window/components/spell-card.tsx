'use client';

/**
 * @file spell-card.tsx
 * Karta rzucania czarów i rytuałów w oknie czatu narracji (CoC 7e RAW & Poradniki MG).
 * Estetyka: Dark Art Déco Fiction First.
 */

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Dices,
  Skull,
  HeartPulse,
  ShieldAlert,
  Swords,
  XCircle,
} from 'lucide-react';
import {
  getSpellDefinition,
  findSpellByAnyName,
  magicEngine,
  type SpellDefinition,
  type CastingResolution,
} from '@/lib/magic';
import type { Character, SpellCastEventData } from '@/lib/types';
import type { RollOutcome } from '@/lib/dice-utils';

export interface SpellCardProps {
  spellEvent: SpellCastEventData;
  activeCharacter?: Character | null;
  characters?: Character[];
  completed?: boolean;
  onCharacterUpdate?: (char: Character) => void;
  onSendChat?: (message: string) => void;
}

export function SpellCard({
  spellEvent,
  activeCharacter,
  characters = [],
  completed = false,
  onCharacterUpdate,
  onSendChat,
}: SpellCardProps) {
  const t = useTranslations('Magic');
  const locale = useLocale() === 'en' ? 'en' : 'pl';

  const [isResolved, setIsResolved] = useState<boolean>(completed);
  const [resolution, setResolution] = useState<CastingResolution | null>(null);
  const [allowHpConversion, setAllowHpConversion] = useState<boolean>(false);
  const [canPush, setCanPush] = useState<boolean>(false);
  const [isCasting, setIsCasting] = useState<boolean>(false);
  const [showLoreGuide, setShowLoreGuide] = useState<boolean>(false);

  // Znajdź docelową postać (rzucającego)
  const normalizeName = (val: string) => val.trim().toLowerCase().replace(/\s+/g, ' ');
  const characterPool = activeCharacter
    ? [activeCharacter, ...characters.filter((c) => c.id !== activeCharacter.id)]
    : characters;

  const caster = spellEvent.characterId
    ? characterPool.find((c) => c.id === spellEvent.characterId)
    : spellEvent.characterName
    ? characterPool.find((c) => normalizeName(c.name) === normalizeName(spellEvent.characterName || ''))
    : activeCharacter;

  // Znajdź definicję zaklęcia w katalogu
  const spell: SpellDefinition | undefined =
    getSpellDefinition(spellEvent.spellId) || findSpellByAnyName(spellEvent.spellId);

  // Jeśli brak w katalogu, utwórz definicję awaryjną na podstawie danych zdarzenia
  const effectiveSpell: SpellDefinition = spell || {
    id: spellEvent.spellId,
    name: spellEvent.alias || spellEvent.spellId,
    namePl: spellEvent.alias || spellEvent.spellId,
    nameEn: spellEvent.alias || spellEvent.spellId,
    diegeticNames: {
      pl: [spellEvent.alias || spellEvent.spellId],
      en: [spellEvent.alias || spellEvent.spellId],
    },
    category: 'other',
    mpCost: 5,
    sanCost: '1k4',
    castingTime: {
      type: 'rounds',
      rounds: 1,
      value: { pl: '1 runda', en: '1 round' },
    },
    range: { pl: 'Dotyk', en: 'Touch' },
    duration: { pl: 'Chwilowy', en: 'Instantaneous' },
    description: {
      pl: spellEvent.description || 'Tajemna inkantacja z zapisków Mitów.',
      en: spellEvent.description || 'Occult incantation from Mythos records.',
    },
    source: {
      sourceId: 'custom',
      title: 'Zapiski Mitów Cthulhu',
      edition: '7e',
      page: 1,
      language: 'pl',
    },
    definitionVersion: 1,
  };

  const isSkeptic = caster?.magic?.belief === 'skeptic';
  const knownEntry = caster?.magic?.knownSpells?.[effectiveSpell.id];
  const isFirstCast = !knownEntry?.isFirstCastDone;
  const casterPow = caster?.pow ?? 50;
  const hardPow = Math.floor(casterPow / 2);
  const extremePow = Math.floor(casterPow / 5);

  const mpCostNumeric =
    typeof effectiveSpell.mpCost === 'number'
      ? effectiveSpell.mpCost
      : parseInt(String(effectiveSpell.mpCost), 10) || 5;

  const casterMp = caster?.mp ?? 0;
  const casterSan = caster?.san ?? 50;
  const casterHp = caster?.hp ?? 10;
  const hasEnoughMp = casterMp >= mpCostNumeric;
  const missingMp = Math.max(0, mpCostNumeric - casterMp);
  const targetPow = spellEvent.targetPow ?? 50;

  // Tytuł diegetyczny i kanoniczny
  const diegeticTitle =
    spellEvent.alias ||
    effectiveSpell.diegeticNames[locale][0] ||
    (locale === 'en' ? effectiveSpell.nameEn : effectiveSpell.namePl);
  const canonicalName = locale === 'en' ? effectiveSpell.nameEn : effectiveSpell.namePl;

  const getOutcomeBadge = (outcome?: RollOutcome) => {
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

  const handleCast = (isPush = false) => {
    if (!caster || (isResolved && !isPush) || isCasting) return;
    if (isSkeptic) return;
    if (!isPush && !hasEnoughMp && !allowHpConversion) return;

    setIsCasting(true);

    try {
      const res = magicEngine.resolveCasting(
        {
          casterId: caster.id,
          casterName: caster.name,
          casterPow: caster.pow,
          casterMp: caster.mp,
          casterHp: caster.hp,
          casterSan: caster.san,
          belief: caster.magic?.belief ?? 'believer',
          spellId: effectiveSpell.id,
          isFirstCastOverride: isFirstCast,
          isPush,
          allowHpConversion,
          target:
            spellEvent.targetName
              ? { name: spellEvent.targetName, pow: targetPow }
              : undefined,
        },
        effectiveSpell
      );

      setResolution(res);
      setIsResolved(true);

      if (!res.success && res.isFirstCast && !isPush) {
        setCanPush(true);
      } else {
        setCanPush(false);
      }

      // Aktualizacja postaci
      if (onCharacterUpdate) {
        const newMp = Math.max(0, caster.mp + res.statChanges.mpDelta);
        const newHp = Math.max(0, caster.hp + res.statChanges.hpDelta);
        const newSan = Math.max(0, caster.san + res.statChanges.sanDelta);
        const newPow = Math.max(0, caster.pow + res.statChanges.powDelta);

        const currentKnownSpells = caster.magic?.knownSpells ?? {};
        const updatedKnownEntry = {
          spellId: effectiveSpell.id,
          learnedAt: knownEntry?.learnedAt ?? new Date().toISOString(),
          source: knownEntry?.source ?? ('preset' as const),
          isFirstCastDone: knownEntry?.isFirstCastDone || res.characterUpdates.isFirstCastDone,
          pushedRollUsed: isPush ? true : knownEntry?.pushedRollUsed,
          deeperUnlocked: knownEntry?.deeperUnlocked || Boolean(res.deeperUnlockedNow),
          knownAlias: diegeticTitle,
          definitionVersion: effectiveSpell.definitionVersion,
        };

        const updatedMagic: NonNullable<typeof caster.magic> = {
          schemaVersion: caster.magic?.schemaVersion ?? 1,
          belief: caster.magic?.belief ?? 'believer',
          deferredSanLoss: caster.magic?.deferredSanLoss ?? 0,
          knownSpells: {
            ...currentKnownSpells,
            [effectiveSpell.id]: updatedKnownEntry,
          },
          tomeStudies: caster.magic?.tomeStudies ?? {},
        };

        onCharacterUpdate({
          ...caster,
          mp: newMp,
          hp: newHp,
          san: newSan,
          pow: newPow,
          magic: updatedMagic,
        });
      }

      // Wysłanie raportu rzutu do czatu (Fiction First z czyszczeniem tagu przed graczem)
      if (onSendChat) {
        const resultTag = `[WYNIK_CZARU: id=${spellEvent.id} | spell=${effectiveSpell.id} | nazwa=${canonicalName} | rzucajacy=${caster.name} | sukces=${res.success} | mp=${res.costPaid.mp} | hp=${res.costPaid.hpFromMp} | san=${res.costPaid.san} | pow=${res.costPaid.powPermanent}${res.firstCastRoll ? ` | rzut=${res.firstCastRoll.roll}/${res.firstCastRoll.threshold}` : ''}${res.opposedRoll ? ` | starcie=${res.opposedRoll.casterRoll}vs${res.opposedRoll.targetRoll} | zwyciezca=${res.opposedRoll.winner}` : ''}${res.firstCastRoll?.pushedFailedCatastrophe ? ' | KATASTROFA' : ''}]`;
        const narrativeMessage = locale === 'en' ? res.message.en : res.message.pl;
        onSendChat(`${resultTag}\n\n${narrativeMessage}`);
      }
    } finally {
      setIsCasting(false);
    }
  };

  return (
    <Card className="my-3 overflow-hidden border border-purple-900/60 bg-card/95 text-foreground shadow-deco backdrop-blur-sm">
      {/* Nagłówek klimatyczny Dark Art Déco */}
      <div className="border-b border-purple-900/40 bg-gradient-to-r from-purple-950/30 via-background/50 to-purple-950/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-sm bg-purple-950/60 border border-purple-500/40">
              <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif text-sm font-semibold tracking-wide text-foreground">
                {diegeticTitle}
              </span>
              <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-300 font-mono">
                {canonicalName}
              </Badge>
              {effectiveSpell.source && (
                <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground hidden sm:inline-flex">
                  <BookOpen className="w-3 h-3 mr-1 inline" />
                  {effectiveSpell.source.title}, s. {effectiveSpell.source.page}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLoreGuide(!showLoreGuide)}
              className="flex items-center gap-1 text-[11px] font-mono text-purple-300 hover:text-purple-100 transition-colors p-1 rounded hover:bg-purple-900/30"
              title={showLoreGuide ? t('hideLoreGuide') : t('showLoreGuide')}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('toggleLoreGuide')}</span>
              {showLoreGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {isResolved ? (
              <Badge className="border-emerald-500/40 bg-emerald-500/20 font-mono text-xs text-emerald-300">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t('btnCompleted')}
              </Badge>
            ) : (
              <Badge className="border-purple-500/40 bg-purple-500/20 font-mono text-xs text-purple-300">
                ⏳ {effectiveSpell.castingTime.value[locale]}
              </Badge>
            )}
          </div>
        </div>

        {/* Lorowy opis zaklęcia w fikcji gry */}
        <p className="mt-2 text-xs font-serif text-muted-foreground leading-relaxed">
          {effectiveSpell.description[locale]}
        </p>

        {/* Zwijany mini-przewodnik zasad magii CoC 7e RAW */}
        {showLoreGuide && (
          <div className="mt-3 p-3 rounded border border-purple-500/30 bg-purple-950/30 space-y-1.5 text-xs text-purple-200">
            <p className="font-display font-semibold text-purple-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {t('spellLoreTitle')}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t('spellLorePhilosophy')}
            </p>
            <ul className="space-y-1 text-[11px] list-disc list-inside text-purple-200/90 pt-0.5">
              <li>{t('spellLoreFirstCast')}</li>
              <li>{t('spellLoreSubsequent')}</li>
              <li>{t('spellLorePush')}</li>
              <li>{t('spellLoreOpposed')}</li>
            </ul>
          </div>
        )}
      </div>

      <CardContent className="space-y-4 p-4">
        {/* Stan 1: Przed rzuceniem – Bilans zasobów i stawki */}
        {!isResolved && (
          <div className="space-y-3">
            {/* Siatka zasobów (Pre-flight cost preview) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              {/* PM */}
              <div className={`p-2.5 rounded border ${hasEnoughMp ? 'border-purple-500/30 bg-purple-950/20' : 'border-amber-500/40 bg-amber-950/30'} space-y-1`}>
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>{t('preflightMp')}</span>
                  <span>🔮 -{mpCostNumeric}</span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className={hasEnoughMp ? 'text-purple-300' : 'text-amber-400'}>
                    {casterMp} PM
                  </span>
                  <span className="text-muted-foreground">➔</span>
                  <span className={hasEnoughMp ? 'text-emerald-400' : 'text-destructive'}>
                    {Math.max(0, casterMp - mpCostNumeric)} PM
                  </span>
                </div>
              </div>

              {/* SAN */}
              <div className="p-2.5 rounded border border-border/50 bg-card/60 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>{t('preflightSan')}</span>
                  <span className="text-destructive">🧠 -{effectiveSpell.sanCost}</span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-foreground">{casterSan} SAN</span>
                  <span className="text-muted-foreground">➔</span>
                  <span className="text-amber-300">
                    {effectiveSpell.sanCost === '1k4' ? `${casterSan - 4}..${casterSan - 1}` : `${casterSan - 6}..${casterSan - 1}`}
                  </span>
                </div>
              </div>

              {/* MOC trwale / HP */}
              {effectiveSpell.powCost ? (
                <div className="p-2.5 rounded border border-amber-500/40 bg-amber-950/20 space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>{t('preflightPow')}</span>
                    <span className="text-amber-400 font-bold">⚡ -{effectiveSpell.powCost}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-foreground">{casterPow}</span>
                    <span className="text-muted-foreground">➔</span>
                    <span className="text-destructive">{casterPow - effectiveSpell.powCost} POW</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded border border-border/50 bg-card/60 space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span>{t('preflightHp')}</span>
                    <span>❤️ 0</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-foreground">{casterHp} HP</span>
                    <span className="text-muted-foreground">➔</span>
                    <span className="text-emerald-400">{casterHp} HP</span>
                  </div>
                </div>
              )}
            </div>

            {/* Krwawa ofiara (gdy brakuje PM) */}
            {!hasEnoughMp && !isSkeptic && (
              <div className="p-3 rounded border border-destructive/50 bg-destructive/15 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-destructive font-semibold">
                  <HeartPulse className="w-4 h-4 animate-pulse flex-shrink-0" />
                  <span>{t('bloodSacrificeBanner', { cost: missingMp })}</span>
                </div>
                <p className="text-[11px] text-destructive-foreground leading-relaxed">
                  {t('bloodSacrificeWarning', {
                    cost: missingMp,
                    beforeHp: casterHp,
                    afterHp: Math.max(0, casterHp - missingMp),
                  })}
                </p>
                <label className="flex items-center gap-2 cursor-pointer pt-1 font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={allowHpConversion}
                    onChange={(e) => setAllowHpConversion(e.target.checked)}
                    className="rounded border-destructive text-destructive focus:ring-destructive"
                  />
                  <span className="text-[11px]">{t('bloodSacrificeConsent')}</span>
                </label>
              </div>
            )}

            {/* Blokada Sceptyka */}
            {isSkeptic && (
              <div className="p-3 rounded border border-destructive/50 bg-destructive/10 text-destructive text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{t('skepticBlocked')}</span>
                </div>
              </div>
            )}

            {/* Baner stawek i trudności rzutu */}
            <div className="p-3 rounded border border-purple-900/40 bg-card/60 text-xs space-y-1.5">
              {isFirstCast ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {t('firstCastStakes', { threshold: hardPow })}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Zwykły ≤ {casterPow} | Trudny ≤ {hardPow} | Ekstr. ≤ {extremePow}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-serif">
                    {t('spellLoreFirstCast')}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('knownCastStakes')}</span>
                </div>
              )}

              {/* Starcie woli z celem */}
              {effectiveSpell.opposedRoll === 'pow' && spellEvent.targetName && (
                <div className="pt-2 border-t border-border/40 space-y-1">
                  <div className="flex items-center justify-between font-mono text-cyan-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5" />
                      {t('opposedStakes', {
                        casterPow,
                        target: spellEvent.targetName,
                        targetPow,
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-serif leading-relaxed">
                    {t('opposedStakesDescription')}
                  </p>
                </div>
              )}
            </div>

            {/* Przycisk rzucenia zaklęcia */}
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => handleCast(false)}
                disabled={isSkeptic || (!hasEnoughMp && !allowHpConversion) || isCasting}
                className="bg-purple-700 hover:bg-purple-600 text-white font-serif text-xs gap-2 shadow-deco px-5 py-2.5"
              >
                <Sparkles className="w-4 h-4" />
                {t('btnCast')}
              </Button>
            </div>
          </div>
        )}

        {/* Stan 2: Po rzuceniu – Tabela kości, rzuty K100 i werdykt */}
        {isResolved && resolution && (
          <div className="space-y-3 rounded-lg border border-purple-900/40 bg-background/60 p-4 text-xs font-mono">
            {/* Werdykt główny */}
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40">
              <div className="flex items-center gap-2 font-display text-sm font-semibold">
                {resolution.success ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>
                      {resolution.isFirstCast
                        ? t('firstCastSuccessSummary')
                        : resolution.opposedRoll
                        ? t('opposedVictoryCaster')
                        : t('automaticSuccessSummary')}
                    </span>
                  </div>
                ) : resolution.firstCastRoll?.pushedFailedCatastrophe ? (
                  <div className="flex items-center gap-1.5 text-destructive font-black">
                    <Skull className="h-5 w-5 animate-pulse" />
                    <span>{t('pushedCatastropheSummary')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-destructive font-semibold">
                    <XCircle className="h-5 w-5" />
                    <span>
                      {resolution.opposedRoll && resolution.opposedRoll.winner === 'target'
                        ? t('opposedVictoryTarget')
                        : t('firstCastFailureSummary')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabela kości K100 (Dice Breakdown) */}
            <div className="space-y-2.5">
              {/* Rzut na pierwsze rzucenie (Hard POW) */}
              {resolution.firstCastRoll && (
                <div className="p-3 rounded border border-purple-900/40 bg-card/60 space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="font-serif">{t('rollHardPow', { threshold: resolution.firstCastRoll.threshold })}</span>
                    <span>POW: {casterPow}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Dices className="h-4 w-4 text-purple-400" />
                    <span className="text-base font-bold text-foreground">
                      K100: {resolution.firstCastRoll.roll} / {resolution.firstCastRoll.threshold}
                    </span>
                    {getOutcomeBadge(resolution.firstCastRoll.outcome)}
                  </div>
                </div>
              )}

              {/* Rzut sporny (Opposed POW) */}
              {resolution.opposedRoll && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded border border-cyan-900/40 bg-card/60">
                  {/* Badacz */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span className="font-serif">{resolution.opposedRoll.casterName || caster?.name}</span>
                      <span>MOC {resolution.opposedRoll.casterPow ?? casterPow}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dices className="h-4 w-4 text-cyan-400" />
                      <span className="text-sm font-bold text-foreground">
                        K100: {resolution.opposedRoll.casterRoll}
                      </span>
                      {getOutcomeBadge(resolution.opposedRoll.casterOutcome)}
                    </div>
                  </div>

                  {/* Cel */}
                  <div className="space-y-1 border-t border-border/40 pt-2 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-3">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span className="font-serif">{resolution.opposedRoll.targetName || spellEvent.targetName}</span>
                      <span>MOC {resolution.opposedRoll.targetPow ?? targetPow}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dices className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-bold text-foreground">
                        K100: {resolution.opposedRoll.targetRoll}
                      </span>
                      {getOutcomeBadge(resolution.opposedRoll.targetOutcome)}
                    </div>
                  </div>

                  {/* Werdykt starcia woli */}
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-border/30 text-[11px] font-serif">
                    {resolution.opposedRoll.winner === 'caster' ? (
                      <p className="text-emerald-400 font-medium">
                        ✓ {t('opposedVictoryCaster')}
                        {resolution.opposedRoll.casterPowImprovementEligible && (
                          <span className="block text-cyan-300 font-mono text-[10px] pt-0.5">
                            ★ {t('casterPowImprovementNotice')}
                          </span>
                        )}
                      </p>
                    ) : resolution.opposedRoll.winner === 'target' ? (
                      <p className="text-destructive font-medium">
                        ✕ {t('opposedVictoryTarget')}
                      </p>
                    ) : (
                      <p className="text-muted-foreground font-medium">
                        {resolution.opposedRoll.casterPow && resolution.opposedRoll.targetPow && resolution.opposedRoll.casterPow > resolution.opposedRoll.targetPow
                          ? t('opposedTieCaster')
                          : t('opposedTieTarget')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Kolejne rzucenie bez testu kości */}
              {!resolution.firstCastRoll && !resolution.opposedRoll && (
                <div className="p-2.5 rounded border border-border/40 bg-card/40 text-muted-foreground text-xs font-serif">
                  {t('automaticSuccessSummary')}
                </div>
              )}
            </div>

            {/* Podsumowanie zużytych zasobów */}
            <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground font-serif">{t('costsDeducted')}</span>
              <div className="flex flex-wrap gap-2 font-mono">
                <Badge variant="outline" className="text-purple-300 border-purple-500/40">
                  -{resolution.costPaid.mp} PM
                </Badge>
                <Badge variant="outline" className="text-destructive border-destructive/40">
                  -{resolution.costPaid.san} SAN
                </Badge>
                {resolution.costPaid.hpFromMp > 0 && (
                  <Badge variant="outline" className="text-destructive font-bold border-destructive">
                    🩸 -{resolution.costPaid.hpFromMp} HP
                  </Badge>
                )}
                {resolution.costPaid.powPermanent > 0 && (
                  <Badge variant="outline" className="text-amber-400 font-bold border-amber-500/50">
                    ⚡ -{resolution.costPaid.powPermanent} POW
                  </Badge>
                )}
              </div>
            </div>

            {/* Opcja forsowania przy porażce */}
            {canPush && (
              <div className="pt-2 flex items-center justify-between gap-3 bg-destructive/10 p-3 rounded border border-destructive/30">
                <div className="space-y-0.5 font-serif">
                  <p className="text-destructive font-semibold text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t('pushedWarning')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleCast(true)}
                  disabled={isCasting}
                  className="text-xs font-serif shadow-deco shrink-0"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 animate-bounce" />
                  {t('btnPush')}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SpellCard;
