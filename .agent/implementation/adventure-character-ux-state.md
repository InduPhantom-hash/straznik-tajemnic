# Stan implementacji: wybór przygód i postaci

- Data: 2026-07-17
- Punkt bazowy: `504a35d0eeaf133a8591f72f451d281e62bbfcc6`
- Aktywna gałąź: `codex/duet-catalog-integration`
- Źródło aplikacji śledzone przez Git: `_tester/_base/.silnik/`

## Stan wyjściowy

- Test `bottom-links.test.tsx`: PASS (1/1)
- TypeScript `npx tsc --noEmit`: PASS
- Drzewo robocze przed implementacją: czyste

## Fazy

1. Jawne przypisanie postaci w duecie - zakończone, testy PASS 4/4
2. Katalog gotowych badaczy - zakończone, testy PASS 7/7, 26 portretów WebP
3. Karty przygód i górny pasek - zakończone, testy PASS 3/3
4. Test integracyjny i paczka - zakończone

## Weryfikacja końcowa

- Jest: PASS 9 zestawów / 19 testów
- Playwright zimnego startu: PASS 2/2 (Chromium)
- TypeScript: PASS
- ESLint zmienionych plików: 0 błędów, 3 wcześniejsze ostrzeżenia hooków w `page.tsx`
- Produkcyjny build Next.js: PASS (61 stron)
- Regresje launcherów Mac/Windows: PASS
- Paczka: `_tester/dist/Straznik-Tajemnic-AI-0.9.0-beta-Win-Mac-2026-07-17.zip`
- Paczka: 26/26 portretów WebP, brak placeholderów i danych runtime
- SHA-256: `5b72dde9f8b05c28c82087f11026d894dc31276b9ad3f0be885ab45cdd5007cf`
