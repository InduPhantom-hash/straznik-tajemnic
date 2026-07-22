## Brief: Naprawa obrazów (mitologia Cthulhu) i głosów NPC

**Co**: Obrazy wciąż pokazują Cthulhu/macki mimo zmian w instrukcjach AI, a NPC mówią głosem lektora zamiast indywidualnych głosów.

**Jak**: 3 fazy, 12 plików. Faza 1: rozszerzenie warunku multi-voice z ULTRA na HIGH + ULTRA i naprawienie regexa parsującego dialogi na format `Imię: „treść”` zamiast martwego `@Imię:`. Faza 2: usunięcie "Call of Cthulhu style" z 4 hardcoded promptów obrazów. Faza 3: serwerowy filtr słów mitologii (Cthulhu, tentacle, eldritch...) w `/api/imagen` z wyjątkiem dla scen oznaczonych przez LLM znacznikiem `| mythos`.

**Pliki**: `useTTS.ts`, `definitions.ts`, `defaults.ts`, `useGameStart.ts`, `character-wizard.tsx`, `npc-manager.tsx`, `location-manager.tsx`, `imagen/route.ts`, `media-parser.ts`, `types.ts`, `useChat.ts`, `image-instructions.ts`

**Test**: `npm run lint` + `npx tsc --noEmit`. Ręczny smoke: start przygody HIGH - dialog NPC ma inny głos, obraz intro jest realistyczny. Testy e2e bez zmian.

**Ryzyko**: Główne - filtr mitów zbyt agresywny (np. "ritual" w "morning ritual"). Łagodzone przez \b word boundaries i to że wycięte słowa nie psują promptu - zostaje czysty opis, zawsze z realistycznym suffixem.