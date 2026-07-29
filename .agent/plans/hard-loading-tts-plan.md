## Plan: Hard-loading screen (TTS)
Data: 2026-07-29
Złożoność: Średnia

### Problem
Brak synchronizacji między załadowaniem ekranu gry a inicjalizacją bufora TTS powoduje, że intro tekstowe pojawia się od razu, a głos lektora dołącza dopiero po chwili. Może to uciąć początek kwestii lub zaburzyć immersję.

### Rozwiązanie
Zastosowanie Wariantu A z researchu: dodanie flagi `isInitialBuffering` w `useTTS.ts` i wstrzymanie renderowania elementów czatu za pełnoekranowym, klimatycznym (Lovecraftian) czarnym loaderem "Inicjalizacja głosu Narratora...". Blokada zostanie zdjęta, gdy bufor pobierze pierwszą paczkę audio.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/hooks/useTTS.ts` | Eksport stanu `isInitialBuffering`, funkcja startująca loader na starcie, automatyczne zgaszenie po sukcesie `preloadedAudioRef` lub timeoucie/wyłączeniu TTS. | Średnie |
| `_tester/_base/.silnik/src/components/chat/chat-window/index.tsx` | Wpięcie komponentu `TTSHardLoadingScreen` wyświetlającego się gdy flagą `isInitialBuffering` w `useTTS` jest `true`. | Niskie |

### Fazy implementacji

**Faza 1: Rozszerzenie `useTTS.ts` o stan bufforowania**
- [ ] Dodanie stanu `isInitialBuffering` i jego eksport z hooka.
- [ ] Wstrzyknięcie zgaszenia flagi, gdy pierwszy wygenerowany segment znajdzie się w mapie `preloadedAudioRef.has(0)`.
- [ ] Dodanie metody `startInitialBuffering` wraz z awaryjnym timeoutem (6 sekund) i sprawdzeniem `isTTSEnabled`/`voiceEnabled` (by uniknąć zacięcia gry z wyłączonym głosem).
- Weryfikacja: Stan powinien poprawnie przechodzić z true na false bez zamrożenia silnika przy uruchomieniu testowego dema czatu.

**Faza 2: Implementacja Loadera UI**
- [ ] Zbudowanie małego, wydzielonego komponentu (lub inline) w `chat-window/index.tsx` zawierającego klimatyczne tło, delikatny spinner i napis (Czcionka Art Deco / Cinzel / Special Elite wzorem innych zakładek).
- [ ] Wyświetlenie loadera przed (lub na) `MessageCard` podczas startu gry.
- Weryfikacja: Start aplikacji z opóźnioną siecią, potwierdzenie działania czarnego ekranu.

### Weryfikacja końcowa
- Manualne sprawdzenie przepływu "Rozpocznij -> Loader TTS -> Start narracji tekstowej z natychmiastowym dźwiękiem".
- Uruchomienie testów środowiskowych silnika: `cd _tester/_base/.silnik && npm test`.

### Co może się zepsuć
- Jeśli TTS rzuci natychmiastowym błędem w pętli API bez odpowiedniego obsłużenia, ekran może się zaciąć (dlatego dodamy timeout).
- Wyścig (race condition) między zmianą stanu a przejściem Reacta z `hasStartedGame`.
