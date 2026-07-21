# Plan: Etap 3 — Tablica Badacza (Investigator Evidence Board & Interactive Detective Journal)

Data: 2026-07-21
Złożoność: Duża (Multi-phase: Types & Schema, UI Tablica Badacza, RAG/Auto-Extraction, Local Storage Sync)

---

## 1. Problem i Cel

Obecny Dziennik (`SessionJournal.tsx`) opiera się na prostym podziale na listy (Misje, Kronika, Encyklopedia, Notatki).
- Brakuje graficznej, interaktywnej **Tablicy Badacza** (z kołkami, sznurkami/relacjami, dowodami, poszlakami i hipotezami).
- Dziennik nie wspiera statusów pewności faktów (`potwierdzone`, `hipoteza`, `obalone`) oraz śledzenia źródła pochodzenia dowodu (np. z jakiej lokacji, od jakiego NPC, w jakim dniu sesji).
- API `src/app/api/journal/route.ts` nadal wywołuje opcjonalne/stare Google Cloud Storage zamiast w 100% korzystać z lokalnego zapisu w save'ach i `data/adventures/{adventureId}.json`.

**Cel:** Przebudować system Dziennika w **Tablicę Badacza (Investigator Board)** zintegrowaną z lokalnym zapisem stanu, automatyczną ekstrakcją faktów z odpowiedzi MG i interaktywną edycją.

---

## 2. Rozwiązanie i Architektura

1. **Typy i Schemat (`src/types/investigator-board.ts`):**
   - Wprowadzenie dedykowanych typów: `EvidenceNode` (dowód/poszlaka/podejrzany/lokacja) z właściwościami `status` (`confirmed` | `hypothesis` | `refuted`), `source` (skąd/od kogo), `position` (x, y dla tablicy drag-and-drop).
   - Wprowadzenie `EvidenceRelation` (krawędź łącząca 2 węzły ze zdaniem opisowym, np. "John Miller jest podejrzany o morderstwo w Lokacji X").

2. **Nowy Komponent Tablicy Badacza (`src/components/ui/investigator-board.tsx`):**
   - Interaktywny płótno/widok sieciowy (Canvas/SVG z naciągniętymi czerwonymi sznurkami w klimacie noir/lovecraftian).
   - Obsługa filtrowania po statusach (potwierdzone / hipotezy / obalone) i filtrowania po kategoriach (Dowody, Osoby, Lokacje, Artefakty).
   - Dwustronna obsługa: automatycznie wyekstrahowane węzły przez AI oraz możliwość dodawania i przesuwania własnych notatek/sznurków przez gracza.

3. **Integracja w `SessionJournal.tsx`:**
   - Dodanie nowej, domyślnej zakładki **"📌 Tablica Badacza"** obok Misji, Kroniki, Encyklopedii i Notatek.
   - Płynne przełączanie między tradycyjnym widokiem list a wizualną Tablicą Śledztwa.

4. **Lokalne API i Zapis (`src/app/api/journal/route.ts` & `src/lib/journal-storage.ts`):**
   - Całkowite odpięcie zależności od GCS i przejście na lokalną pamięć save'ów postaci/przygody (`data/saves/`).
   - Pełna integracja z `sharedJournal` / save postaci.

---

## 3. Pliki do modyfikacji i nowo tworzone

| Plik | Zmiana | Ryzyko |
|------|--------|--------|
| `[NEW] src/types/investigator-board.ts` | Definicje interfejsów węzłów, krawędzi, statusów i pozycji na tablicy | Niskie |
| `[NEW] src/components/ui/investigator-board.tsx` | Komponent wizualny Tablicy Badacza (sznurki, kołki, karty, statusy) | Średnie |
| `[MODIFY] src/components/ui/session-journal.tsx` | Osadzenie Tablicy Badacza jako głównej zakładki i spięcie z lokalnymi stanami | Średnie |
| `[MODIFY] src/app/api/journal/route.ts` | Przekształcenie endpointu na 100% lokalny storage (bez GCS) | Niskie |
| `[NEW] src/lib/journal-storage.ts` | Lokalny helper do zapisu/odczytu tablicy i dziennika z systemem save | Niskie |
| `[MODIFY] docs/ROADMAP-MECHANIKI-AI.md` | Aktualizacja statusów zadań Etapu 3 | Niskie |

---

## 4. Fazy implementacji

### Faza 1: Definicje typów i lokalna warstwa zapisu (Data Model & Local API)
- [ ] Utworzenie `src/types/investigator-board.ts` ze strukturami `EvidenceNode`, `EvidenceRelation`, `BoardState`.
- [ ] Przebudowa `src/app/api/journal/route.ts` na czysto lokalny zapis plikowy bez wywołań GCS.
- Weryfikacja: `npx tsc --noEmit` PASS.

### Faza 2: Komponent Tablicy Badacza (Investigator Board Canvas & Cards)
- [ ] Stworzenie `src/components/ui/investigator-board.tsx` z renderowaniem kart dowodów, statusów (`potwierdzone` / `hipoteza` / `obalone`) oraz łączących je czerwonych linii (sznurków detektywistycznych).
- [ ] Dodać możliwość dodawania ręcznego notatek i powiązań między węzłami.
- Weryfikacja: Kompilacja komponentu bez błędów.

### Faza 3: Integracja z Dziennikiem (`SessionJournal.tsx`) i Auto-Sync
- [ ] Zintegrować Tablicę Badacza jako pierwszą, wyróżnioną zakładkę w `SessionJournal.tsx`.
- [ ] Dodać wsparcie dla eksportu stanu Tablicy Badacza do pliku Markdown / JSON.
- Weryfikacja: Uruchomienie i przejście istniejących testów jednostkowych `npm test`.

### Faza 4: Weryfikacja końcowa i aktualizacja dokumentacji
- [ ] Wykonanie pełnego builduprodukcyjnego (`npm run build`).
- [ ] Aktualizacja `docs/ROADMAP-MECHANIKI-AI.md` oraz `_pamiec/aktualny.md`.

---

## 5. Weryfikacja końcowa

Komendy do uruchomienia po zakończeniu prac:
1. `npx tsc --noEmit` — weryfikacja typów TypeScript.
2. `npm test` — uruchomienie pakietu testów regresyjnych Jest.
3. `npm run build` — produkcyjna kompilacja Next.js.

---

## 6. Co może się zepsuć (Ryzyka i Łagodzenie)

- **Ryzyko:** Wydajność renderowania sznurków/krawędzi przy bardzo dużej liczbie dowodów.
  - *Łagodzenie:* Użycie lekkiego SVGOverlay z przeliczaniem punktów po zakotwiczonych ID węzłów.
- **Ryzyko:** Zgodność ze starymi zapisami (backward compatibility).
  - *Łagodzenie:* Automatyczna migracja istniejących `JournalEntry` na węzły typu `EvidenceNode` z domyślnym status `confirmed`.
