## Research: Onboarding & Ekran Startowy (Etap 0.5)
Data: 2026-07-29
Stack: Next.js, React (projekt zagnieżdżony w `_tester/_base/.silnik/src/`)

### Obszar problemu
- `_tester/_base/.silnik/src/app/page.tsx` — główny plik UI, w którym znajduje się logika stanu gry. Z niego będziemy usuwać zbędne, testowe "obce linki" (menu do różnych podstron deweloperskich).
- `_tester/_base/.silnik/src/components/chat/welcome/index.tsx` (`WelcomeScreen`) — to tutaj fizycznie renderowany jest ekran startowy (tło, świeca, powitanie) oraz stary, skomplikowany system menu `<OnboardingButtons />`. To z tego pliku docelowo wytniemy menu, robiąc miejsce na 2 przyciski: "Quick Setup" i "Manual Setup".
- `_tester/_base/.silnik/src/components/onboarding/FirstRunWizard.tsx` — główny wrapper procesu inicjalizacyjnego.
- `_tester/_base/.silnik/src/components/onboarding/steps/step-gemini-key.tsx` — już zaimplementowany krok obsługujący wprowadzanie i weryfikowanie klucza Gemini.

### Zależności
- Klucze API (zgodnie z zasadą Bring Your Own Key) są przechowywane w `localStorage` pod kluczami `zew-app-api-keys` i `ai_settings`.
- Do obsługi cyklu życia kluczy służy ujednolicony interfejs: `@/lib/api-keys-service.ts`. Hookuje on klucz do zapytań (funkcja `getApiKeyHeaders()`).
- Za proces faktycznej autoryzacji wpisanego klucza w komponencie `step-gemini-key.tsx` odpowiada funkcja `geminiService.checkAPIStatus(key)`, która robi asynchroniczny test-call do `/api/chat-test`. 

### Istniejące testy i mechanizmy
- Projekt (w warstwie E2E) polega na frameworku Playwright (`tests/e2e/homepage.spec.ts`, `feature-2-game-start.spec.ts`). Walidują one m.in. główny ekran i powitalne komponenty. 
- Aplikacja obecnie ma również gotowy `StepUploadRulebook.tsx` korzystający z endpoitu `/api/pdf/ingest-local` do wektoryzacji podręcznika (z funkcją obejścia przez 'starter').

### Ryzyka i uwagi
- **Złudzenie struktury katalogów:** Najważniejsze ryzyko, które potwierdziliśmy – prawdziwy działający kod znajduje się w `_tester/_base/.silnik/src/`. Główny `src/` to odnoga archiwalna/martwa. Trzeba na to bezwzględnie uważać przy edycji!
- Blokada gry bez klucza sprowadza się de facto do poprawnego uruchomienia `FirstRunWizard` w `page.tsx` w oparciu o weryfikację.
- Przy usuwaniu menu z `WelcomeScreen` (Krok 2) należy uważać, by nie usunąć komponentu `ResumeCard` ("Wznów sesję"), który jest bardzo wartościowy dla graczy powracających. 

### Rekomendowany następny krok
Przejście do `/dev-2-plan`, aby formalnie zaplanować oczyszczenie `WelcomeScreen` (Krok 2), wymuszenie w `page.tsx` FirstRunWizard-a jeśli brakuje klucza (Krok 1) oraz rozplanować układ przycisków startu: Quick Setup vs Manual (Krok 3).
