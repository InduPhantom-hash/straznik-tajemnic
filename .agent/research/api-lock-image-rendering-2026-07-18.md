## Research: Blokada API i Renderowanie Obrazków
Data: 2026-07-18
Stack: React (Next.js), TypeScript, Tailwind CSS, Local Storage, IndexedDB (persistentMediaCache), Gemini API (gemini-2.5-flash-image)

### Obszar problemu
- [_tester/_base/.silnik/src/components/ui/equipment-modal.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/equipment-modal.tsx): Komponent zawierający `ItemThumbnail`, który w swojej wewnętrznej funkcji `useEffect` automatycznie wywoływał `onGenerateImage(item)` dla każdego przedmiotu bez `imageUrl`. Z powodu wielokrotnego montowania komponentu w siatce (grid), wywołania te następowały równolegle, doprowadzając do zablokowania limitów API.
- [_tester/_base/.silnik/src/components/ui/character-sheet/components/sheet-equipment.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/character-sheet/components/sheet-equipment.tsx): Komponent karty postaci, w którym `ItemThumbnail` wyświetlał kręcący się w nieskończoność loader (`Loader2`) zamiast ikony kategorii w przypadku braku wygenerowanego obrazu.

### Zależności
- `/api/imagen` -> `gemini-2.5-flash-image` (Google AI Studio). API to ma restrykcyjne limity na liczbę jednoczesnych połączeń na klucz BYOK/serwerowy.
- `useEquipmentThumbnails` (`useEquipmentThumbnails.ts`): Hook wywoływany w tle po starcie gry, który realizuje sekwencyjne pobieranie grafik (jedna po drugiej) z limitem `MAX_THUMBNAILS = 12`.

### Istniejące testy
- `_tester/_base/.silnik/tests/` zawierają testy integracyjne i E2E (Playwright) dla sesji i dzienników. Zmiana w UI ekwipunku ma charakter czysto prezentacyjny i nie wpływa na logikę biznesową mechaniki gry.

### Ryzyka i uwagi
- Równoległe żądania sieciowe z poziomu komponentów dzieci zawsze doprowadzają do błędu 429 i 500 w `/api/imagen`.
- Brak automatycznego przebudowania Next.js (`npm run build`) po edycji plików źródłowych sprawia, że desktopowy launcher wciąż uruchamia stary build produkcyjny z cache (`.next`), co blokuje wdrażanie poprawek.

### Rekomendowany następny krok
Przejście do fazy planowania i wdrożenia poprawek w ramach kroku `/dev-2-plan`. Plan obejmie:
1. Usunięcie `useEffect` z pojedynczych miniatur `ItemThumbnail` w modalach.
2. Wprowadzenie sekwencyjnej kolejki w rodzicu (`EquipmentModal`) opartej o jeden `useEffect`, który wykrywa brakujące grafiki i przetwarza je jedna po drugiej.
3. Przywrócenie ikon kategorii jako estetycznych placeholderów w `sheet-equipment.tsx`.
4. Uruchomienie pełnego przebudowania aplikacji przez `bash desktop/build-app.sh --rebuild` (lub `npm run build` w katalogu silnika).
