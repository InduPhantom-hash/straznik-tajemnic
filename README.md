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

Prowadź sesje _Zew Cthulhu 7e_ solo lub przy jednym laptopie (Hot Seat). Wklejasz własny klucz Gemini, wgrywasz **swój** podręcznik, a save'y lądują na dysku. Nie potrzebujesz konta w aplikacji. Wszystko działa lokalnie na Twoim komputerze.

<a href="https://youtu.be/k3NioUBRIes">
  <img src="docs/assets/07-onboarding-3024x1898.png" alt="Strażnik Tajemnic AI - wideo wprowadzające" width="640">
</a>

▶️ [Obejrzyj wideo wprowadzające na YouTube](https://youtu.be/k3NioUBRIes)

## 👥 Dla kogo

Przychodzi taki etap życia, że zebranie ekipy na sesję RPG graniczy z cudem - kalendarze się nie spinają, ludzie się rozjeżdżają, a ochota na granie zostaje. **Strażnik Tajemnic** sprawia, że nie musisz na nikogo czekać - bierze rolę Mistrza Gry na siebie, żebyś dalej przeżywał mroczne przygody w świecie Lovecrafta na własnej kanapie.

- **Solo** - zagraj sam, kiedy tylko masz chwilę. AI prowadzi narrację i pamięta NPC, wątki oraz konsekwencje przez całą kampanię, więc historia trzyma się kupy.
- **We dwoje (Hot Seat)** - jeden laptop, wspólny wieczór z grozą: każde z Was ma własną postać i kolor, a AI zwraca się do graczy po imieniu. Bez kompletowania całej drużyny.

## ⬇️ Pobierz / Szybki start

### Opcja 1: Dla Gracza (Paczka macOS)
**[Pobierz paczkę macOS (ZIP)](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest)** - uruchom aplikację na macOS dwuklikiem. Paczka nie zawiera klucza API ani podręcznika: przy pierwszym starcie wklejasz **własny** darmowy klucz Gemini (`https://aistudio.google.com/apikey`) i wgrywasz **swój** PDF z zasadami.

### Opcja 2: Dla Dewelopera / Współtwórcy (Uruchomienie ze źródeł)
> Wymagania: **Node.js 18+** i darmowy klucz Gemini.

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/InduPhantom-hash/straznik-tajemnic.git
cd straznik-tajemnic

# 2. Przejdź do właściwego katalogu silnika i zainstaluj zależności
cd _tester/_base/.silnik
npm install

# 3. Uruchom serwer deweloperski
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).  
Więcej informacji dla programistów: [`CONTRIBUTING.md`](./CONTRIBUTING.md) oraz [`SETUP.md`](./SETUP.md).

> [!IMPORTANT]
> **Projekt fanowski, nieoficjalny.** Nie jest powiązany z Chaosium Inc. ani Black Monk.
> Aplikacja to **sam silnik** - nie zawiera żadnego podręcznika. Grasz na **własnym, legalnie nabytym** egzemplarzu. _Call of Cthulhu_ / _Zew Cthulhu_ to znaki towarowe Chaosium Inc. Szczegóły: [`NOTICE`](./NOTICE).

## ✨ Co potrafi & Architektura Anty-Halucynacyjna

- **Gwarancja Zasad & Deterministyczna Mechanika (Bez Halucynacji AI):**
  - **Lokalny RAG Podręcznika:** Aplikacja automatycznie przeszukuje **Twojego** wgranego PDF-a w lokalnym indeksie wektorowym (`Float32`) i podaje dokładny kontekst reguł do zapytania LLM. AI nie wymyśla zasad ani statystyk z głowy.
  - **Kodowane Rzuty k100 i Faza Rozwoju Postaci (CoC 7e RAW):** AI **nie rzuca kośćmi w czacie**. Rzuty na umiejętności, progi trudności (Zwykły, Trudny, Ekstremalny, Krytyk, Fumble), rzuty na Poczytalność (SAN), testy na Pomysł oraz Faza Rozwoju (automatyczne testy podbić cech) są wyliczane w 100% kodem TypeScript. AI otrzymuje twardy wynik i opisuje wyłącznie jego fabularne konsekwencje.
  - **Kontrola Stanu Świata:** Filtry kontynuacji narracyjnej pilnują faktów z przygody, lokacji, zdrowia badaczy oraz statusu NPC.
- **Styl Wizualny Dark Art Déco 1920s:** Głęboka czerń węgla, mosiądz, mahoń, postarzane złoto i stylizowana typografia maszynopisu epoki w całym interfejsie.
- **Tablica Badacza & Dziennik Śledztwa (CoC 7e RAW):** Korkowa tablica dowodów ze sznurkami powiązań, ochrona koordynatów kart po zapisie i wczytaniu, rzuty na Pomysł (Idea Roll), obsługa fałszywych poszlak, diegetyczne notatki oraz widok Akt Sprawy.
- **Deterministyczny Ekwipunek i Ekonomia Badacza:** Gotowe zestawy startowe dobierane przez kod na podstawie profesji i zamożności (Credit Rating).
- **Dynamiczne Tempo Narracji (Dynamic Pacing):** Silnik automatycznie reguluje gęstość i dynamikę opisów w zależności od poziomu poczytalności, fazy śledztwa i zagrożenia (4 Biegi Kadencji).
- **Tryb Szybka Przygoda:** Błyskawiczny start sesji z wyborem scenariusza i badacza w jednym, spójnym kroku.
- **30 Gotowych Postaci & Scenariusze Strefy 11:** Pełne biografie i powiązania dla 30 badaczy, w tym 16 dedykowanych postaci dla 4 autorskich polskich scenariuszy.
- **AI Mistrz Gry** - prowadzi narrację w stylu Lovecrafta z wykorzystaniem inżynierii opisu sensorycznego.
- **Sesja Zero & Linie i Zasłony** - wbudowany kreator granic narracyjnych.
- **Hot Seat** - 1-2 graczy przy jednym laptopie, każdy ma swoją postać i dedykowany motyw.
- **Lektor (TTS)** - głos Mistrza Gry czyta narrację z natychmiastowym streamingiem audio.
- **Ilustracje scen** - generowane na żywo obrazy lokacji, portrety NPC i przedmiotów z powiększaniem w lightboxie.

## 📸 Zrzuty ekranu

<table>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/01-menu-glowne.png" alt="Menu główne"><br><sub><b>Menu główne</b> - stylizowany wybór trybu Solo, przygody, Sesji Zero i postaci.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/02-pierwsze-uruchomienie.png" alt="Pierwsze uruchomienie"><br><sub><b>Setup</b> - wklejanie klucza Gemini oraz podpinanie własnego podręcznika PDF.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/03-sesja-zero-linie-zaslony.png" alt="Sesja Zero"><br><sub><b>Sesja Zero</b> - kalibracja granic narracyjnych (Linie i Zasłony).</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/04-scena-i-narracja-lovecrafta.png" alt="Ekran gry z AI"><br><sub><b>Ekran gry</b> - ilustracja, narracja Mistrza Gry oraz prawy panel kontrolny.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/05-karta-postaci.png" alt="Karta badacza"><br><sub><b>Karta badacza</b> - charakterystyki CoC 7e, umiejętności i biografia.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/06-ekwipunek-i-finanse.png" alt="Ekwipunek i finanse"><br><sub><b>Ekwipunek</b> - przedmioty fabularne, ikony oraz finanse postaci.</sub></td>
  </tr>
</table>

## 🏚️ Presety jakości & Szacowane Koszty

Dokładne odzwierciedlenie konfiguracji z panelu **Ustawienia → Profil Jakości** (sesja ≈ 3h gry):

| Preset | Model czatu | Lektor | Obrazy | Szacowany koszt sesji 3h |
|---|---|---|---|---|
| **LOW** | Gemini 3.6 Flash | brak | wyłączone | ~$0.02 - $0.05 USD |
| **MID** | Gemini 3.6 Flash | Gemini TTS (Charon) | Gemini Flash Image | ~$0.15 - $0.20 USD |
| **HIGH** ⭐ *(Domyślny)* | **Gemini 3.8 Flash (High)** | **Gemini TTS (Charon)** | **Imagen 4 (Vertex)** | **~$0.40 - $0.50 USD** |
| **ULTRA** | Gemini 3.1 Pro High | Multi-voice słuchowisko | Obrazy HD (Vertex) | ~$1.00 - $1.50 USD |

*Koszty tokenów (Google AI Studio): Gemini 3.6 Flash (0.15 in / 0.60 out per 1M), Gemini 3.8 Flash (0.15 in / 0.60 out per 1M), Gemini 3.1 Pro (2.00 in / 12.00 out per 1M).*  
*Lektor TTS: `gemini-2.5-flash-preview-tts` (0.50 in / 1.50 out per 1M).*  
*Generowanie obrazów: Imagen 4 Fast (~$0.02 USD / obraz), Imagen 4 Ultra (~$0.04 USD / obraz).*

## 🔧 Technologie

Next.js 16 (App Router) · React 19 + TypeScript (strict) · Tailwind + shadcn/ui (Dark Art Déco 1920s) · Google Gemini API · lokalny RAG (Float32 binarny, cosine) · Jest + Playwright.

## 📚 Dokumentacja

| Dokument | Dla kogo |
| --- | --- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | **Programista / Współtwórca** - architektura kodu, inwarianty i developer cheat sheet |
| [`SETUP.md`](./SETUP.md) | **Instalacja** - krok po kroku od zera do pierwszej sesji |
| [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) | **Gracz** - jak prowadzić sesję, rzuty, Faza Rozwoju i Dziennik |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | **Architektura** - opis silnika offline, RAG-u i granic sieci |
| [`docs/DESIGN-SYSTEM-ART-DECO.md`](./docs/DESIGN-SYSTEM-ART-DECO.md) | **UI/UX** - specyfikacja tokenów Dark Art Déco 1920s |
| [`docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md`](./docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md) | **Narracja** - zasady prozy Lovecrafta, kognitywistyka i 4 Biegi Kadencji |
| [`docs/PROJECT-WORKFLOW.md`](./docs/PROJECT-WORKFLOW.md) | **Workflow** - GitHub Issues i Project 2 jako SSOT |
| [`docs/TESTING.md`](./docs/TESTING.md) | **QA** - procedury testowe i weryfikacja automatyczna |
| [`NOTICE`](./NOTICE) | Status prawny, znaki towarowe i licencje |

## 📝 Historia zmian (Changelog)

### [v0.9.4] - w przygotowaniu
- **Styl Dark Art Déco 1920s:** Kompleksowa unifikacja wizualna całej aplikacji w oparciu o tokeny semantyczne mosiądzu, złota, głębokiej czerni i typografii maszynopisu.
- **Faza Rozwoju Postaci CoC 7e RAW:** Zaimplementowany pełny mechanizm rozwoju umiejętności (zaznaczanie udanych testów, rzuty k100 > aktualnej wartości i podbicia k10) zintegrowany z zapisem gry.
- **Lokalny RAG & Optymalizacja Pamięci:** Zastąpienie przestarzałych mechanizmów binarnym indeksem Float32 na dysku, obniżającym zużycie pamięci RAM.
- **Deterministyczny Ekwipunek:** Automatyczny dobór ekwipunku na bazie profesji z eliminacją zmyślania cen i przedmiotów przez AI.
- **Developer Guide:** Dedykowana dokumentacja wdrożeniowa dla inżynierów w `CONTRIBUTING.md`.

### [v0.9.3] - 2026-08-15
- **Tablica Badacza & Dziennik Śledztwa (CoC 7e RAW):** Korkowa tablica dowodów ze sznurkami powiązań i dedukcją domenową (mechanika Rzutu na Pomysł / Idea Roll).
- **Ekwipunek i Ekonomia:** Nowy katalog ekwipunku z lokalnymi miniaturami oraz integracja z klasą zamożności (Credit Rating).
- **30 Gotowych Biografii i Postacie Strefy 11:** 30 pełnych życiorysów badaczy z autorskimi scenariuszami.

---

# 🇺🇸 Keeper of Arcane Lore AI (v0.9.4)

Run your _Call of Cthulhu 7e_ sessions solo or with a friend on a single laptop (Hot Seat). Provide your own Gemini API key, upload **your own** rulebook, and saves remain on your local drive. No cloud account required. Everything runs locally on your machine.

## 👥 Who is it for?

There comes a stage in life where gathering a full table for an RPG session is nearly impossible - calendars clash, people move away, but the hunger for adventure remains. **Keeper of Arcane Lore AI** takes the role of the Game Master, allowing you to experience dark Lovecraftian investigations right from your couch.

- **Solo** - play whenever you have time. The AI leads the narrative, tracking NPCs, plotlines, and consequences throughout the campaign.
- **Co-op (Hot Seat)** - one laptop, two players: each investigator has their own profile and color theme, and the AI addresses players by name.

## ⬇️ Download / Quick Start

### Option 1: For Players (macOS Package)
**[Download the macOS package (ZIP)](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest)** - launch on macOS with a double-click. Provide your **own** free Gemini API key (`https://aistudio.google.com/apikey`) and upload **your** rulebook PDF during setup.

### Option 2: For Developers / Contributors (Run from source)
> Requirements: **Node.js 18+** and a free Gemini API key.

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

Open [http://localhost:3000](http://localhost:3000).  
For developer guidelines: [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`SETUP.md`](./SETUP.md).

> [!IMPORTANT]
> **Unofficial fan project.** Not affiliated with Chaosium Inc. or Black Monk.
> The app is **only the engine** - it contains no copyrighted rulebooks. You play using your **own legally acquired** copy. _Call of Cthulhu_ is a trademark of Chaosium Inc. See [`NOTICE`](./NOTICE).

## ✨ Features & Anti-Hallucination Architecture

- **Deterministic Rules & Zero AI Hallucinations:**
  - **Local Rulebook RAG:** The app automatically queries **your** uploaded PDF stored in local binary `Float32` vectors. The AI never invents rules or statistics.
  - **Hardcoded d100 Rolls & Character Development Phase (CoC 7e RAW):** The AI **never rolls dice in chat**. Skill checks, difficulty levels (Regular, Hard, Extreme, Critical, Fumble), Sanity (SAN) tests, Idea rolls, and post-session skill development are 100% evaluated in TypeScript.
- **Dark Art Déco 1920s Visual Design:** Charcoal black, brass, mahogany, aged gold accents, and vintage typewriter typography.
- **Investigator Board & Case Dossier:** Interactive corkboard with pin connectors, coordinate persistence, and domain deduction.
- **Deterministic Inventory:** Profession-based starting kits with zero price or item hallucinations.
- **Dynamic Pacing:** The engine modulates narrative density according to sanity loss and scene tension across 4 Cadence Gears.

## 🏚️ Quality Presets & Estimated Costs

Direct reflection of settings in **Settings → Quality Profile** (session ≈ 3h gameplay):

| Preset | Chat Model | TTS Voice | Images | Est. 3h Session Cost |
|---|---|---|---|---|
| **LOW** | Gemini 3.6 Flash | None | Disabled | ~$0.02 - $0.05 USD |
| **MID** | Gemini 3.6 Flash | Gemini TTS (Charon) | Gemini Flash Image | ~$0.15 - $0.20 USD |
| **HIGH** ⭐ *(Default)* | **Gemini 3.8 Flash (High)** | **Gemini TTS (Charon)** | **Imagen 4 (Vertex)** | **~$0.40 - $0.50 USD** |
| **ULTRA** | Gemini 3.1 Pro High | Multi-voice radio drama | HD Images (Vertex) | ~$1.00 - $1.50 USD |

*Token costs (Google AI Studio): Gemini 3.6 Flash (0.15 in / 0.60 out per 1M), Gemini 3.8 Flash (0.15 in / 0.60 out per 1M), Gemini 3.1 Pro (2.00 in / 12.00 out per 1M).*  
*TTS Voice: `gemini-2.5-flash-preview-tts` (0.50 in / 1.50 out per 1M).*  
*Image generation: Imagen 4 Fast (~$0.02 USD / image), Imagen 4 Ultra (~$0.04 USD / image).*

## 📚 Documentation Links

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) – Developer guidelines, invariants, and cheat sheet.
- [`SETUP.md`](./SETUP.md) – Step-by-step installation instructions.
- [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) – Player's gameplay manual.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) – Offline architecture and network boundary.
- [`docs/DESIGN-SYSTEM-ART-DECO.md`](./docs/DESIGN-SYSTEM-ART-DECO.md) – 1920s Art Déco design tokens.

---

## 📄 License

Code is licensed under **MIT** (see [`LICENSE`](./LICENSE)). Non-commercial fan project.
