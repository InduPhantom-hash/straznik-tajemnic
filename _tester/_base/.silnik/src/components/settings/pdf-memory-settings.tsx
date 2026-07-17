import type { SetStateAction, Dispatch } from 'react';
import { AISettings } from '@/lib/ai-settings';
import { HelpIcon } from '../ui/tooltip';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface PDFMemorySettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
}

export function PDFMemorySettings({ settings, setSettings }: PDFMemorySettingsProps) {
  return (
    <Card className="bg-muted border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          📚 Zarządzanie Pamięcią PDF
          <HelpIcon content="Pozwól AI odwoływać się do treści podręczników i przygód zapisanych w PDF." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-foreground flex items-center">
              Włącz pamięć PDF
              <HelpIcon content="AI będzie mogło odwoływać się do zasad gry i treści przygód zapisanych w plikach PDF." />
            </Label>
            <p className="text-sm text-muted-foreground">
              AI będzie mogło odwoływać się do zasad gry i treści przygód
            </p>
          </div>
          <Switch 
            checked={settings.pdfMemory?.enabled || false}
            onCheckedChange={(checked) => setSettings({
              ...settings,
              pdfMemory: {
                enabled: checked,
                ...settings.pdfMemory
              }
            })}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center">
              URL podręcznika zasad
              <HelpIcon content="Link do pliku PDF z zasadami gry Call of Cthulhu 7e. AI będzie mogło cytować i stosować te zasady." />
            </Label>
            <Input
              type="url"
              value={settings.pdfMemory?.rulesUrl || ''}
              onChange={(e) => setSettings({
                ...settings,
                pdfMemory: {
                  enabled: settings.pdfMemory?.enabled || false,
                  ...settings.pdfMemory,
                  rulesUrl: e.target.value
                }
              })}
              placeholder="https://example.com/rules.pdf"
              className="bg-input border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground flex items-center">
              URL przygody
              <HelpIcon content="Link do pliku PDF z scenariuszem przygody. AI będzie znało fabułę i szczegóły scenariusza." />
            </Label>
            <Input
              type="url"
              value={settings.pdfMemory?.adventureUrl || ''}
              onChange={(e) => setSettings({
                ...settings,
                pdfMemory: {
                  enabled: settings.pdfMemory?.enabled || false,
                  ...settings.pdfMemory,
                  adventureUrl: e.target.value
                }
              })}
              placeholder="https://example.com/adventure.pdf"
              className="bg-input border-border text-foreground"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
