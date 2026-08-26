# Kontrakt: Dynamiczne przypisywanie ekwipunku postaci (Era Consistency)

## 1. Problem
Obecnie `PREDEFINED_CHARACTERS` w `src/lib/immersion/predefined-characters.ts` inicjuje ekwipunek statycznie przy ładowaniu modułu, używając `buildPredefinedEquipment(character)`. Ponieważ wywołanie to zachodzi przed wyborem przygody (i jej docelowej epoki), postacie takie jak Helena Krawczyk otrzymują domyślny ekwipunek z lat 90. Następnie, gdy interfejs (np. `predefined-characters-selector.tsx`) lub kreator postaci w `page.tsx` ponownie próbuje dostosować ekwipunek do epoki przygody, funkcja `buildPredefinedEquipment` otrzymuje "brudny" ekwipunek, z którego nie zawsze da się usunąć przedmioty z nieodpowiedniej epoki. Skutkuje to wyświetlaniem anachronizmów, takich jak telefony komórkowe w przygodach z lat 70.

## 2. Pliki objęte zmianą
1. `src/lib/immersion/predefined-characters.ts`
2. `src/components/ui/predefined-characters-selector.tsx`
3. Opcjonalnie: upewnij się, że testy `predefined-characters.test.ts` lub inne nie polegają na statycznie dodanym ekwipunku podstawowym.

## 3. Wytyczne implementacyjne
- W `src/lib/immersion/predefined-characters.ts` USUŃ mapowanie z użyciem `buildPredefinedEquipment` przy eksporcie `PREDEFINED_CHARACTERS`. Tablica ta powinna zwracać wyłącznie "surowe" definicje: `[...BASE_PREDEFINED_CHARACTERS, ...STREFA_11_CHARACTERS]`.
- W `src/components/ui/predefined-characters-selector.tsx` użyj `buildPredefinedEquipment` dynamicznie podczas renderowania widoku szczegółów postaci. Jeśli nie ma ustalonej `resolvedPresetEra`, wyświetlaj surowy ekwipunek (lub wylicz dla `viewingCharacter.era`).
- Zapewnij, że reszta kodu działa poprawnie (np. upewnij się, że `npm test` przechodzi po tej zmianie).

## 4. Oczekiwany stan końcowy
100% testów przechodzi pomyślnie. Moduł nie "zapycha" bazowego ekwipunku sprzętem wyliczonym dla błędnych epok na etapie uruchomienia silnika gry. Uruchom `npx tsc --noEmit` i `npm test`, aby to zweryfikować.
