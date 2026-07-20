# 🗺️ Mapa Powiązań (Instrukcje & Dokumentacja ↔ Kod Source)

Dokument ten pełni rolę **Single Source of Truth (SSOT)** dla architektury zależności funkcjonalnych i instrukcji w projekcie **Strażnik Tajemnic AI**. Określa jednoznacznie, na które pliki źródłowe (`src/`) wpływa poszczególna instrukcja lub dokument w systemie.

---

## 🧭 System Powiązań Głównych Osi

```mermaid
graph TD
    subgraph Instrukcje_Systemowe["Instrukcje & Prompty (.md)"]
        PROMPT["public/default-gm-prompt.md<br/>(Master Prompt MG CoC 7e)"]
        ARCH["docs/ARCHITECTURE.md<br/>(Architektura Systemu)"]
        UGUIDE["docs/USER_GUIDE.md<br/>(Przewodnik Gracza)"]
        ROADMAP["docs/ROADMAP-MECHANIKI-AI.md<br/>(Roadmapa AI)"]
        SECURITY["SECURITY.md<br/>(Polityka Bezpieczeństwa)"]
    end

    subgraph Logika_Backend_API["Logika Backend & API (src/app/api & src/lib)"]
        BUILD_CTX["src/app/api/chat/_helpers/build-context.ts"]
        CHAT_PIPE["src/app/api/chat/_helpers/run-chat-pipeline.ts"]
        RAG_STORE["src/lib/vector-db/local-vector-store.ts"]
        DICE_CALC["src/lib/dice-utils.ts<br/>skill-test-resolver.ts"]
        TTS_API["src/app/api/tts/gemini/route.ts"]
        IMAGEN_API["src/app/api/imagen/route.ts"]
    end

    subgraph Komponenty_UI["Komponenty UI & Hooki (src/components & src/hooks)"]
        MSG_INPUT["src/components/chat/message-input.tsx"]
        SIDEBAR["src/components/sidebar/cthulhu-sidebar.tsx"]
        DICE_TRAY["src/components/dice/dice-tray.tsx"]
        SHEET["src/components/character-sheet/"]
        EQUIPMENT["src/components/equipment/"]
    end

    PROMPT -->|Wstrzykiwany prompt bazowy| BUILD_CTX
    PROMPT -->|Tagowanie SAN, HP, Wynik| CHAT_PIPE
    PROMPT -->|Zasady rzutów RAW| DICE_CALC
    PROMPT -->|Tagi głosu [whispers]| TTS_API
    ARCH -->|Implementacja Float32 RAG| RAG_STORE
    UGUIDE -->|Tacka na Kości CoC 7e| DICE_TRAY
    UGUIDE -->|Karta badacza| SHEET
    ROADMAP -->|Przycisk Koniec Sesji| SIDEBAR
    ROADMAP -->|Wygaszanie i autozapis| MSG_INPUT
    SECURITY -->|Obsługa kluczy lokalnych| SIDEBAR
```

---

## 📋 Tabela Zależności Szczegółowych

| Dokument / Instrukcja (`.md`) | Obszar funkcjonalny | Powiązane pliki źródłowe (`src/`) |
| :--- | :--- | :--- |
| **`public/default-gm-prompt.md`**<br/>*(Master Prompt Mistrza Gry)* | • Kontekst i ton Lovecrafta<br/>• Sesja Zero i kalibracja<br/>• Tagi `[SANITY:]`, `[HP:]`, `[WYNIK:]`<br/>• Procedura `[KONIEC_SESJI]`<br/>• Tagi Audio TTS (np. `[whispers]`) | • `src/app/api/chat/_helpers/build-context.ts`<br/>• `src/app/api/chat/_helpers/run-chat-pipeline.ts`<br/>• `src/lib/prompts/lovecraft-style-guide.ts`<br/>• `src/hooks/useTTS.ts`<br/>• `src/components/chat/message-input.tsx` |
| **`docs/ARCHITECTURE.md`**<br/>*(Dokumentacja Architektury)* | • Monolit Next.js 14 App Router<br/>• Lokalny RAG Float32 (`Float32Array`)<br/>• Storage (`localStorage` + dysk)<br/>• Presety jakości (LOW / MID / HIGH / ULTRA) | • `src/lib/vector-db/local-vector-store.ts`<br/>• `src/app/api/pdf/ingest-local/route.ts`<br/>• `src/lib/ai-settings/`<br/>• `src/app/api/chat/route.ts` |
| **`docs/USER_GUIDE.md`**<br/>*(Przewodnik Gracza)* | • Kreator badacza (charakterystyki, zawód)<br/>• Tacka na Kości (k100, progi, Push Roll, Szczęście)<br/>• Tryb Hot Seat (1-2 graczy)<br/>• Zapis i wczytanie sesji | • `src/components/character-sheet/`<br/>• `src/components/dice/dice-tray.tsx`<br/>• `src/lib/dice-utils.ts`<br/>• `src/components/chat/hot-seat-banner.tsx` |
| **`docs/ROADMAP-MECHANIKI-AI.md`**<br/>*(Roadmapa rozwoju)* | • **Etap 1**: Mechanika tempa i bodźce<br/>• **Etap 2**: System "Koniec Sesji"<br/>• **Etap 3**: Pipeline Ingestion przygód<br/>• **Etap 4**: Gotowe przygody Quick-Start | • `src/lib/pacing-controller.ts`<br/>• `src/components/sidebar/cthulhu-sidebar.tsx`<br/>• `src/components/chat/message-input.tsx`<br/>• `src/lib/adventure-loader.ts` |
| **`docs/TESTING.md`**<br/>*(Standardy testowania)* | • Testy jednostkowe Jest (`__tests__/`)<br/>• Kontrola typów TypeScript (`npx tsc`)<br/>• Git Hooks (Husky pre-commit / pre-push) | • `jest.config.js`<br/>• `package.json`<br/>• `.husky/pre-commit`<br/>• `.husky/pre-push` |
| **`SETUP.md`**<br/>*(Instrukcja setupu)* | • Wprowadzanie klucza Gemini API<br/>• Ingestion własnego PDF<br/>• Launcher `.app` na macOS | • `src/components/onboarding/`<br/>• `src/hooks/useFirstRun.ts`<br/>• `desktop/build-app.sh` |
| **`SECURITY.md`**<br/>*(Polityka bezpieczeństwa)* | • Przechowywanie kluczy API<br/>• Brak chmury i brak telemetrii PII<br/>• Przepływ danych w 100% lokalny | • `src/app/api/chat/route.ts`<br/>• `.env.example`<br/>• `src/lib/telemetry.ts` |
| **`.agent/plans/ekwipunek-*.md`**<br/>*(Plany ekwipunku i assetów)* | • Lokalny katalog CoC 7e<br/>• Wyłączanie generowania AI dla assetów<br/>• Dedykowane ikony epoki | • `src/lib/equipment/equipment-catalog.ts`<br/>• `src/components/equipment/`<br/>• `src/hooks/useImageGenerationQueue.ts` |

---

## 🛠️ Procedura Aktualizacji Mapy (Zewdrzewko Update)

W przypadku wprowadzania zmian w dowolnym pliku z powyższej tabeli:
1. **Zmiana w instrukcji / prompcie (`.md`)**: Zawsze sprawdzić odpowiadający plik źródłowy w `src/` i zaktualizować go w tym samym kroku.
2. **Synchronizacja promptu testowego**: Po modyfikacji `public/default-gm-prompt.md` należy zawsze upewnić się, że plik `_tester/_base/.silnik/public/default-gm-prompt.md` jest w 100% identyczny (weryfikacja poleceniem `diff -u`).
3. **Weryfikacja integracyjna**: Po każdej zmianie w instrukcjach lub mapie należy uruchomić kontrole typów:
   ```bash
   npx tsc --noEmit
   npm test
   ```
