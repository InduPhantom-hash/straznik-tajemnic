# 🛠️ Przewodnik dla Współtwórców i Programistów (Developer Guide)

> Ten dokument jest bezpośrednim przewodnikiem technicznym dla inżynierów i współpracowników rozwijających **Strażnika Tajemnic AI (v0.9.4)**. Jeśli wchodzisz do tego repozytorium, przeczytaj poniższe zasady przed napisaniem pierwszej linijki kodu.

---

## 🗺️ 1. Mental Model & Topologia Kodu (Gdzie co leży)

To repozytorium posiada specyficzną architekturę zabezpieczającą środowisko gracza i proces wydawniczy:

```
straznik-tajemnic/ (Git Root / Wrapper)
├── _tester/_base/.silnik/       <-- TUTAJ ŻYJE 100% KODU APLIKACJI I TESTÓW (Next.js 16)
│   ├── src/                     <-- Kod źródłowy (App Router, komponenty, lib)
│   │   ├── app/                 <-- Ekrany i Route Handlers (/api/*)
│   │   ├── components/          <-- Komponenty React (UI, dialogi, nawigacja)
│   │   └── lib/                 <-- Logika domenowa (CoC 7e RAW, RAG, prompty MG)
│   ├── messages/                <-- Słowniki i18n: pl.json i en.json (100% symetrii!)
│   ├── navigation/              <-- navigation-registry.json (rejestr 31 węzłów i modali)
│   └── package.json             <-- Zależności, skrypty testowe i kompilacja
├── desktop/                     <-- Skrypty launchera macOS (cold-start.sh, build-app.sh)
├── docs/                        <-- Wersjonowane źródło prawdy architektury i mechanik
└── README.md                    <-- Publiczna wizytówka projektu na GitHubie
```

> [!CAUTION]
> **Żelazna zasada topologii:**  
> Całość prac deweloperskich, instalacja paczek (`npm install`), uruchamianie serwera dev (`npm run dev`) oraz testy wykonujesz w katalogu `_tester/_base/.silnik/`.  
> **Nigdy nie twórz ani nie edytuj plików w roocie `src/` repozytorium!** Root służy wyłącznie jako wrapper i repozytorium nadrzędne.

---

## 🛡️ 2. Pięć Żelaznych Inwariantów (Czego nie wolno łamać)

### 1. Determinizm Zasad CoC 7e (Rules As Written - RAW)
- **Kości i mechanikę liczy wyłącznie TypeScript:** Wszelkie rzuty k100, poziomy sukcesu (Zwykły, Trudny, Ekstremalny, Krytyk, Fumble), rzuty na Poczytalność (SAN), testy na Pomysł (Idea Roll) oraz Faza Rozwoju Postaci są liczone w 100% kodem aplikacji (`src/lib/dice-utils.ts`, `skill-test-resolver.ts`).
- **AI nie rzuca kośćmi w czacie:** Model LLM otrzymuje gotowy, twardy wynik testu i jego zadaniem jest **wyłącznie fabularny opis konsekwencji**. Nie wprowadzaj sztucznych modyfikatorów procentowych (`-20%`) ani reguł spoza oficjalnej Księgi Strażnika CoC 7e.
- **Podwójny Kontrakt (Silnik ↔ Prompt MG):** Każdy nowy tag narracyjny wyemitowany przez prompt MG (`gm-protocol.ts`) musi mieć parser w silniku (`apply-stat-changes.ts`, `mechanics-parser.ts`), regułę czyszczenia z tekstu (`text-cleaner.ts`) oraz obsługę w lektorze TTS.

### 2. Bezwzględna Symetria Językowa (PL + EN)
- Aplikacja działa równolegle w języku polskim i angielskim.
- **Zakaz hardcoded strings w UI:** Każdy tekst wyświetlany użytkownikowi musi korzystać z hooka `useTranslations()`.
- Każdy klucz dodany do `_tester/_base/.silnik/messages/pl.json` **musi natychmiast otrzymać swój dokładny odpowiednik** w `messages/en.json`.
- Zakaz asymetrii typów (np. tablica w PL, a obiekt lub string w EN). Weryfikacja: `npm run qa:quick`.

### 3. Rejestr Nawigacji (`navigation-registry.json`)
- Nawigacja aplikacji (31 ekranów, modali i kluczowych akcji) jest ściśle rejestrowana.
- Jeśli dodajesz lub zmieniasz trasę, modal lub drawer: **musisz zaktualizować** plik `_tester/_base/.silnik/navigation/navigation-registry.json`.
- CI w GitHub Actions natychmiast zablokuje PR, jeśli `npm run navigation:check` wykaże dryf między kodem a rejestrem.

### 4. Design System Dark Art Déco 1920s
- Cała aplikacja w v0.9.4 przeszła standaryzację na styl historyczny lat 20. XX wieku (mosiądz, postarzane złoto, głęboka czerń, mahoń, szmaragd Cthulhu).
- **Zakaz klas nowoczesnego flat designu:** `bg-zinc-*`, `bg-gray-*`, `text-white`, `rounded-2xl`, `rounded-3xl`.
- **Używaj tokenów semantycznych:**
  - Tła: `bg-background`, `bg-card`, `bg-input`
  - Tekst: `text-foreground`, `text-card-foreground`, `text-muted-foreground`
  - Akcenty i ramki: `text-brass`, `border-brass/30`, `border-border`, `text-gold`
  - Marka i Destructive: `bg-primary` (szmaragd), `text-destructive` (karmin/krew)
  - Fonty: `font-display` (Cinzel), `font-special-elite` / `font-mono` (maszynopis).
  - Weryfikacja: `npm run audit:art-deco`.

### 5. Bezpiecznik CPI (Circuit Breaker)
- Jeśli wprowadzasz poprawkę i po 2 próbach kompilacja lub testy nie przechodzą: **zatrzymaj się (STOP)**.
- **Zakaz halucynacji naprawczych:** Nigdy nie dodawaj `any`, nie rzutuj typów na siłę, nie wyciszaj linterów (`eslint-disable`) i nie modyfikuj niepowiązanych plików tylko po to, by "przepchnąć" build.
- Jeśli kod nie działa - cofnij zmiany (`git checkout`), przeanalizuj przyczynę źródłową i skonsultuj decyzję architektoniczną z Product Ownerem.

---

## ⚡ 3. Developer Cheat Sheet (Najważniejsze polecenia)

Wszystkie komendy poniżej uruchamiaj w katalogu `_tester/_base/.silnik/`:

```bash
# 1. Przejście do katalogu silnika
cd _tester/_base/.silnik

# 2. Uruchomienie lokalnego serwera deweloperskiego
npm run dev
# Aplikacja wystartuje pod adresem http://localhost:3000

# 3. Szybka weryfikacja jakościowa (Zawsze przed commitem!)
npm run qa:quick
# Wykonuje równolegle: tsc (type-check), walidację symetrii i18n oraz navigation:check

# 4. Sprawdzenie zgodności ze stylem Dark Art Déco
npm run audit:art-deco

# 5. Uruchomienie testów jednostkowych (Jest)
npm test

# 6. Pełny build produkcyjny silnika
npm run build
```

### Budowanie i testowanie aplikacji macOS (z Git Root):

```bash
# Z poziomu głównego katalogu repozytorium:
cd /Volumes/Karta/Developer/straznik-tajemnic

# Czyszczenie cache, profilu Chrome i bazy IndexedDB (Cold Start):
bash desktop/cold-start.sh

# Przebudowa paczki na Twoim Biurku (~/Desktop/Straznik Tajemnic AI.app):
bash desktop/build-app.sh --rebuild
```

---

## 🔄 4. GitHub jako Jedyne Źródło Prawdy (SSOT)

1. **Backlog i Zadania:**
   - Publiczne **GitHub Issues** są jedynym miejscem rejestrowania bugów, pomysłów i epików.
   - Tablica **GitHub Project 2 (`Zarządzanie - Strażnik Tajemnic`)** automatycznie zarządza kolejką (`Todo` -> `In Progress` -> `Done`).
   - Nie twórz lokalnych plików `todo.md` ani konkurencyjnych trackerów na boku.
2. **Gałęzie robocze (Branches):**
   - Twórz gałęzie z `main` według konwencji: `fix/issue-XX-krotki-opis` lub `feature/issue-XX-krotki-opis`.
3. **Pull Request (PR):**
   - Każdy PR musi zawierać słowo kluczowe zamykające Issue (np. `Closes #165`).
   - CI w GitHub Actions automatycznie uruchamia joby `quality`, `navigation-e2e` oraz `CodeQL`. Wszystkie muszą być zielone przed scaleniem.
   - Po akceptacji wykonujemy squash-merge (`gh pr merge --squash --delete-branch`).

---

## 📖 5. Gdzie szukać dodatkowych informacji?

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - dogłębny opis architektury offline, RAG-u i połączeń API.
- [docs/DESIGN-SYSTEM-ART-DECO.md](docs/DESIGN-SYSTEM-ART-DECO.md) - pełna specyfikacja tokenów wizualnych 1920s.
- [docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md](docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md) - zasady narracji Lovecrafta, kognitywistyka i pacing.
- [docs/SYSTEMS-CATALOG.md](docs/SYSTEMS-CATALOG.md) - katalog 26 podsystemów z ich stanem i właścicielami źródeł prawdy.
- [docs/NAVIGATION_MAP.md](docs/NAVIGATION_MAP.md) - pełna mapa 31 ekranów i modali w grze.
