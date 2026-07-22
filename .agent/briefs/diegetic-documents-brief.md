## Brief: System Renderowania Diegetycznych Rekwizytów
**Co**: Wdrożenie dedykowanego komponentu visual-prop (`DiegeticDocumentViewer`) do renderowania realistycznych kształtów rekwizytów (legitymacja prasowa ze zdjęciem postaci, teczka akty/dowodów policyjnych, list z papierem czerpanym i znaczkiem, pismo rządowe).
**Jak**: Rozszerzenie `EquipmentItem` o `documentType`, dedykowane układy HTML/CSS w klimacie Dark Art Déco oraz podpięcie pod `EquipmentDetailDialog`.
**Pliki**: `src/lib/types.ts`, `src/lib/acquired-equipment.ts`, `src/components/ui/diegetic-document-viewer.tsx` [NEW], `src/components/ui/equipment-detail-dialog.tsx`.
**Test**: `npx tsc --noEmit` oraz testy jednostkowe `equipment-detail-dialog.test.tsx`.
**Ryzyka**: Wyświetlanie przy braku portretu badacza (rozwiązane przez sylwetkowy placeholder).
