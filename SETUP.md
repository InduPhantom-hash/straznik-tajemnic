# 🚀 Instalacja i pierwsze uruchomienie (v0.9.5)

Krok po kroku - od zera do pierwszej sesji. Cała gra działa lokalnie na Twoim komputerze w myśl zasady **Privacy-First**; nic nie jest wysyłane na serwery zewnętrzne poza zapytaniami do API Gemini (które wykonujesz **swoim** darmowym kluczem w modelu BYOK).

---

## 1. Wymagania

- **Node.js 18+** ([nodejs.org](https://nodejs.org)) oraz `npm`.
- **Klucz Gemini** (darmowy) - do wygenerowania na [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
- **Własny podręcznik zasad d100** w formacie PDF (darmowy Starter d100 lub pełna Księga Zasad).
- **Sprzęt:** Procesor 4-rdzeniowy z obsługą instrukcji AVX2 (Intel Core i3 / AMD Ryzen 3 lub Apple Silicon M1+), min. 8 GB RAM (aplikacja zużywa ~450 MB). Silnik posiada sprzętowy bezpiecznik (100 ms timeout), który w razie potrzeby automatycznie przełącza klasyfikację na natywne heurystyki TypeScript.

---

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
> Kod produkcyjny silnika żyje w podkatalogu `_tester/_base/.silnik/`. Główny katalog repozytorium służy jako launcher i wrapper środowiska deweloperskiego.

---

## 3. Klucz Gemini (Model BYOK)

1. Wejdź na **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**.
2. Zaloguj się kontem Google i kliknij **Create API key**.
3. Skopiuj klucz. Ten jeden klucz obsługuje czat MG, lektora TTS, obrazy i lokalny indeks zasad RAG.

> Darmowy tier Gemini w zupełności wystarcza do gry. Klucz wkleisz bezpośrednio w oknie aplikacji przy pierwszym starcie - nie musisz edytować plików konfiguracyjnych.

---

## 4. Konfiguracja środowiskowa (opcjonalna)

Jeśli wolisz zapisać klucz na stałe w pliku lokalnym:

```bash
# Będąc w _tester/_base/.silnik:
cp .env.example .env.local
```

W pliku `.env.local` możesz wpisać `GEMINI_API_KEY=twoj_klucz`.

---

## 5. Skąd wziąć podręcznik (Doktryna BYOB)

Aplikacja to czysty emulator zasad i **nie zawiera** żadnego podręcznika ani chronionych prawem autorskim tabel. Wnosisz własny, legalnie nabyty egzemplarz PDF:

**Darmowe wydania na start (w zupełności wystarczą):**
- **Black Monk** - darmowy Starter d100 PL: [Pobierz Starter PDF](https://static.blackmonk.pl/file/ZC_Starter.pdf).
- **Chaosium** - _Call of Cthulhu Quick-Start Rules_ (EN): [Pobierz Quick-Start PDF](https://www.chaosium.com/content/FreePDFs/CoC/CHA23131%20Call%20of%20Cthulhu%207th%20Edition%20Quick-Start%20Rules.pdf?srsltid=AU7gw4V_wFSlDU2eHmVHyECBP8ZSusjVskZz5IzR5Kz01jIdG3KGoc-O).

**Pełne księgi zasad:**
- [Black Monk](https://blackmonk.pl) (PL) · [DriveThruRPG](https://www.drivethrurpg.com) (EN) · [ProRPG](https://prorpg.store) (PL).

---

## 6. Pierwsze uruchomienie w przeglądarce

Będąc w katalogu `_tester/_base/.silnik`:

```bash
npm run dev
```

Otwórz w przeglądarce **[http://localhost:3000](http://localhost:3000)**. Kreator pierwszego uruchomienia poprowadzi Cię przez trzy proste kroki:
1. **Wklejenie klucza Gemini** i test połączenia jednym kliknięciem.
2. **Wybór źródła podręcznika**.
3. **Wgranie pliku PDF** - aplikacja zindeksuje zasady lokalnie na Twoim dysku w binarnych wektorach `Float32` (`data/rag/`). Trwa to około minuty.

Po zakończeniu indeksowania przycisk **Graj** staje się aktywny.

---

## 7. Aplikacja desktopowa (macOS oraz Windows)

Silnik posiada zintegrowany **Desktop Process Supervisor** (`desktop/supervisor.mjs`) w czystym Node.js, który dba o eliminację procesów zombie, dynamiczny przydział wolnych portów oraz zasadę Single Instance (przywracanie aktywnego okna).

### macOS:
Z poziomu głównego katalogu repozytorium:
```bash
# Zbudowanie aplikacji .app i skrótu na Biurku:
bash desktop/build-app.sh --rebuild

# Szybki start deweloperski z supervisorem:
bash desktop/launcher.sh
```

### Windows:
W wierszu poleceń (CMD / PowerShell) w głównym katalogu repozytorium:
```cmd
desktop\launcher.cmd
```

### Reset i czyszczenie stanu (Cold Start macOS):
W razie chęci wyczyszczenia profilu sesji, pamięci RAG czy pamięci podręcznej przeglądarki uruchom:
```bash
bash desktop/cold-start.sh
```

---

## Rozwiązywanie problemów

| Objaw | Co zrobić |
|---|---|
| „Brak klucza” mimo wklejenia | Upewnij się, że wklejony klucz nie zawiera spacji na początku lub końcu; przetestuj go w oknie modalu API. |
| AI mówi, że „nie ma zasady w kontekście” | Wgraj podręcznik (krok 6) - bez niego lokalna baza RAG jest pusta. To zamierzone zabezpieczenie przed zmyślaniem reguł przez model. |
| Obrazy się nie generują | Sprawdź limit zapytań w Google AI Studio; generowanie obrazów jest opcjonalne i nie blokuje przebiegu narracji. |
| Zajęty port sieciowy | Desktop Process Supervisor automatycznie wykrywa zajęty port i przydziela kolejny wolny (4050 -> 4051+) bez konieczności ręcznej konfiguracji. |

---

Więcej o samej rozgrywce i zasadach: [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md).  
Wytyczne architektoniczne i standardy inżynieryjne: [`CONTRIBUTING.md`](./CONTRIBUTING.md).
