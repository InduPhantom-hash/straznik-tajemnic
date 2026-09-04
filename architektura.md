# ARCHITEKTURA SYSTEMU I WYTYCZNE WDROŻENIOWE (AI-to-AI Spec)
**Cel dokumentu:** Wektor transferu kontekstu dla agentów programistycznych (Dev Pipeline). Zawiera zatwierdzone zmiany architektoniczne, modelowe i infrastrukturalne z sesji Q&A.

---

## 1. STAN ZASTANY (CURRENT STATE & KNOWLEDGE BASE)

### 1.1. Core Loop (Chat Pipeline)
- Punkt wejścia: `run-chat-pipeline.ts`. Interceptuje intencje gracza.
- Kontekst budowany hybrydowo: RAG (wektory Float32) + State Machine (Postać, Zegar z `time-manager.ts`, Warunki Atmosferyczne z `build-immersion-context.ts`).
- Prompting (`gm-protocol.ts`): Zależny od stanu, używa strukturalnych tagów (np. `[MYŚLI_MG]`, `[LOKACJA]`, `[TEST]`). Kompresja System Promptu po 5 turze z ~1500 do ~200 tokenów.

### 1.2. Pacing & State Management
- `pacing-controller.ts`: Dynamiczny throttle dla LLM. Zmienia górny limit słów i styl (fast/slow) w zależności od trybu sceny. Wdraża Anti-Stagnation Trigger (zmusza LLM do zrzucenia `[BODZIEC]` w przypadku pętli decyzyjnych gracza).
- `director-state.ts`: Krótkoterminowa baza danych w locie. Wyłapuje `[MYŚLI_MG]` i tagi CELU z outputu modelu, przechowując je w strukturze FIFO i wstrzykując do kolejnych promptów jako "Director's Memory" (zapobiega amnezji kontekstowej NPC i ciągów fabularnych).
- `npc/random-generator.ts`: Proceduralne generowanie twardych statystyk CoC 7ed w tle, narzucające restrykcje matematyczne na narrację walki.

### 1.3. World Setup (Pre-flight)
- Walidacja przez `historical-research.ts`: API używa *Google Search Grounding* weryfikując realia na zaufanych domenach (`archives.gov`, `gov.pl`). Mechanizm *Domain Quarantine* flaguje dane z niezaufanych źródeł jako plotki in-game.

---

## 2. ZATWIERDZONE DECYZJE ARCHITEKTONICZNE (TARGET ARCHITECTURE)

### 2.1. Wielowarstwowy Ruting Modeli LLM (Dual-Step Inference)
- **Krok 1 (Router/Klasyfikator):** Przypisany bezwzględnie do modeli serii `flash` (np. `gemini-3.6-flash`). Cel: Niskie opóźnienia i koszty. Rozpoznawanie intencji gracza, weryfikacja bazy danych i klasyfikacja akcji.
- **Krok 2 (Generator/Reżyser MG):** Przypisany do modeli serii `pro` (np. `gemini-3.1-pro-preview`) z włączoną flagą `thinkingLevel: 'high'`. Cel: Chain of Thought, symulacja ukrytych motywacji NPC, planowanie intrygi i generowanie finalnego outputu z tagami.

### 2.2. Tiering Generacji Obrazów (Google AI Studio / Imagen API)
Jeden uniwersalny klucz API (Google AI Studio) bez zewnętrznych providerów. Wywołanie zależne od wagi sceny:
- **Tier 1 (Imagen 3):** Najwyższy fotorealizm + renderowanie czcionek. 
  - *Zastosowanie:* `useGameStart.ts` (Ekrany ładowania), `character-wizard.tsx` (Portrety postaci i kluczowych NPC), Handouty z napisami (np. wycinki gazet).
- **Tier 2 (Imagen 3 Fast):** Optymalizacja TTFB. 
  - *Zastosowanie:* Tła i lokacje generowane w locie podczas czatu przez wyłapanie taga `[LOKACJA: ...]`.
- **Tier 3 (Gemini Flash Image):** Najtańszy i najszybszy.
  - *Zastosowanie:* Masowe generowanie kafelków w `equipment-modal.tsx` (ikony przedmiotów bez tekstu i detali anatomicznych).

### 2.3. Polityka Prywatności i Pipeline PDF
Całkowity zakaz używania `Gemini File API` w chmurze ze względów bezpieczeństwa IP i polityki offline.
- **Ścieżka A: Podręcznik (Rulebook)**
  - Operacja: 100% Local.
  - Narzędzia: NodeJS PDF parser (`pdf-parser-service.ts`) → lokalny tokenizer → zrzut do `local-vector-store.ts`. Zero eksfiltracji danych do chmury.
- **Ścieżka B: Przygoda (Adventure)**
  - Operacja: Local Extract + Pro Inference.
  - Narzędzia: Lokalny binarny ekstraktor ścina PDF na surowy tekst oraz wyodrębnia pliki binarne (obrazy) prosto na dysk do katalogu `data/adventures/{id}/assets/`.
  - Inferencja: Surowy tekst i lokalne obrazy (base64) wysłane w jednym zapytaniu do `gemini-3.1-pro`.
  - Cel: Ekstrakcja do znormalizowanego obiektu JSON zawierającego graf węzłów (Nodes), listę NPC, clue oraz mapowanie wyekstrahowanych obrazów (jako twarde ścieżki na dysku, np. `/assets/map1.png`) obsługiwane potem interfejsem przez tag `[POKAŻ_ZASÓB]`.

---

## 3. DO WDROŻENIA / REFAKTORYZACJI (TODO)

1. **Dead Code Elimination (Legacy Tech Debt):**
   - Usunąć pozostałości po `@pinecone-database/pinecone` oraz pakietach `@google-cloud/storage` z `package.json` oraz katalogu `src/lib/`.
   - Zaktualizować i oczyścić kod konfiguracyjny z odwołań do Vertex AI i zewnętrznych Replicate API (wymuszenie 100% BYOK Google AI Studio).

2. **Wdrożenie Architektury PDF (Przygody):**
   - Napisać lub wpiąć narzędzie do fizycznej, lokalnej dekompresji binariów z PDF (niezależne od File API), które zrzuci pliki PNG z przygód do katalogu `assets`.
   - Podpiąć `gemini-3.1-pro` pod generowanie JSON (strukturalny output schema dla `AdventureContext`).

3. **Aktualizacja Endpointu Obrazów (`/api/imagen/route.ts`):**
   - Refaktoryzacja obecnego endpointu z hardcodowanego `gemini-2.5-flash-image`.
   - Dodanie parsera flagi/tieru pochodzącej z klienta i mapowanie żądania na odpowiednie wywołania modelu (Imagen 3, Imagen 3 Fast, Gemini Flash Image).

4. **Wdrożenie Routera API:**
   - (W przyszłości) Wpięcie mikro-rutingu w `run-chat-pipeline.ts` opisanego w sekcji 2.1.
