'use client';

/**
 * @file spell-card.tsx
 * Karta rzucania czarów i rytuałów w oknie czatu narracji (CoC 7e RAW & Poradniki MG).
 * Estetyka: Dark Art Déco.
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
} from 'lucide-react';
import {
  getSpellDefinition,
  findSpellByAnyName,
  magicEngine,
  type SpellDefinition,
  type CastingResolution,
} from '@/lib/magic';
import type { Character, SpellCastEventData } from '@/lib/types';

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
  const hardPow = caster ? Math.floor(caster.pow / 2) : 25;

  const mpCostNumeric =
    typeof effectiveSpell.mpCost === 'number'
      ? effectiveSpell.mpCost
      : parseInt(String(effectiveSpell.mpCost), 10) || 5;

  const casterMp = caster?.mp ?? 0;
  const hasEnoughMp = casterMp >= mpCostNumeric;
  const missingMp = Math.max(0, mpCostNumeric - casterMp);

  // Tytuł diegetyczny i kanoniczny
  const diegeticTitle =
    spellEvent.alias ||
    effectiveSpell.diegeticNames[locale][0] ||
    (locale === 'en' ? effectiveSpell.nameEn : effectiveSpell.namePl);
  const canonicalName = locale === 'en' ? effectiveSpell.nameEn : effectiveSpell.namePl;

  const handleCast = (isPush = false) => {
    if (!caster || isResolved || isCasting) return;
    if (isSkeptic) return;
    if (!hasEnoughMp && !allowHpConversion) return;

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
          isPush,
          allowHpConversion,
          target:
            spellEvent.targetName && spellEvent.targetPow
              ? { name: spellEvent.targetName, pow: spellEvent.targetPow }
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

      // Wysłanie raportu rzutu do czatu (Fiction First)
      if (onSendChat) {
        const resultTag = `[WYNIK_CZARU: id=${spellEvent.id} | spell=${effectiveSpell.id} | nazwa=${canonicalName} | rzucajacy=${caster.name} | sukces=${res.success} | mp=${res.costPaid.mp} | hp=${res.costPaid.hpFromMp} | san=${res.costPaid.san} | pow=${res.costPaid.powPermanent}${res.firstCastRoll ? ` | rzut=${res.firstCastRoll.roll}/${res.firstCastRoll.threshold}` : ''}${res.firstCastRoll?.pushedFailedCatastrophe ? ' | KATASTROFA' : ''}]`;
        const narrativeMessage = locale === 'en' ? res.message.en : res.message.pl;
        onSendChat(`${resultTag}\n\n${narrativeMessage}`);
      }
    } finally {
      setIsCasting(false);
    }
  };

  return (
    <Card className="my-2 border border-purple-900/50 bg-card/85 shadow-deco backdrop-blur-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-sm bg-card border border-purple-500/40 mt-0.5">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-serif text-sm font-semibold tracking-wide text-foreground">
                  {diegeticTitle}
                </span>
                <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-300 font-mono">
                  {canonicalName}
                </Badge>
                {effectiveSpell.source && (
                  <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
                    <BookOpen className="w-3 h-3 mr-1 inline" />
                    {effectiveSpell.source.title}, s. {effectiveSpell.source.page}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {effectiveSpell.description[locale]}
              </p>

              {/* Koszty i Czas */}
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
                <span className="text-purple-300">
                  🔮 {t('costMp', { mp: effectiveSpell.mpCost })}
                </span>
                <span className="text-destructive">
                  🧠 {t('costSan', { san: effectiveSpell.sanCost })}
                </span>
                {effectiveSpell.powCost && (
                  <span className="text-amber-400 font-bold">
                    ⚡ {t('costPow', { pow: effectiveSpell.powCost })}
                  </span>
                )}
                <span className="text-muted-foreground">
                  ⏳ {effectiveSpell.castingTime.value[locale]}
                </span>
              </div>

              {/* Informacja o pierwszym rzuceniu / opanowanym zaklęciu */}
              <div className="pt-1">
                {isFirstCast ? (
                  <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 inline" />
                    {t('firstCastNotice', { target: hardPow })}
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline" />
                    {t('knownCastNotice')}
                  </p>
                )}
              </div>

              {/* Rzut sporny */}
              {effectiveSpell.opposedRoll === 'pow' && spellEvent.targetName && (
                <p className="text-[11px] text-cyan-400 font-mono">
                  ⚔️ {t('opposedRollNotice', { target: spellEvent.targetName, pow: spellEvent.targetPow ?? 50 })}
                </p>
              )}

              {/* Blokada Sceptyka */}
              {isSkeptic && (
                <div className="p-2 rounded bg-destructive/10 border border-destructive/40 text-destructive text-xs">
                  {t('skepticBlocked')}
                </div>
              )}

              {/* Konwersja PM -> HP */}
              {!hasEnoughMp && !isSkeptic && (
                <div className="p-2 rounded bg-amber-950/20 border border-amber-800/40 text-xs space-y-1">
                  <p className="text-amber-300 font-medium">
                    ⚠️ {t('insufficientMp', { current: casterMp, required: mpCostNumeric })}
                  </p>
                  <label className="flex items-center gap-2 text-foreground cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={allowHpConversion}
                      onChange={(e) => setAllowHpConversion(e.target.checked)}
                      className="rounded border-amber-500 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-[11px]">{t('hpConversionLabel', { cost: missingMp })}</span>
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    {t('hpConversionWarning')}
                  </p>
                </div>
              )}

              {/* Komunikat po rozstrzygnięciu w sesji */}
              {resolution && (
                <div className="p-2 rounded bg-card/60 border border-border text-xs font-mono space-y-1 mt-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    {resolution.success ? (
                      <span className="text-emerald-400">✓ {t('rollSuccess')}</span>
                    ) : resolution.firstCastRoll?.pushedFailedCatastrophe ? (
                      <span className="text-destructive font-black">☠ {t('rollCatastrophe')}</span>
                    ) : (
                      <span className="text-destructive">✕ {t('rollFailure')}</span>
                    )}
                    {resolution.firstCastRoll && (
                      <span className="text-muted-foreground font-normal">
                        ({resolution.firstCastRoll.roll} / {resolution.firstCastRoll.threshold})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-sans">
                    {locale === 'en' ? resolution.message.en : resolution.message.pl}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Kolumna akcji */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {isResolved ? (
              <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {t('btnCompleted')}
              </Badge>
            ) : canPush ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleCast(true)}
                disabled={isCasting}
                className="text-xs shadow-deco"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 animate-bounce" />
                {t('btnPush')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCast(false)}
                disabled={isSkeptic || (!hasEnoughMp && !allowHpConversion) || isCasting}
                className="text-xs border-purple-500/50 hover:bg-purple-950/40 shadow-deco text-purple-200"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {t('btnCast')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
