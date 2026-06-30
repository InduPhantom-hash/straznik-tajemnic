'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSettingsSubscription } from '@/hooks/use-settings-subscription';
import type { UserUsage } from '@/lib/user-usage';

interface APIUsageCounterProps {
  className?: string;
}

/**
 * IND-272: jedno źródło prawdy licznika kosztów.
 *
 * Wcześniej licznik czytał CLIENT-SIDE `cost-event-emitter` (`cost_tracking_stats`
 * w localStorage), karmiony głównie przez `recordImageCost` - czyli prawie tylko
 * obrazy, bez spójnego czatu/TTS. Gracz widział niepełne dane → "nie wie co mierzy".
 *
 * Teraz licznik czyta server-side `/api/user/usage` (`UserUsage`) - dokładny,
 * pełny breakdown gemini + obrazy + TTS + budżet $10, karmiony z punktów generacji
 * (`recordUserUsage` w chat/imagen/tts). To jedyne źródło prawdy o kosztach.
 */
export function APIUsageCounter({ className = '' }: APIUsageCounterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // === REACTIVE SETTINGS: status aktywnych API + bramka costControl.enabled ===
  const settings = useSettingsSubscription();
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
      // licznik orientacyjny - cichy fallback, brak danych nie blokuje UI
    }
  }, []);

  // Pobierz dane przy starcie i odświeżaj gdy panel jest rozwinięty (usage rośnie
  // server-side fire-and-forget, więc poll daje aktualny obraz bez WebSocket).
  useEffect(() => {
    fetchUsage();
    if (!isExpanded) return;
    const interval = setInterval(fetchUsage, 10000);
    return () => clearInterval(interval);
  }, [fetchUsage, isExpanded]);

  const getBudgetColor = (usageCost: number, budget: number) => {
    const percentage = (usageCost / budget) * 100;
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 75) return 'text-yellow-400';
    if (percentage >= 50) return 'text-orange-400';
    return 'text-green-400';
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  // Don't render until settings are loaded
  if (!settings?.costControl?.enabled) {
    return null;
  }

  const totalCost = usage?.total.cost ?? 0;
  const remainingBudget = Math.max(0, budgetUsd - totalCost);
  const budgetUsedPercent = Math.min(100, (totalCost / budgetUsd) * 100);

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${className}`}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`bg-card/95 backdrop-blur-sm border border-brass/35 rounded-lg transition-all duration-300 cursor-pointer ${
          isExpanded
            ? 'w-48 h-auto'
            : 'w-8 h-8 flex items-center justify-center text-sm'
        }`}
        title={isExpanded ? 'Zwiń licznik' : 'Rozwiń licznik'}
      >
        {isExpanded ? (
          <div className="p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display uppercase tracking-[0.1em] text-brass">
                💰 Koszty (konto)
              </span>
              <span className="text-[14px] text-muted-foreground">
                {new Date().toLocaleDateString('pl-PL')}
              </span>
            </div>

            {/* === SERVER-SIDE BREAKDOWN (źródło prawdy) === */}
            <div className="p-3 bg-[#1a1610] border border-brass/30 rounded-lg space-y-2">
              <div className="text-xs font-display uppercase tracking-[0.08em] text-brass mb-2">
                📊 Zużycie API
              </div>

              {/* Gemini Tokens */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Gemini:
                </span>
                <span className="text-xs font-mono text-blue-300">
                  {formatTokens(usage?.gemini.tokens ?? 0)} tok (
                  {usage?.gemini.calls ?? 0})
                </span>
              </div>

              {/* TTS Characters */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  TTS:
                </span>
                <span className="text-xs font-mono text-green-300">
                  {formatTokens(usage?.tts.chars ?? 0)} zn. (
                  {usage?.tts.calls ?? 0})
                </span>
              </div>

              {/* Images */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                  Obrazy:
                </span>
                <span className="text-xs font-mono text-pink-300">
                  {usage?.image.count ?? 0} ({usage?.image.calls ?? 0})
                </span>
              </div>

              {/* Total Cost */}
              <div className="pt-2 border-t border-brass/30 flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">
                  Koszt razem:
                </span>
                <span className="text-sm font-bold text-brass">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>

            {/* === BUDGET $10 (z user-usage) === */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-foreground">Budżet:</span>
                <span
                  className={`text-xs font-medium ${getBudgetColor(totalCost, budgetUsd)}`}
                >
                  {formatCurrency(totalCost)} / {formatCurrency(budgetUsd)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#1f1a14] border border-brass/20 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    budgetUsedPercent >= 90
                      ? 'bg-red-500'
                      : budgetUsedPercent >= 75
                        ? 'bg-yellow-500'
                        : budgetUsedPercent >= 50
                          ? 'bg-orange-500'
                          : 'bg-green-500'
                  }`}
                  style={{ width: `${budgetUsedPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pozostało:</span>
                <span className={getBudgetColor(remainingBudget, budgetUsd)}>
                  {formatCurrency(remainingBudget)}
                </span>
              </div>
            </div>

            {/* === API STATUS === */}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-center text-xs">
                <span className="text-foreground">Aktywne API:</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${settings.geminiEnabled ? 'bg-blue-400' : 'bg-gray-500'}`}
                    title="Gemini"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${settings.voiceSettings?.provider === 'google' ? 'bg-green-400' : 'bg-gray-500'}`}
                    title="Google TTS"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${settings.imageGenerationEnabled ? 'bg-pink-400' : 'bg-gray-500'}`}
                    title="Image generation (Vertex Imagen 4 / Replicate Flux Schnell / Gemini Flash)"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${settings.voiceSettings?.provider === 'gemini' ? 'bg-purple-400' : 'bg-gray-500'}`}
                    title="Gemini TTS (Pro narrator / Flash NPC)"
                  />
                </div>
              </div>
            </div>

            {/* === WARNINGS === */}
            {budgetUsedPercent >= 90 && (
              <div className="p-2 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-300">
                ⚠️ Budżet prawie wyczerpany!
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm">💰</span>
        )}
      </div>
    </div>
  );
}
