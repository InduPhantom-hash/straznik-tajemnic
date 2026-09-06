<div align="center">

<img src="docs/assets/06-banner-1500x500.png" alt="Strażnik Tajemnic AI / Keeper of Arcane Lore AI" width="820">

# 𓂀 Strażnik Tajemnic AI / Keeper of Arcane Lore AI (v0.9.4)

**Nieoficjalny, fanowski Mistrz Gry AI do sesji RPG w klimacie lovecraftowskim.**  
*An unofficial, fan-made AI Game Master for RPG sessions in the Lovecraftian setting.*

> v0.9.4 jest w przygotowaniu do wydania na macOS. Aktualne publiczne wydanie: v0.9.3.<br>
> v0.9.4 is in preparation for macOS release. Current public release: v0.9.3.

---

[🇵🇱 Wersja Polska](#-straznik-tajemnic-ai-v094) | [🇺🇸 English Version](#-keeper-of-arcane-lore-ai-v094)

</div>

---

# 🇵🇱 Strażnik Tajemnic AI (v0.9.4)

Prowadź sesje _Zew Cthulhu 7e_ solo lub przy jednym laptopie (Hot Seat). Wklejasz własny klucz Gemini, wgrywasz **swój** podręcznik, a save'y lądują na Twoim dysku. Nie potrzebujesz konta w aplikacji ani zewnętrznej bazy danych. Wszystko działa lokalnie na Twoim komputerze.

## 👥 Dla kogo

Przychodzi taki etap życia, że zebranie ekipy na sesję RPG graniczy z cudem - kalendarze się nie spinają, ludzie się rozjeżdżają, a ochota na granie zostaje. **Strażnik Tajemnic** sprawia, że nie musisz na nikogo czekać - bierze rolę Mistrza Gry na siebie, żebyś mógł przeżywać mroczne przygody w świecie Lovecrafta na własnej kanapie.

- **Solo** - zagraj sam, kiedy tylko masz wolny wieczór. AI prowadzi narrację i pamięta NPC, wątki oraz konsekwencje przez całą kampanię.
- **We dwoje (Hot Seat)** - jeden laptop, wspólny wieczór z grozą: każde z Was ma własną postać i kolor, a AI zwraca się do graczy po imieniu.

## ⬇️ Pobierz

**[Pobierz paczkę macOS (ZIP)](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest)** - uruchom aplikację na macOS dwuklikiem. Paczka nie zawiera klucza API ani podręcznika: przy pierwszym starcie wklejasz **własny** klucz Gemini (`https://aistudio.google.com/apikey`) i wgrywasz **swój** PDF z zasadami.

> Wolisz uruchomić ze źródeł? Instrukcja niżej (**Szybki start**).

> [!IMPORTANT]
> **Projekt fanowski, nieoficjalny.** Nie jest powiązany z Chaosium Inc. ani Black Monk.
> Aplikacja to **sam silnik** - nie zawiera żadnego podręcznika. Grasz na **własnym, legalnie nabytym** egzemplarzu. _Call of Cthulhu_ / _Zew Cthulhu_ to znaki towarowe Chaosium Inc. Szczegóły: [`NOTICE`](./NOTICE).

## ✨ Co potrafi silnik

- **Gwarancja Zasad & Deterministyczna Mechanika (Bez Halucynacji AI):**
  - **Lokalny RAG Podręcznika:** Aplikacja automatycznie przeszukuje **Twój** podręcznik w lokalnym indeksie binarnym (`Float32`) na dysku i wstrzykuje dokładne reguły do zapytania. AI nie zmyśla zasad z głowy.
  - **Kodowane Rzuty k100 i Faza Rozwoju Postaci (CoC 7e RAW):** AI **nie rzuca kośćmi w czacie**. Rzuty na cechy, progi sukcesu (Zwykły, Trudny, Ekstremalny, Krytyk, Pech), testy Poczytalności (SAN), rzuty na Pomysł (Idea Roll) oraz Faza Rozwoju (automatyczne rzuty podbicia cech o 1k10) są liczone w 100% kodem TypeScript. AI otrzymuje twardy wynik i opisuje wyłącznie jego fabularne konsekwencje.
  - **Kontrola Stanu Świata:** Filtry ciągłości narracyjnej pilnują faktów ze śledztwa, stanu lokacji, ran badaczy oraz statusu NPC.
- **Styl Wizualny Dark Art Déco 1920s:** Głęboka czerń węgla, mosiądz, mahoń, postarzane złoto, stylizowana typografia maszynopisu epoki (`Special Elite`) oraz eleganckie nagłówki `Cinzel`.
- **Tablica Badacza & Akta Śledcze (Dossier):** Pulpit zebranych dowodów, notatek i poszlak z trwałą siatką koordynatów, mechanika Rzutu na Pomysł (Idea Roll RAW CoC 7e), detekcja powiązań oraz diegetyczny widok Akt Sprawy.
- **Deterministyczny Ekwipunek:** Zestawy startowe i przedmioty katalogowe przydzielane przez kod na podstawie profesji i zamożności (Credit Rating), bez wymyślania cen i ekwipunku przez model.
- **Dynamiczne Pacing Narracji:** Silnik reguluje tempo, długość i gęstość opisów w zależności od poziomu poczytalności, fazy śledztwa i zagrożenia (Matryca 4 Biegów Kadencji).
- **Tryb Szybka Przygoda:** Błyskawiczny start sesji z wyborem scenariusza i badacza w jednym kroku.
- **30 Gotowych Postaci & Scenariusze Strefy 11:** Pełne biografie i powiązania dla 30 badaczy, w tym 16 dedykowanych postaci dla 4 autorskich polskich scenariuszy.
- **AI Mistrz Gry:** Prowadzi narrację w stylu Lovecrafta z wykorzystaniem opisów sensorycznych (anomalie atmosferyczne, fizyczne odczucia chłodu i wilgoci).
- **Sesja Zero & Linie i Zasłony:** Wbudowany kreator granic bezpieczeństwa pozwalający wykluczyć niechciane motywy ze stołu.
- **Hot Seat:** Rozgrywka dla 1-2 graczy przy jednym laptopie, każdy z osobnym kolorem i postacią.
- **Lektor (TTS):** Głos Mistrza Gry czyta narrację w locie z natychmiastowym streamingiem audio (głosy Charon / Gacrux).
- **Ilustracje scen (Gemini Image):** Generowane w locie obrazy lokacji, portrety NPC i przedmiotów przez `gemini-3.1-flash-image` (z podglądem w powiększonym lightboxie) - na tym samym kluczu Google AI Studio.
- **Asystent RAG w Sidebarze:** Wyjaśnienia reguł z podręcznika w bocznym oknie podczas trwania przygody.

## 📸 Zrzuty ekranu

<table>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/01-menu-glowne.png" alt="Menu główne"><br><sub><b>Menu główne</b> - stylizowany wybór trybu Solo, przygody, Sesji Zero i postaci w Dark Art Déco.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/02-pierwsze-uruchomienie.png" alt="Pierwsze uruchomienie"><br><sub><b>Setup</b> - wklejanie klucza Gemini oraz podpinanie własnego podręcznika PDF.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/03-sesja-zero-linie-zaslony.png" alt="Sesja Zero"><br><sub><b>Sesja Zero</b> - kalibracja granic narracyjnych (Linie i Zasłony).</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/04-scena-i-narracja-lovecrafta.png" alt="Ekran gry z AI"><br><sub><b>Ekran gry</b> - ilustracja, narracja Mistrza Gry oraz prawy panel kontrolny.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/05-karta-postaci.png" alt="Karta badacza"><br><sub><b>Karta badacza</b> - charakterystyki CoC 7e, umiejętności, Faza Rozwoju i biografia.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/06-ekwipunek-i-finanse.png" alt="Ekwipunek i finanse"><br><sub><b>Ekwipunek</b> - przedmioty fabularne, ikony oraz finanse postaci.</sub></td>
  </tr>
</table>

## 🚀 Szybki start

> Najprościej: [pobierz gotową paczkę ZIP](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest) i uruchom dwuklikiem. Poniżej instrukcja dla deweloperów uruchamiających ze źródeł.

> Wymagania: **Node.js 18+** i darmowy **klucz Gemini** (`https://aistudio.google.com/apikey`).

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/InduPhantom-hash/straznik-tajemnic.git
cd straznik-tajemnic

# 2. Przejdź do katalogu silnika i zainstaluj zależności
cd _tester/_base/.silnik
npm install

# 3. Uruchom serwer deweloperski
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000):
1. **Wklej klucz Gemini** (jeden klucz do czatu, TTS i obrazów).
2. **Wgraj swój PDF** z zasadami - apka utworzy lokalny indeks wektorowy na dysku (`data/rag/`).
3. Wybierz przygodę, stwórz lub wybierz postać i ruszaj na sesję.

Pełna instrukcja: [`SETUP.md`](./SETUP.md). Podręcznik gracza: [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md). Wytyczne techniczne: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### macOS - launcher na biurku (opcjonalnie)

```bash
bash desktop/build-app.sh --rebuild
```
Tworzy `Strażnik Tajemnic AI.app` w `~/Applications` oraz alias na Biurku.

## ⚙️ Konfiguracja

Klucz Gemini wklejasz wprost w aplikacji przy pierwszym starcie lub w oknie Ustawień. Jeśli wolisz plik środowiskowy, skopiuj `.env.example` do `.env.local` w katalogu `_tester/_base/.silnik/`. Jedyna wymagana zmienna to `GEMINI_API_KEY`.

## 🏚️ Profile Jakości & Szacowane Koszty

Konfiguracja w panelu **Ustawienia → Profil Jakości** (sesja ≈ 3h gry, domyślnie **HIGH**):

| Profil | Model czatu | Lektor (TTS) | Ilustracje scen | Szacowany koszt sesji 3h |
|---|---|---|---|---|
| **LOW** | Gemini Flash-Lite | brak | wyłączone | ~$0.02 - $0.05 USD |
| **MID** | Gemini Flash | Gemini TTS (Charon) | Gemini Image | ~$0.15 - $0.20 USD |
| **HIGH** ⭐ *(Domyślny)* | **Gemini 3.8 Flash (High)** | **Gemini TTS (Charon)** | **Gemini Image** | **~$0.40 - $0.50 USD** |
| **ULTRA** | Gemini 3.1 Pro (High) | Multi-voice słuchowisko | Gemini Image HD | ~$1.00 - $1.50 USD |

*Jeden klucz Google AI Studio: Wszystkie komponenty (czat, lektor TTS, obrazy i embeddingi) działają w oparciu o to samo konto Google. Panel Ustawień na żywo zlicza zużyte tokeny i koszty sesji.*

## 🗺️ Rozwój projektu

- Finalizacja audytu stylizacji Dark Art Déco 1920s w pozostałych widokach aplikacji.
- Stabilizacja samodzielnej paczki macOS i lokalnych danych Mythos.
- Deterministyczny katalog wyposażenia oraz audyt portretów badaczy.
- Bezpieczny mechanizm sprawdzania aktualizacji na macOS.

Zasady architektury, inwarianty inżynieryjne i dev cheat-sheet znajdziesz w [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## 🔧 Technologie

Next.js 16 (App Router) · React 19 + TypeScript (strict) · Tailwind + shadcn/ui (Dark Art Déco 1920s) · Google Gemini API (BYOK) · lokalny RAG (Float32 binarny, cosine) · Jest + Playwright.

## 📚 Dokumentacja

| Dokument | Dla kogo |
| --- | --- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | **Programista** - topologia kodu, inwarianty i developer cheat sheet |
| [`SETUP.md`](./SETUP.md) | **Instalacja** - przewodnik uruchomienia aplikacji krok po kroku |
| [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) | **Gracz** - jak grać, rzuty k100, Faza Rozwoju i Dziennik |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | **Architektura** - silnik offline, lokalny RAG i granice sieci |
| [`docs/DESIGN-SYSTEM-ART-DECO.md`](./docs/DESIGN-SYSTEM-ART-DECO.md) | **UI/UX** - specyfikacja tokenów Dark Art Déco 1920s |
| [`docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md`](./docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md) | **Narracja** - proza Lovecrafta, kognitywistyka i 4 Biegi Kadencji |
| [`docs/PROJECT-WORKFLOW.md`](./docs/PROJECT-WORKFLOW.md) | **Workflow** - zasady pracy nad kodem i zadaniami |
| [`docs/TESTING.md`](./docs/TESTING.md) | **QA** - procedury testowe i weryfikacja automatyczna |
| [`NOTICE`](./NOTICE) | Status prawny, znaki towarowe i licencje |

## 📄 Licencja

Kod: **MIT** (patrz [`LICENSE`](./LICENSE)). Projekt fanowski i niekomercyjny. Silnik nie zawiera żadnych podręczników ani zastrzeżonych treści.

---

# 🇺🇸 Keeper of Arcane Lore AI (v0.9.4)

Run your _Call of Cthulhu 7e_ sessions solo or with a friend on a single laptop (Hot Seat). You provide your own Gemini API key, upload **your own** guidebook, and saves are stored on your local disk. The app does not require an account or external databases. Everything runs locally on your machine.

## 👥 Who is it for?

There comes a stage in life where gathering a full table for an RPG session is a miracle - schedules clash, people move away, but the hunger for adventure remains. **Keeper of Arcane Lore AI** ensures you don't have to wait - it takes the role of the Game Master, allowing you to experience dark adventures in Lovecraft's world right from your couch.

- **Solo** - play alone whenever you have a free evening. The AI leads the narrative, remembers NPCs, plots, and consequences throughout the campaign.
- **Coop (Hot Seat)** - one laptop, two players: each has their own character and interface color, and the AI addresses players by name.

## ⬇️ Download

**[Download the macOS package (ZIP)](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest)** - launch the app on macOS with a double-click. It does not include an API key or guidebook: during the first run, you paste your **own** Gemini key (`https://aistudio.google.com/apikey`) and upload **your** PDF guidebook.

> Prefer running from source code? Follow the **Quick Start** guide below.

> [!IMPORTANT]
> **Fan project, unofficial.** Not affiliated with Chaosium Inc. or Black Monk.
> The application is **only the engine** - it does not contain any books. You play using your **own, legally acquired** copy. _Call of Cthulhu_ is a trademark of Chaosium Inc. Details: [`NOTICE`](./NOTICE).

## ✨ Engine Features

- **Rules Guarantee & Deterministic Mechanics (No AI Hallucinations):**
  - **Local Rulebook RAG:** The application automatically searches **your** uploaded PDF stored in local binary `Float32` vectors on disk and injects exact rule context into the LLM prompt. The AI does not fabricate rules or stats.
  - **Hardcoded d100 Rolls & Character Development Phase (CoC 7e RAW):** The AI **never rolls dice in chat**. Skill checks, threshold calculations (Regular, Hard, Extreme, Critical, Fumble), Sanity (SAN) tests, Idea rolls, and post-session skill development are 100% computed in TypeScript code. The AI receives hard results and focuses solely on narrative outcomes.
  - **World State Control:** Narrative continuity filters prevent plot holes, forgotten clues, or broken investigator health states.
- **Dark Art Déco 1920s Visual Design:** Charcoal black, brass, mahogany, aged gold accents, and vintage typewriter typography (`Special Elite`, `Cinzel`) across the entire interface.
- **Investigator Board & Case Dossier (CoC 7e RAW):** Evidence desk and clue graph with coordinate persistence across saves, domain deduction engine (Idea Roll mechanics), false flags handling, diegetic document styling, and case dossier view.
- **Deterministic Inventory:** Profession-based starting kits and catalog items selected deterministically by code based on Credit Rating, eliminating hallucinated items and prices.
- **Context-Aware Dynamic Pacing:** Narrative engine dynamically adjusts description pacing based on sanity thresholds, investigation stage, and action tension across 4 Cadence Gears.
- **Quick Adventure Mode:** Instant session start with seamless scenario and investigator selection in one step.
- **30 Predefined Characters & Zone 11 Scenarios:** 30 comprehensive investigator backstories (including 16 tailored characters for 4 custom Polish scenarios) with unified Single Source of Truth under Biography.
- **AI Game Master:** Leads the narrative in Lovecraft's style with sensory descriptions (atmospheric shifts, physical chill, and dread).
- **Session Zero & Lines/Veils:** Safety tool to calibrate story boundaries at the table.
- **Hot Seat:** 1-2 players sharing one screen, each with a unique investigator and color theme.
- **Voice (TTS):** Instant streaming narrative readout with Charon and Gacrux voice actors.
- **Scene Illustrations (Gemini Image):** Real-time image generation via `gemini-3.1-flash-image` for locations, NPC portraits, and artifacts (with lightbox zoom) using the same Google AI Studio key.
- **In-Game Help & RAG Assistant:** Instant rule explanations right in the sidebar during play.

## 📸 Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/01-menu-glowne.png" alt="Main menu"><br><sub><b>Main menu</b> - styled selection of Solo mode, custom scenarios, Session Zero and characters in Dark Art Déco.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/02-pierwsze-uruchomienie.png" alt="First run setup"><br><sub><b>Setup</b> - Gemini API key setup and rulebook PDF upload.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/03-sesja-zero-linie-zaslony.png" alt="Session Zero"><br><sub><b>Session Zero</b> - safety boundaries calibration (Lines & Veils).</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/04-scena-i-narracja-lovecrafta.png" alt="Gameplay screen"><br><sub><b>Gameplay screen</b> - scene illustration, GM narrative and control sidebar.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/05-karta-postaci.png" alt="Investigator sheet"><br><sub><b>Investigator sheet</b> - CoC 7e stats, skills, Development Phase and biography.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/06-ekwipunek-i-finanse.png" alt="Equipment and finances"><br><sub><b>Equipment</b> - plot items, custom icons and character finances.</sub></td>
  </tr>
</table>

## 🚀 Quick Start

> Simplest way: [Download the ZIP release](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest) and double-click to run. Below are instructions for developers running from source.

> Requirements: **Node.js 18+** and a free **Gemini API key** (`https://aistudio.google.com/apikey`).

```bash
# 1. Clone repository
git clone https://github.com/InduPhantom-hash/straznik-tajemnic.git
cd straznik-tajemnic

# 2. Navigate to the engine directory and install dependencies
cd _tester/_base/.silnik
npm install

# 3. Start development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**:
1. **Paste your Gemini API key** (one key covers chat, TTS, and images).
2. **Upload your PDF rulebook** - the app extracts text and builds a local binary vector index (`data/rag/`).
3. Select an adventure, pick or create an investigator, and begin playing.

Full documentation: [`SETUP.md`](./SETUP.md), [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md), and [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### macOS - desktop launcher (optional)

```bash
bash desktop/build-app.sh --rebuild
```
Creates `Strażnik Tajemnic AI.app` in your `~/Applications` folder.

## ⚙️ Configuration

Paste your Gemini key directly in the app upon first launch or in the Settings modal. To use environment variables, copy `.env.example` to `.env.local` inside `_tester/_base/.silnik/`. The only required variable is `GEMINI_API_KEY`.

## 🏚️ Quality Profiles & Estimated Costs

Direct reflection of settings in **Settings → Quality Profile** (session ≈ 3h gameplay, default is **HIGH**):

| Profile | Chat Model | TTS Voice | Scene Illustrations | Est. 3h Session Cost |
|---|---|---|---|---|
| **LOW** | Gemini Flash-Lite | None | Disabled | ~$0.02 - $0.05 USD |
| **MID** | Gemini Flash | Gemini TTS (Charon) | Gemini Image | ~$0.15 - $0.20 USD |
| **HIGH** ⭐ *(Default)* | **Gemini 3.8 Flash (High)** | **Gemini TTS (Charon)** | **Gemini Image** | **~$0.40 - $0.50 USD** |
| **ULTRA** | Gemini 3.1 Pro (High) | Multi-voice radio drama | Gemini Image HD | ~$1.00 - $1.50 USD |

*Single Google AI Studio Key: All capabilities (chat, voice TTS, scene generation, and vector embeddings) operate under your single Google API key. The Settings panel tracks token consumption and estimated session costs live.*

## 🗺️ Roadmap

- Finalize Dark Art Déco 1920s design audit across remaining secondary dialogs.
- Stabilize standalone macOS application package and bundled Mythos datasets.
- Deterministic equipment catalog expansion and investigator portrait audits.
- Safe update verification mechanism for macOS.

System architecture, invariants, and developer guidelines are documented in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## 🔧 Technologies

Next.js 16 (App Router) · React 19 + TypeScript (strict) · Tailwind + shadcn/ui (Dark Art Déco 1920s) · Google Gemini API (BYOK) · Local vector DB (Float32 binary, cosine similarity) · Jest + Playwright.

## 📚 Documentation

| Document | Audience |
| --- | --- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | **Developer** - System architecture, invariants, and cheat sheet |
| [`SETUP.md`](./SETUP.md) | **Setup** - Step-by-step installation instructions |
| [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) | **Player** - Gameplay manual, checks, Development Phase, and Journal |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | **Architecture** - Offline engine, RAG pipeline, and network boundary |
| [`docs/DESIGN-SYSTEM-ART-DECO.md`](./docs/DESIGN-SYSTEM-ART-DECO.md) | **UI/UX** - 1920s Dark Art Déco design tokens |
| [`docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md`](./docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md) | **Narrative** - Lovecraftian storytelling, cognitive pacing, and 4 Cadence Gears |
| [`docs/PROJECT-WORKFLOW.md`](./docs/PROJECT-WORKFLOW.md) | **Workflow** - Repository conventions and workflow |
| [`docs/TESTING.md`](./docs/TESTING.md) | **QA** - Testing guidelines and automated checks |
| [`NOTICE`](./NOTICE) | Legal status, trademarks, and disclaimers |

## 📄 License

Code: **MIT** (see [`LICENSE`](./LICENSE)). Non-commercial fan project.

---

<div align="center"><sub>Created by Phantom · fan-made, non-profit project</sub></div>
