# Dev Research: Rozbudowa biografii predefiniowanych postaci [CHA-01]
Data: 2026-07-23
Stack: Next.js 14, TypeScript, React, Tailwind CSS, Jest

---

## Executive Summary

Zbadano problem zdawkowych biografii 30 predefiniowanych postaci z pliku `src/lib/immersion/predefined-characters.ts` (oraz odpowiednika w `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts`).
Przygotowano wstępną analizę strukturalną i zależności przed przystąpieniem do etapu planowania i pisania bogatych opisów.

---

## 1. Obszar problemu i architektura danych

### Pliki zaangażowane:
- `src/lib/immersion/predefined-characters.ts` - baza 30 postaci dla 3 epok (Gaslight, Classic, Modern).
- `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts` - plik lustrzany w środowisku testowym (wymagana 100% synchronizacja).
- `src/lib/types.ts` - definicja interfejsu `Character` i `PredefinedCharacter`.

### Pola biograficzne i aspekty tła (CoC 7e):
Obecna struktura TypeScript obsługuje następujące pola tła postaci:
1. **Koncept postaci** (`characterConcept`): krótka definicja archetypowa / motyw przewodni.
2. **Wygląd** (`description`): opis cech fizycznych, ubioru, postawy.
3. **Ideologia / Przekonania** (`ideology`): dewiza życiowa i światopogląd.
4. **Ważna osoba** (`significantPerson`): kluczowa postać w życiu badacza i relacja z nią.
5. **Znaczące miejsce** (`meaningfulLocation`): miejsce o wyjątkowym znaczeniu emocjonalnym.
6. **Cenny przedmiot** (`treasuredPossession`): rekwizyt/pamiątka o szczególnej wartości.
7. **Cechy charakteru** (`traits`): tablica przymiotników opisujących osobowość (`string[]`).
8. **Kluczowa więź / Historia** (`backstory` i `background`): obszerna historia opisująca wydarzenia formujące, motywację do badania tajemnic oraz wskazanie kluczowej więzi (np. `[Kluczowa więź: Ważna Osoba - ...]`).
9. **Miejsce urodzenia & zamieszkania** (`birthplace`, `residence`).

---

## 2. Zależności i przepływ danych w UI oraz LLM

### Interfejs użytkownika (UI):
- **Siatka kart wyboru (`predefined-characters-selector.tsx`)**:
  - Pokazuje portret, imię, zawód, wiek, statystyki.
  - Pole `background` jest przycinane do 2 linijek (`line-clamp-2`).
- **Pełnoekranowy modal / Karta Badacza (`predefined-characters-selector.tsx`)**:
  - Posiada 2-kolumnowy układ z niezależnym przewijaniem (`whitespace-pre-line font-serif text-base`).
  - **Brak sztucznych limitów długości**: Rozbudowane, wieloakapitowe opisy tła będą renderowane bez obcinania znaków.
  - Funkcja `asText()` zabezpiecza pole przed nieoczekiwanymi typami obiektowymi.

### Przepływ do stanu gry i promptów AI:
- Wybór postaci kopiuje cały obiekt `PredefinedCharacter` (wraz ze wszystkimi polami tła) do aktywnego stanu gry.
- **`buildIntroPrompt()`** (`useGameStart.ts`): wstrzykuje koncept i historię do tury otwierającej.
- **`build-context.ts`** (`src/app/api/chat/_helpers/`): przekazuje kompletną biografię i wszystkie 8 aspektów tła do systemowego promptu LLM (zarówno w trybie Solo, jak i Duet / Hot Seat).

---

## 3. Istniejące testy i wymagania jakościowe

Pliki testowe:
- `src/lib/immersion/predefined-characters.test.ts`
- `_tester/_base/.silnik/src/lib/immersion/predefined-characters.test.ts`

**Asercje testowe do spełnienia:**
1. Dokładnie 30 postaci (10 Gaslight, 10 Classic, 10 Modern).
2. Długość `background.trim().length > 40` dla każdej postaci.
3. Co najmniej 6 unikalnych przedmiotów ekwipunku per postać.
4. Fizyczna obecność portretów w `public/portraits/predefined/*.webp`.
5. Filtrowanie i podgląd postaci w `predefined-characters-selector.test.tsx` przechodzą pomyślnie.

---

## 4. Ryzyka i uwagi

- **Pojemność tokenowa w promptach LLM**: Bardzo długie opisy dla 2 postaci w trybie Duet będą przesyłane w każdym zapytaniu czatu. Należy zachować zwięzłość przy głębi literackiej (ok. 2-4 akapity per biografia).
- **Synchronizacja plików**: Zmiany w `src/lib/immersion/predefined-characters.ts` muszą być zsynchronizowane z plikiem w `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts`.

---

## 5. Rekomendowany następny krok

Przejście do etapu planowania `/dev-2-plan`, w którym zdefiniujemy szczegółowy szablon rozbudowy oraz harmonogram pisania dopracowanych biogramów dla wszystkich 30 postaci.
