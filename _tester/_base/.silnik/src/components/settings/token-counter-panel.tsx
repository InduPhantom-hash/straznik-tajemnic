import type { SetStateAction, Dispatch } from 'react';
import { AISettings } from '@/lib/ai-settings';
import { HelpIcon } from '../ui/tooltip';
import { Button } from '../ui/button';

interface TokenCounterPanelProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
}

/**
 * Licznik tokenów (sesja / dziś / ogółem) + reset button.
 * Wyciągnięte z cost-control-settings.tsx (IND-58 micro 2/5, parent 265 → 195 lin).
 */
export function TokenCounterPanel({
  settings,
  setSettings,
}: TokenCounterPanelProps) {
  return (
    <div className="mb-6 p-4 bg-card/60 border border-brass/30">
      <h4 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-brass mb-3 flex items-center gap-2">
        🔢 Licznik Tokenów
        <HelpIcon content="Tokeny to jednostki tekstu używane przez AI. Im więcej tokenów, tym wyższy koszt. 1 token ≈ 4 znaki." />
      </h4>
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="text-center">
          <div className="font-special-elite text-xl font-bold text-foreground">
            {((settings.costControl.sessionTokens || 0) / 1000).toFixed(1)}k
          </div>
          <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">Sesja</div>
        </div>
        <div className="text-center">
          <div className="font-special-elite text-xl font-bold text-foreground">
            {((settings.costControl.todayTokens || 0) / 1000).toFixed(1)}k
          </div>
          <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">Dzisiaj</div>
        </div>
        <div className="text-center">
          <div className="font-special-elite text-xl font-bold text-foreground">
            {((settings.costControl.totalTokens || 0) / 1000).toFixed(1)}k
          </div>
          <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">Ogółem</div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (
              confirm(
                'Czy na pewno chcesz wyzerować wszystkie liczniki tokenów?'
              )
            ) {
              setSettings({
                ...settings,
                costControl: {
                  ...settings.costControl,
                  sessionTokens: 0,
                  totalTokens: 0,
                  todayTokens: 0,
                },
              });
            }
          }}
          variant="outline"
          size="sm"
          className="font-display font-semibold uppercase tracking-[0.12em] text-xs border-brass/40 text-muted-foreground hover:bg-brass/10 hover:text-foreground"
        >
          🔄 Wyzeruj tokeny
        </Button>
      </div>
    </div>
  );
}
