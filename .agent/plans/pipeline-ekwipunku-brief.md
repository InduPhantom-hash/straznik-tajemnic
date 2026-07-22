## Brief: Pipeline Generowania, Opisów i Ilustracji Przedmiotów w Ekwipunku

**Co**: Kompleksowe rozwiązanie problemu słabych opisów i wyglądów przedmiotów dynamicznych w ekwipunku poprzez wdrożenie 3-etapowego pipeline'u (polskie aliasy + AI enrichment + bezpieczne renderowanie).
**Jak**:
1. Rozszerzenie słownika `equipment-catalog.ts` o polskie aliasy broni i narzędzi.
2. Endpoint `/api/equipment/enrich` (Gemini Flash) nadający przedmiotom sensoryczne opisy, cenę USD z lat 20. i mechanikę CoC 7e.
3. Przebudowa placeholderów UI w `equipment-modal.tsx` z usunięciem blokady SVG i ikoną Art Déco zamiast surowego klucza `Wrench`.
**Pliki**: `equipment-catalog.ts`, `acquired-equipment.ts`, `equipment-modal.tsx`, `useEquipmentThumbnails.ts`, `src/app/api/equipment/enrich/route.ts`.
**Test**: Testy jednostkowe Jest (`equipment-catalog.test.ts`, `equipment-modal.test.tsx`) oraz kompilacja TypeScript.
**Ryzyko**: Limity Gemini API przy generowaniu obrazów AI – mitygowane sekwencyjną kolejką z pauzą.
