# KONTRAKT WYKONAWCZY: Zadanie 3 (Stempel powiadomień)

## Cel
Wdrożenie klimatycznego stempla w czacie poinformującego gracza o dodaniu wpisów do akt sprawy (Dziennik/Lokacje).

## Modyfikowane Pliki
1. `src/components/chat/narrative/types.ts`
   - Cel: Dodanie typu `system_stamp` do `SectionType`.
2. `src/components/chat/narrative/cleanup.ts`
   - Cel: Zamiana destrukcyjnego usuwania tagów `[DZIENNIK:]` oraz `[LOKACJA:]` na znacznik `[SYSTEM_STAMP: 📜 Zapisano w aktach sprawy: tytuł]`.
3. `src/components/chat/narrative/parse-sections.ts`
   - Cel: Detekcja nowego znacznika `[SYSTEM_STAMP:]` i zwrócenie nowej sekcji.
4. `src/components/chat/narrative/render-sections.tsx`
   - Cel: Wyrenderowanie specjalnego elementu interfejsu (stempla) dla sekcji typu `system_stamp`.

## Oczekiwany Wynik
- `npm test` przechodzi bez błędów.
- `npx tsc --noEmit` nie zwraca błędów.
- Brak regresji w systemie notatek.

## Walidacja
- [x] TypeScript
- [x] Testy jednostkowe (w tym `cleanup.test.ts`)
