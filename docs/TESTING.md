# Testy

## Uruchamianie

```bash
npm test               # testy jednostkowe (Jest)
npx tsc --noEmit       # kontrola typów (TypeScript strict)
npm run lint           # ESLint
npm run build          # build produkcyjny (łapie błędy SSR)
npm run qa:e2e         # testy e2e (Playwright)
```

## Co czym pokrywamy

- **Jest (unit)** - logika domenowa: mechanika kości (`dice-utils`), resolver testów,
  ekonomia/ekwipunek, parsery narracji i tagów, providery AI, hooki. Testy leżą obok
  kodu w `__tests__/`.
- **Playwright (e2e)** - krytyczne ścieżki UI (ustawienia, kreator, sesja) z mockowanym API.

## Zasady

- Każda nowa funkcja domenowa = testy jednostkowe (pure functions najłatwiej testować).
- `npx tsc --noEmit` musi przechodzić na zielono (0 błędów) przed commitem.
- Zmiany UI: uruchom `npm run build` (wyłapuje problemy SSR).

## Husky (hooki Git)

Po `npm install` aktywują się lokalne hooki:

- **pre-commit** → `lint-staged`: ESLint `--fix` + Prettier + `jest --findRelatedTests`
  na zmienionych plikach. Błąd lub failujący test = commit zablokowany.
- **pre-push** → `tsc --noEmit` na całym projekcie. Błąd typów = push zablokowany.

Nie omijaj hooków przez `--no-verify` - jeśli blokują, złapały regresję.
