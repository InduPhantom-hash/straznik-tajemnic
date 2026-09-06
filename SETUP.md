# Instalacja i pierwsze uruchomienie

Krok po kroku - od zera do pierwszej sesji. Cała gra działa lokalnie na Twoim
komputerze; nic nie jest wysyłane na serwery zewnętrzne poza zapytaniami do API Gemini
(które wykonujesz **swoim** darmowym kluczem).

## 1. Wymagania

- **Node.js 18+** ([nodejs.org](https://nodejs.org)) oraz `npm`.
- **Klucz Gemini** (darmowy) - do wygenerowania na [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
- **Własny podręcznik** _Zew Cthulhu / Call of Cthulhu 7e_ w formacie PDF (darmowy starter wystarczy na początek).
- _(opcjonalnie, tylko macOS)_ Google Chrome, jeśli chcesz korzystać z launchera `.app` na biurku.

## 2. Pobranie i instalacja

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/InduPhantom-hash/straznik-tajemnic.git
cd straznik-tajemnic

# 2. Przejdź do katalogu silnika aplikacji
cd _tester/_base/.silnik

# 3. Zainstaluj zależności
npm install
```

> [!NOTE]
> Kod produkcyjny silnika żyje w podkatalogu `_tester/_base/.silnik/`. Root repozytorium służy jako launcher i wrapper.

## 3. Klucz Gemini

1. Wejdź na **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**.
2. Zaloguj się kontem Google i kliknij **Create API key**.
3. Skopiuj klucz. Ten jeden klucz obsługuje czat MG, lektora TTS, obrazy i lokalny indeks zasad RAG.

> Darmowy tier Gemini w zupełności wystarcza do gry. Klucz wkleisz bezpośrednio w oknie aplikacji przy pierwszym starcie - nie musisz edytować plików konfiguracyjnych.

## 4. Konfiguracja (opcjonalna)

Jeśli wolisz zapisać klucz na stałe w zmiennych środowiskowych:

```bash
# Będąc w _tester/_base/.silnik:
cp .env.example .env.local
```

W pliku `.env.local` możesz wpisać `GEMINI_API_KEY=twoj_klucz`.

## 5. Skąd wziąć podręcznik

Aplikacja **nie zawiera** żadnego podręcznika - wnosisz własny, legalny egzemplarz PDF:

**Za darmo (na start w zupełności wystarczy):**
- **Black Monk** - darmowe startery PL: [blackmonk.pl](https://blackmonk.pl) (sekcja „Do pobrania”).
- **Chaosium** - _Quick-Start Rules_ (EN): [chaosium.com](https://www.chaosium.com/call-of-cthulhu-quick-start/).

**Pełne wydania:**
- [Black Monk](https://blackmonk.pl) (PL) · [DriveThruRPG](https://www.drivethrurpg.com) (EN) · [ProRPG](https://prorpg.store) (PL).

## 6. Pierwsze uruchomienie

Będąc w katalogu `_tester/_base/.silnik`:

```bash
npm run dev
```

Otwórz w przeglądarce **[http://localhost:3000](http://localhost:3000)**. Kreator pierwszego uruchomienia poprowadzi Cię przez trzy proste kroki:
1. **Wklejenie klucza Gemini** i test połączenia jednym kliknięciem.
2. **Wybór źródła podręcznika**.
3. **Wgranie pliku PDF** - aplikacja zindeksuje zasady lokalnie na Twoim dysku w binarnych wektorach `Float32` (`data/rag/`). Trwa to około minuty.

Po zakończeniu indeksowania przycisk **Graj** staje się aktywny.

## 7. (macOS) Samodzielna aplikacja na biurku

Jeśli wolisz klikalną aplikację w macOS zamiast uruchamiania terminala:

```bash
# Z poziomu głównego katalogu repozytorium (/straznik-tajemnic):
bash desktop/build-app.sh --rebuild
```

Skrypt zbuduje produkcyjną aplikację `Strażnik Tajemnic AI.app` w Twoim katalogu `~/Applications` i utworzy skrót na Biurku.

### Reset i czyszczenie stanu (Cold Start):
W razie chęci wyczyszczenia profilu sesji, pamięci RAG czy pamięci podręcznej przeglądarki uruchom:
```bash
bash desktop/cold-start.sh
```

## Rozwiązywanie problemów

| Objaw | Co zrobić |
|---|---|
| „Brak klucza” mimo wklejenia | Upewnij się, że wklejony klucz nie zawiera spacji na początku lub końcu; przetestuj go w oknie modalu API. |
| AI mówi, że „nie ma zasady w kontekście” | Wgraj podręcznik (krok 6) - bez niego lokalna baza RAG jest pusta. To zamierzone zabezpieczenie przed zmyślaniem reguł przez model. |
| Obrazy się nie generują | Sprawdź limit zapytań w Google AI Studio; generowanie obrazów jest opcjonalne i nie blokuje przebiegu narracji. |
| Port 3000 zajęty | Zatrzymaj inny proces node lub uruchom silnik na alternatywnym porcie: `PORT=3001 npm run dev`. |

Więcej o samej rozgrywce i zasadach: [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md).  
Wytyczne architektoniczne dla inżynierów: [`CONTRIBUTING.md`](./CONTRIBUTING.md).
