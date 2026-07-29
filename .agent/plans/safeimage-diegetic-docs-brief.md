## Brief: SafeImage i Dokumenty Diegetyczne
**Co**: Wdrożenie bezpiecznego renderowania obrazków oraz naprawa i rozbudowa immersyjnych widoków dokumentów.
**Jak**: Tworzymy `SafeImage` chroniący przed infinite loops (fallback: sepia). Synchronizujemy parser `documentType` z testera do aplikacji i tworzymy layouty (notatnik, bilet).
**Pliki**: 7x modyfikacje UI (`img` -> `SafeImage`), `types.ts`, `acquired-equipment.ts`, `diegetic-document-viewer.tsx`.
**Test**: Pomyślny build TS (`npm run build`) oraz weryfikacja wizualna fallbacków i nowych widoków.
**Ryzyko**: Skomplikowane style CSS dla biletów mogą wymagać dostrajania z modalem ekranowym.
