## Plan: Integracja ElevenLabs TTS, Synergia Chrome Built-in AI z RAG oraz Nowe Presety Jakości

Data: 2026-07-25 (po review `/dev-3-plan-review`)  
Złożoność: Duża (3 fazy wdrożeniowe)

---

### Problem
1. Porzucenie ElevenLabs w sesji 146 pozbawiło aplikację możliwości generowania słuchowiska radiowego z emocjami i unikalnymi głosami aktorów NPC.
2. Surowy kontekst RAG z podręczników (15-20 fragmentów) jest przesyłany w całości do chmurowego Gemini API - zbędny szum tokenowy.
3. Presety jakości nie mają wyraźnego trybu pure-text ani hybrydowego ElevenLabs.

### Rozwiązanie
Trzyfazowe wdrożenie z checkpoint po każdej fazie. Faza 3 (Chrome AI) przeniesiona na stronę klienta (React Hook w Encyklopedii Gracza), nie do serwerowego `run-rag-summary.ts`.

---

### Pliki do modyfikacji (po review - uzupełnione)

| Plik | Zmiana | Ryzyko |
| :--- | :--- | :--- |
| `src/app/api/tts/route.ts` | Rejestracja providera `elevenlabs` + forward nagłówka `X-ElevenLabs-Api-Key` | Niskie |
| `src/app/api/tts/elevenlabs/route.ts` [NEW] | Endpoint ElevenLabs z wyborem modelu + cache + usage tracking | Średnie |
| `src/lib/ai-settings/types.ts` | Dodanie `'elevenlabs'` do union `voiceSettings.provider` + pola `elevenLabsApiKey` | Średnie |
| `src/lib/ai-presets/definitions.ts` | Aktualizacja presetów LOW/MID/HIGH/ULTRA | Średnie |
| `src/lib/ai-presets/apply.ts` | Obsługa nakładania nowych pól ElevenLabs | Niskie |
| `src/lib/model-registry.ts` | Aktualizacja `PRESET_MODELS` mirror (drift-guard) | Niskie |
| `src/lib/npc-voice-mapping.ts` | Rozszerzenie `NPCVoiceConfig` o provider/settings ElevenLabs | Niskie |
| `src/hooks/useTTS.ts` | Obsługa wywołań ElevenLabs + fallback na Gemini TTS przy braku klucza | Wysokie |
| `src/lib/search/chrome-ai-reranker.ts` [NEW] | Moduł CLIENT-SIDE do re-rankingu RAG przez `window.ai` | Średnie |
| `src/types/window-ai.d.ts` [NEW] | Deklaracje typów TS dla `window.ai.languageModel` | Niskie |

---

### Fazy implementacji

#### **Faza 1: Przywrócenie ElevenLabs API & Mapowanie NPC**
- [ ] Utworzenie `src/app/api/tts/elevenlabs/route.ts`
- [ ] Dodanie `elevenlabs` w routerze `src/app/api/tts/route.ts` + forward `X-ElevenLabs-Api-Key`
- [ ] Rozszerzenie `voiceSettings.provider` union w `types.ts` o `'elevenlabs'`
- [ ] Rozszerzenie `NPCVoiceConfig` w `npc-voice-mapping.ts`
- Weryfikacja: `npx tsc --noEmit` + POST `/api/tts` z `provider: "elevenlabs"` zwraca audio

#### **Faza 2: Przebudowa Presetów Jakości**
- [ ] Aktualizacja `definitions.ts` (LOW=pure text, MID=standard, HIGH=hybryda EL, ULTRA=full pro EL)
- [ ] Aktualizacja `PRESET_MODELS` w `model-registry.ts`
- [ ] Dostosowanie `apply.ts` do nowych pól
- [ ] Fallback w `useTTS.ts`: brak klucza ElevenLabs = cichy powrót do Gemini TTS
- Weryfikacja: `npx tsc --noEmit` + `npm test` (drift-guard test pass)

#### **Faza 3: Integracja Client-Side Chrome AI Nano z RAG**
- [ ] Utworzenie `src/types/window-ai.d.ts`
- [ ] Utworzenie `src/lib/search/chrome-ai-reranker.ts` (CLIENT-SIDE hook, nie serwerowy!)
- [ ] Integracja w Encyklopedii Gracza (`HelpAssistantTab.tsx`) jako opcjonalny pre-procesor
- Weryfikacja: `npx tsc --noEmit` + test w konsoli przeglądarki Chrome 127+

---

### Weryfikacja końcowa
- `cd _tester/_base/.silnik && npx tsc --noEmit`
- `cd _tester/_base/.silnik && npm test`
- Ręczny test odtwarzania głosu w UI

### Co może się zepsuć
- **Brak klucza ElevenLabs:** Fallback na Gemini TTS (przezroczysty, bezbłędny).
- **Brak wsparcia Chrome AI:** Fallback na klasyczny RAG bez re-rankingu.
- **Różne formaty audio:** ElevenLabs (MP3) vs Gemini (PCM WAV) - `useTTS` musi obsłużyć oba.
