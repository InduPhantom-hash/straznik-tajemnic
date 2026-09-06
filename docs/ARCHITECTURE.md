# Architektura Strażnika Tajemnic AI

Dokument techniczny opisujący stan architektury aplikacji **lokalnej / offline** (wersja v0.9.4).

---

## 1. Z lotu ptaka & Single Source of Truth

Monolityczna aplikacja **Next.js 16 (App Router)** z podziałem na wrapper i właściwy runtime silnika:

- **Git Root (`/straznik-tajemnic`):** Pełni rolę launchera, przechowuje dokumentację kanoniczną (`docs/`), pliki konfiguracyjne i skrypty powłoki macOS (`desktop/`).
- **Silnik Aplikacji (`_tester/_base/.silnik/`):** Jest jedynym miejscem, w którym żyje 100% kodu produkcyjnego TypeScript, komponentów React 19, słowników i18n oraz testów.

```
Przeglądarka (React 19 / Dark Art Déco) ──► Route Handlers (/api/*) ──► Google Gemini API (BYOK)
                   │                                │
             localStorage                     data/rag/*.bin (Lokalny RAG Float32)
             IndexedDB (Obrazy)               data/saves/    (Zapisy sesji na dysku)
```

Model użytkowania: **1 sesja przeglądarki = 1 gra = 1-2 graczy** (Hot Seat). Aplikacja jest jednoinstancyjna, co pozwala na stosowanie sprawdzonych singletonów modułowych i szybkiego storage'u lokalnego.

---

## 2. Podwójny Kontrakt Narracyjny (Silnik ↔ Prompt MG)

Architektura gwarantuje, że model LLM nie ma bezpośredniej władzy nad stanem gry i nie wymyśla mechaniki:

```
+-------------------------------------------------------------+
|                     KOD APLIKACJI (TS)                      |
|  - Rzuty kośćmi k100 (dice-utils.ts)                        |
|  - Progi trudności RAW (skill-test-resolver.ts)             |
|  - Faza Rozwoju Postaci (development-phase.ts)              |
|  - Inwentarz i waluty (equipment-catalog.ts)                |
+------------------------------+------------------------------+
                               | Twardy wynik mechaniczny
                               v
+-------------------------------------------------------------+
|                  MISTRZ GRY AI (LLM / GEMINI)               |
|  - Protokół promptu: gm-protocol.ts                         |
|  - Emisja tagów narracyjnych: [SANITY:], [HP:], [WYNIK:]    |
|  - Dynamic Cadence: 4 Biegi Kadencji opisu                  |
+------------------------------+------------------------------+
                               | Strumień SSE z tagami
                               v
+-------------------------------------------------------------+
|                     PARSER I SANITYZACJA                    |
|  - apply-stat-changes.ts (aktualizacja stanu postaci)       |
|  - text-cleaner.ts (usunięcie tagów przed wyświetleniem)    |
|  - useTTS.ts (przekazanie czystego tekstu do lektora)       |
+-------------------------------------------------------------+
```

---

## 3. Kluczowe ścieżki w kodzie (`_tester/_base/.silnik/src/`)

| Obszar | Ścieżka pliku | Odpowiedzialność |
|---|---|---|
| Główny ekran gry | `src/app/page.tsx` | Pulpit śledczy, okno narracji, Tacka na Kości |
| Endpoint Mistrza Gry | `src/app/api/chat/route.ts` (+ `_helpers/`) | Pipeline czatu, streaming SSE, prompt MG |
| Generowanie ilustracji | `src/app/api/imagen/route.ts` | Obrazy lokacji, portrety i przedmioty (Gemini Flash Image) |
| Lektor (TTS) | `src/app/api/tts/gemini/route.ts` | Streaming mowy lektora przez Web Audio API |
| Lokalny import PDF | `src/app/api/pdf/ingest-local/route.ts` | Ekstrakcja tekstu z podręcznika gracza |
| Lokalny magazyn wektorowy | `src/lib/vector-db/local-vector-store.ts` | Wyszukiwanie zasad w formacie binarnym Float32 |
| Mechanika kości CoC 7e | `src/lib/dice-utils.ts`, `skill-test-resolver.ts` | Rzuty k100, Faza Rozwoju, testy SAN |
| Rejestr nawigacji | `navigation/navigation-registry.json` | Źródło prawdy dla 31 ekranów i modali UI |
| Słowniki i18n | `messages/pl.json`, `messages/en.json` | 100% symetryczne tłumaczenia interfejsu |

---

## 4. Warstwa Sztucznej Inteligencji (Google Gemini API)

Wszystkie operacje AI opierają się na jednym kluczu Google AI Studio (BYOK):

- **Czat (Mistrz Gry):** Domyślnie `gemini-3.6-flash` lub `gemini-3.8-flash` (z opcją `gemini-2.5-flash` / `gemini-3.1-pro-preview` dla presetu ULTRA).
- **Embeddingi reguł:** `gemini-embedding-001` (generuje wektory zasad z PDF).
- **Lektor:** `gemini-2.5-flash-preview-tts` (bezpośrednia synteza mowy w locie).
- **Ilustracje:** `gemini-2.5-flash-image` generujący stylizowane ilustracje w klimacie lat 20. XX w.

---

## 5. Lokalny Silnik RAG (`data/rag/`)

Podręcznik gracza trafia do w pełni lokalnego indeksu dyskowego:
- PDF → parsowanie tekstu → podział na chunki → embeddingi Gemini → binarne pliki `Float32` (`*.bin` + `*.meta.json`).
- Wyszukiwanie realizowane jest przez Cosine Similarity oraz lokalny BM25 w pamięci RAM.
- **Anty-halucynacja:** Gdy zapytanie o regułę nie znajdzie pokrycia w wektorach, model informuje o braku wiedzy w kontekście, zamiast zmyślać zasady.

---

## 6. Granice Sieci i Bezpieczeństwo

Aplikacja nie wymaga i nie utrzymuje żadnej zewnętrznej relacyjnej bazy danych:
- Save'y, stan postaci, Dziennik i Tablica Badacza zapisują się lokalnie (`data/saves/` oraz `localStorage`).
- Obrazy sesji cache'owane są w `IndexedDB`.
- Połączenia wychodzące kierowane są wyłącznie do Google AI Studio pod kontrolą użytkownika.
