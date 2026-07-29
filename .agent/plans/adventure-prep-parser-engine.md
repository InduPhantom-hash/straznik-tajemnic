# Plan Implementacji: Adventure Prep & Parser Engine

**Data:** 2026-07-29
**Stack:** Next.js 14 App Router · TypeScript strict · Gemini 3.1 Pro (Preview)
**Pipeline pozycja:** Krok 2/5 (`/dev-2-plan`) → następny `/dev-4-implement`

## Zależności i Architektura Docelowa

Opierając się na badaniach z kroku `/dev-1-research` oraz decyzjach architektonicznych:
1. **Analiza PDF:** Jedno potężne wywołanie do `gemini-3.1-pro-preview`, wymuszające ustrukturyzowany JSON Schema (AdventureGraph).
2. **Magazynowanie (Storage):** Zapis do IndexedDB jako cache UI oraz asynchroniczna wektoryzacja do `data/rag/adventures/[id].json`.
3. **Pre-buffering:** Wygenerowanie Sceny Otwarcia w tle i wygenerowanie audio (TTS) by przygotować rozpoczęcie gry bez opóźnień.
4. **UX (Barwne opisy):** Interfejs informuje gracza w kreatywny sposób o postępie wczuwania się w rolę przez AI.

---

## Szczegółowy Plan Zmian (Wdrożenie fazami)

### Faza 1: Definicje Struktur (Data Models)
1. **Moduł:** `src/lib/adventures-data.ts` i/lub `types.ts`
2. **Zmiany:** 
   - Zdefiniowanie interfejsu `AdventureGraph` zawierającego `npcs`, `locations`, `clues` oraz `connections`.
   - Zaktualizowanie `CustomAdventure` o opcjonalne pole `graph: AdventureGraph`.

### Faza 2: Deep Parsing Pipeline (Backend)
1. **Moduł:** `src/app/api/adventure/analyze/route.ts`
2. **Zmiany:**
   - Podmiana modelu na `gemini-3.1-pro-preview` ze względu na wymagany ogromny kontekst (cały podręcznik PDF naraz).
   - Aktualizacja System Promptu, aby zażądał zwrotu danych stricte dopasowanych do nowej struktury `AdventureGraph`.
   - Zwrot odpowiedzi jako ustrukturyzowany JSON, bez potykania się o brak powiązań.

### Faza 3: Barwny UX Uploadu i Asynchroniczny RAG (Frontend)
1. **Moduł:** `src/hooks/useCustomAdventures.ts`
2. **Zmiany:**
   - Dodanie klimatycznych powiadomień do `setLoadingStatus`:
     - *"Studiowanie starych ksiąg..."*
     - *"Identyfikacja bohaterów i antagonistów..."*
     - *"Kreślenie na mapie nici powiązań (Siatka Zależności)..."*
   - Gdy `analyze` odda gotowy `AdventureGraph`, automatycznie po cichu odpalamy nowy endpoint `/api/rag/embed-adventure` w celu zasilenia RAG.
   - Wywołanie pre-bufferingu "Sceny Otwarcia" i umieszczenie jej w IndexedDB.

### Faza 4: Integracja z RAG dla Aktywnej Rozgrywki (Backend/Local Vector Store)
1. **Moduły:** `src/lib/vector-db/local-vector-store.ts` oraz `src/lib/vector-db/retrieval-service.ts`
2. **Zmiany:**
   - Przy starcie sesji, `retrieval-service.ts` dodaje do puli przeszukiwanych przestrzeni nowy indeks przypisany do aktualnej przygody (np. `adventure-[adventure.id].json`).
   - Modyfikacja GM Promptu (w `game-context.ts` lub endpointach czatu), instruująca Mistrza Gry o poszanowaniu siatki z przestrzeni Adventure RAG i dynamicznym wypełnianiu pustych pół w razie derailmentu.

---

## Testowanie (Smoke Tests)
- **Upload:** Wgrać przykładowy scenariusz (PDF). Oczekiwać ok. 1-2 minut przetwarzania ze zmieniającymi się statusami.
- **Weryfikacja danych:** Sprawdzenie konsoli i IndexedDB, czy zapisał się `graph` z uzupełnionymi polami.
- **Weryfikacja wektorowa:** Upewnić się, że plik `data/rag/adventures/[id].json` został poprawnie zainicjalizowany bazą.

## Przepływ Agentic-Dev
To jest ostateczny plan przed rozpoczęciem pisania kodu (`/dev-4-implement`). Jeśli wszystko jest poprawne, przechodzimy do wdrażania Fazy 1 i 2.
