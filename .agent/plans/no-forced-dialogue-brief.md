## Brief: Usunięcie wymuszania rozmów i zmiana pytania końcowego dla drużyny
**Co**: Usunięcie nakazu dyskusji między graczami z promptów oraz ujednolicenie pytania końcowego dla drużyny.
**Jak**: Zmiana promptów w `useGameStart.ts`, `build-context.ts` oraz `gm-protocol.ts` tak, aby w grze na ≥2 osoby tura kończyła się pytaniem `[Co robicie?]`.
**Pliki**: `src/hooks/useGameStart.ts`, `src/app/api/chat/_helpers/build-context.ts`, `src/lib/prompts/gm-protocol.ts`.
**Test**: `npx tsc --noEmit`.
**Ryzyko**: Niskie (zmiana wyłącznie treści promptów dla LLM).
