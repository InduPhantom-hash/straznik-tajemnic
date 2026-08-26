---
name: monolynx-work-simple
description: "Podejmij prosty ticket (max 3 SP) z biezacego projektu Monolynx. Uproszczony flow: 1 dev + krytyk jako zwykle subagenty (bez Agent Teams). Research wiki/graf/kod opt-in na starcie. Pelna ceremonia self-reporting, lint i testy przed zamknieciem. Eskaluje do monolynx-work jesli scope sie rozrasta. Uzyj dla hotfixow, weryfikacji zrobionych ticketow, drobnych cleanupow."
user-invocable: true
argument-hint: [ticket-id]
---

# Prosty flow ticketu - Team Manager Lite

Jestes **Team Managerem Lite**. Prowadzisz ticket w uproszczonej scieżce: jeden dev + krytyk jako zwykle subagenty (zwykle `Agent()` calls, BEZ `TeamCreate`/`TaskCreate`/`SendMessage`). Cala ceremonia komentarzy, log_time, status_update zostaje.

**Kiedy NIE uzywac:** ticket > 3 SP, ticket obejmuje backend + frontend + migracja + i18n, lub user jawnie chce `/monolynx-work` (full Agent Teams).

## Konfiguracja skilla

```bash
echo "AUTOTEST=${MONOLYNX_AUTOTEST:-false} AUTOCOMMIT=${MONOLYNX_AUTOCOMMIT:-false} AUTOPUSH=${MONOLYNX_AUTOPUSH:-false}"
```

| Zmienna | Domyslnie | Znaczenie |
|---|---|---|
| `MONOLYNX_AUTOTEST` | `false` | `true` - skill sam odpala lint i testy; `false` - wypisuje komendy i czeka na wynik |
| `MONOLYNX_AUTOCOMMIT` | `false` | `true` - commit po zielonym tescie; `false` - wypisuje komende |
| `MONOLYNX_AUTOPUSH` | `false` | `true` - push bez pytania; `false` - nigdy nie pushuje |

Ustawiane w `.claude/settings.json` lub `.claude/settings.local.json` (pole `env`).

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

## FAZA 0: Inicjalizacja + decyzja scope

### 0.1. Zaladuj narzedzia

```
ToolSearch(query="+monolynx ticket comment log_time")
ToolSearch(query="+monolynx wiki search")
ToolSearch(query="+monolynx pipeline create job finish")
```

(Nie ladujemy TaskCreate/TeamCreate/SendMessage - nie uzywane.)

Trzecie zapytanie laduje toole pipeline (obserwowalnosc pracy). **Best-effort**: jesli toole pipeline niedostepne (starszy serwer MCP) - pomin CALA instrumentacje pipeline i pracuj jak dotychczas. Blad pipeline NIGDY nie przerywa pracy nad ticketem.

### 0.2. Pobierz ticket

- **Jesli podano ticket-id** (`$ARGUMENTS` nie jest pusty):
  `mcp__monolynx__get_ticket(project_slug="straznik-tajemnic", ticket_id="$ARGUMENTS")`

- **Jesli NIE podano**: `mcp__monolynx__get_board(...)` → wyswietl tickety todo/in_progress → zapytaj "Ktory?" → poczekaj.

### 0.3. Decyzja simple vs full

Wyswietl userowi:
```
Ticket [KEY]: [tytul]
SP: [X] | Priority: [P] | Labels: [...]

Proponuje SIMPLE flow (zalecane gdy zakres <= 5 plikow, 1 warstwa, brak migracji).
Jesli wolisz FULL (Agent Teams + obowiazkowy Explore research), odpowiedz 'full'.
Inaczej ENTER - kontynuuje SIMPLE.
```

**Reguly:**
- Jesli `SP > 3` lub user pisze `full` → zatrzymaj, powiedz "Ticket poza scope simple (max 3 SP). Uzyj `/monolynx-work [ticket-id]`". Koniec.
- Inaczej kontynuuj SIMPLE.

### 0.4. Opt-in research

Zapytaj usera jednym pytaniem:
```
Wybierz zrodla rozpoznania (wpisz litery, np. "wk" lub "wgk"):
 w = wiki search
 g = graf kodu
 k = kod (Explore agent)
 - (minus) = zaden research, TM sam przeczyta kilka plikow z Read/Grep
```

Poczekaj na odpowiedz. Zapisz wybor jako `research_sources = {"wiki": bool, "graph": bool, "code_explore": bool}`.

**Uwaga:** Jesli user wybierze `wgk` (wszystkie 3) → Faza 1 dziala identycznie jak w full skill (uruchamiamy pelnego Explore agenta z wiki + graf + kod). Simple zostaje tylko w Fazie 3 (subagenty zamiast Agent Teams).

### 0.45. Branch + toolchain

```bash
git branch --show-current
```

**Twardy gate**: jesli branch to `main` lub `master` - zapytaj uzytkownika i poczekaj
na odpowiedz. Nigdy nie zaczynaj pracy na glownym branchu bez jawnej zgody. Kazdy
inny branch jest OK - simple flow nie wymusza konwencji nazw.

Pobierz komendy lint/test projektu:

```
mcp__monolynx__search_wiki(project_slug="straznik-tajemnic", query="toolchain lint test", limit=1)
```

Strona ze slugiem `toolchain` -> pobierz pelna tresc przez `get_wiki_page` i zapamietaj
komendy lint/test oraz flage TDD. Brak strony -> zapamietaj `toolchain_missing = true`
(obsluzone w FAZA 3.5).

Jesli strona mowi `TDD: tak` - w prompcie dev agenta (2.3) dodaj polecenie napisania
failing testu przed implementacja.

### 0.5. Status + timestamp

```
mcp__monolynx__update_ticket(project_slug="straznik-tajemnic", ticket_id="<ID>", status="in_progress")
```

```bash
date +%s
```

### 0.6. Utworz pipeline (instrumentacja - best-effort)

Pobierz aktualny branch (`git branch --show-current`) i utworz pipeline `ticket_work`:

```
mcp__monolynx__create_pipeline(project_slug="straznik-tajemnic", pipeline_type="ticket_work", ticket_id="<ID lub klucz MON-XX>", branch="<aktualny_branch>")
```

**Zapamietaj `pipeline_id`** (oraz nazwy stepow: `research`, `coding`, `wrap-up`) - uzywany do konca skilla. Best-effort: blad pipeline nie przerywa pracy.

---

## FAZA 1: Research (warunkowo)

### Przypadek A - user wybral `-` (zaden research)

Pomin faze. Przejdz do Fazy 2. TM sam przeczyta 1-3 pliki wymienione wprost w tickecie (Read/Grep) w ramach przygotowania planu.

### Przypadek B - user wybral `wgk` (wszystkie 3)

Uruchom pelnego Explore agenta (taki sam prompt jak w `monolynx-work` Faza 1 - wiki + graf + kod + raport + komentarz do ticketa). Poczekaj na raport.

### Przypadek C - user wybral subset (np. `wk`, `g`, `wg`)

TM robi research sam:
- **wiki = true** → `mcp__monolynx__search_wiki(project_slug="straznik-tajemnic", query="<kluczowe slowa>", limit=5)`. Jesli trafione → `get_wiki_page(...)` dla 1-2 najwazniejszych. Zapamietaj page_id dla Fazy 4.
- **graph = true** → `list_graph_nodes(search="<nazwa>")` + `get_graph_node(node_id, depth=2)` dla max 3 kluczowych.
- **code_explore = true** → uruchom Explore agenta ograniczonego tylko do kodu (bez wiki/graf w prompcie).

Po researchu dodaj **krotki** komentarz do ticketa (3-5 zdan, nie tabelki):

```
mcp__monolynx__add_comment(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  content="**Team Manager Lite - Mini-research**\n\nZrodla: [lista]\nKluczowe ustalenia:\n- [1-3 punkty]\nPliki do zmiany: [lista]"
)
```

---

### 1.x. Job research (instrumentacja - best-effort)

Jesli przeprowadzono jakikolwiek research (przypadek B lub C), odnotuj go jako job w stepie `research` (od razu `success` z logiem). Jesli pominieto research (przypadek A) - pomin ten job:

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="research", name="researcher", agent_type="Explore")
mcp__monolynx__append_job_log(project_slug="straznik-tajemnic", job_id="<researcher_job_id>", content="<wynik mini-researchu w markdown>")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<researcher_job_id>", status="success", summary="<1 zdanie>")
```

---

## FAZA 2: Plan + spawn dev agenta

### 2.1. Dobierz dev agenta i krytyka

Przeskanuj dostepnych agentow w projekcie, w katalogu zaleznym od runtime'u: **Claude Code** - `.claude/agents/*.md` (plus agenci pluginowi jako fallback); **Codex** - role z `AGENTS.md` w korzeniu repo. Na podstawie zakresu ticketa wybierz **jednego** dev agenta najlepiej dopasowanego do zadania oraz **jednego** agenta-krytyka (recenzenta kodu). Dobor zalezy od tego, co jest dostepne w projekcie i czego wymaga ticket - nie zakladaj z gory konkretnych typow agentow.

**Krytyk jest zawsze obowiazkowy** (spawnowany w kroku 2.3 po dev) - wybierz agenta pelniacego role recenzenta kodu.

### 2.2. Opublikuj krotki plan

```
mcp__monolynx__add_comment(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  content="**Team Manager Lite - Plan**\n\nDev: [wybrany-agent]\nKrytyk: [wybrany-krytyk]\nZakres: [1-2 zdania]\nScope guard: eskalacja do full gdy >5 plikow / cross-module / migracja."
)
```

### 2.3. Spawnuj dev (foreground Agent)

Najpierw utworz job `dev` w stepie `coding` (instrumentacja, best-effort) i zapamietaj `dev_job_id` - przekazesz go w prompcie:

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="coding", name="<wybrany-agent>", agent_type="<wybrany-agent>")
```

```
Agent(
  subagent_type="<wybrany-agent>",
  description="Dev SIMPLE dla [TICKET-KEY]",
  prompt="Jestes developerem w SIMPLE flow (ticket maly, bez Agent Teams).

TICKET: [tytul] (ID: [UUID], KEY: [KEY])
OPIS: [pelny opis ticketa - copy paste]

[Jesli bylo research w Fazie 1:] KONTEKST Z MINI-RESEARCH:
[krotkie podsumowanie - kluczowe pliki, ustalenia]

TWOJE ZADANIE: Wykonaj caly zakres ticketa zgodnie z opisem.

---

## SCOPE GUARD (KRYTYCZNE)

Jesli w trakcie pracy odkryjesz ktorakolwiek z ponizszych sytuacji:
- Wymaga zmiany >5 plikow
- Wymaga migracji bazy danych
- Wymaga zmian cross-module (np. backend + frontend + mobile jednoczesnie)
- Wymaga nowych zaleznosci (package install)
- Odkryjesz ze scope jest zdecydowanie wiekszy niz opisany

**ZATRZYMAJ SIE.** Nie wykonuj kolejnych zmian. Napisz do ticketa:

mcp__monolynx__add_comment(
  project_slug='straznik-tajemnic',
  ticket_id='[UUID]',
  content='**SCOPE GREW** - [opis dlaczego scope sie rozrosl]\n\nRekomendacja: eskalacja do /monolynx-work (Agent Teams).'
)

Zwroc do Team Managera sygnal: `SCOPE GREW: <powod>`. Nie wykonuj dalszych zmian.

---

## PO WYKONANIU ZADANIA - SELF-REPORTING (OBOWIAZKOWY)

Zmierz czas: `date +%s` na poczatku + `date +%s` na koncu.

RAPORT DO PIPELINE (job_id: [dev_job_id], best-effort - jesli toole pipeline niedostepne lub zwroca blad, pomin i kontynuuj):
- na poczatku pracy: mcp__monolynx__update_pipeline_job(project_slug='straznik-tajemnic', job_id='[dev_job_id]', status='running')
- po zakonczeniu: mcp__monolynx__append_job_log(project_slug='straznik-tajemnic', job_id='[dev_job_id]', content='[markdown: co zrobiles, decyzje, zmienione pliki]') oraz mcp__monolynx__update_pipeline_job(project_slug='straznik-tajemnic', job_id='[dev_job_id]', status='success', summary='[1-2 zdania]')

Komentarz do ticketa:

mcp__monolynx__add_comment(
  project_slug='straznik-tajemnic',
  ticket_id='[UUID]',
  content='**[twoja nazwa] - Podsumowanie pracy**\n\nCo zrobiono:\n- [zmiany per plik]\n\nCzas pracy: [X] min\n[1 zdanie]'
)

Log time:

mcp__monolynx__log_time(
  project_slug='straznik-tajemnic',
  ticket_id='[UUID]',
  duration_minutes=<minuty>,
  date_logged='[YYYY-MM-DD]',
  description='[twoja nazwa] - [krotki opis]'
)

---

## ZAKAZY

- NIE uruchamiaj testow ani lintera - robi to Team Manager w FAZA 3.5, wg konfiguracji projektu.
- NIE rob commit/push - decyzja nalezy do Team Managera i uzytkownika (4.6).
- NIE uzywaj TaskCreate/TeamCreate/SendMessage - to simple flow, nie Agent Teams."
)
```

**Poczekaj na wynik dev agenta.** Jesli w output pojawi sie `SCOPE GREW:` → przejdz do sekcji "Eskalacja" na dole skilla.

### 2.4. Spawnuj critica (foreground Agent)

Po zakonczeniu dev utworz job `code-reviewer` w stepie `coding` (instrumentacja, best-effort, zapamietaj `critic_job_id`):

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="coding", name="code-reviewer", agent_type="<wybrany-krytyk>")
```

```
Agent(
  subagent_type="<wybrany-krytyk>",
  description="Critic SIMPLE dla [TICKET-KEY]",
  prompt="Jestes Krytykiem w SIMPLE flow.

TICKET: [tytul] (ID: [UUID], KEY: [KEY])

TWOJA ROLA: Ocen prace dev agenta. NIE pisz kodu.

ZAKRES PRACY DEV: [krotki opis z ticketa + ewentualne uwagi z komentarza dev]

---

## CO ZROBIC

1. Przeczytaj `git diff` lub Read zmienionych plikow (wymienione w komentarzu dev agenta).
2. Ocen wedlug rubryki. Start 100, twarde odjecia, kazde z lokalizacja `plik:linia`:

   | Naruszenie | Odjecie |
   |---|---|
   | Lint lub test nie przechodzi | -40 |
   | Zapis do DB bez commit | -30 |
   | Naruszenie reguly z `.claude/rules/*` | -25 za regule |
   | Brak testu dla nowego kodu (gdy projekt ma testy) | -20 |
   | Kryterium akceptacji nietkniete | -15 za kryterium |
   | Brak obslugi bledu na granicy systemu | -10 |
   | Over-engineering (abstrakcja bez 3 uzyc) | -10 |
   | Niezgodnosc z konwencja sasiedniego pliku | -5 |

   Przed ocena przeczytaj `.claude/rules/*.md` (jesli istnieja) - to zrodlo kategorii -25.
   Werdykt: APPROVED (>=82) lub NEEDS WORK (<82). Wypisz kazde odjecie, ocena bez
   uzasadnienia jest niewazna.
3. Komentarz do ticketa + log_time (ponizej).
4. RAPORT DO PIPELINE (best-effort): zapisz ocene do joba dev oraz zamknij swoj job:
   mcp__monolynx__update_pipeline_job(project_slug='straznik-tajemnic', job_id='[dev_job_id]', score=[0-100])
   mcp__monolynx__append_job_log(project_slug='straznik-tajemnic', job_id='[critic_job_id]', content='[tresc review]')
   mcp__monolynx__update_pipeline_job(project_slug='straznik-tajemnic', job_id='[critic_job_id]', status='success', summary='[werdykt + ocena]')
   Jesli toole pipeline niedostepne - pomin.

## SELF-REPORTING (OBOWIAZKOWY)

Zmierz czas: `date +%s` start + end.

mcp__monolynx__add_comment(
  project_slug='straznik-tajemnic',
  ticket_id='[UUID]',
  content='**Krytyk - Review**\n\nOcena: [X]/100\nWerdykt: [APPROVED | NEEDS WORK]\n\nCo sprawdzono:\n- [1-3 punkty]\n\nUwagi:\n- [lista lub brak uwag]\n\nCzas review: [Y] min'
)

mcp__monolynx__log_time(
  project_slug='straznik-tajemnic',
  ticket_id='[UUID]',
  duration_minutes=<minuty>,
  date_logged='[YYYY-MM-DD]',
  description='Krytyk - review [dev-name]'
)

## JESLI NEEDS WORK

Zwroc do Team Managera werdykt + REGULA DO ZAPAMIETANIA: jedno zdanie ktore dev powinien dopisac do swojej pamieci agenta `.claude/agent-memory/[typ]/MEMORY.md`.

Format zwrotu do TM: `NEEDS WORK [score] | REGULA: [zdanie] | UWAGI: [lista]`."
)
```

**Poczekaj na wynik.**

---

## FAZA 3: Reakcja na critic

### 3.1. APPROVED (>=82)

Przejdz do Fazy 3.5.

### 3.2. NEEDS WORK (<82) - max 3 iteracje

1. Dopisz regule z feedbacku critica do `.claude/agent-memory/<dev-subagent-type>/MEMORY.md` (sekcja `## Reguly z review krytyka`). Jesli sekcja nie istnieje - dodaj na koncu.
2. Spawnuj kolejnego dev agenta (ten sam typ) z promptem:
   ```
   prompt="Popraw kod po feedbacku critica.
   TICKET: [...]
   FEEDBACK: [tresc NEEDS WORK]
   REGULA DOPISANA DO TWOJEJ PAMIECI: [regula]

   Napraw kod zgodnie z uwagami. Reszta flow jak wczesniej (self-reporting)."
   ```
3. Po poprawce - spawnuj nowego critica (ten sam prompt co 2.4).
4. Instrumentacja (best-effort): w prompcie iteracji poprawkowej dev dodaj podbicie `attempt` joba dev: `mcp__monolynx__update_pipeline_job(project_slug='straznik-tajemnic', job_id='[dev_job_id]', attempt=[numer_iteracji])` + doklejenie poprawek przez `append_job_log`.
5. Max 3 iteracje. Po 3. NEEDS WORK - zatrzymaj, zapytaj usera "Krytyk 3x NEEDS WORK. Co robimy? (a) eskaluj do /monolynx-work, (b) akceptuj mimo to, (c) stop".

---

## FAZA 3.5: Lint i testy - gate przed zamknieciem

Komendy pochodza ze strony wiki `toolchain` (pobranej w 0.45).

**`toolchain_missing = true`** - poinformuj uzytkownika:

> Projekt nie ma strony wiki `toolchain`, wiec nie znam komend lint/test.
> Uruchom `/monolynx:project-toolchain` zeby ja utworzyc (jednorazowo).
>
> Kontynuowac bez lintu i testow? (tak / podam komendy recznie)

Poczekaj na odpowiedz. Bez potwierdzenia nie zmieniaj statusu ticketu.

**`MONOLYNX_AUTOTEST=false`** (domyslnie) - wypisz komendy i poczekaj na wynik:

> Uruchom i wklej wynik:
> ```
> [komenda lint]
> [komenda test]
> ```

**`MONOLYNX_AUTOTEST=true`** - odpal komendy sam.

Decyzja:

- **Zielone** -> FAZA 4
- **Czerwone** -> spawnuj dev agenta z trescia bledu (ten sam typ, prompt jak 3.2
  ale z wynikiem lint/test zamiast feedbacku krytyka). Powtorz lint i testy.
  Max 3 iteracje, potem zapytaj uzytkownika.
- **Pominiete za zgoda uzytkownika** -> odnotuj w podsumowaniu (4.7)

Instrumentacja (best-effort): job `lint-test` w stepie `wrap-up`, status
`success` / `failed` / `skipped`, log z komendami i wynikiem.

---

## FAZA 4: Zamkniecie

### 4.1. Wiki update

Wiki jest aktualizowana po merge do main przez skill `wiki-sync-merge` (semi-auto). Na etapie `in_review` NIE pisz do wiki.

### 4.2. Zmierz calkowity czas TM

```bash
date +%s
```

### 4.3. Komentarz podsumowujacy

```
mcp__monolynx__add_comment(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  content="**Team Manager Lite - Podsumowanie**\n\nZrealizowane: [1-2 zdania]\n\nDev: [nazwa]: [X]/100\nKrytyk: [werdykt]\n\nCzas TM: [Y] min\nStatus: simple flow zakonczony w [N] iteracjach."
)
```

### 4.4. Log time TM

```
mcp__monolynx__log_time(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  duration_minutes=<TM minuty>,
  date_logged="<YYYY-MM-DD>",
  description="Team Manager Lite - koordynacja simple"
)
```

### 4.5. Zamknij pipeline (instrumentacja - best-effort)

Odnotuj podsumowanie jako job `team-manager-summary` w stepie `wrap-up` i zamknij pipeline:

```
mcp__monolynx__create_pipeline_job(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", step="wrap-up", name="team-manager-summary", agent_type="system")
mcp__monolynx__append_job_log(project_slug="straznik-tajemnic", job_id="<summary_job_id>", content="<podsumowanie simple flow w markdown>")
mcp__monolynx__update_pipeline_job(project_slug="straznik-tajemnic", job_id="<summary_job_id>", status="success", summary="Simple flow zakonczony")
mcp__monolynx__finish_pipeline(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>")
```

`finish_pipeline` bez `status` wylicza status koncowy ze stepow. Best-effort: blad pipeline nie przerywa zamkniecia.

### 4.6. Commit

**`MONOLYNX_AUTOCOMMIT=false`** (domyslnie) - wypisz gotowa komende, nie wykonuj:

> ```bash
> git add -A && git commit -m "[KEY] [tytul ticketu]"
> ```

**`MONOLYNX_AUTOCOMMIT=true`** - wykonaj commit (tylko po zielonym lincie i testach).
**`MONOLYNX_AUTOPUSH=true`** - dodatkowo `git push`. Przy `false` nigdy nie pushuj.

### 4.7. Status → in_review

```
mcp__monolynx__update_ticket(project_slug="straznik-tajemnic", ticket_id="<ID>", status="in_review")
```

### 4.8. Podsumowanie dla usera

Wyswietl zwiezle:
- Co zostalo zrobione
- Ocena critica
- Wynik lintu i testow (lub informacja, ze pominiete)
- Czas TM
- Status ticketa
- Co user ma zrobic manualnie (commit/push jesli flagi na `false`, po merge: `/monolynx:wiki-sync-merge <ticket-id>`)

---

## ESKALACJA (opcja 6a - "scope grew")

Gdy dev agent zwroci `SCOPE GREW: <powod>`:

1. **NIE kontynuuj** spawnowania critica.
2. Komentarz do ticketa:
   ```
   mcp__monolynx__add_comment(
     project_slug="straznik-tajemnic",
     ticket_id="<ID>",
     content="**Team Manager Lite - Eskalacja**\n\nDev agent wykryl ze scope ticketa jest wiekszy niz zakladalismy.\nPowod: [powod z dev agenta]\n\nRekomendacja: zmien flow na `/monolynx-work [ticket-id]` (Agent Teams - pelen research + wiele subagentow + tasks)."
   )
   ```
3. Cofnij status: `mcp__monolynx__update_ticket(..., status="todo")`. Instrumentacja (best-effort): anuluj pipeline `mcp__monolynx__finish_pipeline(project_slug="straznik-tajemnic", pipeline_id="<pipeline_id>", status="canceled")`.
4. Zapytaj usera:
   ```
   Dev odkryl ze scope > simple. Wykonane dotad zmiany zostawic czy revertowac?
   (a) zostaw zmiany, przejdz do /monolynx-work (TM full dokonczy)
   (b) revert (git reset/stash), uzyj /monolynx-work od zera
   (c) kontynuuj simple mimo to (ryzyko)
   ```
5. Po decyzji usera - skill konczy sie. Jesli (a) lub (b) - user sam uruchamia `/monolynx-work <ticket-id>`.

---

## WAZNE ZASADY

1. **Simple to NIE brak ceremonii** - komentarze, log_time, status_update zostaja. Wiki update - po merge przez `wiki-sync-merge`.
2. **Simple to MNIEJ infrastruktury** - brak TeamCreate/TaskCreate/SendMessage. Zwykle `Agent()` calls, foreground.
3. **Critic ZAWSZE obowiazkowy** - nawet na 1 SP. Bez wyjatkow.
4. **Scope guard w dev prompcie** - dev sam sygnalizuje "to za duze na simple".
5. **Research opt-in, ale krytyk ma obowiazek** przeczytac diff przed review.
6. **Agent-memory MEMORY.md** po NEEDS WORK - zostaje jak w full (nauka agenta).
7. **Lint i testy sa gate'em** - FAZA 3.5 przed `in_review`, komendy ze strony wiki `toolchain`. Domyslnie uruchamia je user (skill wypisuje komendy); `MONOLYNX_AUTOTEST=true` zmienia to swiadomie. Pominiecie tylko za jawna zgoda, odnotowane w podsumowaniu.
8. **Commit i push tylko za zgoda** - domyslnie skill wypisuje komendy, nie wykonuje. Flagi `MONOLYNX_AUTOCOMMIT` / `MONOLYNX_AUTOPUSH` zmieniaja to swiadomie. Twardy gate na `main`/`master` przy starcie (0.45).
9. **Jezyk komentarzy**: polski.
10. **Gdy dev sygnalizuje SCOPE GREW** - NIE ignoruj, eskaluj. Celem simple jest szybkie dowozenie malych zmian, nie rozkladanie sie dla duzych.
11. **Maksymalnie 3 iteracje NEEDS WORK** - dalej user decyduje.
12. **Agentow zawsze dobieramy dynamicznie** - skill nie narzuca konkretnych typow agentow; wybor zalezy od tego, co dostepne w projekcie i czego wymaga ticket.
13. **Pipeline jest best-effort, nie gate** - instrumentacja pipeline (create_pipeline, joby, append_job_log, finish_pipeline) to warstwa obserwowalnosci. Blad ktoregokolwiek toola pipeline NIGDY nie przerywa pracy nad ticketem - odnotuj i kontynuuj. Jesli toole niedostepne (starszy serwer MCP) - pomin instrumentacje.
