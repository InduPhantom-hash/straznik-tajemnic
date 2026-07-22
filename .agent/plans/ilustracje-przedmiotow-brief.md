## Brief: Obowiązkowe Ilustracje Przedmiotów Ekwipunku

**Co**: Usunięcie statycznych ikon SVG z ekwipunku i zagwarantowanie, że każdy przedmiot ma dedykowaną ilustrację WebP z katalogu LUB automatycznie wygenerowany obrazek z API Imagen.
**Jak**: Usuwamy sztywne przypisywanie ścieżek `.svg` jako `imageUrl`. Gdy przedmiot nie istnieje w katalogu WebP, `useEquipmentThumbnails` automatycznie wywołuje generację API w tle przy starcie gry.
**Pliki**: `src/lib/equipment-catalog.ts`, `src/lib/immersion/predefined-equipment.ts`, `src/hooks/useEquipmentThumbnails.ts`, `src/components/ui/equipment-modal.tsx`, `src/hooks/useGameStart.ts`
**Test**: `npm test -- equipment-catalog` + `npx tsc --noEmit`
**Ryzyko**: Zwiększona liczba żądań do API Imagen w tle po rozpoczęciu przygody dla unikalnych przedmiotów (zabezpieczone limitem 12 sztuk na raz).
