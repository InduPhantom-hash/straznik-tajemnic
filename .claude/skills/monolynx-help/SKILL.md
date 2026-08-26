---
name: monolynx-help
description: "Wyswietl przewodnik po skillach Monolynx: setup projektu, flow pracy z ticketem, wiki metoda LLM Wiki, graf kodu, zmienne konfiguracyjne. Uzyj gdy chcesz wiedziec jak pracowac z Monolynx albo ktory skill wybrac."
user-invocable: true
argument-hint: ""
allowed-tools: ""
---

# Monolynx Skills - Przewodnik

Wyswietl ponizszy przewodnik uzytkownikowi i zakoncz. Nie wykonuj zadnych dodatkowych akcji.

---

## Setup jednorazowy

Zanim zaczniesz pracowac z ticketami, ustaw projekt raz:

### 1. Slug projektu

Skille odczytuja slug w kolejnosci:

1. Zmienna srodowiskowa `MONOLYNX_PROJECT_SLUG` (lub `.env` w katalogu projektu)
2. Konfiguracja pluginu (`user_config.project_slug`)
3. Domyslny fallback: `monolynx`

Na stale w `.claude/settings.json` projektu:

```json
{
  "env": { "MONOLYNX_PROJECT_SLUG": "twoj-projekt" }
}
```

### 2. `/monolynx:project-toolchain`

Wykrywa komendy lint i testow projektu (Makefile, Python, Node, Rust, Go, PHP, Ruby, Java),
potwierdza je z Toba i zapisuje jako strone wiki `toolchain`.

**Po co**: `/monolynx:work` i `/monolynx:work-simple` czytaja te strone i uruchamiaja lint
oraz testy PRZED zmiana statusu ticketu na `in_review`. Bez tej strony skille zapytaja,
czy kontynuowac bez weryfikacji. Uruchom raz per projekt.

### 3. `/monolynx:wiki-init` (opcjonalnie)

Wlacza metode LLM Wiki (wg Karpathy'ego): tworzy strony systemowe `wiki-index`,
`wiki-log`, `wiki-schema` i ustawia flage projektu. Potrzebne tylko jesli chcesz
prowadzic wiki jako rosnacy artefakt, a nie zbior luznych stron.

---

## Flow pracy z ticketem

### 1. `/monolynx:ticket-create [opis zadania]`

Tworzysz nowy ticket. Skill zbiera kontekst z wiki, kodu i grafu zaleznosci, a nastepnie
generuje pelny opis (cel, kontekst, zakres, kryteria akceptacji, zaleznosci). Ticket trafia
do sprintu lub backlogu.

### 2. `/monolynx:ticket-review [ticket-id lub klucz np. PROJ-12]`

Recenzujesz ticket przed podjeciem pracy. Skill sprawdza forme, weryfikuje zalozenia
z wiki i kodem, generuje raport z ocena.

**Wskazowka**: Powtarzaj cykl *review → poprawka → review* az raport pokaze same "OK"
w formie i "ZGODNE" w zalozeniach. Dobrze zrecenzowany ticket = szybsza realizacja.

### 3. Realizacja - ktory skill wybrac

| | `/monolynx:work` | `/monolynx:work-simple` |
|---|---|---|
| Story points | powyzej 3 SP | do 3 SP |
| Zespol | Researcher + N agentow + krytyk | 1 dev + krytyk |
| Research | obowiazkowy (agent Explore) | opt-in (wybierasz zrodla) |
| Agent Teams | tak, gdy dostepne | nie, zwykle subagenty |
| Typowe uzycie | nowy modul, cross-warstwowa zmiana | hotfix, cleanup, weryfikacja |

Oba maja pelna ceremonie: komentarze do ticketu, `log_time`, zmiane statusu, gate lint/test.
`work-simple` eskaluje do `work`, jesli dev wykryje, ze zakres urosl (sygnal `SCOPE GREW`).

**Co robi `/monolynx:work`**:

1. Waliduje branch (twardy gate na `main`/`master`)
2. Uruchamia Researchera - laduje spec-page ticketu, `constitution`, `toolchain`, przeszukuje kod, wiki i graf
3. Dobiera zespol agentow i przydziela im **konkretne pliki** (agenci o wspolnych plikach ida sekwencyjnie, nie rownolegle)
4. Prowadzi prace rownolegla z obowiazkowym krytykiem, ktory ocenia wedlug rubryki punktowej (prog 82)
5. Uruchamia lint i testy - **czerwone testy blokuja** przejscie do `in_review`
6. Loguje czas kazdego agenta osobno, zmienia status, wypisuje komende commita

Przebieg raportowany jest do **modulu Pipelines** (obserwowalnosc wzorowana na GitLab CI/CD):
pipeline `ticket_work` ze stepami research → coding → wrap-up, kazdy agent dostaje swoj job,
a jego raport (co zrobil, decyzje, pliki) trafia jako strona wiki podpieta pod job. Status,
czas i logi widac na zywo w zakladce "Pipelines". Raportowanie jest best-effort - brak modulu
Pipelines nie blokuje pracy.

### 4. `/monolynx:wiki-sync-merge [ticket-id]`

Po merge do `main`: integruje zmiany z ticketu z wiki metoda LLM Wiki (INGEST).
Odpalasz recznie, gdy praca jest juz na glownym branchu.

### 5. `/monolynx:sprint-end [nazwa sprintu (opcjonalnie)]`

Zamyka sprint jako pipeline `sprint_close`: integruje logi pracy z wiki (INGEST), audytuje
wiki (LINT), czysci strony logow pipeline'ow sprintu i realnie zamyka sprint
(`complete_sprint` - niedokonczone tickety wracaja do backlogu, dlatego skill prosi
o potwierdzenie). Bez argumentu bierze aktywny sprint.

---

## Wiki

### `/monolynx:search [pytanie]`

Wyszukiwanie semantyczne (RAG) w wiki projektu. Uzyj, gdy potrzebujesz informacji
o architekturze, API, integracjach czy standardach kodu. Aktywuje sie tez automatycznie
przy pytaniach o dokumentacje projektu.

### `/monolynx:wiki-ingest [plik | URL | wklejona tresc]`

Wlacza nowe zrodlo do wiki: tworzy strone zrodla, aktualizuje powiazane strony, linkuje
wikilinkami, odswieza katalog i dziennik. Wymaga wlaczonej metody LLM Wiki.

### `/monolynx:wiki-lint`

Audyt zdrowia wiki: sieroty, martwe linki, sprzecznosci, luki. Prezentuje raport
i proponuje naprawy.

---

## Graf kodu

### `/monolynx:create-graph-ci-script`

Konfiguruje [graphify](https://github.com/Graphify-Labs/graphify) (zewnetrzny ekstraktor AST,
36 jezykow, offline) jako zrodlo grafu zaleznosci: wykrywa system CI
(GitLab/GitHub/Bitbucket/Jenkins), generuje `.graphifyignore` i cienki `cicd/sync_graph.py`
(graph.json -> `replace_graph`), dodaje non-blocking step CI.

**WYMOG**: graphify musi byc zainstalowane na runnerze CI przez wlasciciela projektu -
step CI go tylko uzywa, nigdy nie instaluje. Brak graphify nie psuje builda.

### `/monolynx:graph-sync`

Lokalna synchronizacja grafu za reke - komplement do wersji CI. Wykrywa graphify (przy braku
prowadzi przez instalacje na macOS/Linux/Windows), uruchamia offline ekstrakcje
(`graphify update .`) i wypycha graf. Uzyj przy pierwszym zasileniu grafu albo do
odswiezenia ad hoc bez CI.

---

## Zmienne konfiguracyjne

Ustawiane w `.claude/settings.json` lub `.claude/settings.local.json` (pole `env`):

| Zmienna | Domyslnie | Znaczenie |
|---|---|---|
| `MONOLYNX_PROJECT_SLUG` | - | Slug projektu. Bez niej skille nie zgaduja, tylko prosza o konfiguracje |
| `MONOLYNX_BRANCH_MODE` | `ticket` | `ticket` - branch musi zawierac numer ticketu; `sprint` - dowolny branch poza main, bez pytan (praca nad calym sprintem na jednym branchu); `off` - brak walidacji |
| `MONOLYNX_AUTOTEST` | `false` | `true` - skill sam odpala lint i testy; `false` - wypisuje komendy i czeka na Twoj wynik |
| `MONOLYNX_AUTOCOMMIT` | `false` | `true` - commit po zielonym tescie; `false` - wypisuje gotowa komende |
| `MONOLYNX_AUTOPUSH` | `false` | `true` - push bez pytania; `false` - nigdy nie pushuje |

Domyslne wartosci sa zachowawcze: skille **wypisuja komendy zamiast je wykonywac**.
Flagi zmieniaja to swiadomie.

Przyklad - praca nad sprintem na jednym branchu, z automatycznym lintem:

```json
{
  "env": {
    "MONOLYNX_PROJECT_SLUG": "twoj-projekt",
    "MONOLYNX_BRANCH_MODE": "sprint",
    "MONOLYNX_AUTOTEST": "true"
  }
}
```

---

## Runtime'y

Skille dzialaja w Claude Code, Codex i Cursorze - format `SKILL.md` jest wspolny.

| Runtime | Instalacja | Katalog | Role agentow |
|---|---|---|---|
| Claude Code | plugin z marketplace (zalecane) | `.claude/skills/` | `.claude/agents/*.md` + agenci pluginowi |
| Codex | `install_monolynx_skills(target="codex")` | `.codex/skills/` | `AGENTS.md` w korzeniu repo |
| Cursor | `install_monolynx_skills(target="cursor")` | `.cursor/skills/` | `AGENTS.md` w korzeniu repo |

Serwer MCP podlacza sie osobno: plugin robi to sam, Codex przez `~/.codex/config.toml`,
Cursor przez `.cursor/mcp.json` (klucz `mcpServers`, HTTP + naglowek
`Authorization: Bearer osk_...`). Token wygenerujesz w panelu: `/dashboard/profile/tokens`.

**Uwaga przy instalacji recznej**: `install_monolynx_skills` zwraca liste `files` -
zapisz WSZYSTKIE pliki, nie tylko `SKILL.md`. Skill `monolynx-work` ma dodatkowo
`pipeline.md` i `review-rubric.md`; ich pominiecie okroi go o czesc instrukcji.
