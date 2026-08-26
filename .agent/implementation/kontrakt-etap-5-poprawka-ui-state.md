# Stan implementacji: kontrakt etap 5 - poprawka UI

Data: 2026-08-25
Faza bieżąca: 1 - poprawka UI językowego
Status: częściowo wykonana - blokada zgodności kontraktu

## Stan wyjściowy

- Kontrakt: `.aios/kontrakt-etap-5-poprawka-ui.md`, v3.
- Runtime: `_tester/_base/.silnik/`.
- `CLAUDE.md`: nie występuje w repozytorium ani runtime.
- Worktree zawiera liczne niezwiązane zmiany użytkownika, w tym bieżące zmiany i18n oraz Karty Badacza. Nie wolno ich nadpisywać.
- Zakres fazy: przywrócenie renderowania `SheetEquipment`, lokalizacja wyłącznie presetów systemowych po stabilnym identyfikatorze, test jednostkowy granicy oraz dedykowany Playwright EN ze stałym screenshotem.

## Wykonane w fazie

- `SheetEquipment` wrócił do faktycznej Karty Badacza wraz z callbackiem do dialogu szczegółów.
- Etykieta umiejętności broni palnej korzysta z `next-intl`.
- Dedykowany Playwright zapisuje deterministyczny zrzut EN i asercjuje etykiety oraz brak wskazanych polskich tekstów.

## Walidacja

- `npx tsc --noEmit`: PASS.
- `npm test -- --runInBand`: PASS, 63 zestawy / 250 testów.
- `npx playwright test tests/e2e/locale-character-sheet.spec.ts --project=chromium`: PASS, 1/1.
- `npm run qa:e2e`: FAIL, 8/14 scenariuszy. Awarie obejmują stare scenariusze ładowania, czatu, kreatora, ustawień i TTS; dedykowany test kontraktu przechodzi niezależnie.
- Zrzut: `_tester/_base/.silnik/test-results/locale-character-sheet-en.png`, obejrzany ręcznie. Widać EN `Equipment`, `Weapons`, `Damage`, `Range`, `Gear` i `Firearms`.

## Blokada

- Kontrakt wymaga pełnej lokalizacji tekstów wszystkich systemowych presetów TS, również ich nazw, opisów i ekwipunku. Zastany kod lokalizuje tylko zawód dla 16 presetów po ID. Nie dodano kompletnego katalogu tłumaczeń dla pozostałych tekstów presetów, więc faza nie może być oznaczona jako pełna realizacja kontraktu.

## Kryteria zamknięcia

- `npx tsc --noEmit`
- `npm test`
- `npx playwright test tests/e2e/locale-character-sheet.spec.ts --project=chromium`
- Ręczna inspekcja `test-results/locale-character-sheet-en.png`
