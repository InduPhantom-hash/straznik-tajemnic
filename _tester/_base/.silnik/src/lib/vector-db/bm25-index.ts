/**
 * BM25 Index — keyword search dla hybrid retrieval
 * Etap 3c roadmapy v4.0
 *
 * Lekki, in-memory indeks odwrócony z algorytmem BM25.
 * Obsługuje polską i angielską tokenizację.
 *
 * Architektura:
 * - Indeks żyje w module-level singleton (ciepły między requestami w Next.js)
 * - Budowany podczas indeksowania PDF (pdf-indexing-service)
 * - Odpytywany podczas retrieval (retrieval-service)
 * - Nie wymaga persystencji — odbudowuje się przy re-indeksowaniu
 *
 * Algorytm BM25:
 *   score(D, Q) = Σ IDF(qi) × (f(qi,D) × (k1+1)) / (f(qi,D) + k1 × (1 - b + b × |D|/avgdl))
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BM25Document {
  /** Unikalny ID dokumentu (= chunk ID z Pinecone) */
  id: string;
  /** Pełny tekst dokumentu */
  text: string;
  /** Namespace (rules, adventures, sessions/{id}) */
  namespace: string;
  /** Typ treści (rule, adventure, session) */
  contentType: string;
  /** Podsumowanie (do zwrócenia w wynikach) */
  summary: string;
  /** Tagi */
  tags: string[];
}

export interface BM25Result {
  id: string;
  score: number;
  namespace: string;
  contentType: string;
  summary: string;
  tags: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** BM25 parameter: term frequency saturation */
const K1 = 1.2;

/** BM25 parameter: document length normalization (0=none, 1=full) */
const B = 0.75;

/** Stop words — Polish + English (najpopularniejsze, bez stemów) */
const STOP_WORDS = new Set([
  // Polish
  'i', 'w', 'z', 'na', 'do', 'nie', 'się', 'to', 'że', 'jest', 'o',
  'co', 'ale', 'jak', 'tak', 'za', 'od', 'po', 'te', 'ten', 'ta',
  'lub', 'dla', 'też', 'już', 'może', 'tylko', 'czy', 'tego', 'tych',
  'tym', 'przy', 'są', 'ich', 'gdy', 'przez', 'nad', 'pod', 'przed',
  'bez', 'aby', 'ze', 'was', 'nas', 'oni', 'one', 'ono', 'być',
  // English
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'and', 'but', 'or', 'not', 'no', 'if',
  'then', 'than', 'so', 'up', 'out', 'about', 'it', 'its',
  'this', 'that', 'these', 'those', 'he', 'she', 'they', 'we',
  'you', 'my', 'your', 'his', 'her', 'our', 'their',
]);

// ============================================================================
// TOKENIZER
// ============================================================================

/**
 * Tokenizuje tekst: lowercase → usunięcie interpunkcji → split → filtr stop words.
 * Zachowuje polskie znaki diakrytyczne.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Zamień znaki specjalne na spacje (zachowaj polskie litery i cyfry)
    .replace(/[^a-ząćęłńóśźż0-9\s]/g, ' ')
    // Zamień wielokrotne spacje na jedną
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

// ============================================================================
// BM25 INDEX
// ============================================================================

class BM25Index {
  /** Dokumenty: id → dokument */
  private documents = new Map<string, BM25Document>();

  /** Długość dokumentu (w tokenach): id → count */
  private docLengths = new Map<string, number>();

  /** Tokeny per dokument: id → tokens[] */
  private docTokens = new Map<string, string[]>();

  /** Inverted index: term → Set<docId> */
  private invertedIndex = new Map<string, Set<string>>();

  /** Term frequency: `${docId}:${term}` → count */
  private termFreq = new Map<string, number>();

  /** Średnia długość dokumentu */
  private avgDocLength = 0;

  /** Łączna liczba dokumentów */
  get size(): number {
    return this.documents.size;
  }

  // ==========================================================================
  // INDEX MANAGEMENT
  // ==========================================================================

  /**
   * Dodaj dokument do indeksu.
   */
  addDocument(doc: BM25Document): void {
    // Usuń stary wpis (jeśli re-indeksujemy)
    if (this.documents.has(doc.id)) {
      this.removeDocument(doc.id);
    }

    const tokens = tokenize(doc.text);

    this.documents.set(doc.id, doc);
    this.docLengths.set(doc.id, tokens.length);
    this.docTokens.set(doc.id, tokens);

    // Zbuduj inverted index i term frequency
    const termCounts = new Map<string, number>();
    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) || 0) + 1);
    }

    for (const [term, count] of termCounts) {
      // Inverted index
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Set());
      }
      this.invertedIndex.get(term)!.add(doc.id);

      // Term frequency
      this.termFreq.set(`${doc.id}:${term}`, count);
    }

    // Aktualizuj średnią długość
    this.recalcAvgLength();
  }

  /**
   * Dodaj wiele dokumentów naraz (batch).
   */
  addDocuments(docs: BM25Document[]): void {
    for (const doc of docs) {
      // Inline bez recalc (robimy na końcu)
      if (this.documents.has(doc.id)) {
        this.removeDocument(doc.id);
      }

      const tokens = tokenize(doc.text);
      this.documents.set(doc.id, doc);
      this.docLengths.set(doc.id, tokens.length);
      this.docTokens.set(doc.id, tokens);

      const termCounts = new Map<string, number>();
      for (const token of tokens) {
        termCounts.set(token, (termCounts.get(token) || 0) + 1);
      }

      for (const [term, count] of termCounts) {
        if (!this.invertedIndex.has(term)) {
          this.invertedIndex.set(term, new Set());
        }
        this.invertedIndex.get(term)!.add(doc.id);
        this.termFreq.set(`${doc.id}:${term}`, count);
      }
    }

    this.recalcAvgLength();
  }

  /**
   * Usuń dokument z indeksu.
   */
  removeDocument(docId: string): void {
    const tokens = this.docTokens.get(docId);
    if (!tokens) return;

    // Usuń z inverted index i term freq
    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      const docSet = this.invertedIndex.get(term);
      if (docSet) {
        docSet.delete(docId);
        if (docSet.size === 0) {
          this.invertedIndex.delete(term);
        }
      }
      this.termFreq.delete(`${docId}:${term}`);
    }

    this.documents.delete(docId);
    this.docLengths.delete(docId);
    this.docTokens.delete(docId);
  }

  /**
   * Usuń wszystkie dokumenty z danego namespace'u.
   */
  clearNamespace(namespace: string): void {
    const toRemove: string[] = [];
    for (const [id, doc] of this.documents) {
      if (doc.namespace === namespace) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.removeDocument(id);
    }

    this.recalcAvgLength();
    console.log(`🔍 BM25: Cleared ${toRemove.length} documents from namespace "${namespace}"`);
  }

  /**
   * Wyczyść cały indeks.
   */
  clear(): void {
    this.documents.clear();
    this.docLengths.clear();
    this.docTokens.clear();
    this.invertedIndex.clear();
    this.termFreq.clear();
    this.avgDocLength = 0;
  }

  /**
   * Sprawdź czy namespace ma dokumenty.
   */
  hasNamespace(namespace: string): boolean {
    for (const doc of this.documents.values()) {
      if (doc.namespace === namespace) return true;
    }
    return false;
  }

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  /**
   * Wyszukaj dokumenty pasujące do zapytania.
   * Zwraca wyniki posortowane od najwyższego BM25 score.
   */
  search(
    query: string,
    options: {
      namespaces?: string[];
      topK?: number;
      minScore?: number;
    } = {},
  ): BM25Result[] {
    const { namespaces, topK = 10, minScore = 0 } = options;
    const queryTokens = tokenize(query);

    if (queryTokens.length === 0 || this.documents.size === 0) {
      return [];
    }

    const N = this.documents.size;
    const scores = new Map<string, number>();

    // Oblicz BM25 score per dokument
    for (const term of queryTokens) {
      const docSet = this.invertedIndex.get(term);
      if (!docSet) continue;

      // IDF: ln((N - n + 0.5) / (n + 0.5) + 1)
      const n = docSet.size;
      const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1);

      for (const docId of docSet) {
        // Filtr namespace'u
        if (namespaces) {
          const doc = this.documents.get(docId);
          if (doc && !namespaces.includes(doc.namespace)) continue;
        }

        const tf = this.termFreq.get(`${docId}:${term}`) || 0;
        const docLen = this.docLengths.get(docId) || 0;
        const avgdl = this.avgDocLength || 1;

        // BM25 formula
        const numerator = tf * (K1 + 1);
        const denominator = tf + K1 * (1 - B + B * (docLen / avgdl));
        const termScore = idf * (numerator / denominator);

        scores.set(docId, (scores.get(docId) || 0) + termScore);
      }
    }

    // Sortuj i ogranicz
    const results: BM25Result[] = [];
    for (const [docId, score] of scores) {
      if (score < minScore) continue;

      const doc = this.documents.get(docId);
      if (!doc) continue;

      results.push({
        id: doc.id,
        score,
        namespace: doc.namespace,
        contentType: doc.contentType,
        summary: doc.summary,
        tags: doc.tags,
      });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private recalcAvgLength(): void {
    if (this.docLengths.size === 0) {
      this.avgDocLength = 0;
      return;
    }

    let totalLength = 0;
    for (const len of this.docLengths.values()) {
      totalLength += len;
    }
    this.avgDocLength = totalLength / this.docLengths.size;
  }
}

// Singleton
export const bm25Index = new BM25Index();
