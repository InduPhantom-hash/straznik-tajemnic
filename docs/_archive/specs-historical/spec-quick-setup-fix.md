# Specyfikacja Naprawy: Bug Quick Setup i Zimny Start

## Kontekst (Bug)
Gracz wchodzi w interfejs, klika "Quick Setup" (lub Ustawienia Ręczne) i bez względu na to, co wybierze, zostaje z powrotem odrzucony do ekranu wyboru Onboardingu (menu startowe) i nie startuje mu sesja.

## Przepływ pracy dla Agenta-Makera
Twoim zadaniem jest znalezienie i zmodyfikowanie plików, o których mowa poniżej, uruchomienie twardej weryfikacji i zamknięcie pętli `dev-loop`.

### 1. Naprawa powrotu do Menu z Quick Setup (`page.tsx`)
**Problem:** W handlerze `handleQuickStartOnboarding` brak jest poinformowania aplikacji o ukończeniu onboardingu.
Nawet po wybraniu "Quick Setup", stan o ukończeniu wizardu `needsWizard` w `firstRun` jest cały czas `true` na cold-starcie. Warunek w kodzie sprawdza `!firstRun.needsWizard` i nie ustawia `pendingGameStart`.

**Rozwiązanie:** 
1. Znajdź plik odpowiedzialny za start z modala Quick Setup (zazwyczaj główny plik `page.tsx` w `src/app/page.tsx` lub `_tester/.../src/app/page.tsx`). Znajdź tam funkcję obsługującą start (np. `handleQuickStartOnboarding`).
2. Dopisz wymuszenie LocalStorage **przed** ustawianiem rozpoczęcia gry: 
   `localStorage.setItem('onboarding_completed', 'true');`
3. Usun z logiki blokującej występowanie sprawdzania `!firstRun.needsWizard` w warunku dla Quick Setup (bo Quick Setup celowo OMIJA standardowy wizard). Przykładowo warunek: `if (!firstRun.loading && !firstRun.needsWizard)` powinien zostać po prostu odblokowany na `if (!firstRun.loading) { setPendingGameStart(true) }` w bloku handlerów szybkiego startu. Zwróć na to uwagę kontekstowo.

### 2. Drobna poprawka etykiety (Bug 2)
**Problem:** Biografia ma mylący nagłówek.
**Rozwiązanie:** 
Znajdź plik `sheet-biography.tsx` (np. `src/components/chat/sidebar/sheet-biography.tsx`). Zmień sztywny nagłówek: `"🔗 Kluczowa Więź / Maska"` na `"🔗 Tło i Rola Fabularna"`.

### 3. Faza Linter / CI (Checker)
Po modyfikacji plików **MUSISZ** samodzielnie uruchomić kompilację, linter i testy używając CLI (np. `npm run build` i polecenia typu `npm run lint`).
Jeśli polecenia wyrzucą błąd, NIE WRACAJ Z LOGAMI DO ORKIESTRATORA LUB UŻYTKOWNIKA. 
Przeanalizuj błąd z CLI, wyedytuj poprawkę i powtórz polecenie. Masz do dyspozycji maksymalnie 5 prób weryfikacyjnych. Zakończ dopiero wtedy, gdy silnik kompiluje się na zielono.
