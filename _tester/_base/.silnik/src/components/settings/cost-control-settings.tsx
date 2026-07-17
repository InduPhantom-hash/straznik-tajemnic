'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetStateAction, Dispatch } from 'react';
import { AISettings } from '@/lib/ai-settings';
import { HelpIcon } from '../ui/tooltip';
import { Button } from '../ui/button';
import { CostBreakdownGrid } from './cost-breakdown-grid';
import type { CostStats } from '@/lib/cost-event-emitter';
import type { UserUsage } from '@/lib/user-usage';

interface CostControlSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
}

/**
 * IND-272: panel kosztów czyta server-side `/api/user/usage` (jedno źródło prawdy).
 *
 * Wcześniej panel czytał `cost-event-emitter` (`cost_tracking_stats` w localStorage)
 * przez propsy `costStats`/`usageStats` - niepełny duplikat (głównie obrazy). Teraz
 * sam pobiera `UserUsage` (dokładny breakdown gemini + obrazy + TTS + budżet $10
 * z `recordUserUsage`). Reset idzie przez DELETE `/api/user/usage`. `CostBreakdownGrid`
 * reużyty (mapowanie `UserUsage` → `CostStats`).
 */
export function CostControlSettings({
  settings,
  setSettings,
}: CostControlSettingsProps) {
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [budgetUsd, setBudgetUsd] = useState(10);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/user/usage');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.usage) {
        setUsage(data.usage as UserUsage);
        if (typeof data.budgetUsd === 'number') setBudgetUsd(data.budgetUsd);
      }
    } catch {
      // panel orientacyjny - cichy fallback, brak danych nie blokuje UI
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const handleReset = async () => {
    if (!confirm('Czy na pewno chcesz wyzerować licznik kosztów konta?'))
      return;
    try {
      await fetch('/api/user/usage', { method: 'DELETE' });
    } catch {
      // ignorujemy błąd resetu - i tak odświeżamy stan z serwera
    }
    await fetchUsage();
  };

  // Mapowanie UserUsage → CostStats dla reużytego CostBreakdownGrid (tts.chars → characters).
  const costStats: CostStats | null = usage
    ? {
        gemini: usage.gemini,
        tts: {
          cost: usage.tts.cost,
          characters: usage.tts.chars,
          calls: usage.tts.calls,
        },
        image: usage.image,
        total: usage.total,
        lastUpdate: new Date(usage.updatedAt),
      }
    : null;

  const totalCost = usage?.total.cost ?? 0;
  const budgetPercent = Math.min(100, (totalCost / budgetUsd) * 100);

  // Próg ostrzeżenia (złoto) / przekroczenia (bordo) dla paska budżetu.
  const budgetBarClass =
    budgetPercent >= 90
      ? 'from-[#7a201c] to-destructive shadow-[0_0_10px_rgba(179,50,44,0.4)]'
      : budgetPercent >= 75
        ? 'from-[#8a6f12] to-brass shadow-[0_0_10px_rgba(201,162,39,0.4)]'
        : 'from-[#0a6b62] to-primary shadow-[0_0_10px_rgba(13,148,136,0.4)]';

  return (
    <div className="relative bg-card rounded-lg p-5 border border-brass/30">
      {/* Narożniki déco */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-brass/60" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-brass/60" />

      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display uppercase tracking-[0.1em] text-xl text-foreground flex items-center gap-2">
          Kontrola Kosztów
          <HelpIcon content="Monitoruj wydatki na API. Dane z licznika konta (gemini + obrazy + TTS), nie z przeglądarki." />
        </h3>
        {usage && (
          <div className="font-special-elite text-[14px] uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Aktualizacja:{' '}
            {new Date(usage.updatedAt).toLocaleTimeString('pl-PL')}
          </div>
        )}
      </div>

      <CostBreakdownGrid costStats={costStats} />

      {/* Sekcja 2: Total i budżet + Reset */}
      <div className="relative mb-6 p-5 border border-brass/40 bg-gradient-to-br from-[#1a1610] to-[#100d09]">
        <span className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-brass" />
        <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-brass" />
        <div className="flex items-center justify-between">
          <div>
            <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Łączny koszt konta
            </div>
            <div className="font-display font-bold text-3xl text-foreground">
              ${totalCost.toFixed(4)}{' '}
              <span className="text-base text-muted-foreground">
                / ${budgetUsd.toFixed(2)}
              </span>
            </div>
            <div className="font-special-elite text-[14px] uppercase tracking-[0.1em] text-muted-foreground mt-1">
              {usage?.total.calls || 0} żądań API
            </div>
          </div>
          <Button onClick={handleReset} variant="destructive" size="sm">
            🔄 Wyzeruj
          </Button>
        </div>

        {/* Pasek budżetu déco */}
        <div className="mt-3 w-full h-3 bg-[#1f1a14] border border-brass/25 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r transition-all duration-300 ${budgetBarClass}`}
            style={{ width: `${budgetPercent}%` }}
          />
        </div>
      </div>

      {/* Ustawienia kontroli kosztów */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2">
            Włącz kontrolę kosztów
            <HelpIcon content="Monitoruje i ogranicza wydatki na API. Automatycznie wyłączy funkcje gdy przekroczysz budżet." />
          </label>
          <input
            type="checkbox"
            checked={settings.costControl.enabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                costControl: {
                  ...settings.costControl,
                  enabled: e.target.checked,
                },
              })
            }
            className="w-4 h-4 accent-primary bg-[#1f1a14] border-brass/30 rounded focus:ring-primary"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2">
            Miesięczny budżet ($)
            <HelpIcon content="Maksymalny miesięczny budżet na API w dolarach. Zalecane: $5-10 dla regularnego użycia." />
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={settings.costControl.monthlyBudget}
            onChange={(e) =>
              setSettings({
                ...settings,
                costControl: {
                  ...settings.costControl,
                  monthlyBudget: parseFloat(e.target.value) || 10.0,
                },
              })
            }
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded-md font-special-elite text-foreground focus:border-brass focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
