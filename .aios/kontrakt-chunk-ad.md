Kontrakt (Implementation Plan 4.0 - Transza: chunk_ad):

1. Zablokowana lista plików do modyfikacji (Ścisłe ścieżki z przedrostkiem src/)

• Słowniki: _tester/_base/.silnik/messages/pl.json, _tester/_base/.silnik/messages/en.json
• Mocki: _tester/_base/.silnik/test/mocks/next-intl.ts
• Komponenty systemowe i UI:
  • _tester/_base/.silnik/src/components/ui/handout-generator.tsx
  • _tester/_base/.silnik/src/components/ui/hot-seat-setup.tsx
  • _tester/_base/.silnik/src/components/ui/investigator-board.tsx
  • _tester/_base/.silnik/src/components/ui/journal/corkboard-investigation-board.tsx
  • _tester/_base/.silnik/src/components/ui/journal/discoveries-view.tsx
  • _tester/_base/.silnik/src/components/ui/location-manager.tsx
  • _tester/_base/.silnik/src/components/ui/new-adventure-modal.tsx
  • _tester/_base/.silnik/src/components/ui/new-session-form.tsx
  • _tester/_base/.silnik/src/components/ui/npc-manager.tsx
  • _tester/_base/.silnik/src/components/ui/phobia-mania-system.tsx
  • _tester/_base/.silnik/src/components/ui/portrait-generator.tsx
  • _tester/_base/.silnik/src/components/ui/quick-references.tsx
  • _tester/_base/.silnik/src/components/ui/random-event-generator.tsx
  • _tester/_base/.silnik/src/components/ui/ritual-system.tsx
  • _tester/_base/.silnik/src/components/ui/session-journal.tsx
  • _tester/_base/.silnik/src/components/ui/session-list.tsx
  • _tester/_base/.silnik/src/components/ui/session-timeline.tsx
  • _tester/_base/.silnik/src/components/ui/session-zero-modal.tsx
  • _tester/_base/.silnik/src/components/ui/settings-modal.tsx
  • _tester/_base/.silnik/src/components/ui/travel-loader.tsx
  • _tester/_base/.silnik/src/components/ui/youtube-player.tsx

2. Absolutna blokada modyfikacji
• Kategoryczny zakaz wprowadzania jakichkolwiek zmian poza wyżej wymienionymi plikami z kodu.
• Zakaz modyfikacji jakiejkolwiek konfiguracji oraz skryptów budujących.
• Zakaz zmian w jakichkolwiek testach asercyjnych (wyłącznym, wąskim odstępstwem jest aktualizacja pliku mocka test/mocks/next-intl.ts).
• WYJĄTEK DOT. NOWYCH PLIKÓW: Zezwala się na tworzenie wyłącznie narzędzi audytowych: testów docelowych w katalogu dla Playwrighta (np. tests/e2e/chunk-ad.spec.ts) oraz tworzenie logów i zrzutów ekranu wewnątrz chronionych lokacji.

3. Ochrona istniejącego zakresu (Zero wyjątków)
• Zakaz zmiany: logiki, struktury routingu, zdarzeń formularzy (np. przy zapisach gry), obsługi błędów oraz kolejności warunków renderowania komponentów w oknach bocznych i systemach walki.
• W komponentach takich jak `journal/corkboard-investigation-board.tsx` kategoryczny zakaz modyfikowania logiki układania "dowodów" na tablicy.

4. Typowanie kluczy (Strict Types)
• Egzekwowanie poprawnej deklaracji przestrzeni nazw (namespaces) messages/pl.json wewnątrz konfiguracji typów w next-intl AppConfig.

5. Kryterium dla mocków i testów
• Zaktualizowany interfejs test/mocks/next-intl.ts musi obsługiwać testowanie wirtualnych wartości DOM dla nowo przeniesionych w transzy chunk_ad fraz językowych.

6. Maszynowy audyt UI (Zero pozostałych stringów)
• Wykonanie jest bezwarunkowo nieważne, jeśli choć jeden wyrenderowany, twardy polski tekst pozostanie w zablokowanych plikach transzy chunk_ad.
• Zostanie to matematycznie sprawdzone za pomocą asercji wyjścia (exit code 0) istniejącego skryptu find_jsx_text.py.

7. Testy E2E i jawne artefakty walidacji
• Przed zatwierdzeniem kodu transzy, przeprowadzony zostanie test wzrokowy Playwright dla nowo przetłumaczonych UI (m.in. Tablica Śledcza).

8. Pełne ścieżki i komendy walidacyjne
• Praca uznana jest za udaną tylko po wykonaniu bezbłędnej komendy walidacyjnej na serwerze:
cd /Volumes/Karta/Developer/straznik-tajemnic && python3 find_jsx_text.py $(cat chunk_ad) && cd _tester/_base/.silnik && node scripts/validate-messages.mjs && npx tsc --noEmit && npm run lint && npm test -- --runInBand && npm run build
