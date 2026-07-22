# Stan implementacji: Przywrócenie przycisku Obrazy i eliminacja błędów czatu

Data: 2026-07-22

## Zrealizowane fazy
- [x] **Faza 1: Poprawka widoczności przycisku i obsługa w hookach**
  - Modyfikacja `src/app/page.tsx`: przekazano props `aiSettings={aiSettings}` oraz `onUpdateAISettings={(updated) => setAiSettings(updated)}` do `<CthulhuSidebar />`.
  - Modyfikacja `src/hooks/useGameStart.ts`: dodano strażnik `if (aiSettings?.imageGenerationEnabled === false) return;` w `generateIntroImage()`.
  - Modyfikacja `src/hooks/useChat.ts`: dodano warunek `options.aiSettings?.imageGenerationEnabled !== false` przy wywoływaniu `generateImages` w metadanych SSE.
  - Naprawiono test jednostkowy `resolve-settings.test.ts` (deep merge dla `sessionZero`).
  - Naprawiono test jednostkowy `predefined-characters.test.ts` dla bazy 30 postaci i epok.

## Wyniki weryfikacji
- TypeScript check (`npx tsc --noEmit`): PASS (0 błędów)
- Next.js Production Build (`npm run build`): PASS (Build zrealizowany bez błędów)
