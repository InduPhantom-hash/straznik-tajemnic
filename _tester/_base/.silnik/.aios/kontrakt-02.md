# Kontrakt Wykonawczy 02: Dokończenie internacjonalizacji (i18n) i poprawki UI

Użytkownik zgłosił błędy po Twoim ostatnim zadaniu: 
1. `ManualSetupPanel` jest pół po angielsku, pół po polsku.
2. Z panelu setupu zrobił się wysoki, niescrollowalny modal (część widoku wychodzi poza ekran, nie można go zamknąć / zjechać w dół).
3. Karta postaci (widok `CharacterSheet`) wyświetla wszystkie napisy, etykiety (Cechy, Umiejętności, Walka) oraz opisy po polsku.

## Wymagania
1. **Pełne pokrycie next-intl w `ManualSetupPanel`**:
   - Przeanalizuj plik `src/components/chat/welcome/components/manual-setup-panel.tsx`.
   - Zastąp wszystkie pozostałe polskie stringi (np. "Krok 1 - Tryb rozgrywki", "Solo (1 Gracz)", "Nie wybrano przygody", "Zmień tryb", "Stwórz nową postać", "Gotowy do gry", "Wprowadzenie fabularne...") funkcją `t()` z pakietu `next-intl`.
   - Uzupełnij odpowiednio słowniki angielskie i polskie (plik messages).

2. **Scrollowanie ManualSetupPanel / Layout**:
   - Zlokalizuj problem z przewijaniem komponentu (albo w `manual-setup-panel.tsx`, albo w otaczającym go kontenerze / modalu na ekranie powitalnym). Upewnij się, że panel mieści się na małym ekranie, a jego zawartość scrolluje się (np. `max-h-[85vh] overflow-y-auto` lub analogiczne w Next.js/Tailwind). Ekran konfiguracji nie może ucinać przycisków startu ani przycisku zamknięcia.

3. **Przetłumaczenie Karty Postaci (`CharacterSheet`)**:
   - Sprawdź katalog `src/components/ui/character-sheet/`. 
   - W plikach takich jak `index.tsx`, `components/sheet-header.tsx`, `components/stat-bars.tsx`, `components/sheet-vitals.tsx`, `components/sheet-skills.tsx` i inne - wynieś etykiety typu "KARTA POSTACI", "Akta śledcze · Strażnik Tajemnic", "Cechy", "Walka", "Umiejętności", "Biografia", "Eksport MD", skróty statystyk (SIŁ, ZRE, KON itp.) do plików `next-intl`.
   - Przetłumacz je na j. angielski i podepnij klucze pod kod interfejsu, by karta reagowała poprawnie na wybrane `locale`.

## Wytyczne jakościowe
- Obowiązuje zakaz psucia istniejących testów jednostkowych (uaktualnij mocki w `jest.setup.ts`, jeśli wyciągniesz z nich stringi).
- Po zakończeniu operacji zrób `npx tsc --noEmit` i `npm test`, z pełnym PASS na końcu.
- Odłóż wszelkie placeholdery; masz przepisać konkretne komponenty. 

Działaj do pełnego zadowolenia na podstawie tych ustaleń.
