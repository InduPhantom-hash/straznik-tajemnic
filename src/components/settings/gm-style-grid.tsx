import type { SetStateAction, Dispatch } from 'react';
import { AISettings } from '@/lib/ai-settings';
import { HelpIcon } from '../ui/tooltip';

interface GMStyleGridProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
}

type ResponseLength =
  AISettings['gameMasterNarration']['style']['responseLength'];
type DetailLevel = AISettings['gameMasterNarration']['style']['detailLevel'];
type Creativity = AISettings['gameMasterNarration']['behavior']['creativity'];

export function GMStyleGrid({ settings, setSettings }: GMStyleGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="flex items-center gap-2 text-[14px] font-special-elite uppercase tracking-[0.16em] text-brass mb-2">
          Długość odpowiedzi
          <HelpIcon content="Krótka: 1-2 zdania • Średnia: 3-5 zdań • Długa: Pełne akapity z detalami" />
        </label>
        <select
          value={settings.gameMasterNarration.style.responseLength}
          onChange={(e) =>
            setSettings({
              ...settings,
              gameMasterNarration: {
                ...settings.gameMasterNarration,
                style: {
                  ...settings.gameMasterNarration.style,
                  responseLength: e.target.value as ResponseLength,
                },
              },
            })
          }
          className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 text-foreground focus:border-primary focus:outline-none"
        >
          <option value="short">Krótka</option>
          <option value="medium">Średnia</option>
          <option value="long">Długa</option>
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2 text-[14px] font-special-elite uppercase tracking-[0.16em] text-brass mb-2">
          Poziom szczegółowości
          <HelpIcon content="Minimalny: Tylko kluczowe informacje • Standardowy: Zbalansowany opis • Szczegółowy: Bogate opisy z detalami sensorycznymi" />
        </label>
        <select
          value={settings.gameMasterNarration.style.detailLevel}
          onChange={(e) =>
            setSettings({
              ...settings,
              gameMasterNarration: {
                ...settings.gameMasterNarration,
                style: {
                  ...settings.gameMasterNarration.style,
                  detailLevel: e.target.value as DetailLevel,
                },
              },
            })
          }
          className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 text-foreground focus:border-primary focus:outline-none"
        >
          <option value="minimal">Minimalny</option>
          <option value="standard">Standardowy</option>
          <option value="detailed">Szczegółowy</option>
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2 text-[14px] font-special-elite uppercase tracking-[0.16em] text-brass mb-2">
          Kreatywność
          <HelpIcon content="Konserwatywna: Trzyma się scenariusza • Zbalansowana: Dodaje własne elementy • Kreatywna: Swobodna improwizacja" />
        </label>
        <select
          value={settings.gameMasterNarration.behavior.creativity}
          onChange={(e) =>
            setSettings({
              ...settings,
              gameMasterNarration: {
                ...settings.gameMasterNarration,
                behavior: {
                  ...settings.gameMasterNarration.behavior,
                  creativity: e.target.value as Creativity,
                },
              },
            })
          }
          className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 text-foreground focus:border-primary focus:outline-none"
        >
          <option value="conservative">Konserwatywna</option>
          <option value="balanced">Zbalansowana</option>
          <option value="creative">Kreatywna</option>
        </select>
      </div>
    </div>
  );
}
