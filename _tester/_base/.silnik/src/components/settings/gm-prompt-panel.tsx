import type { SetStateAction, Dispatch } from 'react';
import { AISettings } from '@/lib/ai-settings';
import { HelpIcon } from '../ui/tooltip';
import { GMPromptStatus } from './gm-prompt-status';

interface GMPromptPanelProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
}

export function GMPromptPanel({ settings, setSettings }: GMPromptPanelProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[14px] font-special-elite uppercase tracking-[0.16em] text-brass mb-2">
        Główny prompt systemowy
        <HelpIcon content="To jest główny prompt, który określa jak AI ma prowadzić grę. Musi być ustawiony, aby czat działał. Możesz tu określić zasady gry, styl narracji, role Mistrza Gry itp." />
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-brass/40" />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-brass/40" />
        <textarea
          value={settings.gameMasterNarration.prompts.mainPrompt || ''}
          onChange={(e) =>
            setSettings({
              ...settings,
              gameMasterNarration: {
                ...settings.gameMasterNarration,
                prompts: {
                  ...settings.gameMasterNarration.prompts,
                  mainPrompt: e.target.value,
                },
              },
            })
          }
          placeholder="Wprowadź główny prompt systemowy dla Mistrza Gry. Określ tu zasady gry, styl narracji, role i zachowanie AI..."
          className="w-full px-4 py-3 bg-[#1f1a14] border border-brass/30 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none min-h-[150px] font-mono text-sm"
          rows={6}
        />
      </div>

      {/* Upload pliku .md */}
      <div className="mt-3 p-3 bg-[#16130f] border border-brass/22">
        <label className="flex items-center gap-2 text-[14px] font-special-elite uppercase tracking-[0.16em] text-brass mb-2">
          Lub wgraj plik .md z instrukcjami
          <HelpIcon content="Zamiast wpisywać prompt ręcznie, możesz wgrać plik .md. Jeśli wgrasz plik, zastąpi on tekst z pola powyżej." />
        </label>

        {settings.gameMasterNarration.prompts.gmInstructionsFileName ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground flex-1 truncate">
              📄 {settings.gameMasterNarration.prompts.gmInstructionsFileName}
            </span>
            <button
              onClick={() => {
                setSettings({
                  ...settings,
                  gameMasterNarration: {
                    ...settings.gameMasterNarration,
                    prompts: {
                      ...settings.gameMasterNarration.prompts,
                      gmInstructionsFileUrl: undefined,
                      gmInstructionsFileName: undefined,
                    },
                  },
                });
              }}
              className="px-3 py-1 text-xs font-display font-semibold uppercase tracking-[0.16em] text-destructive bg-destructive/10 border border-destructive/50 hover:bg-destructive/20"
            >
              Usuń
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept=".md,.markdown,.txt"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('type', 'gm-instructions');

                  const response = await fetch('/api/upload-gm-instructions', {
                    method: 'POST',
                    body: formData,
                  });

                  if (response.ok) {
                    const data = await response.json();

                    setSettings({
                      ...settings,
                      gameMasterNarration: {
                        ...settings.gameMasterNarration,
                        prompts: {
                          ...settings.gameMasterNarration.prompts,
                          gmInstructionsFileUrl: data.url,
                          gmInstructionsFileName: file.name,
                          mainPrompt: data.content || '',
                          gmInstructionsGeminiFileUri: data.geminiFileUri,
                        },
                      },
                    });

                    try {
                      await fetch('/api/pdf-memory', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: 'gm-instructions',
                          url: data.url,
                          geminiFileUri: data.geminiFileUri,
                          filename: file.name,
                        }),
                      });
                    } catch (memoryError) {
                      console.warn(
                        '⚠️ Failed to save to pdf-memory:',
                        memoryError
                      );
                    }
                  } else {
                    const errorData = await response.json();
                    console.error('Błąd uploadu:', errorData);
                    alert(
                      `Nie udało się wgrać pliku: ${errorData.error || 'Nieznany błąd'}`
                    );
                  }
                } catch (error) {
                  console.error('Błąd podczas uploadu:', error);
                  alert('Wystąpił błąd podczas uploadu pliku.');
                }
              }
              e.target.value = '';
            }}
            className="w-full px-3 py-2 text-sm bg-[#1f1a14] border border-brass/30 text-foreground focus:border-primary focus:outline-none cursor-pointer file:mr-3 file:px-3 file:py-1 file:border file:border-brass/45 file:bg-brass/[0.04] file:text-brass file:text-xs file:font-display file:font-semibold file:uppercase file:tracking-[0.16em] hover:file:bg-brass/10"
          />
        )}
      </div>

      <GMPromptStatus settings={settings} setSettings={setSettings} />
    </div>
  );
}
