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

## ⬇️ Download / Pobierz

**[Pobierz paczkę macOS (ZIP)](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest)** - uruchom aplikację na macOS dwuklikiem. Paczka nie zawiera klucza API ani podręcznika: przy pierwszym starcie wklejasz **własny** darmowy klucz Gemini (`https://aistudio.google.com/apikey`) i wgrywasz **swój** PDF z zasadami.

> Wolisz uruchomić ze źródeł? Instrukcja niżej (**Szybki start**).

> [!IMPORTANT]
> **Projekt fanowski, nieoficjalny.** Nie jest powiązany z Chaosium Inc. ani Black Monk.
> Aplikacja to **sam silnik** - nie zawiera żadnego podręcznika. Grasz na **własnym, legalnie nabytym** egzemplarzu. _Call of Cthulhu_ / _Zew Cthulhu_ to znaki towarowe Chaosium Inc. Szczegóły: [`NOTICE`](./NOTICE).

## ✨ Co potrafi & Architektura Anty-Halucynacyjna

- **Gwarancja Zasad & Deterministyczna Mechanika (Bez Halucynacji AI):**
  - **Lokalny RAG Podręcznika:** Aplikacja automatycznie przeszukuje **Twojego** wgranego PDF-a w lokalnym indeksie wektorowym (`Float32`) i podaje dokładny kontekst reguł do zapytania LLM. AI nie wymyśla zasad ani statystyk z głowy.
  - **Kodowane Rzuty k100 i Faza Rozwoju Postaci (CoC 7e RAW):** AI **nie rzuca kośćmi w czacie**. Rzuty na umiejętności, kalkulacje progów (Zwykły, Trudny, Ekstremalny, Krytyczny, Pech), testy Poczytalności (SAN) i Poczytalności Chwilowej, rzuty na Pomysł (Idea Roll) oraz Faza Rozwoju (automatyczne rzuty podbicia cech o 1k10) są wyliczane w 100% kodem TypeScript. AI otrzymuje twardy wynik i opisuje wyłącznie jego fabularne konsekwencje.
  - **Kontrola Stanu Świata:** Filtry kontynuacji narracyjnej pilnują faktów z przygody, lokacji, zdrowia badaczy oraz statusu NPC.
- **Styl Wizualny Dark Art Déco 1920s:** Głęboka czerń węgla, mosiądz, mahoń, postarzane złoto, stylizowana typografia maszynopisu epoki (`Special Elite`) oraz eleganckie nagłówki `Cinzel` w całym interfejsie.
- **Tablica Badacza & Dziennik Śledztwa (CoC 7e RAW):** Korkowa tablica dowodów ze sznurkami powiązań, ochrona koordynatów kart po zapisie i wczytaniu, rzuty na Pomysł (Idea Roll), obsługa fałszywych poszlak, diegetyczne notatki oraz widok Akt Sprawy.
- **Ekwipunek i Ekonomia Badacza:** Deterministyczne zestawy startowe oraz przedmioty katalogowe wybierane przez kod na podstawie profesji i zamożności (Credit Rating), nie przez AI. Brak assetu ma bezpieczny fallback.
- **Dynamiczne Tempo Narracji (Dynamic Pacing):** Silnik automatycznie reguluje gęstość i dynamikę opisów w zależności od poziomu poczytalności, fazy śledztwa i zagrożenia (Matryca 4 Biegów Kadencji).
- **Tryb Szybka Przygoda:** Błyskawiczny start sesji z wyborem scenariusza i badacza w jednym, spójnym kroku.
- **30 Gotowych Postaci & Scenariusze Strefy 11:** Pełne biografie i powiązania dla 30 badaczy, w tym 16 dedykowanych postaci dla 4 autorskich polskich scenariuszy.
- **AI Mistrz Gry** - prowadzi narrację w stylu Lovecrafta z wykorzystaniem inżynierii opisu sensorycznego (geometria nieeuklidesowa, anomalie klimatyczne, odczucia fizyczne).
- **Sesja Zero & Linie i Zasłony** - wbudowany kreator granic narracyjnych pozwalający wykluczyć niechciane motywy ze stołu.
- **Hot Seat** - 1-2 graczy przy jednym laptopie, każdy ma swoją postać i dedykowany kolor.
- **Lektor (TTS)** - głos Mistrza Gry czyta narrację z natychmiastowym streamingiem audio (głosy Charon / Gacrux).
- **Ilustracje scen** - generowane na żywo obrazy lokacji, portrety NPC i przedmiotów przez Imagen 4 / Gemini Flash Image z powiększaniem w lightboxie.
- **Pomoc w Sidebarze & Asystent RAG** - natychmiastowe wyjaśnienie zasad gry w oknie bocznym podczas trwania przygody.

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

> Najprościej: [pobierz gotową paczkę ZIP](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest) i uruchom dwuklikiem. Poniżej instrukcja dla uruchomienia ze źródeł (deweloperskiego).

> Wymagania: **Node.js 18+** i darmowy **klucz Gemini** (`https://aistudio.google.com/apikey`).

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/InduPhantom-hash/straznik-tajemnic.git
cd straznik-tajemnic

# 2. Przejdź do katalogu silnika aplikacji i zainstaluj zależności
cd _tester/_base/.silnik
npm install

# 3. Uruchom serwer deweloperski
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Setup:
1. **Wklej klucz Gemini** (test jednym kliknięciem).
2. **Skąd wziąć podręcznik** - linki do darmowych starterów i wydań.
3. **Wgraj swój PDF** - apka zindeksuje zasady lokalnie na dysku (`data/rag/`) i jesteś gotowy do gry.

Pełna instrukcja: [`SETUP.md`](./SETUP.md). Jak grać: [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md). Wytyczne dla inżynierów: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### macOS - launcher na biurku (opcjonalnie)

```bash
bash desktop/build-app.sh --rebuild
```
Tworzy `Strażnik Tajemnic AI.app` w `~/Applications` + alias na Biurku.

## ⚙️ Konfiguracja

Dla podstawowej gry klucz Gemini wklejasz wprost w interfejsie. Jeśli wolisz zmienne środowiskowe, skopiuj `.env.example` do `.env.local` w katalogu silnika `_tester/_base/.silnik/`. Jedyny wymagany klucz to `GEMINI_API_KEY`.

## 🏚️ Presety jakości & Szacowane Koszty

Konfiguracja z panelu **Ustawienia → Profil Jakości** (sesja ≈ 3h gry, domyślnie **HIGH**):

| Preset | Model czatu | Lektor | Obrazy | Szacowany koszt sesji 3h |
|---|---|---|---|---|
| **LOW** | Gemini 3.6 Flash | brak | wyłączone | ~$0.02 - $0.05 USD |
| **MID** | Gemini 3.6 Flash | Gemini TTS (Charon) | Gemini Flash Image | ~$0.15 - $0.20 USD |
| **HIGH** ⭐ *(Domyślny)* | **Gemini 3.8 Flash (High)** | **Gemini TTS (Charon)** | **Imagen 4 (Vertex)** | **~$0.40 - $0.50 USD** |
| **ULTRA** | Gemini 3.1 Pro High | Multi-voice słuchowisko | Obrazy HD (Vertex) | ~$1.00 - $1.50 USD |

*Koszty tokenów (Google AI Studio): Gemini 3.6 Flash (0.15 in / 0.60 out per 1M), Gemini 3.8 Flash (0.15 in / 0.60 out per 1M), Gemini 3.1 Pro (2.00 in / 12.00 out per 1M).*  
*Lektor TTS: `gemini-2.5-flash-preview-tts` (0.50 in / 1.50 out per 1M).*  
*Generowanie obrazów: Imagen 4 Fast (~$0.02 USD / obraz), Imagen 4 Ultra (~$0.04 USD / obraz).*

## 🗺️ Co dalej

- Zakończenie audytu i pełnej standaryzacji Dark Art Déco 1920s w pozostałych widokach (Epic #165).
- Stabilizacja samodzielnej paczki macOS i spakowanie lokalnych danych Mythos (Issue #3).
- Manifesty epok i preflight świata (Issue #4).
- Deterministyczny katalog wyposażenia oraz audyt portretów badaczy (Issue #6).
- Bezpieczny mechanizm sprawdzania aktualizacji na macOS (Issue #75).

Stan prac, priorytety i zależności są prowadzone publicznie w [Issues tego repozytorium](https://github.com/InduPhantom-hash/straznik-tajemnic/issues). Prywatna tablica nadzoru automatycznie układa te same karty do pracy operacyjnej. Szczegółowe zasady opisuje [workflow projektu](./docs/PROJECT-WORKFLOW.md).

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
- **Styl Dark Art Déco 1920s (Epic #165):** Kompleksowa unifikacja wizualna całej aplikacji w oparciu o tokeny semantyczne mosiądzu, złota, głębokiej czerni i typografii maszynopisu (wyczyszczone ponad 200 naruszeń surowego flat designu).
- **Faza Rozwoju Postaci CoC 7e RAW:** Zaimplementowany pełny mechanizm rozwoju umiejętności (zaznaczanie udanych testów, rzuty k100 > aktualnej wartości i podbicia k10) zintegrowany z zapisem gry.
- **Lokalny RAG & Optymalizacja Pamięci:** Zastąpienie przestarzałych mechanizmów binarnym indeksem Float32 na dysku, obniżającym zużycie pamięci RAM.
- **Deterministyczny Ekwipunek:** Automatyczny dobór ekwipunku na bazie profesji z eliminacją zmyślania cen i przedmiotów przez AI.
- **Developer Guide:** Dedykowana dokumentacja wdrożeniowa dla inżynierów w `CONTRIBUTING.md`.

### [v0.9.3] - 2026-08-15
- **Tablica Badacza & Dziennik Śledztwa (CoC 7e RAW):** Interaktywna korkowa tablica dowodów ze sznurkami powiązań, ochrona współrzędnych kart po save/load, dedukcja domenowa (mechanika Rzutu na Pomysł / Idea Roll), obsługa fałszywych poszlak, diegetyczny styl notatek i biletów oraz widok Akt Sprawy.
- **Ekwipunek i Ekonomia Majętności:** Nowy katalog ekwipunku z lokalnymi miniaturami SVG, automatyczne podnoszenie przedmiotów fabularnych z narracji oraz integracja z klasą majątkową (Credit Rating).
- **30 Gotowych Biografii i Postacie Strefy 11:** 30 pełnych życiorysów badaczy (w tym 16 dedykowanych postaci dla 4 polskich scenariuszy Strefy 11) ze zunifikowanym Single Source of Truth pod polem Życiorys.
- **Tryb Szybka Przygoda & Nowy Ekran Startowy:** Uproszczony modal wyboru scenariusza i badacza w jednym kroku, usunięcie ograniczeń kontenera czatu na ekranie powitalnym.
- **Dynamiczne Tempo Narracji (Pacing):** Silnik automatycznie reguluje długość i gęstość opisów w zależności od poziomu poczytalności, dynamiki akcji i fazy śledztwa.
- **Usprawnienia Wizualne i Kadrowanie Obrazów:** Zmiana formatu kart na 4:3 (`h-32`), pozycjonowanie `object-top` zapobiegające ucinaniu głów/twarzy w portretach postaci i NPC, bezpieczny fallback `SafeImage` oraz powiększanie w lightboxie dowodów.
- **Stabilizacja Silnika i Architektury:** Usunięcie wycieków pamięci dziennika, automatyczna rekompilacja w `cold-start.sh` oraz eliminacja asynchronicznych zapętleń onboardingowych.

### [v0.9.2-beta] - 2026-07-27
- **Inżynieria Narracji i Anty-Halucynacja:** Wdrożenie Lovecraftowskich filtrów stanu świata, 3-stopniowych poszlak, ziaren retrospekcji oraz ścisłego pilnowania zasad dzięki lokalnemu RAG i kodowanym rzutom k100.
- **Odświeżony Interfejs Startowy:** Nowy ekran Menu Głównego, usprawnienia nawigacji oraz wbudowany wyznacznik granic narracyjnych Sesji Zero (Linie i Zasłony).
- **Autorskie Scenariusze Strefy 11:** 4 wbudowane autorskie scenariusze i 16 predefiniowanych postaci z uzupełnionymi biografiami i więziami.
- **Asystent RAG w Sidebarze:** Nowy modal pomocy, encyklopedia zasad oraz asystent odpowiadający na pytania o reguły gry w trakcie sesji.
- **Ulepszony Lektor (TTS) & Audio:** Instant streaming narracji i głosy NPC.
- **Dynamiczna Pogoda:** Integracja historycznych warunków pogodowych z zasadą "Klimat > Fakty".

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

# 🇺🇸 Keeper of Arcane Lore AI (v0.9.4)

Run your _Call of Cthulhu 7e_ sessions solo or with a friend on a single laptop (Hot Seat). You provide your own Gemini API key, upload **your own** guidebook, and saves are stored on your local disk. The app does not require an account. Everything runs locally on your machine.

## 👥 Who is it for?

There comes a stage in life where gathering a full table for an RPG session is a miracle - schedules clash, people move away, but the hunger for adventure remains. **Keeper of Arcane Lore AI** ensures you don't have to wait - it takes the role of the Game Master, allowing you to experience dark adventures in Lovecraft's world right from your couch.

- **Solo** - play alone whenever you have a moment. The AI leads the narrative, remembers NPCs, plots, and consequences throughout the campaign, keeping the story coherent.
- **Coop (Hot Seat)** - one laptop, two players: each has their own character, customized color, and the AI addresses players by name. No need to assemble a large group.

## ⬇️ Download

**[Download the macOS package (ZIP)](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest)** - launch the app on macOS with a double-click. It does not include an API key or guidebook: during the first run, you paste your **own** free Gemini key (`https://aistudio.google.com/apikey`) and upload **your** PDF guidebook.

> Prefer running from source code? Follow the **Quick Start** guide below.

> [!IMPORTANT]
> **Fan project, unofficial.** Not affiliated with Chaosium Inc. or Black Monk.
> The application is **only the engine** - it does not contain any books. You play using your **own, legally acquired** copy. _Call of Cthulhu_ is a trademark of Chaosium Inc. Details: [`NOTICE`](./NOTICE).

## ✨ Features & Anti-Hallucination Architecture

- **Rules Guarantee & Deterministic Mechanics (No AI Hallucinations):**
  - **Local Rulebook RAG:** The application automatically searches **your** uploaded PDF stored in local binary `Float32` vectors and injects exact rule context into the LLM prompt. The AI does not fabricate rules or stats.
  - **Hardcoded d100 Rolls & Character Development Phase (CoC 7e RAW):** The AI **never rolls dice in chat**. Skill checks, threshold calculations (Regular, Hard, Extreme, Critical, Fumble), Sanity (SAN) tests, Idea rolls, and post-session skill development are 100% computed in application code. The AI receives hard results and focuses solely on narrative outcomes.
  - **World State Control:** Narrative continuity filters prevent plot holes, lost facts, or forgotten investigator health states.
- **Dark Art Déco 1920s Visual Design:** Charcoal black, brass, mahogany, aged gold accents, and vintage typewriter typography (`Special Elite`, `Cinzel`) across the entire interface.
- **Investigator Board & Session Journal (CoC 7e RAW):** Interactive evidence corkboard with pinned clues and thread connectors, coordinate persistence across saves, domain deduction engine (Idea Roll mechanics), false flags handling, diegetic document styling, and case dossier view.
- **Equipment & Credit Rating Economy:** Full inventory catalog with deterministic starting kits based on profession and Credit Rating, not AI invention.
- **Context-Aware Dynamic Pacing:** Narrative engine dynamically adjusts description pacing based on sanity thresholds, investigation stage, and action tension across 4 Cadence Gears.
- **Quick Adventure Mode:** Instant session start with seamless scenario and investigator selection in one step.
- **30 Predefined Characters & Zone 11 Scenarios:** 30 comprehensive investigator backstories (including 16 tailored characters for 4 custom Polish scenarios) with unified Single Source of Truth under Biography.
- **AI Game Master** - leads the narrative in Lovecraft's style with sensory descriptions (non-Euclidean geometry, atmospheric shifts).
- **Session Zero & Lines/Veils** - safety tool to calibrate story boundaries at the table.
- **Hot Seat** - 1-2 players sharing one screen, each with a unique investigator and color theme.
- **Voice (TTS)** - instant streaming narrative readout with Charon/Gacrux voice actors.
- **Scene Illustrations** - real-time Imagen 4 / Gemini Flash Image generation, key NPC portraits, locations, and inspection lightbox zoom.
- **In-Game Help & RAG Assistant** - instant rule explanations right in the sidebar during play.

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

Open **[http://localhost:3000](http://localhost:3000)**. Setup:
1. **Gemini API key** - paste the key and test connection.
2. **Guidebook source** - links to free starter rules and full editions.
3. **Upload PDF** - select your PDF file. The app extracts text and builds a local vector index (`data/rag/`).

Once configured, the **Play** button becomes active. Full documentation: [`SETUP.md`](./SETUP.md), [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md), and [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### macOS - desktop launcher (optional)

```bash
bash desktop/build-app.sh --rebuild
```
Creates `Strażnik Tajemnic AI.app` in your `~/Applications` folder.

## ⚙️ Configuration

Copy `.env.example` to `.env.local` inside `_tester/_base/.silnik/`. The only **required** variable is `GEMINI_API_KEY`. Other settings are optional.

## 🏚️ Quality Presets & Estimated Costs

Direct reflection of settings in **Settings → Quality Profile** (session ≈ 3h gameplay, default is **HIGH**):

| Preset | Chat Model | TTS Voice | Images | Est. 3h Session Cost |
|---|---|---|---|---|
| **LOW** | Gemini 3.6 Flash | None | Disabled | ~$0.02 - $0.05 USD |
| **MID** | Gemini 3.6 Flash | Gemini TTS (Charon) | Gemini Flash Image | ~$0.15 - $0.20 USD |
| **HIGH** ⭐ *(Default)* | **Gemini 3.8 Flash (High)** | **Gemini TTS (Charon)** | **Imagen 4 (Vertex)** | **~$0.40 - $0.50 USD** |
| **ULTRA** | Gemini 3.1 Pro High | Multi-voice radio drama | HD Images (Vertex) | ~$1.00 - $1.50 USD |

*Token costs (Google AI Studio): Gemini 3.6 Flash (0.15 in / 0.60 out per 1M), Gemini 3.8 Flash (0.15 in / 0.60 out per 1M), Gemini 3.1 Pro (2.00 in / 12.00 out per 1M).*  
*TTS Voice: `gemini-2.5-flash-preview-tts` (0.50 in / 1.50 out per 1M).*  
*Image generation: Imagen 4 Fast (~$0.02 USD / image), Imagen 4 Ultra (~$0.04 USD / image).*

## 🗺️ Development Roadmap

- Finalize Dark Art Déco 1920s standardization across all remaining dialogs and panels (Epic #165).
- Stabilize the self-contained macOS package and pack local Mythos data (Issue #3).
- Implement era manifests and world preflight (Issue #4).
- Complete the equipment catalog and audit investigator portraits (Issue #6).
- Implement secure update verification for macOS (Issue #75).

Priorities and dependencies are maintained publicly in [this repository's Issues](https://github.com/InduPhantom-hash/straznik-tajemnic/issues). A private command board automatically arranges the same cards for operational oversight. The contribution workflow is documented in [the project workflow](./docs/PROJECT-WORKFLOW.md).

## 🔧 Technologies

Next.js 16 (App Router) · React 19 + TypeScript (strict) · Tailwind + shadcn/ui (Dark Art Déco 1920s) · Google Gemini API · Local vector DB (Float32 binary, cosine similarity) · Jest + Playwright.

## 📚 Documentation

| Document | Audience |
| --- | --- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | **Developer / Contributor** – System architecture, invariants, and cheat sheet |
| [`SETUP.md`](./SETUP.md) | **Setup** – Step-by-step installation instructions |
| [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) | **Player** – Gameplay manual, checks, Development Phase, and Journal |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | **Architecture** – Offline engine, RAG pipeline, and network boundary |
| [`docs/DESIGN-SYSTEM-ART-DECO.md`](./docs/DESIGN-SYSTEM-ART-DECO.md) | **UI/UX** – 1920s Dark Art Déco design tokens |
| [`docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md`](./docs/KOMPENDIUM_NARRACJI_I_IMMERSJI.md) | **Narrative** – Lovecraftian storytelling, cognitive pacing, and 4 Cadence Gears |
| [`docs/PROJECT-WORKFLOW.md`](./docs/PROJECT-WORKFLOW.md) | **Workflow** – GitHub Issues and Project 2 as SSOT |
| [`docs/TESTING.md`](./docs/TESTING.md) | **QA** – Testing guidelines and automated checks |
| [`NOTICE`](./NOTICE) | Legal status, trademarks, and disclaimers |

## 📝 Change Log

### [v0.9.4] - in preparation
- **Dark Art Déco 1920s Styling (Epic #165):** Comprehensive visual unification of the entire app based on semantic tokens (brass, gold, charcoal black, typewriter fonts), resolving over 200 legacy flat-design violations.
- **CoC 7e RAW Character Development Phase:** Full post-session skill progression mechanism (marking successful checks, d100 > skill value tests, and 1d10 stat bumps) integrated with save/load.
- **Local RAG & RAM Optimization:** Replaced legacy mechanisms with local Float32 binary vector storage on disk, reducing memory overhead.
- **Deterministic Inventory:** Profession-based starting kits with zero price or item hallucinations.
- **Developer Guide:** Added comprehensive onboarding documentation in `CONTRIBUTING.md`.

### [v0.9.3] - 2026-08-15
- **Investigator Board & Session Journal (CoC 7e RAW):** Interactive evidence corkboard with coordinate persistence after save/load, domain deduction engine (Idea Roll mechanics), false flags handling, diegetic document styling, and case dossier view.
- **Equipment & Credit Rating Economy:** New inventory modal with local SVG vector thumbnails, automatic narrative loot pickup, and Credit Rating integration.
- **30 Full Predefined Biographies & Zone 11:** 30 comprehensive investigator backstories (including 16 tailored characters for Zone 11 Polish scenarios) with unified Single Source of Truth under Biography.
- **Quick Adventure Mode & Refreshed Welcome Screen:** Seamless one-step scenario and investigator selection, expanded welcome screen layout.
- **Context-Aware Dynamic Pacing:** Narrative engine dynamically adjusts description pacing based on sanity thresholds, investigation stage, and action tension.
- **Visual Enhancements & Image Framing:** Upgraded card aspect ratio to 4:3 (`h-32`), `object-top` positioning preventing portrait face cutoffs, universal `SafeImage` fallback, and inspection lightbox zoom.
- **Engine & Architecture Stabilization:** Fixed legacy journal memory leaks, automated desktop rebuild in `cold-start.sh`, and resolved onboarding async loops.

### [v0.9.2-beta] - 2026-07-27
- **Narrative Engineering & Anti-Hallucination:** Integrated Lovecraftian world-state filters, 3-tier clues, memory seeds, and local rulebook RAG with deterministic d100 engine.
- **Refreshed Main Menu:** New main menu layout, navigation polish, and built-in Session Zero safety setup (Lines & Veils).
- **Zone 11 Custom Scenarios:** 4 built-in custom adventures and 16 preset investigators with rich backstories.
- **Sidebar RAG Assistant:** Added help modal, rules encyclopedia, and live rules assistant in the sidebar.
- **Enhanced Voice (TTS) & Audio:** Instant streaming narration and NPC voices.
- **Dynamic Weather:** Integrated historical weather conditions with "Climate > Facts" priority.

### [v0.9.1-beta] - 2026-07-20
- **Lovecraftian Atmosphere Enhancements**: Integrated Narrative Constitution, sensory cues (e.g., metallic taste before anomalies), and non-Euclidean geometry in Mythos scenes.
- **Investigator Biographies**: Added 30 complete, 6-8 sentence descriptions for predefined characters.
- **Session End Protocol**: Added support for `[KONIEC_SESJI]` system command, fading subplots gracefully to a cliffhanger before auto-save.
- **Code Dependency Map**: Created [`docs/MAPA-POWIAZAN.md`](./docs/MAPA-POWIAZAN.md) mapping technical docs to TypeScript source files.
- **Fast Image Toggle**: Easily manage API costs with the illustration switch in the settings panel.
- **Mobile and UX fixes**: Responsive modals for smaller screens, bottom toolbar layout in Lightbox, and diagnostic status panel connection timeouts.

## 📄 Licencja

Code: **MIT** (see [`LICENSE`](./LICENSE)). Non-commercial fan project.

---

<div align="center"><sub>Created by Phantom · fan-made, non-profit project</sub></div>
