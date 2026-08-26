# Kontrakt Wykonawczy: Faza 5 - Lokalizacja Treści i Przygód (Lore)

## Cel
Ostatnia warstwa wielojęzyczności, dotycząca treści statycznych i metadanych przygód zawartych w plikach z folderu `src/lib/` (w szczególności `adventures-data.ts`). Zależy nam na tym, by użytkownik po stronie UI widział polskie lub angielskie opisy scenariuszy i archetypów.

## Zakres plików (Blast Radius)
- `src/lib/adventures-data.ts`
- Zależności wykorzystujące `STREFA_11_ADVENTURES`, `CHARACTER_ARCHETYPES` lub inne zmienne z tego pliku.

## Instrukcja
1. Zrefaktoryzuj plik `adventures-data.ts` tak, by obsługiwał oba języki. 
   Masz wolną rękę co do architektury:
   - *Opcja A (preferowana)*: Wydziel struktury językowe do dwóch osobnych plików: `adventures-data-pl.ts` oraz `adventures-data-en.ts` (dokonując profesjonalnego, pełnego tłumaczenia narracyjnego na EN), a następnie zrób funkcję `getAdventuresData(locale)` albo użyj kluczy.
   - *Opcja B*: Wrzuć długie narracyjne opisy do słowników z `next-intl` (`pl.json` i `en.json`) i przetłumacz obiekty w locie za pomocą hooka `useTranslations` po stronie komponentów UI.
2. Niezależnie od wybranej metody, zadbaj o pełne angielskie przetłumaczenie (title, description, themes, suggestedOccupations itp.).
3. Rozwiąż ew. błędy i upewnij się, że inne pliki importujące te dane nie rzucają błędu (np. `src/components/desk/CampaignTab.tsx`).
4. Po wszystkim odpal weryfikację Typescript `npx tsc --noEmit` - wynik musi wynosić 0 błędów. Uruchom również `npm test`. 
