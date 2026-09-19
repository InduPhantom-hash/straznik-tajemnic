'use client';

import { useState, useCallback, useEffect } from 'react';
import type { AdventureContext, CustomAdventure } from '@/lib/adventures-data';
import {
  loadCustomAdventures,
  saveCustomAdventures,
  exportAsJSON,
  parseImportJSON,
} from '@/lib/custom-adventures-storage';
import { getApiKeyHeaders } from '@/lib/api-keys-service';

/**
 * Hook do zarządzania wieloma własnymi przygodami (PDF)
 *
 * IND-130 (2026-05-12, sesja 84): persistent storage przez IndexedDB primary
 * + localStorage fallback. Chroni przed utratą danych przy routine clear cache
 * (Chrome/Firefox preserve IndexedDB przy domyślnych opcjach Ctrl+Shift+Del).
 * Migration jednorazowa: jeśli IndexedDB pusty a localStorage ma dane → kopiuj.
 */

export interface UseCustomAdventuresReturn {
  customAdventures: CustomAdventure[];
  activeAdventureId: string | null;
  isLoading: boolean;
  uploadProgress: number; // Postęp 0-100
  loadingStatus: string; // Opis aktualnego etapu
  uploadError: string | null;
  clearUploadError: () => void;
  uploadAdventure: (file: File) => Promise<CustomAdventure | null>;
  deleteAdventure: (id: string) => Promise<void>;
  setActiveAdventure: (id: string | null) => void;
  getActiveAdventure: () => CustomAdventure | null;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
  toggleAttachLorebook: (adventureId: string, lorebookId: string) => Promise<void>;
}



export function useCustomAdventures(): UseCustomAdventuresReturn {
  const [customAdventures, setCustomAdventures] = useState<CustomAdventure[]>(
    []
  );
  const [activeAdventureId, setActiveAdventureId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // IND-130: Async load - IndexedDB primary, localStorage fallback + migration
  useEffect(() => {
    void (async () => {
      try {
        const loaded = await loadCustomAdventures();
        setCustomAdventures(loaded.adventures);
        setActiveAdventureId(loaded.activeId);
      } catch (error) {
        console.error('Error loading custom adventures:', error);
      }
    })();
  }, []);



  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  // Upload nowej przygody - w 100% lokalny (doktryna Clean Room Engine / Zero-Cytowań)
  const uploadAdventure = useCallback(
    async (file: File): Promise<CustomAdventure | null> => {
      setIsLoading(true);
      setUploadError(null);
      setUploadProgress(15);
      setLoadingStatus('Wczytywanie pliku PDF i przetwarzanie lokalne...');

      try {
        console.log(`📤 Przetwarzanie przygody PDF w trybie lokalnym: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'adventure');
        formData.append('fileName', file.name);

        setUploadProgress(40);
        setLoadingStatus('Lokalne parsowanie, czankowanie i tagowanie semantyczne...');

        const ingestResponse = await fetch('/api/pdf/ingest-local', {
          method: 'POST',
          headers: getApiKeyHeaders(),
          body: formData,
        });

        if (!ingestResponse.ok) {
          const errorData = await ingestResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Lokalne przetwarzanie przygody nie powiodło się: ${ingestResponse.status}`
          );
        }

        setUploadProgress(75);
        setLoadingStatus('Generowanie grafu śledztwa i indeksowanie wektorów syntetycznych...');

        const ingestResult = await ingestResponse.json();
        if (!ingestResult.success || (!ingestResult.adventure && !ingestResult.adventures?.length)) {
          throw new Error(
            ingestResult.error || 'Nie udało się wygenerować struktury przygody z pliku PDF.'
          );
        }

        const rawAdventures: CustomAdventure[] = ingestResult.adventures || [ingestResult.adventure];

        // Zapewniamy kompletność pól CustomAdventure
        const newAdventures: CustomAdventure[] = rawAdventures.map((adv, index) => ({
          ...adv,
          id: adv.id || `custom-${Date.now()}-${index}`,
          title: adv.title || `${file.name.replace('.pdf', '')} - Przygoda ${index + 1}`,
          era: adv.era || 'classic',
          eraLabel: adv.eraLabel || 'Klasyczne lata 20.',
          yearRange: adv.yearRange || '1920-1929',
          location: adv.location || 'Arkham / Massachusetts',
          country: adv.country || 'USA',
          tone: adv.tone || 'purist',
          themes: adv.themes?.length ? adv.themes : ['tajemnica', 'śledztwo'],
          suggestedOccupations: adv.suggestedOccupations?.length
            ? adv.suggestedOccupations
            : ['detektyw', 'dziennikarz'],
          suggestedArchetypes: adv.suggestedArchetypes?.length
            ? adv.suggestedArchetypes
            : ['investigator'],
          hook: adv.hook || `Śledztwo w sprawie "${adv.title || 'bez nazwy'}" czeka na odkrycie.`,
          description: adv.description || '',
          estimatedSessions: adv.estimatedSessions || '2-3',
          playerCount: adv.playerCount || '1-4',
          difficulty: adv.difficulty || 'normal',
          isCustom: true,
          pdfUrl: '',
          geminiFileUri: '',
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          isAnalyzed: true,
          graph: adv.graph || { npcs: [], locations: [], clues: [], connections: [] },
          documentType: adv.documentType || 'scenario',
          lorebookData: adv.lorebookData,
          attachedLorebookIds: adv.attachedLorebookIds || [],
        }));

        const freshState = await loadCustomAdventures();
        const updatedAdventures = [...freshState.adventures, ...newAdventures];

        setCustomAdventures(updatedAdventures);
        await saveCustomAdventures({
          adventures: updatedAdventures,
          activeId: freshState.activeId || activeAdventureId,
        });

        console.log(
          `📚 Dodano ${newAdventures.length} przygodę(y): ${newAdventures.map((a) => `"${a.title}"`).join(', ')}`
        );

        setUploadProgress(100);
        setLoadingStatus('Zakończono pomyślnie wczytywanie przygody.');
        return newAdventures[0];
      } catch (error) {
        console.error('❌ Błąd lokalnego wczytywania przygody:', error);
        const errorMsg =
          error instanceof Error ? error.message : 'Nieznany błąd';
        setUploadError(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
        setUploadProgress(0);
        setLoadingStatus('');
      }
    },
    [activeAdventureId]
  );

  // Usuwanie przygody
  const deleteAdventure = useCallback(
    async (id: string): Promise<void> => {
      const adventure = customAdventures.find((a) => a.id === id);
      if (!adventure) return;

      setIsLoading(true);

      try {
        // Usuń plik z GCS
        if (adventure.pdfUrl) {
          console.log(`🗑️ Deleting adventure from GCS: ${adventure.fileName}`);

          // Wyciągnij nazwę pliku z URL
          const gcsFileName = adventure.pdfUrl.includes('/')
            ? adventure.pdfUrl.split('/').slice(-2).join('/') // np. 'pdfs/filename.pdf'
            : adventure.pdfUrl;

          try {
            await fetch('/api/gcs/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: gcsFileName }),
            });
            console.log(`✅ File deleted from GCS`);
          } catch (gcsError) {
            console.warn('GCS delete failed (non-critical):', gcsError);
          }
        }

        // Dociągamy najświeższy stan przy usuwaniu, by uniknąć wyścigów.
        const freshState = await loadCustomAdventures();
        const updatedAdventures = freshState.adventures.filter((a) => a.id !== id);

        setCustomAdventures(updatedAdventures);

        // Jeśli usunięto aktywną przygodę, wyczyść
        const newActiveId = freshState.activeId === id ? null : freshState.activeId;
        setActiveAdventureId(newActiveId);
        await saveCustomAdventures({
          adventures: updatedAdventures,
          activeId: newActiveId,
        });

        console.log(`✅ Adventure deleted: "${adventure.title}"`);
      } catch (error) {
        console.error('❌ Delete error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [customAdventures]
  );

  // Ustaw aktywną przygodę
  const setActiveAdventure = useCallback(
    (id: string | null) => {
      setActiveAdventureId(id);
      void saveCustomAdventures({ adventures: customAdventures, activeId: id }).catch((error) => {
        console.warn('saveCustomAdventures failed', error);
      });
    },
    [customAdventures]
  );

  // Pobierz aktywną przygodę
  const getActiveAdventure = useCallback((): CustomAdventure | null => {
    if (!activeAdventureId) return null;
    return customAdventures.find((a) => a.id === activeAdventureId) || null;
  }, [customAdventures, activeAdventureId]);

  // IND-130: Manualny backup - eksport JSON (do save jako plik przez UI)
  const exportBackup = useCallback((): string => {
    return exportAsJSON({
      adventures: customAdventures,
      activeId: activeAdventureId,
    });
  }, [customAdventures, activeAdventureId]);

  // IND-130: Import JSON backup. Zwraca true gdy walidacja przeszła.
  const importBackup = useCallback(
    (json: string): boolean => {
      const parsed = parseImportJSON(json);
      if (!parsed) return false;
      setCustomAdventures(parsed.adventures);
      setActiveAdventureId(parsed.activeId);
      void saveCustomAdventures(parsed).catch((error) => {
        console.warn('saveCustomAdventures failed', error);
      });
      return true;
    },
    []
  );

  // Dołączanie lub odłączanie Lorebooka / Kompendium do scenariusza
  const toggleAttachLorebook = useCallback(
    async (adventureId: string, lorebookId: string) => {
      try {
        const freshState = await loadCustomAdventures();
        const target = freshState.adventures.find((a) => a.id === adventureId);
        if (!target) return;

        const lorebook = freshState.adventures.find((a) => a.id === lorebookId);
        const currentIds = target.attachedLorebookIds || [];
        const isAttached = currentIds.includes(lorebookId);

        const newIds = isAttached
          ? currentIds.filter((id) => id !== lorebookId)
          : [...currentIds, lorebookId];

        const updatedAdventures = freshState.adventures.map((a) => {
          if (a.id !== adventureId) return a;
          const attachedLorebooks = newIds
            .map((id) => {
              const lb = freshState.adventures.find((item) => item.id === id);
              if (!lb) return null;
              return {
                id: lb.id,
                title: lb.title,
                documentType: (lb.documentType || 'setting') as 'setting' | 'compendium',
                geminiFileUri: lb.geminiFileUri,
              };
            })
            .filter(Boolean) as import('@/types/adventure').SourcebookReference[];

          return {
            ...a,
            attachedLorebookIds: newIds,
            attachedLorebooks,
          };
        });

        setCustomAdventures(updatedAdventures);
        await saveCustomAdventures({
          adventures: updatedAdventures,
          activeId: freshState.activeId,
        });
      } catch (err) {
        console.error('❌ toggleAttachLorebook failed:', err);
      }
    },
    []
  );

  return {
    customAdventures,
    activeAdventureId,
    isLoading,
    uploadProgress,
    loadingStatus,
    uploadError,
    clearUploadError,
    uploadAdventure,
    deleteAdventure,
    setActiveAdventure,
    getActiveAdventure,
    exportBackup,
    importBackup,
    toggleAttachLorebook,
  };
}

