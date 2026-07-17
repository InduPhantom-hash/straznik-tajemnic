import type { SetStateAction, Dispatch } from 'react';
import { AISettings, loadDefaultPrompt } from '@/lib/ai-settings';

interface GMPromptStatusProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
}

export function GMPromptStatus({ settings, setSettings }: GMPromptStatusProps) {
  const { prompts } = settings.gameMasterNarration;

  const loadDefault = async () => {
    const defaultPrompt = await loadDefaultPrompt();
    if (defaultPrompt) {
      setSettings({
        ...settings,
        gameMasterNarration: {
          ...settings.gameMasterNarration,
          prompts: {
            ...settings.gameMasterNarration.prompts,
            mainPrompt: defaultPrompt,
            isDefaultPrompt: true,
            gmInstructionsFileName: 'Strażnik Tajemnic (domyślny)',
          },
        },
      });
    }
  };

  return (
    <div className="mt-3 p-3 bg-[#16130f] border border-brass/22">
      {prompts.isDefaultPrompt ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-special-elite text-brass flex items-center gap-2">
            ✅ Używasz domyślnego promptu &quot;Strażnik Tajemnic&quot; (1480
            linii)
          </span>
          <button
            onClick={() => {
              setSettings({
                ...settings,
                gameMasterNarration: {
                  ...settings.gameMasterNarration,
                  prompts: {
                    ...settings.gameMasterNarration.prompts,
                    mainPrompt: '',
                    isDefaultPrompt: false,
                    gmInstructionsFileName: undefined,
                  },
                },
              });
            }}
            className="px-3 py-1 text-xs font-display font-semibold uppercase tracking-[0.14em] text-muted-foreground bg-brass/[0.04] border border-brass/30 hover:border-brass/60 hover:text-brass"
          >
            Wyczyść (użyj własnego)
          </button>
        </div>
      ) : prompts.mainPrompt?.trim() ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-special-elite text-primary flex items-center gap-2">
            📝 Używasz własnego promptu ({prompts.mainPrompt.length} znaków)
          </span>
          <button
            onClick={loadDefault}
            className="px-3 py-1 text-xs font-display font-semibold uppercase tracking-[0.14em] bg-brass/[0.04] hover:bg-brass/10 text-brass border border-brass/45"
          >
            Przywróć domyślny
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm font-special-elite text-muted-foreground flex items-center gap-2">
            ⚠️ Brak promptu - czat będzie działał jak normalny Gemini
          </span>
          <button
            onClick={loadDefault}
            className="px-3 py-1 text-xs font-display font-semibold uppercase tracking-[0.14em] text-[#04110f] bg-primary border border-primary hover:brightness-110"
          >
            Załaduj domyślny prompt
          </button>
        </div>
      )}
    </div>
  );
}
