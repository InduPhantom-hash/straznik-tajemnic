'use client';

import { useState, useCallback } from 'react';
import type { Message } from '@/lib/types';
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import { loadAISettings } from '@/lib/ai-settings';

/**
 * Hook do zarządzania uploadem i pamięcią PDF
 * Wyodrębniony z page.tsx dla zgodności z GEMINI.md (max 200 linii/plik)
 *
 * Po uploadzie automatycznie indeksuje PDF do lokalnego RAG
 * (namespace "rules" / "adventures").
 */

export interface PdfMemory {
  rulesUrl?: string;
  rulesTextUrl?: string;
  rulesGeminiFileUri?: string;
  rulesTextGeminiFileUri?: string; // URI pliku tekstowego (wyekstraktowany)
  rulesFileName?: string;
  rulesIndexedLocally?: boolean;
  rulesIndexedChunks?: number; // Ile chunków zaindeksowano
  adventureUrl?: string;
  adventureTextUrl?: string;
  adventureGeminiFileUri?: string;
  adventureTextGeminiFileUri?: string; // URI pliku tekstowego (wyekstraktowany)
  adventureFileName?: string;
  adventureIndexedLocally?: boolean;
  adventureIndexedChunks?: number;
  lastUpdated?: string;
  /** @deprecated Odczyt wyłącznie dla kompatybilności starszych save'ów. */
  rulesIndexedToPinecone?: boolean;
  /** @deprecated Odczyt wyłącznie dla kompatybilności starszych save'ów. */
  adventureIndexedToPinecone?: boolean;
}

export interface LocalPdfIndexingResult {
  success: boolean;
  indexed: number;
  failed: number;
  totalChunks: number;
  namespace: string;
  durationMs: number;
  error?: string;
}

export function normalizePdfMemory(
  value: PdfMemory | null | undefined
): PdfMemory {
  const memory = value ?? {};
  return {
    ...memory,
    rulesIndexedLocally:
      memory.rulesIndexedLocally ?? memory.rulesIndexedToPinecone ?? false,
    adventureIndexedLocally:
      memory.adventureIndexedLocally ??
      memory.adventureIndexedToPinecone ??
      false,
  };
}

export async function indexPdfLocally(
  file: File,
  type: 'rules' | 'adventure',
  fileName: string = file.name
): Promise<LocalPdfIndexingResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('fileName', fileName);

  const response = await fetch('/api/pdf/ingest-local', {
    method: 'POST',
    headers: getApiKeyHeaders(),
    body: formData,
  });
  const result = (await response
    .json()
    .catch(() => ({}))) as Partial<LocalPdfIndexingResult>;
  if (!response.ok || !result.success) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
  return result as LocalPdfIndexingResult;
}

export interface UsePdfMemoryReturn {
  pdfMemory: PdfMemory;
  setPdfMemory: React.Dispatch<React.SetStateAction<PdfMemory>>;
  isUploading: boolean;
  isIndexing: boolean;
  uploadProgress: number; // 0-100
  indexingProgress: number; // 0-100
  handlePdfUpload: (file: File, type: 'rules' | 'adventure') => Promise<void>;
  handleFileChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'rules' | 'adventure'
  ) => void;
}

interface UsePdfMemoryOptions {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function usePdfMemory(options: UsePdfMemoryOptions): UsePdfMemoryReturn {
  const { setMessages } = options;

  const [pdfMemory, setPdfMemory] = useState<PdfMemory>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [indexingProgress, setIndexingProgress] = useState(0);

  const handlePdfUpload = useCallback(
    async (file: File, type: 'rules' | 'adventure') => {
      setIsUploading(true);
      setUploadProgress(10); // Start

      try {
        console.log(
          `📤 Starting PDF upload for ${type}: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
        );

        // Krok 1: Upload pliku i lokalne parsowanie
        console.log(`📤 Step 1: Parsing and uploading PDF locally (GCS-free)...`);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);

        const parseResponse = await fetch('/api/pdf/parse-local', {
          method: 'POST',
          headers: getApiKeyHeaders(),
          body: formData,
        });

        if (!parseResponse.ok) {
          let errorMessage = 'Błąd podczas uploadu i parsowania pliku';
          try {
            const errorData = await parseResponse.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            errorMessage = `Błąd HTTP ${parseResponse.status}: ${parseResponse.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const uploadData = await parseResponse.json();

        if (!uploadData.success) {
          throw new Error(
            uploadData.error || uploadData.details || 'Błąd podczas parsowania'
          );
        }

        console.log(`✅ PDF uploaded and parsed:`, uploadData);
        setUploadProgress(80); // Parse complete

        // Aktualizuj pamięć PDF
        const newMemory: PdfMemory = {
          ...pdfMemory,
          ...(type === 'rules'
            ? {
                rulesUrl: '', // GCS-free
                rulesTextUrl: '',
                rulesGeminiFileUri: uploadData.geminiFileUri,
                rulesTextGeminiFileUri: undefined,
                rulesFileName: uploadData.fileName,
              }
            : {
                adventureUrl: '', // GCS-free
                adventureTextUrl: '',
                adventureGeminiFileUri: uploadData.geminiFileUri,
                adventureTextGeminiFileUri: undefined,
                adventureFileName: uploadData.fileName,
              }),
          lastUpdated: new Date().toISOString(),
        };

        setPdfMemory(newMemory);
        localStorage.setItem('pdf_memory', JSON.stringify(newMemory));

        // Zapisz do pamięci serwera
        await fetch('/api/pdf-memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            url: '',
            textUrl: '',
            geminiFileUri: uploadData.geminiFileUri,
            textGeminiFileUri: undefined,
            filename: uploadData.fileName,
          }),
        });

        // Dodaj wiadomość systemową
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: `📚 ${type === 'rules' ? 'Zasady gry' : 'Przygoda'} "${uploadData.fileName}" zostały wczytane.\n\n📊 Sparsowano ${uploadData.parsedData.pages} stron (${Math.round(uploadData.parsedData.textLength / 1000)}k znaków).\n📚 Dodawanie do lokalnej pamięci zasad w toku...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);
        setUploadProgress(100); // Done

        // Krok 2: Auto-indeksuj sparsowany tekst do lokalnego RAG (fire-and-forget).
        // Bezpieczne, bo używa sparsowanego tekstu z closure.
        if (uploadData.parsedData?.text) {
          void (async () => {
            try {
              setIsIndexing(true);
              setIndexingProgress(5);

              // Wysyłamy lekki JSON zamiast FormData całego pliku!
              const response = await fetch('/api/pdf/ingest-local', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...getApiKeyHeaders(),
                },
                body: JSON.stringify({
                  text: uploadData.parsedData.text,
                  type,
                  fileName: uploadData.fileName,
                  clearBefore: type === 'rules',
                }),
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              const indexResult = await response.json();
              setIndexingProgress(95);

              if (indexResult.success) {
                const indexedKey =
                  type === 'rules'
                    ? 'rulesIndexedLocally'
                    : 'adventureIndexedLocally';
                const chunksKey =
                  type === 'rules'
                    ? 'rulesIndexedChunks'
                    : 'adventureIndexedChunks';

                setPdfMemory((prev) => {
                  const updated = {
                    ...prev,
                    [indexedKey]: true,
                    [chunksKey]: indexResult.indexed,
                  };
                  localStorage.setItem('pdf_memory', JSON.stringify(updated));
                  return updated;
                });

                const idxMsg: Message = {
                  id: `local-rag-${Date.now()}`,
                  role: 'assistant',
                  content: `📚 ${type === 'rules' ? 'Zasady' : 'Przygoda'} dodane do lokalnej pamięci: ${indexResult.indexed}/${indexResult.totalChunks} fragmentów (${indexResult.durationMs}ms).`,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, idxMsg]);
              }
            } catch (e) {
              console.warn('⚠️ Local PDF indexing error (non-blocking):', e);
              const errorMsg: Message = {
                id: `local-rag-error-${Date.now()}`,
                role: 'assistant',
                content: `⚠️ Nie udało się dodać ${type === 'rules' ? 'zasad' : 'przygody'} do lokalnej pamięci: ${e instanceof Error ? e.message : 'Nieznany błąd'}. Plik pozostaje wczytany i możesz spróbować ponownie później.`,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, errorMsg]);
            } finally {
              setIsIndexing(false);
              setTimeout(() => setIndexingProgress(0), 500);
            }
          })();
        }
      } catch (error) {
        console.error('❌ Błąd podczas uploadu PDF:', error);

        const errorContent = `❌ Błąd podczas wczytywania pliku`;
        const errorDetails =
          error instanceof Error ? error.message : 'Nieznany błąd';

        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `${errorContent}\n\n${errorDetails}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsUploading(false);
        // Reset progress after brief delay
        setTimeout(() => setUploadProgress(0), 500);
      }
    },
    [pdfMemory, setMessages]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: 'rules' | 'adventure') => {
      const file = e.target.files?.[0];
      if (file) {
        handlePdfUpload(file, type);
      }
    },
    [handlePdfUpload]
  );

  return {
    pdfMemory,
    setPdfMemory,
    isUploading,
    isIndexing,
    uploadProgress,
    indexingProgress,
    handlePdfUpload,
    handleFileChange,
  };
}
