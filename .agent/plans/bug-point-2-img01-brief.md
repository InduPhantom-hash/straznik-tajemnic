## Brief: Naprawa pętli generowania i brakujących grafik ekwipunku [IMG-01]
**Co**: Usunięcie pętli retries przy generowaniu grafik ekwipunku w tle oraz przypisanie statycznych obrazków z katalogu.
**Jak**: Trwałe oznaczanie nieudanych prób generowania AI (`visualSource: 'fallback'`) w `useEquipmentThumbnails.ts` oraz rozbudowa bazy statycznej w `equipment-catalog.ts`.
**Pliki**: `useEquipmentThumbnails.ts`, `equipment-catalog.ts`, `generate-starting/route.ts`.
**Test**: `npm test` dla testów unitowych ekwipunku i hooków.
**Ryzyka**: Brak (zmiana wyłącznie defensywna i eliminująca koszty).
