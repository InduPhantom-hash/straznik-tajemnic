## Brief: Integracja ElevenLabs TTS, Chrome AI RAG & Nowe Presety

**Co**: Przywrócenie słuchowiska ElevenLabs w Strażniku Tajemnic, przebudowa presetów jakości (LOW/MID/HIGH/ULTRA) i darmowa kompresja kontekstu RAG przez Chrome Gemini Nano.  
**Jak**: Dedykowany endpoint ElevenLabs z podziałem na modele `multilingual_v2` / `turbo_v2_5`, rozszerzenie mapowania NPC, uaktualnienie presetów i kliencki re-ranking `window.ai`.  
**Pliki**: `src/app/api/tts/elevenlabs/route.ts`, `src/app/api/tts/route.ts`, `src/lib/ai-presets/definitions.ts`, `src/lib/npc-voice-mapping.ts`, `src/lib/search/chrome-ai-reranker.ts`.  
**Test**: `npx tsc --noEmit && npm run test`.  
**Ryzyko**: Brak klucza ElevenLabs lub braki w obsłudze Chrome AI w starszych wersjach przeglądarek (zabezpieczone automatycznym fallbackiem).
