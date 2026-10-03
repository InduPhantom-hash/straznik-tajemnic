# Specyfikacja: Refaktoryzacja Dossier Akt Sprawy i Wyświetlania Fotografii (Opcja A - dev-loop)

## 1. Cel
Zapewnienie bezbłędnej czytelności i immersji w widoku Akt Sprawy (Dossier - `discoveries-view.tsx`):
1. Likwidacja ucinania nagłówków i pieczątek przy przewijaniu.
2. Zastąpienie poziomych wycinków 16:9 klasycznymi pionowymi polaroidami retro (proporcje 3:4 / 4:5).
3. Całkowite usunięcie pustych, sztucznych zaślepek fotografii ("Plan terenu", "Akta osobowe") - czysty tekst na pełną szerokość, gdy brak zdjęcia.
4. Czyszczenie danych testowych z nieadekwatnych assetów ekwipunku przypisanych do lokacji.

## 2. Architektura i Zmiany w Kodzie

### 2.1. `discoveries-view.tsx`
- **Reset pozycji przewijania:** Dodanie `useRef<HTMLDivElement>(null)` do prawego panelu dossier oraz `useEffect` ustawiającego `scrollTop = 0` przy każdej zmianie `selectedEntryId` oraz `activeCategory`.
- **Usunięcie sztucznych placeholderów polaroidowych:** Usunięcie bloków `activeCategory === 'places'`, `characters`, `items` renderujących sztuczne atrapy zdjęć. Gdy `resolvedVisual` jest `null`, sekcja notatek, wniosków i tagów rozszerza się naturalnie na całą szerokość teczki.
- **Pionowy Polaroid Retro:** Gdy `resolvedVisual?.imageUrl` istnieje:
  - Zastosowanie stałej, eleganckiej szerokości `w-48 sm:w-52` i proporcji `aspect-[3/4]`.
  - `SafeImage` z `w-full h-full object-cover object-top`.
  - Biała retro-ramka polaroida z cieniem, spinaczem i podpisem `Załącznik A :: [Tytuł]`.
- **Harmonijny układ:** Czyste ułożenie `float-right ml-6 mb-4` lub układ flex/grid, z zachowaniem marginesów dla boxu dedukcji i tagów.

### 2.2. `test-journal-data.ts`
- Oczyszczenie wpisów testowych:
  - Usunięcie `imageUrl: '/equipment/catalog/map-shared.webp'` z `Dom Corbitta (Harrison St., Boston)`.
  - Usunięcie `imageUrl: '/equipment/catalog/photo-shared.webp'` z `Biblioteka Uniwersytetu Miskatonic`.
  - Zachowanie właściwych portretów postaci (`Seraphina Marsh`, `Profesor Henry Armitage`, `Walter Corbitt`) oraz rekwizytów (`Zwęglony Dziennik`, `Srebrny Klucz`).

### 2.3. `session-journal.tsx`
- Zoptymalizowanie wysokości i marginesów modala `Dziennik Sesji` (`h-[90vh] w-[90vw] max-w-6xl`), zapobieganie obcinaniu stopki teczki dossier.

## 3. Weryfikacja (CI / The Checker)
1. `npx tsc --noEmit` -> 0 błędów.
2. `npm test` -> 100% testów jednostkowych przechodzi.
3. Przebudowa produkcyjna `bash desktop/build-app.sh --rebuild`.
