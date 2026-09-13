'use client';

/**
 * @file opposed-magic-card.tsx
 * Karta obrony Badacza przed wrogą magią (Opposed POW Defense - CoC 7e RAW s. 99, 101, 267).
 * Wyświetlana w oknie czatu po wykryciu znacznika [OBRONA_MAGIA:...].
 * Estetyka: Dark Art Déco Fiction First.
 */

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert,
  Swords,
  Dices,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Star,
} from 'lucide-react';
import { magicEngine, type OpposedDefenseResolution } from '@/lib/magic';
import type { Character, OpposedMagicEventData } from '@/lib/types';
import type { RollOutcome } from '@/lib/dice-utils';

export interface OpposedMagicCardProps {
  opposedEvent: OpposedMagicEventData;
  activeCharacter?: Character | null;
  characters?: Character[];
  completed?: boolean;
  onCharacterUpdate?: (char: Character) => void;
  onSendChat?: (message: string) => void;
}

export function OpposedMagicCard({
  opposedEvent,
  activeCharacter,
  characters = [],
  completed = false,
  onCharacterUpdate,
  onSendChat,
}: OpposedMagicCardProps) {
  const t = useTranslations('Magic');
  const locale = useLocale() === 'en' ? 'en' : 'pl';

  const [isResolved, setIsResolved] = useState<boolean>(completed);
  const [resolution, setResolution] = useState<OpposedDefenseResolution | null>(null);
  const [isDefending, setIsDefending] = useState<boolean>(false);

  const isCardResolved = isResolved || completed;

  // Znajdź docelową postać (broniącego się Badacza)
  const normalizeName = (val: string) => val.trim().toLowerCase().replace(/\s+/g, ' ');
  const characterPool = activeCharacter
    ? [activeCharacter, ...characters.filter((c) => c.id !== activeCharacter.id)]
    : characters;

  const defender = opposedEvent.characterId
    ? characterPool.find((c) => c.id === opposedEvent.characterId)
    : opposedEvent.characterName
    ? characterPool.find((c) => normalizeName(c.name) === normalizeName(opposedEvent.characterName || ''))
    : activeCharacter;

  const defenderName = defender?.name || opposedEvent.characterName || 'Badacz';
  const defenderPow = defender?.pow ?? 50;
  const hardThreshold = Math.floor(defenderPow / 2);
  const extremeThreshold = Math.floor(defenderPow / 5);

  const attackerName = opposedEvent.attackerName || 'Wrogi Czarownik';
  const attackerPow = opposedEvent.attackerPow || 50;
  const spellName = opposedEvent.spellName || opposedEvent.spellId || 'Wroga Magia';

  const isImpossibleDefense = attackerPow >= defenderPow + 100;
  const isAutoDefense = defenderPow >= attackerPow + 100;

  const getOutcomeBadge = (outcome?: RollOutcome) => {
    switch (outcome) {
      case 'critical':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
            {t('outcomeCritical')}
          </Badge>
        );
      case 'extreme':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
            {t('outcomeExtreme')}
          </Badge>
        );
      case 'hard':
        return (
          <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
            {t('outcomeHard')}
          </Badge>
        );
      case 'regular':
        return (
          <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40">
            {t('outcomeRegular')}
          </Badge>
        );
      case 'fail':
        return (
          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">
            {t('outcomeFail')}
          </Badge>
        );
      case 'fumble':
      default:
        return (
          <Badge className="bg-destructive/30 text-destructive-foreground border-destructive/50">
            {t('outcomeFumble')}
          </Badge>
        );
    }
  };

  const handleDefend = () => {
    if (isCardResolved || isDefending) return;

    setIsDefending(true);
    try {
      const res = magicEngine.resolveOpposedDefense({
        attackerName,
        attackerPow,
        spellId: opposedEvent.spellId,
        spellName: opposedEvent.spellName,
        defenderId: defender?.id ?? 'defender',
        defenderName,
        defenderPow,
        defenderHp: defender?.hp,
        defenderSan: defender?.san,
      });

      setResolution(res);
      setIsResolved(true);

      // Aktualizacja postaci w razie modyfikatorów
      if (onCharacterUpdate && defender) {
        if (
          res.statChanges.hpDelta !== 0 ||
          res.statChanges.sanDelta !== 0 ||
          res.statChanges.mpDelta !== 0
        ) {
          onCharacterUpdate({
            ...defender,
            hp: Math.max(0, defender.hp + res.statChanges.hpDelta),
            san: Math.max(0, defender.san + res.statChanges.sanDelta),
            mp: Math.max(0, defender.mp + res.statChanges.mpDelta),
          });
        }
      }

      // Wysłanie raportu rzutu do czatu (Fiction First)
      if (onSendChat) {
        const resultTag = `[WYNIK_OBRONY_MAGII: id=${opposedEvent.id} | cel=${defenderName} | rzucajacy=${attackerName} | czar=${res.spellName ?? spellName} | sukces=${res.success} | rzut_badacza=${res.defenderRoll}/${defenderPow} | rzut_wroga=${res.attackerRoll}/${attackerPow} | zwyciezca=${res.winner}]`;
        const narrativeMessage = locale === 'en' ? res.message.en : res.message.pl;
        onSendChat(`${resultTag}\n\n${narrativeMessage}`);
      }
    } finally {
      setIsDefending(false);
    }
  };

  return (
    <Card className="my-3 overflow-hidden border border-rose-900/60 bg-card/95 text-foreground shadow-deco backdrop-blur-sm">
      {/* Nagłówek klimatyczny Dark Art Déco */}
      <div className="border-b border-rose-900/40 bg-gradient-to-r from-rose-950/30 via-background/50 to-purple-950/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-sm bg-rose-950/60 border border-rose-500/40">
              <ShieldAlert className="h-4 w-4 text-rose-400 animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif text-sm font-semibold tracking-wide text-foreground">
                {t('opposedCardTitle')}
              </span>
              <Badge variant="outline" className="text-xs border-rose-500/40 text-rose-300 font-mono">
                {spellName}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground hidden sm:inline-flex">
                <Swords className="w-3 h-3 mr-1 inline" />
                CoC 7e RAW s. 99
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCardResolved ? (
              <Badge className="border-emerald-500/40 bg-emerald-500/20 font-mono text-xs text-emerald-300">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t('btnDefendResolved')}
              </Badge>
            ) : (
              <Badge className="border-rose-500/40 bg-rose-500/20 font-mono text-xs text-rose-300">
                ⚡ {t('opposedCardSubtitle')}
              </Badge>
            )}
          </div>
        </div>

        {opposedEvent.description && (
          <p className="mt-2 text-xs font-serif text-muted-foreground leading-relaxed italic">
            „{opposedEvent.description}”
          </p>
        )}
      </div>

      {(!isCardResolved || resolution) && (
        <CardContent className="space-y-4 p-4">
          {/* Stan 1: Przed rzuceniem – Bilans stron i progi */}
          {!isCardResolved && (
            <div className="space-y-3">
              {/* Ostrzeżenia Zasady Granic Możliwości */}
              {isImpossibleDefense && (
                <div className="flex items-center gap-2 p-2.5 rounded border border-rose-500/50 bg-rose-950/30 text-rose-300 text-xs font-serif">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{t('opposedRuleOfLimitsAttacker')}</span>
                </div>
              )}
              {isAutoDefense && (
                <div className="flex items-center gap-2 p-2.5 rounded border border-emerald-500/50 bg-emerald-950/30 text-emerald-300 text-xs font-serif">
                  <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{t('opposedRuleOfLimitsDefender')}</span>
                </div>
              )}

              {/* Zestawienie przeciwników */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {/* Napastnik */}
                <div className="p-3 rounded border border-rose-500/30 bg-rose-950/20 space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px] font-serif">
                    <span>{t('opposedAttackerLabel')}</span>
                    <span className="text-rose-400 font-semibold">{attackerName}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-muted-foreground">MOC (POW):</span>
                    <span className="text-rose-300 font-mono text-sm">{attackerPow}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Zaklęcie: <strong className="text-foreground font-serif">{spellName}</strong>
                  </p>
                </div>

                {/* Obrońca */}
                <div className="p-3 rounded border border-purple-500/30 bg-purple-950/20 space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px] font-serif">
                    <span>{t('opposedDefenderLabel')}</span>
                    <span className="text-purple-300 font-semibold">{defenderName}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-muted-foreground">MOC (POW):</span>
                    <span className="text-purple-300 font-mono text-sm">{defenderPow}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                    <span>Trudny: <strong className="text-foreground">{hardThreshold}</strong></span>
                    <span>•</span>
                    <span>Ekstremalny: <strong className="text-foreground">{extremeThreshold}</strong></span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground font-serif leading-relaxed">
                {t('opposedStakesSummary')}
              </p>

              {/* Przycisk obrony */}
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleDefend}
                  disabled={isDefending}
                  className="bg-rose-700 hover:bg-rose-600 text-white font-serif text-xs gap-2 shadow-deco px-5 py-2.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {t('btnDefendMagic')}
                </Button>
              </div>
            </div>
          )}

          {/* Stan 2: Po rzuceniu – Wynik starcia woli z aktywną sesją */}
          {isCardResolved && resolution && (
          <div className="space-y-3 rounded-lg border border-rose-900/40 bg-background/60 p-4 text-xs font-mono">
            {/* Werdykt główny */}
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40">
              <div className="flex items-center gap-2 font-display text-sm font-semibold">
                {resolution.success ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{t('opposedDefenseSuccess')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-destructive font-semibold">
                    <XCircle className="h-5 w-5" />
                    <span>{t('opposedDefenseFailure')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Zestawienie rzutów K100 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              {/* Badacz */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span className="font-serif">{defenderName} (Obrońca)</span>
                  <span>MOC {defenderPow}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dices className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-bold text-foreground">
                    K100: {resolution.defenderRoll}
                  </span>
                  {getOutcomeBadge(resolution.defenderOutcome)}
                </div>
              </div>

              {/* Napastnik */}
              <div className="space-y-1 border-t border-border/40 pt-2 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-3">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span className="font-serif">{attackerName} (Napastnik)</span>
                  <span>MOC {attackerPow}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dices className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-bold text-foreground">
                    K100: {resolution.attackerRoll}
                  </span>
                  {getOutcomeBadge(resolution.attackerOutcome)}
                </div>
              </div>

              {/* Werdykt starcia woli i rozwój POW */}
              <div className="col-span-1 sm:col-span-2 pt-2 border-t border-border/30 text-[11px] font-serif">
                {resolution.success ? (
                  <div className="space-y-1">
                    <p className="text-emerald-400 font-medium">
                      ✓ {t('opposedDefenseSuccess')}
                    </p>
                    {resolution.defenderPowImprovementEligible && (
                      <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[10px] pt-0.5">
                        <Star className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                        <span>★ {t('defenderPowImprovementNotice')}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-destructive font-medium">
                    ✕ {t('opposedDefenseFailure')}
                  </p>
                )}
                {resolution.ruleOfLimitsApplied && (
                  <p className="text-amber-400 text-[10px] font-mono pt-1">
                    ⚡ {locale === 'en' ? resolution.message.en : resolution.message.pl}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        </CardContent>
      )}
    </Card>
  );
}

export default OpposedMagicCard;
