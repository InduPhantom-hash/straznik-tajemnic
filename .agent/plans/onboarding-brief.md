## Brief: Onboarding & Ekran Startowy (Etap 0.5)
**Co**: Wymuszamy walidację klucza Gemini na starcie (Krok 1) oraz wymieniamy stare menu z `WelcomeScreen` na 2 klimatyczne karty "Szybki start" / "Manualny setup" (Krok 2 i 3).
**Jak**: Usuniemy stary kloc nawigacyjny `<OnboardingButtons />`, a w `page.tsx` wstawimy strażnika blokującego dostęp do pulpitu w razie braku kluczy API.
**Pliki**: `page.tsx`, `welcome/index.tsx`, `welcome/components/start-mode-cards.tsx` [Nowy]
**Test**: Odświeżenie aplikacji z pustym localStorage musi ukazać konfigurator API, a po akceptacji – widać nowy, klimatyczny layout startowy zamiast wielokrokowego menu.
**Ryzyko**: Średnie (wymaga ostrożnego zintegrowania stanu `hasRequiredKeys` w `page.tsx`).
