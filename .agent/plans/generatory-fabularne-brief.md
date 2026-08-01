## Brief: Generatory Fabularne (Etap 3.5)
**Co**: Podpięcie przycisku "Użyj w Grze" w panelu MG, żeby wylosowane zdarzenie (pogoda, NPC, atmosfera) trafiało do najbliższej odpowiedzi AI jako ukryta instrukcja reżyserska.
**Jak**: Piggybacking - zdarzenie ląduje w buforze React (`pendingDirectorEvent`), a przy następnym `handleSendMessage` jest dołączane do `body` i wstrzykiwane w `additionalContext` backendu. AI wplata je naturalnie w narrację. Zero asynchroniczności, zero problemów z TTS/modalami.
**Pliki**: `gm-tools-modal.tsx`, `page.tsx`, `useChat.ts`, `run-chat-pipeline.ts`, `build-context.ts`, `gm-protocol.ts`
**Test**: Panel MG -> Generator -> "Użyj w Grze" -> wyślij wiadomość -> AI opisuje zdarzenie w odpowiedzi
**Ryzyko**: Niskie. Żaden istniejący przepływ nie jest naruszony - dodajemy opcjonalne pole do istniejącego body.
