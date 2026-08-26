import type { SetStateAction, Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { AISettings } from '@/lib/ai-settings';
import { HelpIcon } from '../ui/tooltip';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Trash2, Plus } from 'lucide-react';

interface CustomCommandsSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
}

export function CustomCommandsSettings({ settings, setSettings }: CustomCommandsSettingsProps) {
  const t = useTranslations('CustomCommandsSettings');
  return (
    <Card className="bg-muted border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          ⌨️ {t('sectionTitle')}
          <HelpIcon content={t('sectionHelp')} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          <p>{t('introText')}</p>
          <p className="mt-2">{t('defaultsPrefix')} <code className="bg-background px-1 rounded">[karta]</code>, <code className="bg-background px-1 rounded">[ekwipunek]</code> {t('defaultsSuffix')}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-foreground font-medium">{t('availableCommands')}</Label>
            <Button
              size="sm"
              onClick={() => {
                const newCommand = { command: '', description: '', handler: undefined };
                setSettings({
                  ...settings,
                  customCommands: [...(settings.customCommands || []), newCommand]
                });
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('addCommand')}
            </Button>
          </div>

          {/* Lista komend */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Domyślne komendy (tylko do wyświetlenia) */}
            <div className="bg-background/50 p-3 rounded-lg border border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">[karta]</code>
                    <span className="text-xs text-muted-foreground">{t('defaultBadge')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('sheetCommandDescription')}</p>
                </div>
              </div>
            </div>

            <div className="bg-background/50 p-3 rounded-lg border border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">[ekwipunek]</code>
                    <span className="text-xs text-muted-foreground">{t('defaultBadge')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('inventoryCommandDescription')}</p>
                </div>
              </div>
            </div>

            {/* Niestandardowe komendy */}
            {(settings.customCommands || []).filter(cmd => cmd.command !== 'karta' && cmd.command !== 'ekwipunek').map((cmd, index) => {
              const originalIndex = settings.customCommands?.findIndex(c => c === cmd) || index;
              return (
                <div key={originalIndex} className="bg-background/50 p-3 rounded-lg border border-border">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={cmd.command}
                          onChange={(e) => {
                            const updated = [...(settings.customCommands || [])];
                            updated[originalIndex] = { ...cmd, command: e.target.value.toLowerCase().trim() };
                            setSettings({ ...settings, customCommands: updated });
                          }}
                          placeholder={t('commandNamePlaceholder')}
                          className="bg-input border-border text-foreground font-mono text-sm"
                        />
                        <code className="bg-muted px-2 py-1 rounded text-sm">[{cmd.command || t('commandNameFallback')}]</code>
                      </div>
                      <Input
                        value={cmd.description}
                        onChange={(e) => {
                          const updated = [...(settings.customCommands || [])];
                          updated[originalIndex] = { ...cmd, description: e.target.value };
                          setSettings({ ...settings, customCommands: updated });
                        }}
                        placeholder={t('commandDescriptionPlaceholder')}
                        className="bg-input border-border text-foreground text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const updated = (settings.customCommands || []).filter((_, i) => i !== originalIndex);
                        setSettings({ ...settings, customCommands: updated });
                      }}
                      className="ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
