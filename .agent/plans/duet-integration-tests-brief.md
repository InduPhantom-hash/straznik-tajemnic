## Brief: testy integracyjne duetu W4 i W5
**Co**: Dodać brakujące testy pełnego przebiegu rzutów duetu i wspólnego Dziennika Przygody.
**Jak**: W4 przejdzie przez `ChatWindow` i `RollTestModal` z deterministycznymi rzutami. W5 użyje `SessionJournal` oraz produkcyjnej synchronizacji trzech kart.
**Pliki**: `chat-window.duet-rolls.test.tsx`, `session-journal.test.tsx`, po sukcesie aktualizacja pliku stanu implementacji.
**Test**: Dwa adresowane rzuty, Szczęście, rozwój, jedno żądanie MG oraz pełne dodanie, edycja i usunięcie wspólnego wpisu.
**Ryzyko**: Timery animacji i losowość mogą destabilizować testy, dlatego będą kontrolowane lokalnymi mockami.
