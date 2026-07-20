/**
 * PDF Indexing Service - etap 3b+3c roadmapy v4.0
 *
 * Odpowiada za:
 * - Chunking tekstu PDF na semantyczne segmenty z overlapem
 * - Batch generowanie embeddingów per chunk
 * - Zapis do lokalnego namespace "rules" lub "adventures"
 * - Budowanie BM25 index dla hybrid search (etap 3c)
 * - Śledzenie postępu (progress callback)
 * - Czyszczenie starego indeksu przed re-indeksowaniem
 *
 * Pipeline: tekst PDF → chunk → embed → lokalny store + BM25 index
 */

import { indexingService } from './indexing-service';
import { LOCAL_RAG_NAMESPACES } from './vector-types';
import { localVectorStore } from './local-vector-store';
import { bm25Index } from './bm25-index';

// ============================================================================
// TYPES
// ============================================================================

export interface PdfChunk {
  /** Unikalny ID chunka: {type}-{fileHash}-{index} */
  id: string;
  /** Tekst chunka */
  text: string;
  /** Indeks chunka (0-based) */
  index: number;
  /** Offset startowy w oryginalnym tekście */
  startOffset: number;
  /** Offset końcowy */
  endOffset: number;
}

export interface PdfIndexingRequest {
  /** Tekst PDF (już wyekstraktowany) */
  text: string;
  /** Typ dokumentu: rules lub adventure */
  type: 'rules' | 'adventure';
  /** Oryginalna nazwa pliku */
  fileName: string;
  /** Czy wyczyścić namespace przed indeksowaniem (domyślnie: true) */
  clearBefore?: boolean;
  /** Klucz API Gemini (opcjonalny, zapobiega wyścigom singletonu) */
  apiKey?: string;
}

export interface PdfIndexingProgress {
  /** Aktualny etap */
  stage: 'chunking' | 'embedding' | 'upserting' | 'done' | 'error';
  /** Aktualny chunk (1-based) */
  current: number;
  /** Całkowita liczba chunków */
  total: number;
  /** Procent postępu (0-100) */
  percent: number;
  /** Opis etapu */
  message: string;
}

export interface PdfIndexingResult {
  success: boolean;
  /** Liczba zaindeksowanych chunków */
  indexed: number;
  /** Liczba nieudanych chunków */
  failed: number;
  /** Całkowita liczba chunków */
  totalChunks: number;
  /** Namespace docelowy */
  namespace: string;
  /** Czas indeksowania w ms */
  durationMs: number;
  /** Błąd (jeśli success=false) */
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Rozmiar chunka w znakach (~500 tokenów ≈ 2000 znaków) */
const CHUNK_SIZE = 2000;

/** Overlap między chunkami w znakach (10% chunk size) */
const CHUNK_OVERLAP = 200;

/** Minimalna długość chunka (krótsze są dołączane do poprzedniego) */
const MIN_CHUNK_SIZE = 200;

/** Separatory do inteligentnego podziału tekstu (priorytet malejący) */
const SEPARATORS = [
  '\n## ', // Nagłówek H2 (główne sekcje)
  '\n### ', // Nagłówek H3 (podsekcje)
  '\n#### ', // Nagłówek H4
  '\n\n', // Podwójny newline (paragraf)
  '\n', // Pojedynczy newline
  '. ', // Koniec zdania
  '! ', // Wykrzyknik
  '? ', // Pytanie
  '; ', // Średnik
  ', ', // Przecinek (ostateczność)
];

// ============================================================================
// CHUNKING
// ============================================================================

/**
 * Dzieli tekst na chunki o rozmiarze ~CHUNK_SIZE z overlapem.
 * Stara się dzielić na granicach paragrafów/zdań.
 */
export function chunkText(
  text: string,
  type: 'rules' | 'adventure',
  fileName: string
): PdfChunk[] {
  if (!text || text.length < MIN_CHUNK_SIZE) {
    return [];
  }

  // Generuj hash pliku (prosty, deterministyczny)
  const fileHash = simpleHash(fileName);
  const chunks: PdfChunk[] = [];
  let offset = 0;

  while (offset < text.length) {
    // Określ koniec chunka
    let end = Math.min(offset + CHUNK_SIZE, text.length);

    // Jeśli to nie jest ostatni chunk, szukaj dobrego punktu podziału
    if (end < text.length) {
      end = findBestSplitPoint(text, offset, end);
    }

    const chunkText = text.slice(offset, end).trim();

    // Pomiń za krótkie chunki (chyba że to ostatni)
    if (
      chunkText.length >= MIN_CHUNK_SIZE ||
      offset + CHUNK_SIZE >= text.length
    ) {
      chunks.push({
        id: `${type}-${fileHash}-${chunks.length}`,
        text: chunkText,
        index: chunks.length,
        startOffset: offset,
        endOffset: end,
      });
    }

    // Ostatni chunk już dochodzi do końca dokumentu. Nie cofaj offsetu o overlap,
    // bo utworzyłoby to drugi, zdublowany fragment końcowy.
    if (end >= text.length) break;

    // Przesuń offset z overlapem
    offset = end - CHUNK_OVERLAP;
    if (offset <= chunks[chunks.length - 1]?.startOffset) {
      // Zabezpieczenie przed zapętleniem
      offset = end;
    }
  }

  return chunks;
}

/**
 * Znajduje najlepszy punkt podziału w okolicy `maxEnd`.
 * Szuka separatorów w kolejności priorytetu, cofając się max CHUNK_OVERLAP znaków.
 */
function findBestSplitPoint(
  text: string,
  start: number,
  maxEnd: number
): number {
  const searchStart = Math.max(start + MIN_CHUNK_SIZE, maxEnd - CHUNK_OVERLAP);

  for (const sep of SEPARATORS) {
    // Szukaj ostatniego wystąpienia separatora w zakresie [searchStart, maxEnd]
    const searchRegion = text.slice(searchStart, maxEnd);
    const lastIndex = searchRegion.lastIndexOf(sep);

    if (lastIndex !== -1) {
      return searchStart + lastIndex + sep.length;
    }
  }

  // Brak separatora - tnij na granicy słowa
  const spaceIndex = text.lastIndexOf(' ', maxEnd);
  if (spaceIndex > searchStart) {
    return spaceIndex + 1;
  }

  // Ostateczność - tnij na maxEnd
  return maxEnd;
}

/**
 * Prosty hash stringa (deterministyczny, nie kryptograficzny).
 * Zwraca 8-znakowy hex.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
}

// ============================================================================
// SUMMARY EXTRACTION (per chunk)
// ============================================================================

/**
 * Wyciąga krótkie podsumowanie z chunka tekstu.
 * Bierze pierwsze zdanie lub 200 znaków.
 */
function extractChunkSummary(text: string, maxLength: number = 200): string {
  // Usuń formatowanie Markdown
  const clean = text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();

  if (clean.length <= maxLength) return clean;

  // Obetnij na granicy zdania
  const cutoff = clean.lastIndexOf('.', maxLength);
  if (cutoff > 80) {
    return clean.substring(0, cutoff + 1);
  }

  return clean.substring(0, maxLength) + '…';
}

/**
 * Wyciąga tagi z chunka PDF - mechaniki, lokacje, postacie.
 */
function extractChunkTags(text: string, type: 'rules' | 'adventure'): string[] {
  const tags: string[] = [`DOC:${type}`];

  // Rozpoznaj sekcje zasad
  if (type === 'rules') {
    const rulePatterns: [RegExp, string][] = [
      [/(?:poczytalność|sanity|szaleństwo|obłęd)/i, 'RULE:Sanity'],
      [/(?:walka|combat|atak|obrażeni|inicjatywa)/i, 'RULE:Combat'],
      [/(?:umiejętność|skill|sprawdzian|test|rzut)/i, 'RULE:Skills'],
      [
        /(?:tworzenie postaci|character creation|cechy|atrybuty)/i,
        'RULE:CharacterCreation',
      ],
      [/(?:magia|zaklęcie|spell|rytuał|okultyzm)/i, 'RULE:Magic'],
      [/(?:potwor|creature|bestia|monstrum|Mythos)/i, 'RULE:Creatures'],
      [/(?:ekwipunek|equipment|broń|weapon|pancerz|armor)/i, 'RULE:Equipment'],
      [/(?:pojazd|vehicle|samochód|samolot|statek)/i, 'RULE:Vehicles'],
    ];

    for (const [pattern, tag] of rulePatterns) {
      if (pattern.test(text) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }

  // Rozpoznaj elementy przygody
  if (type === 'adventure') {
    const adventurePatterns: [RegExp, string][] = [
      [/(?:akt\s+\d|chapter|rozdział|scena)/i, 'ADV:Chapter'],
      [/(?:NPC|postać|bohater|antagonista)/i, 'ADV:NPC'],
      [/(?:lokacja|location|miejsce|budynek|pokój)/i, 'ADV:Location'],
      [/(?:trop|poszlaka|wskazówka|clue|dowód)/i, 'ADV:Clue'],
      [/(?:wydarzenie|event|zdarzenie|encounter)/i, 'ADV:Event'],
      [/(?:mapa|map|plan|diagram)/i, 'ADV:Map'],
      [/(?:handout|załącznik|dokument)/i, 'ADV:Handout'],
    ];

    for (const [pattern, tag] of adventurePatterns) {
      if (pattern.test(text) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }

  // Znane lokacje CoC
  const cocLocations = [
    'Arkham',
    'Miskatonic',
    'Innsmouth',
    'Dunwich',
    'Kingsport',
    'Providence',
    'Boston',
    'London',
    'Londyn',
    'Cairo',
    'Kair',
  ];
  for (const loc of cocLocations) {
    if (text.includes(loc) && !tags.includes(`LOC:${loc}`)) {
      tags.push(`LOC:${loc}`);
    }
  }

  return tags.slice(0, 15);
}

// ============================================================================
// PDF INDEXING SERVICE
// ============================================================================

class PdfIndexingService {
  /**
   * Indeksuje tekst PDF do lokalnego RAG.
   *
   * Pipeline:
   * 1. Chunk tekstu → PdfChunk[]
   * 2. Opcjonalnie wyczyść namespace
   * 3. Dla każdego chunka: embedding → upsert
   * 4. Zwróć wynik
   */
  async indexPdf(
    request: PdfIndexingRequest,
    onProgress?: (progress: PdfIndexingProgress) => void
  ): Promise<PdfIndexingResult> {
    const start = Date.now();

    if (!localVectorStore.initialized) {
      return {
        success: false,
        indexed: 0,
        failed: 0,
        totalChunks: 0,
        namespace: '',
        durationMs: Date.now() - start,
        error: 'Lokalny RAG nie jest gotowy',
      };
    }

    const namespace =
      request.type === 'rules'
        ? LOCAL_RAG_NAMESPACES.RULES
        : LOCAL_RAG_NAMESPACES.ADVENTURES;

    try {
      // Krok 1: Chunking
      onProgress?.({
        stage: 'chunking',
        current: 0,
        total: 0,
        percent: 5,
        message: `Dzielenie tekstu na fragmenty (${request.text.length} znaków)...`,
      });

      const chunks = chunkText(request.text, request.type, request.fileName);

      if (chunks.length === 0) {
        return {
          success: false,
          indexed: 0,
          failed: 0,
          totalChunks: 0,
          namespace,
          durationMs: Date.now() - start,
          error: 'No chunks generated (text too short?)',
        };
      }

      console.log(
        `📄 PDF chunked: ${chunks.length} chunks from "${request.fileName}"`
      );

      // clearBefore jest realizowane atomowo dopiero po wygenerowaniu wszystkich
      // embeddingów. Dzięki temu błąd API nie kasuje działającego indeksu zasad.
      if (request.clearBefore === true) {
        onProgress?.({
          stage: 'embedding',
          current: 0,
          total: chunks.length,
          percent: 10,
          message: `Czyszczenie starego indeksu (${namespace})...`,
        });
      }

      // Krok 3: Embedding + upsert via indexTexts()
      const items = chunks.map((chunk) => ({
        id: chunk.id,
        text: chunk.text,
        metadata: {
          contentType: request.type === 'rules' ? 'rule' : 'adventure',
          summary: extractChunkSummary(chunk.text),
          tags: extractChunkTags(chunk.text, request.type),
          sourceFile: request.fileName,
          chunkIndex: chunk.index,
        },
      }));

      // Wrapper na indexTexts z mapowaniem metadata
      const indexItems = items.map((item) => ({
        id: item.id,
        text: item.text,
        metadata: {
          contentType: item.metadata.contentType,
          summary: item.metadata.summary,
          tags: item.metadata.tags,
        },
      }));

      const result = await indexingService.indexTexts(
        indexItems,
        namespace,
        (current, total) => {
          // Mapuj postęp na 10-95%
          const percent = 10 + Math.round((current / total) * 85);
          onProgress?.({
            stage: 'embedding',
            current,
            total,
            percent,
            message: `Indeksowanie fragmentu ${current}/${total}...`,
          });
        },
        { replaceNamespace: request.clearBefore === true, apiKey: request.apiKey }
      );

      if (result.indexed === 0) {
        return {
          success: false,
          indexed: 0,
          failed: result.failed,
          totalChunks: chunks.length,
          namespace,
          durationMs: Date.now() - start,
          error:
            result.failed > 0
              ? 'Nie udało się wygenerować kompletnego indeksu. Poprzedni indeks pozostał bez zmian.'
              : 'Nie zapisano żadnego fragmentu',
        };
      }

      // Krok 4 (etap 3c): Buduj BM25 index dla hybrid search
      if (request.clearBefore === true) {
        bm25Index.clearNamespace(namespace);
      }
      const indexedIds = new Set(result.indexedIds);
      const bm25Docs = items
        .filter((item) => indexedIds.has(item.id))
        .map((item) => ({
          id: item.id,
          text: item.text,
          namespace,
          contentType: item.metadata.contentType,
          summary: item.metadata.summary,
          tags: item.metadata.tags,
        }));
      bm25Index.addDocuments(bm25Docs);
      console.log(
        `🔍 BM25 index populated: ${bm25Docs.length} docs in "${namespace}" (total: ${bm25Index.size})`
      );

      onProgress?.({
        stage: 'done',
        current: result.indexed,
        total: chunks.length,
        percent: 100,
        message: `Zaindeksowano ${result.indexed}/${chunks.length} fragmentów do "${namespace}"`,
      });

      console.log(
        `✅ PDF indexed: ${result.indexed}/${chunks.length} chunks to "${namespace}" in ${Date.now() - start}ms`
      );

      return {
        success: true,
        indexed: result.indexed,
        failed: result.failed,
        totalChunks: chunks.length,
        namespace,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ PDF indexing failed:', msg);

      onProgress?.({
        stage: 'error',
        current: 0,
        total: 0,
        percent: 0,
        message: `Błąd indeksowania: ${msg}`,
      });

      return {
        success: false,
        indexed: 0,
        failed: 0,
        totalChunks: 0,
        namespace,
        durationMs: Date.now() - start,
        error: msg,
      };
    }
  }

  /**
   * Zwraca statystyki namespace'u (ile wektorów).
   */
  async getNamespaceStats(type: 'rules' | 'adventure'): Promise<{
    recordCount: number;
    namespace: string;
  }> {
    if (!localVectorStore.initialized) {
      return { recordCount: 0, namespace: '' };
    }

    const namespace =
      type === 'rules'
        ? LOCAL_RAG_NAMESPACES.RULES
        : LOCAL_RAG_NAMESPACES.ADVENTURES;

    try {
      const stats = await localVectorStore.getStats();
      const nsStats = stats.namespaces[namespace];
      return {
        recordCount: nsStats?.recordCount ?? 0,
        namespace,
      };
    } catch {
      return { recordCount: 0, namespace };
    }
  }
}

// Singleton
export const pdfIndexingService = new PdfIndexingService();
