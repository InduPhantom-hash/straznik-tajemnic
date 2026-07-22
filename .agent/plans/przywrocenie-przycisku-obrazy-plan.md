## Plan: Przywrócenie przycisku "Obrazy" i zabezpieczenie przed błędami w czacie

Data: 2026-07-22  
Złożoność: Prosta  

### Problem
1. W bocznym panelu (`CthulhuSidebar`) zniknął przycisk przełączania obrazów "Obrazy: Wł / Wył".
2. Podczas Zimnego Startu / nowej przygody wywoływane jest generowanie obrazu intro. Przy braku klucza API obrazów w czacie pojawia się komunikat o błędzie. Ponadto wyłączenie opcji obrazów nie powstrzymywało generowania obrazów w `useGameStart` i `useChat`.

### Rozwiązanie
1. Przekazać `aiSettings={aiSettings}` oraz `onUpdateAISettings={setAiSettings}` (z zapisem przez `saveAISettings`) z `page.tsx` do `<CthulhuSidebar />`.
2. Dodanie sprawdzania `aiSettings?.imageGenerationEnabled !== false` w:
   - `useGameStart.ts` przy `generateIntroImage()` (aby nie próbował generować intro i nie sypał błędami w czacie przy wyłączonych obrazach lub braku kluczy),
   - `useChat.ts` przy `generateImages` w handlerze `onMetadata` (aby respektował szybki wyłącznik obrazów z paska bocznego).

### Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
|------|--------|--------|
| `src/app/page.tsx` | Przekazanie `aiSettings` i `onUpdateAISettings` do `CthulhuSidebar` | Niskie |
| `src/hooks/useGameStart.ts` | Dodanie warunku `aiSettings?.imageGenerationEnabled !== false` przed wywołaniem `generateIntroImage()` | Niskie |
| `src/hooks/useChat.ts` | Dodanie sprawdzania `options.aiSettings?.imageGenerationEnabled !== false` przed wywołaniem `generateImages()` | Niskie |

### Fazy implementacji

**Faza 1: Poprawka widoczności przycisku i obsługa w hookach**
- [ ] Przekazać propsy `aiSettings` i `onUpdateAISettings` w `src/app/page.tsx`.
- [ ] Zabezpieczyć `generateIntroImage()` w `src/hooks/useGameStart.ts`.
- [ ] Zabezpieczyć `generateImages` w `src/hooks/useChat.ts`.
- Weryfikacja: Uruchomienie `npm run build` oraz sprawdzenie interfejsu i wywołań w czacie.

### Weryfikacja końcowa
- Build projektu: `npm run build`
- Testy automatyczne (jeśli dotyczą): `npx jest src/app/api/chat`

### Co może się zepsuć
- Przełączenie przycisku w pasek bocznym musi od razu zaktualizować stan w `page.tsx` (obsługiwane synchronicznie przez `setAiSettings` i `saveAISettings`).
