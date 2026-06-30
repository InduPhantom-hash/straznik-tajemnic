'use client';

import { useState, useCallback } from 'react';
import type { Message } from '@/lib/types';
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import { loadAISettings } from '@/lib/ai-settings';

/**
 * Hook do zarządzania uploadem i pamięcią PDF
 * Wyodrębniony z page.tsx dla zgodności z GEMINI.md (max 200 linii/plik)
 *
 * v4.0 (etap 3b): Po uploadzie automatycznie indeksuje tekst PDF
 * do Pinecone (namespace "rules" / "adventures") dla RAG retrieval.
 */

export interface PdfMemory {
  rulesUrl?: string;
  rulesTextUrl?: string;
  rulesGeminiFileUri?: string;
  rulesTextGeminiFileUri?: string; // URI pliku tekstowego (wyekstraktowany)
  rulesFileName?: string;
  rulesIndexedToPinecone?: boolean; // Czy zaindeksowano do Pinecone
  rulesIndexedChunks?: number; // Ile chunków zaindeksowano
  adventureUrl?: string;
  adventureTextUrl?: string;
  adventureGeminiFileUri?: string;
  adventureTextGeminiFileUri?: string; // URI pliku tekstowego (wyekstraktowany)
  adventureFileName?: string;
  adventureIndexedToPinecone?: boolean;
  adventureIndexedChunks?: number;
  lastUpdated?: string;
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
  triggerPineconeIndexing: (type: 'rules' | 'adventure') => Promise<void>;
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

  /**
   * Indeksuje tekst PDF do Pinecone (fire-and-forget z wiadomością statusu).
   * Wywoływane automatycznie po uploadzie lub ręcznie z UI.
   */
  const triggerPineconeIndexing = useCallback(
    async (type: 'rules' | 'adventure') => {
      const textUrl =
        type === 'rules' ? pdfMemory.rulesTextUrl : pdfMemory.adventureTextUrl;
      const fileName =
        type === 'rules'
          ? pdfMemory.rulesFileName
          : pdfMemory.adventureFileName;

      if (!textUrl) {
        console.warn(`⚠️ No textUrl for ${type}, skipping Pinecone indexing`);
        return;
      }

      setIsIndexing(true);
      setIndexingProgress(5);

      try {
        console.log(`🌲 Starting Pinecone indexing for ${type}: ${fileName}`);

        const response = await fetch('/api/pdf/index-to-pinecone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getApiKeyHeaders(),
          },
          body: JSON.stringify({
            textUrl,
            type,
            fileName: fileName || type,
            // IND-66 C7: rules → clearBefore=true (re-upload książki idempotent),
            // adventure → false (nowa przygoda dodawana, NIE niszczy poprzednich).
            clearBefore: type === 'rules',
          }),
        });

        setIndexingProgress(50);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        setIndexingProgress(95);

        if (result.success) {
          // Aktualizuj pamięć PDF ze stanem indeksowania
          const indexedKey =
            type === 'rules'
              ? 'rulesIndexedToPinecone'
              : 'adventureIndexedToPinecone';
          const chunksKey =
            type === 'rules' ? 'rulesIndexedChunks' : 'adventureIndexedChunks';

          setPdfMemory((prev) => {
            const updated = {
              ...prev,
              [indexedKey]: true,
              [chunksKey]: result.indexed,
            };
            localStorage.setItem('pdf_memory', JSON.stringify(updated));
            return updated;
          });

          const indexMessage: Message = {
            id: `pinecone-${Date.now()}`,
            role: 'assistant',
            content: `📚 ${type === 'rules' ? 'Zasady' : 'Przygoda'} "${fileName}" dodane do lokalnej pamięci zasad.\n\n📊 ${result.indexed}/${result.totalChunks} fragmentów (${result.durationMs}ms).`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, indexMessage]);

          console.log(
            `✅ Pinecone indexing complete: ${result.indexed}/${result.totalChunks} chunks`
          );
        } else {
          throw new Error(result.error || 'Indexing failed');
        }
      } catch (error) {
        console.warn(`⚠️ Pinecone indexing failed (non-blocking):`, error);

        const errorMsg: Message = {
          id: `pinecone-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Dodawanie do lokalnej pamięci zasad nie powiodło się: ${error instanceof Error ? error.message : 'Nieznany błąd'}\n\nDokument jest dostępny przez Gemini Files API. Możesz spróbować ponownie później z ustawień.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsIndexing(false);
        setTimeout(() => setIndexingProgress(0), 500);
      }
    },
    [pdfMemory, setMessages]
  );

  const handlePdfUpload = useCallback(
    async (file: File, type: 'rules' | 'adventure') => {
      setIsUploading(true);
      setUploadProgress(10); // Start

      try {
        console.log(
          `📤 Starting PDF upload for ${type}: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
        );

        // Krok 1: Upload pliku
        console.log(`📤 Step 1: Uploading file via /api/upload-pdf...`);
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          let errorMessage = 'Błąd podczas uploadu pliku';
          try {
            const errorData = await uploadResponse.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } catch {
            errorMessage = `Błąd HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Błąd podczas uploadu');
        }

        console.log(
          `✅ File uploaded to ${uploadResult.storage}:`,
          uploadResult.url
        );
        setUploadProgress(40); // Upload complete

        const gcsFileName = uploadResult.url.startsWith('gs://')
          ? uploadResult.url.replace('gs://zew-voice-gemini-bucket/', '')
          : `pdfs/${type}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Krok 2: Parsowanie
        console.log(`📥 Step 2: Parsing PDF...`);
        const parseResponse = await fetch('/api/pdf/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: gcsFileName,
            type: type,
            originalFileName: file.name,
          }),
        });

        if (!parseResponse.ok) {
          let errorMessage = 'Błąd podczas parsowania PDF';
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
        setUploadProgress(70); // Parse complete

        // Krok 3: Ekstrakcja tekstu dla lepszych modeli (gemini-2.5/3.x)
        let textGeminiFileUri: string | undefined;
        if (uploadData.geminiFileUri) {
          console.log(`📝 Step 3: Extracting text for better models...`);
          try {
            const extractResponse = await fetch('/api/pdf/extract-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pdfFileUri: uploadData.geminiFileUri,
                fileName: file.name,
                type: type,
                // IND-66 C4: respect qualityPreset - ULTRA → Gemini 3.1 Pro
                // dla lepszej precyzji ekstrakcji zasad CoC i przygód.
                qualityPreset: loadAISettings().qualityPreset,
              }),
            });

            if (extractResponse.ok) {
              const extractData = await extractResponse.json();
              if (extractData.success && extractData.textFileUri) {
                textGeminiFileUri = extractData.textFileUri;
                console.log(
                  `✅ Text extracted: ${extractData.extractedLength} chars → ${textGeminiFileUri}`
                );
              }
            } else {
              console.warn(
                `⚠️ Text extraction failed, will use PDF for all models`
              );
            }
          } catch (extractError) {
            console.warn(
              `⚠️ Text extraction error (non-critical):`,
              extractError
            );
          }
        }
        setUploadProgress(90);

        // Aktualizuj pamięć PDF
        const newMemory: PdfMemory = {
          ...pdfMemory,
          ...(type === 'rules'
            ? {
                rulesUrl: uploadData.pdfUrl,
                rulesTextUrl: uploadData.textUrl,
                rulesGeminiFileUri: uploadData.geminiFileUri,
                rulesTextGeminiFileUri: textGeminiFileUri,
                rulesFileName: uploadData.fileName,
              }
            : {
                adventureUrl: uploadData.pdfUrl,
                adventureTextUrl: uploadData.textUrl,
                adventureGeminiFileUri: uploadData.geminiFileUri,
                adventureTextGeminiFileUri: textGeminiFileUri,
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
            url: uploadData.pdfUrl,
            textUrl: uploadData.textUrl,
            geminiFileUri: uploadData.geminiFileUri,
            textGeminiFileUri: textGeminiFileUri,
            filename: uploadData.fileName,
          }),
        });

        // Dodaj wiadomość systemową
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: `📚 ${type === 'rules' ? 'Zasady gry' : 'Przygoda'} "${uploadData.fileName}" zostały wczytane.\n\n📊 Sparsowano ${uploadData.parsedData.pages} stron (${Math.round(uploadData.parsedData.textLength / 1000)}k znaków).${textGeminiFileUri ? '\n✅ Tekst wyekstraktowany dla lepszych modeli AI.' : ''}\n📚 Dodawanie do lokalnej pamięci zasad w toku...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);
        setUploadProgress(100); // Done

        // Krok 4 (etap 3b): Auto-indeksuj do Pinecone (fire-and-forget).
        // IND-62: zamiast setTimeout(100ms) który był race condition (memory leak
        // przy unmount + setState on unmounted warning), używamy async IIFE.
        // Bezpieczne bo używa lokalnych zmiennych z closure (textUrlForIndexing,
        // uploadData.fileName) - NIE czeka na pdfMemory state update.
        const textUrlForIndexing = uploadData.textUrl;
        if (textUrlForIndexing) {
          void (async () => {
            try {
              setIsIndexing(true);
              setIndexingProgress(5);

              const indexResponse = await fetch('/api/pdf/index-to-pinecone', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...getApiKeyHeaders(),
                },
                body: JSON.stringify({
                  textUrl: textUrlForIndexing,
                  type,
                  fileName: uploadData.fileName || type,
                  // IND-66 C7: rules → clearBefore=true (re-upload książki idempotent),
                  // adventure → false (nowa przygoda dodawana do namespace).
                  clearBefore: type === 'rules',
                }),
              });

              setIndexingProgress(50);

              if (indexResponse.ok) {
                const indexResult = await indexResponse.json();
                setIndexingProgress(95);

                if (indexResult.success) {
                  const indexedKey =
                    type === 'rules'
                      ? 'rulesIndexedToPinecone'
                      : 'adventureIndexedToPinecone';
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
                    id: `pinecone-${Date.now()}`,
                    role: 'assistant',
                    content: `📚 Dodano do lokalnej pamięci zasad: ${indexResult.indexed}/${indexResult.totalChunks} fragmentów (${indexResult.durationMs}ms).`,
                    timestamp: new Date(),
                  };
                  setMessages((prev) => [...prev, idxMsg]);
                }
              } else {
                console.warn(
                  '⚠️ Auto-indexing to Pinecone failed (non-blocking)'
                );
              }
            } catch (e) {
              console.warn('⚠️ Auto-indexing error (non-blocking):', e);
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
    triggerPineconeIndexing,
  };
}
