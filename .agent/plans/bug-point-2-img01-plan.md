## Plan: Naprawa pętli generowania i brakujących grafik ekwipunku [IMG-01]
Data: 2026-07-23  
Złożoność: Średnia  

### Problem
Przedmioty w ekwipunku bez przypisanych gotowych grafik WebP wchodzą w pętlę nieudanych prób generowania miniaturek przez AI w tle (np. przy braku klucza API/quoty), generując niepotrzebne koszty zapytań HTTP oraz utknięcie na placeholderach.

### Rozwiązanie
1. Przypisywanie statycznych grafik z katalogu `equipment-catalog.ts` (lub ikona kategorialna SVG/WebP) bezpośrednio przy tworzeniu przedmiotów startowych w `/api/equipment/generate-starting`.
2. Trwałe oznaczanie nieudanych prób w hooku `useEquipmentThumbnails.ts` (`visualSource: 'fallback'`), aby zapobiec ponawianiu zapytań w pętli przy kolejnych renderach.
3. Rozbudowa słownika aliasów w `equipment-catalog.ts` dla polskich nazw z generatora zawodów CoC 7e.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/hooks/useEquipmentThumbnails.ts` | Trwały fallback i ochrona przed pętlą retry przy niepowodzeniu API (`generateOneThumbnail`) | Niskie |
| `_tester/_base/.silnik/src/lib/equipment-catalog.ts` | Rozbudowa szablonów i dopasowań polskich nazw przedmiotów do katalogu | Niskie |
| `src/app/api/equipment/generate-starting/route.ts` | Przypisywanie domyślnych grafik katalogowych przy generowaniu startowym | Niskie |

### Fazy implementacji

**Faza 1: Ochrona przed pętlą retry w tle**
- [ ] Modyfikacja `useEquipmentThumbnails.ts`: obsługa braku wyniku `generated` przez zmianę źródła przedmiotu na `visualSource: 'fallback'`.
- Weryfikacja: Przedmiot po nieudanej próbie generowania usuwa się z listy `pending` i nie ponawia zapytań.

**Faza 2: Statyczne grafiki dla generatora startowego**
- [ ] Aktualizacja `equipment-catalog.ts` o aliasy polskich przedmiotów startowych (*Koperty na dowody*, *Zniszczona odznaka*, *Pistolet sygnalizacyjny* itd.).
- [ ] Aktualizacja `generate-starting/route.ts` o przypisanie `resolveEquipmentAsset` / `withEquipmentDefaults`.
- Weryfikacja: Nowa postać otrzymuje grafiki dla przedmiotów od razu przy wygenerowaniu.

### Weryfikacja końcowa
- `npm test -- _tester/_base/.silnik/src/hooks/useEquipmentThumbnails.test.ts`
- `npm test -- _tester/_base/.silnik/src/lib/equipment-catalog.test.ts`
- `npm test -- _tester/_base/.silnik/src/app/api/equipment/generate-starting/route.test.ts`

### Co może się zepsuć
- Przypadkowe ponowne generowanie grafik dla przedmiotów, które mają już poprawną grafikę katalogową WebP (ryzyko niskie – chronione przez `visualSource: 'catalog'`).
