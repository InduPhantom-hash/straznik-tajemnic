// Settings Event Emitter - Reaktywny system ustawień
// Wzorzec podobny do gier wideo - zmiany ustawień propagowane natychmiast

import type { AISettings } from './ai-settings';

type SettingsChangeCallback = (settings: AISettings) => void;

/**
 * Singleton EventEmitter dla zmian ustawień AI.
 * Pozwala komponentom subskrybować zmiany i reagować natychmiast
 * bez potrzeby odświeżania strony.
 */
class SettingsEventEmitter {
    private listeners: Set<SettingsChangeCallback> = new Set();

    /**
     * Emituj zmianę ustawień do wszystkich subskrybentów
     */
    emit(settings: AISettings): void {
        console.log(`⚙️ Settings changed, notifying ${this.listeners.size} subscribers`);
        this.listeners.forEach((callback) => {
            try {
                callback(settings);
            } catch (error) {
                console.error('Error in settings subscriber:', error);
            }
        });
    }

    /**
     * Subskrybuj zmiany ustawień
     * @returns Funkcja do anulowania subskrypcji
     */
    subscribe(callback: SettingsChangeCallback): () => void {
        this.listeners.add(callback);
        console.log(`⚙️ New settings subscriber (total: ${this.listeners.size})`);

        return () => {
            this.listeners.delete(callback);
            console.log(`⚙️ Settings subscriber removed (remaining: ${this.listeners.size})`);
        };
    }

    /**
     * Pobierz liczbę aktywnych subskrybentów (do debugowania)
     */
    getSubscriberCount(): number {
        return this.listeners.size;
    }
}

// Singleton instance
export const settingsEmitter = new SettingsEventEmitter();
