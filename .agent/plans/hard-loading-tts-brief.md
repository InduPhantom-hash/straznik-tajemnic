## Brief: Hard-loading screen (TTS)
**Co**: Usunięcie "cichego startu" poprzez ekran blokujący grę do pobrania pierwszego pliku audio TTS.
**Jak**: Dodanie flagi ładującej z timeoutem w `useTTS.ts` i czarnego ekranu (overlay) w `chat-window/index.tsx`.
**Pliki**: `useTTS.ts`, `chat-window/index.tsx`.
**Test**: Wymuszony start gry i sprawdzenie synchroniczności głosu i UI.
**Ryzyko**: Race conditions i nieskończony ekran ładowania przy awarii API.
