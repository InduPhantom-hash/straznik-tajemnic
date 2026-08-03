# Mapa Zadań - Strażnik Tajemnic

**Zadanie: Czyszczenie po awarii i naprawa launchera desktopowego**

**Faza 1: Czyszczenie środowiska**
- [ ] Usunięcie 17 plików śmieciowych (skrypty i PNG) z `_tester/_base/.silnik/`. `(Blokuje: Faza 2)`
- [ ] Usunięcie 5 zduplikowanych plików z głównego katalogu `src/`.
- [ ] Ubicie wiszącego serwera na porcie 4050.
- Weryfikacja: `git status` i `lsof -ti :4050` nie zwracają pozostałości.

**Faza 2: Naprawa mechanizmu restartu w launcher.sh**
- [ ] Dodanie odczytu i weryfikacji `.next/BUILD_ID` w `desktop/launcher.sh` przed akceptacją działającego serwera. `(Zablokowane przez: Faza 1)`
- [ ] Implementacja ubijania przestarzałego serwera w launcherze.
- [ ] Rozszerzenie testów w `desktop/test-launcher-regressions.sh`.
- [ ] Przebudowa `.app` przez `desktop/build-app.sh`.
- Weryfikacja: `test-launcher-regressions.sh` przechodzi poprawnie.

---

**Zadanie: Rozwinięcie Biografii Postaci (Vibe-Coding Storytelling)**

**Faza 1: Postacie Strefa 11 (Modern/TV)**
- [x] Stworzenie i aplikacja 200-300 słownej biografii dla Tomasza Nowickiego, Heleny Krawczyk, Barbary Zawadzkiej, Ryszarda Klucznika. Oparcie historii na istniejących atrybutach boxowych (trauma, przedmioty, ideologia). `(Blokuje: Faza 3)`
- Weryfikacja: Kompilacja i wyświetlenie postaci w UI.

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
