import { useEffect, useState } from 'react';
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
 * Karty zdobyczy.
 * W trybie Solo (isDuet = false): automatycznie odbiera i ukrywa się na "Accepted".
 * W trybie Hot Seat (isDuet = true): wyświetla wybór postaci.
 */
export function AcquiredItemCard({
  proposal,
  onConfirm,
  onDismiss,
  isDuet = false,
  characters = [],
}: AcquiredItemCardProps) {
  const [selectedCharId, setSelectedCharId] = useState<string>('');

  // Auto-loot logic dla trybu Solo
  useEffect(() => {
    if (!isDuet && proposal.status === 'pending') {
      onConfirm();
    }
  }, [isDuet, proposal.status, onConfirm]);

  if (proposal.status === 'accepted') {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
        <Check className="h-4 w-4" />
        <span>{proposal.name} dodano do ekwipunku.</span>
      </div>
    );
  }

  if (proposal.status === 'dismissed') {
    return (
      <div className="mt-3 rounded-md border border-muted px-3 py-2 text-sm text-muted-foreground">
        {proposal.name} nie został dodany do ekwipunku.
      </div>
    );
  }

  // W trybie Solo po prostu renderujemy stan ładowania, zanim hook auto-lootu zadziała
  if (!isDuet) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-brass/40 bg-[#18130d] px-3 py-2 text-sm text-brass">
        <PackagePlus className="h-4 w-4 animate-pulse" />
        <span>Dodawanie przedmiotu do ekwipunku...</span>
      </div>
    );
  }

  // W trybie Hot Seat pokazujemy pełen UI wyboru postaci
  return (
    <section className="mt-3 rounded-md border border-brass/40 bg-[#18130d] p-3 shadow-inner">
      <div className="flex gap-2">
        <PackagePlus className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm uppercase tracking-wide text-brass">
            Zdobyty przedmiot
          </p>
          <p className="font-medium text-foreground">{proposal.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{proposal.description}</p>
          
          {proposal.visualTreatment === 'supernatural' && (
            <p className="mt-1 flex items-center gap-1 text-xs text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> Jawnie nadprzyrodzony render
            </p>
          )}

          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">
                Kto wziął ten przedmiot?
              </label>
              <Select value={selectedCharId} onValueChange={setSelectedCharId}>
                <SelectTrigger className="w-full h-8 text-sm bg-black/40 border-brass/30 text-white">
                  <SelectValue placeholder="Wybierz postać..." />
                </SelectTrigger>
                <SelectContent>
                  {characters.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name} ({char.occupation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                onClick={() => onConfirm(selectedCharId)}
                disabled={!selectedCharId}
                className="bg-brass text-black hover:bg-brass/90"
              >
                <PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Dodaj do ekwipunku
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                <X className="mr-1.5 h-3.5 w-3.5" /> Odrzuć
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
