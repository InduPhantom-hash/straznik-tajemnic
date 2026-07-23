# Research: EPIC-01 Przebudowa Dziennika i Tablicy Badacza od zera
Data: 2026-07-23  
Stack: Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, SVG Canvas Overlay  

---

### 1. Obszar problemu

W projekcie istnieje fragmentacja architektoniczna. Logika Dziennika i Tablicy Badacza jest podzielona pomiędzy 5 plików:
- `src/components/ui/journal.tsx` — Stary Dziennik z układem zakładek (Misje, Kronika, Encyklopedia, Notatki) bez Tablicy Badacza.
- `src/components/ui/journal/evidence-graph-view.tsx` — Bezstanowy, matematyczny podgląd węzłów ułożonych po okręgu, renderujący proste odcinki SVG.
- `src/components/dialogs/JournalDialog.tsx` — Modal z chronologią wpisów Art Déco.
- `src/components/ui/session-journal.tsx` — Komponent Dziennika Sesji połączony z kasetą postaci i odznaką nieprzeczytanych wpisów.
- `src/components/ui/investigator-board.tsx` — Komponent interaktywnego płótna korkowego (węzły, przeciąganie PointerEvents, czerwone sznurki SVG, statusy hipotez).

#### Kluczowe braki i powody przebudowy od zera:
- **Efemeryczność i gubienie zmian**: Dotychczasowe relacje (`EvidenceRelation[]`) i pozycje węzłów były trzymane w krótkotrwałym stanie React lub wyliczane automatycznie. Po odświeżeniu lub wyjściu z modalu sznurki i układy kart potrafiły znikać.
- **Brak ręcznego modelu gracza**: Automatyczna transformacja `convertEntriesToBoardNodes` narzucała automatyczny układ i ograniczała gracza. Wprowadzanie połączeń, notatek i grafik opierało się na przeglądarkowych window `prompt()`.
- **Brak podglądu zdjęć/rekwizytów (Lightbox)**: Zdjęcia rekwizytów były tylko miniaturkami wewnątrz kart. Brak pełnoekranowego Inspection Lightbox z notatkami i transkrypcją pism.
- **Słabe pozycjonowanie sznurków**: Rozbieżności pozycji między kartami w CSS Grid a sztywnymi punktami `x,y` w SVG powodowały rozchodzenie się czerwonych nitek.

---

### 2. Zależności i przepływ danych

#### Sources (Źródła wpisów i poszlak):
1. **Parser tagów MG (`[DZIENNIK:]` oraz `[LOKACJA:]`)**: Automatycznie rejestruje odkrycia, walki, tropy i lokacje w `src/lib/journal/apply-journal-tags.ts` oraz `src/lib/director-state.ts`.
2. **Ekwipunek i Rekwizyty (`EquipmentItem.readableContent`)**: Skany gazet, listów, przepustek prasowych z opcją przypięcia na tablicy.
3. **Notatki gracza (`note`)**: Ręcznie wprowadzane notatki detektywistyczne.

#### Persistence (Utrwalanie stanu):
1. **Karta Postaci (`Character.investigatorBoard`)**: Główny punkt persystencji w trakcie gry (`nodes`, `relations`, `viewport`).
2. **Save Gry (`FullGameSave.investigatorBoard`)**: Trwałe utrwalanie stanu tablicy na dysku w plikach JSON (`data/journals/` i save'ach kampanii).
3. **Synchronizacja w Duet / Hot Seat (`shared-adventure-journal.ts`)**: Utrzymywanie notatek i tablicy w spójności między graczami.

---

### 3. Istniejące testy i stan pokrycia

- `src/components/ui/session-journal.test.tsx` — Weryfikuje nagłówek, CRUD notatek i przełączanie zakładek Dziennika Sesji.
- `src/lib/journal/shared-adventure-journal.test.ts` — Weryfikuje scalanie wpisów, eliminację duplikatów i izolację notatek per przygoda.

---

### 4. Ryzyka i uwagi techniczne

- **Kompatybilność z React 19**: Zewnętrzne biblioteki (np. React Flow / Konva) wykazują ryzyko konfliktów z React 19 i nadmiernego rozmiaru bundle'a.
- **Natywny system Pointer Events + SVG**: Najbardziej niezawodnym podejściem jest natywny canvas SVG z zakrzywionymi nitkami Beziera (`<path d="M x1 y1 Q cx cy x2 y2" />`) z symulacją grawitacji (zwisu) oraz obsługą `PointerEvents` (`setPointerCapture`).
- **Rozdzielenie zadań (Single Source of Truth)**: Przebudowany `CorkboardInvestigationBoard` powinien zastąpić przestarzały `EvidenceGraphView` i skonsolidować rozproszoną logikę tablicy.

---

### 5. Rekomendowany następny krok

Przejście do fazy planowania `/dev-2-plan` dla **EPIC-01**, aby przygotować ustrukturyzowany Implementation Plan i zatwierdzić architekturę nowego interaktywnego systemu Dziennika & Tablicy Badacza z ręcznym modelem gracza, czerwonymi sznurkami i lightboxem zdjęć.
