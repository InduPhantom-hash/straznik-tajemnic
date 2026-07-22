## Brief: Dynamiczny i Klimatyczny Wskaźnik Pogody
**Co**: Wprowadzenie klimatycznego wskaźnika pogody na pasku statusu (UI), kierowanego wolą Mistrza Gry (`[POGODA:]`) oraz przygodą.
**Jak**: Rozszerzenie `timeManager` o stan pogody, dodanie tagu `[POGODA:]` w `cleanup.ts`, wyświetlanie w `CampaignClock` oraz przekazywanie pogody do promptu LLM i generatora obrazów.
**Pliki**: `time-manager.ts`, `cleanup.ts`, `campaign-clock.tsx`, `build-time-context.ts`, `image-instructions.ts`.
**Test**: `npm test` oraz `npx tsc --noEmit`.
**Ryzyko**: Wyciek nowego tagu systemowego do głosu lektora (zabezpieczone w `cleanup.ts`).
