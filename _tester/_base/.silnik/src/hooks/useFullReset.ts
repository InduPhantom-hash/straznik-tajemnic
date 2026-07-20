'use client';

import { useState, useCallback } from 'react';
import { persistentMediaCache } from '@/lib/persistent-media-cache';

/**
 * Hook do zarządzania 2-stopniowym confirm dialogem Full Reset.
 *
 * Pełny reset = `localStorage.clear()` + `sessionStorage.clear()`
 * + `persistentMediaCache.clearAll()` (IndexedDB, IND-135 sesja 72)
 * + 7 fetch DELETE (PDF Memory, Journal, Sessions, NPCs, Pinecone,
 *   Cloud Characters, Account Usage - IND-168 Faza 5+6) + window reload.
 *
 * Krok 1 - pierwszy confirm (lista co zostanie usunięte).
 * Krok 2 - finalne ostrzeżenie ("OSTATNIE OSTRZEŻENIE").
 *
 * Wyodrębniony z `settings-modal.tsx` (linie 282-356) jako część IND-17.
 */

export interface UseFullResetReturn {
  /** Czy dialog confirm jest widoczny */
  showConfirm: boolean;
  /** 0 = ukryty, 1 = pierwszy confirm, 2 = finalne ostrzeżenie */
  fullResetStep: 0 | 1 | 2;
  /** Otwiera dialog na step 1 */
  openConfirm: () => void;
  /** Przejście step 1 → step 2 (NIE eksponujemy settera) */
  confirmStep1: () => void;
  /** Zamyka dialog (step → 0) */
  closeConfirm: () => void;
  /** Wykonuje pełny reset i przeładowuje stronę */
  handleFullReset: () => Promise<void>;
}

export function useFullReset(): UseFullResetReturn {
  const [showConfirm, setShowConfirm] = useState(false);
  const [fullResetStep, setFullResetStep] = useState<0 | 1 | 2>(0);

  const openConfirm = useCallback(() => {
    setFullResetStep(1);
    setShowConfirm(true);
  }, []);

  const confirmStep1 = useCallback(() => {
    setFullResetStep(2);
  }, []);

  const closeConfirm = useCallback(() => {
    setFullResetStep(0);
    setShowConfirm(false);
  }, []);

  const handleFullReset = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      console.log('🔄 Starting Full Reset...');

      // 1. Wyczyść CAŁE localStorage
      console.log('🗑️ Clearing localStorage...');
      localStorage.clear();
      console.log('✅ localStorage cleared');

      // 2. Wyczyść sessionStorage
      console.log('🗑️ Clearing sessionStorage...');
      sessionStorage.clear();
      console.log('✅ sessionStorage cleared');

      // 3. Wyczyść IndexedDB media cache (IND-135 - ~150 MB portrety NPC,
      // location images, TTS/SFX audio, chat images). `localStorage.clear()`
      // NIE dotyka IndexedDB (różne storage APIs).
      try {
        console.log('🗑️ Clearing IndexedDB media cache...');
        await persistentMediaCache.clearAll();
        console.log('✅ IndexedDB media cache cleared');
      } catch (error) {
        console.warn('⚠️ Could not clear IndexedDB media cache:', error);
      }

      // 4. Wyczyść wszystkie API endpoints (kolejno, z obsługą błędów dla każdego)
      const apiEndpoints = [
        { url: '/api/pdf-memory', name: 'PDF Memory' },
        { url: '/api/journal', name: 'Journal' },
        { url: '/api/session', name: 'Sessions' },
        { url: '/api/npc/list', name: 'NPCs' },
        // Licznik zużycia per-konto (lokalny plik na dysku) - audyt cleanup.
        { url: '/api/user/usage', name: 'Account Usage' },
      ];

      for (const endpoint of apiEndpoints) {
        try {
          console.log(`🗑️ Clearing ${endpoint.name}...`);
          await fetch(endpoint.url, { method: 'DELETE' });
          console.log(`✅ ${endpoint.name} cleared`);
        } catch (error) {
          console.warn(`⚠️ Could not clear ${endpoint.name}:`, error);
          // Continue anyway - server-side data is less critical
        }
      }

      // 5. Zamknij modal
      setShowConfirm(false);
      setFullResetStep(0);

      // 6. Pokaż powiadomienie
      console.log('✅ Full Reset complete! Reloading page...');

      // 7. Przeładuj stronę - używamy setTimeout aby upewnić się że wszystko zostało wyczyszczone
      // i nie używamy alert() przed reloadem bo to może blokować
      setTimeout(() => {
        window.location.href = window.location.origin; // Force full page reload to root
      }, 100);
    } catch (error) {
      console.error('❌ Błąd podczas pełnego resetu:', error);
      alert('❌ Wystąpił błąd podczas resetowania. Spróbuj ponownie.');
    }
  }, []);

  return {
    showConfirm,
    fullResetStep,
    openConfirm,
    confirmStep1,
    closeConfirm,
    handleFullReset,
  };
}
