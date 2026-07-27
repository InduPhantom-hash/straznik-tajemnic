## Podsumowanie sesji: 2026-07-27 (Noc)
Branch: main

### Co zrobiono
- **Przebudowa Dziennika (Odkrycia):** Refaktor `discoveries-view.tsx` na klimatyczne "Akta Śledcze" (jasny twardy papier, czcionka imitująca maszynę do pisania Special Elite, pieczątka poufne, polaroidy dopinane spinaczem).
- **Auto-Loot na czacie:** Uproszczenie `acquired-item-card.tsx` dla trybu Solo (dyskretny tekst ładowania w tle) i Hot Seat (skondensowany miniformularz przypisania).
- **Naprawa typów encyklopedii:** Rozszerzono filtry `CATEGORIES` w Dzienniku o powiązanie nowszych (encyclopedia_item) jak i starych kluczy wpisów.
- **Dodanie testów (TDD follow-up):** Dodano plik `discoveries-view.test.tsx` pokrywający nowe interakcje w Dzienniku, testy przechodzą pomyślnie. Zabezpieczono wyszukiwarkę optional-chainingiem.
- Utworzono dokumentację fazy Research i Planów we właściwych lokalizacjach `.agent/`.

### Co otwarte (do następnej sesji)
- Skonfigurować z backendem przesyłanie parametru `characterId` w trybie Hot Seat z miniformularza `acquired-item-card.tsx` (obecnie pozostawiono odpowiednie `TODO` na karcie wyższej - `message-card.tsx`).

### Decyzje podjęte
- Wybrana opcja Auto-Lootu zakłada istnienie mechaniki wyboru postaci tylko w Hot Seat / Duet, z całkowicie przezroczystym automatyzmem dla gracza solowego, niezaśmiecającym UI.

# Session Notes

## Podsumowanie sesji: 2026-07-27 (Wieczór)
Branch: main

### Co zrobiono
- **Ekstrakcja Typów**: Wydzielono `ExtendedJournalEntry` z wnętrza `session-journal.tsx` do globalnego repozytorium `src/lib/types.ts`.
- **Łatanie wycieków do Tablicy**: Do `convert-entries.ts` wprowadzono bezpieczne typy (usunięto `as unknown`) oraz ostatecznie obwarowano przepuszczanie wpisów `journal` i `note`, przez co przestały lądować na siatce Tablicy Badacza.
- **Bezpieczeństwo kordów (Tests)**: Stworzono obszerną suite testową w `convert-entries.test.ts` za pomocą frameworku Jest. Udowodniono działanie persystencji (X,Y) starych kart oraz logiczną izolację nowych wpisów kaskadowych.
- **Zimny Start & Zakończenie**: Wykonano procedurę `/zew-zimny`, przeczyszczono przeglądarkę i cache oraz zrzucono save'y, na koniec przebudowując cały `.app`.

### Decyzje podjęte
- Zablokowano modyfikacje UI logiki `session-journal.tsx` (Rabbit Hole). Konwerter `convertEntriesToBoardNodes` podlega teraz rygorowi typowania z `types.ts`.

## Podsumowanie sesji: 2026-07-27
Branch: main

### Co zrobiono
- **Synchronizacja tagów i Dziennika**: Ujednolicono nazwy tagów między parserem MG (`journal-parser.ts`, `types.ts`) a Dziennikiem Sesji (`session-journal.tsx`), co rozwiązało problem "pustych odkryć" i błędnego domyślnego typu dla nowej notatki.
- **Logika podnoszenia przedmiotów**: Wdrożono autoselekcję dla 1 gracza (Solo) i wybór z listy rozwijanej dla 2+ graczy (Hot Seat/Duet) w `acquired-item-card.tsx`.
- **Wpisy o przedmiotach**: Dodano automatyczne generowanie wpisu typu `item` w Dzienniku po zaakceptowaniu przedmiotu.
- **Czystość Tablicy Badacza**: Odcięto automatyczne trafianie ogólnych wpisów `journal` i `note` na korkową tablicę w `convert-entries.ts`.
- **Redesign UI Dziennika**: Przebudowano interfejs `session-journal.tsx` do ciemnego stylu Art Déco (mosiężne ramki, nagłówki Cinzel, tło zbieżne z Kartą Postaci).
- **Zimny Start**: Wykonano procedurę `/zew-zimny`, pomyślnie zweryfikowano i przebudowano aplikację desktopową.

### Decyzje podjęte
- Notatki gracza oraz ogólne wpisy kroniki nie pojawiają się automatycznie na Tablicy Badacza (wymagają ręcznego powiązania).
- Podniesiony przedmiot automatycznie tworzy notatkę fabularną w zakładce Odkrycia -> Przedmioty.

## Podsumowanie sesji: 2026-07-27
Branch: main

### Co zrobiono
- **Persystencja Tablicy Badacza:** Powstrzymano konwerter `convert-entries.ts` od nadpisywania pozycji kart, zachowując wybrane przez gracza współrzędne (X,Y) po wczytaniu Save'a.
- **Kaskadowe Nowe Dowody:** Nowe dowody trafiają do rogu tablicy, zapobiegając całkowitemu mieszaniu siatki z istniejącymi elementami.
- **Fałszywe Tropy (Red Herrings):** Prompt Mistrza Gry został wzbogacony o dawkowanie "Fałszywych Tropów" z ok. 20% szansą przy zwykłym sukcesie.
- **Oddzielenie Ekwipunku:** Sprzęt użytkowy z generatora nie wpływa na poszlaki.

### Decyzje podjęte
- Zachowano układ Tablicy Badacza jako swobodny layout oparty o Drag&Drop gracza zamiast sztywnej siatki wymuszanej algorytmicznie. Zabezpieczono stary kod.
