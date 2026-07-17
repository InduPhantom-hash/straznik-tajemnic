# Instalacja i pierwsze uruchomienie

Krok po kroku - od zera do pierwszej sesji. Cała gra działa lokalnie na Twoim
komputerze; nic nie jest wysyłane na żadne serwery poza zapytaniami do API Gemini
(które wykonujesz **swoim** kluczem).

## 1. Wymagania

- **Node.js 18+** ([nodejs.org](https://nodejs.org)) i `npm`.
- **Klucz Gemini** (darmowy) - zdobędziesz go w kroku 3.
- **Własny podręcznik** _Zew Cthulhu / Call of Cthulhu 7e_ w PDF - darmowy starter
  wystarczy na początek (linki w kroku 5).
- _(opcjonalnie, tylko macOS)_ Google Chrome, jeśli chcesz launcher `.app` na biurku.

## 2. Pobranie i instalacja

```bash
git clone <adres-repozytorium>
cd wirtualny-straznik-tajemnic
npm install
```

## 3. Klucz Gemini

1. Wejdź na **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**.
2. Zaloguj się kontem Google i kliknij **Create API key**.
3. Skopiuj klucz. Ten jeden klucz obsługuje czat, lektor, obrazy i wyszukiwanie zasad.

> Darmowy tier Gemini wystarcza, by zacząć. Klucz wkleisz w aplikacji (krok 6) - nie
> musisz edytować plików. Alternatywnie możesz go wpisać do `.env.local` (krok 4).

## 4. Konfiguracja (opcjonalna)

Skopiuj szablon i - jeśli chcesz - uzupełnij:

```bash
cp .env.example .env.local
```

Dla podstawowej gry **nie musisz nic wpisywać** - klucz Gemini podasz w UI.
Plik `.env.local` przyda się, gdy chcesz wgrać klucz na stałe lub włączyć opcjonalne
providery (lepsze obrazy, alternatywny lektor). Wszystkie pola są opisane w `.env.example`.

## 5. Skąd wziąć podręcznik

Aplikacja **nie zawiera** żadnego podręcznika - wnosisz własny, legalny egzemplarz.

**Za darmo (na start w zupełności wystarczy):**

- **Black Monk** - darmowe startery PL: [blackmonk.pl](https://blackmonk.pl) (sekcja „Do pobrania").
- **Chaosium** - _Quick-Start Rules_ (EN): [chaosium.com](https://www.chaosium.com/call-of-cthulhu-quick-start/).

**Pełne wydania (płatne):**

- [Black Monk](https://blackmonk.pl) (PL) · [DriveThruRPG](https://www.drivethrurpg.com) (EN) · [ProRPG](https://prorpg.store) (PL).

Pobierz PDF na dysk - wgrasz go w kroku 6.

## 6. Pierwsze uruchomienie

```bash
npm run dev
```

Otwórz **[http://localhost:3000](http://localhost:3000)**. Kreator pierwszego
uruchomienia poprowadzi Cię przez trzy ekrany:

1. **Klucz Gemini** - wklej klucz z kroku 3 i kliknij test. ✅ = działa.
2. **Skąd wziąć podręcznik** - te same linki co wyżej (za darmo / kup).
3. **Wgraj podręcznik** - wskaż swój PDF. Aplikacja wyciągnie tekst i zbuduje
   lokalny indeks zasad (`data/rag/`). Trwa to chwilę przy pierwszym wgraniu.

Po tym kroku przycisk **Graj** jest aktywny.

## 7. (macOS) Launcher na biurku

Jeśli wolisz klikalną ikonę zamiast terminala:

```bash
bash desktop/build-app.sh --rebuild
```

Powstanie `Strażnik Tajemnic AI.app` w `~/Applications` + alias na biurku
(ikona Oka Horusa). Dwuklik uruchamia serwer i otwiera okno gry; zamknięcie okna
zatrzymuje serwer. Logi: `~/Library/Logs/wirtualny-straznik-tajemnic.log`.

## Rozwiązywanie problemów

| Objaw                                    | Co zrobić                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| „Brak klucza" mimo wklejenia             | Sprawdź, czy klucz nie ma spacji; przetestuj go w kreatorze.                                             |
| AI mówi, że „nie ma zasady w kontekście" | Wgraj podręcznik (krok 6.3) - bez niego RAG jest pusty. To celowe zabezpieczenie przed zmyślaniem zasad. |
| Obrazy się nie generują                  | Sprawdź limit klucza Gemini; obrazy są opcjonalne i nie blokują gry.                                     |
| Build na macOS bez Chrome                | Launcher `.app` wymaga Chrome; bez niego graj przez `npm run dev`.                                       |
| Port 3000 zajęty                         | Zatrzymaj inny proces albo uruchom `PORT=3001 npm run dev`.                                              |

Więcej o samej rozgrywce: [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md).
