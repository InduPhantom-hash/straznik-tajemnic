# Dev Research: Integracja ElevenLabs TTS, Chrome Built-in AI oraz Re-strukturyzacja Presetów Jakości

Data: 2026-07-25  
Stack: Next.js 14 (App Router), React 18, TypeScript (strict), Google Gemini API (`@google/genai`), Local Hybrid RAG (BM25 + Cosine Vector Storage `.bin`), PostHog Telemetry, Sentry.

---

## 1. Obszar problemu i stan obecny

Analiza repozytorium `/Volumes/Karta/Developer/straznik-tajemnic` pod kątem 3 kluczowych aspektów:

1. **Dostawcy TTS & ElevenLabs Status**:
   - W sesji 146 podjęto decyzję o usunięciu ElevenLabs (`DROPPED per D2` w `src/app/api/tts/route.ts`).
   - Obecnie aplikacja wykorzystuje zunifikowany router `/api/tts/route.ts` kierujący do `/api/tts/google` lub `/api/tts/gemini`.
   - Endpoint Gemini TTS (`src/app/api/tts/gemini/route.ts`) trzyma bazę 30 prebuiltów (`GEMINI_VOICES` m.in. Kore, Charon, Fenrir w `_tester/_base/.silnik/src/lib/gemini-voices.ts`), jednak brak dedykowanego języka polskiego obniża ekspresję słuchowiska.
   - Posiadamy gotowy moduł heurystycznego mapowania NPC na głosy (`_tester/_base/.silnik/src/lib/npc-voice-mapping.ts`), który zgaduje płeć, wiek i typ (np. potwory CoC 7e), lecz obsługuje tylko identyfikatory Gemini.

2. **Lokalny RAG & Przepływ Wyszukiwania**:
   - Wyszukiwanie wiedzy jest zrealizowane hybrydowo (`src/lib/vector-db/retrieval-service.ts`): fuzja RRF z wyszukiwania wektorowego (iloczyn kosinusowy na binarnej bazie `.bin`) oraz pełnotekstowego BM25 (`bm25-index.ts`).
   - Przepływ odbywa się server-side w `runRAGAndSummary()`, a wygenerowana sekcja `ragSection` trafia do `additionalContext` w `src/app/api/chat/_helpers/build-context.ts`.
   - Podsystem Asystenta Encyklopedii (`HelpAssistantTab.tsx`) wyszukuje informacje dla gracza.

3. **Presety Jakościowe (`src/lib/ai-presets/`)**:
   - Zdefiniowane presety w `definitions.ts`: `LOW`, `MID`, `HIGH`, `ULTRA`.
   - W sesji 146 usunięto pola i klucze ElevenLabs z presetów oraz ze struktury `AISettings`.

---

## 2. Zależności i Architektura

### Przepływ Audio (TTS Pipeline):
```
[Komponent Czat / page.tsx] ──► useTTS() (src/hooks/useTTS.ts)
                                     │
                                     ▼
                        POST /api/tts (Unified Router)
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       POST /api/tts/gemini                    POST /api/tts/elevenlabs [RESTORING]
    (Model: gemini-2.5-flash-preview)      (Models: multilingual_v2 / turbo_v2_5)
```

### Przepływ Wyszukiwania & Chrome AI (Client-Server Synergy):
```
[Pytanie Gracza / GM Input] 
       │
       ├─► Server-side Node.js RAG (`retrievalService.retrieve()`)
       │     └─► Pobiera 15-20 surowych fragmentów z baz .bin oraz BM25.
       │
       └─► Client-side Chrome Built-in AI (`window.ai.languageModel` Gemini Nano)
             └─► Niewidoczna dla gracza pre-selekcja i ekstrakcja kluczowych faktów
                 przed przekazaniem skompresowanego kontekstu do chmurowego API Gemini.
```

---

## 3. Ryzyka i Uwagi Architektoniczne

1. **Bezpieczeństwo Klucza ElevenLabs**:
   - Klucze API ElevenLabs muszą trafiać wyłącznie do `.env.local` lub być przekazywane bezpiecznie (BYOK w `localStorage` usera po nagłówku `X-ElevenLabs-Api-Key`), tak jak ma to miejsce z kluczem Gemini.

2. **Środowisko Wykonawcze Chrome AI**:
   - `window.ai` działa wyłącznie po stronie klienta (Client Component / Browser). Serwerowy `retrieval-service.ts` w Node.js musi udostępniać lekki endpoint lub hook kliencki dla pre-processingu.

3. **Zarządzanie Budżetem Sesji**:
   - Wykorzystanie modelu ElevenLabs `eleven_multilingual_v2` generuje najwyższą jakość radiową przy kosztach ~$4.00-$8.00/sesję.
   - Użycie modelu hybrydowego (`multilingual_v2` dla głównych NPC, `turbo_v2_5` dla pobocznych) pozwala obniżyć koszty sesji do ~$2.50-$5.00.

---

## 4. Rekomendowane Presety Jakości w Strażniku Tajemnic

1. **LOW (Ekonomiczny / Pure Text)**:
   - Chat: Gemini Flash
   - Obrazy: Wyłączone ($0.00)
   - Lektor: Wyłączony ($0.00)
   - Przeznaczenie: Bardzo szybka gra bez opłat sieciowych za media.

2. **MID (Standard)**:
   - Chat: Gemini Flash
   - Obrazy: Imagen 4 Fast ($0.02/obraz)
   - Lektor: Google TTS / Gemini TTS
   - Przeznaczenie: Domyślne, zbalansowane doświadczenie.

3. **HIGH (Hybrydowe Słuchowisko)**:
   - Chat: Gemini 2.5 Flash / 3.6
   - Obrazy: Imagen 4 Fast / Ultra
   - Lektor: **ElevenLabs Hybryda** (Główne NPC: Multilingual v2, Poboczni: Turbo v2.5)
   - Przeznaczenie: Świetny dubbing z dynamiczną akcją.

4. **ULTRA (Słuchowisko Pro)**:
   - Chat: Gemini Pro
   - Obrazy: Imagen 4 Ultra ($0.06/obraz)
   - Lektor: **ElevenLabs Full Pro** (Wszyscy NPC na `eleven_multilingual_v2` ze sztywnym podbiciem emocji)
   - Przeznaczenie: Maksymalna imersja słuchowiska radiowego.

---

## 5. Następne Kroki

Przeprowadzono pełny research. Rekomendowane przejście do `/dev-2-plan` celem przygotowania specyfikacji technicznej wdrożenia.
