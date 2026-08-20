# Plan Review: obrazy scen - pełny kadr, 1-3 obrazy i epoki

Data: 2026-08-18
Plan: `.agent/plans/obrazy-sceny-pelny-kadr-epoki-plan.md`

## Ocena ogólna

🔴 Czerwony - kierunek jest trafny, ale błędne ścieżki kodu, niestabilne identyfikatory z LLM i brak kontraktu odtworzenia stanu sceny po save/load blokują bezpieczną implementację.

## Znalezione problemy

### Krytyczne

- Dopasowanie do architektury: plan wskazuje `src/...`, lecz aktywny kod znajduje się w `_tester/_base/.silnik/src/...`; root `src/` został usunięty. Implementacja według planu trafiłaby w nieistniejące pliki. Sugestia: poprawić wszystkie ścieżki produkcyjne i testowe na rzeczywiste ścieżki repozytorium.
- Promise gap: plan oczekuje stabilnego `entityId` w tagu generowanym przez LLM. Model może zmieniać ID, literówki i transliterację między turami, więc deduplikacja NPC i przedmiotów nie jest deterministyczna. Sugestia: LLM przekazuje nazwę/rodzaj, a klient wylicza stabilny klucz przez istniejące dane encji albo deterministyczną normalizację.
- Kompletność/save: plan utrwala metadane obrazu w `Message`, ale nie definiuje, jak odtworzyć `sceneId`, licznik i zrealizowane triggery po reloadzie. Obecne `sceneImageCountRef` i `lastTrackedSceneRef` są ulotne. Sugestia: dodać jawny, wersjonowany `SceneImageState` do save albo czysty rekonstruktor z wiadomości i metadanych.
- Spec Quality Gate: 7/10. Brak jawnej sekcji „Czego NIE budujemy”, brak pełnego przykładu input/output i plan łączy trzy funkcje. Implementacja jest zablokowana do iteracji specu.

### Ostrzeżenia

- Strategia testowania: komenda Playwright jest uruchamiana z katalogu silnika, podczas gdy wskazany test leży w repozytoryjnym `tests/e2e/`; plan nie potwierdza istniejącej konfiguracji Playwright. Sugestia: ustalić realny workdir i sprawdzić komendę przez `--list` przed implementacją.
- Rabbit hole: Faza 3 łączy wykrywanie sceny, kolejkę, priorytety, deduplikację, persistence i zgodność save. To co najmniej dwie mikrosesje. Sugestia: rozdzielić scheduler runtime od migracji/persistence.
- Promise gap: gdy jedna odpowiedź zawiera kilka tagów, plan nie definiuje wyboru pierwszego kadru ani losu pozostałych. Sugestia: required przed optional, potem kolejność location → portrait/creature → item/event; reszta trafia do kolejki sceny.
- Definicja problemu: „fabularny zwrot” nie ma jednoznacznego sygnału maszynowego. Sugestia: wymagany obraz powstaje tylko z jawnego `priority=required` lub zmiany lokacji, nie z heurystyki tekstu po stronie klienta.
- Architektura intro: obraz startowy jest osobną wiadomością Markdown generowaną równolegle. Plan nie określa, czy ma liczyć się jako pierwszy obraz sceny i jak uniknąć dubla z tagu openingu. Sugestia: intro zawsze rejestruje trigger `location` dla startowego `sceneId`.
- Zakres endpointu: pełny render obrazu usuwa potrzebę wymuszania proporcji w providerze. Zmiany `/api/imagen` powinny ograniczyć się do walidacji typu i roku; nie dodawać niepotwierdzonych opcji proporcji Gemini.
- Guardrails projektu: plan jest epikiem. Implementacja nie może być wykonana w jednej sesji ani jednym szerokim diffie. Sugestia: `/dev-4-implement` osobno dla odblokowanej fazy z Frontiera.

### Obserwacje

- `GameTime` już ma pole `year`, więc adapter roku może być małą funkcją bez nowego modelu daty.
- Aktualne pola `generatedImageTypes` i `generatedImageCacheIds` dają punkt migracji, ale typ `portrait | scene` wymaga rozszerzenia z fallbackiem dla starych save'ów.
- Pełny kadr można dostarczyć niezależnie od schedulera i epok, co daje szybki, bezpieczny efekt użytkowy.

## Spec Quality Gate

SPEC CHECK: Feature Spec | 190 słów / limit 200

1. Budget: 2/2 - OK
2. Boundaries: 1/2 - brak jawnej sekcji „Czego NIE budujemy”
3. Verification: 2/2 - plan zawiera ponad 3 sprawdzalne kryteria i konkretne komendy
4. Examples: 1/2 - jest konkretny tag wejściowy, ale nie ma oczekiwanego wyniku i stanu po kolejnych turach
5. Focus: 1/2 - jeden obszar produktu, ale trzy niezależne funkcje: renderer, scheduler scen i audyt epok

SCORE: 7/10 - ALMOST, poniżej bramki 8/10

### Boundaries

Problem: plan ma ograniczenia rozproszone w tekście, lecz brak jawnej listy wykluczeń.

Before: „Każda odpowiedź nadal może zlecić najwyżej jeden obraz, aby nie blokować lektora i ograniczyć koszt.”

After: „## Czego NIE budujemy: nie zmieniamy providera Gemini ani jakości modelu, nie generujemy więcej niż jednego obrazu na odpowiedź, nie przebudowujemy galerii/lightboxa i nie zmieniamy kadrowania poza czatem.”

### Examples

Problem: przykład pokazuje wejście, ale nie deterministyczny wynik.

Before: „`[OBRAZ: typ=location; id=traszyn-pks; priorytet=required; opis=...]`”.

After: „Wejście: nowa lokacja Traszyn PKS, rok gry 1983 i tag `[OBRAZ: typ=location; priorytet=required; opis=...]`. Wynik: klient tworzy `sceneKey=location:traszyn-pks`, generuje dokładnie 1 obraz mimo cooldownu, zapisuje typ `location` oraz rok `1983`; drugi identyczny tag w tej scenie nie generuje duplikatu.”

### Focus

Problem: plan miesza szybki fix UI, nowy scheduler i audyt epok w jednym przebiegu implementacyjnym.

Before: „Wprowadzamy wspólny kontrakt żądania obrazu, stan znaczącej sceny i politykę 1-3 obrazów. Obrazy w czacie pokazujemy w całości, a każdy prompt dostaje aktualny rok czasu gry.”

After: „Plan pozostaje jednym epikiem, ale wdrażamy go trzema niezależnymi sesjami: A - pełny kadr, B - scheduler 1-3, C - rok i audyt epok. Każda sesja ma osobny diff, testy i punkt rollbacku.”

## Rekomendacja

Poprawić plan przed implementacją. Nie uruchamiać `/dev-4-implement`, dopóki:

- wszystkie ścieżki nie wskazują aktywnego silnika,
- `entityId` nie będzie deterministyczny po stronie klienta,
- persistence lub rekonstrukcja `SceneImageState` nie zostanie opisana,
- Spec Quality Gate nie osiągnie co najmniej 8/10,
- fazy nie zostaną rozdzielone na osobne sesje implementacyjne.
