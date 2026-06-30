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
    <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
      <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
        🔢 Licznik Tokenów
        <HelpIcon content="Tokeny to jednostki tekstu używane przez AI. Im więcej tokenów, tym wyższy koszt. 1 token ≈ 4 znaki." />
      </h4>
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-200">
            {((settings.costControl.sessionTokens || 0) / 1000).toFixed(1)}k
          </div>
          <div className="text-xs text-blue-300/70">Sesja</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-200">
            {((settings.costControl.todayTokens || 0) / 1000).toFixed(1)}k
          </div>
          <div className="text-xs text-blue-300/70">Dzisiaj</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-blue-200">
            {((settings.costControl.totalTokens || 0) / 1000).toFixed(1)}k
          </div>
          <div className="text-xs text-blue-300/70">Ogółem</div>
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
          className="text-blue-300 border-blue-500 hover:bg-blue-900/50"
        >
          🔄 Wyzeruj tokeny
        </Button>
      </div>
    </div>
  );
}
