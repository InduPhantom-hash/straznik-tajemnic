'use client';

/**
 * @file referee-veto-card.tsx
 * Diegetyczny komponent weta sędziego (The Referee Stance, CoC 7e RAW s. 94, 218).
 * Wyświetlany w oknie czatu, gdy gracz podejmuje działania rażąco anachronistyczne,
 * obsceniczne, niemożliwe fizycznie lub próbuje prompt injection.
 * 
 * Oferuje:
 * - Komunikat o zamrożeniu czasu gry
 * - Klikalne historyczne alternatywy z epoki zasilające Quote-to-Input
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Clock, ArrowRight, Ban, HelpCircle } from 'lucide-react';
import type { RefereeVetoEventData } from '@/lib/types';

export interface RefereeVetoCardProps {
  veto: RefereeVetoEventData;
  onSelectAlternative?: (text: string) => void;
}

export function RefereeVetoCard({
  veto,
  onSelectAlternative,
}: RefereeVetoCardProps) {
  const t = useTranslations('RefereeCard');

  const getBadgeInfo = () => {
    switch (veto.type) {
      case 'anachronism':
        return {
          label: t('badge_anachronism'),
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'obscene':
        return {
          label: t('badge_obscene'),
          color: 'bg-red-500/20 text-red-300 border-red-500/40',
        };
      case 'injection':
        return {
          label: t('badge_injection'),
          color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
      case 'impossible':
        return {
          label: t('badge_impossible'),
          color: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        };
      default:
        return {
          label: t('badge'),
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
    }
  };

  const badgeInfo = getBadgeInfo();

  const handleAlternativeClick = (altText: string) => {
    if (onSelectAlternative) {
      onSelectAlternative(altText);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('straznik:quote-to-input', {
          detail: { text: altText },
        })
      );
    }
  };

  return (
    <Card className="my-3 border-amber-500/40 bg-zinc-950/90 shadow-lg relative overflow-hidden backdrop-blur-sm">
      {/* Ozdobny pasek vintage w stylu telegramu / pieczęci sędziowskiej */}
      <div className="h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700" />

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Nagłówek weta */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif text-base font-bold text-amber-200 tracking-wide">
                {t('veto_title')}
              </h4>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-xs px-2.5 py-0.5 font-sans ${badgeInfo.color}`}
          >
            {badgeInfo.label}
          </Badge>
        </div>

        {/* Uzasadnienie decyzji sędziego */}
        <div className="text-sm font-sans text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-md border border-zinc-800/80">
          <p className="font-medium text-amber-100/90">{veto.reason}</p>
        </div>

        {/* Diegetyczne zamrożenie czasu */}
        <div className="flex items-center gap-2 text-xs font-mono text-amber-300/80 bg-amber-950/20 px-3 py-2 rounded border border-amber-900/30">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{t('time_frozen')}</span>
        </div>

        {/* Sugerowane historyczne alternatywy */}
        {veto.suggestedAlternatives && veto.suggestedAlternatives.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-amber-500/10">
            <p className="text-xs font-sans text-zinc-400 font-medium">
              {t('suggested_actions')}
            </p>
            <div className="flex flex-wrap gap-2">
              {veto.suggestedAlternatives.map((alt, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAlternativeClick(alt)}
                  className="text-xs border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-amber-200 hover:text-amber-100 transition-all font-sans flex items-center gap-1.5 py-1 px-2.5 h-auto whitespace-normal text-left"
                  title={t('quote_tooltip')}
                >
                  <span>{alt}</span>
                  <ArrowRight className="w-3 h-3 shrink-0 opacity-70" />
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
