'use client';

/**
 * @file tome-card.tsx
 * Karta badania i lektury tomisk Mitów w oknie czatu narracji (CoC 7e RAW & Poradniki MG).
 * Estetyka: Dark Art Déco.
 */

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Search,
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  ShieldAlert,
} from 'lucide-react';
import {
  getTomeDefinition,
  findTomeByAnyName,
  tomeEngine,
  type TomeDefinition,
  type InitialReadingResolution,
  type FullStudyResolution,
  type ReferenceCheckResolution,
  type BeliefConversionResolution,
} from '@/lib/magic';
import type { Character, TomeStudyEventData, SkillData } from '@/lib/types';
import { getSkillValue } from '@/lib/types';

export interface TomeCardProps {
  tomeEvent: TomeStudyEventData;
  activeCharacter?: Character | null;
  characters?: Character[];
  completed?: boolean;
  onCharacterUpdate?: (char: Character) => void;
  onSendChat?: (message: string) => void;
}

export function TomeCard({
  tomeEvent,
  activeCharacter,
  characters = [],
  completed = false,
  onCharacterUpdate,
  onSendChat,
}: TomeCardProps) {
  const t = useTranslations('Magic');
  const locale = useLocale() === 'en' ? 'en' : 'pl';

  const [isResolved, setIsResolved] = useState<boolean>(completed);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [initialRes, setInitialRes] = useState<InitialReadingResolution | null>(null);
  const [fullStudyRes, setFullStudyRes] = useState<FullStudyResolution | null>(null);
  const [refRes, setRefRes] = useState<ReferenceCheckResolution | null>(null);
  const [conversionRes, setConversionRes] = useState<BeliefConversionResolution | null>(null);

  // Znajdź czytelnika/badacza
  const normalizeName = (val: string) => val.trim().toLowerCase().replace(/\s+/g, ' ');
  const characterPool = activeCharacter
    ? [activeCharacter, ...characters.filter((c) => c.id !== activeCharacter.id)]
    : characters;

  const reader = tomeEvent.characterId
    ? characterPool.find((c) => c.id === tomeEvent.characterId)
    : tomeEvent.characterName
    ? characterPool.find((c) => normalizeName(c.name) === normalizeName(tomeEvent.characterName || ''))
    : activeCharacter;

  // Znajdź definicję tomu w katalogu
  const tome: TomeDefinition | undefined =
    getTomeDefinition(tomeEvent.tomeId) || findTomeByAnyName(tomeEvent.tomeId);

  // Awaryjna definicja jeśli tom nie figuruje w podręcznikowym katalogu
  const effectiveTome: TomeDefinition = tome || {
    id: tomeEvent.tomeId,
    title: tomeEvent.title || tomeEvent.tomeId,
    titlePl: tomeEvent.title || tomeEvent.tomeId,
    titleEn: tomeEvent.title || tomeEvent.tomeId,
    author: 'Nieznany okultysta',
    language: 'Angielski',
    languageDifficulty: 'regular',
    initialReading: {
      hours: 12,
      sanCost: '1k4',
      cmi: 2,
    },
    fullStudy: {
      weeks: 24,
      sanCost: '1k6',
      cmf: 5,
      mr: 20,
    },
    spells: [],
    source: {
      sourceId: 'custom',
      title: 'Nieopisany manuskrypt',
      edition: '7e',
      page: 1,
      language: 'pl',
    },
    definitionVersion: 1,
  };

  // Stan badania tomu u badacza
  const tomeStudy = reader?.magic?.tomeStudies?.[effectiveTome.id];
  const isSkeptic = reader?.magic?.belief === 'skeptic';
  const deferredSan = reader?.magic?.deferredSanLoss ?? 0;
  const initialDone = Boolean(tomeStudy?.initialReadingDone);
  const studyCount = tomeStudy?.studyCount ?? 0;
  const fullStudyDone = Boolean(tomeStudy?.fullStudyDone);

  // Pobierz umiejętność językową badacza
  const findLanguageSkill = (lang: string): number => {
    if (!reader?.skills) return 50;
    const l = lang.toLowerCase();
    for (const [sName, sVal] of Object.entries(reader.skills)) {
      const nameL = sName.toLowerCase();
      if (nameL.includes(l) || (l.includes('łacin') && nameL.includes('latin')) || (l.includes('latin') && nameL.includes('łacin'))) {
        return getSkillValue(sVal);
      }
      if (l.includes('angielski') && (nameL.includes('ojczysty') || nameL.includes('own') || nameL.includes('angielski'))) {
        return getSkillValue(sVal);
      }
    }
    // Domyślny fallback: własny język 50% lub obcy 10%
    return l.includes('angielski') || l.includes('polski') ? 60 : 10;
  };

  const languageSkill = findLanguageSkill(effectiveTome.language);

  // Bieżące Mity Cthulhu
  const getMythosSkill = (): number => {
    if (!reader?.skills) return 0;
    for (const [sName, sVal] of Object.entries(reader.skills)) {
      if (/mit|mythos|cthulhu/i.test(sName)) {
        return getSkillValue(sVal);
      }
    }
    return 0;
  };
  const currentMythos = getMythosSkill();

  // 1. Wstępny przegląd (Initial Reading / Skimming)
  const handleInitialReading = () => {
    if (!reader || isResolved || isBusy) return;
    setIsBusy(true);

    try {
      const res = tomeEngine.resolveInitialReading(
        {
          tomeId: effectiveTome.id,
          investigatorLanguageSkill: languageSkill,
          languageDifficulty: effectiveTome.languageDifficulty,
          belief: reader.magic?.belief ?? 'believer',
        },
        effectiveTome
      );

      setInitialRes(res);
      setIsResolved(true);

      if (onCharacterUpdate) {
        const newSan = Math.max(0, (reader.san || 0) - res.sanLoss);
        const updatedSkills = { ...reader.skills };

        // Dodaj CMI do Mitów Cthulhu
        if (res.cmiGained > 0) {
          const mythosKey = Object.keys(updatedSkills).find((k) => /mit|mythos|cthulhu/i.test(k)) || 'Mity Cthulhu';
          const currentVal = getSkillValue(updatedSkills[mythosKey] ?? 0);
          const currentObj: SkillData =
            typeof updatedSkills[mythosKey] === 'object' && updatedSkills[mythosKey] !== null
              ? (updatedSkills[mythosKey] as SkillData)
              : { value: currentVal, markedForImprovement: false };

          updatedSkills[mythosKey] = {
            ...currentObj,
            value: currentVal + res.cmiGained,
          };
        }

        const currentTomes = reader.magic?.tomeStudies ?? {};
        const currentKnownSpells = reader.magic?.knownSpells ?? {};

        // Jeśli sukces: dodaj odkryte zaklęcia ze statusem do nauki
        const updatedSpells = { ...currentKnownSpells };
        if (res.success && res.spellsDiscovered.length > 0) {
          for (const spId of res.spellsDiscovered) {
            if (!updatedSpells[spId]) {
              updatedSpells[spId] = {
                spellId: spId,
                learnedAt: new Date().toISOString(),
                source: 'tome',
                sourceId: effectiveTome.id,
                isFirstCastDone: false,
                deeperUnlocked: false,
                definitionVersion: 1,
              };
            }
          }
        }

        const updatedMagic: NonNullable<typeof reader.magic> = {
          schemaVersion: reader.magic?.schemaVersion ?? 1,
          belief: reader.magic?.belief ?? 'believer',
          deferredSanLoss: (reader.magic?.deferredSanLoss ?? 0) + res.deferredSanLoss,
          knownSpells: updatedSpells,
          tomeStudies: {
            ...currentTomes,
            [effectiveTome.id]: {
              tomeId: effectiveTome.id,
              initialReadingDone: res.success ? true : Boolean(tomeStudy?.initialReadingDone),
              fullStudyDone: Boolean(tomeStudy?.fullStudyDone),
              studyCount: tomeStudy?.studyCount ?? 0,
              completedWeeks: tomeStudy?.completedWeeks ?? 0,
              cmiAwarded: (tomeStudy?.cmiAwarded ?? 0) + res.cmiGained,
              cmfAwarded: tomeStudy?.cmfAwarded ?? 0,
              sanLossPaid: (tomeStudy?.sanLossPaid ?? 0) + res.sanLoss,
              definitionVersion: effectiveTome.definitionVersion,
            },
          },
        };

        onCharacterUpdate({
          ...reader,
          san: newSan,
          skills: updatedSkills,
          magic: updatedMagic,
        });
      }

      if (onSendChat) {
        const resultTag = `[WYNIK_TOMU: id=${tomeEvent.id} | tome=${effectiveTome.id} | akcja=skimming | badacz=${reader.name} | sukces=${res.success} | godziny=${res.hoursSpent} | san=${res.sanLoss} | deferred_san=${res.deferredSanLoss} | cmi=${res.cmiGained}]`;
        const narrativeMessage = locale === 'en' ? res.message.en : res.message.pl;
        onSendChat(`${resultTag}\n\n${narrativeMessage}`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  // 2. Sprawdzenie referencyjne (Reference Check: 1k4 h, rzut d100 vs MR)
  const handleReferenceCheck = () => {
    if (!reader || isResolved || isBusy) return;
    setIsBusy(true);

    try {
      const res = tomeEngine.resolveReferenceCheck(
        {
          tomeId: effectiveTome.id,
          topic: tomeEvent.topic,
        },
        effectiveTome
      );

      setRefRes(res);
      setIsResolved(true);

      if (onSendChat) {
        const resultTag = `[WYNIK_TOMU: id=${tomeEvent.id} | tome=${effectiveTome.id} | akcja=reference | badacz=${reader.name} | sukces=${res.success} | godziny=${res.hoursSpent} | rzut=${res.roll} | mr=${res.mythosRating}]`;
        const narrativeMessage = locale === 'en' ? res.message.en : res.message.pl;
        onSendChat(`${resultTag}\n\n${narrativeMessage}`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  // 3. Pełne studium (Full Study)
  const handleFullStudy = () => {
    if (!reader || isResolved || isBusy) return;
    setIsBusy(true);

    try {
      const res = tomeEngine.resolveFullStudy(
        {
          tomeId: effectiveTome.id,
          investigatorSan: reader.san ?? 50,
          investigatorMythos: currentMythos,
          studyCount,
          belief: reader.magic?.belief ?? 'believer',
        },
        effectiveTome
      );

      setFullStudyRes(res);
      setIsResolved(true);

      if (onCharacterUpdate) {
        const newSan = Math.max(0, (reader.san || 0) - res.sanLoss);
        const updatedSkills = { ...reader.skills };

        if (res.cmfGained > 0) {
          const mythosKey = Object.keys(updatedSkills).find((k) => /mit|mythos|cthulhu/i.test(k)) || 'Mity Cthulhu';
          const currentVal = getSkillValue(updatedSkills[mythosKey] ?? 0);
          const currentObj: SkillData =
            typeof updatedSkills[mythosKey] === 'object' && updatedSkills[mythosKey] !== null
              ? (updatedSkills[mythosKey] as SkillData)
              : { value: currentVal, markedForImprovement: false };

          updatedSkills[mythosKey] = {
            ...currentObj,
            value: currentVal + res.cmfGained,
          };
        }

        const currentTomes = reader.magic?.tomeStudies ?? {};
        const updatedMagic: NonNullable<typeof reader.magic> = {
          schemaVersion: reader.magic?.schemaVersion ?? 1,
          belief: reader.magic?.belief ?? 'believer',
          deferredSanLoss: (reader.magic?.deferredSanLoss ?? 0) + res.deferredSanLoss,
          knownSpells: reader.magic?.knownSpells ?? {},
          tomeStudies: {
            ...currentTomes,
            [effectiveTome.id]: {
              tomeId: effectiveTome.id,
              initialReadingDone: Boolean(tomeStudy?.initialReadingDone),
              fullStudyDone: true,
              studyCount: studyCount + 1,
              completedWeeks: (tomeStudy?.completedWeeks ?? 0) + res.weeksRequired,
              cmiAwarded: tomeStudy?.cmiAwarded ?? 0,
              cmfAwarded: (tomeStudy?.cmfAwarded ?? 0) + res.cmfGained,
              sanLossPaid: (tomeStudy?.sanLossPaid ?? 0) + res.sanLoss,
              definitionVersion: effectiveTome.definitionVersion,
            },
          },
        };

        onCharacterUpdate({
          ...reader,
          san: newSan,
          skills: updatedSkills,
          magic: updatedMagic,
        });
      }

      if (onSendChat) {
        const resultTag = `[WYNIK_TOMU: id=${tomeEvent.id} | tome=${effectiveTome.id} | akcja=study | badacz=${reader.name} | sukces=${res.sanRoll.success} | tygodnie=${res.weeksRequired} | san=${res.sanLoss} | cmf=${res.cmfGained}]`;
        const narrativeMessage = locale === 'en' ? res.message.en : res.message.pl;
        onSendChat(`${resultTag}\n\n${narrativeMessage}`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  // 4. Przełamanie sceptycyzmu (Reguła Wiary - konwersja sceptyka w wierzącego)
  const handleConvertBelief = () => {
    if (!reader || isBusy) return;
    setIsBusy(true);

    try {
      const conv = tomeEngine.convertBeliefToBeliever(
        reader.name,
        deferredSan,
        currentMythos
      );

      setConversionRes(conv);

      if (onCharacterUpdate) {
        const newSan = Math.max(0, (reader.san || 0) - conv.sanLossApplied);
        const updatedMagic: NonNullable<typeof reader.magic> = {
          schemaVersion: reader.magic?.schemaVersion ?? 1,
          belief: 'believer',
          beliefConversionDate: new Date().toISOString(),
          beliefConversionReason: 'Zderzenie z prawdą Mitów i przełamanie sceptycyzmu',
          deferredSanLoss: 0,
          knownSpells: reader.magic?.knownSpells ?? {},
          tomeStudies: reader.magic?.tomeStudies ?? {},
        };

        onCharacterUpdate({
          ...reader,
          san: newSan,
          magic: updatedMagic,
        });
      }

      if (onSendChat) {
        const resultTag = `[WYNIK_TOMU: id=${tomeEvent.id} | akcja=belief_conversion | badacz=${reader.name} | san=${conv.sanLossApplied} | int_check=${conv.intCheckRequired}]`;
        const narrativeMessage = locale === 'en' ? conv.message.en : conv.message.pl;
        onSendChat(`${resultTag}\n\n${narrativeMessage}`);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const tomeTitle = locale === 'en' ? effectiveTome.titleEn : effectiveTome.titlePl;

  return (
    <Card className="my-2 border border-amber-900/50 bg-card/85 shadow-deco backdrop-blur-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-sm bg-card border border-amber-600/40 mt-0.5">
              <BookOpen className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-serif text-sm font-semibold tracking-wide text-foreground">
                  {tomeTitle}
                </span>
                <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 font-mono">
                  {effectiveTome.language} ({effectiveTome.languageDifficulty})
                </Badge>
                {effectiveTome.source && (
                  <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
                    <Bookmark className="w-3 h-3 mr-1 inline" />
                    {effectiveTome.source.title}, s. {effectiveTome.source.page}
                  </Badge>
                )}
              </div>

              {effectiveTome.author && (
                <p className="text-xs text-muted-foreground italic">
                  {t('authorLabel')} {effectiveTome.author}
                </p>
              )}

              {/* Informacje o parametrach RAW */}
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
                <span className="text-amber-300">
                  ⏳ {t('initialReadingLabel')} {effectiveTome.initialReading.hours}h (+{effectiveTome.initialReading.cmi} CMI)
                </span>
                <span className="text-amber-400">
                  📖 {t('fullStudyLabel')} {effectiveTome.fullStudy.weeks} tyg. (+{effectiveTome.fullStudy.cmf} CMF, MR: {effectiveTome.fullStudy.mr})
                </span>
                <span className="text-destructive">
                  🧠 {t('costSan', { san: effectiveTome.initialReading.sanCost })}
                </span>
                {effectiveTome.spells.length > 0 && (
                  <span className="text-purple-300">
                    ✨ {t('spellsContainedLabel', { count: effectiveTome.spells.length })}
                  </span>
                )}
              </div>

              {/* Ostrzeżenie / status Wiary */}
              {isSkeptic && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400/90 pt-1 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{t('skepticTomeNotice')}</span>
                </div>
              )}

              {deferredSan > 0 && (
                <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{t('deferredSanDebtNotice', { san: deferredSan })}</span>
                  </div>
                  {isSkeptic && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleConvertBelief}
                      disabled={isBusy}
                      className="text-[11px] h-6 border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      {t('btnConvertBelief')}
                    </Button>
                  )}
                </div>
              )}

              {/* Statusy ukończenia */}
              {initialDone && (
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('initialReadingDoneNotice', { cmi: tomeStudy?.cmiAwarded ?? effectiveTome.initialReading.cmi })}</span>
                </div>
              )}
              {fullStudyDone && (
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('fullStudyDoneNotice', { cmf: tomeStudy?.cmfAwarded ?? effectiveTome.fullStudy.cmf })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wyniki akcji (jeśli właśnie rozstrzygnięte) */}
        {initialRes && (
          <div className="mt-2.5 p-2 rounded bg-card/60 border border-border/40 text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              {initialRes.success ? (
                <Badge className="bg-emerald-800 text-emerald-100">{t('rollSuccess')}</Badge>
              ) : (
                <Badge variant="destructive">{t('rollFailure')}</Badge>
              )}
              <span className="font-mono text-muted-foreground">
                Rzut na język: {initialRes.languageRoll.roll}/{initialRes.languageRoll.threshold}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {locale === 'en' ? initialRes.message.en : initialRes.message.pl}
            </p>
          </div>
        )}

        {refRes && (
          <div className="mt-2.5 p-2 rounded bg-card/60 border border-border/40 text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              {refRes.success ? (
                <Badge className="bg-emerald-800 text-emerald-100">{t('rollSuccess')}</Badge>
              ) : (
                <Badge variant="destructive">{t('rollFailure')}</Badge>
              )}
              <span className="font-mono text-muted-foreground">
                Rzut vs MR: {refRes.roll}/{refRes.mythosRating} ({refRes.hoursSpent}h)
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {locale === 'en' ? refRes.message.en : refRes.message.pl}
            </p>
          </div>
        )}

        {fullStudyRes && (
          <div className="mt-2.5 p-2 rounded bg-card/60 border border-border/40 text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              <Badge className="bg-amber-800 text-amber-100">
                {fullStudyRes.sanRoll.success ? t('rollSuccess') : t('rollFailure')}
              </Badge>
              <span className="font-mono text-muted-foreground">
                Rzut obronny SAN: {fullStudyRes.sanRoll.roll}/{fullStudyRes.sanRoll.sanTarget}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {locale === 'en' ? fullStudyRes.message.en : fullStudyRes.message.pl}
            </p>
          </div>
        )}

        {conversionRes && (
          <div className="mt-2.5 p-2 rounded bg-destructive/10 border border-destructive/40 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-destructive font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>{t('beliefConvertedNotice', { san: conversionRes.sanLossApplied })}</span>
            </div>
            {conversionRes.intCheckRequired && (
              <p className="text-destructive font-mono text-[11px]">
                {t('intCheckRequiredNotice')}
              </p>
            )}
          </div>
        )}

        {/* Panel przycisków interakcji */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!isResolved ? (
            <>
              {/* Wstępny przegląd */}
              {!initialDone && (
                <Button
                  size="sm"
                  onClick={handleInitialReading}
                  disabled={isBusy}
                  className="bg-amber-700 hover:bg-amber-600 text-white font-serif text-xs gap-1.5 shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {t('btnInitialReading', { hours: effectiveTome.initialReading.hours })}
                </Button>
              )}

              {/* Sprawdzenie referencyjne w śledztwie */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleReferenceCheck}
                disabled={isBusy}
                className="border-amber-600/50 text-amber-300 hover:bg-amber-600/10 font-serif text-xs gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                {t('btnReferenceCheck')}
              </Button>

              {/* Pełne studium */}
              <Button
                size="sm"
                variant="secondary"
                onClick={handleFullStudy}
                disabled={isBusy}
                className="bg-card hover:bg-muted text-foreground font-serif text-xs gap-1.5 border border-border"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                {t('btnFullStudy', { weeks: effectiveTome.fullStudy.weeks * Math.pow(2, studyCount) })}
              </Button>
            </>
          ) : (
            <Badge variant="outline" className="border-emerald-600/50 text-emerald-400 font-mono text-xs py-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
              {t('btnTomeResolved')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
