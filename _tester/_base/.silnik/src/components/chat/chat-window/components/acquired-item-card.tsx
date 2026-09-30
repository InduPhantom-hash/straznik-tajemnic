'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, PackagePlus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AcquiredItemProposal, Character } from '@/lib/types';

interface AcquiredItemCardProps {
  proposal: AcquiredItemProposal;
  onConfirm: (characterId?: string) => void;
  onDismiss: () => void;
  isDuet?: boolean;
  characters?: Character[];
}

/** 
 * Karta znaleziska ([ZDOBYTY_PRZEDMIOT]).
 * Żadna rzecz nie trafia do ekwipunku sama (Issue #565).
 * W trybie Solo: bezpośrednie przyciski [Zabierz do torby] oraz [Zostaw].
 * W trybie Hot Seat (Duet): wybór Badacza + przyciski [Zabierz do torby] oraz [Zostaw].
 */
export function AcquiredItemCard({
  proposal,
  onConfirm,
  onDismiss,
  isDuet = false,
  characters = [],
}: AcquiredItemCardProps) {
  const t = useTranslations('AcquiredItemCard');

  // Wstępny wybór Badacza w trybie Duet na podstawie @Odbiorca (jeśli podano)
  const initialCharId =
    isDuet && proposal.recipientName
      ? characters.find(
          (c) => c.name.toLowerCase().trim() === proposal.recipientName?.toLowerCase().trim()
        )?.id || ''
      : '';

  const [selectedCharId, setSelectedCharId] = useState<string>(initialCharId);

  if (proposal.status === 'accepted') {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#bfa15f]/80 font-special-elite italic">
        <Check className="h-3.5 w-3.5" />
        <span>{t('acceptedMessage', { itemName: proposal.name })}</span>
      </div>
    );
  }

  if (proposal.status === 'dismissed') {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#8a7667]/60 font-special-elite italic">
        <X className="h-3.5 w-3.5" />
        <span>{t('dismissedMessage', { itemName: proposal.name })}</span>
      </div>
    );
  }

  const isSupernatural = proposal.visualTreatment === 'supernatural';

  return (
    <section className="mt-3 relative rounded-sm border-l-2 border-[#bfa15f]/40 bg-[#120c08] pl-3 py-2 pr-2 shadow-sm">
      <div className="flex gap-3 items-start">
        {isSupernatural ? (
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#8ec5fc] animate-pulse" />
        ) : (
          <PackagePlus className="mt-0.5 h-4 w-4 shrink-0 text-[#bfa15f]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-special-elite text-[10px] uppercase tracking-widest text-[#8a7667] mb-0.5">
            {t('newEvidenceTitle')}
          </p>
          <p className="font-serif font-bold text-sm text-[#f4ebd0] leading-tight">
            {proposal.name}
          </p>
          {proposal.description && (
            <p className="font-serif text-xs text-[#a09080] mt-0.5 leading-snug line-clamp-2">
              {proposal.description}
            </p>
          )}

          <div className="mt-2.5 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            {isDuet && (
              <Select value={selectedCharId} onValueChange={setSelectedCharId}>
                <SelectTrigger className="w-full sm:w-[160px] h-7 text-xs bg-[#0d0906] border-[#3a2518] text-[#e2d4c9] font-serif rounded-sm">
                  <SelectValue placeholder={t('selectInvestigatorPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {characters.map((char) => (
                    <SelectItem key={char.id} value={char.id} className="font-serif text-xs">
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              <Button
                size="sm"
                onClick={() => onConfirm(isDuet ? selectedCharId : undefined)}
                disabled={isDuet && !selectedCharId}
                className="h-7 bg-[#3a2518] hover:bg-[#5c3e21] text-[#f4ebd0] text-xs font-serif rounded-sm border border-[#3a2518] hover:border-[#bfa15f]/40 px-2.5"
              >
                <Check className="mr-1 h-3 w-3" /> {t('addToRecordsButton')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-7 text-[#8a7667] hover:text-[#ff6b6b] hover:bg-[#1a120b] text-xs font-serif px-2.5"
              >
                <X className="mr-1 h-3 w-3" /> {t('dismissButton')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
