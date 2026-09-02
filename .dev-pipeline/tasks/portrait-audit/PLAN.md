# Audyt i krytyczne naprawy portretów predefiniowanych

## Cel

Zweryfikować kompletność i poprawność przypisań portretów wszystkich aktywnych presetów. Przed wydaniem v0.9.4 naprawić wyłącznie brakujące pliki, błędne mapowania i oczywiste anachronizmy. Pozostałe regeneracje utworzyć jako zatwierdzony backlog.

## Zakres

- Źródła postaci: `src/data/predefined-characters.ts` i `src/data/strefa-11-characters.ts`.
- Źródła assetów: `public/images/portraits/predefined/`.
- Inwentaryzacja obejmuje 30 postaci uniwersalnych, 16 postaci Strefy 11 i wszystkie istniejące pliki portretów.
- Dla każdego presetu raport zapisuje: ID, nazwę, profesję, epokę, scenariusz, `portraitUrl`, istnienie pliku, hash, wymiary, duplikaty i decyzję.
- Dozwolone decyzje: `keep`, `remap`, `regenerate`, `quarantine`.
- Kryteria wizualne: wiek i wygląd, profesja, ubiór i fryzura, region i dokładny rok, realizm, anatomia, twarz, kadr w UI i unikalność.
- Standard: dokumentalny portret głowa plus tors, dyskretne tło zawodowe, bez grozy i nadprzyrodzoności.
- Powstają kontaktowe arkusze według epoki i scenariusza oraz raport w `docs/audits/portraits/`.
- Nie nadpisywać zatwierdzonego assetu. Kandydat trafia do gry dopiero po jawnej akceptacji PO.
- Nie usuwać osieroconego pliku bez potwierdzenia, że nie używa go runtime, test ani dokumentacja.

## Kolejność

1. Zbudować maszynową inwentaryzację referencji i plików.
2. Wykryć braki, wielokrotne użycie, identyczne hashe i pliki bez referencji.
3. Wygenerować arkusze kontaktowe i przeprowadzić ocenę wizualną.
4. Przedstawić listę zmian `remap` do akceptacji PO.
5. Po akceptacji zmienić wyłącznie `portraitUrl` i dodać test kompletności.
6. Regeneracje i kwarantannę pozostawić jako osobne zadania po v0.9.4.

## Walidacja

- Test sprawdza, że każdy aktywny preset wskazuje istniejący lokalny plik.
- Test wykrywa przypadkowe współdzielenie portretu przez różne aktywne postacie.
- Raport podaje dokładne liczby presetów, assetów, braków, duplikatów i osieroconych plików.
- PO czyta arkusze kontaktowe przed zmianą przypisań.

## Kryteria akceptacji

- Zinwentaryzowano 46 aktywnych presetów i wszystkie pliki portretów
- Każdy aktywny preset ma istniejący, jednoznaczny asset i decyzję keep/remap/regenerate/quarantine
- Powstał raport i kontaktowe zestawienie do akceptacji PO
- Zmiany v0.9.4 ograniczają się do oczywistych błędów przypisań i braków
