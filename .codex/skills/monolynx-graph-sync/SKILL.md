---
name: monolynx-graph-sync
description: "Zsynchronizuj lokalnie graf zaleznosci kodu biezacego projektu z Monolynx (modul Polaczenia). Prowadzi za reke: wykrywa graphify (instrukcje instalacji dla macOS/Linux/Windows), generuje .graphifyignore, uruchamia ekstrakcje offline i wypycha graf przez cicd/sync_graph.py (replace_graph). Uzyj gdy chcesz zasilic lub odswiezyc graf bez CI - np. przy pierwszym setupie projektu albo ad hoc."
user-invocable: true
argument-hint: []
allowed-tools: mcp__monolynx__get_graph_stats, mcp__monolynx__query_graph, AskUserQuestion, Bash, Read, Write, Edit, Glob, Grep
---

# Lokalna synchronizacja grafu kodu z Monolynx (graphify)

Prowadzisz uzytkownika za reke przez lokalna synchronizacje grafu zaleznosci **biezacego projektu** z modulem Polaczenia. To lokalny odpowiednik CI-owego skilla `/monolynx:create-graph-ci-script` - uzywa TEJ SAMEJ logiki mapowania (`cicd/sync_graph.py`) i tego samego toola `replace_graph` (pelna, idempotentna podmiana grafu).

**Prywatnosc**: ekstrakcja graphify to czysty AST (tree-sitter), dziala w pelni offline - kod NIE opuszcza maszyny. Do Monolynx trafia tylko zmapowany graf (nazwy plikow/klas/funkcji i relacje).

---

## KROK 0: Ustal konfiguracje

1. **Slug projektu** (pierwsza znaleziona wartosc wygrywa):

```bash
echo "${MONOLYNX_PROJECT_SLUG:-(nie ustawiono)}"
```

- Zmienna ustawiona (lub w `.env` projektu) - uzyj jej.
- Brak - sprawdz `user_config.project_slug` pluginu.
- Nadal brak - zapytaj uzytkownika (AskUserQuestion). NIE zgaduj sluga.

2. **URL i token**: `MONOLYNX_URL` (default `https://monolynx.com`), `MONOLYNX_GRAPH_TOKEN` (uzytkownik generuje w Monolynx -> Profil -> Tokeny API). Jesli token nie jest ustawiony w srodowisku/.env - popros uzytkownika, zeby wyeksportowal go w terminalu przed KROK 4. **NIGDY nie pros o wklejenie tokenu do czatu i nie wypisuj jego wartosci.**

W przykladach uzywaj placeholderow `straznik-tajemnic` / `<MONOLYNX_URL>`.

---

## KROK 1: Wykryj graphify

Sprawdz czy graphify jest w PATH (komenda zalezna od systemu):

```bash
# macOS / Linux (takze Git Bash na Windows):
command -v graphify || echo "BRAK"
```

Na Windows PowerShell odpowiednik to `Get-Command graphify` lub `where.exe graphify`.

**Jesli graphify JEST** - przejdz do KROK 2.

**Jesli BRAK** - zapytaj uzytkownika (AskUserQuestion) o preferowana metode instalacji i podaj instrukcje dla jego systemu. Pakiet PyPI to **`graphifyy`** (podwojne "y"), komenda to `graphify`:

| System | Instalacja |
|---|---|
| macOS / Linux | `uv tool install graphifyy` (rekomendowane) lub `pipx install graphifyy` |
| Windows (PowerShell) | `uv tool install graphifyy` lub `pipx install graphifyy`; po instalacji **zrestartuj terminal** (PATH) |

Troubleshooting `command not found` po instalacji:
- sprawdz czy `~/.local/bin` (uv) jest w PATH: `echo $PATH`
- uv: `uv tool update-shell` i nowy terminal
- pelna dokumentacja: https://github.com/Graphify-Labs/graphify (sekcja Troubleshooting)

Po instalacji zweryfikuj: `graphify --version`. Jesli uzytkownik nie chce instalowac - zakoncz skill z informacja, ze graf mozna tez zasilic przez CI (`/monolynx:create-graph-ci-script`) albo recznie (formularze modulu Polaczenia).

---

## KROK 2: Zweryfikuj / wygeneruj `.graphifyignore`

Sprawdz czy w korzeniu repo istnieje `.graphifyignore`:

- **Istnieje** - przeczytaj go i ocen, czy wyklucza testy/migracje/vendored code. Jesli wyglada sensownie - zostaw.
- **Brak** - utworz na bazie struktury projektu (dostosuj katalogi!):

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

Uzasadnienie dla uzytkownika: bez ignore graf bywa 5x wiekszy, a 70-80% wezlow to testy; limity `replace_graph` to 20 000 wezlow / 60 000 krawedzi.

---

## KROK 3: Ekstrakcja

```bash
graphify update .
```

Poinformuj uzytkownika: sam AST, offline, bez LLM i bez kosztow API. Po zakonczeniu zweryfikuj, ze powstal `graphify-out/graph.json` i podaj jego rozmiar.

---

## KROK 4: Mapowanie i push

1. **Sprawdz czy istnieje `cicd/sync_graph.py`** (wygenerowany przez `/monolynx:create-graph-ci-script`):
   - **Istnieje** - uzyj go (jedna logika mapowania dla CI i lokalnie, zero dryfu).
   - **Brak** - wygeneruj go zgodnie ze specyfikacja z KROK 3 skilla `/monolynx:create-graph-ci-script` (cienki mapper graph.json -> `replace_graph`, stdlib only, mapowanie wg wiki "Mapowanie taksonomii Graphify -> Monolynx"). NIE wymyslaj wlasnego mapowania.

2. **Najpierw dry-run** (pokaz uzytkownikowi liczby):

```bash
python cicd/sync_graph.py --dry-run
```

3. **Push** - poinformuj uzytkownika, ze `replace_graph` PODMIENIA caly graf projektu (kasuje stary, wstawia nowy) i poczekaj na potwierdzenie:

```bash
MONOLYNX_URL=<MONOLYNX_URL> MONOLYNX_PROJECT_SLUG=straznik-tajemnic python cicd/sync_graph.py
```

(`MONOLYNX_GRAPH_TOKEN` musi byc w srodowisku - patrz KROK 0.)

Windows PowerShell: zmienne ustawia sie przez `$env:MONOLYNX_GRAPH_TOKEN="osk_..."` przed wywolaniem.

---

## KROK 5: Raport koncowy

1. Odczytaj statystyki z outputu skryptu (`deleted/inserted nodes+edges, skipped_edges`).
2. Opcjonalnie potwierdz stan serwera: `mcp__monolynx__get_graph_stats(project_slug="straznik-tajemnic")`.
3. Wyswietl podsumowanie:

```
=== Graf zsynchronizowany ===
Wgrano:    <N> wezlow / <M> krawedzi
Pominieto: <K> krawedzi (brakujacy endpoint / relacje poza zakresem v1)
Podglad:   <MONOLYNX_URL>/dashboard/straznik-tajemnic/connections/
Nastepnym razem wystarczy: graphify update . && python cicd/sync_graph.py
Automatyzacja po merge do main: /monolynx:create-graph-ci-script
```

---

## WAZNE ZASADY

1. **Nie instaluj niczego bez zgody uzytkownika** - instalacja graphify zawsze po potwierdzeniu (AskUserQuestion).
2. **Token nigdy w czacie** - tylko zmienna srodowiskowa; nie wypisuj wartosci.
3. **Jedna logika mapowania** - zawsze przez `cicd/sync_graph.py` (istniejacy lub wygenerowany wg spec z `/monolynx:create-graph-ci-script`). Zrodlem prawdy mapowania jest wiki "Mapowanie taksonomii Graphify -> Monolynx".
4. **Dry-run przed pushem** - uzytkownik widzi liczby i potwierdza podmiane grafu.
5. **Graf code-only (v1)** - rationale/docs/pakiety/symbole zewnetrzne sa pomijane; brak krawedzi INHERITS po filtrze to nie blad.
6. **Cross-OS** - na Windows uzywaj `Get-Command`/`where.exe` i `$env:` zamiast unixowych odpowiednikow.
7. **Blad syncu nie jest krytyczny** - graf to warstwa dodatkowa; przy bledzie pokaz komunikat skryptu i zaproponuj ponowienie, nie eskaluj.
