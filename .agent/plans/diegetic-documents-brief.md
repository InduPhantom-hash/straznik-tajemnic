## Brief: Dopięcie typu dokumentów w parserze Ekwipunku
**Co**: Dodanie `documentType` do obiektów ekwipunku typu `document`.
**Jak**: Przez destruktyzację i użycie funkcji `inferDocumentType(proposal)` w fabryce przedmiotu (`createAcquiredEquipmentSeed`).
**Pliki**: `src/lib/acquired-equipment.ts`
**Test**: `npx tsc --noEmit`
**Ryzyko**: Minimalne (istnieje defaultowy fallback).
