import type { FC } from 'react';
import { Zap, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export const StartModeCards: FC = () => {
  const { toast } = useToast();

  const handleNotImplemented = () => {
    toast({
      title: 'W budowie...',
      description: 'Ten tryb nie jest jeszcze w pełni zaimplementowany.',
      variant: 'default',
    });
  };

  return (
    <>
      <button
        onClick={handleNotImplemented}
        className="deco-corners relative flex-1 flex flex-col items-center justify-center p-6 border border-brass/50 bg-gradient-to-br from-[#1a1610] to-[#100d09] shadow-[0_0_22px_rgba(13,148,136,0.08)] z-20 hover:brightness-125 transition-all group text-left w-full cursor-pointer min-h-[140px]"
      >
        <div className="flex items-center gap-4 w-full mb-2">
          <Zap className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
          <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-[0.06em]">
            Szybka Przygoda
          </h2>
        </div>
        <p className="font-special-elite text-sm text-muted-foreground tracking-[0.06em] w-full mt-2">
          Wskocz prosto w akcję z predefiniowaną postacią.
        </p>
      </button>

      <button
        onClick={handleNotImplemented}
        className="deco-corners relative flex-1 flex flex-col items-center justify-center p-6 border border-brass/50 bg-gradient-to-br from-[#1a1610] to-[#100d09] shadow-[0_0_22px_rgba(13,148,136,0.08)] z-20 hover:brightness-125 transition-all group text-left w-full cursor-pointer min-h-[140px]"
      >
        <div className="flex items-center gap-4 w-full mb-2">
          <Settings className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
          <h2 className="font-display font-bold text-xl text-foreground uppercase tracking-[0.06em]">
            Ustawienia Ręczne
          </h2>
        </div>
        <p className="font-special-elite text-sm text-muted-foreground tracking-[0.06em] w-full mt-2">
          Wybierz własną przygodę i dobierz skład drużyny.
        </p>
      </button>
    </>
  );
};
