# 🔐 Security Policy / Polityka Bezpieczeństwa (v0.9.5)

[🇵🇱 Wersja Polska](#-polityka-bezpieczeństwa---strażnik-tajemnic-ai-v095) | [🇺🇸 English Version](#-security-policy---keeper-of-arcane-lore-ai-v095)

---

# 🇵🇱 Polityka Bezpieczeństwa - Strażnik Tajemnic AI (v0.9.5)

## 🛡️ Architektura Prywatności (Privacy-First & Offline-First)

Aplikacja **Strażnik Tajemnic AI** projektowana jest w restrykcyjnym reżimie ochrony prywatności. Użytkownik zachowuje pełną kontrolę nad swoimi danymi, notatkami, kartami postaci i zapisami sesji.

### 1. Model BYOK (Bring Your Own Key) i Ochrona Kluczy API
- **Lokalne przechowywanie:** Klucz Google Gemini API (oraz opcjonalne klucze ElevenLabs) wprowadzany jest w oknie aplikacji i przechowywany wyłącznie lokalnie (`localStorage` w przeglądarce lub plik `.env.local` poza repozytorium).
- **Zakaz wycieków:** Klucze API nigdy nie są commitowane do repozytorium (pliki `.env*` są zablokowane w `.gitignore`) ani przesyłane do jakichkolwiek zewnętrznych serwisów analitycznych.
- **Bezpośrednia transmisja:** Zapytania narracyjne trafiają wyłącznie bezpośrednio do oficjalnych endpointów Google Gemini API (`generativelanguage.googleapis.com`) szyfrowanym kanałem HTTPS.

### 2. Zerowa Telemetria Domyślna (Zero Unauthorized Outbound Network)
- **Stan wydań desktopowych:** W oficjalnych paczkach wydaniowych na macOS i Windows telemetria jest **całkowicie wyłączona**.
- **Warunkowe biblioteki:** Komponenty analityczne (`posthog-js`, `@sentry/nextjs`) posiadają twarde blokery w kodzie (`if (!key) return;`). Przy braku jawnie zdefiniowanych kluczy w środowisku (`NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`) biblioteki te są całkowicie uśpione (no-op) i nie nawiązują żadnych połączeń sieciowych.
- **100% Self-Hosted Assets:** Wszystkie kroje pisma (Cinzel, Cinzel Decorative, Cormorant Garamond, Special Elite) są w 100% serwowane lokalnie w formacie WOFF2 z katalogu `public/fonts/`. Aplikacja nie wykonuje żadnych zapytań do Google Fonts CDN ani zewnętrznych serwisów sieciowych podczas rozgrywki.

### 3. Pamięć Podręcznika i Zapisy Stanu Gry
- **Lokalny indeks RAG:** Plik PDF z Twoim podręcznikiem zasad przetwarzany jest lokalnie na Twoim komputerze. Wektorowy indeks zasad przechowywany jest w formacie binarnym (`Float32`) w folderze `data/rag/`.
- **Lokalne zapisy sesji:** Stan gry, dziennik śledztwa, akta sprawy i ekwipunek zapisywane są w lokalnej pamięci IndexedDB (z kompresją gzip) oraz na dysku w formacie SQLite / JSON (`data/saves/`). Żadne dane gry nie są wysyłane do chmury.

---

## 🚨 Zgłaszanie Luk Bezpieczeństwa

Jeśli odkryłeś potencjalną podatność lub lukę bezpieczeństwa w silniku:

1. **Nie zgłaszaj jej w publicznym rejestrze GitHub Issues.**
2. Skontaktuj się bezpośrednio i poufnie pod adresem: **`issue@callofchtulhu.pl`**.
3. W zgłoszeniu opisz kroki do odtworzenia problemu, wersję aplikacji oraz potencjalne konsekwencje luki.
4. Zobowiązujemy się do potwierdzenia odbioru zgłoszenia w ciągu 48 godzin oraz opublikowania poprawki w najbliższym wydaniu korygującym.

---

# 🇺🇸 Security Policy - Keeper of Arcane Lore AI (v0.9.5)

## 🛡️ Privacy Architecture (Privacy-First & Offline-First)

**Keeper of Arcane Lore AI** operates under strict Privacy-First and Offline-First engineering principles. Players retain full ownership and local custody of their session notes, investigator sheets, rulebooks, and campaign saves.

### 1. BYOK Model (Bring Your Own Key) & API Key Safety
- **Local storage only:** Your Google Gemini API key (and optional ElevenLabs keys) is entered inside the client interface and stored strictly on your local machine (`localStorage` or `.env.local`).
- **No credential leaks:** API keys are never committed to git (`.env*` entries are blocked in `.gitignore`) and are never sent to external logging or telemetry services.
- **Direct encrypted transit:** Prompt and narration requests travel directly to official Google Gemini API endpoints (`generativelanguage.googleapis.com`) over secure HTTPS.

### 2. Zero Telemetry by Default (Zero Unauthorized Outbound Network)
- **Production release state:** In official desktop packages (macOS and Windows), telemetry is **completely disabled**.
- **Conditional instrumentation:** Monitoring modules (`posthog-js`, `@sentry/nextjs`) feature strict conditional guards (`if (!key) return;`). When project keys (`NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`) are absent, these providers remain completely inactive (no-op) and generate zero network traffic.
- **100% Self-Hosted Assets:** All typography (Cinzel, Cinzel Decorative, Cormorant Garamond, Special Elite) is fully self-hosted locally in WOFF2 format under `public/fonts/`. The application makes zero calls to Google Fonts CDN or any external asset CDN during gameplay.

### 3. Rulebook Indexing & Campaign Persistence
- **Local vector RAG:** Your rulebook PDF is processed locally on your hardware. Semantic embeddings are stored in binary `Float32` files in `data/rag/`.
- **Local campaign records:** Investigation journals, discovery boards, and inventory ledgers are stored in client-side IndexedDB (with gzip compression) and local SQLite/JSON storage (`data/saves/`). No campaign data is ever uploaded to cloud databases.

---

## 🚨 Vulnerability Reporting

If you discover a potential vulnerability or security flaw in the engine:

1. **Do NOT report security vulnerabilities via public GitHub Issues.**
2. Send a confidential report directly to: **`issue@callofchtulhu.pl`**.
3. Please include reproduction steps, application version, and the expected impact of the issue.
4. We aim to acknowledge reports within 48 hours and deliver fixes in the next maintenance release.
