# Workflow prac i jedno źródło prawdy

Repozytorium `InduPhantom-hash/straznik-tajemnic` jest jednym miejscem planowania i nadzorowania prac. Publiczne Issues są kanonicznymi kartami backlogu. Prywatny Project [Zarządzanie - Strażnik Tajemnic](https://github.com/users/InduPhantom-hash/projects/2) automatycznie dodaje nowe Issues i służy jako widok operacyjny, nigdy jako drugi backlog.

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

## Issues, Project i milestones

- Issue typu `epic` opisuje roadmapę i listę zablokowanych przez niego kart.
- Issue jest właścicielem zakresu, priorytetu, zależności, statusu i linku do dowodu. Zmiana statusu zaczyna się tam.
- Project pokazuje kolejkę pracy, ale nie tworzy kopii kart ani niezależnych opisów zadań. Automatyzacja Auto-add podłącza każdą nową kartę.
- Milestone grupuje karty wydania, np. `v0.9.4`.
- Etykiety `P0`, `P1`, `P2`, `area:*`, `type:*` i `blocked` dają wspólny język kolejki w Issues i Project.
- Tytuł, opis Issue i linki do zależności są publiczne. Sekrety, koszty, dane użytkowników, luki bezpieczeństwa i prywatne dowody pozostają poza Issue.

## Dokumentacja, Wiki i gałęzie

- Wersjonowane dokumenty w `docs/` są źródłem prawdy dla architektury, kontraktów i decyzji technicznych. Nie prowadzą bieżącego statusu kart.
- Wiki jest wejściem do wiedzy projektu i linkuje do wersjonowanej dokumentacji; nie zastępuje jej przy decyzjach technicznych.
- `main` zawiera zweryfikowany stan publiczny. Reguła repozytorium wymaga Pull Requesta, więc nie edytujemy go bezpośrednio.
- Gałąź służy tylko do implementacji. Po scaleniu GitHub usuwa gałąź roboczą automatycznie; nie usuwamy gałęzi niescalonych.
- Uprawnienie zapisu GitHub Actions służy wyłącznie zatwierdzonym workflowom repozytorium. Działanie automatu musi mieć odpowiadającą mu kartę albo Pull Request.

## Kolejność i zamykanie

- `P0` blokuje wydanie lub utratę danych. `P1` blokuje system zależny. `P2` jest planowany po usunięciu blokad.
- Zmiana przekrojowa aktualizuje `docs/SYSTEMS-CATALOG.md` i `docs/MAPA-POWIAZAN.md` przed zamknięciem karty.
- Karta zamyka się dopiero z linkiem do testu, raportu albo ręcznej akceptacji wizualnej.
- Czyszczenie plików i gałęzi ma osobną kartę. Nie łączy się go z naprawą storage, mechaniki ani promptów.
