import { FC, useState } from 'react';
import { Zap, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { QuickSetupModal } from '@/components/ui/quick-setup-modal';
import { useTranslations } from 'next-intl';

interface StartModeCardsProps {
  onQuickStart: (adventureId: string, characterId: string, mode: 'solo' | 'hot-seat') => void;
  onManualStart: () => void;
}

export const StartModeCards: FC<StartModeCardsProps> = ({ onQuickStart, onManualStart }) => {
  const t = useTranslations('WelcomeStart');
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);

  return (
    <>
      <button
        data-testid="btn-quick-setup" onClick={() => setQuickSetupOpen(true)}
        className="deco-corners relative flex-1 flex flex-col items-center justify-center p-8 border border-brass/50 bg-gradient-to-br from-[#1a1610]/95 to-[#100d09]/95 shadow-[0_0_30px_rgba(201,162,39,0.08)] backdrop-blur-sm z-20 hover:brightness-125 hover:border-primary/60 hover:shadow-[0_0_40px_rgba(20,184,166,0.18)] transition-all group text-left w-full cursor-pointer min-h-[220px]"
      >
        <div className="flex items-center gap-6 w-full mb-3">
          <Zap className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
          <h2 className="font-display font-bold text-3xl text-foreground uppercase tracking-[0.08em]">
            {t('quickTitle')}
          </h2>
        </div>
        <p className="font-special-elite text-lg text-muted-foreground tracking-[0.06em] w-full mt-3">
          {t('quickDescription')}
        </p>
      </button>

      <button
        onClick={onManualStart} data-testid="btn-manual-setup"
        className="deco-corners relative flex-1 flex flex-col items-center justify-center p-8 border border-brass/50 bg-gradient-to-br from-[#1a1610]/95 to-[#100d09]/95 shadow-[0_0_30px_rgba(201,162,39,0.08)] backdrop-blur-sm z-20 hover:brightness-125 hover:border-brass hover:shadow-[0_0_40px_rgba(201,162,39,0.18)] transition-all group text-left w-full cursor-pointer min-h-[220px]"
      >
        <div className="flex items-center gap-6 w-full mb-3">
          <Settings className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
          <h2 className="font-display font-bold text-3xl text-foreground uppercase tracking-[0.08em]">
            {t('manualTitle')}
          </h2>
        </div>
        <p className="font-special-elite text-lg text-muted-foreground tracking-[0.06em] w-full mt-3">
          {t('manualDescription')}
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
