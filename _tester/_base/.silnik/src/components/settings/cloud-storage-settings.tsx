import type { SetStateAction, Dispatch } from 'react';
import { AISettings } from '@/lib/ai-settings';
import { HelpIcon } from '../ui/tooltip';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface CloudStorageSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
  testResults: any;
  isLoading: boolean;
  testAPI: (apiType: string) => Promise<void>;
  getTestResultIcon: (result: boolean | null) => string;
}

export function CloudStorageSettings({
  settings,
  setSettings,
  testResults,
  isLoading,
  testAPI,
  getTestResultIcon
}: CloudStorageSettingsProps) {
  return (
    <Card className="bg-muted border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-orange-300 flex items-center gap-2">
          ☁️ Google Cloud Storage
          <span className="text-sm font-normal text-muted-foreground">
            {getTestResultIcon(testResults.cloudSessions)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground/70 mb-2">
            Włącz Cloud Storage
            <HelpIcon content="Przechowywanie sesji i plików w chmurze Google. Umożliwia synchronizację między urządzeniami." />
          </label>
          <input
            type="checkbox"
            checked={settings.googleCloudStorageEnabled}
            onChange={(e) => setSettings({ ...settings, googleCloudStorageEnabled: e.target.checked })}
            className="w-4 h-4 text-orange-600 bg-input border-border rounded focus:ring-orange-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center">
              Nazwa bucket
              <HelpIcon content="Nazwa zasobnika Google Cloud Storage gdzie będą przechowywane pliki sesji." />
            </Label>
            <Input
              value={settings.googleCloudStorageBucket}
              onChange={(e) => setSettings({ ...settings, googleCloudStorageBucket: e.target.value })}
              placeholder="zew-app-storage"
              className="bg-input border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center">
              Automatyczne czyszczenie (dni)
              <HelpIcon content="Po ilu dniach automatycznie usuwać stare sesje z chmury. 30 dni to zalecana wartość." />
            </Label>
            <Input
              type="number"
              value={settings.googleCloudStorageSettings.retentionDays}
              onChange={(e) => setSettings({
                ...settings,
                googleCloudStorageSettings: {
                  ...settings.googleCloudStorageSettings,
                  retentionDays: parseInt(e.target.value) || 30
                }
              })}
              min="1"
              max="365"
              className="bg-input border-border text-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <input
                type="checkbox"
                checked={settings.googleCloudStorageSettings.enableCaching}
                onChange={(e) => setSettings({
                  ...settings,
                  googleCloudStorageSettings: {
                    ...settings.googleCloudStorageSettings,
                    enableCaching: e.target.checked
                  }
                })}
                className="w-4 h-4 text-orange-600 bg-input border-border rounded focus:ring-orange-500"
              />
              <span className="ml-2">Włącz cache'owanie</span>
              <HelpIcon content="Tymczasowo przechowuj często używane pliki lokalnie dla szybszego dostępu." />
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <input
                type="checkbox"
                checked={settings.googleCloudStorageSettings.enableCompression}
                onChange={(e) => setSettings({
                  ...settings,
                  googleCloudStorageSettings: {
                    ...settings.googleCloudStorageSettings,
                    enableCompression: e.target.checked
                  }
                })}
                className="w-4 h-4 text-orange-600 bg-input border-border rounded focus:ring-orange-500"
              />
              <span className="ml-2">Włącz kompresję</span>
              <HelpIcon content="Kompresuj pliki przed zapisem aby oszczędzić miejsce i transfer danych." />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => testAPI('cloudSessions')}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700 text-foreground"
          >
            Test Cloud Storage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
