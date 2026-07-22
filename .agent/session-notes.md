## Podsumowanie sesji: 2026-07-22
Branch: main

### Co zrobiono
- **Faza 1 (Polskie Aliasy & Fuzzy Matching):** Rozszerzono `findEquipmentTemplate` w `equipment-catalog.ts` o elastyczny fuzzy matching polskich słów kluczowych i dodano przypadek testowy w `equipment-catalog.test.ts`.
- **Faza 2 (AI Item Enrichment & CoC 7e Mechanics):** Utworzono nowy endpoint `/api/equipment/enrich` (Gemini 3.6 Flash Low) z defensywnym parsowaniem i graceful degradation oraz automatycznym wyliczaniem parametrów walki (`damage`, `range`, `skill`) i wyceną USD z lat 20.
- **Faza 3 (UI Redesign & Safe Queueing):** Redesign kafelków i placeholderów Art Déco w `equipment-modal.tsx`, usunięcie zablokowania generowania przez ikony SVG oraz dodanie 500ms throtllingu w `useEquipmentThumbnails.ts` (zero błędów HTTP 429).
- **Testy i Weryfikacja:** 10/10 testów jednostkowych PASS, kompilacja TypeScript (`npx tsc --noEmit`) PASS.

### Co otwarte
- Brak otwartych zadań w obszarze ekwipunku. Pipeline gotowy do sesji narracyjnych.

### Decyzje podjęte
- Wykorzystanie istniejącej infrastruktury Gemini API bez zewnętrznych paczek.
- Pełna wsteczna kompatybilność typów dla obiektów `Character`.

## Podsumowanie sesji: 2026-07-22 (Diegetic Documents)
Branch: main

### Co zrobiono
- **Typowanie i Inferencja Sub-typów Dokumenów (`types.ts`, `acquired-equipment.ts`)**: Dodano unię `DocumentSubType`, pole `documentType` w `EquipmentItem` oraz funkcję `inferDocumentType(item)`.
- **Dedykowany Komponent Rekwizytów Diegetycznych (`DiegeticDocumentViewer.tsx`)**: Utworzono komponent renderujący warianty rekwizytów 1920s: legitymację prasową/ID z portretem postaci, teczkę dowodową/policyjną, pismo rządowe, artykuł prasowy i papeterię.
- **Integracja w Podglądzie Ekwipunku (`EquipmentDetailDialog.tsx`)**: Podpięto podgląd diegetyczny z automatyczną hydracją portretu badacza.
- **Weryfikacja**: `npx tsc --noEmit` PASS (0 błędów), Jest PASS (4/4 testy).

### Decyzje podjęte
- Powiązanie legitymacji prasowych/dowodów z `character.portraitUrl` i fallbackiem na sylwetkę z epoki.
