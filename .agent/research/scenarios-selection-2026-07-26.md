# Research: Brak widoczności wbudowanych scenariuszy przygód
Data: 2026-07-26
Stack: Next.js (React / TypeScript / TailwindCSS)

### Obszar problemu
1. **[adventure-selector.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/adventure-selector.tsx)**:
   - Flaga `SHOW_BUILT_IN_ADVENTURES` bazuje na `process.env.NEXT_PUBLIC_LOCAL_MODE === 'true'`.
   - Gdy `NEXT_PUBLIC_LOCAL_MODE` nie jest ustawiony na `'true'`, wbudowane scenariusze z `BUILT_IN_ADVENTURES` są ukrywane.
2. **[adventures-catalog.generated.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/lib/adventures-catalog.generated.ts)** i **[adventures-catalog.public.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/lib/adventures-catalog.public.ts)**:
   - Domyślny import katalogu w wersji publicznej jest pustą tablicą `[]`.
3. **[adventures-data.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/lib/adventures-data.ts)**:
   - Zawiera stałą `STREFA_11_ADVENTURES` (autorskie scenariusze Strefy 11).

### Przyczyna źródłowa
W widoku modalu wyboru w trybie publicznym (`SHOW_BUILT_IN_ADVENTURES = false`) lista scenariuszy podręcznikowych jest ukryta, a autorskie scenariusze Strefy 11 nie były renderowane jako karty wyboru w sekcji scenariuszy.

### Rekomendowany krok
Zgłoszeniegotowe. Wykonanie planu zmian (`/dev-2-plan`).
