import React from 'react';
import { Loader2 } from 'lucide-react';

interface TTSHardLoadingScreenProps {
  isBuffering: boolean;
}

export const TTSHardLoadingScreen: React.FC<TTSHardLoadingScreenProps> = ({ isBuffering }) => {
  if (!isBuffering) return null;

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="text-center space-y-6">
        <Loader2 className="w-12 h-12 animate-spin text-[#c9a94a] mx-auto" />
        <h2 className="text-2xl font-serif text-[#c9a94a] tracking-widest uppercase">
          Mistrz Gry przygotowuje głos...
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          Trwa pobieranie pierwszego fragmentu narracji. Proszę czekać.
        </p>
      </div>
    </div>
  );
};
