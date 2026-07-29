## Podsumowanie sesji: 2026-07-27 (Noc II)
Branch: main

### Co zrobiono
- **Przesyłanie `characterId` w Hot Seat:** Naprawiono błąd gubienia identyfikatora postaci wybranej z listy rozwijanej podczas podnoszenia przedmiotu na czacie.
- **Aktualizacja sygnatur typów:** Rozszerzono `ChatWindowProps` i `MessageCardProps` o opcjonalny parametr `characterId?: string` w `onConfirmAcquiredItem`.
- **Prop-drilling i domknięcie TODO:** Przekazano `characterId` w `message-card.tsx` z `AcquiredItemCard` wyżej w hierarchii aż do gotowego hooka `useChat.ts`.
- **Weryfikacja:** Wykonano udaną kompilację produkcyjną `npm run build` (TypeScript PASS).

### Co otwarte (do następnej sesji)
- Dalsze wsparcie / stabilizacja Tablicy Badacza & Ekwipunku według Roadmapy v0.9.3.
- Rozważenie implementacji wersji angielskiej EN / Multi-LLM BYOK.

### Decyzje podjęte
- Zachowano pełną wsteczną kompatybilność dzięki opcjonalnemu charakterowi parametru `characterId?: string`.

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
## Podsumowanie sesji: 2026-07-27
Branch: main

### Co zrobiono
- **equipment-detail-dialog.tsx**: Rozszerzono modal do formatu szerokoekranowego (90vw) z immersyjnym tłem (rozmycie + mosiężne ramki).
- Zintegrowano `DiegeticDocumentViewer` poprzez nałożenie `max-w-4xl` wewnątrz powiększonego dialogu ekwipunku w celu bezpiecznego utrzymywania layoutów dokumentów.
- **predefined-characters-selector.tsx**: Zmodyfikowano kafelki Ekwipunku gracza (mroczne gradienty na najechanie kursorem, mosiężne retro cieniowanie).

### Co otwarte (do następnej sesji)
- Globalny refactor generycznego fallbacku dla brakujących obrazków (obecnie radzi sobie z tym inline `onError`).



## Podsumowanie sesji: 2026-07-29 13:02
Branch: main

### Co zrobiono
- Zaktualizowano i ustrukturyzowano żądania API Gemini (responseMimeType: 'application/json').
- Silne typowanie węzłów i zabezpieczenie parsera PDF (route.ts, AdventureGraph).
- Aktualizacje w fallbackach dla własnych przygód oraz we wstrzykiwaniu do bazy wektorowej (useCustomAdventures.ts, retrieval-service.ts, vector-types.ts).
- Dodano brakujące interfejsy dla zdarzeń dziennika oraz obrazów w starszych modułach.

### Co otwarte (do następnej sesji)
- Usunięcie wielu nagromadzonych błędów, zgłoszonych przez Użytkownika. Nowa sesja intake'owa przedstawi problemy i przydzieli tickety.

## Podsumowanie sesji: 2026-07-29 (Sekcja 1 UI/UX)
Branch: main

### Co zrobiono
- Naprawiono brakujące zmienne dla scrollbarów w jasnym motywie (`globals.css`)
- Przywrócono widżet pogody z ikony `lucide-react` w pełnym trybie zegara (`campaign-clock.tsx`)
- Wdrożono szczelniejszy regex odcinający logi modelu z obrazami "Prompt LLM: " + wprowadzono nowe instrukcje testowe.

### Co otwarte (do następnej sesji)
- Sekcja 2 Roadmapy (Ekwipunek i Finanse).

### Decyzje podjęte
- Zmiany zatwierdzono semantycznie.

