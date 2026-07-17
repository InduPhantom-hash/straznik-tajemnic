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
  uploadAdventure: (file: File) => Promise<CustomAdventure | null>;
  deleteAdventure: (id: string) => Promise<void>;
  setActiveAdventure: (id: string | null) => void;
  getActiveAdventure: () => CustomAdventure | null;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
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

  // IND-130: Zapis fire-and-forget - IndexedDB + localStorage defense-in-depth
  const saveToStorage = useCallback(
    (adventures: CustomAdventure[], activeId: string | null) => {
      void saveCustomAdventures({ adventures, activeId }).catch((error) => {
        console.warn('saveCustomAdventures failed', error);
      });
    },
    []
  );

  // Upload nowej przygody
  const uploadAdventure = useCallback(
    async (file: File): Promise<CustomAdventure | null> => {
      setIsLoading(true);
      setUploadError(null);
      setUploadProgress(10);
      setLoadingStatus('Wczytywanie pliku PDF i przesyłanie do pamięci podręcznej...');

      try {
        console.log(`📤 Uploading adventure PDF: ${file.name}`);

        // Nagłówki BYOK (X-Gemini-Api-Key z localStorage gracza). Wymagane przez
        // parse-local i analyze - bez nich endpointy zwracają 401.
        const apiKeyHeaders = getApiKeyHeaders();

        // Krok 1+2 (GCS-free): wgraj PDF → Gemini File API. Wersja publiczna nie ma
        // Google Cloud Storage; parse-local parsuje plik w pamięci serwera i wgrywa
        // go do Gemini File API na kluczu gracza, zapisując adventureGeminiFileUri
        // do pdf-memory (gameplay attachuje przez buildPdfStrategy).
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);

        const parseResponse = await fetch('/api/pdf/parse-local', {
          method: 'POST',
          headers: apiKeyHeaders,
          body: formData,
        });

        if (!parseResponse.ok) {
          const errorData = await parseResponse.json().catch(() => ({}));
          // 401 = brak/zły klucz BYOK - pokaż czytelny komunikat (nie połykaj po cichu).
          if (parseResponse.status === 401) {
            throw new Error(
              errorData.error ||
                'Brak klucza Gemini - wklej swój klucz Google AI Studio w ustawieniach.'
            );
          }
          throw new Error(
            errorData.error ||
              `Wgrywanie przygody nie powiodło się: ${parseResponse.status}`
          );
        }

        setUploadProgress(40);
        setLoadingStatus('Przetwarzanie dokumentu i przygotowywanie struktury tekstu...');

        const parseResult = await parseResponse.json();
        if (!parseResult.success || !parseResult.geminiFileUri) {
          throw new Error(
            parseResult.error || 'Wgrywanie przygody nie powiodło się'
          );
        }

        console.log(
          `✅ PDF wgrany do Gemini File API:`,
          parseResult.geminiFileUri
        );

        setUploadProgress(60);
        setLoadingStatus('Gemini analizuje klimat, postacie i lokacje scenariusza...');

        // Krok 3: Analiza przez Gemini AI (metadane przygody). Nagłówek BYOK.
        console.log(`🔍 Analyzing adventure with Gemini AI...`);
        const analyzeResponse = await fetch('/api/adventure/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...apiKeyHeaders },
          body: JSON.stringify({
            geminiFileUri: parseResult.geminiFileUri,
            // mimeType faktycznie wgranego pliku - analyze użyje go w fileData.mimeType.
            // Bez tego analyze zakłada text/plain i dla natywnego PDF dostaje 500.
            geminiMimeType: parseResult.geminiMimeType,
            fileName: file.name,
          }),
        });

        // 401 z analizy = brak/zły klucz BYOK - twardy błąd (nie cichy fallback do
        // metadanych domyślnych). Inne błędy analizy dalej degradują gracefully niżej.
        if (analyzeResponse.status === 401) {
          const errData = await analyzeResponse.json().catch(() => ({}));
          throw new Error(
            errData.error ||
              'Brak klucza Gemini - wklej swój klucz Google AI Studio w ustawieniach.'
          );
        }

        setUploadProgress(90);
        setLoadingStatus('Pobieranie historycznej pogody (Open-Meteo) i map (OpenHistoricalMap)...');

        let analyzeResult;
        // IND-134 (sesja 148): typed jako Partial<AdventureContext> + pageStart.
        // Shape z /api/adventure/analyze (Gemini), pola opcjonalne bo każde z `?.` fallback w map() lin ~195-235.
        let adventuresData: Array<
          Partial<AdventureContext> & { pageStart?: number | null }
        > = [];

        if (analyzeResponse.ok) {
          analyzeResult = await analyzeResponse.json();
          if (analyzeResult.success) {
            // Obsługa nowego formatu z wieloma przygodami
            if (
              analyzeResult.multipleAdventures &&
              Array.isArray(analyzeResult.adventures)
            ) {
              adventuresData = analyzeResult.adventures;
              console.log(
                `✅ Detected ${adventuresData.length} adventures in PDF`
              );
            } else if (analyzeResult.adventure) {
              // Fallback dla starego formatu (jedna przygoda)
              adventuresData = [analyzeResult.adventure];
              console.log(
                `✅ Adventure analyzed:`,
                analyzeResult.adventure.title
              );
            }
          } else {
            console.warn('Analysis returned error, using fallback');
          }
        } else {
          console.warn('Analysis API failed, using fallback');
        }

        // Jeśli brak danych - użyj fallback
        if (adventuresData.length === 0) {
          adventuresData = [
            {
              title: file.name.replace('.pdf', '').replace(/_/g, ' '),
              era: 'classic',
              eraLabel: 'Klasyczne lata 20.',
              yearRange: '1920-1930',
              location: 'Nieznana lokalizacja',
              country: 'Nieznany',
              tone: 'purist',
              themes: ['tajemnica'],
              suggestedOccupations: ['detektyw'],
              hook: `Przygoda "${file.name.replace('.pdf', '').replace(/_/g, ' ')}" czeka na odkrycie.`,
              description: '',
              estimatedSessions: '2-3',
              playerCount: '1-4',
              difficulty: 'normal',
            },
          ];
        }

        // Tworzenie CustomAdventure dla KAŻDEJ wykrytej przygody
        const newAdventures: CustomAdventure[] = adventuresData.map(
          (adventureData, index) => ({
            id: `custom-${Date.now()}-${index}`,
            title:
              adventureData?.title ||
              `${file.name.replace('.pdf', '')} - Przygoda ${index + 1}`,
            era: adventureData?.era || 'classic',
            eraLabel: adventureData?.eraLabel || 'Klasyczne lata 20.',
            yearRange: adventureData?.yearRange || '1920-1930',
            location: adventureData?.location || 'Nieznana lokalizacja',
            country: adventureData?.country || 'Nieznany',
            tone: adventureData?.tone || 'purist',
            themes: adventureData?.themes || ['tajemnica'],
            suggestedOccupations: adventureData?.suggestedOccupations || [
              'detektyw',
            ],
            suggestedArchetypes: adventureData?.suggestedArchetypes || [
              'investigator',
            ],
            hook:
              adventureData?.hook ||
              (adventureData?.description
                ? adventureData.description
                    .split('.')
                    .slice(0, 2)
                    .join('.')
                    .trim() + '.'
                : `Przygoda "${adventureData?.title || 'bez nazwy'}" czeka na odkrycie.`),
            description: adventureData?.description || '',
            estimatedSessions: adventureData?.estimatedSessions || '2-3',
            playerCount: adventureData?.playerCount || '1-4',
            difficulty: adventureData?.difficulty || 'normal',
            isCustom: true,
            // parse-local (GCS-free) nie zwraca pdfUrl - plik żyje tylko w Gemini
            // File API (geminiFileUri). Pusty string jest falsy → deleteAdventure
            // pomija nieistniejące GCS delete.
            pdfUrl: parseResult.pdfUrl || '',
            geminiFileUri: parseResult.geminiFileUri,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            isAnalyzed: !!adventureData,
            analysisError: adventureData
              ? undefined
              : 'Analiza nie powiodła się, użyto danych domyślnych',
            pageStart: adventureData?.pageStart || null,
            // Rozkład na czynniki pierwsze (postacie/miejsca/zdarzenia/przedmioty/
            // stwory) - kontekst dla MG/AI. Zapisywany razem z przygodą (IndexedDB).
            breakdown: adventureData?.breakdown,
          })
        );

        // Dodaj wszystkie przygody do listy
        const updatedAdventures = [...customAdventures, ...newAdventures];
        setCustomAdventures(updatedAdventures);
        saveToStorage(updatedAdventures, activeAdventureId);

        console.log(
          `📚 Added ${newAdventures.length} adventure(s): ${newAdventures.map((a) => `"${a.title}"`).join(', ')}`
        );

        // Informuj użytkownika o wynikach
        if (newAdventures.length > 1) {
          alert(
            `✅ Wykryto ${newAdventures.length} przygód w pliku "${file.name}":\n\n${newAdventures.map((a, i) => `${i + 1}. ${a.title}`).join('\n')}\n\nWszystkie zostały dodane do listy.`
          );
        } else {
          alert(`✅ Wczytano przygodę: "${newAdventures[0].title}"`);
        }

        setUploadProgress(100);
        setLoadingStatus('Zakończono wczytywanie przygody.');
        return newAdventures[0]; // Zwracamy pierwszą przygodę dla kompatybilności
      } catch (error) {
        console.error('❌ Adventure upload error:', error);
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
    [customAdventures, activeAdventureId, saveToStorage]
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

        // Usuń z listy
        const updatedAdventures = customAdventures.filter((a) => a.id !== id);
        setCustomAdventures(updatedAdventures);

        // Jeśli usunięto aktywną przygodę, wyczyść
        const newActiveId = activeAdventureId === id ? null : activeAdventureId;
        setActiveAdventureId(newActiveId);
        saveToStorage(updatedAdventures, newActiveId);

        console.log(`✅ Adventure deleted: "${adventure.title}"`);
      } catch (error) {
        console.error('❌ Delete error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [customAdventures, activeAdventureId, saveToStorage]
  );

  // Ustaw aktywną przygodę
  const setActiveAdventure = useCallback(
    (id: string | null) => {
      setActiveAdventureId(id);
      saveToStorage(customAdventures, id);
    },
    [customAdventures, saveToStorage]
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
      saveToStorage(parsed.adventures, parsed.activeId);
      return true;
    },
    [saveToStorage]
  );

  return {
    customAdventures,
    activeAdventureId,
    isLoading,
    uploadProgress,
    loadingStatus,
    uploadError,
    uploadAdventure,
    deleteAdventure,
    setActiveAdventure,
    getActiveAdventure,
    exportBackup,
    importBackup,
  };
}
