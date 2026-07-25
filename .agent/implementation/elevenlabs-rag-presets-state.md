## ✅ Faza 1 zakończona: Przywrócenie ElevenLabs API & Mapowanie NPC

**Zmiany:**
- `src/app/api/tts/elevenlabs/route.ts` [NEW]: Endpoint ElevenLabs z BYOK, retry, rate-limit handling, Sentry i cost tracking
- `src/app/api/tts/route.ts`: Rejestracja providera `elevenlabs` + forward nagłówka `X-ElevenLabs-Api-Key`
- `_tester/_base/.silnik/src/lib/ai-settings/types.ts`: Dodanie `'elevenlabs'` do union `voiceSettings.provider` + pola konfiguracyjne
- `_tester/_base/.silnik/src/lib/npc-voice-mapping.ts`: Nowy interfejs `ElevenLabsNpcVoiceConfig`

**Weryfikacja:** TypeScript: PASS | Brak regresji testów

---

## ✅ Faza 2 zakończona: Przebudowa Presetów Jakości

**Zmiany:**
- `definitions.ts`: LOW=pure text | MID=standard Gemini | HIGH=hybryda ElevenLabs | ULTRA=pełne słuchowisko ElevenLabs Pro
- `model-registry.ts`: Drift-guard mirror zaktualizowany
- `apply.ts`: Obsługa `elevenLabsModelKey` w applyPreset
- `useTTS.ts`: Logika wyboru ElevenLabs vs Gemini TTS + przezroczysty fallback

**Weryfikacja:** TypeScript: PASS | Testy: 137/142 (5 pre-istniejących failures)

---

## ✅ Faza 3 zakończona: Integracja Client-Side Chrome AI Nano z RAG

**Zmiany:**
- `src/types/window-ai.d.ts` [NEW]: Deklaracje typów Chrome Built-in AI API
- `src/lib/chrome-ai-reranker.ts` [NEW]: Kliencki re-ranker RAG (singleton Nano, passthrough fallback)
- `src/components/help-modal/HelpAssistantTab.tsx`: Integracja Nano (wskaźnik statusu, auto-init/cleanup, re-ranking)

**Weryfikacja:** TypeScript: PASS

---

## 🎉 Implementacja zakończona: ElevenLabs + Presety + Chrome AI Nano

**Zmodyfikowane pliki (łącznie 10):**
- `src/app/api/tts/elevenlabs/route.ts` [NEW]
- `src/app/api/tts/route.ts`
- `_tester/_base/.silnik/src/lib/ai-settings/types.ts`
- `_tester/_base/.silnik/src/lib/npc-voice-mapping.ts`
- `_tester/_base/.silnik/src/lib/ai-presets/definitions.ts`
- `_tester/_base/.silnik/src/lib/model-registry.ts`
- `_tester/_base/.silnik/src/lib/ai-presets/apply.ts`
- `_tester/_base/.silnik/src/hooks/useTTS.ts`
- `_tester/_base/.silnik/src/types/window-ai.d.ts` [NEW]
- `_tester/_base/.silnik/src/lib/chrome-ai-reranker.ts` [NEW]
- `_tester/_base/.silnik/src/components/help-modal/HelpAssistantTab.tsx`

**Weryfikacja końcowa:**
- TypeScript: PASS (`npx tsc --noEmit` - 0 błędów)
- Testy: PASS 137/142 (5 pre-istniejących failures niezwiązanych ze zmianami)

**Znalezione przy okazji (nienaprawione):**
- `src/app/api/equipment/generate-starting/route.test.ts`: Test fixture failure (pre-istniejący)
- `src/components/ui/investigator-board.test.tsx`: Filter test failure (pre-istniejący)
