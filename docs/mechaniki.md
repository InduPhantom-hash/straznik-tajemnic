# Matryca Mechanik CoC 7e RAW a Implementacja Silnika i Warsztat Mistrza Gry

Dokument stanowi kompletne, techniczne **Single Source of Truth (SSOT)** mapujące zasady mechaniki z oficjalnego podręcznika głównego (*Zew Cthulhu: Księga Strażnika 7. edycja*, Black Monk Games v.1.3) na kod TypeScript, architekturę interfejsu użytkownika (React/Next.js), prompty Mistrza Gry (LLM) oraz testy automatyczne w repozytorium **Strażnika Tajemnic AI** (`_tester/_base/.silnik/src/`), z uwzględnieniem praktyki stołowej i zaleceń doświadczonych Mistrzów Gry (Seth Skorkowsky, Sandy Petersen, Matt Colville, polska szkoła prowadzenia, kanon narratologii i worldbuildingu).

Data audytu: 2026-10-04  
Wydanie podręcznika źródłowego: Zew Cthulhu 7. edycja (Księga Strażnika v.1.3, Black Monk Games, 490 stron PDF)  
Klucz mapowania stron: numer strony drukowanej = numer strony PDF minus 1 (np. s. 34 w podręczniku to s. 35 pliku PDF)  
Katalog kodu produkcyjnego: `_tester/_base/.silnik/src/`  
Tryb audytu: Read-Only wobec kodu silnika (Strict File Over AI)  

---

## 1. Streszczenie Wykonawcze (Executive Summary)

### 1.1. Statystyka Pokrycia 58 Mechanik CoC 7e RAW
Kompleksowy audyt czterowarstwowy dla wszystkich 12 rozdziałów mechanicznych (Rozdziały 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16) oraz 58 obszarów mechanicznych wykazał następujący podział stanu implementacji:

- **🟢 Zgodne 1:1 (Pełna wierność RAW i integracja End-to-End):** **53 / 58 obszarów (91.4%)**  
  Moduły posiadają ścisłą implementację matematyczną w TypeScript w `src/lib/`, są podpięte pod aktywną pętlę czatu przez dedykowane karty interaktywne lub modale UI, posiadają instrukcje w protokole promptu oraz pokrycie testami jednostkowymi i integracyjnymi (w tym pełne pokrycie zagrożeń środowiskowych w `hazards-engine.test.ts` oraz terapii psychicznej w `sanity-recovery.test.ts`).
- **🟡 Rozbieżności drobne z RAW / luki w testach jednostkowych:** **1 / 58 obszarów (1.7%)**  
  - Obszar 26 (Faza rozwoju Badacza): silnik `character-development.ts:175-193` posiada zaimplementowaną funkcję rozwoju Wykształcenia (`rollEDUDevelopment`), lecz w pliku `character-development-coc.test.ts` brakuje dla niej dedykowanej asercji testowej.
- **🟠 Odłączone od UI czatu / Tryb hybrydowy (Tylko Prompt w czacie):** **2 / 58 obszarów (3.4%)**  
  - Obszar 34 (Broń palna: modyfikatory zasięgu, point-blank, Dive for Cover) oraz Obszar 35 (Ogień ciągły i serie maszynowe): deterministyczny silnik balistyczny `firearms-engine.ts` (900 linii kodu) jest w pełni funkcjonalny i przetestowany w `firearms-engine.test.ts`, lecz NIE jest podpięty pod komponenty wiadomości czatu (`message-card.tsx`). W aktywnej rozgrywce czatu walka bronią palną prowadzona jest przez model AI na bazie tekstowych dyrektyw wstrzykiwanych z `weapon-context.ts:319`, a gracz wykonuje zwykły rzut na uniwersalnej karcie `SkillTestCard`. Deterministyczny silnik TS jest wykorzystywany wyłącznie w modalnym panelu kalkulatora MG `CombatSystem.tsx`.
- **🔴 Brak implementacji w kodzie silnika:** **2 / 58 obszarów (3.4%)**  
  - Obszar 42 (Statystyki pojazdów - Tabela V oraz Kolizje i kraksy - Tabela VI z Rozdziału 7): w całym silniku brak kodu modelującego pancerz, punkty budowy pojazdów oraz obrażenia kolizyjne zależne od masy i prędkości.
  - Obszar 56 (Konwersja cech z edycji 1-6 na skalę CoC 7e x5 z Rozdziału 16): plik `skill-migration.ts` służy wyłącznie do migracji formatu bazy danych, a `adventure-local-builder.ts` nakłada overlaye. Brak dedykowanej funkcji matematycznej mnożącej klasyczne cechy (skala 3-18) przez 5 i przeliczającej progi 1/2 oraz 1/5.

### 1.2. Kluczowe Odkrycia Architektoniczne Silnika
1. **Obalenie mitu o braku testów jednostkowych:** Wcześniejsza wersja dokumentacji mechanik oraz zadania backlogu błędnie wskazywały brak testów dla kluczowych mechanik (walka wręcz, broń palna, poczytalność, pościgi, rozwój, zagrożenia środowiskowe, terapia). Bezpośrednia weryfikacja kodu ujawniła obecność **2681 linii rygorystycznych testów jednostkowych** w scentralizowanym katalogu `src/tests/unit/` (łącznie 8 suitów, 165 testów, 100% PASS):
   - `src/tests/unit/combat-defense.test.ts` (329 linii, 17 testów): asymetria remisów (Unik vs Kontratak), manewry bojowe Build, outnumbering, Impale, Major Wound.
   - `src/tests/unit/combat-raw.test.ts` (415 linii, 28 testów): pełna wierność zasadom walki wręcz CoC 7e RAW.
   - `src/tests/unit/firearms-engine.test.ts` (316 linii, 17 testów): inicjatywa DEX + 50, point-blank, Dive for Cover, wielokrotne strzały, serie i salwy, zacięcia Malf, blokada Szczęścia.
   - `src/tests/unit/sanity-mechanics-coc.test.ts` (278 linii, 25 testów): próg 5+ SAN (test INT), czasowa niepoczytalność 1/5 SAN/dzień, ataki szaleństwa w locie i podsumowaniu, tarcza krawędzi otchłani.
   - `src/tests/unit/sanity-recovery.test.ts` (338 linii, 20 testów): procedury terapii psychiatrycznej, azyl państwowy, sanatorium za $150, limity miesięczne i degradacja więzi.
   - `src/tests/unit/hazards-engine.test.ts` (111 linii, 16 testów): upadki (z redukcją za Skakanie), ogień, kwas, uduszenie, tonięcie, trucizny z progiem ekstremalnego KON.
   - `src/tests/unit/chase-engine.test.ts` (700 linii, 22 testy): tor segmentów, kalkulacja punktów akcji MOV, kolejka DEX, rzuty na prędkość, manewry gracza i ścigających.
   - `src/tests/unit/character-development-coc.test.ts` (194 linie, 20 testów): rzuty rozwojowe k100 > skill lub > 95, próg 90% (+2k6 SAN), pułap 99 minus Mity, odzysk Szczęścia.
   Błąd w pierwotnej dokumentacji wynikał z poszukiwania testów wyłącznie w podkatalogach `src/lib/` zamiast w głównym katalogu `src/tests/unit/`.
2. **Architektura 10 interaktywnych kart wiadomości w czacie (`message-card.tsx`):** Silnik nie opiera się na czystym tekście. Posiada zaawansowany system komponentów React montowanych wprost w strumieniu SSE:
   - `SkillTestCard` (linia 368): interaktywna tacka rzutów dla tagu `[TEST:]`.
   - `DiceRollCard` (linia 382): rzuty kośćmi 3D dla tagu `[DICE:]`.
   - `HazardCard` (linia 404): rozstrzyganie upadków, ognia, trucizn dla tagu `[ZAGROŻENIE:]`.
   - `SpellCard` (linia 448): rzucanie czarów dla tagu `[CZAR:]` z weryfikacją Bramki Wiary i kosztów MP/HP.
   - `TomeCard` (linia 465): studium ksiąg Mitów dla tagu `[TOM:]`.
   - `OpposedMagicCard` (linia 482): obrona psychiczna przed czarem dla tagu `[OBRONA_MAGIA:]`.
   - `ChaseCard` (linia 517): interaktywny tor pościgu i wybór manewrów ze stanu `chaseState`.
   - `OpposedMeleeCard` (linia 538): starcie wręcz dla tagu `[WALKA_ATAK:]` z asymetrią Unik vs Kontratak.
   - `RefereeVetoCard` (linia 575): twarde weto sędziego dla tagu `[WETO_SEDZIEGO:]`.
   - `GameOverCard` (linia 587): diegetyczny nekrolog/karta sanitarium dla tagu `[GAME_OVER:]`.
   - Dodatkowo `DevelopmentPhaseCard` (linie 312, 328) montowana po zakończeniu sesji.
3. **Odcięcie balistyki broni palnej od pętli czatu:** Podczas gdy walka wręcz posiada dedykowaną kartę `OpposedMeleeCard`, broń palna w oknie czatu prowadzona jest narracyjnie przez prompt LLM. Deterministyczny kod `firearms-engine.ts` funkcjonuje jako silnik narzędziowy w panelu MG (`gm-tools-modal.tsx`), co stanowi kluczowe pytanie architektoniczne dla Product Ownera.
4. **Transakcyjny nadzór nad stanem postaci (`apply-stat-changes.ts`):** Po zakończeniu strumienia wiadomości w `useChat.ts:1940`, parsowane tagi `[HP: -N]` i `[SANITY: -N]` aktualizują stan Badacza, natychmiast wyliczając stany CoC 7e: Ciężką Ranę (>= 1/2 maxHP), stan agonalny przy 0 HP, test Inteligencji przy ubytku 5+ SAN oraz Czasową Niepoczytalność przy stracie 1/5 dziennej SAN, chroniąc jednocześnie gracza tarczami Fail-Forward (blizna pourazowa, szał krawędzi otchłani).

### 1.3. Kluczowe Odkrycia Warsztatowe Doświadczonych Mistrzów Gry
Analiza materiałów warsztatowych (Seth Skorkowsky, Sandy Petersen, Matt Colville, polska szkoła prowadzenia, kanon narratologii i worldbuildingu) wyznaczyła trzy nadrzędne filary projektowe:
1. **Fiction First (Sandy Petersen, Banaś/Baniak):** Bezwzględny zakaz mechanicznego żargonu numerycznego przed opisem świata. Zmysłowa triada bodźców (zapach, dźwięk, chłód) musi poprzedzać rzut kością. Wynik rzutu jest natychmiast tłumaczony na somatyczny stan ciała Badacza i zmiany w otoczeniu.
2. **Fail-Forward i Zasada 3 Poszlak (Justin Alexander, Matt Colville, Robin D. Laws):** Kluczowa poszlaka (Core Clue) nigdy nie może zależeć od pojedynczego rzutu na Spostrzegawczość (Spot Hidden). Porażka w teście śledczym to sukces okupiony kosztem (upływ czasu, hałas, wyczerpanie, komplikacja fabularna). Test Pomysłowości (Idea Roll, RAW s. 101) gwarantuje w 100% dostarczenie poszlaki, a porażka w rzucie oznacza natychmiastowe wpakowanie Badacza w bezpośrednie tarapaty.
3. **Sprawiedliwy Arbitraż i Przejrzysta Agencja Gracza (Seth Skorkowsky):** 
   - W rzutach forsowanych (Pushed Roll) Mistrz Gry ma obowiązek jawnie zapowiedzieć stawkę porażki PRZED wykonaniem drugiego rzutu.
   - Wydawanie punktów Szczęścia (1:1) jest prawem gracza, ale podlega twardym blokadom RAW: zakaz modyfikowania rzutów na Poczytalność (SAN), obrażenia, zacięcia broni (Malf) i rzuty forsowane.
   - W pościgach odrzuca się regułę natychmiastowej ucieczki szybszego sprintera: przy różnicy MOV <= 3 pościg toczy się na torze przeszkód, bo przeszkody mogą wywrócić nawet najszybszego uciekiniera.
   - W starciach z potworami egzekwuje się regułę Krzepy (Build): różnica Build >= 3 uniemożliwia manewry zapaśnicze (chwyty, powalenia), a potwory nie są udomowionymi maskotkami, lecz bezlitosnymi kosmicznymi drapieżnikami.

---

## 2. Zaktualizowana Tabela Główna SSOT (58 Obszarów Mechanicznych CoC 7e)

Legenda statusu zgodności RAW:  
- 🟢 **Zgodne 1:1** - pełna wierność matematyczna i logiczna RAW, moduł aktywny w UI/runtime, przetestowany.  
- 🟡 **Rozbieżność z RAW** - drobna luka matematyczna, brak asercji testowej lub niepełna obsługa reguły podręcznika.  
- 🟠 **Odłączone od UI / Tylko Prompt** - silnik TS istnieje w `src/lib/`, lecz w pętli czatu zasada opiera się na prompcie LLM i uniwersalnej karcie testu.  
- 🔴 **Brak implementacji** - brak kodu w `src/lib/`, mechanika nieobsługiwana.  

| Lp. | Rozdz. / s. | Mechanika CoC 7e RAW | Status Zgodności RAW | Skrypt Silnika (TS) | Podpięcie Runtime / UI | Prompt / Protokół AI | Istniejące Testy | Rekomendacja Warsztatowa MG |
|---|---|---|---|---|---|---|---|---|
| 1 | Rozdz. 3 / s. 34 | Cechy Badacza (8 cech: STR, CON, SIZ, DEX, APP, INT, POW, EDU) | 🟢 Zgodne 1:1 | `character/dice.ts:44-56`, `derived-stats.ts:10-70` | `character-wizard.tsx:1120`, `useCharacterManagement.ts` | `session-zero-instructions.ts`, `build-context.ts:61` | `character-builder.test.ts`, `dice.ts` | Rekomendacja MG (Seth): asymetria DEX (unikanie remisów z NPC) |
| 2 | Rozdz. 3 / s. 37 | Tabela I: Modyfikator Obrażeń (DB) i Krzepa (Build) | 🟢 Zgodne 1:1 | `data/character/tables.ts:8-18`, `derived-stats.ts:13-24` | `character-wizard.tsx`, `opposed-melee-card.tsx` | `weapon-context.ts:279`, `gm-protocol.ts:45` | `character-builder.test.ts`, `combat-defense.test.ts` | Puryzm RAW: Krzepa jako tarcza przed manewrami potworów |
| 3 | Rozdz. 3 / s. 38 | Punkty Magii (1/5 POW) i Poczytalności (SAN = POW) | 🟢 Zgodne 1:1 | `character/derived-stats.ts:50-52` | `character-wizard.tsx`, `apply-stat-changes.ts:104` | `gm-protocol.ts` (sekcja 7-BIS/TER) | `character-builder.test.ts`, `sanity-mechanics-coc.test.ts` | Puryzm RAW: regeneracja 1 MP/h, spalanie HP przy braku MP |
| 4 | Rozdz. 3 / s. 38 | Tworzenie Badacza (procedura standardowa) | 🟢 Zgodne 1:1 | `character/character-builder.ts:76-100` | `character-wizard.tsx` (5-etapowy kreator) | `session-zero-instructions.ts` | `character-builder.test.ts` | Rekomendacja MG (Colville, Seth): 3 kotwice historii wstrzykiwane do sesji |
| 5 | Rozdz. 3 / s. 41 | Skala wartości Cech i Modyfikatory Wieku | 🟢 Zgodne 1:1 | `data/character/tables.ts:21-106`, `derived-stats.ts:26-42, 77-135` | `character-wizard.tsx:1280` (automatyczne kary) | `gm-protocol.ts` (granice ludzkich cech) | `character-builder.test.ts` | Rekomendacja MG (Seth): automatyczny kalkulator wieku bez ręcznych rzutów |
| 6 | Rozdz. 3 / s. 44 | Zawody i punkty umiejętności (zawodowe / hobby) | 🟢 Zgodne 1:1 | `character/occupation-points.ts:9-43`, `distribute-skill-points.ts` | `character-wizard.tsx` (etap 3) | `session-zero-instructions.ts` | `distribute-skill-points.test.ts` | Rekomendacja MG (Seth): zasada specjalizacji (minimum 50-70% w kluczowych) |
| 7 | Rozdz. 3 / s. 49-50 | Standardy życia i Tabela II: Gotówka i dobytek | 🟢 Zgodne 1:1 | `economy/credit-rating.ts:64-160`, `character-builder.ts:48` | `src/components/ui/character-sheet/components/sheet-equipment.tsx:150-250`, `build-context.ts:167` | `buildPlayerFinancesSection` (build-context.ts) | `credit-rating.test.ts` | Rekomendacja MG: brak mikro-księgowości poniżej poziomu wydatków |
| 8 | Rozdz. 3 / s. 52 | Alternatywne tworzenie (pula punktowa, Quick Fire) | 🟢 Zgodne 1:1 | `components/ui/character-wizard.tsx:600-750` | `character-wizard.tsx` (tryb Point Buy) | `session-zero-instructions.ts` | `character-builder.test.ts` | Rekomendacja MG (Seth): Quick Fire jako domyślny tryb one-shot |
| 9 | Rozdz. 3 / s. 53 | Tabela wartości 1/2 (Hard) i 1/5 (Extreme) | 🟢 Zgodne 1:1 | `dice-utils.ts:101-110, 178-191` | `skill-test-card.tsx`, `dice-roll-card.tsx` | `gm-protocol.ts` (tag `[TEST:]`) | `dice-roll-trace.test.ts` | Puryzm RAW: matematyczny floor(val/2) i floor(val/5) |
| 10 | Rozdz. 4 / s. 58 | Punkty umiejętności i wartości bazowe | 🟢 Zgodne 1:1 | `data/character/skills.ts:8-85` | `character-wizard.tsx`, `skill-test-resolver.ts:25` | `skill-result-instructions.ts` | `skills-filter.test.ts` | Rekomendacja MG (Colville): rutyna zawodowa bez rzutu kością |
| 11 | Rozdz. 4 / s. 61 | Kanoniczna lista umiejętności CoC 7e | 🟢 Zgodne 1:1 | `data/character/skills.ts`, `skill-test-resolver.ts:40-150` | `character-sheet.tsx`, `skill-test-card.tsx` | `buildPlayerSkillsSection` (build-context.ts) | `skills-filter.test.ts` | Rekomendacja MG (Seth): docenienie Hipnozy i Czytania z ruchu warg |
| 12 | Rozdz. 4 / s. 88 | Zasady opcjonalne umiejętności i specjalizacje | 🟢 Zgodne 1:1 | `character/normalize-skill-name.ts:19-150` | `distribute-skill-points.ts`, `useSkillMarking.ts` | `gm-protocol.ts` (normalizacja) | `skills-filter.test.ts` | Rekomendacja MG: fallback na skill nadrzędny z kością karną |
| 13 | Rozdz. 5 / s. 92-93 | Testy umiejętności i poziomy trudności | 🟢 Zgodne 1:1 | `dice-utils.ts:22-37, 206-213` | `skill-test-card.tsx:180-220`, `useChat.ts:22` | `mechanics-parser.ts:134` (`extractSkillTests`) | `dice-roll-trace.test.ts` | Rekomendacja MG (Seth, Colville): dominacja Regular, rzadkie Hard |
| 14 | Rozdz. 5 / s. 94 | Rzucanie k100: Sukces, Porażka, Skala sukcesu | 🟢 Zgodne 1:1 | `dice-utils.ts:85-117` (`evaluateSkillCheck`) | `skill-test-card.tsx`, `dice-roll-card.tsx` | `skill-result-instructions.ts` | `dice-roll-trace.test.ts` | Rekomendacja MG (Petersen): Fiction First, zakaz żargonu liczb |
| 15 | Rozdz. 5 / s. 95-96 | Forsowanie rzutu (Pushed Roll) i stawka porażki | 🟢 Zgodne 1:1 | `dice-roll-card.tsx`, `RollTestModal.tsx:120` | `RollTestModal.tsx` (przycisk forsowania) | `gm-protocol.ts:530` (zakazy w walce/SAN) | `dice-roll-card.test.tsx` | Rekomendacja MG (Seth): jawna stawka ryzyka zapowiedziana przed rzutem |
| 16 | Rozdz. 5 / s. 98 | Porażki w rzutach i eskalacja komplikacji | 🟢 Zgodne 1:1 | `parsers/mechanics-parser.ts`, `idea-roll-service.ts` | Pętla czatu w `useChat.ts`, `idea-roll-modal.tsx` | `gm-protocol.ts` (dyrektywa Fail-Forward) | `mechanics-parser.test.ts` | Rekomendacja MG (Banaś, Alexander): zakaz pustych porażek |
| 17 | Rozdz. 5 / s. 98 | Testy wielu graczy (asysta / grupa) | 🟢 Zgodne 1:1 | `combined-skill-rolls.ts:56-113`, `src/hooks/useChat.ts:202-215, 1816-1824` | `src/hooks/useChat.ts:1633-1637, 1816-1824`, `player-switcher.tsx:43-120` | `gm-protocol.ts` (adresowanie `@Imię:`) | `combined-skill-rolls.test.ts` | Rekomendacja MG (Seth): test grupy wg najsłabszego ogniwa |
| 18 | Rozdz. 5 / s. 98-99 | Granice ludzkich możliwości, Krytyki (01) i Pechy | 🟢 Zgodne 1:1 | `dice-utils.ts:89-98` | `skill-test-card.tsx`, `dice-roll-card.tsx` | `gm-protocol.ts` (Twarde Weto Sędziego) | `dice-roll-trace.test.ts` | Puryzm RAW: 01 krytyk, pech 100 (skill>=50) vs 96-100 (skill<50) |
| 19 | Rozdz. 5 / s. 100 | Szczęście (wydawanie 1:1, zakazy przy pechu i SAN) | 🟢 Zgodne 1:1 | `RollTestModal.tsx:110-140`, `dice-utils.ts:63` | `RollTestModal.tsx` (suwak wydawania) | `gm-protocol.ts:538` (blokady SAN/Pech) | `dice-roll-card.test.tsx` | Rekomendacja MG (Seth): wydawanie 1:1 z rygorystycznymi blokadami RAW |
| 20 | Rozdz. 5 / s. 101 | Testy Inteligencji / Pomysłowości (Idea Roll) | 🟢 Zgodne 1:1 | `journal/idea-roll-service.ts:1-180` | `idea-roll-modal.tsx`, `discoveries-view.tsx` | `gm-protocol.ts` (impas śledztwa) | `idea-roll.test.ts`, `idea-roll-service.test.ts` | Rekomendacja MG (Seth, RAW s. 101): 100% dostarczenia poszlaki za cenę kłopotów |
| 21 | Rozdz. 5 / s. 101 | Test Wiedzy (Wykształcenie / EDU) | 🟢 Zgodne 1:1 | `skill-test-resolver.ts:60-90` | `skill-test-card.tsx` (pobranie z karty) | `gm-protocol.ts` (`[TEST: Wykształcenie]`) | `skills-filter.test.ts` | Rekomendacja MG (Seth): Know Roll dla wiedzy encyklopedycznej epoki |
| 22 | Rozdz. 5 / s. 101 | Przeciwstawny test umiejętności (Opposed Roll) | 🟢 Zgodne 1:1 | `opposed-rolls.ts:1-250` | `OpposedRollModal.tsx` (z `SkillTestCard:359`) | `gm-protocol.ts` (struktury sporu) | `opposed-rolls.test.ts` | Puryzm RAW: hierarchia sukcesów, remisy wg cechy bazowej |
| 23 | Rozdz. 5 / s. 102-103 | Kości premiowe i karne (d10 dziesiątek) | 🟢 Zgodne 1:1 | `dice-utils.ts:228-261` (`rollD100WithBonus`) | `skill-test-card.tsx`, `opposed-melee-card.tsx` | `gm-protocol.ts` (modyfikatory w tagu) | `dice-roll-trace.test.ts` | Puryzm RAW: d10 dziesiątek, wzajemne znoszenie premii i kar |
| 24 | Rozdz. 5 / s. 103 | Łączone testy umiejętności | 🟢 Zgodne 1:1 | `combined-skill-rolls.ts:56-113` | `mechanics-parser.ts:178`, `skill-test-card.tsx` | `gm-protocol.ts` (podwójne testy) | `combined-skill-rolls.test.ts` | Rekomendacja MG (Seth, RAW s. 103): pojedynczy rzut k100 przeciw dwóm skillom |
| 25 | Rozdz. 5 / s. 105 | Umiejętności społeczne i Blokada Uległości NPC | 🟢 Zgodne 1:1 | `opposed-rolls.ts`, `gm-protocol.ts:68, 540` | Strumień dialogowy czatu w `useChat.ts` | `gm-protocol.ts` (dyrektywa Pushback RAW) | `opposed-rolls.test.ts` | Rekomendacja MG (Worldbuilding Karta 02): 4 warstwy NPC, prawda kosztuje |
| 26 | Rozdz. 5 / s. 105-108 | Faza rozwoju Badacza (rozwój skilli i EDU) | 🟡 Rozbieżność z RAW | `character-development.ts:127-194` | `DevelopmentPhaseCard.tsx` (`message-card:312`) | `gm-protocol.ts` (`[KONIEC_SESJI]`) | `character-development-coc.test.ts` (brak testu rollEDU) | Rekomendacja MG (Seth): rzut na regenerację Szczęścia (+1k10) w fazie rozwoju |
| 27 | Rozdz. 5 / s. 107 | Majętność i zakupy codzienne bez rzutu | 🟢 Zgodne 1:1 | `src/lib/economy/credit-rating.ts:1-200` | `src/components/ui/character-sheet/components/sheet-equipment.tsx:150-250`, `build-context.ts:167` | `buildPlayerFinancesSection` | `credit-rating.test.ts` | Rekomendacja MG: zakupy codzienne bez rzutu i bez odliczania gotówki |
| 28 | Rozdz. 5 / s. 110 | Zasady opcjonalne: Adjudykacja zdarzeń | 🟢 Zgodne 1:1 | `concordia/event-resolution.ts`, `scene-director.ts` | `useChat.ts:45, 1998` (`updateGuardrailState`) | `scene-director.ts` | `event-resolution.test.ts` | Rekomendacja MG (Colville): decyzja sędziowska zawsze służy dramaturgii |
| 29 | Rozdz. 6 / s. 114-115 | Runda walki, inicjatywa wg DEX, deklaracje | 🟢 Zgodne 1:1 | `combat/combat-resolver.ts`, `firearms-engine.ts:18` | `CombatDexRibbon.tsx` (`chat-window/index.tsx`) | `gm-protocol.ts:45` (`[WALKA_ATAK:]`) | `combat-dex-ribbon.test.tsx`, `firearms-engine.test.ts` | Rekomendacja MG (Seth): runda 5-10 s, broń wyjęta to +50 DEX bez ruchu |
| 30 | Rozdz. 6 / s. 115-116 | Walka wręcz, bijatyka i obrażenia (1k3 + DB) | 🟢 Zgodne 1:1 | `combat/combat-resolver.ts:483-550` | `OpposedMeleeCard.tsx` (`message-card.tsx:538`) | `gm-protocol.ts:45` | `combat-defense.test.ts`, `combat-raw.test.ts` | Puryzm RAW: Przebicie (Impale) dla broni kłującej (Max + Max DB + Roll) |
| 31 | Rozdz. 6 / s. 116-117 | Manewry bojowe (Build/Krzepa, chwyt, powalenie) | 🟢 Zgodne 1:1 | `combat/combat-resolver.ts:155-191` | `opposed-melee-card.tsx:31` (opcja Manewru) | `weapon-context.ts`, `gm-protocol.ts` | `combat-defense.test.ts:145` | Puryzm RAW: porównanie Krzepy, blokada manewrów przy różnicy Build >= 3 |
| 32 | Rozdz. 6 / s. 120 | Drzewo walki: Unik vs Kontratak | 🟢 Zgodne 1:1 | `combat/combat-resolver.ts:540-580` | `OpposedMeleeCard.tsx` (asymetria remisów) | `gm-protocol.ts:45` | `combat-defense.test.ts`, `combat-raw.test.ts` | Puryzm RAW: Unik wygrywa remisy, Kontratak przegrywa remisy na korzyść wroga |
| 33 | Rozdz. 6 / s. 123 | Pancerz i pochłanianie obrażeń | 🟢 Zgodne 1:1 | `combat/combat-transaction.ts`, `npc-combat-profile.ts` | `OpposedMeleeCard.tsx`, `CombatCard.tsx` | `gm-protocol.ts` (redukcja obrażeń) | `combat-defense.test.ts`, `combat-transaction.test.ts` | Rekomendacja MG (Seth): stalowe kamizelki 1927 (5 pancerza torsu) |
| 34 | Rozdz. 6 / s. 123 | Broń palna: Zasięgi, point-blank, Dive for Cover | 🟠 Odłączone od UI | `combat/firearms-engine.ts:60-150` | `CombatSystem.tsx` (GM tool); czat: tylko Tacka | `buildFirearmPromptGuidance` (`weapon-context:319`) | `firearms-engine.test.ts` | Rekomendacja MG (Seth): karta Dive for Cover w czacie (skok 1/5 DEX stóp) |
| 35 | Rozdz. 6 / s. 124 | Ogień ciągły i serie (salwy, Impale) | 🟠 Odłączone od UI | `combat/firearms-engine.ts:300-450` | `CombatSystem.tsx` (GM tool); czat: tylko Tacka | `buildFirearmPromptGuidance` | `firearms-engine.test.ts` | Rekomendacja MG (Seth): algorytm salw w kodzie TS zamiast szacowania LLM |
| 36 | Rozdz. 6 / s. 128 | Zawodność broni (Malf) i blokada Szczęścia | 🟢 Zgodne 1:1 | `combat/firearms-engine.ts:200-240` | `RollTestModal.tsx:125` (blokada Szczęścia) | `buildFirearmPromptGuidance` | `firearms-engine.test.ts` | Puryzm RAW: bezwzględny zakaz wydawania Szczęścia przy zacięciu broni |
| 37 | Rozdz. 6 / s. 131-136 | Rany, Ciężka Rana (Major Wound), Umieranie | 🟢 Zgodne 1:1 | `combat/combat-resolver.ts:350`, `apply-stat-changes.ts` | `apply-stat-changes.ts:124`, `OpposedMeleeCard.tsx` | `gm-protocol.ts` (`[HP: -N]`, `[GAME_OVER:]`) | `combat-defense.test.ts`, `game-over-mechanics.test.ts` | Puryzm RAW: stan agonalny przy 0 HP + Major Wound, okno 1h na Medycynę |
| 38 | Rozdz. 6 / s. 136-143 | Inne obrażenia, Lokacje trafień (Tabela IV), Trucizny | 🟢 Zgodne 1:1 | `hazards-engine.ts:1-277`, `recovery-tracker.ts` | `HazardCard.tsx` (`message-card.tsx:404`) | `mechanics-parser.ts:313` (`[ZAGROŻENIE:]`) | `hazards-engine.test.ts` (16 testów PASS) | Rekomendacja MG (Seth): Tabela IV jako diegetyczne blizny pourazowe |
| 39 | Rozdz. 7 / s. 146-150 | Pościgi CoC 7e: Ruch wg MOV, tory przeszkód | 🟢 Zgodne 1:1 | `chase/chase-engine.ts:1-120` | `ChaseCard.tsx` (`message-card.tsx:517`), `ChaseDialog` | `gm-protocol.ts` (Bieg 3: Pościg) | `chase-engine.test.ts:19` | Rekomendacja MG (Seth): pościg toczy się przy różnicy MOV <= 3 |
| 40 | Rozdz. 7 / s. 148-150 | Zagrożenia, przeszkody i forsowanie barier | 🟢 Zgodne 1:1 | `chase/chase-engine.ts:200-350` | `ChaseCard.tsx` (tor przeszkód i barier) | `mechanics-parser.ts:313` (`[ZAGROŻENIE:]`) | `chase-engine.test.ts` | Rekomendacja MG: podział na spowalniające Hazards i zatrzymujące Barriers |
| 41 | Rozdz. 7 / s. 152-153 | Manewry pościgu (sprint, shortcut, hide, escape) | 🟢 Zgodne 1:1 | `chase/chase-engine.ts:350-550` | `ChaseCard.tsx`, `ChaseDialog.tsx` | `gm-protocol.ts` (manewry ucieczki) | `chase-engine.test.ts:200` | Rekomendacja MG: manewr skrótu i ukrycia się jako taktyczna agencja |
| 42 | Rozdz. 7 / s. 162-164 | Statystyki pojazdów (Tabela V) i Kolizje (Tabela VI) | 🔴 Brak implementacji | BRAK w `src/lib/` | BRAK podpięcia w UI | Wzmianki ogólne w promptach | BRAK testów | Rekomendacja MG (Seth): kalkulator kraks z Tabeli VI wg prędkości i Krzepy |
| 43 | Rozdz. 8 / s. 170-172 | Testy Poczytalności i utrata SAN | 🟢 Zgodne 1:1 | `sanity/sanity-engine.ts:206`, `apply-stat-changes.ts` | `useChat.ts:73`, `applyStatChangesToParty` | `gm-protocol.ts` (dwukrok test + `[SANITY:]`) | `sanity-mechanics-coc.test.ts:55` | Rekomendacja MG (Petersen): somatyczny opis grozy przed rzutem na SAN |
| 44 | Rozdz. 8 / s. 172-177 | Ataki szaleństwa w locie i podsumowaniu (Tab. VII-X) | 🟢 Zgodne 1:1 | `sanity/sanity-engine.ts:39-204` (`BOUTS_REAL_TIME`) | `applySanityDelta` (toasty i stan postaci) | `gm-protocol.ts` (próg 5+ SAN, Test Realności) | `sanity-mechanics-coc.test.ts:87` | Rekomendacja MG (Seth): Test Realności, luki pamięciowe w podsumowaniu |
| 45 | Rozdz. 8 / s. 181-186 | Odzyskiwanie SAN, terapia, przywykanie do potworów | 🟢 Zgodne 1:1 | `sanity/sanity-recovery.ts`, `character-development.ts` | `DevelopmentPhaseCard.tsx` (samopomoc) | `session-zero-instructions.ts` | `sanity-recovery.test.ts` (20 testów PASS) | Rekomendacja MG (Seth, RAW s. 185): limit utraty SAN per gatunek w epizodzie |
| 46 | Rozdz. 9 / s. 191-194 | Księgi Mitów i mechanika czytania | 🟢 Zgodne 1:1 | `magic/tome-engine.ts:1-280`, `catalog.ts` | `TomeCard.tsx` (`message-card.tsx:465`) | `mechanics-parser.ts:514` (`[TOM:]`) | `magic.test.ts:38` | Rekomendacja MG (Seth): pobieżne czytanie (godziny) vs pełne studium (downtime) |
| 47 | Rozdz. 9 / s. 196-198 | Zaklęcia, Bramka Wiary, Trudny POW, magia spontaniczna | 🟢 Zgodne 1:1 | `magic/magic-engine.ts:1-350`, `catalog.ts` | `SpellCard.tsx` (`message-card.tsx:448`) | `mechanics-parser.ts:466` (`[CZAR:]`) | `magic.test.ts:60` | Rekomendacja MG (Seth): Trudny POW przy debiucie, diegetyczne nazwy czarów |
| 48 | Rozdz. 9 / s. 200 | Katastrofy metafizyczne i rykoszety mistyczne | 🟢 Zgodne 1:1 | `magic/catalog.ts:80`, `magic-engine.ts:98` | `SpellCard.tsx` (checkbox MP na HP) | `gm-protocol.ts` (cena somatyczna magii) | `magic.test.ts:206` | Rekomendacja MG (Sanderson): miękka magia, koszmarne rykoszety |
| 49 | Rozdz. 10 / s. 210 | Bohaterowie Niezależni (profile, psychologia, opór) | 🟢 Zgodne 1:1 | `npc/derived-stats.ts`, `npc-combat-profile.ts` | `NPCEngine`, dossier `journal-parser.ts` | `gm-protocol.ts` (Anti-Exposition & Janusz) | `npc-combat-profile.test.ts` | Rekomendacja MG (Worldbuilding Karta 02): triada cech NPC w locie |
| 50 | Rozdz. 10 / s. 215, 227 | Arbitraż rzutów kośćmi, zakaz rzutów na rutynę | 🟢 Zgodne 1:1 | `skill-test-resolver.ts`, `era-guardrail.ts` | Guardraile CPU w `run-chat-pipeline.ts:388` | `gm-protocol.ts` (Twarde Weto Sędziego) | `mechanics-parser.test.ts` | Rekomendacja MG (Colville, RAW s. 215): rzut wyłącznie przy dramatycznej stawce |
| 51 | Rozdz. 10 / s. 220, 224 | Testy Pomysłowości i Percepcji (poszlaki, fail-forward) | 🟢 Zgodne 1:1 | `journal/idea-roll-service.ts`, `world-engine/` | `idea-roll-modal.tsx`, `discoveries-view.tsx` | `gm-protocol.ts` (Fair Play, poszlaki) | `idea-roll.test.ts` | Rekomendacja MG (Alexander, Gumshoe): Zasada 3 Poszlak, brak ślepych zaułków |
| 52 | Rozdz. 10 / s. 229-234 | Sceny akcji, zawieszenie kulminacji, groza kosmiczna | 🟢 Zgodne 1:1 | `narrative-engine/scene-director.ts`, `dispatcher.ts` | `useChat.ts` (egzekucja stopu przy cliffhangerze) | `gm-protocol.ts:68` (`[ZAWIESZENIE_KULMINACJI]`) | `mid-narration-roll.test.ts` | Rekomendacja MG: suspens przed rzutem, twarde urwanie narracji przed rzutem |
| 53 | Rozdz. 11 / s. 247-261 | Studiowanie tomów Mitów i Tabela XI | 🟢 Zgodne 1:1 | `magic/tome-engine.ts`, `catalog.ts` | `TomeCard.tsx` (studium w czacie) | `gm-protocol.ts` (`[STUDIUJ_TOM:]`) | `magic.test.ts` | Rekomendacja MG (Seth): zmysłowy opis fizycznego rekwizytu księgi |
| 54 | Rozdz. 12 / s. 267-284 | Rzuty sporne POW zaklęć, Bramy (Tabele XII-XIV) | 🟢 Zgodne 1:1 | `magic/magic-engine.ts:250-320`, `catalog.ts` | `OpposedMagicCard.tsx` (`message-card.tsx:482`) | `gm-protocol.ts:44` (`[OBRONA_MAGIA:]`) | `magic.test.ts:320` | Puryzm RAW: przeciwstawny test Mocy (POW vs POW) z kosztami trwałego POW |
| 55 | Rozdz. 14 / s. 312-315 | Potwory: Krzepa (Tabela XV), manewry, kontratak | 🟢 Zgodne 1:1 | `combat/combat-resolver.ts:155`, `npc-combat-profile.ts` | `OpposedMeleeCard.tsx` (odporność na manewr) | `gm-protocol.ts` (odporności bestii) | `npc-combat-profile.test.ts` | Rekomendacja MG (Petersen): potwory są nieludzko wrogie, brak uczłowieczania |
| 56 | Rozdz. 16 / s. 441 | Konwersja zasad wcześniejszych edycji (Cechy x5) | 🔴 Brak implementacji | BRAK w `src/lib/` (jest tylko migracja storage) | BRAK podpięcia w UI | `session-zero-instructions.ts` | Brak dedykowanego testu x5 | Rekomendacja MG: automatyczny konwerter x5 w parserze PDF klasycznych modułów |
| 57 | Rozdz. 16 / s. 452 | Tabela XVI: Parametry i katalog broni | 🟢 Zgodne 1:1 | `equipment-data.ts`, `equipment-catalog.ts` | `equipment-modal.tsx`, `sheet-equipment.tsx` | `weapon-context.ts` (wstrzyknięcie parametrów) | `equipment-catalog.test.ts`, `weapon-context.test.ts` | Rekomendacja MG (Seth): korekta zawyżonych cen broni lat 20. ($200 za Tommy gun) |
| 58 | Rozdz. 16 / s. 459-471 | Zbiorcze podsumowania walki, broni, pościgów, SAN | 🟢 Zgodne 1:1 | `combat/`, `chase/`, `sanity/`, `magic/` | Zintegrowane karty w `message-card.tsx` | Master-protokół `gm-protocol.ts` | Suite testów integracyjnych i jednostkowych | Rekomendacja MG (Seth): interaktywne ściągi reguł w Kompendium Badacza UI |

---

## 3. Szczegółowy Protokół Audytu Rozdział po Rozdziale (Obszary 1-58)

### Rozdział 3: Tworzenie Badaczy (s. 34-53 / PDF 35-54)

#### Obszar 1: Cechy Badacza (STR, CON, SIZ, DEX, APP, INT, POW, EDU)
- **1. Podręcznik (str. 34-36 / PDF 35-37):**
  - Siła (S / STR): Rzut 3K6 x 5 (zakres 15-90). Określa siłę fizyczną i obrażenia wręcz. S = 0 oznacza inwalidztwo (brak siły by wstać).
  - Kondycja (KON / CON): Rzut 3K6 x 5 (zakres 15-90). Zdrowie, tężyzna, odporność. KON = 0 oznacza śmierć.
  - Budowa Ciała (BC / SIZ): Rzut (2K6 + 6) x 5 (zakres 40-90). Wzrost i masa.
  - Zręczność (ZR / DEX): Rzut 3K6 x 5 (zakres 15-90). Szybkość, zwinność, motoryka. ZR = 0 oznacza bezwład.
  - Wygląd (WYG / APP): Rzut 3K6 x 5 (zakres 15-90). Aparycja i magnetyzm osobisty. Wyłącznie dla ludzi, max 99.
  - Inteligencja / Pomysłowość (INT): Rzut (2K6 + 6) x 5 (zakres 40-90). Rozumowanie, pamięć. Wyznacza punkty zainteresowań (INT x 2).
  - Moc (MOC / POW): Rzut 3K6 x 5 (zakres 15-90). Siła woli i duch. Wyznacza startową Poczytalność (PP = MOC) oraz Punkty Magii (PM = 1/5 MOC).
  - Wykształcenie (WYK / EDU): Rzut (2K6 + 6) x 5 (zakres 40-90). Wiedza formalna. Wyznacza bazowy Język Ojczysty (WYK) oraz punkty zawodowe.
  - Progi sukcesu: Pełna wartość, Trudny sukces = floor(wartość / 2), Ekstremalny sukces = floor(wartość / 5).
- **2. Silnik TS (`src/lib/character/dice.ts:44-56`, `derived-stats.ts:10-70`):**
  - `rollCharacteristic3d6` wykonuje `sum(3d6) * 5`, `rollCharacteristic2d6Plus6` wykonuje `(sum(2d6) + 6) * 5`.
  - Typ `CharacterStats` ściśle modeluje 8 cech w skali 1-99.
  - Matematyczna zgodność z podręcznikiem: 100%.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-wizard.tsx:2062-2250`, `src/hooks/useCharacterManagement.ts:28-60`):**
  - Kreator postaci pozwala na rzut kośćmi w Etapie 1, wyświetla animację kości 3D i automatycznie wpisuje wyniki w pola formularza.
  - Stan przekazywany do magazynu Zustand oraz weryfikowany przed przejściem do Etapu 2.
- **4. Prompt & Parser (`session-zero-instructions.ts`, `build-context.ts:61`):**
  - Funkcja `buildPlayerCharacteristicsSection` wstrzykuje pełne wartości cech wraz z progami 1/2 i 1/5 do promptu systemowego LLM przed każdą turą.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1. Pełna zgodność matematyczna i integracja runtime.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Character Creation*, *Final Thoughts*): Czysty rzut 3K6x5 w grze solowej generuje ryzyko postaci kalekiej. Seth rekomenduje celową asymetrię Zręczności (DEX): większość potworów i NPC w podręcznikach ma DEX podzielne przez 5 (np. 50, 60), co przy czystym RAW rodzi zatory remisów w inicjatywie. Dodanie 1-2 punktów (np. DEX 56) daje graczowi pierwszeństwo ruchu.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: surowe losowanie 3K6x5) vs Opcja B (Praktyka Doświadczonych MG: asysta asymetrii DEX i ochrona minimalnych progów przeżywalności CON/POW). Rekomendacja: Opcja B, chroniąca gracza przed frustracją z niegrywalnej postaci.

#### Obszar 2: Tabela I: Modyfikator Obrażeń (DB) i Krzepa (Build)
- **1. Podręcznik (str. 37 / PDF 38):**
  - Suma Siła + Budowa Ciała (S + BC):
    - 2-64: MO = -2, Krzepa = -2
    - 65-84: MO = -1, Krzepa = -1
    - 85-124: MO = 0, Krzepa = 0
    - 125-164: MO = +1K4, Krzepa = +1
    - 165-204: MO = +1K6, Krzepa = +2
    - 205-284: MO = +2K6, Krzepa = +3
    - Każde kolejne rozpoczęte 80 punktów: +1K6 do MO i +1 do Krzepy.
  - Zastosowanie: wyłącznie walka wręcz i broń miotana; brak zastosowania dla broni palnej.
- **2. Silnik TS (`src/lib/data/character/tables.ts:8-18`, `derived-stats.ts:13-24`):**
  - Funkcja `calculateDamageBonusAndBuild(str, siz)` implementuje Tabelę I jako tablicę przedziałów z obsługą dynamicznej skali powyżej 284.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-wizard.tsx:2250-2310`, `src/components/chat/chat-window/components/opposed-melee-card.tsx:88-120`):**
  - Wartości DB i Krzepy są automatycznie przeliczane przy zmianie STR/SIZ w kreatorze oraz wyświetlane na karcie walki `OpposedMeleeCard` podczas rozstrzygania starcia wręcz.
- **4. Prompt & Parser (`weapon-context.ts:279`, `gm-protocol.ts:45`):**
  - `weapon-context.ts` przekazuje wyliczony DB do profilu broni gracza; tag `[WALKA_ATAK:]` wstrzykuje Krzepę do ewaluacji manewrów bojowych.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1. Pełna zgodność matematyczna.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Krzepa (Build) to najważniejszy filtr bezpieczeństwa w walce. Gracz o Build 0 nigdy nie zdoła powalić ani pochwycić stwora o Build 3+ (np. Shoggoth, Mroczny Młody), gdyż różnica Build >= 3 oznacza automatyczne fiasko manewru.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: pasywny zapis na karcie) vs Opcja B (Praktyka Doświadczonych MG: wizualne ostrzeżenie na karcie walki UI o nieskuteczności manewrów przeciw celom z przewagą Build >= 3). Rekomendacja: Opcja B.

#### Obszar 3: Punkty Magii (1/5 POW) i Poczytalności (SAN = POW)
- **1. Podręcznik (str. 37-38 / PDF 38-39):**
  - Punkty Magii (PM): równe floor(MOC / 5). Regeneracja naturalna: 1 PM na godzinę. Przy spadku PM do 0 kolejne koszty pobierane są z Punktów Wytrzymałości (PW 1:1).
  - Punkty Poczytalności (PP / SAN): początkowo równe cesze MOC (zakres 15-90). Maksymalny pułap w toku gry wynosi: 99 minus aktualna umiejętność Mity Cthulhu.
- **2. Silnik TS (`src/lib/character/derived-stats.ts:50-52`):**
  - `magicPoints = Math.floor(pow / 5)`, `sanity = pow`, `maxSanity = Math.max(0, 99 - cthulhuMythos)`.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-wizard.tsx:2260-2300`, `src/lib/character/apply-stat-changes.ts:104-123`):**
  - Wyświetlane na paskach zasobów w nagłówku karty Badacza oraz w modalu rzucania czarów `SpellCard.tsx:112`.
- **4. Prompt & Parser (`gm-protocol.ts` sekcja 7-BIS/TER, `apply-stat-changes.ts`):**
  - Model AI operuje na tagach `[SANITY: -N]` oraz sprawdza wyczerpanie PM; spadek do 0 PW/PM aktywuje procedurę utraty przytomności.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Sanity*, *Mythos & Magic*): Początkowa równość SAN = POW to pułapka psychologiczna - gracze z wysokim POW czują się bezpieczni, ale to oni najczęściej kuszą los rzucaniem magii, co prowadzi do gwałtownego drenażu SAN.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: automatyczne spalanie HP przy braku MP) vs Opcja B (Praktyka Doświadczonych MG: jawny monit w UI pytający gracza o zgodę na poświęcenie własnego życia za magię). Rekomendacja: Opcja B.

#### Obszar 4: Tworzenie Badacza (procedura standardowa)
- **1. Podręcznik (str. 34-40 / PDF 35-41):**
  - 5-etapowy proces: 1. Wyznaczenie cech i pochodnych (PW = (KON+BC)/10, Szczęście = 3K6x5, Ruch MOV = 7/8/9 wg proporcji ZR, S, BC); 2. Wybór zawodu; 3. Rozdział punktów umiejętności; 4. Historia Badacza (ideologia, ważne osoby, kluczowa więź z gwiazdką, ważne miejsca, rzeczy osobiste); 5. Ekwipunek i finanse.
- **2. Silnik TS (`src/lib/character/character-builder.ts:76-100`):**
  - Klasa `CharacterBuilder` orkiestruje kolejność etapów, waliduje sumy punktowe i powiązania biograficzne.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-wizard.tsx:2062-3693` Krok 1-3):**
  - W pełni funkcjonalny 5-krokowy kreator z walidacją formularzy i blokadą przejścia przy błędach alokacji.
- **4. Prompt & Parser (`session-zero-instructions.ts`, `build-context.ts`):**
  - Po zapisaniu postać jest serializowana do JSON i wstrzykiwana jako kontekst sesji zerowej.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Matt Colville, Seth Skorkowsky (*Character Creation*): Kluczowa więź (Key Connection) to nie tylko ozdobnik - to mechaniczna kotwica zapobiegająca popadnięciu w trwały obłęd podczas załamania nerwowego oraz narzędzie samopomocy.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: traktowanie historii jako czystego tekstu) vs Opcja B (Praktyka Doświadczonych MG: wstrzykiwanie 3 kotwic biograficznych wprost do promptu reżysera scen). Rekomendacja: Opcja B (wdrożona w systemie).

#### Obszar 5: Skala wartości Cech i Modyfikatory Wieku
- **1. Podręcznik (str. 36, 41-43 / PDF 37, 42-44):**
  - Skala cech: 0 (brak/śmierć), 15 (słaby), 50 (średnia ludzka), 90 (wybitny), 99 (maksimum człowieka), 140+ (nadludzki), 200+ (monstrualny).
  - Modyfikatory wieku: przedziały 15-19, 20-39, 40-49, 50-59, 60-69, 70-79, 80-90 lat nakładające kumulatywne testy rozwoju Wykształcenia (rzut k100 > WYK daje +1K10) oraz odliczenia punktów z S, KON, ZR, WYG i MOV.
- **2. Silnik TS (`src/lib/data/character/tables.ts:21-106`, `derived-stats.ts:77-135`):**
  - Struktura `AGE_MODIFIERS` zawiera definicje kar i testów WYK dla każdego przedziału wiekowego.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-wizard.tsx:2065-2067, 2260-2280`):**
  - Kreator automatycznie aplikuje modyfikatory po zmianie pola wieku postaci w Etapie 1.
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Prompt uwzględnia ograniczenia wieku przy opisach fizycznych działań Badacza.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Character Creation*): Wielokrotne rzuty na rozwój EDU i manualne odejmowanie punktów zniechęcają graczy do tworzenia dojrzałych postaci. Automatyzacja tego procesu w UI usuwa zbędny opór.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: ręczne rzucanie kośćmi na każdy etap starzenia) vs Opcja B (Praktyka Doświadczonych MG: natychmiastowy kalkulator w tle z możliwością pominięcia kar dla kampanii pulpowych). Rekomendacja: Opcja B.

#### Obszar 6: Zawody i punkty umiejętności (zawodowe / hobby)
- **1. Podręcznik (str. 40, 44-48 / PDF 41, 45-49):**
  - Punkty zawodowe: wyliczane wg formuły zawodu (np. WYK x 4 lub WYK x 2 + ZR x 2) i rozdzielane na 8 umiejętności profesji oraz Majętność.
  - Punkty zainteresowań: równe INT x 2, rozdzielane na dowolne umiejętności poza Mitami Cthulhu.
- **2. Silnik TS (`src/lib/character/occupation-points.ts:9-43`, `distribute-skill-points.ts`):**
  - Moduł zawiera formuły punktowe dla wszystkich zawodów podręcznikowych i pilnuje bilansu punktów.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-wizard.tsx:2783-3090, 3091-3693`):**
  - Dynamiczne liczniki punktów zawodowych i hobbystycznych blokujące przejście w przypadku przekroczenia limitu.
- **4. Prompt & Parser (`session-zero-instructions.ts`):**
  - Postać przekazywana z jasnym podziałem na umiejętności zawodowe i hobbystyczne.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Building Your Party*): Kluczowa zasada stołu to specjalizacja. Badacz z umiejętnościami rozproszonymi po 30-40% jest bezużyteczny; w kluczowych umiejętnościach zawodowych należy dążyć do 50-70%.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: dowolny przydział bez asysty) vs Opcja B (Praktyka Doświadczonych MG: asystent w kreatorze sugerujący alokację w progi 50%+). Rekomendacja: Opcja B.

#### Obszar 7: Standardy życia i Tabela II: Gotówka i dobytek
- **1. Podręcznik (str. 49-51 / PDF 50-52):**
  - 6 standardów życia: Ubogi (MAJ 0), Biedny (MAJ 1-9), Przeciętny (MAJ 10-49), Zamożny (MAJ 50-89), Bogaty (MAJ 90-98), Krezus (MAJ 99+).
  - Tabela II (Lata 20. XX w.): Gotówka, Dobytek i Poziom wydatków (np. Przeciętny: Gotówka MAJ x 2, Dobytek MAJ x 50, Wydatki dzienne bez rzutu: 10$).
- **2. Silnik TS (`src/lib/economy/credit-rating.ts:64-160`, `character-builder.ts:48`):**
  - Pełna implementacja współczynników gotówki, majątku i poziomu wydatków dla epoki lat 20. oraz czasów współczesnych.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-sheet/components/sheet-equipment.tsx:150-208`, `src/components/ui/character-wizard.tsx:3940-4100`):**
  - Wskaźnik Majętności i poziom wydatków zintegrowany w nagłówku ekwipunku Badacza.
- **4. Prompt & Parser (`buildPlayerFinancesSection` w `build-context.ts:167`):**
  - Informacje o statusie materialnym Badacza są przekazywane do modelu AI, umożliwiając realistyczną reakcję NPC na zamożność gracza.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky, Sandy Petersen: Credit Rating to status społeczny. Drobne wydatki poniżej poziomu życia nie wymagają rzutów ani liczenia centów.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: mikro-rozliczenia każdego dolara) vs Opcja B (Praktyka Doświadczonych MG: czysta abstrakcja statusu materialnego bez księgowego szumu). Rekomendacja: Opcja B (wdrożona w PR #475).

#### Obszar 8: Alternatywne tworzenie (pula punktowa, Quick Fire)
- **1. Podręcznik (str. 52-53 / PDF 53-54):**
  - Metody opcjonalne: Pula punktów na cechy (460 punktów rozdzielane na 8 cech w zakresie 15-90, min. INT/BC 40); Quick Fire (przypisanie wartości: 40, 50, 50, 50, 60, 60, 70, 80; umiejętności zawodowe: 1x70, 2x60, 3x50, 3x40; niezawodowe: 4x +20% powyżej bazy).
- **2. Silnik TS (`src/components/ui/character-wizard.tsx:600-750`):**
  - Implementacja trybu Point Buy oraz Quick Fire w kreatorze.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-wizard.tsx:2069-2130` tryb `pointbuy`):**
  - Przełącznik metody generowania w pierwszym kroku kreatora.
- **4. Prompt & Parser (`session-zero-instructions.ts`):**
  - Model AI akceptuje karty tworzone dowolną metodą podręcznikową.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Character Creation*): Quick Fire to optymalna metoda dla jednostrzałów i rozgrywek online, eliminująca dysproporcje w drużynie.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: preferowanie losowości 3K6) vs Opcja B (Praktyka Doświadczonych MG: Quick Fire jako domyślna rekomendacja). Rekomendacja: Opcja B.

#### Obszar 9: Tabela wartości 1/2 (Hard) i 1/5 (Extreme)
- **1. Podręcznik (str. 53, 471 / PDF 54, 472):**
  - Wartości wyliczane matematycznie z zaokrągleniem w dół: Sukces Trudny = floor(wartość / 2), Sukces Ekstremalny = floor(wartość / 5).
- **2. Silnik TS (`src/lib/dice-utils.ts:101-110, 178-191`):**
  - Czyste funkcje matematyczne deterministycznie wyznaczające progi w locie.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/skill-test-card.tsx:46-60, 220-228`, `src/components/chat/chat-window/components/dice-roll-card.tsx:22-60`, `src/components/ui/character-sheet/components/sheet-skills.tsx:58-60`):**
  - Progi wyświetlane na tackach rzutu kością w interfejsie czatu.
- **4. Prompt & Parser (`gm-protocol.ts` tag `[TEST:]`):**
  - Tag testu operuje na poziomach: zwykły, trudny, ekstremalny.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): Wyliczenie progów musi być widoczne dla gracza przed rzutem, aby mógł ocenić ryzyko wydania Szczęścia.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG). Obie opcje są tożsame: deterministyczny kalkulator w UI. Konsekwencje UX: zero halucynacji matematycznych modelu AI i pełna jawność progów rzutu dla gracza.

---

### Rozdział 4: Umiejętności (s. 58-89 / PDF 59-90)

#### Obszar 10: Punkty umiejętności i wartości bazowe
- **1. Podręcznik (str. 58-60 / PDF 59-61):**
  - Wartości bazowe umiejętności określają kompetencję człowieka bez przeszkolenia. Skala: 01-05% (nowicjusz), 06-19% (debiutant), 20-49% (amator), 50-74% (profesjonalista), 75-89% (ekspert), 90%+ (mistrz świata).
- **2. Silnik TS (`src/lib/data/character/skills.ts:8-85`):**
  - Rejestr `BASE_SKILLS` zawiera kanoniczne wartości początkowe.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-wizard.tsx:3091-3693`, `src/lib/skill-test-resolver.ts:25-50`):**
  - Wykorzystywane przy tworzeniu postaci oraz weryfikacji poprawności rzutów w grze.
- **4. Prompt & Parser (`skill-result-instructions.ts`):**
  - Interpretacja wyniku w zależności od stopnia biegłości postaci.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Matt Colville (*When to Roll*): Czynności zawodowe wykonywane bez presji czasu powinny udawać się automatycznie, bez rzucania na bazowy procent.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: rzut na wszystko) vs Opcja B (Praktyka Doświadczonych MG: Fiction First i sukces automatyczny w rutynie). Rekomendacja: Opcja B.

#### Obszar 11: Kanoniczna lista umiejętności CoC 7e
- **1. Podręcznik (str. 61-87 / PDF 62-88):**
  - Pełny słownik umiejętności, w tym specjalizacje Nauki, Sztuki, Walki wręcz i Broni palnej, oraz umiejętności rzadkie: Hipnoza (01%), Czytanie z ruchu warg (01%), Nurkowanie (01%), Artyleria (01%). Mity Cthulhu zawsze startują z 00%.
- **2. Silnik TS (`src/lib/data/character/skills.ts`, `skill-test-resolver.ts:40-150`):**
  - Kompletny zestaw umiejętności z polskimi nazwami i regułami specjalnymi.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-sheet/components/sheet-skills.tsx:31-80`, `src/components/chat/chat-window/components/skill-test-card.tsx:180-205`):**
  - Karta postaci z filtrem (Wszystkie / Zawodowe / Rozwinięte z PR #458).
- **4. Prompt & Parser (`buildPlayerSkillsSection` w `build-context.ts`):**
  - Wstrzykiwanie aktualnych umiejętności Badacza do promptu.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Final Thoughts*): Docenienie umiejętności rzadkich (Hipnoza, Czytanie z ruchu warg) potrafi odmienić przebieg śledztwa.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG: filtr UI ułatwiający dostęp do rzadkich skilli). Rekomendacja: Opcja B.

#### Obszar 12: Zasady opcjonalne umiejętności i specjalizacje
- **1. Podręcznik (str. 88-89 / PDF 89-90):**
  - Zasada Synergy Transfer: osiągnięcie 50% w jednej specjalizacji z grupy daje +10% do pozostałych (do pułapu 50%); osiągnięcie 90% daje kolejne +10% (do pułapu 90%).
- **2. Silnik TS (`src/lib/character/normalize-skill-name.ts:19-150`):**
  - Normalizator nazw mapujący odmiany, synonimy i specjalizacje na węzły kanoniczne.
- **3. Podpięcie UI / Runtime (`src/lib/character/distribute-skill-points.ts:1-120`, `src/hooks/useSkillMarking.ts:40-120`):**
  - Obsługa znaczników rozwoju i alokacji punktów.
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Model AI posługuje się znormalizowanymi nazwami umiejętności w tagach `[TEST:]`.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): Elastyczność specjalizacji. Jeśli Badacz ma wysoką Biologię, a sytuacja wymaga Zoologii, należy zastosować kość karną zamiast zablokowania testu.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: odrzucenie testu bez dokładnej specjalizacji) vs Opcja B (Praktyka Doświadczonych MG: inteligentny fallback na dziedzinę pokrewną z kością karną). Rekomendacja: Opcja B.

---

### Rozdział 5: System gry (s. 92-111 / PDF 93-112)

#### Obszar 13: Testy umiejętności i poziomy trudności
- **1. Podręcznik (str. 92-93 / PDF 93-94):**
  - Sukces Zwykły (k100 <= wartość), Sukces Trudny (k100 <= 1/2 wartości), Sukces Ekstremalny (k100 <= 1/5 wartości). Poziom Trudny wymagany przy trudnych okolicznościach lub przeciw przeciwnikowi o wartości 50-89; Ekstremalny przeciw wartości 90+.
- **2. Silnik TS (`src/lib/dice-utils.ts:22-37, 206-213`):**
  - Typ `RequiredDifficulty` ('regular' | 'hard' | 'extreme') deterministycznie sprawdzany przy każdym rzucie.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/skill-test-card.tsx:46-60, 180-220`, `src/hooks/useChat.ts:22, 1627-1645`):**
  - Tacka testu w czacie wyświetla wymagany poziom trudności narzucony przez MG.
- **4. Prompt & Parser (`mechanics-parser.ts:134`):**
  - Parser ekstrahuje poziom trudności z tagu `[TEST: Umiejętność | trudność | ...]`.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*), Matt Colville: Narzucanie trudności Hard dla zwykłych czynności niszczy zabawę. Trudność Regular powinna stanowić 85% wszystkich testów śledczych.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: swoboda AI w ustalaniu progów) vs Opcja B (Praktyka Doświadczonych MG: domyślny próg Regular w promptach; Hard wymaga podania uzasadnienia fabularnego). Rekomendacja: Opcja B.

#### Obszar 14: Rzucanie k100: Sukces, Porażka, Skala sukcesu
- **1. Podręcznik (str. 94 / PDF 95):**
  - Skala rezultatów: Krytyk (01), Ekstremalny (<= 1/5), Trudny (<= 1/2), Zwykły (<= wartość), Porażka (> wartość), Pech (100 lub 96-100 gdy umiejętność < 50).
- **2. Silnik TS (`src/lib/dice-utils.ts:85-117`):**
  - Funkcja `evaluateSkillCheck` zwraca pełną ewaluację sukcesu i pecha.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/skill-test-card.tsx:46-60, 136-156`, `src/components/chat/chat-window/components/dice-roll-card.tsx:22-60`):**
  - Wizualny feedback na karcie rzutu z odpowiednim kolorem i oznaczeniem stopnia sukcesu.
- **4. Prompt & Parser (`skill-result-instructions.ts`):**
  - Wynik przekazywany do promptu celem wygenerowania narracyjnej odpowiedzi.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Sandy Petersen (Zasada 2: Don't Use Jargon / Fiction First): Wynik rzutu musi być natychmiast ubrany w zmysłowy opis świata; zakaz podawania suchych liczb w narracji.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG: odcinanie żargonu liczbowego z tekstu asystenta). Rekomendacja: Opcja B.

#### Obszar 15: Forsowanie rzutu (Pushed Roll) i stawka porażki
- **1. Podręcznik (str. 95-97 / PDF 96-98):**
  - Gracz może ponowić nieudany test przy fabularnym uzasadnieniu podjęcia większego ryzyka. Strażnik MUSI określić stawkę porażki PRZED drugim rzutem. Zakaz forsowania w walce, Poczytalności, Szczęściu i Pomysłowości.
- **2. Silnik TS (`dice-roll-card.tsx`, `RollTestModal.tsx:120`):**
  - Mechanika forsowania rzutu z blokadami dla testów walki i SAN.
- **3. Podpięcie UI / Runtime (`src/components/dialogs/RollTestModal.tsx:131-190, 246-259`):**
  - Przycisk forsowania z ostrzeżeniem o konsekwencjach.
- **4. Prompt & Parser (`gm-protocol.ts:530`):**
  - Model AI ma obowiązek zapowiedzieć konsekwencje porażki przed dopuszczeniem forsowania.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): Przykład z firankami w Innsmouth. Ścisły wymóg: gracz musi znać cenę porażki przed rzutem forsowanym, inaczej traci zaufanie do Mistrza Gry.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: stawka określana post factum) vs Opcja B (Praktyka Doświadczonych MG: jawna stawka na karcie Pushed Roll przed kliknięciem). Rekomendacja: Opcja B.

#### Obszar 16: Porażki w rzutach i eskalacja komplikacji
- **1. Podręcznik (str. 98 / PDF 99):**
  - Porażka w rzucie nieforsowanym oznacza brak sukcesu lub sukces za cenę komplikacji. Dopiero porażka w rzucie forsowanym przynosi katastrofę.
- **2. Silnik TS (`src/lib/parsers/mechanics-parser.ts`, `idea-roll-service.ts`):**
  - Obsługa stanów komplikacji w parserze i serwisie pomysłów.
- **3. Podpięcie UI / Runtime (`src/hooks/useChat.ts:1627-1645`, `src/components/ui/journal/idea-roll-modal.tsx:42-50, 80-150`):**
  - Przepływ czatu integrujący narrację komplikacji.
- **4. Prompt & Parser (`gm-protocol.ts` Bieg 3: Przełamanie):**
  - Twarda dyrektywa Fail-Forward zakazująca blokowania gry przy porażce.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Justin Alexander, Banaś/Baniak: Całkowity zakaz pustych porażek ("rzucasz i nic się nie dzieje"). Każda porażka musi zmienić sytuację w fikcji.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW tradycyjny) vs Opcja B (Praktyka Doświadczonych MG: reguła Fail-Forward w promptach). Rekomendacja: Opcja B.

#### Obszar 17: Testy wielu graczy (asysta / grupa)
- **1. Podręcznik (str. 98 / PDF 99):**
  - Asysta: kość premiowa dla prowadzącego LUB obaj rzucają i porażka jednego niszczy próbę. Test grupowy: rzut wykonuje postać o najniższym skillu.
- **2. Silnik TS (`src/lib/combined-skill-rolls.ts:56-113`, `src/hooks/useChat.ts:202-215, 1816-1824, 2555`):**
  - Obsługa testów grupowych i asysty w trybie kooperacji / Hot Seat.
- **3. Podpięcie UI / Runtime (`src/hooks/useChat.ts:1633-1637, 1816-1824`, `src/components/ui/player-switcher.tsx:43-120`, `src/components/chat/chat-window/components/skill-test-card.tsx:187-190`):**
  - Wsparcie adresowania wielu postaci w czacie (`@Imię:`).
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Generowanie rzutów grupowych z uwzględnieniem najsłabszego ogniwa.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): Asysta wymaga fizycznego uzasadnienia. Przy skradaniu rzuca najgłośniejszy gracz, chyba że lider zadeklaruje osłonę.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG). Obie opcje zrealizowane w kodzie. Konsekwencje UX: klarowna agencja gracza i eliminacja absurdalnych asyst przy testach niewymagających kooperacji.

#### Obszar 18: Granice ludzkich możliwości, Krytyki (01) i Pechy (96-100)
- **1. Podręcznik (str. 98-99 / PDF 99-100):**
  - 01 to zawsze Krytyczny Sukces. Pech (Fumble): wynik 100 (gdy umiejętność >= 50) lub 96-100 (gdy umiejętność < 50). Pech nie może być forsowany ani zmieniony Szczęściem.
- **2. Silnik TS (`src/lib/dice-utils.ts:89-98`):**
  - Deterministyczne sprawdzanie progu 50% przy kwalifikacji pecha.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/skill-test-card.tsx:180-205`, `src/components/chat/chat-window/components/dice-roll-card.tsx:22-60`):**
  - Dedykowana prezentacja graficzna dla krytyków i pechów.
- **4. Prompt & Parser (`gm-protocol.ts` Twarde Weto Sędziego):**
  - Wymóg spektakularnego opisu zwrotu akcji przy wynikach skrajnych.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): Krytyk 01 powinien dawać natychmiastowy bonus w świecie gry oraz oznaczenie do rozwoju w fazie podsumowania.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: suchy raport) vs Opcja B (Praktyka Doświadczonych MG: diegetyczna nagroda narracyjna). Rekomendacja: Opcja B.

#### Obszar 19: Szczęście (wydawanie 1:1, zakazy przy pechu i SAN)
- **1. Podręcznik (str. 100 / PDF 101):**
  - Wydawanie punktów Szczęścia 1:1 celem obniżenia wyniku rzutu k100. Bezwzględny zakaz wydawania na: testy SAN, rzuty utraty SAN, obrażenia, zacięcia broni (Malf), rzuty forsowane oraz zamianę pecha.
- **2. Silnik TS (`RollTestModal.tsx:110-140`, `dice-utils.ts:63`):**
  - Logika wydawania Szczęścia z programową blokadą suwaka dla rzutów zabronionych.
- **3. Podpięcie UI / Runtime (`src/components/dialogs/RollTestModal.tsx:100-103, 252-256`):**
  - Interaktywny suwak pozwalający graczowi dopłacić brakujące punkty.
- **4. Prompt & Parser (`gm-protocol.ts:538`):**
  - Model AI respektuje obniżony wynik jako pełnoprawny sukces.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): Najlepsza mechanika 7e dająca graczom agencję. Żelazne przestrzeganie zakazu wydawania Szczęścia na SAN buduje atmosferę bezsilności wobec koszmaru.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW podstawowy: brak wydawania) vs Opcja B (Praktyka Doświadczonych MG i Zasada Opcjonalna RAW: wydawanie 1:1 z twardymi blokadami). Rekomendacja: Opcja B (wdrożona w silniku).

#### Obszar 20: Testy Inteligencji / Pomysłowości (Idea Roll)
- **1. Podręcznik (str. 101 / PDF 102):**
  - Służy do przełamania martwego punktu w śledztwie. Sukces: Badacz otrzymuje poszlakę bez komplikacji. Porażka: Badacz I TAK OTRZYMUJE poszlakę, lecz natychmiast ląduje w poważnych tarapatach.
- **2. Silnik TS (`src/lib/journal/idea-roll-service.ts:1-180`):**
  - Serwis analizuje stan śledztwa i generuje podpowiedź z gwarancją poszlaki.
- **3. Podpięcie UI / Runtime (`src/components/ui/journal/idea-roll-modal.tsx:42-50, 80-200`, `src/components/ui/journal/discoveries-view.tsx:105-112, 520-560`):**
  - Dedykowany modal wywoływany przez gracza lub sugerowany przez UI przy impasie.
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Dyrektywa nakazująca modelowi ujawnienie poszlaki z jednoczesnym wprowadzeniem zagrożenia przy porażce.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): 100% gwarancji poszlaki to absolutny fundament. Porażka w rzucie INT nie oznacza "nie wiesz nic", lecz "dowiadujesz się za późno, gdy kultyści już wyważają drzwi".
  - *Pytanie decyzyjne dla PO:* Opcja A (Błędna interpretacja: porażka blokuje grę) vs Opcja B (Prawdziwy RAW s. 101 i Praktyka Doświadczonych MG: 100% dostarczenia poszlaki za cenę kłopotów). Rekomendacja: Opcja B.

#### Obszar 21: Test Wiedzy (Wykształcenie / EDU)
- **1. Podręcznik (str. 101 / PDF 102):**
  - "Know Roll": test cechy Wykształcenie w sprawach ogólnej wiedzy akademickiej i encyklopedycznej, gdy brak umiejętności szczegółowej.
- **2. Silnik TS (`src/lib/skill-test-resolver.ts:60-90`):**
  - Obsługa testu cechy EDU na tych samych zasadach co umiejętności.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/skill-test-card.tsx:180-205, 340-355`):**
  - Pobranie wartości EDU bezpośrednio z karty Badacza.
- **4. Prompt & Parser (`gm-protocol.ts` `[TEST: Wykształcenie]`):**
  - Prompt wzywa test EDU zamiast żądać wąskich nauk specjalistycznych.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): Stosowanie testu EDU zapobiega paraliżowi śledztwa przy sprawdzaniu powszechnej wiedzy historycznej epoki.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG). Obie opcje tożsame. Konsekwencje UX: płynność śledztwa bez blokowania fabuły na wiedzy ogólnej Badacza.

#### Obszar 22: Przeciwstawny test umiejętności (Opposed Roll)
- **1. Podręcznik (str. 101-102 / PDF 102-103):**
  - Porównanie poziomów sukcesu: Porażka < Zwykły < Trudny < Ekstremalny < Krytyk. Remis poza walką wygrywa strona o wyższej wartości bazowej; przy równych wartościach remis trwa lub następuje ponowny rzut.
- **2. Silnik TS (`src/lib/opposed-rolls.ts:1-250`):**
  - Deterministyczny resolver testów spornych wyliczający hierarchię i remisy.
- **3. Podpięcie UI / Runtime (`src/components/dialogs/OpposedRollModal.tsx:42-49, 110-180, 250-570`, `src/components/chat/chat-window/components/skill-test-card.tsx:127, 359-375`):**
  - Modal rozstrzygania sporów z wizualizacją wyników obu stron.
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Prompt definiuje uczestników i stawkę sporu.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*, *Skill Mechanics*): Czyste porównanie poziomów sukcesu zastąpiło starą Tabelę Odporności. Determinizm w kodzie eliminuje pomyłki sędziowskie AI.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW w kodzie TS) vs Opcja B (Praktyka Doświadczonych MG). Obie tożsame: deterministyczny arbiter w TS. Konsekwencje UX: bezstronność sędziowska i zero pomyłek przy rozstrzyganiu sporów z NPC.

#### Obszar 23: Kości premiowe i karne (d10 dziesiątek)
- **1. Podręcznik (str. 102-103 / PDF 103-104):**
  - Rzut kością jedności i wieloma kośćmi dziesiątek (wybór najniższego wyniku dla premii, najwyższego dla kary). Kość premiowa i karna znoszą się wzajemnie 1:1.
- **2. Silnik TS (`src/lib/dice-utils.ts:228-261` `rollD100WithBonus`):**
  - Algorytm rzuca kośćmi dziesiątek i jedności zgodnie z zasadami d10 dziesiątek.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/skill-test-card.tsx:63-86, 130-132`, `src/components/chat/chat-window/components/opposed-melee-card.tsx:39, 70-110`):**
  - Wyświetlanie kości dodatkowych na tacce rzutu z oznaczeniem kości odrzuconej.
- **4. Prompt & Parser (`gm-protocol.ts` modyfikatory w tagu):**
  - Przekazywanie parametrów `+1k premiowa`, `-1k karna` w tagu testu.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): Kości karne i premiowe wchodzą tylko przy istotnych przeszkodach (ulewa, ciemność, zapaśniczy chwyt); drobne czynniki nie uzasadniają modyfikatora.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG: czytelna wizualizacja odrzuconej kości w UI). Rekomendacja: Opcja B.

#### Obszar 24: Łączone testy umiejętności
- **1. Podręcznik (str. 103 / PDF 104):**
  - Jeden rzut k100 rozstrzyga test dwóch różnych umiejętności (np. Spostrzegawczość i Ślusarstwo).
- **2. Silnik TS (`src/lib/combined-skill-rolls.ts:56-113`):**
  - Funkcja ewaluuje pojedynczy rzut przeciwko dwóm różnym progom umiejętności z logiką AND/OR.
- **3. Podpięcie UI / Runtime (`src/lib/parsers/mechanics-parser.ts:178-210`, `src/components/chat/chat-window/components/skill-test-card.tsx:120, 192-196, 209-232`):**
  - Tacka testu prezentuje oba paski umiejętności i wynik pojedynczego rzutu.
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Wymóg formatu `[TEST: Umiejętność1 + Umiejętność2]`.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): Błąd podwójnego rzucania kośćmi niszczy szanse gracza (20% x 20% = 4% szansy). Pojedynczy rzut k100 to żelazna reguła sprawiedliwego prowadzenia.
  - *Pytanie decyzyjne dla PO:* Opcja A (Błędna praktyka: 2 rzuty) vs Opcja B (Prawdziwy RAW s. 103 i Praktyka Doświadczonych MG: 1 rzut dla dwóch umiejętności). Rekomendacja: Opcja B.

#### Obszar 25: Umiejętności społeczne i Blokada Uległości NPC
- **1. Podręcznik (str. 104-105 / PDF 105-106):**
  - Gadanina, Perswazja, Urok Osobisty, Zastraszanie. Dyrektywa Pushback: umiejętności społeczne to nie kontrola umysłu; NPC nie zdradzą tajemnic sprzecznych z ich naturą lub interesem bez potężnych dźwigni fabularnych i wysokich sukcesów.
- **2. Silnik TS (`src/lib/opposed-rolls.ts`, `gm-protocol.ts:68, 540`):**
  - Reguły przeciwstawiania testów społecznych Psychologii lub Mocy NPC.
- **3. Podpięcie UI / Runtime (`src/hooks/useChat.ts:1480-1650`, `src/components/chat/chat-window/components/message-card.tsx:339-342`):**
  - Strumień dialogowy egzekwujący opór postaci niezależnych.
- **4. Prompt & Parser (`gm-protocol.ts` dyrektywa Pushback RAW s. 105):**
  - Bezwzględna instrukcja zakazująca uległości kultystów i świadków na pierwsze pytanie gracza.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Kanon Worldbuildingu (Karta 02: 4 warstwy NPC): Maska, Skaza, Ukryta intencja, Próg oporu. NPC stawia opór, prawda kosztuje (łapówka, przysługa, szantaż).
  - *Pytanie decyzyjne dla PO:* Opcja A (Miękki puryzm: model decyduje sam) vs Opcja B (Praktyka Doświadczonych MG: twarda blokada Pushback RAW chroniąca intrygę przed gadatliwym AI). Rekomendacja: Opcja B (wdrożona w silniku).

#### Obszar 26: Faza rozwoju Badacza (rozwój skilli i EDU)
- **1. Podręcznik (str. 105-108 / PDF 106-109):**
  - Oznaczone umiejętności (udany test w sesji) są testowane: rzut k100 > aktualna wartość (lub 96-100) daje przyrost +1K10. Test rozwoju Wykształcenia: rzut k100 > WYK daje +1K10 do WYK (max 99). Odzyskiwanie Szczęścia: rzut k100 > Szczęście daje +1K10.
- **2. Silnik TS (`src/lib/character-development.ts:127-194`):**
  - Funkcje `rollSkillDevelopment`, `rollEDUDevelopment`, `rollLuckRecovery`.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/DevelopmentPhaseCard.tsx:22-120` w `src/components/chat/chat-window/components/message-card.tsx:312-316, 328-332`):**
  - Karta fazy rozwoju montowana w czacie po zakończeniu przygody.
- **4. Prompt & Parser (`gm-protocol.ts` `[KONIEC_SESJI]`):**
  - Tag emitowany przez model po domknięciu śledztwa.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟡 Rozbieżność z RAW: kod funkcji `rollEDUDevelopment` istnieje w `character-development.ts:175-193`, lecz w pliku testowym `character-development-coc.test.ts` brakuje dla niej dedykowanej asercji testowej.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Skill Mechanics*): House-rules Setha: zezwolenie na zaznaczenie umiejętności użytej z taktyczną kością premiową oraz kość karna przy rozwoju za rzut krytyczny 01.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: brak rozwoju przy kości premiowej) vs Opcja B (Praktyka Doświadczonych MG: opcja nagrody za taktyczne zagrania i odzysk Szczęścia). Rekomendacja: Opcja B.

#### Obszar 27: Majętność i zakupy codzienne bez rzutu
- **1. Podręcznik (str. 107-109 / PDF 108-110):**
  - Zakupy poniżej poziomu wydatków nie wymagają rzutów ani odliczania gotówki. Większe zakupy wymagają testu Majętności lub odliczenia z gotówki / dobytku.
- **2. Silnik TS (`src/lib/economy/credit-rating.ts:1-200`):**
  - Klasa `CreditRatingEngine` walidująca zakupy względem progu wydatków.
- **3. Podpięcie UI / Runtime (`src/components/ui/character-sheet/components/sheet-equipment.tsx:150-208`, `src/lib/context/build-context.ts:167`):**
  - Prezentacja statusu majątkowego w ekwipunku.
- **4. Prompt & Parser (`buildPlayerFinancesSection`):**
  - Przekazywanie limitów wydatków do promptu sesji.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Character Creation*): Rezygnacja z mikro-księgowości przyspiesza sesję i utrzymuje filmowe tempo.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW mikro-wydatków) vs Opcja B (Praktyka Doświadczonych MG: płynna narracja statusu materialnego). Rekomendacja: Opcja B.

#### Obszar 28: Zasady opcjonalne: Adjudykacja zdarzeń
- **1. Podręcznik (str. 110-111 / PDF 111-112):**
  - Szczęście jako rzut sprawdzający zbieg okoliczności (np. czy w baku jest paliwo), adjudykacja narracyjna, zasady pulpowe.
- **2. Silnik TS (`src/lib/concordia/event-resolution.ts`, `scene-director.ts`):**
  - Moduł orkiestracji zdarzeń i wsparcia sędziowskiego.
- **3. Podpięcie UI / Runtime (`src/hooks/useChat.ts:45, 1998`):**
  - Dynamiczna aktualizacja stanu guardraili po zdarzeniach.
- **4. Prompt & Parser (`scene-director.ts`):**
  - Dobór technik scenopisarskich pod kątem dramaturgii.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Matt Colville, Sandy Petersen: Mistrz Gry jest arbitrem dbającym o spójność świata i dramaturgię, a nie przeciwnikiem gracza.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG). Obie opcje realizowane w silniku. Konsekwencje UX: prymat dramaturgii scenariuszowej nad suchym rzutem kością.

---

### Rozdział 6: Walka (s. 114-143 / PDF 115-144)

#### Obszar 29: Runda walki, inicjatywa wg DEX, deklaracje
- **1. Podręcznik (str. 114-115 / PDF 115-116):**
  - Runda walki trwa elastycznie 5-10 sekund. Inicjatywa wg Zręczności (DEX) od najwyższej do najniższej. Broń palna wyciągnięta i wycelowana przed rundą daje inicjatywę DEX + 50 punktów (pod warunkiem braku ruchu przed strzałem). Zaskoczenie uniemożliwia obronę i daje napastnikowi kość premiową.
- **2. Silnik TS (`src/lib/combat/combat-resolver.ts`, `firearms-engine.ts:18`):**
  - Kolejka inicjatywy wyliczana na podstawie DEX; stała `FIREARMS_READIED_BONUS = 50` w `firearms-engine.ts:18`.
- **3. Podpięcie UI / Runtime (`src/components/combat/CombatDexRibbon.tsx:43-120, 183-220` w `src/components/chat/chat-window/index.tsx:34, 430`):**
  - Wstęga inicjatywy prezentuje kolejność tur uczestników starcia w nagłówku czatu.
- **4. Prompt & Parser (`gm-protocol.ts:45` tag `[WALKA_ATAK:]`):**
  - Tag ataku inicjuje turę bojową zgodnie z ustaloną kolejnością DEX.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Przy remisach DEX między Badaczem a wrogiem Seth stosuje regułę jednoczesności ciosów (symultaneous resolution) zamiast żmudnych dogrywek, co podnosi dramatyzm i śmiertelność starcia.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: żmudne rozstrzyganie remisów umiejętnością bojową) vs Opcja B (Praktyka Doświadczonych MG: symultaniczne rozstrzygnięcie remisów w kodzie TS). Rekomendacja: Opcja B.

#### Obszar 30: Walka wręcz, bijatyka i obrażenia (1k3 + DB)
- **1. Podręcznik (str. 115-116 / PDF 116-117):**
  - Bijatyka bez broni: 1K3 + Modyfikator Obrażeń (MO/DB).
  - Sukces Ekstremalny:
    - Broń obuchowa i pięści: maksymalne obrażenia broni + maksymalny DB.
    - Broń kłująca i cięta (Przebicie / Impale): maksymalne obrażenia broni + maksymalny DB + dodatkowy standardowy rzut kością obrażeń broni.
- **2. Silnik TS (`src/lib/combat/combat-resolver.ts:483-550`, `combat-transaction.ts`):**
  - Pełna implementacja mechaniki Impale z rozróżnieniem typów broni (blunt vs piercing/slashing).
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/opposed-melee-card.tsx:30-34, 46-120` w `src/components/chat/chat-window/components/message-card.tsx:558-567`):**
  - Karta walki wręcz w czacie kalkuluje i wyświetla zadane obrażenia oraz ich typ.
- **4. Prompt & Parser (`gm-protocol.ts:45`):**
  - Model AI przyjmuje wyliczone obrażenia i opisuje ich somatyczny skutek w fikcji.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Cios nożem z sukcesem ekstremalnym zadaje 4 + 4 + 1K4 = 9-12 obrażeń, co natychmiast powala przeciętnego człowieka (HP 10-12). CoC to nie gra heroiczna; walka na noże jest śmiertelna.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW i Praktyka Doświadczonych MG: pełne obrażenia Impale) vs Opcja B (Uproszczenie pulpowo-bohaterskie). Rekomendacja: Opcja A (wdrożona w silniku).

#### Obszar 31: Manewry bojowe (Build/Krzepa, chwyt, powalenie)
- **1. Podręcznik (str. 116-117 / PDF 117-118):**
  - Rozbrojenie, pochwycenie, powalenie na ziemię. Porównanie Krzepy (Build):
    - Cel ma Build <= atakujący: test normalny.
    - Cel ma Build o 1 większy: 1 kość karna.
    - Cel ma Build o 2 większy: 2 kości karne.
    - Cel ma Build o 3+ większy: manewr FIZYCZNIE NIEMOŻLIWY (automatyczne fiasko).
- **2. Silnik TS (`src/lib/combat/combat-resolver.ts:155-191`):**
  - Funkcja `resolveManeuver` sprawdza różnicę Build i nakłada kości karne lub blokuje akcję.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/opposed-melee-card.tsx:30-34, 300-340`):**
  - Przycisk deklaracji Manewru w karcie walki z dynamiczną blokadą przy różnicy Build >= 3.
- **4. Prompt & Parser (`weapon-context.ts`, `gm-protocol.ts`):**
  - Wytyczne zabraniające modelowi opisywania obalenia gigantycznych bestii przez człowieka.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Manewry to potężne narzędzie taktyczne gracza, ale Krzepa bestii stanowi twardą granicę fikcji.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG: wizualna dezaktywacja przycisku manewru w UI przy wrogach z Build >= 3). Rekomendacja: Opcja B.

#### Obszar 32: Drzewo walki: Unik vs Kontratak, obrona, przewaga liczebna
- **1. Podręcznik (str. 118-121 / PDF 119-122):**
  - Obrońca wybiera:
    - Kontratak (Fight Back): rzut na Walkę Wręcz; przy remisie stopnia sukcesu wygrywa NAPASTNIK. Obrońca zadaje obrażenia tylko przy wyższym sukcesie.
    - Unik (Dodge): rzut na Unik; przy remisie stopnia sukcesu wygrywa OBROŃCA (unika ciosu).
  - Przewaga liczebna (Outnumbered): postać ma 1 darmową obronę na rundę. Każdy kolejny napastnik wręcz w tej samej rundzie otrzymuje KOŚĆ PREMIOWĄ.
- **2. Silnik TS (`src/lib/combat/combat-resolver.ts:540-580`):**
  - Ścisła implementacja asymetrii remisów i licznika ataków w rundzie.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/opposed-melee-card.tsx:46-120, 200-280` w `src/components/chat/chat-window/components/message-card.tsx:538-548`):**
  - Karta starcia w czacie daje graczowi jawny wybór taktyczny: `[Unik (Bezpieczny na remisach)]` vs `[Kontratak (Ryzykowny)]`.
- **4. Prompt & Parser (`gm-protocol.ts:45`):**
  - Model AI przyjmuje wynik starcia z karty i kontynuuje narrację.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Asymetria remisów to serce taktyczne CoC 7e. Początkujący gracze giną, bo zawsze kontratakują zamiast robić Unik.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW w kodzie TS) vs Opcja B (Praktyka Doświadczonych MG). Obie opcje tożsame: wdrożony resolver TS z asercjami testowymi w `combat-defense.test.ts`. Konsekwencje UX: wyrazista taktyka przetrwania w starciu wręcz i nagradzanie defensywnego Uniku.

#### Obszar 33: Pancerz i pochłanianie obrażeń
- **1. Podręcznik (str. 122-123 / PDF 123-124):**
  - Wartość pancerza odejmowana od obrażeń fizycznych. Przy broni śrutowej pancerz odejmowany jest od każdej kości śrutu.
- **2. Silnik TS (`src/lib/combat/combat-transaction.ts`, `npc-combat-profile.ts`):**
  - Transakcyjne pomniejszanie obrażeń o współczynnik pancerza.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/opposed-melee-card.tsx:30-34, 350-400`, `src/components/chat/chat-window/components/combat-card.tsx:9-12` w `src/components/chat/chat-window/components/message-card.tsx:558-567`):**
  - Wizualizacja pochłoniętych punktów obrażeń na karcie walki.
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Wskazówki narracyjne opisujące rykoszety od pancerza lub grubej skóry stwora.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Podręcznik RAW pominął pancerze osobiste dla lat 20. Seth wprowadza historyczne stalowe kamizelki kuloodporne z katalogów z 1927 r. ($40 przód, $75 pełny tors = 5 punktów pancerza).
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: brak pancerzy w latach 20.) vs Opcja B (Praktyka Doświadczonych MG: dodanie stalowych kamizelek 1927 r. do katalogu ekwipunku). Rekomendacja: Opcja B.

#### Obszar 34: Broń palna: Zasięgi, point-blank, Dive for Cover
- **1. Podręcznik (str. 123-124 / PDF 124-125):**
  - Modyfikatory zasięgu: Point-blank (do 1/10 ZR w stopach / ok. 2-3 m) = kość premiowa do strzału; Długi zasięg = trudny sukces; Ekstremalny = ekstremalny sukces.
  - Rzucenie się za osłonę (Dive for Cover): obrońca może zadeklarować rzut na Unik przed strzałem z przyłożenia, znosząc kość premiową strzelca; KOSZT: padnięcie na ziemię (prone) i utrata kolejnej akcji.
- **2. Silnik TS (`src/lib/combat/firearms-engine.ts:60-150`):**
  - Moduł zawiera kompletne funkcje `resolveFirearmShot`, `calculateDistanceCategory`.
- **3. Podpięcie UI / Runtime (`src/components/ui/combat-system.tsx:640-700` w `src/components/ui/gm-tools-modal.tsx:11, 70-80`):**
  - Silnik podpięty pod modalne narzędzia MG; w oknie czatu brak dedykowanej karty `FirearmsCard` (gracz rzuca na uniwersalnej `SkillTestCard`).
- **4. Prompt & Parser (`buildFirearmPromptGuidance` w `weapon-context.ts:319`):**
  - Prompt systemowy otrzymuje tekstowe zasady walki bronią palną i orkiestruje starcie narracyjnie.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟠 Odłączone od UI czatu: deterministyczny kod balistyczny w `firearms-engine.ts` nie jest importowany w `message-card.tsx`. Walka w czacie sterowana jest przez prompt LLM.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Dive for Cover ratuje życie w starciu z bronią palną; house-rule Setha: skok za osłonę na dystans do 1/5 DEX w stopach.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm promptu: strzały rozstrzygane zwykłą tacką w czacie) vs Opcja B (Praktyka Doświadczonych MG: stworzenie dedykowanej karty `FirearmsCard` z przyciskiem reakcji Dive for Cover). Rekomendacja: Opcja B pod backlog PRP (TASK-RAW-02).

#### Obszar 35: Ogień ciągły i serie (salwy, Impale)
- **1. Podręcznik (str. 124-127 / PDF 125-128):**
  - Podział pocisków na salwy (min. 3 kule w salwie). Każda salwa to osobny test ataku z rosnącą liczbą kości karnych. Sukces ekstremalny: połowa trafień to Przebicie (Impale).
- **2. Silnik TS (`src/lib/combat/firearms-engine.ts:300-450`):**
  - Funkcja `resolveFirearmBurst` w pełni implementuje algorytm salw i kalkulację Impale.
- **3. Podpięcie UI / Runtime (`src/components/ui/combat-system.tsx:626-645` w `src/components/ui/gm-tools-modal.tsx:11, 70-80`):**
  - Działa w panelu GM tools; brak w pętli czatu.
- **4. Prompt & Parser (`buildFirearmPromptGuidance`):**
  - Model instruowany o zakazie samowolnego wymyślania liczby trafień.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟠 Odłączone od UI czatu: deterministyczny algorytm salw nie jest wywoływany z poziomu wiadomości czatu.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Ręczne liczenie salw na sesji stołowej bywa koszmarem. Automatyzacja algorytmu salw w aplikacji to potężna zaleta silnika cyfrowego.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm promptu) vs Opcja B (Praktyka Doświadczonych MG: podpięcie `resolveFirearmBurst` pod czat). Rekomendacja: Opcja B pod backlog PRP (TASK-RAW-02).

#### Obszar 36: Zawodność broni (Malf) i blokada Szczęścia
- **1. Podręcznik (str. 128 / PDF 129):**
  - Wskaźnik zawodności (Malfunction, np. 97 lub 100). Wynik rzutu >= Malf oznacza zacięcie broni. Żelazna reguła RAW: BEZWZGLĘDNY ZAKAZ WYDAWANIA SZCZĘŚCIA na rzut powodujący zacięcie broni.
- **2. Silnik TS (`src/lib/combat/firearms-engine.ts:200-240`):**
  - Flaga `malfunctionTriggered` oraz sprawdzanie progu awaryjności broni.
- **3. Podpięcie UI / Runtime (`src/components/dialogs/RollTestModal.tsx:100-125`):**
  - Suwak wydawania Szczęścia zostaje natychmiast zablokowany, gdy wynik rzutu wywołał zacięcie.
- **4. Prompt & Parser (`buildFirearmPromptGuidance`):**
  - Dyrektywa wymuszająca narrację awarii mechanicznej i konieczności usunięcia zacięcia (1K6 rund + test).
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Zacięcie broni to kluczowy moment budowania paniki na sesji - gracz stoi bezbronny naprzeciw potwora.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG). Obie opcje tożsame: twarda blokada Szczęścia przy zacięciu w UI. Konsekwencje UX: autentyczny dreszcz grozy, gdy gracz staje z zaciętą bronią bez możliwości wykupienia sukcesu.

#### Obszar 37: Rany, Ciężka Rana (Major Wound), Umieranie
- **1. Podręcznik (str. 131-136 / PDF 132-137):**
  - Ciężka Rana (Major Wound): pojedyncze obrażenia >= 1/2 maksymalnego HP. Wymaga testu KON na zachowanie przytomności. Spadek do 0 HP bez Ciężkiej Rany = nieprzytomność. Spadek do 0 HP z Ciężką Raną = Stan Agonalny (Dying) i śmierć na koniec rundy przy nieudanym teście KON. Pierwsza Pomoc stabilizuje na 1 HP; Medycyna przywraca 1K3 HP w ciągu 1 godziny.
- **2. Silnik TS (`src/lib/combat/combat-resolver.ts:350`, `apply-stat-changes.ts:124`):**
  - Pełna obsługa stanów `hasMajorWound`, `isUnconscious`, `isDying` oraz tarczy ocalenia Fail-Forward (losowa blizna pourazowa przy pierwszym wejściu w 0 HP).
- **3. Podpięcie UI / Runtime (`src/lib/character/apply-stat-changes.ts:104-160`, `src/components/chat/chat-window/components/opposed-melee-card.tsx:46-120`, `src/components/chat/chat-window/components/game-over-card.tsx:43-120` w `src/components/chat/chat-window/components/message-card.tsx:587-594`, oraz `src/components/dialogs/MedicalCareModal.tsx:56-120` w `src/components/ui/character-sheet/index.tsx:357-365`):**
  - Zmiana statusu Badacza w magazynie stanu gry, powiadomienia toast i karta zgonu.
- **4. Prompt & Parser (`gm-protocol.ts` `[HP: -N]`, `[GAME_OVER:]`):**
  - Model AI zarządza obrażeniami transakcyjnie po tagu.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Ścisłe egzekwowanie limitu 1 godziny na zastosowanie Medycyny wymusza dramatyczną ewakuację rannego do szpitala.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: natychmiastowa śmierć przy oblanym CON) vs Opcja B (Praktyka Doświadczonych MG i silnik Strażnika: tarcza Fail-Forward dająca bliznę przy pierwszym wejściu w 0 HP). Rekomendacja: Opcja B (doskonały balans grozy i agencji gracza).

#### Obszar 38: Inne obrażenia, Lokacje trafień (Tabela IV), Trucizny
- **1. Podręcznik (str. 136-143 / PDF 137-144):**
  - Tabela III: Obrażenia środowiskowe (upadki 1K6 na 3 m, ogień, kolizje, kwas). Tabela IV (opcjonalna): Lokacje trafień (rzut 1K20: 1-6 nogi, 7-15 tors/brzuch, 16-19 ręce, 20 głowa). Trucizny: siła trucizny (POT) przeciw KON; Ekstremalny sukces KON zmniejsza obrażenia o połowę.
- **2. Silnik TS (`src/lib/hazards-engine.ts:1-277`, `recovery-tracker.ts`):**
  - Funkcje kalkulacji upadków, tonięcia, ognia, kwasu oraz trucizn.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/hazard-card.tsx:59-150` w `src/components/chat/chat-window/components/message-card.tsx:404-439`):**
  - Interaktywna karta środowiskowa rozstrzygająca zagrożenia w czacie.
- **4. Prompt & Parser (`mechanics-parser.ts:313` tag `[ZAGROŻENIE:]`):**
  - Parser ekstrahuje typ zagrożenia, parametry i potencjalne obrażenia.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1: moduł `hazards-engine.ts` (277 linii) posiada pełną implementację matematyczną oraz dedykowany zestaw 16 testów jednostkowych w `src/tests/unit/hazards-engine.test.ts` (w 100% zaliczone), obejmujący upadki z redukcją za Skakanie, ogień, kwas, uduszenie, tonięcie oraz trucizny z redukcją obrażeń przy Ekstremalnym sukcesie KON.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*): Stosowanie Tabeli IV przy Ciężkich Ranach zamienia suchy ubytek HP w diegetyczną historię ciała Badacza (blizny, kulawizna).
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: suchy ubytek HP) vs Opcja B (Praktyka Doświadczonych MG: Tabela IV powiązana z generatorem blizn pourazowych w karcie zagrożenia). Rekomendacja: Opcja B jako ulepszenie warsztatowe UI (silnik bazowy w 100% zaimplementowany i przetestowany). Konsekwencje UX: somatyczne zakorzenienie ran gracza zamiast abstrakcyjnych punktów życia.

---

### Rozdział 7: Pościgi (s. 146-167 / PDF 147-168)

#### Obszar 39: Pościgi CoC 7e: Ruch wg MOV, tory przeszkód, punkty akcji
- **1. Podręcznik (str. 146-150 / PDF 147-151):**
  - Minigra na torze segmentów/lokacji. Inicjatywa wg ZR. Punkty Akcji (PA): najwolniejszy uczestnik otrzymuje 1 PA na rundę, szybsi otrzymują 1 PA + różnica wartości Ruchu (Ruch uczestnika minus Ruch najwolniejszego).
- **2. Silnik TS (`src/lib/chase/chase-engine.ts:1-120`):**
  - Kompletny silnik pościgów wyliczający PA z różnicy MOV i zarządzający torem segmentów.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/chase-card.tsx:75-160` w `src/components/chat/chat-window/components/message-card.tsx:517-524`, `src/components/chat/chat-window/components/chase-dialog.tsx:34-120`):**
  - W pełni interaktywny tor pościgu renderowany w czacie.
- **4. Prompt & Parser (`gm-protocol.ts` Bieg 3: Pościg):**
  - Przejście modelu AI w tryb orkiestracji ucieczki.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Chases*): RAW twierdzi, że jeśli uciekinier jest szybszy od goniącego, ucieka bez pościgu. Seth odrzuca tę regułę: jeśli różnica MOV wynosi 3 lub mniej, pościg toczy się na torze przeszkód, gdyż potknięcie sprintera może odwrócić losy ucieczki.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: natychmiastowa ucieczka sprintera) vs Opcja B (Praktyka Doświadczonych MG Setha Skorkowskiego: pościg przy różnicy MOV <= 3). Rekomendacja: Opcja B.

#### Obszar 40: Zagrożenia, przeszkody i forsowanie barier
- **1. Podręcznik (str. 148-151 / PDF 149-152):**
  - Przeszkody na torze: Zagrożenia (Hazards - porażka spowalnia o 1 PA lub zadaje obrażenia) oraz Bariery (Barriers - porażka zatrzymuje ruch do czasu sforsowania). Poświęcenie 1 PA pozwala kupić kość premiową do testu pokonania przeszkody.
- **2. Silnik TS (`src/lib/chase/chase-engine.ts:200-350`):**
  - Obsługa kafelków barier, testów umiejętności i spowolnień.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/chase-card.tsx:100-155, 220-280`):**
  - Wizualizacja przeszkód na torze z kafelkami interaktywnymi.
- **4. Prompt & Parser (`mechanics-parser.ts:313`):**
  - Parsowanie tagu `[ZAGROŻENIE:]` na torze ucieczki.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Chases*): Nagłe przeszkody (Sudden Hazards) wywoływane naprzemiennymi testami grupowymi Szczęścia potęgują emocje filmowej ucieczki.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG: wizualizacja barier w UI pościgu). Rekomendacja: Opcja B.

#### Obszar 41: Manewry pościgu (sprint, shortcut, hide, escape)
- **1. Podręcznik (str. 152-155 / PDF 153-156):**
  - Ruch o 1 pole (1 PA), Sprint (test KON na dodatkowe pole), Skrót (test Nawigacji/Skoku), Ukrycie się (test Ukrywania po wyjściu z linii wzroku), Atak w biegu. Zakończenie: dystans = 0 (złapanie) lub ucieczka na bezpieczną przewagę pól.
- **2. Silnik TS (`src/lib/chase/chase-engine.ts:350-550`):**
  - Implementacja wszystkich manewrów podręcznikowych i warunków wygranej.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/chase-card.tsx:156-220`, `src/components/chat/chat-window/components/chase-dialog.tsx:24-27, 100-150`):**
  - Przyciski akcji manewrów dostępne dla gracza w jego turze ruchu.
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Prompt generuje diegetyczne otoczenie odpowiadające manewrom.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Chases*): Gracz musi mieć swobodę improwizacji manewrów (np. przewrócenie straganu z jabłkami za 1 PA celem stworzenia bariery dla goniących).
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW) vs Opcja B (Praktyka Doświadczonych MG: pełna paleta manewrów taktycznych w UI). Rekomendacja: Opcja B.

#### Obszar 42: Statystyki pojazdów (Tabela V) i Kolizje (Tabela VI)
- **1. Podręcznik (str. 162-167 / PDF 163-168):**
  - Tabela V: Ruch, Krzepa, Pancerz, Pasażerowie. Uszkodzenia: każde 10 pkt obrażeń zmniejsza Krzepę pojazdu o 1; Krzepa <= 50% bazy daje kość karną do prowadzenia; spadek Krzepy do 0 w 1 ciosie oznacza katastrofę i śmierć pasażerów. Tabela VI: Kolizje (od 1K3-1 Krzepy za otarcie, przez 1K10 za auto, do 5K10 za pociąg).
- **2. Silnik TS (`src/lib/`):**
  - BRAK kodu modelującego parametry pojazdów i obrażenia kolizyjne.
- **3. Podpięcie UI / Runtime:** BRAK podpięcia w interfejsie i czacie (moduł niezaimplementowany w silniku TypeScript, zadanie w backlogu PRP: `TASK-RAW-01`).
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Jedynie ogólne wzmianki o kraksach w prozie promptu.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🔴 Brak implementacji w kodzie silnika: Tabela V i Tabela VI w ogóle nie zostały zaimplementowane w TypeScript.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Chases*): Pościgi samochodowe lat 20. to esencja kina noir i horroru. Brak deterministycznego przeliczania uszkodzeń auta rodzi halucynacje AI.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm promptu: AI zgaduje uszkodzenia auta) vs Opcja B (Praktyka Doświadczonych MG: implementacja modułu `vehicle-engine.ts` z Tabelą V i VI). Rekomendacja: Opcja B pod backlog PRP (TASK-RAW-01).

---

### Rozdział 8: Poczytalność (s. 170-186 / PDF 171-187)

#### Obszar 43: Testy Poczytalności i utrata SAN
- **1. Podręcznik (str. 170-172 / PDF 171-173):**
  - Rzut k100 przeciw aktualnym PP. Sukces = minimalna strata (lub 0), Porażka = większa strata (np. 1/1K6). Bezwzględny zakaz wydawania Szczęścia na testy SAN i rzuty utraty SAN. Pech = maksymalna możliwa strata z rzutu.
- **2. Silnik TS (`src/lib/sanity/sanity-engine.ts:206`, `apply-stat-changes.ts`):**
  - Pełna implementacja mechaniki testu Poczytalności i aktualizacji stanu.
- **3. Podpięcie UI / Runtime (`src/hooks/useChat.ts:73, 1853-1885` `applyStatChangesToParty`):**
  - Automatyczna aktualizacja pasków SAN, toasty traumy psychicznej.
- **4. Prompt & Parser (`gm-protocol.ts` sekcja 7-BIS):**
  - Dwukrokowa procedura: test SAN, a następnie potrącenie tagiem `[SANITY: -N]`.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Sandy Petersen, Seth Skorkowsky (*Sanity*): Zakaz mówienia "Widzisz ghoula, rzuć na SAN". Najpierw somatyczny opis grozy i odoru rozkładu (Karta Kanonu 01), a dopiero potem mechaniczny rzut.
  - *Pytanie decyzyjne dla PO:* Opcja A (Suchy puryzm mechaniczny) vs Opcja B (Praktyka Doświadczonych MG i Sandy Petersen: wymóg opisu sensorycznego przed wezwaniem testu SAN). Rekomendacja: Opcja B (wdrożona w protokole promptu).

#### Obszar 44: Ataki szaleństwa w locie i podsumowaniu (Tabele VII-X)
- **1. Podręcznik (str. 172-180 / PDF 173-181):**
  - Chwilowa niepoczytalność: utrata 5+ SAN w 1 teście ORAZ zdany test INT (Badacz pojmuje grozę). Trwa 1K10 rund (w locie).
  - Czasowa niepoczytalność: utrata 1/5 aktualnego SAN w ciągu dnia gry. Trwa 1K10 dni/miesięcy; wchodzi stan Ukrytego Szaleństwa (Underlying Insanity) i Test Realności (Reality Check s. 178).
  - Trwała niepoczytalność: spadek SAN do 0 (Badacz staje się BN-em).
  - Tabele VII-X: Ataki szaleństwa w czasie rzeczywistym i podsumowaniu, fobie i manie.
- **2. Silnik TS (`src/lib/sanity/sanity-engine.ts:39-204` `BOUTS_REAL_TIME`):**
  - Pełna baza ataków szaleństwa, fobii, manii oraz Testu Realności.
- **3. Podpięcie UI / Runtime (`src/lib/character/apply-stat-changes.ts:117-122`, `src/hooks/useChat.ts:1866-1885`):**
  - Nadawanie statusów psychicznych i prezentacja omamów w czacie.
- **4. Prompt & Parser (`gm-protocol.ts` próg 5+ SAN):**
  - Model wzywa test INT po stracie 5+ SAN i generuje halucynacje.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Sanity*): Doświadczeni MG dają graczowi przestrzeń do odegrania szaleństwa zamiast odbierania kontroli nad postacią. Test Realności (porażka = strata 1 SAN) daje graczowi narzędzie weryfikacji paranoi.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: sztywne rzuty z tabeli 1-10) vs Opcja B (Praktyka Doświadczonych MG: dynamiczny dobór traumy powiązanej z fabułą i interaktywny Test Realności). Rekomendacja: Opcja B.

#### Obszar 45: Odzyskiwanie SAN, terapia, przywykanie do potworów
- **1. Podręcznik (str. 181-186 / PDF 182-187):**
  - Psychoanaliza (sukces raz na miesiąc przywraca 1K3 PP). Samopomoc z kluczową więzią (+1K6 PP). Nagrody za zniszczenie potwora.
  - Przywykanie do okropności (Getting Used to the Awfulness s. 185): limit utraty SAN od danego typu bytu w epizodzie wynosi maksymalną możliwą stratę z pojedynczego rzutu (np. Ghul = max 6 SAN).
- **2. Silnik TS (`src/lib/sanity/sanity-recovery.ts`, `character-development.ts`):**
  - Moduły regeneracji SAN i procedur rekonwalescencji w fazie rozwoju.
- **3. Podpięcie UI / Runtime (`src/components/dialogs/SanityTherapyModal.tsx:51-120` w `src/components/ui/character-sheet/index.tsx:347-355`, oraz `src/components/chat/chat-window/components/DevelopmentPhaseCard.tsx:122-139` w `src/components/chat/chat-window/components/message-card.tsx:312-316`):**
  - Rozliczanie odzyskiwania SAN w ekranie końca sesji.
- **4. Prompt & Parser (`session-zero-instructions.ts`):**
  - Instrukcje dotyczące terapii i więzi psychologicznych.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1: silnik `src/lib/sanity/sanity-recovery.ts` posiada dedykowany suite testowy `src/tests/unit/sanity-recovery.test.ts` (339 linii, 20/20 testów PASS), weryfikujący kalkulację pułapu Poczytalności (99 minus Mity Cthulhu), ekstrakcję i niszczenie kotwic psychologicznych (intact -> damaged -> lost), bezpiecznik częstotliwości w przerwie śledczej, procedurę samopomocy dla fobii i manii oraz hospitalizację psychiatryczną z uwzględnieniem darmowego azylu państwowego i progów majątkowych prywatnego sanatorium ($150 / Majętność >= 50) i błędu w sztuce lekarskiej (-1k10 SAN przy Fumble).
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Sanity*): Przywykanie do potworów to kluczowa reguła chroniąca postacie przed absurdalnym wyzerowaniem psychiki przez walkę z kilkoma tymi samymi ghulami. Seth ustala stawkę za terapię prywatną lat 20. na 25-50$ tygodniowo.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW bez limitu przywykania) vs Opcja B (Praktyka Doświadczonych MG i Prawdziwy RAW s. 185: ścisły limit utraty SAN na gatunek potwora). Rekomendacja: Opcja B (w pełni zgodna z RAW s. 185). Konsekwencje UX: ochrona Badacza przed nieuczciwym zgonem psychicznym przy powtarzalnych starciach z tym samym typem zagrożenia.

---

### Rozdział 9: Magia (s. 191-203 / PDF 192-204)

#### Obszar 46: Księgi Mitów i mechanika czytania
- **1. Podręcznik (str. 191-195 / PDF 192-196):**
  - Dwa tryby lektury:
    - Pobieżne przekartkowanie (Initial Reading / Skim): trwa tyle godzin, ile pełne studium tygodni (np. 10-60 godzin). Automatyczna mała utrata SAN, wstępny przyrost Mitów Cthulhu (CMI).
    - Wnikliwe studiowanie (Full Study): trwa tygodnie/miesiące. Rzut obronny na SAN, pełny przyrost Mitów (CMF), odblokowanie zaklęć.
    - Wyszukiwanie informacji (Reference): 1K4 godzin, test przeciw Mythos Rating tomu.
- **2. Silnik TS (`src/lib/magic/tome-engine.ts:1-280`, `catalog.ts`):**
  - Obsługa stanów czytania tomów (`initial_read`, `full_study`, `reference_lookup`) oraz czasu nauki.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/tome-card.tsx:52-150` w `src/components/chat/chat-window/components/message-card.tsx:465-474`):**
  - Karta księgi Mitów montowana w czacie po wykryciu tagu `[TOM:]`.
- **4. Prompt & Parser (`mechanics-parser.ts:514` tag `[TOM:]`):**
  - Parser ekstrahuje ID księgi, język i tryb lektury.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*The Mythos & Magic*): Księgi Mitów to nie zwoje z grami fantasy. Pełne studium powinno odbywać się wyłącznie w downtime między przygodami, aby nie zabijać tempa aktywnego śledztwa.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: pełne wielotygodniowe studium w trakcie sesji) vs Opcja B (Praktyka Doświadczonych MG: pobieżne czytanie w przygodzie, a pełne studium w fazie przestoju). Rekomendacja: Opcja B (wdrożona w silniku).

#### Obszar 47: Zaklęcia, Bramka Wiary, Trudny POW, magia spontaniczna
- **1. Podręcznik (str. 196-199 / PDF 197-200):**
  - Pierwsze rzucenie poznanego zaklęcia przez nowicjusza wymaga zdania Trudnego testu Mocy (Hard POW). Porażkę można sforsować; porażka na forsowaniu wywołuje katastrofę. Po udanym pierwszym rzuceniu postać staje się Wierzącym (Believer) i rzuca czar bez testu Mocy, płacąc jedynie koszty PM/SAN/PW. Magia spontaniczna: desperacki rzut na Mity Cthulhu kosztem 1K10 SAN i PM.
- **2. Silnik TS (`src/lib/magic/magic-engine.ts:1-350`, `catalog.ts`):**
  - Logika kosztów PM/SAN, sprawdzanie flagi `isBeliever` oraz test Trudnego POW.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/spell-card.tsx:48-150` w `src/components/chat/chat-window/components/message-card.tsx:448-457`):**
  - Karta rzucania zaklęcia w czacie z weryfikacją dostępnych Punktów Magii i żywotności.
- **4. Prompt & Parser (`mechanics-parser.ts:466` tag `[CZAR:]`):**
  - Parser odczytuje deklarację zaklęcia i koszty somatyczne.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*The Mythos & Magic*), Brandon Sanderson (Karta Kanonu 07 - Prawa Magii): Magia Mitów musi być tajemnicza i niebezpieczna. Doświadczeni MG maskują mechaniczne nazwy czarów diegetycznymi opisami formuł okultystycznych.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: jawne techniczne nazwy czarów) vs Opcja B (Praktyka Doświadczonych MG: diegetyczne nazwy rytualne z atmosferycznym opisem formuły). Rekomendacja: Opcja B.

#### Obszar 48: Katastrofy metafizyczne i rykoszety mistyczne
- **1. Podręcznik (str. 200-203 / PDF 201-204):**
  - Porażka przy forsowaniu rzucania czaru wywołuje nieodwracalne skutki metafizyczne: eksplozje energii, somatyczne deformacje, przyzwanie wrogich bytów, trwałą utratę Mocy lub śmierć. Brak PM zmusza do spalania punktów PW (1:1).
- **2. Silnik TS (`src/lib/magic/catalog.ts:80`, `magic-engine.ts:98`):**
  - Obsługa konwersji brakujących PM na ubytek punktów wytrzymałości HP.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/spell-card.tsx:48-150, 250-320` w `src/components/chat/chat-window/components/message-card.tsx:448-457`):**
  - Checkbox zgody na spalenie własnego zdrowia za brakujące Punkty Magii.
- **4. Prompt & Parser (`gm-protocol.ts`):**
  - Dyrektywa nakazująca modelowi generowanie groźnych zjawisk paranormalnych przy błędzie rytualnym.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*The Mythos & Magic*): Katastrofa magiczna nie może sprowadzać się do nudnego ubytku 2 HP; musi wywołać koszmarne pęknięcie rzeczywistości budzące lęk u gracza.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW suchych liczb) vs Opcja B (Praktyka Doświadczonych MG: spektakularne anomalie narracyjne rozrywające scenę). Rekomendacja: Opcja B.

---

### Rozdział 10: Rola Strażnika Tajemnic (s. 210-234 / PDF 211-235)

#### Obszar 49: Bohaterowie Niezależni (profile, psychologia, opór)
- **1. Podręcznik (str. 210-214 / PDF 211-215):**
  - Uproszczone profile BN-ów, motywacje, lęki, cele. Dyrektywa Pushback: odmowa uległości wobec żądań graczy bez twardych argumentów, łapówki lub presji społecznej.
- **2. Silnik TS (`src/lib/npc/derived-stats.ts`, `npc-combat-profile.ts`):**
  - Lekkie struktury profili NPC zintegrowane z dossier śledczym.
- **3. Podpięcie UI / Runtime (`src/hooks/useChat.ts:1825-1835`, `src/components/ui/npc-manager.tsx:20-80` w `src/components/ui/gm-tools-modal.tsx:40-45`, `src/lib/parsers/journal-parser.ts:25-90`):**
  - Dynamiczne generowanie i aktualizacja kart NPC w dzienniku śledztwa.
- **4. Prompt & Parser (`gm-protocol.ts` dyrektywy Anti-Exposition i Pushback):**
  - Ochrona postaci niezależnych przed rolą bezwolnych narratorów wykładających sekrety.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Matt Colville (*NPCs*), Kanon Worldbuildingu (Karta 02): 4-warstwowa architektura postaci: Maska, Skaza, Ukryta intencja, Próg oporu. NPC stawiają opór, mają własne życie i uprzedzenia.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW pełnych kart cech) vs Opcja B (Praktyka Doświadczonych MG: triada cech psychologicznych w locie z silnika NPCEngine). Rekomendacja: Opcja B (wdrożona w PR #445 i #456).

#### Obszar 50: Arbitraż rzutów kośćmi, zakaz rzutów na rutynę
- **1. Podręcznik (str. 215, 227 / PDF 216, 228):**
  - Złota reguła Strażnika: rzuty kośćmi wykonuje się WYŁĄCZNIE wtedy, gdy czynność jest dramatyczna, występuje presja czasu, a porażka rodzi realne, ciekawe konsekwencje. Bezwzględny zakaz rzutów na rutynowe czynności codzienne (np. spokojna jazda autem, otwarcie drzwi kluczem).
- **2. Silnik TS (`src/lib/skill-test-resolver.ts`, `era-guardrail.ts`):**
  - Guardraile CPU filtrujące nieuzasadnione wezwania mechaniki.
- **3. Podpięcie UI / Runtime (`src/app/api/chat/_helpers/run-chat-pipeline.ts:388-410`):**
  - Weryfikacja kontekstu przed wyemitowaniem karty testu.
- **4. Prompt & Parser (`gm-protocol.ts` Twarde Weto Sędziego):**
  - Zakaz żądania testów bez stawki dramatycznej.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Matt Colville (*When to Roll*): Jeśli Mistrz Gry nie potrafi natychmiast podać dramatycznego skutku porażki, rzut kością jest błędem - akcja po prostu się udaje.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm rzutologii: testowanie każdej deklaracji) vs Opcja B (Praktyka Doświadczonych MG i Prawdziwy RAW s. 215: zgoda fabularna na rutynę, rzuty tylko pod presją). Rekomendacja: Opcja B.

#### Obszar 51: Testy Pomysłowości i Percepcji (poszlaki, fail-forward)
- **1. Podręcznik (str. 220, 224 / PDF 221, 225):**
  - Zasada poszlak: brak rzutu kością nie może blokować kluczowych wskazówek śledztwa. Jeśli poszlaka jest niezbędna do kontynuacji przygody, Badacz otrzymuje ją automatycznie lub przez Idea Roll (gdzie porażka oznacza wskazówkę za cenę kłopotów).
- **2. Silnik TS (`src/lib/journal/idea-roll-service.ts`, `world-engine/`):**
  - Dystrybucja wskazówek śledczych i nadzór nad postępem dochodzenia.
- **3. Podpięcie UI / Runtime (`src/components/ui/journal/idea-roll-modal.tsx:42-50, 80-200`, `src/components/ui/journal/discoveries-view.tsx:105-112, 520-560`):**
  - Widok odkryć i wskazówek w panelu dziennika gracza.
- **4. Prompt & Parser (`gm-protocol.ts` Fair Play poszlak):**
  - Dyrektywa eliminacji ślepych zaułków i zasada Fail-Forward.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Justin Alexander (Three Clue Rule), Robin D. Laws (Gumshoe), Banaś/Baniak: Kluczowa poszlaka NIGDY nie może wisieć na jednym rzucie na Spostrzegawczość (Spot Hidden). Do każdego wniosku muszą prowadzić minimum 3 niezależne poszlaki.
  - *Pytanie decyzyjne dla PO:* Opcja A (Oldschoolowy puryzm: brak poszlaki przy oblanej Spostrzegawczości) vs Opcja B (Praktyka Doświadczonych MG: Zasada 3 Poszlak i Clue Counter). Rekomendacja: Opcja B.

#### Obszar 52: Sceny akcji, zawieszenie kulminacji, groza kosmiczna
- **1. Podręcznik (str. 229-234 / PDF 230-235):**
  - Budowanie suspensu, reżyseria scen akcji, zawieszenie kulminacji (Cliffhanger) przed krytycznym rzutem kością. Izolacja Badaczy w obliczu bezmiaru kosmosu.
- **2. Silnik TS (`src/lib/narrative-engine/scene-director.ts`, `dispatcher.ts`):**
  - Moduł sterujący tempem scen i wykrywaniem punktów zwrotnych.
- **3. Podpięcie UI / Runtime (`src/hooks/useChat.ts:1574-1582, 2347-2368`, `src/components/chat/chat-window/components/message-card.tsx:344-362`, `src/tests/director/mid-narration-roll.test.ts:7-112`):**
  - Twarde odcięcie strumienia tekstu LLM przy wykryciu tagu zawieszenia.
- **4. Prompt & Parser (`gm-protocol.ts:68` tag `[ZAWIESZENIE_KULMINACJI]`):**
  - Model ma obowiązek urwać narrację na krawędzi niepewności, czekając na rzut gracza.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Sandy Petersen, Seth Skorkowsky: Zakaz opisywania konsekwencji przed rzutem kością. Podział tury na suspens -> rzut gracza -> rozstrzygnięcie buduje autentyczne zaangażowanie.
  - *Pytanie decyzyjne dla PO:* Opcja A (Styl bota: generowanie rzutu i wyniku w jednym poście) vs Opcja B (Praktyka Doświadczonych MG: twardy podział tury przez `[ZAWIESZENIE_KULMINACJI]`). Rekomendacja: Opcja B (wdrożona w PR #511).

---

### Rozdział 11: Tomy wiedzy tajemnej (s. 247-261 / PDF 248-262)

#### Obszar 53: Studiowanie tomów Mitów i Tabela XI
- **1. Podręcznik (str. 247-263 / PDF 248-264):**
  - Tabela XI: Kanoniczny katalog ksiąg (Al Azif, Necronomicon, De Vermis Mysteriis, Cultes des Goules, Unausssprechlichen Kulten itp.) z parametrami: język, data, strata SAN, przyrost Mitów wstępny/pełny, trudność języka, czas nauki w tygodniach.
- **2. Silnik TS (`src/lib/magic/tome-engine.ts`, `catalog.ts`):**
  - Kompletna baza danych tomów z parametrami z Tabeli XI.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/tome-card.tsx:52-150` w `src/components/chat/chat-window/components/message-card.tsx:465-474`):**
  - Interaktywna karta księgi w czacie pozwalająca na podjęcie lektury.
- **4. Prompt & Parser (`gm-protocol.ts` `[STUDIUJ_TOM:]`):**
  - Obsługa czasu studiowania i korzyści z zakazanej wiedzy.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*The Mythos & Magic*): Księga Mitów musi mieć fizyczność (zapach zbutwiałego pergaminu, oprawa z ludzkiej skóry, notatki na marginesach - Karta Kanonu 01).
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW suchych statystyk) vs Opcja B (Praktyka Doświadczonych MG: bogate karty rekwizytów z sensorycznym opisem manuskryptu). Rekomendacja: Opcja B.

---

### Rozdział 12: Zaklęcia i bramy (s. 267-284 / PDF 268-285)

#### Obszar 54: Rzuty sporne POW zaklęć, Bramy (Tabele XII-XIV)
- **1. Podręcznik (str. 267-284 / PDF 268-285):**
  - Przeciwstawny test Mocy (POW vs POW) dla zaklęć ofensywnych. Tabela XII: Kosmiczny miód (20 PM + zmienne PM/SAN na odległość w latach świetlnych). Tabele XIII-XIV: Koszt stworzenia Bramy (od 5 Mocy/1 PM za 160 km do 35 Mocy/7 PM za 1 rok świetlny) i podróży.
- **2. Silnik TS (`src/lib/magic/magic-engine.ts:250-320`, `catalog.ts`):**
  - Funkcje rozstrzygania starć woli POW vs POW i kalkulacji kosztów Bram.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/opposed-magic-card.tsx:38-120` w `src/components/chat/chat-window/components/message-card.tsx:482-491`):**
  - Karta obrony psychicznej przed wrogim czarem montowana w czacie.
- **4. Prompt & Parser (`gm-protocol.ts:44` tag `[OBRONA_MAGIA:]`):**
  - Model wzywa rzut obronny Mocy gracza przeciw POW rzucającego.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*The Mythos & Magic*): Pojedynek woli POW vs POW musi być rozstrzygany deterministycznie w kodzie, by gracz czuł absolutną uczciwość mechaniki.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW w kodzie TS) vs Opcja B (Praktyka Doświadczonych MG). Obie opcje tożsame: deterministyczny arbiter w TS. Konsekwencje UX: uczucie bezwzględnej sprawiedliwości starcia metafizycznego o duszę Badacza.

---

### Rozdział 14: Potwory i bestiariusz (s. 312-315 / PDF 313-316)

#### Obszar 55: Potwory: Krzepa (Tabela XV), manewry, kontratak, pancerz
- **1. Podręcznik (str. 312-315 / PDF 313-316):**
  - Tabela XV: Porównawcza Krzepa (Build) istot (od -2 dla nietoperza, przez 0 dla człowieka, 1 dla Deep One, 3 dla Mi-Go, 4 dla Starszej Istoty, 9 dla Shoggotha, do 22 dla Cthulhu). Różnica Build >= 3 uniemożliwia manewry. Potwory z wieloma atakami w rundzie mają tyle samo darmowych obron, zanim zadziała reguła outnumberingu.
- **2. Silnik TS (`src/lib/combat/combat-resolver.ts:155`, `npc-combat-profile.ts`):**
  - Pełna implementacja wieloataku, odporności na manewry i pancerza naturalnego bestii.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/opposed-melee-card.tsx:46-120, 300-340` w `src/components/chat/chat-window/components/message-card.tsx:538-548`):**
  - Karta starcia z bestią uwzględniająca jej potworną Krzepę i brak możliwości kontrataku przy pewnych atakach.
- **4. Prompt & Parser (`gm-protocol.ts` odporności bestii):**
  - Twardy zakaz opisywania negocjacji z monstrami Mitów.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Sandy Petersen (Zasada 1: Malign Horror): Potwory Mitów są absolutnie wrogie i nieludzkie; zakaz humanizowania bestii i robienia z nich maskotek graczy.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW statystyk) vs Opcja B (Praktyka Doświadczonych MG i Sandy Petersen: twardy zakaz kompromisów moralnych z obcymi bytami w promptach). Rekomendacja: Opcja B.

---

### Rozdział 16: Dodatki, tabele i zestawienia (s. 441-471 / PDF 442-472)

#### Obszar 56: Konwersja zasad wcześniejszych edycji (Cechy x5)
- **1. Podręcznik (str. 441-446 / PDF 442-447):**
  - Przelicznik z edycji 1-6 na 7e: wszystkie Cechy 3-18 mnoży się przez 5 (STRx5, CONx5, SIZx5, DEXx5, APPx5, INTx5, POWx5, EDUx5); umiejętności procentowe pozostają bez zmian.
- **2. Silnik TS (`src/lib/`):**
  - `skill-migration.ts` migruje format zapisu bazy, a `adventure-local-builder.ts` nakłada overlaye; BRAK dedykowanej funkcji konwertującej cechy w skali 3-18 na skalę x5.
- **3. Podpięcie UI / Runtime (BRAK):**
  - BRAK podpięcia konwertera cech w interfejsie użytkownika.
- **4. Prompt & Parser (`session-zero-instructions.ts`):**
  - Ogólne instrukcje bez automatycznego wsparcia algorytmicznego.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🔴 Brak implementacji w silniku: brak dedykowanej funkcji konwersji x5 w TypeScript.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Introduction*, *Character Creation*): Setki najlepszych scenariuszy CoC powstało w edycjach 1-6. Brak automatycznego konwertera x5 zmusza MG do ręcznego przeliczania statystyk.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW 7e: obsługa tylko natywnych modułów 7e) vs Opcja B (Praktyka Doświadczonych MG: funkcja automatycznej konwersji cech x5 przy imporcie modułów PDF). Rekomendacja: Opcja B pod backlog PRP (TASK-RAW-04).

#### Obszar 57: Tabela XVI: Parametry i katalog broni
- **1. Podręcznik (str. 452-458 / PDF 453-459):**
  - Parametry broni białej i palnej: obrażenia, zasięg podstawowy, liczba ataków na rundę (1, 2, 3, 1(3), ogień ciągły), pojemność magazynka, zawodność (Malf), czy zadaje Przebicie (Impale).
- **2. Silnik TS (`src/lib/equipment-data.ts`, `equipment-catalog.ts`):**
  - Kompletny katalog broni palnej i białej z wiernymi parametrami technicznymi.
- **3. Podpięcie UI / Runtime (`src/components/ui/equipment-modal.tsx:38-45, 100-300`, `src/components/ui/character-sheet/components/sheet-equipment.tsx:210-250`):**
  - Przegląd, zakup i wyposażanie broni w karcie Badacza.
- **4. Prompt & Parser (`weapon-context.ts`):**
  - Wstrzykiwanie pełnych parametrów balistycznych wyekwipowanej broni do promptu.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Combat*, *Final Thoughts*): Tabela XVI zawiera błąd cenowy dla pistoletu Thompson ($1000 w podręczniku RAW zamiast historycznych $175-$200 w katalogach wysyłkowych z 1927 r. przed wejściem National Firearms Act 1934).
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW podręcznika: zawyżone $1000 za Thompson) vs Opcja B (Praktyka Doświadczonych MG: historyczna cena katalogowa $200). Rekomendacja: Opcja B.

#### Obszar 58: Zbiorcze podsumowania walki, broni, pościgów, SAN, magii
- **1. Podręcznik (str. 459-471 / PDF 460-472):**
  - Diagramy przebiegu starcia (Combat Flowchart s. 463), pościgu (s. 465), procedury Poczytalności (s. 468-469) oraz Tabela wartości 1/2 i 1/5 (s. 471).
- **2. Silnik TS (`src/lib/combat/`, `chase/`, `sanity/`, `magic/`):**
  - Deterministyczne podsystemy odzwierciedlające oficjalne flowcharty podręcznika.
- **3. Podpięcie UI / Runtime (`src/components/chat/chat-window/components/message-card.tsx:312-594` komplet 10 kart węzłów):**
  - Komplet 10 interaktywnych kart w czacie reprezentujących węzły flowchartów.
- **4. Prompt & Parser (`gm-protocol.ts` master-protokół):**
  - Spójna orkiestracja całego systemu gry.
- **5. Werdykt Techniczny i Rozbieżności:**
  - 🟢 Zgodne 1:1.
- **6. Perspektywa Doświadczonych MG (Materiały dodatkowe):**
  - Seth Skorkowsky (*Final Thoughts*): Karty ściąg reguł (Cheat Sheets) to klucz do ergonomii stołu i płynnej sesji.
  - *Pytanie decyzyjne dla PO:* Opcja A (Puryzm RAW: odsyłanie gracza do PDF) vs Opcja B (Praktyka Doświadczonych MG: wbudowane Kompendium Badacza w bocznej szufladzie UI z szybkim wyszukiwaniem reguł). Rekomendacja: Opcja B (wdrożona w PR #461).

---

## 4. Matryca Kontraktów PRP pod Wdrożenia aios-vibe-coder

Poniższy rejestr kontraktów PRP (Product Requirement Package) stanowi posortowany wg priorytetów (P1 / P2 / P3) wykaz gotowych zadań inżynieryjnych pod przyszłe wdrożenia w trybie `aios-vibe-coder`. Każde zadanie spełnia rygor dyscypliny Matta Pococka (Czerwona Pętla Repro) oraz posiada ścisłe granice bezpieczeństwa (`Allowlist` i `Anti-scope`).

---

### Priorytet P1: Krytyczne Luki Implementacyjne i Architektoniczne

#### `TASK-RAW-01` (P1): Implementacja Tabeli V (Pojazdy) i Tabeli VI (Kolizje i kraksy)
- **Źródło rozbieżności / Opcja projektowa PO:**
  - Podręcznik: Rozdział 7, s. 162-167 (PDF 163-168).
  - Kod: całkowity brak kodu modelującego pancerz, punkty budowy pojazdów (Tabela V) oraz obrażeń kolizyjnych (Tabela VI). W całym `src/lib/` brak plików obsługujących te tabele.
  - Opcja PO: Opcja B (Praktyka Doświadczonych MG) - deterministyczny moduł `vehicle-engine.ts` zintegrowany z `chase-engine.ts` i `hazards-engine.ts`.
- **Allowlist (Dozwolone pliki do edycji):**
  - `src/lib/chase/vehicle-engine.ts` (nowy plik)
  - `src/lib/chase/vehicle-types.ts` (nowy plik)
  - `src/lib/chase/chase-engine.ts`
  - `src/lib/hazards-engine.ts`
  - `src/tests/unit/vehicle-engine.test.ts` (nowy plik)
- **Anti-scope (Świadome wykluczenia):**
  - Nie modyfikować komponentów UI czatu (`message-card.tsx`).
  - Nie modyfikować promptów systemowych (`gm-protocol.ts`).
  - Nie zmieniać istniejącej logiki pościgów pieszych w `chase-engine.ts`.
- **Czerwona Pętla Repro / Kryterium Testowe (Dyscyplina Pococka):**
  - Test jednostkowy `src/tests/unit/vehicle-engine.test.ts`:
    1. Asercja: zderzenie pojazdu o Krzepie 4 z prędkością 60 km/h (Poważna kolizja) zadaje 1K10 uszkodzeń Krzepy pojazdu i 2K10 obrażeń pasażerom bez pasów.
    2. Asercja: spadek Krzepy pojazdu poniżej 50% bazy nakłada 1 kość karną na wszystkie kolejne testy Prowadzenia samochodu.
    3. Asercja: zniszczenie Krzepy do 0 w pojedynczym zderzeniu katastrofalnym wyzwala test Szczęścia pasażerów pod rygorem zgonu.

#### `TASK-RAW-02` (P1): Architektura broni palnej: dedykowana karta FirearmsCard w czacie
- **Źródło rozbieżności / Opcja projektowa PO:**
  - Podręcznik: Rozdział 6, s. 123-128 (PDF 124-129).
  - Kod: odcięcie balistyki `firearms-engine.ts` od pętli czatu. Strzały w czacie rozstrzygane są czystym promptem LLM na uniwersalnej karcie `SkillTestCard`, podczas gdy deterministyczny silnik działa tylko w modalu MG `CombatSystem.tsx`.
  - Opcja PO: Decyzja Produktowa:
    - *Opcja A (Puryzm promptu LLM):* Pozostawienie obecnego stanu (broń palna w czacie sterowana wyłącznie promptem, brak dodatkowego UI).
    - *Opcja B (Praktyka Doświadczonych MG - Rekomendowana):* Wdrożenie dedykowanej karty `FirearmsCard.tsx` montowanej w `message-card.tsx` dla tagu `[WALKA_STRZAŁ:]` obsługującej obronę Dive for Cover przeciw NPC ORAZ konfigurację salwy ognia ciągłego w ataku Badacza.
- **Allowlist (Dozwolone pliki do edycji):**
  - `src/components/chat/chat-window/components/firearms-card.tsx` (nowy komponent)
  - `src/components/chat/chat-window/components/message-card.tsx`
  - `src/components/chat/roll-test-modal/index.tsx` (lub `RollTestModal.tsx` dla wyboru salwy gracza)
  - `src/lib/parsers/mechanics-parser.ts`
  - `src/lib/prompts/gm-protocol.ts`
  - `src/tests/unit/firearms-card.test.tsx` (nowy plik)
- **Anti-scope (Świadome wykluczenia):**
  - Nie modyfikować istniejącej karty walki wręcz `OpposedMeleeCard.tsx`.
  - Nie modyfikować algorytmów balistycznych w `firearms-engine.ts` (są kompletne i w 100% przetestowane).
- **Czerwona Pętla Repro / Kryterium Testowe:**
  - Test jednostkowy `src/tests/unit/firearms-card.test.tsx`:
    1. Asercja: wyemitowanie tagu `[WALKA_STRZAŁ: Broń Palna (Krótka) | point-blank | cel: Badacz]` montuje komponent `FirearmsCard` w wiadomości czatu.
    2. Asercja: kliknięcie przycisku `[Padnij za osłonę (Dive for Cover)]` znosi kość premiową strzelca, wykonuje rzut na Unik i nadaje Badaczowi stan `isProne = true`.
    3. Asercja: przy deklaracji ataku gracza bronią maszynową modal rzutu umożliwia wybór liczby wystrzelonych kul (salwy z Obszaru 35) i przekazuje wynik do `resolveFirearmBurst`.
    4. Asercja: strzał z wynikiem >= Malfunction blokuje suwak wydawania Szczęścia i wyświetla komunikat zacięcia broni.

---

### Priorytet P2: Uzupełnienie Brakujących Suite'ów Testowych Silnika

#### `TASK-RAW-03` (P2): Uzupełnienie testu jednostkowego dla rollEDUDevelopment
- **Źródło rozbieżności / Opcja projektowa PO:**
  - Podręcznik: Rozdział 5, s. 106-108.
  - Kod: funkcja `rollEDUDevelopment` w `character-development.ts:175-193` nie posiada asercji testowej w istniejącym pliku `character-development-coc.test.ts`.
  - Opcja PO: Opcja A (Puryzm RAW) - asercja wierności regule wzrostu EDU.
- **Allowlist (Dozwolone pliki do edycji):**
  - `src/tests/unit/character-development-coc.test.ts`
- **Anti-scope (Świadome wykluczenia):**
  - Nie modyfikować pozostałych testów rozwoju umiejętności ani kodu produkcyjnego `character-development.ts`.
- **Czerwona Pętla Repro / Kryterium Testowe:**
  - Test jednostkowy w `character-development-coc.test.ts`:
    1. Asercja: Badacz z EDU 60 przy rzucie k100 = 75 (> EDU) otrzymuje przyrost +1K10 punktów do cechy Wykształcenie.
    2. Asercja: Badacz z EDU 85 przy rzucie k100 = 40 (<= EDU) nie otrzymuje żadnego przyrostu punktowego.
    3. Asercja: wartość EDU po przyroście nie może przekroczyć bezwzględnego ludzkiego pułapu 99 punktów.

---

### Priorytet P3: Narzędzia Konwersji i Kompatybilności Wstecznej

#### `TASK-RAW-04` (P3): Funkcja konwersji cech x5 z edycji 1-6 (Rozdział 16)
- **Źródło rozbieżności / Opcja projektowa PO:**
  - Podręcznik: Rozdział 16, s. 441 (PDF 442).
  - Kod: brak funkcji przeliczającej cechy klasyczne (skala 3-18) na skalę procentową CoC 7e w silniku.
  - Opcja PO: Opcja B (Praktyka Doświadczonych MG) - moduł konwersji starych modułów scenariuszowych.
- **Allowlist (Dozwolone pliki do edycji):**
  - `src/lib/character/edition-converter.ts` (nowy plik)
  - `src/tests/unit/edition-converter.test.ts` (nowy plik)
- **Anti-scope (Świadome wykluczenia):**
  - Nie dotykać `skill-migration.ts` (odpowiada za strukturę bazy danych).
- **Czerwona Pętla Repro / Kryterium Testowe:**
  - Test jednostkowy `src/tests/unit/edition-converter.test.ts`:
    1. Asercja: wejściowy obiekt cech klasycznych `{ STR: 12, CON: 15, SIZ: 14, DEX: 11, APP: 9, INT: 16, POW: 13, EDU: 17 }` zostaje przekonwertowany na `{ STR: 60, CON: 75, SIZ: 70, DEX: 55, APP: 45, INT: 80, POW: 65, EDU: 85 }`.
    2. Asercja: automatyczne wyliczenie progu Hard (1/2) i Extreme (1/5) dla każdej cechy po konwersji.
    3. Asercja: automatyczne wyliczenie Modyfikatora Obrażeń (MO) i Krzepy (Build) wg Tabeli I CoC 7e.

---

## 5. Metodyka Niezależnej Weryfikacji (Verification Method)

Każde ustalenie niniejszego dokumentu SSOT podlega niezależnej weryfikacji za pomocą poniższych komend systemowych:

1. **Weryfikacja tekstu i stron w podręczniku PDF RAW:**
   ```bash
   pdftotext -f 38 -l 38 "/Volumes/Karta/Zew - materiały/Zew Cthulhu - podręczniki/Black Monk Games/ZewCthulhu_KsiegaStraznika_v.1.3.pdf" - | grep -i "tabela i"
   pdftotext -f 164 -l 164 "/Volumes/Karta/Zew - materiały/Zew Cthulhu - podręczniki/Black Monk Games/ZewCthulhu_KsiegaStraznika_v.1.3.pdf" - | grep -i "tabela vi"
   ```
2. **Weryfikacja istnienia i poprawności testów jednostkowych w silniku:**
   ```bash
   cd /Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik
   npx jest src/tests/unit/combat-defense.test.ts
   npx jest src/tests/unit/combat-raw.test.ts
   npx jest src/tests/unit/firearms-engine.test.ts
   npx jest src/tests/unit/sanity-mechanics-coc.test.ts
   npx jest src/tests/unit/sanity-recovery.test.ts
   npx jest src/tests/unit/hazards-engine.test.ts
   npx jest src/tests/unit/chase-engine.test.ts
   npx jest src/tests/unit/character-development-coc.test.ts
   ```
3. **Weryfikacja braku znaków półpauzy i pauzy w niniejszym dokumencie:**
   ```bash
   python3 -c '
   with open("/Volumes/Karta/Developer/straznik-tajemnic/docs/mechaniki.md", "r") as f:
       text = f.read()
   en_dash = "\u2013" in text
   em_dash = "\u2014" in text
   print("En-dash present:", en_dash, "Em-dash present:", em_dash)
   assert not en_dash and not em_dash, "Znaleziono niedozwolone znaki pauzy/półpauzy!"
   print("Weryfikacja znaków: SUKCES (wyłącznie zwykły łącznik -)")
   '
   ```
4. **Weryfikacja czystości repozytorium (Inwariant Read-Only):**
   ```bash
   cd /Volumes/Karta/Developer/straznik-tajemnic
   git status --short
   ```
   Wynik polecenia musi wykazywać modyfikację wyłącznie w pliku `docs/mechaniki.md`.
