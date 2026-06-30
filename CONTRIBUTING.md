# 🤝 Contributing - Zew-App v4.0

Dziękujemy za zainteresowanie rozwojem projektu!

---

## 📋 Wymagania

- Node.js 18+ (zalecane 20.x LTS)
- npm 9+
- Git
- Klucze API (Gemini, Google Cloud, Pinecone, opcjonalnie Replicate/ElevenLabs)
- Husky pre-commit + pre-push (aktywuje się po `npm install`)

---

## 🚀 Setup deweloperski

```bash
# 1. Sklonuj repo
git clone https://github.com/your-repo/zew-app-2.0.git
cd zew-app-2.0

# 2. Zainstaluj zależności
npm install

# 3. Skopiuj env
cp .env.example .env.local
# Uzupełnij klucze API

# 4. Uruchom dev server
npm run dev
```

---

## 📁 Struktura projektu

```
src/
├── app/           # Next.js App Router (pages + API)
│   ├── api/       # 31 API endpoints
│   │   └── chat/_helpers/  # 9 wyciągniętych helperów pipeline (IND-71/183/184)
│   └── page.tsx   # Główna strona
├── components/    # React components
│   ├── ui/        # ~68 komponentów UI
│   ├── chat/      # Chat components (NarrativeFormatter/, welcome/, chat-window/)
│   └── dialogs/   # Modals
├── lib/           # Business logic
│   ├── ai-providers/      # IChatProvider + GeminiChatProvider (post-IND-46)
│   ├── ai-settings/       # Moduły presetów + drift detector (IND-33)
│   ├── vector-db/         # Pinecone client + retrievalService + embeddingService
│   └── data/character/    # BASE_SKILLS + STAT_DESCRIPTIONS + occupations
└── hooks/         # React hooks
```

Plus repo-root: [.agent/](./.agent/) workspace agentów (plans/, research/, implementation/, session-notes.md).

---

## 🎨 Code Style

### TypeScript

- Strict mode enabled
- Explicit types (unikaj `any`)
- Interface > Type dla obiektów

### React

- Functional components + hooks
- `use` prefix dla hooks
- Props destructuring

### Nazewnictwo

- **Komponenty:** PascalCase (`CharacterSheet.tsx`)
- **Pliki lib:** kebab-case (`voice-matcher.ts`)
- **Funkcje:** camelCase (`generatePortrait`)
- **Stałe:** SCREAMING_SNAKE_CASE (`MAX_TOKENS`)

### Formatowanie

- Prettier z konfiguracją projektu
- 2 spacje indent
- Single quotes
- Trailing commas

```bash
# Sprawdź formatowanie
npm run lint

# Napraw automatycznie
npm run lint:fix
```

---

## 🔀 Git Workflow

### Nazwy branchy

```
feat/nazwa-funkcji     # Nowa funkcja
fix/opis-buga          # Naprawa błędu
docs/co-dokumentujesz  # Dokumentacja
refactor/co-refaktorujesz
```

### Commit messages

Format: `type: description`

```
feat: add multi-voice TTS support
fix: resolve chat display prefix issue
docs: update API reference
refactor: extract voice matching logic
```

Typy: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

---

## 🧪 Testowanie

```bash
# Testy jednostkowe (Jest, ~829 PASS)
npm test

# Testy E2E (Playwright)
npm run qa:e2e

# Sprawdź TypeScript
npx tsc --noEmit
```

> Husky pre-commit blokuje commit jeśli ESLint zwróci >20 warnings lub powiązany test padnie. Husky pre-push uruchamia `tsc --noEmit` na całym projekcie.

---

## 📝 Pull Request Process

1. **Fork** repozytorium
2. **Utwórz branch** z opisową nazwą
3. **Napisz kod** zgodnie z code style
4. **Dodaj testy** dla nowych funkcji
5. **Zaktualizuj dokumentację** jeśli potrzeba
6. **Utwórz PR** z opisem zmian

### PR Checklist

- [ ] Kod kompiluje się bez błędów
- [ ] Testy przechodzą
- [ ] Lint nie zgłasza błędów
- [ ] Dokumentacja zaktualizowana
- [ ] CHANGELOG.md zaktualizowany (dla feat/fix)

---

## 📞 Kontakt

- **Issues:** GitHub Issues
- **Dyskusje:** GitHub Discussions

---

_Wersja: 4.0.0 · Ostatnia aktualizacja: 2026-05-23_
