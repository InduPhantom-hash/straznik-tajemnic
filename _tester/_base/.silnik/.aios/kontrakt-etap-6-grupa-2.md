# Kontrakt Wykonawczy: Etap 6 - Translacja Interfejsu (Grupa 2) - v6

**Projekt:** Strażnik Tajemnic AI
**Zadanie:** Ekstrakcja i internacjonalizacja (i18n) ciągów znaków (Onboarding i Kreator Postaci)
**Stack:** Next.js + `next-intl`
**Lokalizacja CWD:** `_tester/_base/.silnik`

## 1. Kontekst Zadania
Celem questa (Grupa 2) jest dokończenie wdrożenia obsługi wielojęzyczności (`next-intl`) w procesach Startu Aplikacji oraz Kreatora Postaci. Wykonawca musi wyczyścić surowe teksty z 7 ściśle zdefiniowanych plików, wdrożyć twarde scenariusze testów wizualnych E2E z zapisem artefaktów do wyznaczonych ścieżek przez `path.resolve`, bez żadnego odstępstwa od instrukcji.

## 2. Zamknięta Lista Plików i Sztywna Mapa Namespace'ów
Koder nie ma prawa tworzyć ani dziedziczyć innych przestrzeni (namespace'ów) niż wymienione poniżej. Każdy z komponentów posiada przypisaną, autonomiczną i zamkniętą przestrzeń w plikach `.json`.

### A. Moduł Onboardingu
1. `src/components/onboarding/FirstRunWizard.tsx` -> **Namespace: `FirstRunWizard`**
2. `src/components/onboarding/steps/step-gemini-key.tsx` -> **Namespace: `StepGeminiKey`**
3. `src/components/onboarding/steps/step-content-sources.tsx` -> **Namespace: `StepContentSources`**
4. `src/components/onboarding/steps/step-upload-rulebook.tsx` -> **Namespace: `StepUploadRulebook`**
5. `src/components/onboarding/steps/step-welcome-gm.tsx` -> **Namespace: `StepWelcomeGM`**
6. `src/components/onboarding/language-selection-modal.tsx` -> **Namespace: `LanguageSelection`**

- **Wytyczne audytu:**
  Zlokalizuj wszystkie niesparowane z `next-intl` ciągi znaków (w tym pola atrybutów `placeholder`, `title`, `aria-label`) dla formularzy konfiguracyjnych API i wprowadzania plików.

### B. Kreator Postaci
7. `src/components/ui/character-wizard.tsx` -> **Namespace: `CharacterWizard`**

- **Wytyczne audytu:**
  - Przetłumacz sztywne stany zagnieżdżone w komponentach: `"⏳ Generuję..."`, `"✨ Generuj"` oraz puste opcje: `<option value="">Wybierz...</option>`.
  - Zabezpiecz atrybuty DOM widoczne dla gracza: `title="Rekomendowane dla archetypu"` oraz `placeholder="np. John Smith"`.
  - Składnię struktury merytorycznej: `"Ideologia:"`, `"Ważne osoby:"`, `"Przymioty:"` (budującą kontekst dla bazy wiedzy w formacie tekstowym w tle) zignoruj – translacja obejmuje wyłącznie elementy czystego UI interaktywnego dla gracza.

## 3. Wytyczne Implementacyjne i Twarde Testy E2E (Playwright)
1. **Edycja Słowników (`messages/`):**
   - Uzupełnij `messages/pl.json` oraz `messages/en.json` używając notacji `camelCase`.
2. **Maszynowa Walidacja JSON:**
   - Wykonawca musi wywołać skrypt weryfikujący zgodność 1:1 struktury drzewa (kluczy) pomiędzy plikami `pl.json` i `en.json`. Zignorowanie niezgodności skutkuje odrzuceniem PR.
3. **Kompilacja Typów:**
   - Obowiązkowe uruchomienie komendy w CWD (`_tester/_base/.silnik`): `npx tsc --noEmit`. Wymagany pełen powrót z kodem 0 (PASS).
4. **Scenariusze E2E w Playwright - Zero Luzu Decyzyjnego:**
   Testy muszą zostać uruchomione oddzielnie dla wariantu `NEXT_LOCALE=en` oraz `NEXT_LOCALE=pl` (wymuszenie wstrzyknięciem cookie w Playwright). Brak innych ścieżek dostępowych jest akceptowany.
   
   **Scenariusz A: Onboarding**
   - **Krok 1:** Nawiguj wprost pod bazowy adres: `http://localhost:3000/`.
   - **Krok 2:** Wykonaj asercję obecności głównego kontenera: `await expect(page.locator('h1')).toBeVisible()`.
   - **Krok 3 (Baseline):** Uruchom domyślne sprawdzanie regresji wizualnej: `await expect(page).toHaveScreenshot()`.
   - **Krok 4 (Artefakt):** Wykonaj zrzut ekranu używając absolutnej ścieżki systemowej:
     `await page.screenshot({ path: path.resolve(process.cwd(), 'test-results/onboarding-[LOCALE].png') })`

   **Scenariusz B: Kreator Postaci**
   - **Krok 1:** Nawiguj pod adres bazowy: `http://localhost:3000/`.
   - **Krok 2:** Kliknij przycisk otwarcia kreatora postaci dokładnie za pomocą komendy: `await page.getByTestId('open-character-wizard').click()`.
   - **Krok 3:** Wykonaj asercję oczekującą renderowania modalu kreatora: `await expect(page.getByTestId('character-wizard-modal')).toBeVisible()`.
   - **Krok 4 (Baseline):** Uruchom sprawdzanie regresji: `await expect(page).toHaveScreenshot()`.
   - **Krok 5 (Artefakt):** Wykonaj zrzut artefaktu, wpisując rygorystycznie komendę (rozwiązującą ścieżkę z aktualnego katalogu):
     `await page.screenshot({ path: path.resolve(process.cwd(), 'test-results/character-creator-[LOCALE].png') })`

## 4. Kryteria Zakończenia (Dla Audytora)
- [ ] Oczyszczono z hardkodowanych tekstów wymienione 7 komponentów.
- [ ] Zastosowano sztywną mapę 7 podanych namespace'ów.
- [ ] Zgodność struktury JSON (PL i EN) została bezbłędnie zweryfikowana z wykorzystaniem skryptu sprawdzającego 1:1.
- [ ] Kod kompiluje się czysto (`npx tsc --noEmit`).
- [ ] Test E2E przeszedł poprawnie wykorzystując wyłącznie zadeklarowane metody `.getByTestId()` i wygenerował namacalne zrzuty graficzne PNG w rygorystycznym formacie z użyciem procedury zapisu `path.resolve` obok standardowych snapshotów regresyjnych. Zapisane pliki referencyjne:
  - `_tester/_base/.silnik/test-results/onboarding-en.png`
  - `_tester/_base/.silnik/test-results/onboarding-pl.png`
  - `_tester/_base/.silnik/test-results/character-creator-en.png`
  - `_tester/_base/.silnik/test-results/character-creator-pl.png`
