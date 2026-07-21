<div align="center">

<img src="docs/assets/06-banner-1500x500.png" alt="Strażnik Tajemnic AI / Keeper of Arcane Lore AI" width="820">

# 𓂀 Strażnik Tajemnic AI / Keeper of Arcane Lore AI (v0.9.1-beta)

**Nieoficjalny, fanowski Mistrz Gry AI do sesji RPG w klimacie lovecraftowskim.**  
*An unofficial, fan-made AI Game Master for RPG sessions in the Lovecraftian setting.*

---

[🇵🇱 Wersja Polska](#-straznik-tajemnic-ai-v091-beta) | [🇺🇸 English Version](#-keeper-of-arcane-lore-ai-v091-beta)

</div>

---

# 🇵🇱 Strażnik Tajemnic AI (v0.9.1-beta)

Prowadź sesje _Zew Cthulhu 7e_ solo lub przy jednym laptopie (Hot Seat). Cała gra toczy się **lokalnie u Ciebie** - wklejasz własny klucz Gemini, wgrywasz **swój** podręcznik, save'y lądują na dysku. Bez logowania, bez chmury, bez telemetrii.

<a href="https://youtu.be/k3NioUBRIes">
  <img src="docs/assets/07-onboarding-3024x1898.png" alt="Strażnik Tajemnic AI - wideo wprowadzające" width="640">
</a>

▶️ [Obejrzyj wideo wprowadzające na YouTube](https://youtu.be/k3NioUBRIes)

## 👥 Dla kogo

Przychodzi taki etap życia, że zebranie ekipy na sesję RPG graniczy z cudem - kalendarze się nie spinają, ludzie się rozjeżdżają, a ochota na granie zostaje. **Strażnik Tajemnic** sprawia, że nie musisz na nikogo czekać - bierze rolę Mistrza Gry na siebie, żebyś dalej przeżywał mroczne przygody w świecie Lovecrafta na własnej kanapie.

- **Solo** - zagraj sam, kiedy tylko masz chwilę. AI prowadzi narrację i pamięta NPC, wątki oraz konsekwencje przez całą kampanię, więc historia trzyma się kupy.
- **We dwoje (Hot Seat)** - jeden laptop, wspólny wieczór z grozą: każde z Was ma własną postać i kolor, a AI zwraca się do graczy po imieniu. Bez kompletowania całej drużyny.

## ⬇️ Download / Pobierz

**[Pobierz gotową paczkę (ZIP)](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest)** - cała aplikacja w środku, uruchamiasz dwuklikiem (Windows / Mac). Bez klucza API i bez podręcznika w paczce: przy pierwszym starcie wklejasz **własny** klucz Gemini i wgrywasz **swój** PDF (apka linkuje do źródeł).

> Wolisz uruchomić ze źródeł? Instrukcja niżej (**Szybki start**).

> [!IMPORTANT]
> **Projekt fanowski, nieoficjalny.** Nie jest powiązany z Chaosium Inc. ani Black Monk.
> Aplikacja to **sam silnik** - nie zawiera żadnego podręcznika. Grasz na **własnym, legalnie nabytym** egzemplarzu. _Call of Cthulhu_ / _Zew Cthulhu_ to znaki towarowe Chaosium Inc. Szczegóły: [`NOTICE`](./NOTICE).

## ✨ Co potrafi

- **AI Mistrz Gry** - prowadzi narrację w stylu Lovecrafta, reaguje na decyzje graczy.
- **Kreator postaci** - badacz CoC 7e (charakterystyki, umiejętności, zawód, portret).
- **Mechaniki CoC 7e** - rzuty k100, testy umiejętności, Push Roll, poczytalność (SAN), Szczęście, Faza Rozwoju - liczone przez aplikację (deterministycznie), AI opisuje skutek.
- **Hot Seat** - 1-2 graczy przy jednym laptopie, każdy ma swoją postać i kolor.
- **Lektor (TTS)** - głos Mistrza Gry czyta narrację.
- **Ilustracje scen** - obrazy generowane w trakcie sesji.
- **Lokalny RAG** - apka zna zasady z **Twojego** wgranego podręcznika (anty-halucynacja).
- **Zegar kampanii, dziennik, zapis/wczytanie** na dysk.

## 📸 Zrzuty ekranu

<table>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/01-menu-glowne.png" alt="Menu główne"><br><sub><b>Menu główne</b> - wybór trybu, przygody i postaci.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/02-test-umiejetnosci.png" alt="Test umiejętności"><br><sub><b>Test umiejętności</b> - Tacka liczy rzut k100 wg progów CoC 7e.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/03-scena-arkham.png" alt="Scena wygenerowana przez AI"><br><sub><b>Scena z AI</b> - ilustracja i narracja Mistrza Gry w stylu Lovecrafta.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/04-karta-postaci.png" alt="Karta badacza"><br><sub><b>Karta badacza</b> - charakterystyki, umiejętności i stan postaci.</sub></td>
  </tr>
</table>

## 🚀 Szybki start

> Najprościej: [pobierz gotową paczkę ZIP](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest) i uruchom dwuklikiem. Poniżej instrukcja dla uruchomienia ze źródeł (deweloperskiego).

> Wymagania: **Node.js 18+** i darmowy **klucz Gemini** (`https://aistudio.google.com/apikey`).

```bash
npm install
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Setup:
1. **Wklej klucz Gemini** (test jednym kliknięciem).
2. **Skąd wziąć podręcznik** - linki do darmowych starterów i wydań.
3. **Wgraj swój PDF** - apka zindeksuje zasady lokalnie i jesteś gotowy do gry.

Pełna instrukcja: [`SETUP.md`](./SETUP.md). Jak grać: [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md).

### macOS - launcher na biurku (opcjonalnie)

```bash
bash desktop/build-app.sh --rebuild
```
Tworzy `Strażnik Tajemnic AI.app` w `~/Applications` + alias na biurku.

## ⚙️ Konfiguracja

Skopiuj `.env.example` do `.env.local`. Jedyny **wymagany** klucz to `GEMINI_API_KEY`. Reszta jest opcjonalna. Szczegóły w [`.env.example`](./.env.example).

## 🏚️ Presety jakości

Sesja ≈ 3h gry. Preset ustawiasz w Ustawieniach; domyślnie **HIGH**.

| Preset      | Model czatu      | Lektor         | Obrazy          |
| ----------- | ---------------- | -------------- | --------------- |
| **LOW**     | Gemini 3.6 Flash | brak           | Gemini          |
| **MID**     | Gemini 3.6 Flash | Gemini TTS     | Gemini          |
| **HIGH** ⭐ | Gemini 3.6 Flash / 2.5 | Gemini TTS | Gemini / Vertex |
| **ULTRA**   | Gemini Pro       | Gemini Pro TTS | Gemini / Vertex |

## 🔧 Technologie

Next.js 14 (App Router) · React 18 + TypeScript (strict) · Tailwind + shadcn/ui · Google Gemini API · lokalny RAG (Float32 binarny, cosine) · Jest + Playwright.

## 📚 Dokumentacja

| Dokument | Dla kogo |
| --- | --- |
| [`SETUP.md`](./SETUP.md) | Instalacja i pierwsze uruchomienie krok po kroku |
| [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) | Gracz - jak prowadzić sesję |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Deweloper - jak to działa pod spodem |
| [`docs/MAPA-POWIAZAN.md`](./docs/MAPA-POWIAZAN.md) | Deweloper - mapa powiązań instrukcji z kodem |
| [`docs/TESTING.md`](./docs/TESTING.md) | Deweloper - testy |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Jak współtworzyć |
| [`NOTICE`](./NOTICE) | Status prawny, znaki towarowe, treść |

## 📝 Change Log (Historia zmian)

### [v0.9.1-beta] - 2026-07-20
- **Ulepszona atmosfera Lovecrafta**: Wdrożenie Konstytucji Narracji, głębszych opisów sensorycznych (metaliczny posmak na języku przed anomalią) oraz geometrii nieeuklidesowej w scenach z Mitów.
- **Biografie badaczy**: Uzupełnienie rostera o 30 pełnych, 6-8 zdaniowych opisów predefiniowanych postaci.
- **Koniec Sesji**: Obsługa systemowej komendy `[KONIEC_SESJI]` w czacie z płynnym wygaszaniem wątków do cliffhangera przed autozapisem.
- **Uporządkowanie kodu**: Dodanie mapy powiązań dokumentacji i instrukcji systemowych z plikami źródłowymi TypeScript (`docs/MAPA-POWIAZAN.md`).
- **Szybki toggle obrazów**: Łatwiejsze zarządzanie kosztami API dzięki wyłącznikowi generowania ilustracji bezpośrednio w sidebarze.
- **Poprawki mobilne i UX**: Lepsze skalowanie modali postaci na małych ekranach, dolny pasek nawigacyjny w lightboxie i naprawa timeoutów sieciowych panelu diagnostycznego.

## 📄 Licencja

Kod: **MIT** (patrz [`LICENSE`](./LICENSE)). Licencja obejmuje wyłącznie silnik - nie nadaje żadnych praw do treści gier ani podręczników. Twórczość H.P. Lovecrafta jest w domenie publicznej.

---

# 🇺🇸 Keeper of Arcane Lore AI (v0.9.1-beta)

Run your _Call of Cthulhu 7e_ sessions solo or with a friend on a single laptop (Hot Seat). The entire game runs **locally on your machine** - you insert your own Gemini API key, upload **your own** guidebook, and saves are stored on your disk. No registration, no cloud databases, no telemetry.

## 👥 Who is it for?

There comes a stage in life where gathering a full table for an RPG session is a miracle - schedules clash, people move away, but the hunger for adventure remains. **Keeper of Arcane Lore AI** ensures you don't have to wait - it takes the role of the Game Master, allowing you to experience dark adventures in Lovecraft's world right from your couch.

- **Solo** - play alone whenever you have a moment. The AI leads the narrative, remembers NPCs, plots, and consequences throughout the campaign, keeping the story coherent.
- **Coop (Hot Seat)** - one laptop, two players: each has their own character, customized color, and the AI addresses players by name. No need to assemble a large group.

## ⬇️ Download

**[Download the ready-to-run package (ZIP)](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest)** - the entire app is inside, launch with a double-click (Windows / Mac). It does not include an API key or guidebook: during the first run, you paste your **own** Gemini key and upload **your** PDF guidebook (the app links to sources).

> Prefer running from source code? Follow the **Quick Start** guide below.

> [!IMPORTANT]
> **Fan project, unofficial.** Not affiliated with Chaosium Inc. or Black Monk.
> The application is **only the engine** - it does not contain any books. You play using your **own, legally acquired** copy. _Call of Cthulhu_ is a trademark of Chaosium Inc. Details: [`NOTICE`](./NOTICE).

## ✨ Features

- **AI Game Master** - leads the narrative in Lovecraft's style, reacting dynamically to players' choices.
- **Character Creator** - CoC 7e investigator creator (characteristics, occupation, skill points allocation, background, portrait).
- **CoC 7e Mechanics** - d100 rolls, skill tests, Push Rolls, Sanity (SAN), Luck, Development Phase - calculated deterministically by the app, AI describes the outcome.
- **Hot Seat** - 1-2 players sharing one screen, each with a unique investigator and color theme.
- **Voice (TTS)** - the AI Game Master reads the narrative out loud.
- **Scene Illustrations** - images generated in real-time as the adventure progresses.
- **Local RAG** - the app knows the rules directly from **your** uploaded PDF guidebook (eliminating hallucinations).
- **Campaign Clock & Journal** - in-game time tracking and automated logs/clues saving.

## 🚀 Quick Start

> Simplest way: [Download the ZIP release](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest) and double-click to run. Below are instructions for developers running from source.

> Requirements: **Node.js 18+** and a free **Gemini API key** (`https://aistudio.google.com/apikey`).

```bash
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**. Setup:
1. **Gemini API key** - paste the key and test connection.
2. **Guidebook source** - links to free starter rules and full editions.
3. **Upload PDF** - select your PDF file. The app extracts text and builds a local vector index (`data/rag/`).

Once configured, the **Play** button becomes active.

### macOS - desktop launcher (optional)

```bash
bash desktop/build-app.sh --rebuild
```
Creates `Strażnik Tajemnic AI.app` in your `~/Applications` folder.

## ⚙️ Configuration

Copy `.env.example` to `.env.local`. The only **required** variable is `GEMINI_API_KEY`. Other settings are optional. All settings are commented in [`.env.example`](./.env.example).

## 🏚️ Quality Presets

A single session lasts around 3 hours of gameplay. The default preset is **HIGH**.

| Preset | Chat Model | TTS Voice | Images |
| --- | --- | --- | --- |
| **LOW** | Gemini Flash | None | Gemini |
| **MID** | Gemini Flash | Google TTS | Gemini |
| **HIGH** ⭐ | Gemini 2.5 Flash | Gemini TTS | Gemini / Vertex |
| **ULTRA** | Gemini Pro | Gemini Pro TTS | Gemini / Vertex |

## 🔧 Technologies

Next.js 14 (App Router) · React 18 + TypeScript (strict) · Tailwind + shadcn/ui · Google Gemini API · Local vector DB (Float32 binary, cosine similarity) · Jest + Playwright.

## 📚 Documentation

- [`SETUP.md`](./SETUP.md) – Step-by-step installation.
- [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) – Player's guide.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) – System architecture.
- [`docs/MAPA-POWIAZAN.md`](./docs/MAPA-POWIAZAN.md) – Dependency map.
- [`docs/TESTING.md`](./docs/TESTING.md) – Testing procedures.
- [`NOTICE`](./NOTICE) – Legal status and trademarks.

## 📝 Change Log

### [v0.9.1-beta] - 2026-07-20
- **Lovecraftian Atmosphere Enhancements**: Integrated Narrative Constitution, sensory cues (e.g., metallic taste before anomalies), and non-Euclidean geometry in Mythos scenes.
- **Investigator Biographies**: Added 30 complete, 6-8 sentence descriptions for predefined characters.
- **Session End Protocol**: Added support for `[KONIEC_SESJI]` system command, fading subplots gracefully to a cliffhanger before auto-save.
- **Code Dependency Map**: Created [`docs/MAPA-POWIAZAN.md`](./docs/MAPA-POWIAZAN.md) mapping technical docs to TypeScript source files.
- **Fast Image Toggle**: Easily manage API costs with the illustration switch in the settings panel.
- **Mobile and UX fixes**: Responsive modals for smaller screens, bottom toolbar layout in Lightbox, and diagnostic status panel connection timeouts.

## 📄 License

Code: **MIT** (see [`LICENSE`](./LICENSE)).

---

<div align="center"><sub>Created by Phantom · fan-made, non-profit project</sub></div>
