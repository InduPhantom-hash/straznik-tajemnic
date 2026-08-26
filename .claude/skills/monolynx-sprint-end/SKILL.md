---
name: monolynx-sprint-end
description: "Zamknij sprint jako pipeline sprint_close: zintegruj logi pracy z wiki (INGEST), zaudytuj wiki (LINT), wyczysc logi pipeline'ow sprintu i domknij sprint. Przebieg raportowany do modulu Pipelines (best-effort). Uzyj gdy chcesz zamknac sprint."
user-invocable: true
argument-hint: [nazwa sprintu (opcjonalnie)]
allowed-tools: mcp__monolynx__list_sprints, mcp__monolynx__create_pipeline, mcp__monolynx__create_pipeline_job, mcp__monolynx__update_pipeline_job, mcp__monolynx__append_job_log, mcp__monolynx__finish_pipeline, mcp__monolynx__complete_sprint, mcp__monolynx__clean_pipeline_logs, AskUserQuestion, Bash, Skill
---

# SPRINT-END - zamkniecie sprintu jako pipeline sprint_close

Orkiestrujesz zamkniecie sprintu w projekcie Monolynx. Calosc modelujesz jako pipeline `sprint_close` z dwoma stepami: **wiki-update** (zebranie wiedzy ze sprintu do wiki) i **wrap-up** (realne zamkniecie sprintu i podsumowanie). Pipeline to warstwa obserwowalnosci - raportujesz do niego **best-effort**, ale nigdy nie pozwalasz, by blad raportowania zablokowal zamkniecie sprintu.

---

## Ustalenie slug projektu

Slug projektu pochodzi ze zmiennej srodowiskowej `MONOLYNX_PROJECT_SLUG`. Sprawdz ja:

```bash
echo "${MONOLYNX_PROJECT_SLUG:-(nie ustawiono)}"
```

- **Zmienna ustawiona** - uzyj jej wartosci jako `project_slug` we wszystkich wywolaniach narzedzi MCP ponizej. Slug podany wprost przez uzytkownika ma pierwszenstwo.
- **Zmienna nie ustawiona** - NIE zgaduj sluga i NIE rozpoczynaj pracy. Popros uzytkownika, by skonfigurowal slug w pliku `.claude/settings.json` projektu (pole `env`), po czym uruchomil skill ponownie:

  ```json
  {
    "env": { "MONOLYNX_PROJECT_SLUG": "twoj-slug-projektu" }
  }
  ```

  Zakoncz bez dalszych akcji, dopoki slug nie jest znany.

---

## KROK 1: Ustal sprint do zamkniecia

`$ARGUMENTS` moze byc nazwa sprintu albo puste.

- **Podano nazwe** - wylistuj sprinty i znajdz pasujacy po nazwie:

  ```
  mcp__monolynx__list_sprints(project_slug="straznik-tajemnic")
  ```

  Dopasuj sprint po polu nazwy (case-insensitive). Gdy nie znajdziesz - wypisz czytelny komunikat PL (_"Nie znalazlem sprintu o nazwie `<nazwa>`. Dostepne sprinty: ..."_) i **przerwij**.

- **Brak argumentu** - wez aktywny sprint:

  ```
  mcp__monolynx__list_sprints(project_slug="straznik-tajemnic", status="active")
  ```

  - Dokladnie jeden aktywny sprint - uzyj go.
  - Brak aktywnego sprintu - wypisz czytelny komunikat PL (_"Brak aktywnego sprintu do zamkniecia. Podaj nazwe sprintu jako argument albo uruchom sprint."_) i **przerwij**.
  - Wiecej niz jeden aktywny sprint - zapytaj uzytkownika (`AskUserQuestion`), ktory zamknac, i poczekaj na wybor.

Zapamietaj `sprint_id` (UUID) oraz nazwe wybranego sprintu - uzywasz ich do konca skilla.

---

## KROK 2: Utworz pipeline sprint_close (instrumentacja - best-effort)

```
mcp__monolynx__create_pipeline(project_slug="straznik-tajemnic", pipeline_type="sprint_close", sprint_id="<sprint_id>")
```

Zwraca `pipeline_id` oraz dwa stepy: `wiki-update` i `wrap-up`. **Zapamietaj `pipeline_id`**.

**Best-effort**: jesli wywolanie zwroci blad - odnotuj i kontynuuj BEZ instrumentacji pipeline. Jesli toole pipeline sa niedostepne (starszy serwer MCP bez modulu Pipelines lub bez typu `sprint_close`), pomin tylko WARSTWE instrumentacji (`create_pipeline_job`, `update_pipeline_job`, `append_job_log`, `finish_pipeline`), ale dalej wykonaj cala realna prace domkniecia: INGEST, LINT, CLEAN (KROK 3) oraz zamkniecie sprintu (KROK 4). `monolynx:wiki-ingest`, `monolynx:wiki-lint`, `clean_pipeline_logs` i `complete_sprint` nie zaleza od modulu Pipelines - dzialaja niezaleznie. Brak pipeline NIGDY nie blokuje ani zamkniecia sprintu, ani aktualizacji wiki - degraduje jedynie raportowanie przebiegu.

---

## KROK 3: Step `wiki-update` - zebranie wiedzy ze sprintu do wiki

Joby wykonuj **sekwencyjnie**. Dla kazdego joba wzorzec instrumentacji (best-effort): `create_pipeline_job` -> `update_pipeline_job(status="running")` -> wykonaj prace -> `append_job_log` -> `update_pipeline_job(status="success"|"failed")`.

### 3a. Job `wiki-ingest`

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="wiki-update", name="wiki-ingest", agent_type="skill")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<job_id>", status="running")
```

Uruchom skill `monolynx:wiki-ingest` (przez narzedzie `Skill`), wskazujac jako zrodlo logi pracy ze stron "Pipeline logi" tego sprintu - to one zawieraja raporty agentow z pracy nad ticketami sprintu. Skill zintegruje te wiedze z wiki (strony encji/konceptow, wikilinki, katalog, dziennik).

Po zakonczeniu: `append_job_log` z podsumowaniem (ile stron utworzono/zaktualizowano), nastepnie `update_pipeline_job(status="success")` (lub `failed`, gdy ingest sie nie powiodl).

**Zapamietaj wynik ingestu** (sukces/porazka) - decyduje o tym, czy wolno wykonac `wiki-clean` (3c). Jesli INGEST sie nie powiodl, NIE wolno czyscic logow - to one sa jedynym zrodlem wiedzy ze sprintu.

### 3b. Job `wiki-lint`

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="wiki-update", name="wiki-lint", agent_type="skill")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<job_id>", status="running")
```

Uruchom skill `monolynx:wiki-lint` (przez narzedzie `Skill`). Audyt moze wymagac interakcji z uzytkownikiem przy rozstrzyganiu sprzecznosci - to normalne, poczekaj na jego decyzje.

Po zakonczeniu: `append_job_log` z liczba znalezionych/naprawionych problemow, nastepnie `update_pipeline_job(status="success"|"failed")`.

### 3c. Job `wiki-clean`

> **WARUNEK**: Wykonaj `wiki-clean` TYLKO gdy job `wiki-ingest` (3a) zakonczyl sie sukcesem. `clean_pipeline_logs` trwale usuwa strony "Pipeline logi" sprintu - jesli INGEST sie nie powiodl, wiedza ze sprintu NIE trafila do wiki i te strony sa jej jedynym zrodlem. Czyszczenie po nieudanym ingescie = bezpowrotna utrata raportow pracy agentow.

Gdy INGEST sie nie powiodl - **pomin `wiki-clean`**: utworz job ze statusem `skipped` (lub pomin go calkowicie), w logu/podsumowaniu zaznacz _"Pominieto czyszczenie logow - ingest nieudany, logi zachowane"_ i przejdz do KROKU 4.

Gdy INGEST sie powiodl - strony "Pipeline logi" sprintu nie sa juz potrzebne. Usun je:

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="wiki-update", name="wiki-clean", agent_type="system")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<job_id>", status="running")
```

```
mcp__monolynx__clean_pipeline_logs(project_slug="straznik-tajemnic", sprint_id="<sprint_id>")
```

Zwraca `{deleted: N}` - liczbe usunietych stron wiki. Zapamietaj `N` do podsumowania.

Po zakonczeniu: `append_job_log` (np. _"Usunieto N stron logow pipeline sprintu"_), nastepnie `update_pipeline_job(status="success"|"failed")`.

---

## KROK 4: Step `wrap-up` - zamkniecie sprintu i podsumowanie

### 4a. Job `close-sprint` - REALNE zamkniecie sprintu

> **UWAGA**: `complete_sprint` to nieodwracalne zamkniecie sprintu. **Niedokonczone tickety wracaja do backlogu.** Zanim wywolasz tool, ostrzez uzytkownika i poczekaj na potwierdzenie.

Zapytaj uzytkownika (`AskUserQuestion`): _"Zamykam sprint `<nazwa>`. Niedokonczone tickety wroca do backlogu. Kontynuowac?"_ z opcjami:

- **Tak, zamknij sprint** - przejdz dalej.
- **Nie, przerwij** - zakoncz bez zamykania sprintu (wiki-update juz wykonane; poinformuj uzytkownika).

Po potwierdzeniu:

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="wrap-up", name="close-sprint", agent_type="system")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<job_id>", status="running")
```

```
mcp__monolynx__complete_sprint(project_slug="straznik-tajemnic", sprint_id="<sprint_id>")
```

Po zakonczeniu: `append_job_log` (co domkniete, ile ticketow wrocilo do backlogu jesli wiesz), nastepnie `update_pipeline_job(status="success"|"failed")`.

### 4b. Job `summary` - podsumowanie sprintu

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="wrap-up", name="summary", agent_type="system")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<job_id>", status="running")
```

Zbierz ladne podsumowanie tego, co zdzialo sie w sprincie:

- co zostalo domkniete (sprint zamkniety),
- wynik INGEST (ile stron wiki utworzono/zaktualizowano),
- wynik LINT (ile problemow znaleziono/naprawiono, co pozostaje do rozstrzygniecia),
- ile stron logow pipeline wyczyszczono (`N` z kroku 3c).

Zapisz je przez `append_job_log`, nastepnie `update_pipeline_job(status="success")`.

---

## KROK 5: Zamknij pipeline (instrumentacja - best-effort)

```
mcp__monolynx__finish_pipeline(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>")
```

`finish_pipeline` bez argumentu `status` wylicza status koncowy ze stepow (jakikolwiek failed step -> pipeline failed, inaczej success).

Best-effort: blad `finish_pipeline` nie zmienia faktu, ze sprint zostal zamkniety.

---

## Podsumowanie dla uzytkownika

Na koniec pokaz:

- ktory sprint zamknieto,
- wynik INGEST i LINT (krotko),
- ile stron logow pipeline wyczyszczono,
- przypomnienie, ze niedokonczone tickety wrocily do backlogu,
- (jesli pipeline raportowany) link/info, ze przebieg widac w zakladce "Pipelines".

---

## Wazne zasady

1. **Pipeline jest best-effort, nie gate** - blad ktoregokolwiek toola pipeline (`create_pipeline`, joby, `append_job_log`, `finish_pipeline`) NIGDY nie przerywa zamkniecia sprintu. Odnotuj i kontynuuj. Gdy toole pipeline sa niedostepne (starszy serwer MCP), pomin CALA instrumentacje i wykonaj samo `complete_sprint`.
2. **complete_sprint to realne zamkniecie** - niedokonczone tickety wracaja do backlogu. ZAWSZE potwierdz z uzytkownikiem przed jobem `close-sprint`.
3. **Joby step `wiki-update` wykonuj sekwencyjnie** - ingest, potem lint, potem clean (clean dopiero po zaingestowaniu wiedzy).
6. **Nigdy nie czysc logow po nieudanym ingescie** - `wiki-clean` wolno wykonac TYLKO gdy `wiki-ingest` sie powiodl. Inaczej skasujesz jedyne zrodlo wiedzy ze sprintu.
7. **Praca wiki jest niezalezna od pipeline** - INGEST, LINT, CLEAN i `complete_sprint` dzialaja nawet bez modulu Pipelines. Niedostepnosc pipeline degraduje tylko raportowanie, nie zakres pracy domkniecia.
4. **Brak aktywnego/nieznaleziony sprint** - czytelny komunikat PL i przerwanie, bez zgadywania.
5. **Jezyk**: polski (terminy techniczne i nazwy narzedzi w oryginale).
