## Brief: Jakość Językowa LLM [LNG-01 & LNG-02] (punkt 6 z bug.md)
**Co**: Wprowadzenie twardych dyrektyw systemowych wymuszających system metryczny (`[LNG-01]`) oraz czystą polszczyznę bez Ponglishu (`[LNG-02]`).
**Jak**: Rozszerzenie `lovecraft-style-guide.ts` i `gm-protocol.ts` o nowe sekcje zasad oraz dodanie testu jednostkowego Jest w `prompts-generator.test.ts`.
**Pliki**: `lovecraft-style-guide.ts`, `gm-protocol.ts`, `prompts-generator.test.ts` [NEW].
**Test**: `npx tsc --noEmit` oraz `npm test -- prompts-generator.test.ts`.
**Ryzyko**: Ryzyko pomijania angielskich tagów TTS (`[whispers]`) – zapobiegnie temu precyzyjny wyjątek w instrukcji promptu.
