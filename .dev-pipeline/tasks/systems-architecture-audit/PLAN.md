# Audyt architektury wszystkich systemów gry

## Cel

Utworzyć aktualny, dowodowy katalog systemów gry i wskazać dla każdego jedno źródło prawdy, faktyczną ścieżkę runtime, zależności, testy, fallbacki, migracje i dług. Audyt jest najpierw tylko odczytowy, a każda naprawa otrzymuje osobne ograniczone zadanie.

## Zakres

- Katalog obejmuje co najmniej: launcher i build, onboarding, języki, klucze API, PDF, lokalny RAG, przygody, setup, epoki, postacie, Hot Seat, narrację, pamięć, mechanikę, ekwipunek, obrazy, TTS, dziennik, Tablicę Badacza, save/load, GM Tools, ustawienia, koszty, telemetrię, nawigację i pomoc.
- Dla każdego systemu zapisać: odpowiedzialność, wejście UI, wejścia, wyjścia, źródło prawdy, dane pochodne, storage, udział kodu/AI/RAG, zależności zewnętrzne, fallback, testy, migracje, stan i dług.
- Dowody pochodzą z żywego grafu Graft, rejestru nawigacji, importów, endpointów, storage i testów.
- `docs/` w root staje się źródłem prawdy dokumentacji. Kopie runtime mają być generowane albo jawnie wymagane przez paczkę.
- Osobno sklasyfikować relikty Pinecone/GCS, duplikaty wrapper-runtime, martwe endpointy, brakujące skrypty i 120 staged deletions.
- Nie usuwać żadnego staged deletion ani reliktu podczas audytu.
- Sprawdzić, czy runtime odwołuje się do danych encyklopedii znajdujących się tylko w wrapperze.

## Artefakty

- `docs/SYSTEMS-CATALOG.md` - tabela wszystkich systemów i ich kontraktów.
- `docs/ARCHITECTURE.md` - aktualny opis warstw i granic odpowiedzialności.
- `docs/MAPA-POWIAZAN.md` - aktualne zależności i przepływy.
- `docs/audits/systems/findings.md` - P0, P1, P2 i dowody.
- `docs/audits/systems/deletions-classification.md` - decyzja `keep`, `remove`, `generate`, `needs-owner` dla każdego staged deletion.
- Osobne karty naprawcze dla każdego zaakceptowanego P0 lub P1.

## Kolejność

1. Zamrozić listę plików, status Git i wynik Graft bez modyfikacji runtime.
2. Zbudować katalog wejść UI, endpointów, storage i zależności.
3. Zweryfikować każdy system po faktycznej ścieżce runtime.
4. Porównać dokumentację root i runtime oraz dane wrapper-runtime.
5. Sklasyfikować dług, relikty i staged deletions.
6. Ustalić P0/P1 oraz właściciela źródła prawdy.
7. Dopiero po zatwierdzeniu tworzyć osobne zadania naprawcze.

## Walidacja

- Każdy wpis katalogu ma co najmniej jeden dokładny dowód w kodzie lub konfiguracji.
- Każdy P0/P1 zawiera wpływ, ścieżkę reprodukcji, właściciela i proponowaną bramkę.
- Liczba sklasyfikowanych staged deletions równa się liczbie z baseline Git.
- Audyt nie zmienia runtime, assetów ani staging area.

## Kryteria akceptacji

- Katalog obejmuje wszystkie wskazane systemy, odpowiedzialności, wejścia i wyjścia, źródła prawdy, storage, udział kodu/AI/RAG, fallbacki, testy, migracje, stan i dług.
- Zależności są zweryfikowane na żywym grafie Graft, rejestrze nawigacji i ścieżkach runtime.
- Relikty chmurowe, duplikaty wrapper-runtime, martwe endpointy i 120 staged deletions są sklasyfikowane bez automatycznego usuwania.
- Rozjazd danych encyklopedii wrapper-runtime ma dowód, właściciela i osobne zadanie naprawcze.
