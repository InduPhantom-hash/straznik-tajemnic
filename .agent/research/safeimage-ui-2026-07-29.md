## Research: SafeImage (Globalny Fallback Obrazów)
Data: 2026-07-29
Stack: Next.js 14, React 18, Tailwind CSS, TypeScript

### Obszar problemu
Aplikacja obecnie renderuje grafiki generowane przez AI przy użyciu standardowych tagów `<img />`. W przypadku błędu (np. wygaśnięcia URL-a Gemini, braku sieci), komponenty ładują plik SVG poprzez obsługę inline `onError`. Niestety kod ten jest zduplikowany w 5 plikach, a w przypadku gdy sam plik SVG nie zostanie załadowany, React wpada w infinite loop w evencie renderowania. Z kolei dwa inne pliki w ogóle nie posiadają fallbacku i wyświetlają "złamaną" ikonę przeglądarki.

Pliki objęte problemem:
1. `src/components/ui/equipment-modal.tsx`
2. `src/components/ui/equipment-detail-dialog.tsx`
3. `src/components/ui/investigator-board.tsx`
4. `src/components/ui/session-journal.tsx`
5. `src/components/ui/predefined-characters-selector.tsx`
6. `src/components/ui/diegetic-document-viewer.tsx`
7. `src/components/sidebar/CthulhuSidebar.tsx`

### Zależności
Aby rozwiązać problem, należy wdrożyć jeden, generyczny komponent `SafeImage` (`src/components/ui/safe-image.tsx`).
- Będzie to owrapper dla `<img />` (aby utrzymać hack pozwalający na base64, omijając `next/image`).
- Musi utrzymywać swój wewnętrzny stan `hasError`.
- Wymaga przyjmowania klas (`className`) i innych atrybutów HTMLImageElement (`alt`, `src`), aby ułożenie CSS pozostało nienaruszone.

### Istniejące testy
Dla warstwy czysto wizualnej w głównym katalogu `src/components/` brak jest testów jednostkowych dla zachowania błędów obrazów. Weryfikacja opiera się na ręcznym sprawdzeniu wyrenderowania interfejsu (storybook/lokalny serwer).

### Ryzyka i uwagi
Nowy `SafeImage` musi przepuszczać pod spodem Tailwindowe właściwości layoutu (`w-full`, `h-44`, `object-cover`), aby po wymianie tagów interfejs nie uległ uszkodzeniu. Błąd po stronie CSS może zepsuć m.in. wyliczanie wysokości kart w Tablicy Badacza.

### Rekomendowany następny krok
Gotowi na wdrożenie. Proponuję uruchomienie **/dev-2-plan**, aby przygotować precyzyjny plan dla tego wyizolowanego zadania i zapisać go jako krótki punkt wykonawczy.
