# Hybrid Search - tuning guide

> Rationale dla magic numbers w `retrieval-service.ts` + tuning recipes + walidacja.
> Stan na 2026-05-07. Źródło prawdy = `retrieval-service.ts:62-89` - ten dokument może się zdezaktualizować, zawsze weryfikuj wartości w kodzie.

---

## 1. Overview pipeline

`RetrievalService.retrieve()` to multi-source hybrid RAG dla aplikacji prowadzącej sesje Call of Cthulhu 7e:

```
┌─ user query
│
├─→ Gemini embedding (3072-dim, MRL @ 768)
│
├─→ Strategia 1: Pinecone semantic (multi-namespace: rules, adventures, npcs, world-state, sessions/{id})
│
├─→ Strategia 2: BM25 keyword (TYLKO namespace rules + adventures = PDF dokumenty)
│
├─→ Strategia 3: RRF merge (gdy mamy oba wyniki)
│      RRF score = SEMANTIC_WEIGHT/(RRF_K + rank_sem) + KEYWORD_WEIGHT/(RRF_K + rank_kw)
│      → normalizacja do [0..1]
│
├─→ Strategia 4: Fallback `MemoryIndex` (lokalny cosine similarity) - gdy Pinecone niedostępny
│
└─→ filter score >= minScore → sort desc → slice maxResults → format prompt section
```

Pełny kod: [retrieval-service.ts](./retrieval-service.ts) (`retrieve()` na linii 115).

---

## 2. Magic numbers - rationale per stała

### `RRF_K = 60`

**Lokalizacja**: [`retrieval-service.ts:76`](./retrieval-service.ts)
**Zastosowanie**: stała w mianowniku Reciprocal Rank Fusion: `score = weight / (RRF_K + rank + 1)`

**Rationale**: wartość z papieru Cormack et al. (SIGIR 2009) - empirycznie zwalidowana na korpusach TREC. Tłumi wpływ niskich rangi (rank 100 daje znacznie mniejszy wkład niż rank 1) bez całkowitego ich odrzucenia. **Wyższe k = wyniki z różnych źródeł ważone bardziej równomiernie** (mniejsza dominacja top-1). Niższe k = top-1 przygniata wszystko.

**Kiedy zmienić**: prawie nigdy. k=60 to konwencja przemysłowa (Pinecone, Weaviate, Elasticsearch defaultują na 60). Zmiana wymaga papierów + benchmark.

### `SEMANTIC_WEIGHT = 0.7` / `KEYWORD_WEIGHT = 0.3`

**Lokalizacja**: [`retrieval-service.ts:82-83`](./retrieval-service.ts)
**Zastosowanie**: waga w sumie RRF - semantic dostaje 70% wkładu, keyword 30%.

**Rationale**:

- **Dlaczego 70/30 a nie 50/50**: Call of Cthulhu 7e to język **zdefiniowany ale nie sztywny** - gracz pyta "ile mam zostać przy świadomości po Nieludzkiej Wiedzy" (parafraza), a podręcznik mówi o "Sanity loss". Semantic łapie parafrazy, keyword łapie egzakty (`SAN check`, `Cthulhu Mythos`, nazwy zaklęć). Semantic dominuje.
- **Dlaczego 70/30 a nie 80/20**: keyword nie jest tylko backupem - nazwy własne (NPC, zaklęcia, lokacje) i mechaniki RPG (Pulpa atutu, Rzut przeciwstawny) są precyzyjne i liczą się.
- **Industry alignment**: konwencja `alpha=0.7` (semantic-favored hybrid) jest standardem w RAG produkcyjnym 2025 dla zdefiniowanych domen.

**Kiedy zmienić**:

- **Obniż SEMANTIC_WEIGHT do 0.6**: gdy dochodzi dużo dokumentów technicznych z exact terms (np. listy itemów, tabele rzutów).
- **Podnieś SEMANTIC_WEIGHT do 0.8**: gdy korpus ma dużo synonimów / parafrazowanych opisów (np. literatura wprowadzająca, fluff).

### `DEFAULT_MIN_SCORE = 0.65`

**Lokalizacja**: [`retrieval-service.ts:68`](./retrieval-service.ts)
**Zastosowanie**: filtruje wyniki z cosine similarity `>= 0.65` (Pinecone) lub po normalizacji RRF `>= 0.65`.

**Rationale**: empiryczny próg na podręczniku CoC 7e + scenariuszach Chaosium. Niżej → zaczyna się szum (fragmenty losowo dopasowane przez embedding). Wyżej → recall spada (umykają trafne ale nie 1:1 dopasowania).

**Kiedy zmienić**:

- **Podnieś do 0.7**: gdy gracz skarży się na nierelewantne fragmenty wstrzykiwane do promptu.
- **Obniż do 0.55**: gdy retrieval zwraca 0 wyników dla typowych zapytań (strata recall).

### `DEFAULT_TOP_K_PER_NAMESPACE = 3`

**Lokalizacja**: [`retrieval-service.ts:66`](./retrieval-service.ts)
**Zastosowanie**: ile dokumentów ciągnąć z każdego namespace przed merge (5 namespace'ów × 3 = max 15 kandydatów).

**Rationale**: 3 to kompromis - wystarczy żeby RRF miał materiał do fuzji (rank 1+2+3), nie tak dużo żeby wpadał szum z dna rankingu. Pinecone query latency rośnie ~liniowo z topK, więc 3 jest tanie (~50 ms na namespace).

**Kiedy zmienić**: zwiększ do 5 jeśli chcesz większego recall i znormalizowane pre-ranking nie szkodzi promptowi.

### `DEFAULT_MAX_RESULTS = 8`

**Lokalizacja**: [`retrieval-service.ts:67`](./retrieval-service.ts)
**Zastosowanie**: max wyników po merge → wstrzykiwanych do promptu AI.

**Rationale**: budżet kontekstu. Każdy wynik to ~50-150 tokenów summary + tagi. 8 wyników × 100 tokenów ≈ 800 tokenów RAG context. To zostawia ~99k+ tokenów na resztę promptu (Gemini 3 Flash 1M context). 8 to też psychologiczny limit - model AI lepiej waży kontekst krótszej listy niż długiej.

**Kiedy zmienić**:

- **Zwiększ do 12**: gdy długi kontekst sesji wymaga większego pokrycia (sesja >2h, wiele NPC).
- **Zmniejsz do 5**: gdy preset LOW (Gemini 3 Flash krótszy context) lub problem z noise w prompt.

### `BM25_NAMESPACES = { RULES, ADVENTURES }`

**Lokalizacja**: [`retrieval-service.ts:86-89`](./retrieval-service.ts)
**Zastosowanie**: ograniczenie BM25 keyword search - działa TYLKO na namespace'ach z PDF dokumentami.

**Rationale**: BM25 wymaga **tokenizacji + IDF statystyk** - to ma sens dla statycznych dokumentów (podręczniki, scenariusze). Sesje (`sessions/{id}`) zmieniają się w runtime, NPC i world-state są krótkie i parafrazowane → semantic ich pokrywa lepiej. Dodawanie BM25 do dynamicznych namespaces dawałoby koszt indeksowania bez zysku precision.

**Kiedy zmienić**: dodaj `npcs` jeśli korpus NPC urośnie >100 profili z ustabilizowanymi nazwami własnymi.

---

## 3. Tuning recipes

### Recipe A - "Za dużo szumu w prompt RAG"

Symptom: AI cytuje nieadekwatne fragmenty z RAG, sesja traci spójność.

**Działanie**: `DEFAULT_MIN_SCORE: 0.65 → 0.70` (ostry filtr).

**Walidacja**: po zmianie odpal `__tests__/retrieval-service.test.ts` - sprawdź czy istniejące asercje na `score >= minScore` nadal przechodzą.

### Recipe B - "Za mało wyników, AI odpowiada 'nie wiem'"

Symptom: `RetrievalResponse.results.length === 0` dla typowych zapytań.

**Działanie** (po kolei):

1. `DEFAULT_MIN_SCORE: 0.65 → 0.55` (poluź filtr).
2. Jeśli dalej zero → `DEFAULT_TOP_K_PER_NAMESPACE: 3 → 5` (więcej kandydatów).
3. Jeśli dalej zero → sprawdź `pineconeClient.initialized` i logi BM25 (`bm25Index.size > 0`).

### Recipe C - "Keyword nie wpływa na wyniki - semantic przygniata"

Symptom: `source: 'pinecone'` w 95% requestów, prawie nigdy `'hybrid'`.

**Działanie**: `SEMANTIC_WEIGHT: 0.7 → 0.6` (więcej miejsca dla keyword).

**Diagnoza najpierw**: zaloguj `console.log` `keywordResults.length` w `retrieve()` przed `mergeWithRRF`. Jeśli 0 - problem nie w wagach, tylko w BM25 indeksie (sprawdź `bm25Index.size`). Jeśli >0 ale wyniki nie wpływają - wagi.

### Recipe D - "Top-1 dominuje, nigdy nie widzimy rank 2+"

Symptom: AI cytuje tylko 1-2 fragmenty, reszta wyników z `RetrievalResult` ignorowane.

**Działanie**: `RRF_K: 60 → 30` (mocniej promuje top-1) LUB `DEFAULT_MAX_RESULTS: 8 → 5` (krótsza lista, model lepiej waży).

**Anti-pattern**: NIE zwiększaj `RRF_K` powyżej 60 - to wypłaszcza ranking i tracisz różnicę między top-1 a top-15.

### Recipe E - "Kontekst RAG za długi, prompt zżera tokeny"

Symptom: telemetria pokazuje `promptSection.length` >2000 znaków per request.

**Działanie**: `DEFAULT_MAX_RESULTS: 8 → 5` + `DEFAULT_TOP_K_PER_NAMESPACE: 3 → 2` (mniej kandydatów, mniejsza lista końcowa).

### Recipe F - "Sesja długa, NPC z połowy sesji znikają z RAG"

Symptom: AI zapomina NPC pojawiającego się w turze 30, mimo że jest w `conversation-memory`.

**Działanie**: NIE zmieniaj wag retrieval - to NIE jest problem hybrid search. Sprawdź `conversation-memory.ts` (auto-save turns) i `pineconeClient.upsert` dla namespace `sessions/{id}`. Diagnoza: `pineconeClient.query('sessions/{id}', topK=10)` ręcznie i sprawdź czy NPC ma chunk.

---

## 4. Walidacja zmian

Każda zmiana magic numbers powinna przejść przez 3 etapy:

### A. Unit testy

```bash
npm test -- src/lib/vector-db/__tests__/retrieval-service.test.ts
npm test -- src/lib/vector-db/__tests__/retrieval-service-hybrid.test.ts
```

Po zmianie wartości, asercje np. `expect(result.score).toBeGreaterThan(0.65)` mogą wymagać aktualizacji. Nie obniżaj asercji bez zrozumienia konsekwencji - przemyśl czy stary próg był empirycznie zasadny.

### B. Test set CoC 7e

Manualny smoke na ~10 zapytaniach pokrywających różne mechaniki:

| typ zapytania       | przykład                                                              | oczekiwane źródło                   |
| ------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| Mechanika exact     | "rzut na SAN po widzeniu Cthulhu"                                     | hybrid (BM25 łapie SAN)             |
| Mechanika parafraza | "ile zdrowia psychicznego tracę po widzeniu Wielkiego Przedwiecznego" | pinecone (semantic łapie parafrazę) |
| Nazwa własna        | "Necronomicon"                                                        | hybrid (keyword dominuje)           |
| Lore parafraza      | "kto stworzył Mythos"                                                 | pinecone (semantic)                 |
| Wspomnienie sesji   | "co zrobił Profesor Armitage w turze 5"                               | pinecone z sessions namespace       |

Każde zapytanie sprawdź ręcznie: czy zwrócone fragmenty są relewantne? Średnia jakość >70% = pass.

### C. Telemetria w production

Po deploy monitoruj przez 1 tydzień:

- `RetrievalResponse.results.length` (rozkład - zero, 1-5, 6+)
- `RetrievalResponse.source` (pinecone vs hybrid vs local vs mixed vs none)
- `RetrievalResponse.durationMs` (cel: p95 <500 ms)

Ostry spadek `'hybrid'` względem baseline = problem z BM25 indeksem.
Wzrost `'none'` = za ostry minScore lub problem z embeddingami.

---

## 5. Referencje

### Papier RRF

- **Cormack, Clarke, Büttcher (2009)** - _Reciprocal Rank Fusion outperforms Condorcet and Individual Rank Learning Methods_, SIGIR 2009.
  PDF: <https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf>
  ACM: <https://dl.acm.org/doi/10.1145/1571941.1572114>

### Dokumentacja branżowa

- **Pinecone - Hybrid search**: <https://docs.pinecone.io/guides/search/hybrid-search>
- **Towards Data Science - RAG with Hybrid Search**: <https://towardsdatascience.com/rag-with-hybrid-search-how-does-keyword-search-work/>

### Wewnętrzne

- [`retrieval-service.ts`](./retrieval-service.ts) - implementacja
- [`bm25-index.ts`](./bm25-index.ts) - BM25 keyword search
- [`pinecone-client.ts`](./pinecone-client.ts) - wrapper Pinecone SDK
- [`embedding-service`](../embedding-service.ts) - Gemini embedding (V1: 3072 → 768 MRL, V2: 3072 native)
- [`CLAUDE.md`](../../../CLAUDE.md) - pełen kontekst Etap 2 RAG roadmapy v4.0

---

## 6. RAG_VERSION migration guide (IND-164)

Aplikacja wspiera 2 wersje shape embeddingów:

| Wersja           | Dim  | Konfiguracja Gemini                         | Min_score | Status                                                                                            |
| ---------------- | ---- | ------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| **v1** (default) | 768  | `outputDimensionality: 768` (MRL truncated) | 0.65      | Backward compat z istniejącym indexem `coc-rag`                                                   |
| **v2** (opt-in)  | 3072 | brak `outputDimensionality` (native Gemini) | 0.70      | Target produkcyjny po IND-164 follow-up infra (recipe B - patrz sesja 142 w retrieval-service.ts) |

**Powód dual-version**: wyższa precision V2 (3072 dim) → mniej halucynacji w long-context RPG sesji (4h × 100+ wiadomości). V1 zostaje jako safe-fallback gdy V2 padnie A/B test lub Pinecone Free 2GB limit jest przekroczony.

**Migration steps (gdy gotowe na V2 - follow-up ticket)**:

1. Utwórz drugi Pinecone index `coc-rag-v2` w konsoli (dim=3072, metric=cosine)
2. Ustaw `PINECONE_INDEX_HOST_V2=https://coc-rag-v2-...` w `.env.local` + Vercel
3. Re-index CoC 7e PDF via UI upload (`clearBefore=true`, namespace `rules`)
4. Ustaw `RAG_VERSION=v2` w `.env.local` + Vercel (po smoke V2)
5. A/B test recall@5 na 10 hard CoC questions (IND-167)
6. Smoke 1h sesja CoC z RAG queries

**Rollback**: usuń `RAG_VERSION` z env (defaults to v1) lub ustaw `RAG_VERSION=v1`. Index V1 zostaje fallback przez 1-2 tyg po V2 deploy.

**Helpers (server-side, cache module-level per process)**:

- `getEmbeddingDimensions()` w [`embedding-service.ts`](../embedding-service.ts) - runtime dim per RAG_VERSION
- `getActivePineconeHost()` w [`pinecone-client.ts`](./pinecone-client.ts) - runtime host (V1 lub V2 z fallback)
- `getDefaultMinScore()` w [`retrieval-service.ts`](./retrieval-service.ts) - runtime threshold

Wszystkie helpery cache'ują wartości module-level (Next.js serverless instance scope). Reset przez `_reset*Cache()` eksportowany dla testów.

**Pułapki**:

- `process.env.RAG_VERSION` server-only - embedding-service NIE jest wołany client-side (verified empirycznie sesja 78).
- Backward compat dla `MemoryIndexEntry.embedding: number[]` w localStorage - V1 zostaje default, brak breaking change. V2 wymaga re-index (clean environment dla beta testerów per opis IND-164).
- Pinecone Free 2GB limit dla V2: 3072 dim × ~600 chunks ≈ 2.4 GB ⚠️ może przekroczyć. Fallback A: MRL truncated 1536 dim, fallback B: Pinecone Standard $70/mc, fallback C: chunking optimization (CHUNK_SIZE 2000 → 4000-6000).

---

## Anti-patterns

- **NIE eksperymentuj na production**: zmień wartości na branchu feature, odpal Recipe walidacji A+B, dopiero merge.
- **NIE zmieniaj `RRF_K` bez papieru / benchmarku**: 60 to konwencja, dotykanie tej wartości to claim "wiem lepiej niż Cormack 2009".
- **NIE łącz zmiany wag z innymi zmianami w jednym commicie**: jeśli RAG się zepsuje po deploy, chcesz wiedzieć która zmiana zawiniła.
- **NIE patrz tylko na `score`**: 0.85 score nie znaczy że dokument jest relewantny - sprawdź `summary` i `tags` w `RetrievalResult`. Wysoki score = "embedding myśli że są podobne", niekoniecznie = "AI to wykorzysta dobrze".
