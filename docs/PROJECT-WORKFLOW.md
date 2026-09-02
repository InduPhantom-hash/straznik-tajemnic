# Workflow prac i publiczny backlog

Publiczne Issues repozytorium `InduPhantom-hash/straznik-tajemnic` są jedynym backlogiem operacyjnym projektu. Dokumenty w `docs/` opisują architekturę i decyzje, ale nie są drugą kolejką zadań.

## Karta przed zmianą

Każdy błąd, pomysł i zadanie zaczyna jako GitHub Issue. Karta musi zawierać:

- objaw albo wartość dla gracza;
- system i faktyczną ścieżkę runtime;
- źródło prawdy dla danych lub stanu;
- ograniczony zestaw plików, których zmiana jest potrzebna;
- kryterium akceptacji i bramkę testową;
- priorytet `P0`, `P1` albo `P2`;
- relacje `blocks` lub `blocked by`, jeśli zadanie ma zależności.

Brak tych informacji oznacza etap diagnozy, nie zgodę na szeroką poprawkę.

## Issues i milestones

- Issue typu `epic` opisuje roadmapę i listę zablokowanych przez niego kart.
- Milestone grupuje karty wydania, np. `v0.9.4`.
- Etykiety `P0`, `P1`, `P2`, `area:*`, `type:*` i `blocked` dają kolejkę pracy bez osobnej tablicy.
- Tytuł, opis Issue i linki do zależności są publiczne. Sekrety, koszty, dane użytkowników, luki bezpieczeństwa i prywatne dowody pozostają poza Issue.

## Kolejność i zamykanie

- `P0` blokuje wydanie lub utratę danych. `P1` blokuje system zależny. `P2` jest planowany po usunięciu blokad.
- Zmiana przekrojowa aktualizuje `docs/SYSTEMS-CATALOG.md` i `docs/MAPA-POWIAZAN.md` przed zamknięciem karty.
- Karta zamyka się dopiero z linkiem do testu, raportu albo ręcznej akceptacji wizualnej.
- Czyszczenie plików i gałęzi ma osobną kartę. Nie łączy się go z naprawą storage, mechaniki ani promptów.
