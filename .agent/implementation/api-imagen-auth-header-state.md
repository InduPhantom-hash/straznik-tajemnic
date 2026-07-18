# Stan wyjściowy implementacji: Dopełnienie autoryzacji w żądaniach /api/imagen

Data: 2026-07-18

## Stan testów przed modyfikacją
Weryfikacja za pomocą `npm run test` wykazała:
- Testy ogółem: 18 suite'ów, 1 failed (`onboarding-buttons.test.tsx`), 17 passed.
- Błąd w `onboarding-buttons.test.tsx` jest znany, istniejący w projekcie i niezwiązany z naszym zadaniem.
- Pliki do modyfikacji nie posiadają dedykowanych testów, które ulegałyby awarii.

## Cele do osiągnięcia
- Zastąpienie wywołań `fetch('/api/imagen')` przez `fetchWithApiKeys('/api/imagen')` w plikach:
  1. `_tester/_base/.silnik/src/components/ui/equipment-modal.tsx`
  2. `_tester/_base/.silnik/src/hooks/use-media-cache.ts`
  3. `_tester/_base/.silnik/src/lib/character-portrait-generator.ts`
