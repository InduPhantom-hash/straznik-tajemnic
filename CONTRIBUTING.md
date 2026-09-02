# Wkład w projekt

Strażnik Tajemnic jest projektem fanowskim. Zmiany przyjmujemy przez Pull Requesty
do `main`; bezpośredni push do gałęzi głównej jest zablokowany.

## Zanim zaczniesz

- Sprawdź istniejące Issues. Issue jest kanoniczną kartą pracy, a GitHub Project
  jest wyłącznie jej widokiem operacyjnym.
- Dla błędu lub pomysłu opisz objaw, ścieżkę runtime, źródło prawdy, dozwolony
  zakres plików i bramkę testową. Nie zaczynaj szerokiej edycji bez tej karty.
- Przeczytaj [architekturę](docs/ARCHITECTURE.md) i [mapę runtime](docs/MAPA-POWIAZAN.md).

## Zasady zmian

- Kod oblicza i zapisuje stan gry; AI prowadzi narrację. Nie przenosimy mechaniki
  do promptów jako substytutu kodu.
- Zmiana przekrojowa aktualizuje katalog systemów oraz mapę powiązań przed
  zamknięciem karty.
- Dokumentacja w `docs/` jest źródłem prawdy. Wiki jest jej generowanym,
  publicznym odbiciem i nie edytujemy jej ręcznie.
- Nie umieszczaj sekretów, kosztów, luk bezpieczeństwa ani prywatnych dowodów
  testowych w Issue, PR ani Wiki.

## Weryfikacja

Uruchom bramki wskazane przez kartę. Dla zmian wydaniowych obejmują one co najmniej
nawigację, typy, lint, testy, build i odpowiednie testy E2E. Opisz w PR-ze wynik
każdej bramki oraz znane, istniejące wcześniej blokery.

## Zgłaszanie bezpieczeństwa

Nie publikuj szczegółów podatności w publicznym Issue. Użyj kanału opisanego w
[SECURITY.md](SECURITY.md).
