## Plan: Onboarding & Ekran Startowy (Etap 0.5)
Data: 2026-07-29
Złożoność: Średnia

### Problem
Aplikacja pozwalała graczowi wejść do głównego widoku gry bez podanego klucza Gemini API, a ekran powitalny posiadał martwe linki i przeładowane stare menu (`OnboardingButtons`), które nie pasuje do nowej wizji szybkiego i manualnego startu gry (Quick Setup / Manual Setup). 

### Rozwiązanie
Zablokujemy wejście do gry przez wdrożenie w `useFirstRun` warunku asynchronicznie korzystającego z `hasRequiredKeys()`, wymuszając okno kluczy dla nowych sesji. Z ekranu `WelcomeScreen` usuniemy całkowicie stary komponent menu (`<OnboardingButtons />`), a także jego osierocony plik. Dodamy dwa duże, klimatyczne kafelki wyboru ("Quick Setup" i "Manual Setup") na bazie Tailwind, wyłączając i modyfikując odpowiednio łamiące się testy E2E (Playwright).

### Spec Quality Gate (UI Definition)
- **Boundaries (Czego NIE robimy):** Nie implementujemy funkcjonalności (logiki biznesowej) samej szybkiej i manualnej gry – oba nowe przyciski będą na tym etapie wywoływały jedynie Toast z komunikatem "W budowie..." (Placeholdery UI).
- **Verification:** 
  1. Wyczyszczenie localStorage powoduje przymusowe wymuszenie `FirstRunWizard` (brak możliwości ominięcia API).
  2. Kliknięcie "Quick Setup" odpala Toasta. 
  3. Karta "Wznów sesję" (o ile istnieje zapis) renderuje się w jednej linii z nowymi kartami bez łamania flex/grid na dużym ekranie.
- **Examples (Sztywne dane UI):** 
  - *Quick Setup*: Ikona Błyskawicy (Lucide `Zap`), tytuł: "Szybka Przygoda", podtytuł: "Wskocz prosto w akcję z predefiniowaną postacią."
  - *Manual Setup*: Ikona Notatnika/Zębatki (Lucide `BookOpen` / `Settings`), tytuł: "Ustawienia Ręczne", podtytuł: "Wybierz własną przygodę i dobierz skład drużyny."

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/hooks/useFirstRun.ts` | Rozszerzenie mechanizmu o weryfikację `hasRequiredKeys()` (Client-side, wewnątrz `useEffect`, by uniknąć Mismatchu Hydratacji). | Wysokie |
| `_tester/_base/.silnik/src/components/chat/welcome/index.tsx` | Usunięcie `<OnboardingButtons />`, układ flex/grid pod nowe kafelki. | Średnie |
| `_tester/_base/.silnik/src/components/chat/welcome/components/onboarding-buttons.tsx` | [USUNĄĆ PLIK] Całkowite skasowanie martwego pliku starego menu. | Niskie |
| `_tester/_base/.silnik/src/components/chat/welcome/components/start-mode-cards.tsx` | [NOWY PLIK] Dwie karty UI (Quick/Manual) korzystające z wzorców diegetycznych. | Niskie |
| `tests/e2e/homepage.spec.ts` (oraz `feature-2-game-start.spec.ts`) | Aktualizacja w asercjach Playwright — usunięcie `getByRole` szukających starych przycisków i weryfikacja istnienia kart "Szybka Przygoda". | Średnie |

### Fazy implementacji

**Faza 1: Weryfikacja klucza (Krok 1 Onboardingu)**
- [ ] Import `hasRequiredKeys()` z `@/lib/api-keys-service.ts` do `useFirstRun.ts`.
- [ ] Zabezpieczenie przed hydratacją (wymuszanie sprawdzania tylko po zamontowaniu komponentu). Jeżeli `hasRequiredKeys()` zwróci false, wymuś `FirstRunWizard`.
- Weryfikacja: `localStorage.clear()` uruchamia okno kluczy.

**Faza 2: Czyszczenie `WelcomeScreen` i porządki (Krok 2 Onboardingu)**
- [ ] Usunięcie z `index.tsx` importu i użycia `<OnboardingButtons />`.
- [ ] Usunięcie z widoku martwych sprawdzianów `hasAdventure`.
- [ ] Skasowanie całego pliku `onboarding-buttons.tsx`.
- Weryfikacja: Puste, ciemne tło (tylko z "Wznów sesję") na ekranie.

**Faza 3: Nowe tryby startu (Krok 3 Onboardingu)**
- [ ] Utworzenie pliku `start-mode-cards.tsx`.
- [ ] Zbudowanie wewnątrz kart `QuickSetupCard` i `ManualSetupCard` na podstawie wytycznych *Examples*. (Kliknięcie -> Toast `W budowie...`).
- [ ] Osadzenie obu obok `ResumeCard` w `index.tsx`.
- Weryfikacja: Obecność 2 dużych kafelków startowych.

**Faza 4: Aktualizacja testów E2E**
- [ ] Naprawa `homepage.spec.ts` i `feature-2-game-start.spec.ts` pod kątem nowych przycisków startowych i braku starego menu.
- Weryfikacja: Komenda `npx playwright test` nie wyrzuca błędów z nieodnalezionymi przyciskami starego flow.

### Weryfikacja końcowa
- `npm run dev` wewnątrz `.silnik` i weryfikacja manualna klikalności w oparciu o *Verification* Spec Checku.
- `npm run test` dla weryfikacji regresji. 
