# Kontrakt: Głęboka mechanika ekwipunku (CoC 7e)

## Cel
Całkowita przebudowa logiki sprzętu, aby była w 100% zgodna z mechaniką Call of Cthulhu 7e i nie gubiła modyfikatorów mechanicznych przy translacji nazw przedmiotów. Głównym celem jest powiązanie `ALL_EQUIPMENT` (z `equipment-data.ts`) z `EQUIPMENT_CATALOG` (z `equipment-catalog.ts`) w jedno rygorystyczne źródło prawdy. 

## Zdiagnozowane Problemy
1. `OCCUPATION_EQUIPMENT` (w `equipment-data.ts`) posługuje się polskimi nazwami (np. "Rewolwer .38").
2. Baza `ALL_EQUIPMENT` posługuje się angielskimi nazwami (".38 Revolver") i przechowuje surowe statystyki broni (`modifiers`).
3. Z powodu błędu translacji `findEquipmentByName` wpada w fallback do `findEquipmentTemplate` (który zwraca tylko templatkę graficzną bez obrażeń i zasiegu broni), całkowicie odcinając broń gracza od rzeczywistych mechanik CoC 7e (damage, malfunction, range) i ratując się jedynie domyślnym wnioskowaniem w `inferWeaponDamage`.
4. System wydatków na start i podczas gry nie integruje się z Credit Rating tak jak to określa CoC 7e (brakuje mechaniki Spend Levelu przy przypisywaniu wartości przedmiotów, waga udźwigu nadal gdzieś jest widoczna, co kłóci się z 7 edycją).

## Zakres modyfikacji
1. Przebuduj `equipment-data.ts` i `equipment-catalog.ts`: Zunifikuj listę przedmiotów tak, by `EquipmentTemplate` lub `EquipmentItem` zawierał WSZYSTKIE informacje (polską nazwę z aliasami, statystyki `modifiers`, epoki, katalog obrazów).
2. Oczyść generowanie ekwipunku: Upewnij się, że generowane przedmioty dostają poprawne `modifiers` bez uciekania do surowych, twardych fallbacków.
3. System ekonomii: Zintegruj lub wyeksponuj powiązania w UI (np. `equipment-modal.tsx`), żeby postać nie tylko widziała swój Credit Rating, ale by to on określał, na co ją stać (usunięcie sztywnych wartości $1 jeśli przedmiot ma cenę historyczną).

## Wymagania
- Kod musi przechodzić `npx tsc --noEmit`.
- Przejście testów jednostkowych: `npm test`.

