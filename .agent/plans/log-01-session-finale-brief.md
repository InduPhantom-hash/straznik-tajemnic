## Brief: LOG-01 Dwuetapowy Przepływ Koniec Sesji & Faza Rozwoju CoC 7e
**Co**: Wprowadzenie dwuetapowego przepływu zamykania sesji z pytaniem `[Co robisz?]` dla finałowej akcji badacza oraz osadzoną Fazą Rozwoju CoC 7e na dole czatu.
**Jak**: Podział protokołu backendowego na 2 kroki, obsługa etapu `sessionEndStatus` w `useChat.ts`, przekazanie stanów w `page.tsx` i renderowanie komponentu `DevelopmentPhaseCard` pod ostatnią wiadomością MG.
**Pliki**: `default-gm-prompt.md`, `run-chat-pipeline.ts`, `useChat.ts`, `page.tsx`, `CthulhuSidebar.tsx`, `MessageInput.tsx`, `MessageCard.tsx`, `DevelopmentPhaseCard.tsx`
**Test**: `npx tsc --noEmit` oraz `npx jest`
**Ryzyko**: Brak (rozwiązania przetestowane i wyizolowane).
