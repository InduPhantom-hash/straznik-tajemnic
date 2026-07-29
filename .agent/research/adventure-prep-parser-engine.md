# Research: Adventure Prep & Parser Engine (Moduł Przygotowania Przygody w Tle)

**Data:** 2026-07-29
**Stack:** Next.js 14 App Router · TypeScript strict · Gemini 1.5 Pro (API) · RAG Local Vector Store
**Pipeline pozycja:** Krok 1/5 (`/dev-1-research`) → następny `/dev-2-plan`

---

## TL;DR

Gracz wgrywa plik PDF z gotową przygodą (np. starter do *Zew Cthulhu*), a system (zamiast pobieżnego generowania metadanych) zachowuje się jak **prawdziwy Mistrz Gry przygotowujący się do sesji**. 
Z pomocą Gemini 1.5 Pro z bardzo dużym oknem kontekstowym budowana jest *Siatka Zależności* (Adventure Graph): wyodrębniane są postacie (NPC), poszlaki (Clues), lokacje (Locations) i ich powiązania. Te zawiłe notatki tworzą mini-bazę danych na wyłączność tej sesji, dzięki czemu AI prowadzi nieliniowy sandbox (off-rails), trzymając się solidnego szkieletu przygotowanej przygody.

---

## Obszar problemu i obecny stan (As-Is)

Obecnie proces dodawania nowej przygody obsługiwany jest przez `src/hooks/useCustomAdventures.ts` we współpracy z dwoma endpointami:
1. `/api/pdf/parse-local`: przesyła PDF do Gemini File API i wyodrębnia surowy tekst.
2. `/api/adventure/analyze`: przeprowadza powierzchowną analizę tekstu (zwracając m.in. erę, motyw, opis, hook). W kodzie widnieje szczątkowe wsparcie dla tablicy `breakdown` (podział przygody), jednak struktura ta nie jest egzekwowana jako relacyjny graf.

Brak w tej analizie twardych danych i powiązań wymaganych przez silnik do prowadzenia złożonego śledztwa (Gdzie znajduje się dany przedmiot? Który NPC wie o kulcie?). 

W warstwie pamięci długotrwałej (`retrieval-service.ts`) RAG posiada przestrzenie nazw (namespaces, m.in. `mythos`, `rules`), ale nie ładuje dynamicznie, na wyłączność kontekstu konkretnej wybranej przez gracza przygody.

---

## Proponowana architektura (To-Be) i Deep Parsing

Celem jest rozbudowanie kroku 3 z `useCustomAdventures.ts` ("Analiza przez Gemini AI") o pełnoprawny **Extraction Pipeline**.

### 1. Zmiany w strukturach (TypeScript)
Musimy rozszerzyć model `CustomAdventure` w `src/lib/adventures-data.ts` (i zaktualizować `types.ts`), wstrzykując do niego obiekt `adventureGraph`:
```ts
interface AdventureGraph {
  npcs: AdventureNPC[];
  locations: AdventureLocation[];
  clues: AdventureClue[];
  connections: Array<{ fromId: string; toId: string; description: string }>;
}
```

### 2. Rozbudowa Backend Endpointu
Plik do przebudowy: `src/app/api/adventure/analyze/route.ts` (lub stworzenie osobnego etapu `/api/adventure/extract-graph`).
- Zastosowanie Modelu: `gemini-3.1-pro-preview` (wymagane ze względu na złożoność tokenów dla całej objętości podręcznika/PDFa).
- Prompt: System musi wcielić się w rolę "Call of Cthulhu Scenario Architect". Zostanie poproszony o zwrócenie stricte opisanego w JSONSchema grafu na bazie wejściowego tekstu.

### 3. Wstrzykiwanie Kontekstu w Trakcie Gry (Mini-RAG)
Graf fabularny to nie jest zwykła notatka - to baza wiedzy. 
Kiedy rozpoczyna się sesja w oparciu o tak wgraną przygodę, system RAG (`retrieval-service.ts` / `local-vector-store.ts`) powinien załadować wygenerowany na etapie uploadu *Adventure Graph*.
W ten sposób, jeśli gracz zapyta barmana o konkretną plotkę, system RAG przeszuka graf przygody (`namespace: adventure-[id]`), a AI otrzyma precyzyjną instrukcję napisaną przez twórcę przygody.

### 4. Obsługa Derailmentu (Off-rails Sandbox)
W przypadku zejścia z utartych szlaków przez gracza (np. odwiedzenia szpitala psychiatrycznego, którego nie ma na mapie podręcznika), Director Prompt zostanie zaktualizowany o nową komendę:
*"Gracz opuścił wytyczone w scenariuszu ścieżki. Korzystając z wiedzy o Narratologii (motywy Weird Fiction) oraz Głównego Wątku wygeneruj nową zawartość zgodną z tonem przygody."*

---

## Decyzje do rozstrzygnięcia w planie (`/dev-2-plan`)

Zanim rozpoczniemy pisanie kodu, do przemyślenia pozostają następujące kwestie architektoniczne:

1. **Jeden Duży Strzał vs Wiele Chunków:** 
   Czy `/api/adventure/analyze` powinno wyciągać graf w jednym wielkim prompcie do `gemini-3.1-pro-preview` na całym pliku PDF, czy musimy to podzielić (np. 1. wyciągnij listę postaci, 2. wyciągnij listę lokacji)? Rekomenduję jedno wywołanie do `3.1-pro-preview` ze ścisłym JSON Schema. Będzie wolniejsze (może zająć kilkadziesiąt sekund dla 40 stron PDF), ale uchwyci kontekst całościowo i obniży złożoność kodu. 
2. **Przechowywanie Grafu:**
   Czy zapisać wyekstrahowany graf relacyjny w strukturze JSON obiektu `CustomAdventure` w pamięci `IndexedDB` (poprzez `useCustomAdventures`), czy dokonać natychmiastowej wektoryzacji i zrzucić go na dysk do `data/rag/adventures/[id].json`? Rekomendacja: Graf w IndexedDB dla szybkiego dostępu frontendu do rysowania powiązań + RAG do wektoryzacji.
3. **Prezentacja dla Gracza (UX):**
   Jak wygładzić dla gracza czas oczekiwania (który może wynieść od 30 sekund do minuty) na deep parsing dużego PDFa w UI `useCustomAdventures`? Obecny licznik postępu (uploadProgress) będzie potrzebował nowych, barwniejszych opisów stanów (np. "AI czyta statystyki postaci...", "AI nawiązuje powiązania między dowodami...").

---

## Następny krok

Przejdź do planowania. Daj mi znać, na które z powyższych opcji się decydujesz (lub podaj swoje), a natychmiast utworzę `.agent/plans/adventure-prep-parser-engine.md` (`/dev-2-plan`) z docelową i rygorystyczną architekturą kodu.
