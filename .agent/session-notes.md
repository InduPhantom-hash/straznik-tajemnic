# Session Notes

## Podsumowanie sesji: 2026-07-19 (Sesja 8)
Branch: main

### Co zrobiono
- Przemodelowano roadmapę prac wokół katalogu ekwipunku, czytalnych dokumentów i późniejszej przebudowy dziennika.
- Zapisano plan i brief: `ekwipunek-katalog-dokumenty-dziennik-plan.md` oraz `ekwipunek-katalog-dokumenty-dziennik-brief.md`.
- Zweryfikowano, że szybki toggle `Obrazy: Wł/Wył` jest już w kodzie, ale użytkownik nie widzi go w działającej aplikacji.
- Zweryfikowano, że Hot Seat nie powinien być ustawieniem kosztowym i wymaga osobnego sprawdzenia widoku/runtime.
- Zweryfikowano, że poprawa ikony jest już obecna w skrypcie; temat pozostaje zamknięty do czasu nowej obserwacji wizualnej.

### Co otwarte (do następnej sesji)
- Najpierw znaleźć, dlaczego działająca aplikacja nadal pokazuje Hot Seat zamiast toggle `Obrazy: Wł/Wył`.
- Uruchomić właściwą powierzchnię aplikacji i sprawdzić, czy problemem jest nieaktualny build, źródło `_tester/_base/.silnik/` albo ścieżka renderowania ustawień.
- Dopiero po naprawie widoczności toggle przejść do researchu katalogu ekwipunku.

### Decyzje podjęte
- Kolejność: szybkie poprawki UX -> lokalny katalog ekwipunku -> czytalne przedmioty fabularne -> dziennik.
- Nie generować ponownie powtarzalnych przedmiotów startowych; docelowo mają być lokalnymi lekkimi assetami.
- Dokumenty i listy mają mieć osobną treść generowaną kontekstowo i akcję `Przeczytaj`.
- Dziennik nie będzie przebudowywany w ramach ekwipunku, tylko jako późniejszy osobny etap.

## Podsumowanie sesji: 2026-07-18
Branch: codex/duet-catalog-integration

### Co zrobiono
- Naprawiono przycięcie spodu i góry w karcie postaci (modal wyboru badacza) poprzez usunięcie my-auto z flex kontenera z overflow-y-auto i zastąpienie go bezpiecznym paddingiem.
- Naprawiono podobne ucięcie w modalu szczegółów przedmiotu w ekwipunku (zamiana overlay items-center na items-start z paddingiem, h-fit, oraz optymalizacja proporcji obrazu do aspect-[4/3]).
- Rozwiązano problem z brakiem aktualizacji fotografii (portretu) przy przełączaniu między postaciami w sesji gry - rozdzielono useEffect na synchronizację parametrów i osobną hydratację z IndexedDB odpalaną na zmianę ID (characterId), oraz dodano stabilny key={display.id} dla SheetHeader.
- Wykryto i zachowano wcześniejsze modyfikacje dewelopera w app/api/desktop/cold-start/route.ts.

### Co otwarte
- Weryfikacja poprawności pozostałych elementów modali na bardzo małych rozdzielczościach ekranu (responsive mobile).

### Decyzje podjęte
- Wykorzystano micro-split stanów w komponencie CharacterSheet do separacji operacji I/O (hydratacji obrazków z IndexedDB) od zwykłych aktualizacji zmiennych stanu (takich jak modyfikacje parametrów/PŻ/PR/PM).

## Podsumowanie sesji: 2026-07-18 (Sesja 2)
Branch: codex/duet-catalog-integration

### Co zrobiono
- Wyczyszczono pasek boczny poprzez usunięcie widgetu `PlayerSwitcher` z CthulhuSidebar.tsx.
- Zintegrowano przełączanie aktywnego gracza Hot Seat z wierszem tury nad polem czatu w message-input.tsx (plakietki "Czeka: {name}" są teraz klikalnymi przyciskami).
- Dodano przycisk zamknięcia `✕` wyłączający tryb Hot Seat bezpośrednio w wierszu tury w czacie.
- Przekazano nowe propsy `onSwitchPlayer` i `onDisableHotSeat` przez page.tsx oraz index.tsx.

### Co otwarte
- Brak.

### Decyzje podjęte
- Postanowiono zachować `hotSeatConfig` jako prop w `CthulhuSidebar` z uwagi na logikę wspólnego dziennika gry (`sharedJournal`), która zależy od tego stanu.

## Podsumowanie sesji: 2026-07-18 (Sesja 3)
Branch: main

### Co zrobiono
- **Uzupełnienie biografii**: Naprawiono uszkodzenie danych postaci w pliku [predefined-characters.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/src/lib/immersion/predefined-characters.ts) (naprawa brakujących klamer domykających i sekcji postaci Dr Maya Patel) oraz zsynchronizowano te zmiany z runtime `.silnik`.
- **Naprawa przewijania karty postaci**: Poprawiono klasy w obu plikach `predefined-characters-selector.tsx` na `items-start justify-center` z marginesem wewnętrznym, eliminując błąd ucinania góry modalu.
- **Kompilacja i Build**: Zweryfikowano poprawność kompilacji TypeScript oraz przeprowadzono pełny build projektu Next.js z sukcesem.

### Co otwarte (do następnej sesji)
- Dalsze manualne testy z poziomu aplikacji.

### Decyzje podjęte
- Zastosowano pozycjonowanie `items-start` na flex-overlay modalu w celu umożliwienia prawidłowego przewijania elementów o wysokości większej niż wysokość ekranu (viewport).

## Podsumowanie sesji: 2026-07-18 (Sesja 4)
Branch: feature/duet-starting-prompt

### Co zrobiono
- **Miniatury ekwipunku (Faza 1)**: Zamieniono generyczny placeholder `◆` na ikony kategorii Lucide (`Sword`, `Shield`, `Wrench`, `FileText`, `Sparkles`, `User`, `HeartPulse`, `Flame`, `Package`) w `equipment-modal.tsx` i `sheet-equipment.tsx`. Nowy styl: `bg-gradient-to-br from-[#1c1712] to-[#0f0b07]`, `border-brass/30`, `shadow-md`, `text-brass/70`. W modalu ekwipunku hover odsłania nakładkę "Generuj".
- **Widok szczegółowy (Faza 3)**: W `equipment-detail-dialog.tsx` zmieniono proporcje obrazu na `aspect-square`, tryb na `object-cover`, dodano wewnętrzną ramkę art deco (`border-brass/25`) i zwiększono max-h do 380px.
- **Naprawa testów (Faza 4)**: Poprawiono 3 czerwone testy:
  - `predefined-characters.test.ts`: asercja długości rosteru 26 → 30.
  - `sheet-biography.test.tsx`: fixture na minimalny obiekt testowy trafiający w fallback "Tło Postaci".
  - `onboarding-buttons.test.tsx`: etykieta "Gotowa" → "Wybierz".
- **Wynik**: 18/18 suites, 41/41 tests passed.

### Co otwarte
- Brak - plan inventory-ui-plan.md w pełni zrealizowany.

### Decyzje podjęte
- Ikony kategorii jako komponent `CategoryIcon` (switch po category string) - reużywalna funkcja w obu plikach.
- W sheet-equipment.tsx placeholder jest czysto prezentacyjny (bez generowania) - dlatego brak nakładki hover "Generuj" (to robi modal/hook).

## Podsumowanie sesji: 2026-07-18 (Sesja 5)
Branch: feature/duet-starting-prompt

### Co zrobiono
- Zdiagnozowano i naprawiono desynchronizację między wersją testową a produkcyjną komponentu predefined-characters-selector.tsx.
- Dodano do produkcji: import EquipmentDetailDialog i EquipmentItem, stan selectedItem, klikalne przedmioty ekwipunku z hover efektem i płynną animacją.
- Pliki _tester/_base/.silnik/ i src/ są teraz w 100% identyczne (diff = pusty).
- Zamknięto plan full-character-sheet-preview - zapisano state.md.

### Co otwarte (do następnej sesji)
- przelacznik-hot-seat-brief.md - jest brief, brak planu i implementacji.
- Testy manualne aplikacji (otwarte od sesji 3).

- Plan full-character-sheet-preview był de facto już zrealizowany w poprzednich sesjach - brakował tylko sync jednego importu i state file.

## Podsumowanie sesji: 2026-07-19 (Sesja 6)
Branch: main

### Co zrobiono
- **Porządki w Sidebarze**: Wyśrodkowano logo gry i napisy w nagłówku sidebaru. Usunięto przycisk Hot Seat z sidebaru (ustawienie to jest wybierane na starcie przygody).
- **Toggle Obrazków**: Dodano szybki przełącznik generowania ilustracji scen bezpośrednio w panelu Ustawień sidebaru, co ułatwia zarządzanie kosztami API.
- **Naprawa Mute Lektora**: Zintegrowano natychmiastowe zatrzymywanie odtwarzanego dźwięku (`tts.stopCurrentAudio()`) w momencie wyłączenia lektora w sidebarze, wraz z reaktywnym useEffect w hooku `useTTS.ts`.
- **Weryfikacja**: Pomyślnie uruchomiono i zaliczono pełny pakiet testów jednostkowych i integracyjnych (41/41 testów passed).

### Co otwarte (do następnej sesji)
- Manualne testy w przeglądarce.
- Integracja predefiniowanego katalogu ekwipunku CoC 7e.

### Decyzje podjęte
- Reaktywne wyciszenie w `useTTS.ts` gwarantuje, że jakakolwiek zmiana flag w aplikacji natychmiast ubija aktywne audio, co zapobiega zjawisku doczytywania trwającego akapitu po wyciszeniu lektora.

## Podsumowanie sesji: 2026-07-19 (Sesja 7)
Branch: main

### Co zrobiono
- Uproszczono zegar kampanii: usunięto pogodę z widoku i powiązany przepływ danych.
- Naprawiono trzy błędy TypeScript: nieaktualny prop zegara, brakujący typ ustawień AI oraz kolejność reaktywnego wyciszania lektora.
- Weryfikacja: TypeScript bez błędów, pełne testy 41/41.

### Co otwarte (do następnej sesji)
- Manualny test aplikacji w przeglądarce.
- Integracja predefiniowanego katalogu ekwipunku CoC 7e.

### Decyzje podjęte
- Pogoda przestaje być parsowana i przekazywana tylko po to, by wyświetlić ją w zegarze.
- Funkcja zatrzymująca lektora jest deklarowana przed efektem, który ją wywołuje.
