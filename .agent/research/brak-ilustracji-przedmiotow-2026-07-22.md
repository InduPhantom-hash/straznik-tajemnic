# Research: Przyczyna braku wyświetlania ilustracji przedmiotów (Brak grafik/ikon zastępczych SVG)

Data: 2026-07-22
Stack: Next.js, React, TypeScript, TailwindCSS, Gemini Imagen API

## 1. Wykryty Root Cause (Główna Przyczyna)

Mechanizm wyświetlania miniatur ekwipunku składa się z trzech poziomów:
1. **Gotowe grafiki z katalogu WebP** (`/equipment/catalog/*.webp` - 35 sztuk)
2. **Dynamicznie generowane obrazki AI w tle przez Imagen/Flux** (`useEquipmentThumbnails.ts`)
3. **Lokalne ikony SVG jako fallback w `predefined-equipment.ts`** (`/equipment/predefined/*.svg`)

Wystąpiły dwa nakładające się błędy architektoniczne:

### A. Brak dopasowania w katalogu gotowych WebP (`equipment-catalog.ts`)
Presety postaci (np. Agnes Mason) posiadają przedmioty o nazwach:
- `"Gogle i skórzana pilotka"`
- `"Klucz francuski"`
- `"Mapy lotnicze regionu"`
- `"Pudełko zapałek"`
- `"Dokumenty i bilety"`
- `"Mocna lina"`
- `"Opatrunek uciskowy"`

W `EQUIPMENT_CATALOG` przedmioty takie jak "Mocna lina" mają alias `"Mocna lina"`, ALE w `predefined-equipment.ts` funkcja `withLocalImage()` wpisuje na sztywno:
`imageUrl: CATEGORY_IMAGES[catalogItem.category]` (czyli np. `/equipment/predefined/personal.svg` lub `tool.svg`).
Przez to przedmiot zostaje uznały za posiadający `imageUrl` (chociaż jest to tylko generyczny plik SVG), a w `useEquipmentThumbnails.ts` warunek sprawdzania katalogowych/istniejących grafik pomija pobieranie prawdziwego WebP lub wygenerowanie obrazu AI!

### B. Przerwanie wywoływania auto-generacji w tle w `useGameStart.ts`
Podczas resetowania ekwipunku na starcie gry (`useGameStart.ts:L296`):
```ts
...(isCatalogEquipment(item) ? {} : { imageUrl: undefined, imagePrompt: undefined })
```
Dla przedmiotów presetu, które miały ustawione `imageUrl: '/equipment/predefined/tool.svg'`, `isCatalogEquipment` zwracało `true` (ponieważ `visualSource: 'catalog'`), co zapobiegało zresetowaniu `imageUrl` do `undefined`. W efekcie w grze przedmiot na zawsze zostawał z ikoną SVG zegarka/zegara/skrzynki zamiast otrzymać ilustrację WebP lub obrazek AI.

---

## 2. Obszar problemu i dotknięte pliki

1. **`src/lib/immersion/predefined-equipment.ts`**
   - Na sztywno przypisuje ścieżki SVG z `CATEGORY_IMAGES` zamiast pozwolić `applyCatalogTemplate` na prawidłowe rozwiązanie assetu z `/equipment/catalog/` (np. `matches-shared.webp`, `rope-shared.webp`, `bandages-shared.webp`, `letter-shared.webp`).
2. **`src/lib/equipment-catalog.ts`**
   - Brakuje aliasów dla przedmiotów startowych z presetów postaci (np. `Klucz francuski` -> `mechanical-kit`, `Gogle i skórzana pilotka` -> `personal`, `Mapy lotnicze regionu` -> `map`).
3. **`src/hooks/useEquipmentThumbnails.ts`**
   - Traktuje ikony SVG z `/predefined/` jako w pełni obsłużone ilustracje zamiast zastępników wymagających podmienia na obrazki WebP / AI.
4. **`src/components/ui/equipment-modal.tsx`**
   - Komponent `ItemThumbnail` wyłącza przycisk "Generuj" (`canGenerate = !isCatalogEquipment(item)`), nawet gdy przedmiot nie posiada jeszcze dedykowanej ilustracji.

---

## 3. Rekomendowany Plan Naprawy

1. **Poprawa mapowania katalogu `equipment-catalog.ts`**:
   - Dodanie aliasów dla unikalnych przedmiotów presetu do odpowiednich szablonów w katalogu WebP.
2. **Poprawa `predefined-equipment.ts`**:
   - Usunięcie sztywnego nadpisywania `imageUrl` przez pliki SVG kategorii. Prawidłowa hierarchia: `Catalog WebP` -> `Generated AI` -> `Category SVG Icon (fallback UI render only)`.
3. **Odblokowanie przycisku i auto-generacji**:
   - Pozwolenie graczowi na wygenerowanie własnej ilustracji AI dla dowolnego przedmiotu, jeśli ten posiada jedynie generyczną ikonę SVG kategorii.

---

## 4. Rekomendowany Następny Krok
Przejście do fazy planowania i implementacji w `/dev-2-plan`.
