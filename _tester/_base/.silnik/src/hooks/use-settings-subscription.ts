'use client';

import { useState, useEffect, useCallback } from 'react';
import { AISettings, loadAISettings } from '@/lib/ai-settings';
import { settingsEmitter } from '@/lib/settings-event-emitter';

/**
 * React hook do subskrypcji zmian ustawień AI.
 * Automatycznie aktualizuje stan gdy ustawienia się zmienią.
 * 
 * Użycie:
 * ```tsx
 * const aiSettings = useSettingsSubscription();
 * // aiSettings będzie automatycznie aktualizowane gdy użytkownik zmieni ustawienia
 * ```
 */
export function useSettingsSubscription(): AISettings {
    const [settings, setSettings] = useState<AISettings>(() => loadAISettings());

    useEffect(() => {
        // Subskrybuj zmiany ustawień
        const unsubscribe = settingsEmitter.subscribe((newSettings) => {
            setSettings(newSettings);
        });

        // Cleanup przy odmontowaniu
        return unsubscribe;
    }, []);

    return settings;
}

/**
 * React hook zwracający konkretną część ustawień z memoizacją.
 * Przydatne gdy komponent potrzebuje tylko fragmentu ustawień.
 * 
 * Użycie:
 * ```tsx
 * const isTTSEnabled = useSettingsSelector(s => s.voiceSettings.enabled);
 * ```
 */
export function useSettingsSelector<T>(
    selector: (settings: AISettings) => T
): T {
    const settings = useSettingsSubscription();
    return selector(settings);
}

/**
 * Hook zwracający ustawienia + funkcję do ich aktualizacji.
 * Przydatne w komponentach które zarówno czytają jak i modyfikują ustawienia.
 */
export function useSettingsWithUpdate(): [AISettings, (updates: Partial<AISettings>) => void] {
    const settings = useSettingsSubscription();

    const updateSettings = useCallback((updates: Partial<AISettings>) => {
        const { saveAISettings } = require('@/lib/ai-settings');
        const newSettings = { ...settings, ...updates };
        saveAISettings(newSettings);
        // Nie trzeba ręcznie aktualizować state - settingsEmitter to zrobi
    }, [settings]);

    return [settings, updateSettings];
}
