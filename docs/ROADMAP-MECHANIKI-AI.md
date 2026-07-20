# Roadmap Integracji Mechanik AI (Strażnik Tajemnic)

Rejestr zadań i planowanych etapów rozwoju mechanik AI w silniku gry `straznik-tajemnic`.

---

## Etap 1: Pacing, Konwencje i System Bodźców (Zrealizowane)
- [x] Opracowanie Konstytucji, Ustaw i Uchwał w Vaulcie.
- [x] Wdrożenie elastycznego pacingu i stylów (Noir/Pulp/Klasyczny) w `build-context.ts` oraz `run-chat-pipeline.ts`.
- [x] Wdrożenie systemu Bodźców Motywacyjnych w `pacing-controller.ts` w stanie utknięcia.
- [x] Oczyszczenie Master Promptu z przestarzałych instrukcji i zintegrowanie go z systemem UI (Session Zero).
- [x] Poprawki pościgu w pojazdach i geometrii nieeuklidesowej w prompt-masterze.

## Etap 2: System Końca Sesji (Do Wdrożenia)
- [ ] **Wdrożenie przycisku "Koniec Sesji" w UI**:
  - Zamiana przycisku "Stwórz Postać" w prawym sidebarze (`CthulhuSidebar.tsx`) na "Koniec Sesji".
- [ ] **Wysyłanie instrukcji systemowej**:
  - Po kliknięciu przez gracza, system wysyła w tle do API chat cichy prompt `[KONIEC_SESJI]`.
- [ ] **Obsługa wygaszania w silniku**:
  - Model AI wygasza wątki, doprowadza scenę do cliffhangera w ciągu 1-2 tur i zwraca tag `[KONIEC_SESJI:POTWIERDZENIE]`.
- [ ] **Autozapis i domknięcie**:
  - Frontend nasłuchuje tagu potwierdzenia, automatycznie zapisuje stan gry (Save) i pozwala na bezpieczne zamknięcie aplikacji.

## Etap 3: Pipeline Setupowania i Ingestion Przygody (Planowane)
- [ ] Implementacja segmentacji PDF (Chunking) i indeksowania wektorowego przygody w Pinecone.
- [ ] Skrypt wyodrębniania NPC i Lokacji (Entity Extraction) do plików JSON powiązanych z sesją.
- [ ] Wzbogacanie świata (integracja z Daylight API, Prices API, Historical News API i Encyklopedią Zwyczajów).
- [ ] Wyświetlanie gotowych map (z zapisem w ekwipunku) oraz odtwarzacza plików .mp3 (z zapisem w Dzienniku Dowodów).

## Etap 4: Framework Tworzenia Przygód i Presety (Planowane)
- [ ] **Modułowa generacja scenariuszy**: Wdrożenie Adventure Creator Engine tworzącego nieliniowe grafy przygód (JSON/Markdown) na podstawie 3-4 luźnych punktów od gracza.
- [ ] **Encyklopedia Epok i Światów**:
  - Implementacja rejestru presetów historycznych (realiów, zwyczajów i technologii).
  - Wdrożenie bazy wiedzy dla nowej ery: lat 90. i dwutysięcznych (początki internetu, brak powszechnego GPS, klimat teorii spiskowych).
- [ ] **Gotowe przygody Quick-Start**:
  - Wdrożenie przycisku "Szybki Start" umożliwiającego natychmiastowe uruchomienie gotowej przygody z pre-generowanym, w pełni opisanym bohaterem o dopasowanych statystykach (np. scenariusz „Oczy z Klisz” o o. Klimuszce z wyborem tożsamości Weronika/Wiktor Korycki).

## Etap 5: Internacjonalizacja (i18n) i Lokalizacja PL/EN (Planowane)
- [ ] **Przełącznik języka w interfejsie**: Wdrożenie obsługi wielu języków (i18n) dla interfejsu (Next.js / react-i18next).
- [ ] **Lokalizacja interfejsu**: Przetłumaczenie kart badacza, tacki na kości, sidebaru, dziennika i menu na język angielski.
- [ ] **Angielski Master Prompt**: Przygotowanie oraz integracja anglojęzycznej wersji instrukcji systemowych Mistrza Gry (`default-gm-prompt.en.md`).
- [ ] **Wsparcie dla anglojęzycznych podręczników**: Dostosowanie mechanizmu lokalnego RAG do wyszukiwania zasad z oryginalnego podręcznika *Call of Cthulhu Quick-Start Rules* w wersji angielskiej.


