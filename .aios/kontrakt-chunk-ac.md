Kontrakt (Implementation Plan 4.0 - Transza: chunk_ac):

1. Zablokowana lista plików do modyfikacji (Ścisłe ścieżki z przedrostkiem src/)

• Słowniki: _tester/_base/.silnik/messages/pl.json, _tester/_base/.silnik/messages/en.json
• Mocki: _tester/_base/.silnik/test/mocks/next-intl.ts
• Komponenty systemowe i UI:
  • _tester/_base/.silnik/src/components/settings/tts/provider-switch.tsx
  • _tester/_base/.silnik/src/components/settings/tts/shared-sliders.tsx
  • _tester/_base/.silnik/src/components/sidebar/CthulhuSidebar.tsx
  • _tester/_base/.silnik/src/components/ui/accordion.tsx
  • _tester/_base/.silnik/src/components/ui/adventure-details-modal.tsx
  • _tester/_base/.silnik/src/components/ui/adventure-selector.tsx
  • _tester/_base/.silnik/src/components/ui/api-usage-counter.tsx
  • _tester/_base/.silnik/src/components/ui/background-generator.tsx
  • _tester/_base/.silnik/src/components/ui/character-development-panel.tsx
  • _tester/_base/.silnik/src/components/ui/character-manager.tsx
  • _tester/_base/.silnik/src/components/ui/character-switcher.tsx
  • _tester/_base/.silnik/src/components/ui/character-wizard.tsx
  • _tester/_base/.silnik/src/components/ui/chase-system.tsx
  • _tester/_base/.silnik/src/components/ui/combat-system.tsx
  • _tester/_base/.silnik/src/components/ui/combat-utils.tsx
  • _tester/_base/.silnik/src/components/ui/cutscene-player.tsx
  • _tester/_base/.silnik/src/components/ui/dice-system.tsx
  • _tester/_base/.silnik/src/components/ui/diegetic-document-viewer.tsx
  • _tester/_base/.silnik/src/components/ui/equipment-detail-dialog.tsx
  • _tester/_base/.silnik/src/components/ui/equipment-modal.tsx
  • _tester/_base/.silnik/src/components/ui/full-game-save-modal.tsx
  • _tester/_base/.silnik/src/components/ui/full-reset-dialog.tsx
  • _tester/_base/.silnik/src/components/ui/gm-tools-modal.tsx

2. Absolutna blokada modyfikacji
• Kategoryczny zakaz wprowadzania jakichkolwiek zmian poza wyżej wymienionymi plikami z kodu.
• Zakaz modyfikacji jakiejkolwiek konfiguracji oraz skryptów budujących.
• Zakaz zmian w jakichkolwiek testach asercyjnych (wyłącznym, wąskim odstępstwem jest aktualizacja pliku mocka test/mocks/next-intl.ts).
• WYJĄTEK DOT. NOWYCH PLIKÓW: Zezwala się na tworzenie wyłącznie narzędzi audytowych: testów docelowych w katalogu dla Playwrighta oraz tworzenie logów i zrzutów ekranu wewnątrz chronionych lokacji out/logs.txt i out/screenshots/. Skrypt find_jsx_text.py został wygenerowany wcześniej i nie należy go nadpisywać. Inne nowe pliki są kategorycznie zabronione.

3. Ochrona istniejącego zakresu (Zero wyjątków)
• Zakaz zmiany: logiki wyliczania rzutów i statystyk postaci, struktury routingu, zdarzeń formularzy (np. przy zapisach gry), obsługi błędów oraz kolejności warunków renderowania komponentów w oknach bocznych i systemach walki.

4. Typowanie kluczy (Strict Types)
• Egzekwowanie poprawnej deklaracji przestrzeni nazw (namespaces) messages/pl.json wewnątrz konfiguracji typów w next-intl AppConfig.
• Wymóg asercji: kompilator odrzuca jakiekolwiek literówki w nazwach kluczy wewnątrz wywołań t(), useTranslations() oraz t.rich() wyrzucając twardy błąd TS.

5. Kryterium dla mocków i testów
• Zaktualizowany interfejs test/mocks/next-intl.ts musi obsługiwać testowanie wirtualnych wartości DOM dla nowo przeniesionych w transzy chunk_ac fraz językowych. Dotyczy to m.in. interpolacji cyfr pancerza, obrażeń i asercji w komponentach walki.

6. Maszynowy audyt UI (Zero pozostałych stringów)
• Wykonanie jest bezwarunkowo nieważne, jeśli choć jeden wyrenderowany, twardy polski tekst pozostanie w zablokowanych plikach transzy chunk_ac.
• Weryfikacja obejmuje tagi JSX, placeholdery (np. okien dialogowych kreatora), alerty ostrzegawcze z logiki walki, atrybuty title, aria-label oraz alt. Zostanie to matematycznie sprawdzone za pomocą asercji wyjścia (exit code 0) istniejącego skryptu find_jsx_text.py.

7. Testy E2E i jawne artefakty walidacji
• Przed zatwierdzeniem kodu transzy, przeprowadzony zostanie test wzrokowy Playwright, obejmujący zrenderowanie zawiłych UI (np. okna CthulhuSidebar, Character Wizard) po polsku i po angielsku.
• Dowody pracy i logi z błędów kompilacji, bindowane asercją toHaveScreenshot(), trafią do logów out/screenshots/ i out/logs.txt.

8. Pełne ścieżki i komendy walidacyjne
• Praca uznana jest za udaną tylko po wykonaniu bezbłędnej (z kodem wyjścia 0 na każdym pojedynczym etapie) komendy walidacyjnej na serwerze:
cd /Volumes/Karta/Developer/straznik-tajemnic && python3 find_jsx_text.py $(cat chunk_ac) && cd _tester/_base/.silnik && node scripts/validate-messages.mjs && npx tsc --noEmit && npm run lint && npm test -- --runInBand && npm run build
