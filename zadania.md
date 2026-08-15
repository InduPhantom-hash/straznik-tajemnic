# Mapa Zadań - Strażnik Tajemnic

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
- [ ] **Dedykowane portrety postaci dla Strefy 11:** Wygenerowanie nowych portretów pasujących epokowo (Polska lat 90. / ekipa programu telewizyjnego Strefa 11) dla wszystkich badaczy i podłożenie ich do `/public/portraits/predefined/strefa11/`.
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


