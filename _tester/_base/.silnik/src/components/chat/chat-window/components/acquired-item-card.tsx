import { Check, PackagePlus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AcquiredItemProposal } from '@/lib/types';

interface AcquiredItemCardProps {
  proposal: AcquiredItemProposal;
  onConfirm: () => void;
  onDismiss: () => void;
}

/** Jawne potwierdzenie zdobycia - narracja nie zmienia ekwipunku samoczynnie. */
export function AcquiredItemCard({
  proposal,
  onConfirm,
  onDismiss,
}: AcquiredItemCardProps) {
  const recipient = proposal.recipientName
    ? `dla: ${proposal.recipientName}`
    : 'dla aktywnej postaci';

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
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
            {recipient}
          </p>
          {proposal.visualTreatment === 'supernatural' && (
            <p className="mt-1 flex items-center gap-1 text-xs text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> Jawnie nadprzyrodzony render
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={onConfirm}>
              <PackagePlus className="mr-1.5 h-3.5 w-3.5" /> Dodaj do ekwipunku
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Nie teraz
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
