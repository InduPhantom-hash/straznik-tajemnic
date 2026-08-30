# Workflow rozwoju Strażnika Tajemnic

## Granice projektu

- Git root: `/Volumes/Karta/Developer/straznik-tajemnic`.
- Runtime, testy i build: `_tester/_base/.silnik`.
- Artefakt testowy macOS: `~/Applications/Straznik Tajemnic AI.app` oraz kopia
  na Biurku, tworzona przez `bash desktop/build-app.sh --rebuild` w Git root.
- Każdy nowy problem lub funkcja zaczyna się kartą
  `.dev-pipeline/tasks/<task-id>/`.

## Cykl zadania

1. Intake zapisuje cel, objaw, kryteria akceptacji, dozwolone ścieżki oraz
   baseline brudnego drzewa.
2. Plan sprawdza Graft i `docs/NAVIGATION_MAP.md`, wskazuje wpływ na routy,
   modale, stan gry, API, PL/EN i testy.
3. Po akceptacji planu zadanie działa na `codex/feature/<task-id>-<slug>`,
   utworzonej z `develop`. Nie przełączaj branchy przy niezatwierdzonym drzewie.
4. Implementacja zmienia wyłącznie ścieżki z karty zadania. Zmiana UI aktualizuje
   rejestr `navigation/navigation-registry.json`, Mermaid i testy.
5. Weryfikacja uruchamia typy, lint, testy powiązane i build. Zmiana UI wymaga
   także E2E w PL i EN oraz kontroli błędów konsoli.
6. Po zielonym buildzie agent uruchamia zbudowaną `.app`, wykonuje scenariusz
   kryterium akceptacji, robi screenshot i wpisuje wynik do
   `visual-review.md` według szablonu `.dev-pipeline/templates/visual-review.md`.
7. `failed` wraca do naprawy. `not_applicable` wolno wpisać tylko dla zmiany bez
   widocznego efektu. `passed` oznacza gotowość do Twojego testu `.app`.
8. Dopiero po Twoim `akceptuję` wolno stworzyć commit, push i merge.

## Branche i wydania

- `main`: ostatnie stabilne wydanie.
- `develop`: zaakceptowane zmiany oczekujące na wydanie.
- `codex/feature/...`: pojedyncze zadanie.
- `codex/release/vX.Y.Z`: stabilizacja wydania, tylko naprawy wydaniowe.
- `codex/hotfix/vX.Y.Z`: pilna naprawa od `main`, wraca do `main` i `develop`.
- SemVer: PATCH dla poprawki, MINOR dla funkcji, MAJOR dla niezgodnej zmiany.

## Mapa i graf zależności

- `graft/.graph/wiring.json` jest dowodem technicznych zależności. Przed planem
  sprawdź aktualność grafu; gdy środowisko pozwala, uruchom `graft check`.
- `navigation/navigation-registry.json` jest źródłem prawdy dla doświadczenia
  użytkownika: routów, modali i ważnych akcji, z nazwami PL i EN.
- `npm run navigation:generate` tworzy `docs/NAVIGATION_MAP.md`.
- `npm run navigation:check` zatrzymuje nieaktualną mapę. CI wymaga aktualizacji
  rejestru przy zmianie pliku UI.

## Publikacja

- Commit jest mały, opisowy i zawiera wyłącznie pliki zadania.
- Push, merge, GitHub Release i deployment wymagają Twojej akceptacji testu
  `.app`; nie są skutkiem samego zielonego CI.
