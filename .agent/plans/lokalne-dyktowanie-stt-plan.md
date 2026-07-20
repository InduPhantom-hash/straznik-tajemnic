## Plan: lokalne dyktowanie wiadomości PL/EN
Data: 2026-07-20
Złożoność: Duża

### Problem

Aplikacja nie ma lokalnego dyktowania, a planowana funkcja musi działać offline, obsługiwać polski i angielski zgodnie z językiem aplikacji oraz być dostarczana razem z paczką dla macOS i Windows.

### Rozwiązanie

Zintegrować `whisper.cpp` z wielojęzycznym modelem Whisper `base` w wariancie kwantyzowanym Q5/Q8. Warstwa aplikacji będzie wspólna, ale wydania będą miały osobny natywny artefakt macOS i Windows; model pozostanie zaszyty w obu artefaktach i nie będzie pobierany przy pierwszym użyciu.

Pierwszy zakres obejmuje dyktowanie zakończone ręcznie: nagranie -> transkrypcja -> wstawienie tekstu. Tryb tekstu na żywo zostaje poza MVP do czasu pomiarów.

### Pliki do modyfikacji

| plik | zmiana | ryzyko |
|------|--------|--------|
| `docs/ROADMAP-MECHANIKI-AI.md` | Etap 6: lokalne dyktowanie PL/EN, decyzje i kryteria | Niskie |
| `_tester/_base/.silnik/src/components/chat/chat-window/components/message-input.tsx` | Ikona mikrofonu, stany nagrywania i wstawianie wyniku | Średnie |
| `_tester/_base/.silnik/src/components/chat/chat-window/index.tsx` | Przekazanie konfiguracji języka i kontraktu STT | Średnie |
| `_tester/_base/.silnik/src/lib/speech-to-text/` | Wspólny kontrakt i adapter lokalnego runtime'u | Wysokie |
| `_tester/_base/.silnik/desktop/build-app.sh` | Dołączenie modelu/runtime'u do macOS `.app` | Wysokie |
| `desktop/` oraz pipeline Windows | Samowystarczalne artefakty dla obu platform | Wysokie |
| `_tester/_base/.silnik/src/.../*.test.*` | Testy kontraktu, UI, błędów i uprawnień | Średnie |

### Fazy implementacji

**Faza 1: pomiar i wybór zasobu**
- [ ] Zabezpieczyć wersję `whisper.cpp` i modelu.
- [ ] Porównać `tiny`, `base` Q5 i `base` Q8 na macOS oraz Windows.
- [ ] Ustalić próg czasu, RAM, rozmiaru paczki i jakości.
- Weryfikacja: raport z pomiarami i zaakceptowany wariant modelu.

**Faza 2: lokalny runtime i audio**
- [ ] Dodać natywny adapter STT z obsługą `pl`/`en`.
- [ ] Dodać nagrywanie mono/16 kHz, anulowanie, VAD lub ręczne zatrzymanie i usuwanie audio tymczasowego.
- [ ] Dodać manifest modelu, checksumę i kontrolę brakującego/niezgodnego zasobu.
- Weryfikacja: transkrypcja bez sieci z poziomu testowego wywołania na obu systemach.

**Faza 3: interfejs czatu**
- [ ] Dodać ikonę mikrofonu przy polu wiadomości.
- [ ] Pokazać stany: gotowy, nagrywanie, przetwarzanie, brak uprawnień, błąd i brak modelu.
- [ ] Wstawić wynik do pola bez automatycznego wysyłania.
- [ ] Użyć języka wybranego dla całej aplikacji; bez osobnego przełącznika STT.
- Weryfikacja: ręczny przepływ dyktowania PL i EN oraz test komponentu.

**Faza 4: paczkowanie i wydanie**
- [ ] Zaszyć model/runtime w macOS `.app` i w artefakcie Windows.
- [ ] Sprawdzić świeżą instalację bez globalnego runtime'u STT i bez sieci.
- [ ] Zweryfikować rozmiar, checksumy, licencje i aktualizację bez naruszenia danych użytkownika.
- Weryfikacja: smoke test obu artefaktów i test zimnego startu.

### Weryfikacja końcowa

- `npm run build`
- testy jednostkowe i komponentowe silnika
- test pakowania macOS przez `bash desktop/build-app.sh --rebuild`
- ręczny smoke test świeżej paczki macOS i Windows offline
- pomiary opóźnienia od zatrzymania nagrania do pojawienia się tekstu

### Co może się zepsuć

- Model zwiększy rozmiar paczki i czas aktualizacji - ryzyko średnie.
- Różnice w dostępie do mikrofonu i natywnym runtime między macOS i Windows - ryzyko wysokie.
- `base` może gorzej rozpoznawać nazwy własne lub mowę w hałasie - ryzyko średnie.
- Budowanie `.app` może obecnie kopiować kod, ale nie zasoby modelu - ryzyko wysokie.
- Nieprawidłowy audyt licencji może zablokować publiczne wydanie - ryzyko wysokie.
- Bieżące niezacommitowane zmiany w pipeline PDF pozostają poza zakresem tego planu i nie mogą zostać nadpisane.
