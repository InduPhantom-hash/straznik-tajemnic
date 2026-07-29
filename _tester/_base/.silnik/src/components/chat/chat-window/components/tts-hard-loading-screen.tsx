import React from 'react';
import { Loader2 } from 'lucide-react';

interface TTSHardLoadingScreenProps {
  isBuffering: boolean;
}

export const TTSHardLoadingScreen: React.FC<TTSHardLoadingScreenProps> = ({ isBuffering }) => {
  if (!isBuffering) return null;

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Szmaragdowy glow w tle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[40vw] h-[40vw] bg-emerald-900/20 rounded-full blur-3xl animate-pulse"></div>
      </div>
      
      <div className="text-center space-y-8 relative z-10">
        <div className="relative w-16 h-16 mx-auto">
          <Loader2 className="w-16 h-16 animate-spin text-emerald-500 absolute inset-0" />
          <div className="absolute inset-0 border-4 border-emerald-900/30 rounded-full"></div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-serif text-emerald-400 tracking-widest uppercase drop-shadow-md">
            Mistrz Gry przygotowuje sesję...
          </h2>
          <p className="text-zinc-400 max-w-md mx-auto text-sm">
            Trwa generowanie mrocznej opowieści i głosu narratora. Proszę czekać.
          </p>
        </div>
      </div>
    </div>
  );
};
