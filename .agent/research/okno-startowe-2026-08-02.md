## Research: Ekran Szybkiej Przygody (StartModeCards)
Data: 2026-08-02

### Zaktualizowane Wymagania (po interwencji uźytkownika)
Układ kart z ikonami (Zap i Settings) ułożony z podziałem na "Szybka Przygoda" i "Ustawienia Ręczne" jest **ZATWIERDZONY** przez usera. Detale o wyświetlaniu postaci/przygód spoczywają jednak zgodnie z wczorajszą intencją w `QuickSetupModal` by uniknąć natłoku na ekranie początkowym.

Problem zdiagnozowany po interwencji polegał na:
1. **Scrollbar**: Biały, niepasujący systemowy scrollbar w komponencie `WelcomeScreen`.
2. **Kompaktowość interfejsu**: Karty startowe były renderowane w bardzo małym, wąskim oknie (`min-h-[140px]`, z wąskim limitem 900px na 1400px oknie), przez co połowa szerokości strony pozostawała niewykorzystana i psuła czytelność.

### Mapowanie (Wiedza z RAG + Drzewo Plików)
Znaleziono fizyczne pliki interfejsu w katalogu głównym uruchomieniowym:
1. `_tester/_base/.silnik/src/components/chat/welcome/index.tsx` (posiadał nieoskopowany `overflow-y-auto` na głównym kontenerze przewijania, oraz zbyt wąski kontener na karty: `w-[min(900px,90vw)]`). W `globals.css` już wcześniej istniała gotowa klasa `.journal-scroll`.
2. `_tester/_base/.silnik/src/components/chat/welcome/components/start-mode-cards.tsx` (zbyt mały min-height, czcionki tekstów zdefiniowane jako małe `text-sm` i `text-xl`).

### Blast Radius Analysis (Zagrożenia i Skutki Uboczne)
Ponieważ interwencja polega jedynie na zmianach klas TailwindCSS i klas z globalnych stylów, ryzyko rozbicia stanu (React State, `hotSeat.config`) jest zerowe. Logika modalu ładującego pozostaje nietknięta, a wizualny impakt poszerza pole widzenia.

### Zależności (Testy i Markdowny do aktualizacji)
Brak. Ekran wygląda jak trzeba, a przepływ danych zostaje nietknięty.

### Rekomendowany następny krok
Zmiany zostały wdrożone w kodzie od razu w ramach vibe-coding (Minor Follow-up), omijając fazę Planu. Ekran powinien zostać załadowany ponownie przez usera.
