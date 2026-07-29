## Research: Zadania stabilizacyjne z intake'u (Testy + UI Fallback)
Data: 2026-07-29
Stack: Next.js (React, TypeScript), Jest

### 1. Obszar Problemu A: Brakujące testy w parserze ekwipunku (`acquired-equipment.ts`)
Funkcja przypisująca podtypy dla dokumentów (`inferDocumentType` i jej integracja) dodana na początku sesji w `_tester/_base/.silnik/src/lib/acquired-equipment.ts` nie ma pokrycia testami.

*   **Brakujące przypadki:** Rozpoznawanie `press_pass`, `id_card`, `evidence_envelope`, `newspaper`, `official_document`, `journal_page`, `letter` oraz fallbackowanie niezdefiniowanych na `letter`. Brakuje też sprawdzania działania `.toLocaleLowerCase('pl-PL')` (wielkie/polskie znaki).
*   **Brak w integracji:** Brakuje testu sprawdzającego warunkowe dokładanie pola `documentType` w obiekcie wypluwanym z `createAcquiredEquipmentSeed` dla kategorii `document` i braku tego pola dla `weapon`, `tool`, itd.
*   **Gotowe rozwiązanie:** Mamy już pełne snippet-testy przygotowane przez subagenta.

### 2. Obszar Problemu B: Uszkodzone testy (Investigator Board, PDF, generate-starting)
W środowisku testowym silnika zdiagnozowano psujące się testy wraz z root-cause:

*   **Investigator Board (`src/components/ui/investigator-board.test.tsx`)**:
    *   *Problem:* Test filtrujący w interfejsie węzły zawodzi.
    *   *Przyczyna:* Komponent `investigator-board.tsx` przy renderowaniu kart na płótnie iteruje po "surowej" liście `localNodes` (linia 318), ignorując wyliczoną wyżej listę `filteredNodes` (linia 56).
    *   *Rozwiązanie:* Zmiana mapowania na `filteredNodes`.
*   **Ingest Local API (`src/app/api/pdf/ingest-local/route.test.ts`)**:
    *   *Problem:* Test zawodzi przy sprawdzaniu zwracanych statystyk.
    *   *Przyczyna:* W route API handler bezpośrenio strzela do `localVectorStore.getNamespaceCount`, natomiast plik `.test.ts` naiwnie mockuje nieużywany do tego `pdfIndexingService`. Dodatkowo, kontrakt JSON zwracany z api (`type`, `recordCount`) różni się od oczekiwanego w asercjach testu (`namespace`, `recordCount`, `initialized`).
    *   *Rozwiązanie:* Dopasować mock do wywołań w pliku route i ujednolicić kontrakt wyjścia (asercje vs faktyczny endpoint).
*   **Generate Starting Equipment API (`src/app/api/equipment/generate-starting/route.test.ts`)**:
    *   *Problem:* Obrazek rewolweru dla ery 1940s ładuje się jako `undefined` w teście.
    *   *Przyczyna:* Route przyjmuje nagłówek z wymaganą erą (`'1946'`), ale wywołuje generator `createEquipmentItem(template, 'starting')` zjadając ten parametr. Generator używa zatem domyślnej ery '1920s', co psuje URL dla 1940.
    *   *Rozwiązanie:* Przekazać `targetEra` jako trzeci argument do `createEquipmentItem`.

### 3. Obszar Problemu C: Rozrzucone systemy Fallbacku dla obrazów (UI)
Aplikacja ma problem z brakiem ujednoliconego mechanizmu w razie failu ładowania `src` obrazka (`onError`).

*   **Zidentyfikowane 4 wzorce:**
    1.  Manipulacja DOM w locie (`document.createElement`) ukrywająca obrazek i wstawiająca div z czerwonym tekstem błędu (antywzorzec, zagraża Reactowi). Dotyczy czatu / narracji.
    2.  Ciche ukrycie przez `display: 'none'`, zostawiające "dziury" w designie (np. ramka zdjęcia pozbawiona zawartości na Tablicy).
    3.  Ręczne podmienianie ścieżki w `onError` na `document.svg` albo `${category}.svg` (bardzo rozrzucone).
    4.  Skakanie do `/api/placeholder-image`.
*   **Skala zmian:** 13 różnych plików w głównym branchu i w silniku operuje błędnym zachowaniem (Ekwipunek, Tablica Badacza, Lightbox, Dziennik i Czat).
*   **Rekomendowany krok:** Stworzenie globalnego komponentu `SafeImage` z ładnymi domyślnymi assetami wektorowymi.

---

### Rekomendowany następny krok
Opcja C (Quick win) - Implementacja testów i poprawka w Investigator Board oraz parametrze ery. Opcja globalnego fallbacku UI będzie osobnym zadaniem.
