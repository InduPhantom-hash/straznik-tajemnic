<div align="center">

<img src="docs/assets/06-banner-1500x500.png" alt="Keeper of Arcane Lore AI" width="820">

# 𓂀 Keeper of Arcane Lore AI (v0.9.1-beta)

**An unofficial, fan-made AI Game Master for RPG sessions in the Lovecraftian setting.**

**[🇵🇱 Polish version of README is available here (README.md)](./README.md)**

Run your *Call of Cthulhu 7e* sessions solo or with a friend on a single laptop (Hot Seat). The entire game runs **locally on your machine** - you insert your own Gemini API key, upload **your own** guidebook, and saves are stored on your disk. No registration, no cloud databases, no telemetry.

<a href="https://youtu.be/k3NioUBRIes">
  <img src="docs/assets/07-onboarding-3024x1898.png" alt="Keeper of Arcane Lore AI - introduction video" width="640">
</a>

▶️ [Watch the introduction video on YouTube](https://youtu.be/k3NioUBRIes)

</div>

---

## 👥 Who is it for?

There comes a stage in life where gathering a full table for an RPG session is a miracle - schedules clash, people move away, but the hunger for adventure remains. **Keeper of Arcane Lore AI** ensures you don't have to wait - it takes the role of the Game Master, allowing you to experience dark adventures in Lovecraft's world right from your couch.

- **Solo** - play alone whenever you have a moment. The AI leads the narrative, remembers NPCs, plots, and consequences throughout the campaign, keeping the story coherent.
- **Coop (Hot Seat)** - one laptop, two players: each has their own character, customized color, and the AI addresses players by name. No need to assemble a large group.

---

## ⬇️ Download

**[Download the ready-to-run package (ZIP)](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest)** - the entire app is inside, launch with a double-click (Windows / Mac). It does not include an API key or guidebook: during the first run, you paste your **own** Gemini key and upload **your** PDF guidebook (the app links to sources).

> Prefer running from source code? Follow the **Quick Start** guide below.

---

> [!IMPORTANT]
> **Fan project, unofficial.** Not affiliated with Chaosium Inc. or Black Monk.
> The application is **only the engine** - it does not contain any books. You play using your **own, legally acquired** copy (free starter rules or full edition - the app links to sources during the first startup). *Call of Cthulhu* is a trademark of Chaosium Inc. Details: [`NOTICE`](./NOTICE).

## ✨ Features

- **AI Game Master** - leads the narrative in Lovecraft's style, reacting dynamically to players' choices.
- **Character Creator** - CoC 7e investigator creator (characteristics, occupation, skill points allocation, background, portrait).
- **CoC 7e Mechanics** - d100 rolls, skill tests, Push Rolls, Sanity (SAN), Luck, Development Phase - calculated deterministically by the app, AI describes the outcome.
- **Hot Seat** - 1-2 players sharing one screen, each with a unique investigator and color theme.
- **Voice (TTS)** - the AI Game Master reads the narrative out loud.
- **Scene Illustrations** - images generated in real-time as the adventure progresses.
- **Local RAG** - the app knows the rules directly from **your** uploaded PDF guidebook (eliminating hallucinations).
- **Campaign Clock & Journal** - in-game time tracking and automated logs/clues saving.

---

## 📸 Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/01-menu-glowne.png" alt="Main menu"><br><sub><b>Main menu</b> - choose game mode, adventure, and character.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/02-test-umiejetnosci.png" alt="Skill test"><br><sub><b>Skill test</b> - Dice tray calculates d100 rolls based on CoC 7e difficulty levels.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/screenshots/03-scena-arkham.png" alt="AI generated scene"><br><sub><b>AI Scene</b> - illustration and narrative description in Lovecraftian style.</sub></td>
    <td width="50%"><img src="docs/assets/screenshots/04-karta-postaci.png" alt="Investigator sheet"><br><sub><b>Investigator sheet</b> - stats, skills, and current state.</sub></td>
  </tr>
</table>

---

## 🚀 Quick Start

> Simplest way: [Download the ZIP release](https://github.com/InduPhantom-hash/straznik-tajemnic/releases/latest) and double-click to run. Below are instructions for developers running from source.

> Requirements: **Node.js 18+** and a free **Gemini API key** (`https://aistudio.google.com/apikey`).

```bash
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**. The first-run wizard will guide you through:
1. **Gemini API key** - paste the key and test connection.
2. **Guidebook source** - links to free starter rules and full editions.
3. **Upload PDF** - select your PDF file. The app extracts text and builds a local vector index (`data/rag/`).

Once configured, the **Play** button becomes active.

### macOS - desktop launcher (optional)

```bash
bash desktop/build-app.sh --rebuild
```
Creates `Strażnik Tajemnic AI.app` in your `~/Applications` folder.

---

## ⚙️ Configuration

Copy `.env.example` to `.env.local`. The only **required** variable is `GEMINI_API_KEY`. Other settings are optional (e.g., custom voice/image generation providers). All settings are commented in [`.env.example`](./.env.example).

---

## 🏚️ Quality Presets

A single session lasts around 3 hours of gameplay. The default preset is **HIGH**.

| Preset      | Chat Model       | TTS Voice      | Images          |
| ----------- | ---------------- | -------------- | --------------- |
| **LOW**     | Gemini Flash     | None           | Gemini          |
| **MID**     | Gemini Flash     | Google TTS     | Gemini          |
| **HIGH** ⭐ | Gemini 2.5 Flash | Gemini TTS     | Gemini / Vertex |
| **ULTRA**   | Gemini Pro       | Gemini Pro TTS | Gemini / Vertex |

---

## 🔧 Technologies

Next.js 14 (App Router) · React 18 + TypeScript (strict) · Tailwind + shadcn/ui · Google Gemini API · Local vector DB (Float32 binary, cosine similarity) · Jest + Playwright.

---

## 📚 Documentation

- [`SETUP.md`](./SETUP.md) – Step-by-step installation.
- [`docs/USER_GUIDE.md`](./docs/USER_GUIDE.md) – Player's guide.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) – System architecture.
- [`docs/MAPA-POWIAZAN.md`](./docs/MAPA-POWIAZAN.md) – Instructions-to-code dependency map.
- [`docs/TESTING.md`](./docs/TESTING.md) – Testing procedures.
- [`NOTICE`](./NOTICE) – Legal status and trademarks.

---

## 📝 Change Log

### [v0.9.1-beta] - 2026-07-20
- **Lovecraftian Atmosphere Enhancements**: Integrated Narrative Constitution, sensory cues (e.g., metallic taste before anomalies), and non-Euclidean geometry in Mythos scenes.
- **Investigator Biographies**: Added 30 complete, 6-8 sentence descriptions for predefined characters.
- **Session End Protocol**: Added support for `[KONIEC_SESJI]` system command, fading subplots gracefully to a cliffhanger before auto-save.
- **Code Dependency Map**: Created [`docs/MAPA-POWIAZAN.md`](./docs/MAPA-POWIAZAN.md) mapping technical docs to TypeScript source files.
- **Fast Image Toggle**: Easily manage API costs with the illustration switch in the settings panel.
- **Mobile and UX fixes**: Responsive modals for smaller screens, bottom toolbar layout in Lightbox, and diagnostic status panel connection timeouts.

---

## 📄 License

Code: **MIT** (see [`LICENSE`](./LICENSE)).

---

<div align="center"><sub>Created by Phantom · fan-made, non-profit project</sub></div>
