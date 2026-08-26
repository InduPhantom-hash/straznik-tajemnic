# Kontrakt Wykonawczy: Faza 3 - Abstrakcja Mechaniki (Klucze)

## Cel
Oderwanie mechaniki rzutów kośćmi, statystyk i umiejętności od twardo wpisanych, polskich stringów (np. "Siła", "Poczytalność", "Rzut na Walkę Wręcz"). Z racji odrzucenia kompatybilności starych save'ów, refaktoryzujemy kod na używanie generycznych, angielskich identyfikatorów/kluczy (np. `stat_str`, `stat_san`, `skill_brawl`).

## Zakres plików (Blast Radius)
- `src/types/types.ts`
- `src/lib/dice-utils.ts`
- `src/lib/character-development.ts`
- `src/lib/campaign-stats.ts`
- Dowolne powiązane komponenty, w których rzuty są wyświetlane (np. `src/components/desk/CharacterTab.tsx` jeśli wymaga uaktualnienia interfejsu atrybutów).

## Instrukcja
1. Zmień definicje typów w `src/types/types.ts` z polskich nazw na stałe klucze. Zamiast `Siła` -> `STR`, `Zręczność` -> `DEX`, `Poczytalność` -> `SAN`.
2. Zaktualizuj system rzutów w `dice-utils.ts` by przyjmował klucze, a nie nazwy wyświetlane.
3. Jeśli funkcja zwraca string dla UI ("Rzut na Zręczność"), zmień to na zwracanie obiektu lub klucza, który komponent na froncie sobie zinterpretuje i przekaże do `useTranslations()`. 
4. Uzupełnij `messages/pl.json` oraz `messages/en.json` o sekcję `"Stats": { "STR": "Siła", "DEX": "Zręczność", ... }`.
5. Po zakończeniu refaktoryzacji, bezwzględnie odpal `npx tsc --noEmit` i napraw wszystkie błędy typów (których będzie dużo z racji zmiany interfejsów postaci).
6. Odpal `npm test` by potwierdzić stabilność mechaniki.
