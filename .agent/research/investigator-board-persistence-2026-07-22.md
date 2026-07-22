# Research: Tablica Badacza (Investigator Board) i Persystencja Stanu Sesji
Data: 2026-07-22  
Stack: Next.js (App Router), React, TypeScript, TailwindCSS, IndexedDB, LocalStorage, Custom Game Save API (`data/saves/`)

---

## 1. Obszar problemu

Tablica Badacza (`InvestigatorBoard`) w grze *Strażnik Tajemnic AI* odpowiada za wizualną prezentację dowodów, poszlak, hipotez, podejrzanych oraz łączenie ich czerwonymi sznurkami śledczymi (relacjami SVG). 

Obecnie komponent `InvestigatorBoard` cierpi na **brak persystencji danych**:
- Węzły (`EvidenceNode[]`) generowane są w locie z tradycyjnych tekstowych wpisów z dziennika (`character.journal`) przy użyciu bezstanowej transformacji `convertEntriesToBoardNodes()`.
- Relacje (`EvidenceRelation[]`) oraz zmienione statusy (np. z `hypothesis` na `refuted`) trzymane są **wyłącznie w lokalnym stanie React (`useState`)** komponentu `SessionJournal`.
- Zamknięcie modalu dziennika, zmiana zakładki lub odświeżenie strony powoduje całkowitą utratę układu, statusów i połączeń na Tablicy Badacza.

### Zaangażowane pliki:
1. `src/types/investigator-board.ts` – Definicje interfejsów `EvidenceNode`, `EvidenceRelation`, `InvestigatorBoardState`.
2. `src/lib/journal-storage.ts` – Logika transformacji z `JournalEntry[]` do `EvidenceNode[]` (`convertEntriesToBoardNodes`).
3. `src/components/ui/investigator-board.tsx` – Komponent UI reprezentujący tablicę korkową, karty oraz linie SVG.
4. `src/components/ui/session-journal.tsx` – Komponent modalu dziennika zawierający zakładkę `board` z nietrwałym `useState`.
5. `src/lib/full-game-save-manager.ts` & `src/app/api/game-save/route.ts` – Silnik i endpoint zapisu/odczytu stanu sesji (`FullGameSave`).
6. `src/hooks/useFullSave.ts` – Hook zarządzenia procesem zapisu/odczytu gier w warstwie React.

---

## 2. Zależności i przepływ danych

```mermaid
graph TD
    SERVER_SAVER["FullGameSaveManager (data/saves/)"] <--> USE_SAVE["useFullSave Hook"]
    USE_SAVE <--> PAGE["app/page.tsx (State Session)"]
    PAGE --> JOURNAL_MODAL["SessionJournal.tsx (Modal)"]
    JOURNAL_MODAL -->|Nieutrwalony RAM useState| BOARD["InvestigatorBoard.tsx"]
    
    SUBGRAPH Loose_Transformation ["Jednokierunkowy brak persystencji"]
        JOURNAL_ENTRIES["character.journal / sharedJournal"] -->|convertEntriesToBoardNodes()| BOARD_NODES["EvidenceNode[] (Generowane w locie)"]
        BOARD_RELATIONS["EvidenceRelation[] (Zero-Persistence)"]
    END
```

- **Postaci i Dziennik:** Dane postaci (`characters`) przeżywają pełny zapis w `FullGameSave`, jednak ich wpisy `journal` to surowe tablice obiektów `JournalEntry`.
- **Brak wyjścia w Save'ach:** W obiekcie `FullGameSave` brakuje pola na przechowywanie ustrukturyzowanej Tablicy Badacza (`investigatorBoard: InvestigatorBoardState`).
- **Tryb Hot Seat:** W trybie Hot Seat gracze dzielą `sharedJournal`, lecz stan relacji na tablicy nie jest izolowany ani synchronizowany podczas przełączania badaczy.

---

## 3. Ryzyka i usterki architektoniczne

1. **Utrata stanu (Efemeryczność sznurków i hipotez):** Wszystkie połączenia stworzone przez gracza przepadają w momencie zamknięcia Dziennika.
2. **Rozbieżność pozycji kart (CSS Grid vs SVG coordinates):** Komponent `InvestigatorBoard` układa karty w układzie Tailwind Grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), natomiast linie połączeń SVG wyliczają współrzędne na podstawie właściwości `position.x` i `position.y`. Brak zgodności powoduje przesunięcia linii względem kart na ekranie.
3. **Brak synchronizacji z dynamicznym AI:** Nowe wpisy generowane w locie przez silnik MG podczas podsumowywania scen nie odświeżają wyrenderowanego stanu `boardNodes` na Tablicy.

---

## 4. Rekomendowany plan działania (Następny krok)

Zalecane przejście do kroku planowania `/dev-2-plan`. Plan powinien obejmować:
1. Rozszerzenie interfejsu `FullGameSave` o obiekt `investigatorBoard?: InvestigatorBoardState`.
2. Dodanie persystencji stanu Tablicy Badacza w obiekcie postaci (`Character.investigatorBoard`) oraz w dzienniku wspólnym Hot Seat (`sharedJournal.investigatorBoard`).
3. Naprawę wyliczania pozycji SVG na Tablicy Korkowej (`InvestigatorBoard.tsx`).
4. Reaktywne odświeżanie tablicy po dodaniu wpisu przez AI.
