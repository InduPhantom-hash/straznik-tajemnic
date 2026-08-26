---
name: monolynx-create-graph-ci-script
description: "Skonfiguruj graphify jako ekstraktor grafu zaleznosci kodu dla Monolynx. Wykrywa system CI (GitLab/GitHub/Bitbucket/Jenkins), generuje .graphifyignore i cienki cicd/sync_graph.py (graph.json -> replace_graph), dodaje non-blocking step CI oraz instrukcje lokalne. Dziala dla kazdego jezyka wspieranego przez graphify (36 jezykow). Uzyj w dowolnym projekcie, ktory ma byc widoczny w module Polaczenia."
user-invocable: true
argument-hint: [monolynx-url]
allowed-tools: mcp__monolynx__replace_graph, mcp__monolynx__query_graph, mcp__monolynx__get_graph_stats, AskUserQuestion, Bash, Read, Write, Edit, Glob, Grep
---

# Konfiguracja graphify jako ekstraktora grafu kodu dla Monolynx

Twoim zadaniem jest skonfigurowanie synchronizacji grafu zaleznosci kodu **biezacego projektu** z platforma Monolynx (modul Polaczenia).

**Podzial rol:**
- **[graphify](https://github.com/Graphify-Labs/graphify)** - zewnetrzny ekstraktor: tree-sitter AST, 36 jezykow, w pelni offline (kod nie opuszcza maszyny, zero kosztow API). Generuje `graphify-out/graph.json`.
- **`cicd/sync_graph.py`** - cienki mapper (generujesz go w KROK 3): czyta `graph.json`, mapuje taksonomie graphify -> Monolynx i wypycha graf przez MCP tool `replace_graph` (pelna podmiana, idempotentnie).
- **Monolynx** - przyjmuje, przechowuje (Neo4j) i serwuje graf (UI + MCP).

**Zasada kluczowa: CI NIE instaluje graphify.** Instalacja graphify na runnerze (gitlab-runner, self-hosted agent) to jednorazowy setup wlasciciela projektu - instrukcje w Monolynx: modul Polaczenia -> "Jak zasilic graf?". Step CI tylko UZYWA graphify; gdy go brak - konczy sie non-blocking z czytelnym komunikatem, a build projektu przechodzi dalej.

**Monolynx URL**: `$ARGUMENTS` (domyslnie: `https://monolynx.com`)

---

## KROK 0: Resolucja konfiguracji

Ustal trzy wartosci (w tej kolejnosci, pierwsza znaleziona wygrywa):

1. **Slug projektu**: zmienna `MONOLYNX_PROJECT_SLUG` z `.env` / srodowiska -> `user_config.project_slug` pluginu -> zapytaj uzytkownika (AskUserQuestion).
2. **URL**: `$ARGUMENTS` -> `MONOLYNX_URL` -> `user_config.mcp_endpoint` (bez suffixu `/mcp`) -> `https://monolynx.com`.
3. **Token**: `MONOLYNX_GRAPH_TOKEN` (uzytkownik generuje w Monolynx -> Profil -> Tokeny API). NIE wypisuj wartosci tokenu.

```bash
echo "${MONOLYNX_PROJECT_SLUG:-(nie ustawiono)}"
```

W przykladach ponizej uzywaj placeholderow `straznik-tajemnic` i `<MONOLYNX_URL>` - NIE hardkoduj konkretnego sluga.

---

## KROK 1: Wykryj system CI

Sprawdz w korzeniu repo (w tej kolejnosci):

| Plik / katalog | System | Step w KROK 4 |
|---|---|---|
| `.gitlab-ci.yml` | GitLab CI | wariant A |
| `.github/workflows/` | GitHub Actions | wariant B |
| `bitbucket-pipelines.yml` | Bitbucket Pipelines | wariant C |
| `Jenkinsfile` | Jenkins | wariant D |
| zaden z powyzszych | brak CI | tylko instrukcja lokalna (KROK 5) |

---

## KROK 2: Wygeneruj `.graphifyignore`

Utworz `.graphifyignore` w korzeniu repo (jesli istnieje - zaproponuj scalenie). Dostosuj do struktury projektu; baza:

```
tests/
test/
migrations/
alembic/
docs/
scripts/
node_modules/
vendor/
static/
templates/
.venv/
*.md
*.png
*.svg
*.ico
```

Zostaw katalogi z KODEM PRODUKTU. Uzasadnienie: bez ignore graf bywa 5x wiekszy, a 70-80% wezlow to testy - szum w wizualizacji i ryzyko przekroczenia limitow `replace_graph` (20 000 wezlow / 60 000 krawedzi).

---

## KROK 3: Wygeneruj `cicd/sync_graph.py`

Utworz katalog `cicd/` i plik `cicd/sync_graph.py`. **Zero analizy AST** - to czysty mapper + klient MCP. Wymagania:

### 3a. Klient MCP (stdlib only, bez zaleznosci)

Klasa `MonolynxClient` - MCP Streamable HTTP (JSON-RPC przez `urllib.request`):
- naglowki: `Authorization: Bearer {token}`, `Content-Type: application/json`, `Accept: application/json`
- endpoint `{url}/mcp/`; sekwencja: `initialize` (protocolVersion `2025-03-26`) -> zapisz naglowek odpowiedzi `Mcp-Session-Id` -> doklejaj go do kolejnych requestow -> `tools/call`
- wynik toola: `result.content[0].text` to JSON string -> `json.loads`; jesli `result.isError` -> blad
- retry x3 z backoff; HTTP < 500 rzuca od razu
- jedna metoda domenowa: `replace_graph(nodes, edges, clear_first=True)` wolajaca tool `replace_graph` z argumentami `{project_slug, nodes, edges, clear_first}`

### 3b. Mapowanie taksonomii (zrodlo prawdy: wiki "Mapowanie taksonomii Graphify -> Monolynx")

`graph.json` to format NetworkX node-link: klucze `nodes` + **`links`** (nie `edges`).

**Krawedzie** - mapa relacji (relacje spoza mapy pomijamy: `references`, `rationale_for` - graf code-only):

```python
RELATION_TO_EDGE_TYPE = {
    "calls": "CALLS",
    "indirect_call": "CALLS",
    "contains": "CONTAINS",
    "method": "CONTAINS",
    "imports": "IMPORTS",
    "imports_from": "IMPORTS",
    "re_exports": "IMPORTS",
    "inherits": "INHERITS",
    "uses": "USES",
}
```

Kazda krawedz dostaje `metadata: {"source_relation": <relacja graphify>, "confidence": <EXTRACTED|INFERRED>}`. Krawedzie INFERRED zostaja (odroznialne w UI). Krawedz, ktorej endpoint odpadl po filtrze wezlow - pomijana.

**Wezly** - graphify NIE typuje wezlow kodu; typ wnioskuj heurystykami (pierwsza pasujaca wygrywa; zweryfikowane na graphify 0.9.18):

| Warunek | Wynik |
|---|---|
| `file_type == "rationale"` / pusty `source_file` / `type == "package"` | pomin (v1 code-only) |
| `label` konczy sie `.py` (lub rozszerzeniem jezyka projektu) | `File` |
| target krawedzi `method` lub `label` zaczyna sie od `.` | `Method` |
| source krawedzi `method` | `Class` |
| `label` konczy sie `()` | `Function` |
| `label` CamelCase (identyfikator z wielkiej litery) | `Class` |
| pozostale | `Const` |

Pola wezla: `id` (z graph.json - WYMAGANE, krawedzie referuja po nim), `name` (label bez sufiksu `()` i wiodacej kropki), `file_path` = `source_file`, `line_number` = `source_location` bez prefiksu `L`, `metadata.community` = `community`.

### 3c. Obsluga brakow (twarde wymagania)

- Brak `graphify-out/graph.json` -> `log.error("Missing ... - run graphify update .")` + **`exit 0`** (bez tracebacku; build projektu przechodzi)
- Brak `MONOLYNX_GRAPH_TOKEN` -> log + `exit 0` (skip)
- Brak sluga -> log.error + `exit 1`
- Payload > 20 000 wezlow / 60 000 krawedzi -> log.error ("tighten .graphifyignore") + `exit 1`
- `--dry-run` -> tylko mapowanie i liczby, bez requestow

### 3d. CLI

`argparse`: `--monolynx-url` (env `MONOLYNX_URL`), `--token` (env `MONOLYNX_GRAPH_TOKEN`), `--project-slug` (env `MONOLYNX_PROJECT_SLUG`), `--graph-json` (default `graphify-out/graph.json`), `--dry-run`, `--verbose`. Komentarze w skrypcie po angielsku.

**Wzorzec referencyjny**: repo monolynx ma taki skrypt w `cicd/sync_graph.py` - mozesz go skopiowac i dostosowac rozszerzenie plikow w heurystyce `File` do jezyka projektu.

---

## KROK 4: Dodaj step CI (wariant wg KROK 1)

Wspolne dla wszystkich: step uruchamia sie po merge do main, jest **non-blocking**, a przy braku graphify na runnerze konczy sie komunikatem i sukcesem (guard `command -v graphify`).

### Wariant A: GitLab (`.gitlab-ci.yml`)

```yaml
sync-graph:
  stage: deploy
  allow_failure: true
  script:
    - command -v graphify || { echo "graphify nie zainstalowane na runnerze - setup: https://github.com/Graphify-Labs/graphify (patrz Monolynx -> Polaczenia -> Jak zasilic graf)"; exit 0; }
    - graphify update .
    - python cicd/sync_graph.py
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: on_success
```

Uwaga 1: job wymaga runnera z Pythonem 3.10+ i graphify w PATH (self-hosted / dedykowany obraz wlasciciela projektu - NIE instaluj graphify w stepie).

Uwaga 2 (PULAPKA): NIE dodawaj bloku `variables:` z wpisami typu `MONOLYNX_URL: "${MONOLYNX_URL}"` - zmienne z CI/CD Settings -> Variables sa dostepne w srodowisku joba automatycznie, a taka self-referencja nadpisuje je LITERALNYM stringiem `${MONOLYNX_URL}` i sync konczy sie bledem "unknown url type".

### Wariant B: GitHub Actions (`.github/workflows/sync-graph.yml`)

```yaml
name: sync-graph
on:
  push:
    branches: [main]
jobs:
  sync-graph:
    runs-on: self-hosted
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - run: command -v graphify || { echo "graphify nie zainstalowane na runnerze"; exit 0; }
      - run: graphify update .
      - run: python cicd/sync_graph.py
        env:
          MONOLYNX_URL: ${{ secrets.MONOLYNX_URL }}
          MONOLYNX_GRAPH_TOKEN: ${{ secrets.MONOLYNX_GRAPH_TOKEN }}
          MONOLYNX_PROJECT_SLUG: ${{ vars.MONOLYNX_PROJECT_SLUG }}
```

### Wariant C: Bitbucket (`bitbucket-pipelines.yml`)

```yaml
pipelines:
  branches:
    main:
      - step:
          name: sync-graph
          runs-on:
            - self.hosted
          script:
            - command -v graphify || { echo "graphify nie zainstalowane na runnerze"; exit 0; }
            - graphify update . || exit 0
            - python cicd/sync_graph.py || exit 0
```

Bitbucket nie ma natywnego `allow_failure` - non-blocking realizuja guardy `|| exit 0`.

### Wariant D: Jenkins (`Jenkinsfile`, nowy stage)

```groovy
stage('sync-graph') {
  when { branch 'main' }
  steps {
    catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
      sh 'command -v graphify || { echo "graphify nie zainstalowane na runnerze"; exit 0; }'
      sh 'graphify update .'
      sh 'python cicd/sync_graph.py'
    }
  }
}
```

Po dodaniu stepu wypisz uzytkownikowi, jakie zmienne/sekrety musi ustawic w CI:

```
MONOLYNX_URL           = <MONOLYNX_URL>
MONOLYNX_GRAPH_TOKEN     = (token z Monolynx -> Profil -> Tokeny API)
MONOLYNX_PROJECT_SLUG  = straznik-tajemnic
```

---

## KROK 5: Uruchomienie lokalne (takze gdy brak CI)

Kazdy dev z zainstalowanym graphify moze zasilic graf recznie:

```bash
# jednorazowo (macOS/Linux/Windows): uv tool install graphifyy   (pakiet PyPI ma podwojne "y"!)
graphify update .
MONOLYNX_URL=<MONOLYNX_URL> MONOLYNX_GRAPH_TOKEN=osk_xxx MONOLYNX_PROJECT_SLUG=straznik-tajemnic \
  python cicd/sync_graph.py --dry-run   # najpierw dry-run, potem bez flagi
```

Dla uzytkownikow Claude Code najprostsza sciezka to skill `/monolynx:graph-sync` (prowadzi za reke, z instalacja per OS).

---

## KROK 6: Makefile (opcjonalnie)

```makefile
sync-graph: ## Synchronizuj graf kodu z Monolynx (wymaga graphify)
	graphify update . && python cicd/sync_graph.py

sync-graph-dry: ## Zmapuj graf bez wysylki
	graphify update . && python cicd/sync_graph.py --dry-run --verbose
```

---

## WAZNE ZASADY

1. **CI nie instaluje graphify** - to jednorazowy setup wlasciciela runnera. Step tylko uzywa; brak = non-blocking fail z linkiem do repo graphify.
2. **Brak graph.json / tokenu = skip z exit 0** - synchronizacja grafu NIGDY nie moze wywalic builda projektu.
3. **Zrodlem prawdy mapowania** jest strona wiki "Mapowanie taksonomii Graphify -> Monolynx" projektu monolynx - przy rozjezdzie aktualizuj skrypt wg wiki, nie odwrotnie.
4. **Graf code-only (v1)**: pomijaj rationale, symbole zewnetrzne (pusty `source_file`), pakiety, relacje `references`/`rationale_for`.
5. **INHERITS moze zniknac** po filtrze symboli zewnetrznych (klasy bazowe z bibliotek) - to nie jest blad.
6. **Nie modyfikuj kodu projektu** - tworzysz `.graphifyignore`, `cicd/sync_graph.py`, step CI i opcjonalnie Makefile.
7. **Jezyk komentarzy w skrypcie**: angielski. Placeholder `straznik-tajemnic` w dokumentacji - nigdy konkretny slug.
8. **Token**: zawsze `MONOLYNX_GRAPH_TOKEN` - dedykowany token syncu grafu (NIE mylic z `MONOLYNX_MCP_TOKEN` uzywanym przez wiki-post-merge i polaczenie MCP Claude Code).
