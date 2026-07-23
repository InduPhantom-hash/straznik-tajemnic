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

## Podsumowanie sesji: 2026-07-23
Branch: main

### Co zrobiono
- [UI-01] Header Bar UI & Jawna Pogoda: Miejsce · Region (Kawiarnia Dormand’s · Boston) oraz słowna pogoda/księżyc w CampaignClock.
- [UI-02] Przycisk Eksport MD: przesunięto w górę w CharacterSheet (-mt-1).
- [UI-03] Dublowany Ekwipunek: usunięto SheetEquipment z Karty Postaci.
- [UI-04] Retro Portrety: zmiana awatara czatu z kółka na prostokątną ramkę retro.
- [UI-05] Full-Screen Inspector: przebudowa EquipmentDetailDialog na nakładkę z createPortal.
- [UI-06] Odznaka NEW: usunięto cyfrę 8, dodano dynamiczną odznakę NEW dla ekwipunku.

### Co otwarte
- Pozostałe punkty z bug.md (TTS, Faza Rozwoju, Grafik ekwipunku).

## Podsumowanie sesji: 2026-07-23 (IMG-01)
Branch: main

### Co zrobiono
- Wykonano pełen proces `/dev-1` do `/dev-5` dla punktu 2 w `bug.md` (`[IMG-01] Brakujące Grafiki Przedmiotów / Pętla Generowania`).
- `_tester/_base/.silnik/src/hooks/useEquipmentThumbnails.ts`: Wyeliminowano pętlę nieudanych zapytań HTTP po błędzie generowania obrazów AI w tle. Dodano natychmiastowe oznaczanie `visualSource: 'fallback'`.
- `_tester/_base/.silnik/src/lib/equipment-catalog.ts`: Uzupełniono szablony i aliasy polskich nazw przedmiotów startowych (np. *Koperty na dowody*, *Zniszczona odznaka*, *Pistolet sygnalizacyjny* itd.).
- `src/app/api/equipment/generate-starting/route.ts`: Zintegrowano automatyczne mapowanie grafik statycznych z katalogu `.webp` i ikonek `.svg` przy tworzeniu ekwipunku postaci.
- `_tester/_base/.silnik/src/lib/types.ts`: Rozszerzono typ `EquipmentVisualSource` o opcję `'fallback'`.

### Co otwarte
- Pozostałe punkty z bug.md (np. punkt 3 [LOG-01] Dwuetapowy Przepływ "Koniec Sesji" lub punkt 4 [CHA-01]).

### Decyzje podjęte
- Wykorzystano istniejącą infrastrukturę `visualSource` do oznaczania fallbacku zamiast wprowadzania dodatkowych zoptymalizowanych flag stanu.

## Podsumowanie sesji: 2026-07-23 (LOG-01)
Branch: main

### Co zrobiono
- **[LOG-01] Dwuetapowy Przepływ "Koniec Sesji" & Faza Rozwoju CoC 7e**:
  - Wykonano pełen cykl od `/dev-1-research` do `/dev-6-end` dla punktu 3 z `bug.md`.
  - Backend (`run-chat-pipeline.ts` & `default-gm-prompt.md`): Dwuetapowy protokół – Krok 1 (`[KONIEC_SESJI]`) domyka scenę pytaniem `[Co robisz?]` bez tagu potwierdzenia. Krok 2 (`[KONIEC_SESJI:FINAL]`) po finałowym słowie gracza generuje Lovecraftowski monolog z cliffhangerem i dopisuje `[KONIEC_SESJI:POTWIERDZENIE]`.
  - Frontend State (`useChat.ts` & `page.tsx`): Wprowadzono typ i stan `sessionEndStatus` (`'idle' | 'awaiting_player_closure' | 'ended'`) z przekazaniem do `CthulhuSidebar` oraz `ChatWindow`.
  - Sidebar & Input (`CthulhuSidebar.tsx` & `MessageInput.tsx`): Przycisk przejść (Koniec Sesji ➔ Oczekiwanie na słowo gracza... ➔ Sesja Zamknięta 🔒) z dedykowanym placeholderem w inpucie.
  - Development Phase Inline (`DevelopmentPhaseCard.tsx` & `MessageCard.tsx`): Zbudowano komponent inline Fazy Rozwoju CoC 7e (rzuty +1K10% na oznaczone `[✓]`, bonus SAN +2K6 za 90%+, odzysk Szczęścia 1K10, Samopomoc oraz podziękowanie/zapis) osadzony pod banerem Kroniki po zamykającej wiadomości MG.
  - Testy: Napisano `cleanup.test.ts` oraz `useChat.session-end.test.ts`. `npx tsc --noEmit` PASS (0 błędów), Jest PASS (5/5).

### Co otwarte
- Punkty w `bug.md`: [CHA-01] Rozbudowa biografii postaci, [TTS-01] do [TTS-04] Lektor & synteza audio, [LNG-01]/[LNG-02] Prompty systemowe metryczny/polszczyzna.

### Decyzje podjęte
- Osadzenie Fazy Rozwoju CoC 7e bezpośrednio w oknie czatu jako interaktywna karta inline pod finałową wiadomością MG zamiast przesłaniania ekranu modalem.


