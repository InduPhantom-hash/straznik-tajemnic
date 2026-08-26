# Kontrakt Wykonawczy: Poprawka Etap 5 - UI Językowe (v3 po ostatecznym Audycie)

**Cel:** Rozwiązanie problemu "UI wciąż po polsku" na Karcie Badacza, przy jednoczesnym przywróceniu renderowania komponentów ekwipunku, zabezpieczeniu wielojęzyczności przy danych z presetów oraz nałożeniu sztywnej walidacji E2E.

## 1. Kontekst Zadania
Zgłoszono, że po przejściu na język EN, wiele kluczowych elementów wciąż pozostaje po polsku. Audyt wykazał techniczną usterkę, przez którą komponent `SheetEquipment` nie renderuje się na `CharacterSheet` oraz wykryto stałe słownictwo w presetach postaci.

## 2. Instrukcja dla Kodera (Zakres implementacji)
1. **Renderowanie Komponentu (Bugfix):**
   - W pliku `src/components/ui/character-sheet.tsx` (lub `index.tsx`) przywrócić import i wywoływanie podkomponentu `SheetEquipment`.
2. **Lokalizacja Danych Statycznych (Presety):**
   - Należy zlokalizować systemowe presety (dane z plików TS, wstrzykiwane potem do localStorage). Klucze z presetów należy tłumaczyć w locie w oparciu o ich identyfikatory systemowe.
   - **BARDZO WAŻNE:** Dane postaci utworzone przez samego Gracza podczas sesji (zapisane stany kampanii) muszą bezwzględnie pozostać BEZ ZMIAN i bez prób narzucania tłumaczeń. Granica dotyczy wyłącznie systemowych, hardkodowanych presetów.
3. **Autonomiczna Weryfikacja (KRYTYCZNE - Zero Zaufania):**
   - **Napisz dedykowany test Playwright** w pliku `tests/e2e/locale-character-sheet.spec.ts`.
     - Test ma zainicjować lokalny storage postaci z uzbrojeniem.
     - Przejść pod adres `/en`, otworzyć Kartę Badacza.
     - Wykonać rygorystyczne asercje obecności etykiet z `en.json` (np. "Character sheet", "Equipment").
     - **Test musi bezwzględnie zapisać screenshot .png ze stanem UI w ustalonej, stałej ścieżce na dysku.**
   - Uruchomić ten konkretny, dedykowany test poprzez komendę:
     `npx playwright test tests/e2e/locale-character-sheet.spec.ts --project=chromium`
   - Koder (Wykonawca) ma absolutny obowiązek potwierdzić poprawność screena własnym, wzrokowym osądem zanim zgłosi wykonanie zadania.

## 3. Czego NIE robimy (Boundaries)
- Nie próbujemy poprawiać/tłumaczyć wygenerowanego przez AI tekstu "w locie" podczas testów e2e.
- Nie dotykamy stanu dla istniejących customowych postaci Gracza.

## 4. Wymogi Audytora i QA
- Test Playwright w pełni PASS wywołany celowaną ścieżką.
- Zrzut ekranu zapisany i zweryfikowany przez agenta Kodera.
- Całość pomyślnie zamyka wdrożenie UI.
