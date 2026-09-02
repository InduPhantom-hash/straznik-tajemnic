# Workflow prac i jedno źródło prawdy

## Role źródeł

- GitHub Issues są kanonicznymi kartami pracy: opisują priorytet, właściciela,
  kryterium akceptacji, dowód i zależności.
- GitHub Project jest operacyjnym widokiem Issues, nie drugim backlogiem.
- `docs/` w `main` jest kanoniczną dokumentacją techniczną.
- Wiki jest publicznym, generowanym odbiciem zatwierdzonej dokumentacji. Nie
  przyjmujemy ręcznych decyzji ani planów wyłącznie w Wiki.

## Karta przed zmianą

Każdy błąd lub pomysł najpierw otrzymuje Issue z objawem, ścieżką runtime,
źródłem prawdy, dozwolonym zakresem plików i bramką testową. Zmiana przekrojowa
wymaga aktualizacji katalogu systemów i mapy zależności.

## Status i zależności

Używamy priorytetów P0–P2. Karta blokująca lub blokowana wskazuje relację w
Issues; Project jedynie pokazuje kolejność wykonania. Nie prowadzimy równoległego
backlogu w prywatnym pliku ani w innym narzędziu.

## Gałęzie i wydania

`main` zawiera tylko zweryfikowany, publiczny stan. Każda zmiana trafia przez PR.
Gałęzie już scalone mogą zostać automatycznie usunięte; gałęzi niescalonych nie
usuwamy. Wydanie dostaje tag i artefakt dopiero po pełnych bramkach na dokładnym
commicie PR-a.
