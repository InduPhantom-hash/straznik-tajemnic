## Brief: Przywrócenie przycisku Obrazy i eliminacja błędów w czacie

**Co**: Przywrócenie opcji "Obrazy: Wł / Wył" w pasku bocznym oraz zabezpieczenie przed generowaniem obrazów i błędami w czacie po Zimnym Starcie.  
**Jak**: Przekazanie `aiSettings` i `onUpdateAISettings` do `CthulhuSidebar` w `page.tsx` oraz sprawdzenie przełącznika `imageGenerationEnabled` w `useGameStart` i `useChat`.  
**Pliki**: `src/app/page.tsx`, `src/hooks/useGameStart.ts`, `src/hooks/useChat.ts`.  
**Test**: Weryfikacja obecności przycisku w panelu bocznym oraz próba Zimnego Startu przy wyłączonych obrazach (brak błędów API w chatu).  
**Ryzyko**: Bardzo niskie (zmiany ograniczone do przekazania props i prostej kontroli warunkowej).  
