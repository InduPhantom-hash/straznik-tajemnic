# Instrumentacja pipeline - protokol raportowania

Warstwa obserwowalnosci nad praca zespolu agentow. Odwzorowuje przebieg w module
Pipelines (hierarchia `pipeline -> step -> job`).

**Zasada nadrzedna**: pipeline RAPORTUJE prace, nie wykonuje jej i nie jest gate'em.
Blad ktoregokolwiek wywolania ponizej NIGDY nie przerywa pracy nad ticketem -
odnotuj i kontynuuj. Jesli toole pipeline sa niedostepne (starszy serwer MCP bez
modulu Pipelines) - pomin CALA instrumentacje.

Wszystkie wywolania w tym pliku sa **best-effort**.

---

## Dostepnosc toolow

Toole laduja sie w KROK 1 skilla przez:

```
ToolSearch(query="+monolynx pipeline create job finish")
```

Zestaw: `create_pipeline`, `create_pipeline_job`, `update_pipeline_job`,
`append_job_log`, `finish_pipeline`.

Brak ktoregokolwiek -> pomin instrumentacje w calosci.

---

## 1. Utworzenie pipeline (po KROK 2 - walidacji brancha)

```
mcp__monolynx__create_pipeline(project_slug="straznik-tajemnic", pipeline_type="ticket_work", ticket_id="<ID lub klucz PROJ-XX>", branch="<aktualny_branch>")
```

Zwraca `pipeline_id` oraz 3 stepy: `research`, `coding`, `wrap-up`.
**Zapamietaj `pipeline_id`** - uzywany do konca skilla.

Nastepnie odnotuj walidacje brancha jako job:

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="research", name="branch-validation", agent_type="system")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<job_id>", status="success", summary="Branch zwalidowany: <branch>")
```

---

## 2. Job Researchera (KROK 3)

Przed uruchomieniem agenta `Explore`:

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="research", name="researcher", agent_type="Explore")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<researcher_job_id>", status="running")
```

Po otrzymaniu raportu:

```
mcp__monolynx__append_job_log(project_slug="straznik-tajemnic", job_id="<researcher_job_id>", content="<pelny raport Researchera w markdown>")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<researcher_job_id>", status="success", summary="<1-zdaniowe streszczenie raportu>")
```

Researcher pominiety (KROK 3b) -> status `skipped` zamiast `success`.

---

## 3. Joby zespolu (KROK 5)

### 3a. Plan pracy

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="coding", name="team-plan", agent_type="system")
mcp__monolynx__append_job_log(project_slug="straznik-tajemnic", job_id="<team_plan_job_id>", content="<plan pracy + dobrani agenci + przydzial plikow w markdown>")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<team_plan_job_id>", status="success", summary="Dobrano zespol: <lista agentow>")
```

### 3b. Job per agent

Dla KAZDEGO dobranego agenta (wlacznie z krytykiem) utworz job `pending`:

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="coding", name="<nazwa wybranego agenta>", agent_type="<subagent_type>")
```

**Zapamietaj `job_id` kazdego agenta** - przekazesz go w prompcie agenta (sekcja 4).

---

## 4. Blok do wklejenia w prompt agenta (KROK 6)

Kazdy agent raportuje siebie sam. Wklej ponizsze do promptu, podstawiajac `job_id`:

```
RAPORT DO PIPELINE (job_id: <twoj_job_id>):

Na poczatku pracy:
  1. Zmierz czas startu: date +%s
  2. mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<twoj_job_id>", status="running")

Po zakonczeniu pracy MUSISZ:
  1. Zmierz czas konca: date +%s. Oblicz czas pracy w minutach (minimum 1).
  2. mcp__monolynx__append_job_log(project_slug="straznik-tajemnic", job_id="<twoj_job_id>",
     content="<markdown: co zrobiles, proces myslowy, kluczowe decyzje, zmienione pliki>
              \n\n**Czas pracy: X min**")
  3. mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<twoj_job_id>",
     status="success", summary="<1-2 zdania do listy>")
  4. W swojej odpowiedzi koncowej podaj linie: `CZAS PRACY: X min`

Jesli toole pipeline niedostepne lub zwroca blad - pomin raportowanie, NIE przerywaj pracy.
Linie `CZAS PRACY: X min` podaj ZAWSZE, niezaleznie od dostepnosci pipeline.
```

Linia `CZAS PRACY` jest zrodlem danych dla `log_time` w KROK 6e - Team Manager
loguje czas zgloszony przez agenta, nie wlasny stoper.

---

## 5. Oceny krytyka (KROK 6c)

Krytyk zapisuje ocene do joba KAZDEGO ocenianego agenta:

```
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<job_id ocenianego agenta>", score=<0-100>)
```

Swoj wlasny job zamyka na koncu: `append_job_log` z trescia review +
`update_pipeline_job(status="success")`.

### Iteracja poprawkowa

Przy ponownym uruchomieniu agenta z feedbackiem:

```
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<job_id agenta>", attempt=<numer_iteracji>)
```

Poprawki doklej do loga przez `append_job_log`.

---

## 6. Job lint/test (KROK 6.5)

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="wrap-up", name="lint-test", agent_type="system")
mcp__monolynx__append_job_log(project_slug="straznik-tajemnic", job_id="<lint_test_job_id>", content="<uzyte komendy + pelny wynik lint i testow>")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<lint_test_job_id>", status="<success|failed|skipped>", summary="<wynik w 1 zdaniu>")
```

Status:
- `success` - lint i testy zielone
- `failed` - cokolwiek czerwone (blokuje `in_review`)
- `skipped` - brak strony wiki `toolchain` albo projekt nie ma testow

---

## 7. Zamkniecie (KROK 7d)

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="wrap-up", name="team-manager-summary", agent_type="system")
mcp__monolynx__append_job_log(project_slug="straznik-tajemnic", job_id="<summary_job_id>", content="<podsumowanie zadania + oceny w markdown>")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<summary_job_id>", status="success", summary="Zadanie domkniete, status in_review")
mcp__monolynx__finish_pipeline(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>")
```

`finish_pipeline` bez argumentu `status` wylicza status koncowy ze stepow
(jakikolwiek failed step -> pipeline failed, inaczej success). Jesli praca
zakonczyla sie niepowodzeniem - podaj jawnie `status="failed"`.
