## Brief: Katalog ekwipunku, dokumenty i dziennik
**Co**: Zatrzymać generowanie powtarzalnych przedmiotów, dodać lokalny katalog lekkich assetów oraz obsługę czytalnych dokumentów generowanych kontekstowo.
**Jak**: Najpierw research legalnego źródła i mapowanie katalogu, potem rozdzielenie przedmiotów stałych, fabularnych i wyjątkowych. Dziennik zostaje osobną Fazą 4 po ustabilizowaniu modelu.
**Już zrobione**: Toggle `Obrazy: Wł/Wył` istnieje; Hot Seat nie powinien wracać do ustawień; ikona wygląda na zamknięty temat.
**Pliki**: `equipment-data.ts`, `predefined-equipment.ts`, `types.ts`, `generate-starting/route.ts`, `equipment-modal.tsx`, `character-image-store.ts`.
**Test**: testy danych, payloadów, migracji save, TypeScript, build i manualny scenariusz znalezienia dokumentu.
**Ryzyko**: migracja starych zapisów, rozróżnienie template/exemplarz oraz dostęp do dokładnego podręcznika źródłowego.
