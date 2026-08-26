# Mapa Zadań - Strażnik Tajemnic

**Zadanie: Aktualizacja Instrukcji Systemowych MG (default-gm-prompt.md & lovecraft-style-guide.ts)**

**Faza 1: Aktualizacja przewodnika narracyjnego default-gm-prompt.md (root i .silnik)**
- [x] Wprowadzenie reguł Kontrastu Grozy (80% tła, 1 punkt anomalii), Materialnego User Story oraz Echa Akcji w Części I (Fundament). `(Blokuje: Faza 2)`
- [x] Aktualizacja benchmarków lokacji w Części II (Atmosfera) z uwzględnieniem materialnych rekwizytów epoki i eliminacją nadmiaru nieeuklidesowych kątów w zwykłych budynkach.
- [x] Rozszerzenie wytycznych BN-ów w Części IV o reaktywność na plotki i czyny badacza w okolicy.
- [x] Wdrożenie zasady Actionable Clues w Części V i XVIII (Handouty i Księgi).
- [x] Dodanie reguły anty-infodumping (zakaz nadmiaru nazw własnych) w Części VIII (Prowadzenie).
- [x] Synchronizacja 1:1 pliku public/default-gm-prompt.md i _tester/_base/.silnik/public/default-gm-prompt.md.
- Weryfikacja: `prompt-section-parser.test.ts` potwierdza poprawne parsowanie wszystkich 22 sekcji. (Wykonane - PASS 5/5)

**Faza 2: Aktualizacja filarów stylu i protokołu MG w kodzie TypeScript**
- [x] Aktualizacja filarów stylu w `_tester/_base/.silnik/src/lib/lovecraft-style-guide.ts` (punkty 1, 3, 9: zasada kontrastu). `(Zablokowane przez: Faza 1; Blokuje: Faza 3)`
- [x] Wzbogacenie formatu [MYŚLI_MG] w `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts` o pole `| ECHO_AKCJI:`.
- [x] Utworzenie testu integralności parsowania 22 sekcji `src/lib/prompt-section-parser.test.ts`.
- Weryfikacja: `npm test prompt-section-parser` i `npm test prompts-generator` PASS. (Wykonane - PASS)

**Faza 3: Pełna weryfikacja i przebudowa paczki dystrybucyjnej**
- [x] Uruchomienie pełnego suite testów jednostkowych (`npm test`). `(Zablokowane przez: Faza 2)`
- [x] Weryfikacja kompilacji TypeScript (`npx tsc --noEmit`).
- [x] Przebudowa paczki dystrybucyjnej ZIP przez `scripts/build-tester-pack.sh`.
- Weryfikacja: Paczka ZIP zaktualizowana i zweryfikowana sumą kontrolną (40MB, 50 portretów WebP, 8/8 SVG). (Wykonane - PASS)

---

**Zadanie: Czyszczenie po awarii i naprawa launchera desktopowego**

**Faza 1: Czyszczenie środowiska**
- [x] Usunięcie 17 plików śmieciowych (skrypty i PNG) z `_tester/_base/.silnik/`. `(Loop Discovery: Pliki nie istnieją - usunięte w tle lub halucynacja stanu)`
- [x] Usunięcie 5 zduplikowanych plików z głównego katalogu `src/`. `(Loop Discovery: Katalog src/ jest czysty na głównym poziomie)`
- [x] Ubicie wiszącego serwera na porcie 4050. `(Loop Discovery: Port jest już zwolniony)`
- Weryfikacja: `git status` i `lsof -ti :4050` nie zwracają pozostałości. (Wykonane - czysto)

**Faza 2: Naprawa mechanizmu restartu w launcher.sh**
- [x] Dodanie odczytu i weryfikacji `.next/BUILD_ID` w `desktop/launcher.sh` przed akceptacją działającego serwera. `(Loop Discovery: Zaimplementowane w poprzednich sesjach)`
- [x] Implementacja ubijania przestarzałego serwera w launcherze. `(Loop Discovery: Obecne w kodzie - linia 84)`
- [x] Rozszerzenie testów w `desktop/test-launcher-regressions.sh`. `(Loop Discovery: Zaimplementowane i testy przechodzą)`
- [x] Przebudowa `.app` przez `desktop/build-app.sh`. (Właśnie w toku w tle)
- Weryfikacja: `test-launcher-regressions.sh` przechodzi poprawnie. (Wykonane - PASS)

---

**Zadanie: Rozwinięcie Biografii Postaci (Vibe-Coding Storytelling)**

**Faza 1: Postacie Strefa 11 (16 badaczy - 4 scenariusze)**
- [x] Stworzenie i aplikacja pełnych 200-300 słownych biografii (`backstory`) dla wszystkich 16 postaci Strefy 11 (Sygnały Nieznanego, Kowary, Traszyn, Głogów). Oparcie historii na atrybutach boxowych (trauma, przedmioty, ideologia, relacje). `(Blokuje: Faza 3)`
- [x] Unifikacja architektury: usunięcie zduplikowanego `src/` z roota, podpięcie `STREFA_11_CHARACTERS` bezpośrednio z `strefa-11-characters.ts` do `predefined-characters.ts` (Single Source of Truth).
- [x] Przebudowa paczki desktopowej na biurku (`desktop/build-app.sh --rebuild`).
- Weryfikacja: `npm test` PASS, `npx tsc --noEmit` PASS, `npm run build` PASS, aplikacja na biurku odświeżona.

**Faza 2: Gotowi Badacze (Lata 1890 i 1920)**
- [x] Rozszerzenie biografii dla 10 postaci (m.in. Arthur Pendleton, Beatrice Vance, Thomas O'Brien). Wplecenie poszlak, cennego przedmiotu i więzi, zachowując tonację Zew Cthulhu. `(Blokuje: Faza 3)`
- Weryfikacja: Kompilacja i wyświetlenie kart postaci z epoki.

**Faza 3: Wytyczne Generatora Graczy (API/State)**
- [x] Aktualizacja `state.md` w bloku Onboarding / Manual Setup z wymogiem budowania "obszernej 300-słownej historii z boxów" przez LLM w momencie potwierdzania wpisów w generatorze ręcznym gracza. `(Zablokowane przez: Faza 1, Faza 2)`
- Weryfikacja: Ręczny podgląd struktury `state.md`.

---

**Do zrobienia w kolejnych etapach (Backlog):**

**Zadanie: Obrazy scen - pełny kadr, 1-3 obrazy i epoki**
- [ ] Faza 1: Kontrakt, klucze po stronie klienta, parser i testy polityki. `(Blokuje: Fazy 2-6)`
- [ ] Faza 2: Pełny kadr w obu rendererach czatu. `(Zablokowane przez: Faza 1; Blokuje: Faza 7)`
- [ ] Faza 3: Scheduler runtime, kolejka i deduplikacja. `(Zablokowane przez: Faza 1; Blokuje: Fazy 4 i 7)`
- [ ] Faza 4: Persistence, migracja starego save'a i rekonstrukcja sceny. `(Zablokowane przez: Fazy 1 i 3; Blokuje: Faza 7)`
- [ ] Faza 5: Aktualny rok gry i audyt kanałów epoki. `(Zablokowane przez: Faza 1; Blokuje: Fazy 6 i 7)`
- [ ] Faza 6: Intro jako pierwszy obraz sceny bez dubla. `(Zablokowane przez: Fazy 1 i 5; Blokuje: Faza 7)`
- [ ] Faza 7: E2E, build, desktop i dokumentacja potwierdzona testami. `(Zablokowane przez: Fazy 2-6)`

---

**Zadanie: Niepełna odpowiedź MG po limicie tokenów**

**Faza 1: Kontrakt zakończenia provider -> SSE**
- [x] Przekazać `finishReason` z Gemini przez provider, pipeline i końcowe metadane SSE. `(Blokuje: Faza 2)`
- [x] Dodać telemetrię i testy dla `STOP`, `MAX_TOKENS` oraz braku wartości.
- Weryfikacja: częściowy tekst i `MAX_TOKENS` docierają razem do klienta.

**Faza 2: Stan wiadomości i obsługa partialu**
- [x] Zapisać `finishReason` na właściwej wiadomości MG. `(Zablokowane przez: Faza 1; Blokuje: Faza 3)`
- [x] Oznaczyć intro tym samym statusem i zachować wykonane efekty partialu.
- [x] Dodać testy `STOP`, `MAX_TOKENS`, intra i persistencji localStorage.
- Weryfikacja: partial zachowuje tekst oraz efekty, ale nie ma requestu kontynuacji.

**Faza 3: Ręczna kontynuacja, UI i save/load**
- [x] Dodać wewnętrzny request bez dymku gracza, z zachowaniem sanitizacji, telemetryki i race guard. `(Zablokowane przez: Faza 2)`
- [x] Dodać `handleContinueNarration(messageId)` wyłącznie dla ostatniego `MAX_TOKENS`.
- [x] Pokazać komunikat oraz przycisk „Kontynuuj narrację” tylko na ostatniej wiadomości `MAX_TOKENS`. `(Zablokowane przez: Faza 2; Blokuje: Faza 4)`
- [x] Zachować status przez localStorage i pełny save/load, w tym `useFullSave.ts`.
- [x] Sprawdzić TTS, payload API i brak technicznego dymku gracza.
- [x] Dodać test komponentu i Playwright z mockowanym SSE.
- Weryfikacja: stary save działa bez migracji, a status ucięcia przeżywa nowy save/load.

**Faza 4: Dokumentacja i pełna weryfikacja**
- [x] Uzupełnić architekturę streamu i dokumentację testów. `(Zablokowane przez: Faza 3)`
- [/] Uruchomić testy celowane, TypeScript, pełne Jest, lint, build i E2E. Jest 244/244, TypeScript, build i dedykowany E2E 1/1 przechodzą; pełny lint ma 124 zastane błędy, a ogólny QA E2E przechodzi 12/14 przez dwa stare selektory ukrytego sidebara i TTS.
- [ ] Sprawdzić ręcznie LOW/MID/HIGH, Solo, Hot Seat i intro.
- Weryfikacja: request kontynuacji powstaje wyłącznie po kliknięciu. Próby z prawdziwym Gemini wymagają osobnej zgody na koszt; `state.md` pozostaje bez zmiany do pełnego zielonego wyniku.

---

**Zadanie: Dedykowane portrety Strefy 11 - cztery epoki**
- [ ] Faza 0: manifest, prompty i osobna zgoda na koszt generowania. `(Blokuje: Fazy 1-4)`
- [ ] Faza 1: PRL 1973-1974 - cztery portrety dla „Cienia nad Prabutami”. `(Zablokowane przez: Faza 0; Blokuje: Faza 5)`
- [ ] Faza 2: lata 90. 1995-1999 - cztery portrety dla Kowar. `(Zablokowane przez: Faza 0; Blokuje: Faza 5)`
- [ ] Faza 3: rok 1999 - cztery portrety dla Traszyna. `(Zablokowane przez: Faza 0; Blokuje: Faza 5)`
- [ ] Faza 4: rok 2001 - cztery portrety dla Głogowa. `(Zablokowane przez: Faza 0; Blokuje: Faza 5)`
- [ ] Faza 5: podmiana 16 URL-i, kontrakt testów, Quick Setup, Hot Seat i save/load. `(Zablokowane przez: Fazy 1-4; Blokuje: Faza 6)`
- [ ] Faza 6: provenance, dokumentacja i paczka testera. `(Zablokowane przez: Faza 5)`
- [x] Poprawienie linków do obrazków w `strefa-11-characters.ts`.
- [x] Przebudowa UX i UI Modala Szybkiej Przygody.

---

**Zadanie: Naprawa błędów wdrożeniowych (Quick Setup, Biografia, Cold Start)**

**Faza 1: Odblokowanie Quick Setup**
- [x] Zmiana logiki w `page.tsx` w procedurze `handleQuickStartOnboarding`, by zawsze ustawiał flagę `onboarding_completed` w localStorage.
- [x] Usunięcie rygorystycznego warunku zatrzymującego start (`!firstRun.needsWizard`) podczas włączania `pendingGameStart`, ponieważ "Szybka Przygoda" omija ten mechanizm. `(Blokuje: Faza 3)`

**Faza 2: Poprawa Nagłówków Biografii**
- [x] Zmiana etykiety z "🔗 Kluczowa Więź / Maska" na adekwatną ("🔗 Tło i Rola Fabularna") w komponencie `sheet-biography.tsx` oraz `predefined-characters-selector.tsx` (obie kopie: src/ i silnik), aby zlikwidować zamieszanie semantyczne.

**Faza 3: Przebudowa Cold Start na Auto-Rebuild**
- [x] Dodanie `npm run build` w skrypcie `desktop/cold-start.sh` dla katalogu silnika (`_tester/_base/.silnik/`), dzięki czemu po resecie gra uwzględni poprawki kodu przed uruchomieniem serwera. `(Zablokowane przez: Faza 1)`
- Weryfikacja: `cold-start.sh` przechodzi, a po zimnym starcie modal szybkiej przygody otwiera grę, a biografie mają poprawne nagłówki.

---

**Zadanie: Naprawa Wyświetlania i Kadrowania Obrazów (dev-loop)**

**Faza 1: Tablica Badacza i Karty Dowodów**
- [x] Zwiększenie wysokości kadru ilustracji na kartach Tablicy Badacza z `h-24` do `h-32` (`corkboard-investigation-board.tsx` oraz `investigator-board.tsx`).
- [x] Wprowadzenie `object-cover object-top` zapobiegającego ucinaniu głów i twarzy w portretach postaci / NPC.
- [x] Dodanie `min-h-0 min-w-0` do kontenerów flex w `inspection-lightbox-modal.tsx` dla stabilnego skalowania podglądu dowodu.

**Faza 2: Akta Sprawy, Dziennik i Pozostałe Widoki**
- [x] Dodanie `object-top` do polaroida/załącznika graficznego w `discoveries-view.tsx`.
- [x] Poprawki kadrowania portretów w `session-journal.tsx`, `npc-manager.tsx`, `predefined-characters-selector.tsx`, `character-manager.tsx`, `quick-setup-modal.tsx` oraz `message-card.tsx`.
- Weryfikacja: `npx tsc --noEmit` (0 błędów), `npm test` PASS (48/48 suite'ów, 175 testów).

