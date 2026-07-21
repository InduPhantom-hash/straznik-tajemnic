/**
 * Gemini File API Service
 *
 * Zarządza uploadem plików do Gemini API i przechowuje file handles.
 * Pliki są uploadowane raz do Gemini, a potem używane przez file handles w konwersacjach.
 *
 * Używa oficjalnego SDK `@google/genai@1.50.x` przez pool (`getGeminiClient`).
 * Migracja IND-15 Faza 3 (2026-04-30): `@google/generative-ai/server` (EOL) → `@google/genai`,
 * temp file IO → `Blob`-based upload, opcjonalny `apiKey?` parametr (hybryda env fallback).
 */

import { getGeminiClient } from './gemini-client-pool';

interface GeminiFileInfo {
  fileUri: string;
  displayName: string;
  mimeType: string;
  uploadTime: Date;
  sizeBytes: number;
}

// Cache file handles w pamięci serwera
// Map: fileName (z GCS) -> GeminiFileInfo
const fileCache = new Map<string, GeminiFileInfo>();

/**
 * Resolve klucza API: parametr ma pierwszeństwo, fallback na env.
 * Rzuca błąd gdy brak obu źródeł.
 */
function resolveApiKey(apiKey?: string): string {
  const key = apiKey ?? process.env.GEMINI_API_KEY ?? '';
  if (!key) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return key;
}

/**
 * Uploaduje plik tekstowy do Gemini API
 * @param textContent Tekst do uploadowania
 * @param displayName Nazwa pliku wyświetlana w Gemini
 * @param mimeType Typ MIME (domyślnie text/plain)
 * @param apiKey Opcjonalny klucz API — gdy brak, używa `process.env.GEMINI_API_KEY`
 * @returns File URI do użycia w generateContent
 */
export async function uploadTextFileToGemini(
  textContent: string,
  displayName: string,
  mimeType: string = 'text/plain',
  apiKey?: string
): Promise<string> {
  try {
    console.log(`📤 Uploading text file to Gemini: ${displayName} (${textContent.length} chars)`);

    const key = resolveApiKey(apiKey);
    const client = getGeminiClient(key);
    if (!client) {
      throw new Error('Failed to initialize Gemini client');
    }

    // Blob zamiast temp file IO — `@google/genai` Files API przyjmuje Blob bezpośrednio
    const blob = new Blob([textContent], { type: mimeType });

    const uploadResult = await client.files.upload({
      file: blob,
      config: {
        mimeType,
        displayName,
      },
    });

    const fileUri = uploadResult.uri;

    if (!fileUri) {
      console.error('Gemini File API response:', JSON.stringify(uploadResult, null, 2));
      throw new Error('No fileUri in Gemini API response');
    }

    console.log(`✅ File uploaded to Gemini: ${fileUri}`);

    // Zapisz w cache
    const fileInfo: GeminiFileInfo = {
      fileUri,
      displayName,
      mimeType,
      uploadTime: new Date(),
      sizeBytes: Buffer.byteLength(textContent, 'utf-8'),
    };

    fileCache.set(displayName, fileInfo);

    return fileUri;
  } catch (error) {
    console.error('❌ Failed to upload file to Gemini:', error);
    throw error;
  }
}

/**
 * Uploaduje PDF (jako tekst sparsowany) do Gemini API
 * @param textContent Sparsowany tekst z PDF
 * @param fileName Oryginalna nazwa pliku PDF
 * @param apiKey Opcjonalny klucz API — gdy brak, używa `process.env.GEMINI_API_KEY`
 * @returns File URI do użycia w generateContent
 * @deprecated Preferuj uploadNativePDFToGemini() dla lepszej jakości ekstrakcji (OPT-11)
 */
export async function uploadPDFTextToGemini(
  textContent: string,
  fileName: string,
  apiKey?: string
): Promise<string> {
  // Używamy text/plain dla sparsowanego tekstu PDF
  return uploadTextFileToGemini(
    textContent,
    `pdf-text-${fileName}`,
    'text/plain',
    apiKey
  );
}

/**
 * Uploaduje natywny PDF (binarny) bezpośrednio do Gemini API (OPT-11).
 * Gemini obsługuje natywne parsowanie PDF z OCR, detekcją tabel i layoutem.
 * Lepsza jakość niż pdf-parse → text → upload.
 *
 * @param pdfBuffer Buffer z oryginalnym plikiem PDF
 * @param fileName Nazwa pliku PDF
 * @param apiKey Opcjonalny klucz API — gdy brak, używa `process.env.GEMINI_API_KEY`
 * @returns File URI do użycia w generateContent (mimeType: application/pdf)
 */
export async function uploadNativePDFToGemini(
  pdfBuffer: Buffer,
  fileName: string,
  apiKey?: string
): Promise<string> {
  try {
    const displayName = `pdf-native-${fileName}`;

    // Sprawdź cache
    const cached = fileCache.get(displayName);
    if (cached) {
      console.log(`✅ Native PDF already cached: ${cached.fileUri}`);
      return cached.fileUri;
    }

    console.log(`📤 Uploading native PDF to Gemini: ${displayName} (${pdfBuffer.length} bytes)`);

    const key = resolveApiKey(apiKey);
    const client = getGeminiClient(key);
    if (!client) {
      throw new Error('Failed to initialize Gemini client');
    }

    // Buffer → Blob (Node 18+ ma globalny Blob).
    // Owijamy w `Uint8Array`, bo TS w nowych wersjach widzi `Buffer<ArrayBufferLike>`
    // (potencjalnie SharedArrayBuffer), a `BlobPart` wymaga `ArrayBuffer`.
    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });

    const uploadResult = await client.files.upload({
      file: blob,
      config: {
        mimeType: 'application/pdf',
        displayName,
      },
    });

    const fileUri = uploadResult.uri;
    const fileNameInGemini = uploadResult.name;

    if (!fileUri || !fileNameInGemini) {
      throw new Error('No fileUri/name in Gemini API response for native PDF');
    }

    // Oczekuj aż plik przejdzie ze stanu PROCESSING na ACTIVE
    let fileState = uploadResult.state;
    let pollCount = 0;
    const maxPolls = 30; // Max 30 sekund (30 * 1s)

    while (fileState === 'PROCESSING' && pollCount < maxPolls) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      pollCount++;
      try {
        const getResult = await client.files.get({ name: fileNameInGemini });
        fileState = getResult.state;
        console.log(`⏳ Waiting for PDF processing in Gemini (${displayName}): state=${fileState} [${pollCount}/${maxPolls}]`);
      } catch (pollError) {
        console.warn('⚠️ Polling Gemini file state error:', pollError);
      }
    }

    if (fileState === 'FAILED') {
      throw new Error('Przetwarzanie PDF w Gemini File API nie powiodło się (stan FAILED).');
    }

    console.log(`✅ Native PDF uploaded to Gemini: ${fileUri} (state: ${fileState || 'ACTIVE'})`);

    // Cache
    fileCache.set(displayName, {
      fileUri,
      displayName,
      mimeType: 'application/pdf',
      uploadTime: new Date(),
      sizeBytes: pdfBuffer.length,
    });

    return fileUri;
  } catch (error) {
    console.error('❌ Failed to upload native PDF to Gemini:', error);
    throw error;
  }
}

/**
 * Pobiera file handle dla danego pliku
 * @param fileName Nazwa pliku (identyfikator w cache)
 * @returns File URI lub undefined jeśli nie znaleziono
 */
export function getGeminiFileUri(fileName: string): string | undefined {
  const fileInfo = fileCache.get(fileName);
  return fileInfo?.fileUri;
}

/**
 * Sprawdza czy plik jest w cache
 */
export function hasGeminiFile(fileName: string): boolean {
  return fileCache.has(fileName);
}

/**
 * Lista wszystkich plików w cache
 */
export function listGeminiFiles(): Array<{ fileName: string; fileInfo: GeminiFileInfo }> {
  return Array.from(fileCache.entries()).map(([fileName, fileInfo]) => ({
    fileName,
    fileInfo,
  }));
}

/**
 * Usuwa plik z cache (nie usuwa z Gemini - Gemini zarządza własnym lifecycle)
 */
export function removeGeminiFile(fileName: string): boolean {
  return fileCache.delete(fileName);
}

/**
 * Czyści cały cache (użyj ostrożnie)
 */
export function clearGeminiFileCache(): void {
  fileCache.clear();
}

/**
 * Pobiera file info dla danego pliku
 */
export function getGeminiFileInfo(fileName: string): GeminiFileInfo | undefined {
  return fileCache.get(fileName);
}

// ============================================
// SYSTEM PROMPT CACHING
// ============================================
// TODO: dead code candidate (IND-cleanup) — `cacheSystemPrompt` + `getCachedSystemPromptUri`
// nie mają callerów w src/ (sprawdzono 2026-04-30 w IND-15 Faza 3 baseline).
// Refaktor / usunięcie w osobnym tickecie. NIE usuwać "przy okazji" (CLAUDE.md guardrail).

// Dedykowany cache dla systemu promptu (24h TTL)
const PROMPT_CACHE_KEY = 'system-prompt-cache';
const PROMPT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 godziny

interface PromptCacheEntry {
  fileUri: string;
  promptHash: string;  // Hash promptu do invalidacji
  uploadTime: Date;
}

let promptCache: PromptCacheEntry | null = null;

/**
 * Generuje prosty hash promptu (do wykrywania zmian)
 */
function hashPrompt(prompt: string): string {
  // Prosty hash oparty na długości i fragmentach
  return `${prompt.length}-${prompt.substring(0, 50)}-${prompt.substring(prompt.length - 50)}`;
}

/**
 * Cache'uje system prompt w Gemini File API
 * Zwraca File URI do użycia zamiast inline tekstu
 *
 * @param systemPrompt Pełny system prompt
 * @param apiKey Opcjonalny klucz API — gdy brak, używa `process.env.GEMINI_API_KEY`
 * @returns File URI lub null jeśli cache nie jest możliwy
 */
export async function cacheSystemPrompt(
  systemPrompt: string,
  apiKey?: string
): Promise<string | null> {
  try {
    if (!systemPrompt || systemPrompt.length < 1000) {
      // Nie warto cache'ować małych promptów
      console.log('📝 Prompt too small for caching, using inline');
      return null;
    }

    const currentHash = hashPrompt(systemPrompt);

    // Sprawdź czy mamy aktualny cache
    if (promptCache) {
      const cacheAge = Date.now() - promptCache.uploadTime.getTime();

      if (cacheAge < PROMPT_CACHE_TTL_MS && promptCache.promptHash === currentHash) {
        console.log('✅ Using cached system prompt:', promptCache.fileUri);
        return promptCache.fileUri;
      } else {
        console.log('🔄 System prompt cache expired or changed, re-uploading...');
      }
    }

    // Upload nowy prompt
    const fileUri = await uploadTextFileToGemini(
      systemPrompt,
      `system-prompt-${Date.now()}.md`,
      'text/markdown',
      apiKey
    );

    // Zapisz w cache
    promptCache = {
      fileUri,
      promptHash: currentHash,
      uploadTime: new Date(),
    };

    console.log(`✅ System prompt cached: ${fileUri} (${systemPrompt.length} chars)`);
    return fileUri;

  } catch (error) {
    console.error('❌ Failed to cache system prompt:', error);
    return null;
  }
}

/**
 * Pobiera URI cache'owanego system promptu (jeśli istnieje i jest aktualny)
 */
export function getCachedSystemPromptUri(promptHash?: string): string | null {
  if (!promptCache) return null;

  const cacheAge = Date.now() - promptCache.uploadTime.getTime();

  // Sprawdź wiek
  if (cacheAge >= PROMPT_CACHE_TTL_MS) {
    console.log('⏰ System prompt cache expired');
    return null;
  }

  // Sprawdź hash jeśli podany
  if (promptHash && promptCache.promptHash !== promptHash) {
    console.log('🔄 System prompt changed, cache invalid');
    return null;
  }

  return promptCache.fileUri;
}

/**
 * Invaliduje cache systemu promptu
 */
export function invalidateSystemPromptCache(): void {
  promptCache = null;
  console.log('🗑️ System prompt cache invalidated');
}

/**
 * Pobiera info o cache systemu promptu
 */
export function getSystemPromptCacheInfo(): {
  cached: boolean;
  ageMs?: number;
  promptHash?: string;
  fileUri?: string;
} {
  if (!promptCache) {
    return { cached: false };
  }

  return {
    cached: true,
    ageMs: Date.now() - promptCache.uploadTime.getTime(),
    promptHash: promptCache.promptHash,
    fileUri: promptCache.fileUri,
  };
}
