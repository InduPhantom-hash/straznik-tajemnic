import { FC, useState } from 'react';
import { Zap, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { QuickSetupModal } from '@/components/ui/quick-setup-modal';
import { useTranslations } from 'next-intl';

interface StartModeCardsProps {
  onQuickStart: (
    adventureId: string,
    characterId: string,
    mode: 'solo' | 'hot-seat',
    player2CharacterId?: string
  ) => void;
  onManualStart: () => void;
  isStarting?: boolean;
  startProgress?: number;
  startStatus?: string;
}

export const StartModeCards: FC<StartModeCardsProps> = ({
  onQuickStart,
  onManualStart,
  isStarting = false,
  startProgress = 0,
  startStatus = '',
}) => {
  const t = useTranslations('WelcomeStart');
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);

  return (
    <>
      <button
        data-testid="btn-quick-setup"
        disabled={isStarting}
        onClick={() => {
          if (!isStarting) setQuickSetupOpen(true);
        }}
        className={`deco-corners relative flex-1 flex flex-col items-center justify-center p-8 border border-brass/50 bg-gradient-to-br from-[#1a1610]/95 to-[#100d09]/95 shadow-[0_0_30px_rgba(201,162,39,0.08)] backdrop-blur-sm z-20 ${
          isStarting
            ? 'opacity-70 cursor-wait'
            : 'hover:brightness-125 hover:border-primary/60 hover:shadow-[0_0_40px_rgba(20,184,166,0.18)] cursor-pointer'
        } transition-all group text-left w-full min-h-[220px]`}
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
        onClick={() => {
          if (!isStarting) onManualStart();
        }}
        data-testid="btn-manual-setup"
        disabled={isStarting}
        className={`deco-corners relative flex-1 flex flex-col items-center justify-center p-8 border border-brass/50 bg-gradient-to-br from-[#1a1610]/95 to-[#100d09]/95 shadow-[0_0_30px_rgba(201,162,39,0.08)] backdrop-blur-sm z-20 ${
          isStarting
            ? 'opacity-70 cursor-wait'
            : 'hover:brightness-125 hover:border-brass hover:shadow-[0_0_40px_rgba(201,162,39,0.18)] cursor-pointer'
        } transition-all group text-left w-full min-h-[220px]`}
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

      {isStarting && !quickSetupOpen && (
        <div
          data-testid="start-cards-progress-container"
          className="w-full max-w-xl flex flex-col items-center gap-2 mt-4 z-20 animate-in fade-in-50 duration-300 md:col-span-2"
        >
          <div className="w-full h-2.5 bg-black/70 rounded-full border border-brass/40 overflow-hidden relative shadow-[inset_0_1px_4px_rgba(0,0,0,0.8)]">
            <div
              data-testid="start-cards-progress-bar"
              className="h-full bg-gradient-to-r from-brass via-primary to-emerald-400 rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${Math.min(100, Math.max(5, startProgress))}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="w-full flex items-center justify-between text-xs font-special-elite text-brass/90 tracking-[0.08em] px-1">
            <span className="flex items-center gap-2 truncate">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="truncate">{startStatus || t('quickDescription')}</span>
            </span>
            <span className="font-mono text-brass/80 ml-2 shrink-0">{startProgress}%</span>
          </div>
        </div>
      )}

      {quickSetupOpen && (
        <QuickSetupModal
          open={quickSetupOpen}
          onOpenChange={(open) => {
            if (isStarting && !open) return;
            setQuickSetupOpen(open);
          }}
          onQuickStart={onQuickStart}
          isStarting={isStarting}
          startProgress={startProgress}
          startStatus={startStatus}
        />
      )}
    </>
  );
};
