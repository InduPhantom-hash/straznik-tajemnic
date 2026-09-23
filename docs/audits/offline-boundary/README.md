# Audyt trybu offline, granic sieci i degradacji zewnętrznych serwisów immersyjnych

> **Status audytu:** Zrealizowany (Zgodny z Issue #82)  
> **Data:** Wrzesień 2026  
> **Projekt:** Strażnik Tajemnic AI (Call of Cthulhu 7e RAW)  
> **Wersja bazowa:** v0.9.5  
> **Rygor architektoniczny:** Restrykcyjna norma Privacy-First (Offline-First / Zero Unauthorized Outbound Network)

---

## 1. Wprowadzenie i Cel Audytu

Celem niniejszego audytu jest formalna weryfikacja odporności aplikacji **Strażnik Tajemnic AI** na całkowity brak połączenia sieciowego (Offline-First), audyt granic sieciowych (Network Boundaries), analiza podatności na zawieszenie interfejsu (Graceful Degradation & Timeout Handling) oraz ocena integralności transakcyjnej lokalnych magazynów danych (SQLite WAL i struktury `data/saves/`).

Aplikacja w warstwie desktopowej (macOS `.app`) projektowana jest jako diegetyczne centrum dowodzenia Badacza i Strażnika Tajemnic. W myśl zasady **Privacy-First**, użytkownik musi mieć pewność, że jego lokalne dane, notatki, karty postaci i zapisy sesji nie wyciekają do sieci, a jedynym dopuszczalnym ruchem wychodzącym jest bezpośrednia, jawna komunikacja z wybranym przez gracza dostawcą LLM/TTS w modelu **BYOK** (Bring Your Own Key).

---

## 2. Inwentaryzacja Granic Sieciowych (Network Boundary Audit)

Przeprowadzono analizę statyczną i dynamiczną kodu źródłowego silnika (`_tester/_base/.silnik/src/`) pod kątem wszelkich zapytań HTTP/HTTPS, WebSocket, zapytań DNS i pobierania assetów zewnętrznych.

### 2.1. Macierz Zewnętrznych Punktów Styku Sieciowego

| Komponent / Serwis | Protokół & Endpoint | Rola w systemie | Warunek aktywacji | Wpływ na brak sieci (Offline) | Ocena ryzyka |
|---|---|---|---|---|---|
| **Google Gemini API** (`@google/genai`, `@google/generative-ai`) | HTTPS (`generativelanguage.googleapis.com`) | Generowanie narracji MG, logika testów CoC 7e, kompresja pamięci | Klucz BYOK wprowadzony przez gracza w Ustawieniach | Brak możliwości generowania nowych tur narracji | **Autoryzowany** (Rdzeń LLM) |
| **ElevenLabs TTS** (`/api/tts/elevenlabs`) | HTTPS (`api.elevenlabs.io`) | Opcjonalna synteza głosu MG i postaci NPC | Klucz BYOK ElevenLabs w Ustawieniach + włączony TTS | Brak dźwięku, gra degraduje się do trybu czysto tekstowego | **Autoryzowany** (Opcjonalny) |
| **Google Cloud TTS** (`/api/tts/google`) | HTTPS (`texttospeech.googleapis.com`) | Alternatywna synteza mowy | Klucz Google Cloud w Ustawieniach | Fallback do tekstu | **Autoryzowany** (Opcjonalny) |
| **Google Imagen** (`/api/imagen`) | HTTPS (`generativelanguage.googleapis.com`) | Generowanie ilustracji scen i portretów | Klucz BYOK Gemini + włączone generowanie obrazów | Pominięcie generowania obrazu; wyświetlenie ikony/placeholderu | **Autoryzowany** (Opcjonalny) |
| **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) | HTTPS (`<link rel="stylesheet">` w `layout.tsx`) | Pobieranie krojów: *Cinzel*, *Cinzel Decorative*, *Cormorant Garamond*, *Special Elite* | Każde uruchomienie aplikacji w przeglądarce / WebView | **Wyciek sieciowy offline:** fallback do fontów systemowych (serif/monospace), ryzyko opóźnienia FOUT/FOIT | **WYSOKIE (Luka Offline)** |
| **PostHog Analytics** (`posthog-js`) | HTTPS (`https://eu.i.posthog.com`) | Analityka błędów i telemetria sesji | Wyłącznie gdy ustawiona jest zmienna `NEXT_PUBLIC_POSTHOG_KEY` | Jeśli zmienna pusta: provider jest no-op i nie montuje skryptów | **Niskie** (Zero-traffic przy braku klucza) |
| **Sentry Error Tracking** (`@sentry/nextjs`) | HTTPS (`sentry.io`) | Rejestracja wyjątków i breadcrumbs | Wyłącznie gdy ustawione `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | Jeśli zmienna pusta: Sentry jest uśpione, brak zapytań | **Niskie** (Zero-traffic przy braku klucza) |
| **Desktop Auto-Update** (`update-service.ts`) | HTTPS (`ZEW_UPDATE_MANIFEST_URL`) | Odpytywanie o nowe wersje aplikacji desktopowej | Ustawiona flaga `STRAZNIK_DESKTOP_UPDATE=1` i podany URL manifestu | Ciche zignorowanie błędu sieciowego (catch w `DesktopUpdateNotifier`) | **Umiarkowane** (Wymaga jawnego toggle w UI) |

### 2.2. Główne Ustalenia Dotyczące Granic Sieci

1. **Szczelność Kluczy i Pamięci (Zero-Telemetry by default):**
   - Kod aplikacji jest w pełni bezpieczny pod kątem telemetrii: biblioteki `posthog-js` oraz `@sentry/nextjs` posiadają twarde zabezpieczenia warunkowe (`if (!key) return;`). W standardowej instalacji desktopowej zmienne te nie są predefiniowane, co oznacza **zerowy ruch telemetryczny**.
2. **Luka Zewnętrznych Fontów (Google Fonts CDN):**
   - Plik `src/app/layout.tsx` zawiera zewnętrzne znaczniki `<link rel="preconnect" href="https://fonts.googleapis.com">` oraz link do arkusza stylów Google Fonts.
   - W trybie całkowitego odcięcia sieci przeglądarka/Chromium próbuje rozwiązać DNS dla `fonts.googleapis.com`. Przy braku Internetu następuje timeout DNS, a interfejs Dark Art Déco degraduje się do systemowych krojów serif, co narusza spójność wizualną i generuje niepotrzebne próby połączeń.
   - **Rekomendacja:** Natychmiastowy self-hosting fontów przez pakiet lokalny `@next/font/local` lub statyczne pliki w `public/fonts/`.

---

## 3. Graceful Degradation & Timeout Handling (Obsługa Braku Sieci)

### 3.1. Analiza Mechanizmu `fetchWithRetry`

W pliku `src/hooks/useChat.ts` zaimplementowano funkcję odpornościową `fetchWithRetry`:

```typescript
function isNetworkBlip(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return /failed to fetch|networkerror|network request failed/i.test(msg);
}

async function fetchWithRetry(
  url: string,
  options: Parameters<typeof fetchWithApiKeys>[1],
  retries = 2,
  backoffMs = 300
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithApiKeys(url, options);
    } catch (error) {
      lastError = error;
      if (!isNetworkBlip(error) || attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    }
  }
  throw lastError;
}
```

### 3.2. Identyfikacja Podatności i Zachowań Niepożądanych

1. **Brak Twardego Timeoutu (Socket Hang / Half-Open TCP):**
   - `fetchWithApiKeys` oraz natywny `fetch` w przeglądarce nie posiadają skonfigurowanego `AbortSignal.timeout(...)`.
   - W sytuacji, gdy gracz odetnie sieć po nawiązaniu połączenia lub sieć ulegnie degradacji ("czarna dziura" pakietów, martwy hotspot), żądanie HTTP może wisieć przez domyślny timeout systemu operacyjnego (nawet 90-120 sekund).
   - Skutek: użytkownik obserwuje nieskończony spinner i zablokowane pole tekstowe bez żadnej informacji zwrotnej.
2. **Zachowanie Interfejsu w Trybie Błędu:**
   - W bloku `catch` hooka `useChat.ts` wykrycie błędu sieciowego skutkuje wstawieniem wiadomości zastępczej:  
     `⚠️ Chwilowy problem z połączeniem - spróbuj wysłać wiadomość jeszcze raz.`
   - Jest to zachowanie poprawne (zapobiega crashowi komponentu), jednak treść komunikatu jest techniczna (nie diegetyczna), a użytkownik musi ręcznie kopiować lub ponownie formułować treść akcji, jeśli pole wejściowe zostało już wyczyszczone.
3. **Dostępność Pozostałych Modułów w Trybie Offline (Read-Only Resilience):**
   - Przeprowadzono test zachowania aplikacji przy wyłączonej sieci:
     - **Karta Badacza:** 100% dostępna (dane trzymane w React State i `localStorage`).
     - **Ekwipunek i Finanse:** 100% dostępne w trybie odczytu i zarządzania przedmiotami.
     - **Kompendium Wiedzy (Lorebook / Reguły CoC 7e RAW):** 100% sprawne (dane zindeksowane lokalnie w formacie JSON/binary wewnątrz aplikacji).
     - **Dziennik Sesji i Oś Czasu:** 100% sprawne.

### 3.3. Zalecenia dla Warstwy Degradacji i Timeoutów

1. **Implementacja `AbortSignal.timeout(15_000)`:**  
   Każde żądanie do `/api/chat` oraz zewnętrznych API musi posiadać twardy limit czasu (np. 15-20 sekund). Po upływie tego czasu połączenie jest natychmiast przerywane, zwalniając blokadę interfejsu.
2. **Diegetyczny Komunikat i Przycisk "Ponów próbę" (Retry):**  
   Zamiast surowego ostrzeżenia technicznego, MG powinien w diegetyczny sposób zasygnalizować utratę kontaktu ze światem gry (np. *„Mgła gęstnieje, a eter milczy... Połączenie ze Strażnikiem Tajemnic zostało zerwane.”*) z bezpośrednim przyciskiem `[Ponów depeszę]`, który ponownie wysyła ostatni prompt gracza.

---

## 4. Integralność Lokalnej Bazy Danych i Magazynów Pamięci

### 4.1. Baza SQLite (`CampaignMemoryLedgerStore`)

Baza `campaign-memory.sqlite3` zarządza długoterminową pamięcią kampanii, wektorami wyszukiwania pełnotekstowego FTS5 oraz transakcjami faktów narracyjnych (`src/core/memory/ledger-store.ts`).

#### Ustalenia dotyczące transakcyjności i odporności na awarie:

1. **Tryb WAL (Write-Ahead Logging):**
   - Konstruktor wymusza `this.db.pragma('journal_mode = WAL');` oraz `this.db.pragma('foreign_keys = ON');`.
   - Zapewnia to współbieżność odczytów i zapisów oraz wysoką odporność na uszkodzenia pliku bazy przy nagłym przerwaniu procesu.
2. **Kopia zapasowa przy migracji (`VACUUM INTO`):**
   - Przy aktualizacji schematu (np. v1 -> v2) baza wykonuje transakcyjną migawkę za pomocą `VACUUM INTO ?`, co gwarantuje spójną kopię bezpieczeństwa wraz z niezacommitowanymi stronami WAL.
3. **Odporność na uszkodzenia wirtualnej tabeli FTS5:**
   - W przypadku awarii indeksu FTS5 (`fts_stale = 1`), metoda `append()` przechwytuje błąd, usuwa wyzwalacze FTS i zapisuje wpis bezpośrednio do kanonicznej tabeli `memory_entries`, zapobiegając utracie danych narracyjnych. Wyszukiwanie automatycznie przełącza się na fallback `LIKE`.
4. **Zalecenie optymalizacyjne:**
   - Rekomenduje się jawne ustawienie `this.db.pragma('synchronous = NORMAL');` (rekomendowany standard dla WAL, zapobiegający zbyt częstym wywołaniom `fsync` przy zachowaniu pełnej odporności na awarie zasilania).
   - Dodanie procedury `PRAGMA wal_checkpoint(TRUNCATE);` przy zamykaniu procesu aplikacji (`desktop/launcher.sh` / SIGTERM hook).

### 4.2. Struktura `data/saves/{userId}/{saveId}/`

Lokalne zapisy gier są przechowywane w formie plików `save.json` oraz `meta.json` w dedykowanym katalogu użytkownika.

#### Ustalenia dotyczące odporności zapisu:

1. **Atomowy Zapis Plików (`atomicWrite`):**
   - W `src/app/api/game-save/route.ts` funkcja `atomicWrite` zapisuje treść do unikalnego pliku tymczasowego `${file}.${randomUUID()}.tmp` z flagą `'wx'`, a następnie wykonuje atomową operację `fs.renameSync(temporary, file)`.
   - Zapobiega to powstawaniu plików częściowo zapisanych (obciętych) w razie nagłego zamknięcia aplikacji w trakcie zapisu.
2. **Samoleczenie Metadanych (Self-Healing Meta):**
   - W metodzie `GET` pobierającej listę save'ów, w razie braku lub uszkodzenia pliku `meta.json`, silnik automatycznie dekompresuje `save.json` i odtwarza brakujące metadane w locie.
3. **Pamięć Przeglądarki i Duże Antologie:**
   - Po wdrożeniu Issue #419 ciężkie struktury (graf relacji, wycinki handoutów powyżej 50MB) są kompresowane algorytmem GZIP przez `CompressionStream` i zapisywane w IndexedDB, co zabezpiecza pamięć przed limitami `localStorage` (5-10MB).

---

## 5. Macierz Zadań Wdrożeniowych (Backlog Implementation Matrix)

Poniższa macierz stanowi gotowy plan działania inżynieryjnego, dekomponujący zalecenia audytu na konkretne zadania w backlogu GitHub:

| ID Zadania | Tytuł Issue | Priorytet | Obszar (Labels) | Zakres plików (Allowlist) | Szacowany czas / Złożoność |
|---|---|---|---|---|---|
| **TASK-OFF-01** | `fix(offline): self-hosting fontów Google Fonts (Cinzel, Cormorant, Special Elite)` | **P1 (Krytyczny)** | `area: typography`, `area: offline`, `P1` | `src/app/layout.tsx`, `public/fonts/*` lub `next/font/local` | 1-2h (Niska) |
| **TASK-OFF-02** | `feat(network): twardy timeout (AbortSignal) i diegetyczny Retry w useChat` | **P1 (Krytyczny)** | `area: engine`, `area: network`, `P1` | `src/hooks/useChat.ts`, `src/lib/api-keys-service.ts`, `messages/*.json` | 2-3h (Średnia) |
| **TASK-OFF-03** | `feat(privacy): jawny przełącznik trybu Offline/Air-Gapped w Ustawieniach` | **P2 (Ważny)** | `area: ui`, `area: settings`, `P2` | `src/components/settings/*`, `src/lib/desktop/update-client.ts` | 2-3h (Średnia) |
| **TASK-OFF-04** | `harden(db): parametryzacja synchronous=NORMAL i graceful wal_checkpoint dla SQLite` | **P2 (Ważny)** | `area: architecture`, `area: db`, `P2` | `src/core/memory/ledger-store.ts`, `desktop/launcher.sh` | 1-2h (Niska) |
| **TASK-OFF-05** | `feat(ui): diegetyczny indykator zerwanej łączności telegraficznej` | **P3 (Usprawnienie)** | `area: ui`, `area: immersion`, `P3` | `src/components/game-header.tsx`, `src/components/ui/telegraph-status.tsx` | 2-3h (Średnia) |

---

## 6. Podsumowanie i Rekomendacja Odbioru (DoD)

- [x] Przeprowadzono kompletną inwentaryzację wszystkich żądań wychodzących aplikacji.
- [x] Zweryfikowano twardą zasadę zerowej telemetrii w konfiguracji domyślnej desktopu.
- [x] Zidentyfikowano lukę zewnętrznych fontów CDN (`fonts.googleapis.com`) i określono rozwiązanie w TASK-OFF-01.
- [x] Przeanalizowano zachowanie pętli `fetchWithRetry` i zdefiniowano mechanizm twardego timeoutu z abortem.
- [x] Potwierdzono transakcyjność bazy SQLite w trybie WAL oraz atomowość zapisu plików `save.json`.
- [x] Utworzono kompletną Macierz Zadań Wdrożeniowych gotową do rejestracji w GitHub Issues.

Audyt potwierdza wysoką dojrzałość architektury **Offline-First** w Strażniku Tajemnic AI, a eliminacja luki fontów zewnętrznych (TASK-OFF-01) oraz wdrożenie twardego timeoutu żądań (TASK-OFF-02) pozwolą na osiągnięcie 100% hermetyczności sieciowej.
