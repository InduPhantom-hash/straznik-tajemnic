  Kontrakt (Implementation Plan 4.0 - Transza: chunk_ab):

  1. Zablokowana lista plików do modyfikacji (Ścisłe ścieżki)

  • Słowniki: messages/pl.json, messages/en.json
  • Mocki: test/mocks/next-intl.ts
  • Komponenty:
      • _tester/_base/.silnik/src/components/dialogs/roll-test-result.tsx
      • _tester/_base/.silnik/src/components/help-modal/BestiaryRulesTab.
      tsx
      • _tester/_base/.silnik/src/components/help-modal/EpochWikiTab.tsx
      • _tester/_base/.silnik/src/components/help-modal/HelpAssistantTab.
      tsx
      • _tester/_base/.silnik/src/components/help-modal/HelpModal.tsx
      • _tester/_base/.silnik/src/components/settings/cloud-storage-
      settings.tsx
      • _tester/_base/.silnik/src/components/settings/custom-commands-
      settings.tsx
      • _tester/_base/.silnik/src/components/settings/debug-settings.tsx
      • _tester/_base/.silnik/src/components/settings/gemini-
      sections/cache.tsx
      • _tester/_base/.silnik/src/components/settings/gemini-
      sections/header.tsx
      • _tester/_base/.silnik/src/components/settings/gemini-
      sections/output.tsx
      • _tester/_base/.silnik/src/components/settings/gemini-
      sections/thinking.tsx
      • _tester/_base/.silnik/src/components/settings/gemini-
      sections/tools.tsx
      • _tester/_base/.silnik/src/components/settings/gemini-settings.tsx
      • _tester/_base/.silnik/src/components/settings/gm-prompt-panel.tsx
      • _tester/_base/.silnik/src/components/settings/gm-prompt-status.
      tsx
      • _tester/_base/.silnik/src/components/settings/health-status-
      panel.tsx
      • _tester/_base/.silnik/src/components/settings/pdf-memory-
      settings.tsx
      • _tester/_base/.silnik/src/components/settings/quality-presets.tsx
      • _tester/_base/.silnik/src/components/settings/replicate-settings.
      tsx
      • _tester/_base/.silnik/src/components/settings/tts/gemini-
      settings.tsx
      • _tester/_base/.silnik/src/components/settings/tts/google-
      settings.tsx
      • _tester/_base/.silnik/src/components/settings/tts/index.tsx


  2. Absolutna blokada modyfikacji

  • Kategoryczny zakaz wprowadzania jakichkolwiek zmian poza wyżej
  wymienionymi plikami z kodu.
  • Zakaz modyfikacji jakiejkolwiek konfiguracji oraz skryptów budujących.
  • Zakaz zmian w jakichkolwiek testach asercyjnych (wyłącznym, wąskim
  odstępstwem jest plik mocka test/mocks/next-intl.ts).
  • WYJĄTEK DOT. NOWYCH PLIKÓW: Zezwala się na generowanie i aktualizację
  wyłącznie narzędzi audytowych: testu dla Playwrighta w odpowiednim
  katalogu E2E oraz logów i zrzutów ekranu wewnątrz lokalizacji out/logs.
  txt i out/screenshots/. Inne nowe pliki są kategorycznie zabronione.

  3. Ochrona istniejącego zakresu (Zero wyjątków)

  • Zakaz zmiany: struktury komponentów modalnych i ustawień, logiki
  zarządzania opcjami konfiguracji AI, nazw kluczy LocalStorage, obsługi
  błędów oraz kolejności warunków renderowania w oknach dialogowych.

  4. Typowanie kluczy (Strict Types)

  • Egzekwowanie poprawnej deklaracji przestrzeni nazw (namespaces)
  messages/pl.json wewnątrz konfiguracji next-intl AppConfig.
  • Kompilator wymusza zrzucenie literówek w kluczach jako twardego błędu
  wewnątrz wywołań t(), useTranslations() oraz t.rich().

  5. Kryterium dla mocków i testów

  • Mechanizm test/mocks/next-intl.ts wspiera testy asercyjne poprzez
  poprawną natywną obsługę interpolacji zmiennych i tagów dla nowo
  przeniesionych w transzy B fraz językowych.

  6. Maszynowy audyt UI (Zero pozostałych stringów)

  • Wykonanie jest nieważne, jeśli choć jeden renderowany polski tekst
  pozostanie w zablokowanych plikach transzy chunk_ab.
  • Audyt weryfikuje teksty we wszystkich tagach JSX (w tym etykiety
  ustawień, ostrzeżenia z modalów), title, aria-label, alt oraz
  placeholder. Użyty do tego zostanie gotowy, zaimplementowany już
  find_jsx_text.py weryfikujący bezpośrednio kody źródłowe komponentów.

  7. Testy E2E i jawne artefakty walidacji

  • Przed zatwierdzeniem kodu, test w strukturze Playwrighta weryfikuje
  renderowanie zakładek Settings (np. okna z opcjami Gemini) i generuje
  artefakty z testu wykonanego przez npx playwright test.
  • Fizyczne dowody z wykonania testów trafiają do plików z wynikami
  out/screenshots/ i out/logs.txt.

  8. Pełne ścieżki i komendy walidacyjne

  • Praca uznana jest za gotową po wykonaniu bezbłędnej (z kodem 0 na
  każdym etapie) komendy walidacyjnej:
  cd /Volumes/Karta/Developer/straznik-tajemnic && python3 find_jsx_text.
  py $(cat chunk_ab) && cd _tester/_base/.silnik && node
  scripts/validate-messages.mjs && npx tsc --noEmit && npm run lint &&
  npm test -- --runInBand && npm run build

