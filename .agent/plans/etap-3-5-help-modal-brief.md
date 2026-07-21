## Brief: Wdrożenie Encyklopedii Gracza & Modalu Pomocy (Etap 3.5)
**Co**: Wdrożenie pełnoekranowej encyklopedii wiedzy z 5 zakładkami i zintegrowanym Asystentem RAG.
**Jak**: Rozbudowa `HelpModal.tsx`, dodanie `HelpAssistantTab.tsx` (pytajka AI do RAG) i `BestiaryRulesTab.tsx`, podpięcie przycisku do `page.tsx`.
**Pliki**: `HelpModal.tsx`, `HelpAssistantTab.tsx`, `BestiaryRulesTab.tsx`, `page.tsx`, `HelpModal.test.tsx`.
**Test**: `cd _tester/_base/.silnik && npm test` oraz `npm run build`.
**Ryzyko**: Niskie (odizolowany modal UI).
