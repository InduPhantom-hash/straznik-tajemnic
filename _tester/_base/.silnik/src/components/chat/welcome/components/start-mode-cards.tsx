import { FC, useState } from 'react';
import { Zap, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { QuickSetupModal } from '@/components/ui/quick-setup-modal';

interface StartModeCardsProps {
  onQuickStart: (adventureId: string, characterId: string, mode: 'solo' | 'hot-seat') => void;
  onManualStart: () => void;
}

export const StartModeCards: FC<StartModeCardsProps> = ({ onQuickStart, onManualStart }) => {
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setQuickSetupOpen(true)}
        className="deco-corners relative flex-1 flex flex-col items-center justify-center p-8 border border-brass/50 bg-gradient-to-br from-[#1a1610] to-[#100d09] shadow-[0_0_22px_rgba(13,148,136,0.08)] z-20 hover:brightness-125 transition-all group text-left w-full cursor-pointer min-h-[220px]"
      >
        <div className="flex items-center gap-6 w-full mb-3">
          <Zap className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
          <h2 className="font-display font-bold text-3xl text-foreground uppercase tracking-[0.08em]">
            Szybka Przygoda
          </h2>
        </div>
        <p className="font-special-elite text-lg text-muted-foreground tracking-[0.06em] w-full mt-3">
          Wskocz prosto w akcję z predefiniowaną postacią.
        </p>
      </button>

      <button
        onClick={onManualStart}
        className="deco-corners relative flex-1 flex flex-col items-center justify-center p-8 border border-brass/50 bg-gradient-to-br from-[#1a1610] to-[#100d09] shadow-[0_0_22px_rgba(13,148,136,0.08)] z-20 hover:brightness-125 transition-all group text-left w-full cursor-pointer min-h-[220px]"
      >
        <div className="flex items-center gap-6 w-full mb-3">
          <Settings className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
          <h2 className="font-display font-bold text-3xl text-foreground uppercase tracking-[0.08em]">
            Ustawienia Ręczne
          </h2>
        </div>
        <p className="font-special-elite text-lg text-muted-foreground tracking-[0.06em] w-full mt-3">
          Wybierz własną przygodę i dobierz skład drużyny.
        </p>
      </button>

      {quickSetupOpen && (
        <QuickSetupModal
          open={quickSetupOpen}
          onOpenChange={setQuickSetupOpen}
          onQuickStart={onQuickStart}
        />
      )}
    </>
  );
};
