---
name: monolynx-work
description: "Podejmij zadanie ze sprintu biezacego projektu Monolynx. Waliduje branch, uruchamia Researchera, dobiera zespol agentow i prowadzi rownolegle prace z obowiazkowym krytykiem, lintem i testami. Uzyj gdy chcesz rozpoczac prace nad ticketem."
user-invocable: true
argument-hint: [ticket-id lub klucz np. PROJ-12]
---

# Proces pracy nad zadaniem - Team Manager

Jestes **Team Managerem**. Koordynujesz prace zespolu agentow nad zadaniem z projektu Monolynx.

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

## Konfiguracja skilla

Odczytaj pozostale zmienne jednym wywolaniem:

```bash
echo "BRANCH_MODE=${MONOLYNX_BRANCH_MODE:-ticket} AUTOTEST=${MONOLYNX_AUTOTEST:-false} AUTOCOMMIT=${MONOLYNX_AUTOCOMMIT:-false} AUTOPUSH=${MONOLYNX_AUTOPUSH:-false}"
```

| Zmienna | Domyslnie | Znaczenie |
|---|---|---|
| `MONOLYNX_BRANCH_MODE` | `ticket` | `ticket` - branch musi zawierac numer ticketu; `sprint` - dowolny branch poza main, bez pytan; `off` - brak walidacji |
| `MONOLYNX_AUTOTEST` | `false` | `true` - skill sam odpala lint i testy; `false` - wypisuje komendy i czeka na wynik od uzytkownika |
| `MONOLYNX_AUTOCOMMIT` | `false` | `true` - skill commituje po zielonym tescie; `false` - wypisuje gotowa komende |
| `MONOLYNX_AUTOPUSH` | `false` | `true` - skill pushuje bez pytania; `false` - nigdy nie pushuje |

Ustawiane w `.claude/settings.json` lub `.claude/settings.local.json` (pole `env`).

Przy pierwszym uzyciu `MONOLYNX_AUTOPUSH=true` w sesji poinformuj uzytkownika:
_"AUTOPUSH wlaczony - pushuje bez pytania, z pominieciem zwyklego potwierdzenia."_

---

## KROK 1: Zaladuj narzedzia i pobierz zadanie

Zaladuj narzedzia Monolynx przez ToolSearch (trzy wywolania rownolegle):

```
ToolSearch(query="+monolynx ticket board comment")
ToolSearch(query="+monolynx graph wiki search")
ToolSearch(query="+monolynx pipeline create job finish")
```

Trzecie zapytanie laduje toole pipeline. **Jesli sa dostepne** - przeczytaj plik
`pipeline.md` z katalogu tego skilla i stosuj opisany tam protokol raportowania
w calym przebiegu. **Jesli niedostepne** (starszy serwer MCP bez modulu Pipelines) -
pomin instrumentacje w calosci i pracuj dalej. Pipeline to obserwowalnosc, nie gate.

Nastepnie pobierz zadanie:

- **Jesli podano ticket-id** (`$ARGUMENTS` nie jest pusty):
  Pobierz ticket: `mcp__monolynx__get_ticket(project_slug="straznik-tajemnic", ticket_id="$ARGUMENTS")`

- **Jesli NIE podano ticket-id**:
  1. Pobierz tablice Kanban: `mcp__monolynx__get_board(project_slug="straznik-tajemnic")`
  2. Wyswietl uzytkownikowi tickety z kolumn `todo` i `in_progress` w czytelnej formie (ID, tytul, priorytet, story points)
  3. Zapytaj: **"Ktory ticket chcesz podjac? Podaj ID."**
  4. Poczekaj na odpowiedz uzytkownika - NIE kontynuuj bez wyboru

## KROK 2: Walidacja brancha Git

**CEL**: Upewnic sie, ze praca nie trafi na zly branch.

### 2a. Sprawdz aktualny branch

```bash
git branch --show-current
```

### 2b. Twardy gate - main

**Niezaleznie od `MONOLYNX_BRANCH_MODE`**: jesli aktualny branch to `main` lub `master`,
zawsze zapytaj uzytkownika i poczekaj na odpowiedz. Nigdy nie zaczynaj pracy na
glownym branchu bez jawnej zgody.

### 2c. Walidacja wg trybu

**`MONOLYNX_BRANCH_MODE=off`** - pomin walidacje, przejdz do 2d.

**`MONOLYNX_BRANCH_MODE=sprint`** - dowolny branch poza main/master jest OK.
Odnotuj nazwe brancha i przejdz do 2d bez pytania. Tryb dla pracy nad calym
sprintem na jednym branchu.

**`MONOLYNX_BRANCH_MODE=ticket`** (domyslny) - wyodrebnij numer ticketu z pola `key`
(np. `PROJ-42` -> `42`). Jesli nazwa brancha zawiera ten numer -> OK, przejdz do 2d.
W przeciwnym razie zapytaj:

> Pracujesz nad ticketem **#[numer]** (`[tytul]`), ale jestes na branchu `[aktualny_branch]`.
>
> Co chcesz zrobic?
> - **(a)** Kontynuowac na obecnym branchu `[aktualny_branch]`
> - **(b)** Przejsc na `main`, pobrac zmiany i utworzyc nowy branch `feature-[numer]-[slug]`
> - **(c)** To branch sprintowy - przelacz sie na tryb `sprint` do konca tej sesji

**Jesli uzytkownik wybral (b)**:

```bash
git checkout main && git pull origin main && git checkout -b feature-<numer>-<slug>
```

Gdzie `<slug>` to skrocony, kebab-case tytul ticketu (max 4-5 slow, bez polskich znakow).

**Jesli uzytkownik wybral (c)** - traktuj `BRANCH_MODE` jako `sprint` do konca sesji
i zaproponuj wpis na stale w `.claude/settings.local.json`.

**Poczekaj na odpowiedz uzytkownika** - NIE kontynuuj bez decyzji.

### 2d. Pipeline

Jesli instrumentacja aktywna - utworz pipeline i job `branch-validation` wg
sekcji 1 pliku `pipeline.md`.

## KROK 3: Researcher - analiza zadania

**CEL**: Pelna analiza zadania ZANIM zespol zacznie prace. Researcher to super-agent eksploracyjny, ktory buduje kompletny raport dla Team Agenta.

### 3a. Zmierz czas startu Researchera

```bash
date +%s
```

Jesli instrumentacja aktywna - utworz job `researcher` i ustaw `running` (sekcja 2 `pipeline.md`).

### 3b. Uruchom Researchera

Uruchom agenta `Explore` z nastepujacym zadaniem:

```
Agent(
  subagent_type="Explore",
  description="Researcher - analiza ticketu",
  prompt="Jestes Researcherem projektu Monolynx. Twoim zadaniem jest pelna analiza ticketu i przygotowanie raportu dla zespolu.

TICKET: [tytul]
OPIS: [pelny opis ticketu]
KOMENTARZE: [jesli sa]

Wykonaj nastepujace kroki:

1. **Przeczytaj i zrozum ticket** - stresz zadanie wlasnymi slowami
2. **Kontekst deterministyczny** - zanim przeszukasz wiki, zaladuj kontekst deterministyczny:

   **Spec-page ticketu:** Sprawdz czy w danych ticketu jest pole `spec_page_id`. Jesli jest ustawione (nie None):
   ```
   mcp__monolynx__get_wiki_page(project_slug='straznik-tajemnic', page_id='<spec_page_id>')
   ```
   Zaladuj jej tresc jako PRIMARY CONTEXT. Nie szukaj zastepnika przez search_wiki.
   Jesli `spec_page_id` jest None - pomin i przejdz dalej.

   **Constitution projektu:** Sprawdz czy projekt ma strone `constitution`:
   ```
   mcp__monolynx__search_wiki(project_slug='straznik-tajemnic', query='constitution', limit=1)
   ```
   Jesli wynik ma strone ze slug=`constitution` lub tytulem zawierajacym \"constitution\" - pobierz pelna tresc przez `get_wiki_page` i zaladuj jako project-level context.
   Jesli nie istnieje - kontynuuj bez bledu.

   **Toolchain projektu:** Sprawdz czy projekt ma strone `toolchain`:
   ```
   mcp__monolynx__search_wiki(project_slug='straznik-tajemnic', query='toolchain lint test', limit=1)
   ```
   Jesli wynik ma strone ze slug=`toolchain` - pobierz pelna tresc przez `get_wiki_page`.
   Zawiera komendy lint/test, informacje czy projekt ma testy i czy stosowac TDD.
   Przepisz ja DOSLOWNIE do sekcji \"Toolchain\" raportu - Team Manager jej potrzebuje.
   Jesli nie istnieje - w raporcie napisz 'Brak strony toolchain'.

3. **Zbadaj kod** - znajdz pliki, klasy i funkcje powiazane z zadaniem. Uzyj Glob i Grep do przeszukania kodu.
4. **Przeszukaj wiki** - uzyj mcp__monolynx__search_wiki(project_slug='straznik-tajemnic', query='<zapytanie>') dla kazdego istotnego tematu z ticketu
5. **Przeszukaj graf** - uzyj mcp__monolynx__query_graph(project_slug='straznik-tajemnic', search='<nazwa pliku/funkcji>') dla kluczowych elementow kodu. Jesli graf niedostepny - pomin.

Na koniec wygeneruj RAPORT w dokladnie tym formacie:

## Raport Researchera

### Opis zadania
[Streszczenie ticketu wlasnymi slowami - co i dlaczego trzeba zrobic]

### Analiza kodu
- Pliki do modyfikacji: [lista z krotkim opisem co trzeba zmienic]
- Powiazane moduly: [lista modulow ktorych dotyka zmiana]
- Potencjalne ryzyka: [co moze sie zepsuc, na co uwazac]

### Toolchain
[Doslowna tresc strony wiki 'toolchain' - komendy lint/test, czy sa testy, czy TDD. Lub 'Brak strony toolchain']

### Kontekst z Wiki
[Wyciag z powiazanych stron wiki - lub 'Brak powiazanych stron']

### Zaleznosci z Grafu
[Mapa powiazanych wezlow i krawedzi - lub 'Graf niedostepny/brak wynikow']

### Rekomendacje
- Sugerowane podejscie: [opis jak najlepiej zrealizowac zadanie]
- Estymowany zakres zmian: [maly/sredni/duzy]
- Potrzebni agenci: [lista rekomendowanych typow agentow z uzasadnieniem]
- Podzial plikow: [dla kazdego rekomendowanego agenta wypisz KONKRETNE pliki. Zaznacz jesli dwa zakresy dotykaja tego samego pliku]"
)
```

### 3c. Jesli Researcher nie moze byc uruchomiony

Jesli z jakiegokolwiek powodu agent `Explore` nie jest dostepny:

1. Poinformuj uzytkownika: _"Potrzebuje agenta Explore do pelnej analizy. Czy chcesz go skonfigurowac? Mozesz tez kontynuowac bez niego - sam zrobie uproszczona analize."_
2. **Jesli uzytkownik chce kontynuowac bez Researchera** - wykonaj uproszczona analize samodzielnie:
   - Przeczytaj ticket
   - Uzyj Glob/Grep do znalezienia powiazanych plikow
   - Pobierz strone wiki `toolchain` (jesli jest)
   - Zbuduj uproszczony raport i przejdz do KROK 4

### 3d. Zamknij Researchera

```bash
date +%s
```

Oblicz czas pracy Researchera (koniec - start, minimum 1 minuta) i zaloguj:

```
mcp__monolynx__log_time(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  duration_minutes=<czas Researchera>,
  date_logged="<YYYY-MM-DD>",
  description="Researcher - analiza ticketu"
)
```

Zapisz raport - bedzie uzyty w KROK 5 i KROK 6.

Jesli instrumentacja aktywna - zaloguj raport do joba i zamknij go (sekcja 2 `pipeline.md`).

## KROK 4: Przeczytaj zadanie, zmien status, zapisz czas

1. Pobierz pelne szczegoly ticketa: `mcp__monolynx__get_ticket(...)` (jesli jeszcze nie pobrane)
2. Przeczytaj opis, komentarze, priorytet, story points
3. Zapisz czas startu pracy Team Managera:

```bash
date +%s
```

4. Zmien status ticketa na `in_progress`:

```
mcp__monolynx__update_ticket(project_slug="straznik-tajemnic", ticket_id="<ID>", status="in_progress", assignee_email="me")
```

## KROK 5: Team Agent - dobierz agentow na podstawie raportu

### Dostepni agenci

Przeskanuj dostepnych agentow w projekcie, w katalogu zaleznym od Twojego runtime'u:

- **Claude Code**: definicje agentow w `.claude/agents/*.md` (plus agenci pluginowi jako fallback).
- **Codex**: brak katalogu subagentow - role i konwencje projektu wyczytaj z `AGENTS.md` w korzeniu repo.

Traktuj agentow/role zdefiniowane w projekcie jako preferowane zrodlo prawdy dla stacku i konwencji. Agenci pluginowi sa fallbackiem, gdy projekt nie ma wlasnego dopasowanego agenta.

Zbuduj liste kandydatow z nazwami `subagent_type`, opisami i specjalizacjami wynikajacymi z frontmatter/opisu agenta. Nie zakladaj z gory konkretnych typow agentow ani stacku technologicznego.

### Zasady doboru

1. **Przeanalizuj raport Researchera** - sekcja "Potrzebni agenci" to rekomendacja, ale Team Agent podejmuje ostateczna decyzje
2. **Jesli ticket wskazuje agentow w tresci** - uzyj wskazanych, o ile sa dostepni
3. **Jesli NIE wskazuje** - dobierz agentow na podstawie raportu, tresci zadania i dostepnych definicji agentow. Wybierz MINIMALNY zestaw potrzebny do wykonania zadania
4. **Krytyk jest ZAWSZE w zespole** - wybierz dostepnego agenta pelniacego role recenzenta kodu / quality gate. Nie zakladaj, ze musi nazywac sie `code-reviewer`
5. **TDD** - jesli sekcja "Toolchain" raportu mowi, ze projekt ma testy i stosuje TDD: agent testowy pisze failing testy PRZED developerami i idzie SEKWENCYJNIE, jako pierwszy. Reszta zespolu startuje dopiero po jego zakonczeniu, z testami jako specyfikacja

### Przydzial plikow - obowiazkowy

Dla kazdego agenta wypisz **konkretne pliki**, nie obszary. Zrodlo: sekcja
"Podzial plikow" raportu Researchera.

```
- <agent-1>: src/services/x.py, src/models/x.py
- <agent-2>: templates/dashboard/x/*.html
```

**Detekcja kolizji**: jesli zbiory plikow dwoch agentow maja czesc wspolna - ci
konkretni agenci ida SEKWENCYJNIE (najpierw jeden, potem drugi z informacja o
zmianach pierwszego). Pozostali dalej pracuja rownolegle. Rownolegly zapis do
tego samego pliku konczy sie cichym nadpisaniem.

### Dodaj komentarz z planem

Po wyborze agentow, ZANIM zaczniesz prace, dodaj komentarz do ticketa:

```
mcp__monolynx__add_comment(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  content="**Team Manager - Plan pracy**\n\n**Raport Researchera (streszczenie):**\n- [krotkie podsumowanie raportu - zakres zmian, ryzyka, podejscie]\n\n**Dobrani agenci:**\n- [agent 1] - [uzasadnienie] - pliki: [lista]\n- [agent 2] - [uzasadnienie] - pliki: [lista]\n- [wybrany-krytyk] - obowiazkowy quality gate\n\n**Plan realizacji:**\n1. [krok 1 - ktory agent, co robi]\n2. [krok 2 - ktory agent, co robi]\n..."
)
```

Jesli instrumentacja aktywna - zarejestruj job `team-plan` i joby agentow
(sekcja 3 `pipeline.md`). Zapamietaj `job_id` kazdego agenta.

## KROK 6: Agents Team - praca rownolegla

**ZASADA KLUCZOWA**: developerzy o rozlacznych zbiorach plikow startuja
**JEDNOCZESNIE**. Krytyk startuje razem z nimi, ale review zaczyna dopiero po
sygnale od wszystkich developerow.

### 6a. Sprawdz czy Agent Teams jest wlaczony

```bash
echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
```

- **`=1`** -> natywne Agent Teams (`TeamCreate`). Agenci komunikuja sie przez `SendMessage`.
- **inaczej** -> wiele wywolan `Agent()` w jednej wiadomosci, BEZ komunikacji miedzy agentami.

Ta roznica zmienia prompt krytyka - patrz 6c.

### 6b. Zmierz czas startu

```bash
date +%s
```

### 6c. Uruchom zespol

Kazdy developer dostaje:

- Pelna tresc ticketa (tytul + opis)
- **Raport Researchera** (pelny lub odpowiedni fragment)
- **Konkretna liste plikow** przydzielona w KROK 5 (z zakazem ruszania cudzych)
- Liste kryteriow akceptacji przypisanych do TEGO agenta
- Blok RAPORT DO PIPELINE z jego `job_id` (jesli instrumentacja aktywna)

**Acceptance Criteria**: przypisz kazde kryterium do agenta odpowiedzialnego za
jego realizacje. Kryterium dotyczace kilku agentow -> przypisz temu, ktory
odpowiada za wiekszosc pracy. W prompcie:

```
KRYTERIA AKCEPTACJI DO ODHACZENIA (po zakonczeniu pracy):
- [criterion_id] - [opis kryterium]

Po zakonczeniu pracy, dla KAZDEGO zrealizowanego kryterium uzyj:
mcp__monolynx__update_acceptance_criterion(project_slug="straznik-tajemnic", ticket_id="<ID>", criterion_id="<CID>", is_completed=true)
```

**Czas pracy**: kazdy agent mierzy i raportuje SWOJ czas - blok RAPORT DO PIPELINE
w `pipeline.md` (sekcja 4) zawiera instrukcje. Jesli instrumentacja nieaktywna,
i tak wklej do promptu kazdego agenta:

```
CZAS PRACY: zmierz `date +%s` na starcie i na koncu. W odpowiedzi koncowej podaj
linie: `CZAS PRACY: X min` (minimum 1).
```

#### Prompt krytyka - Agent Teams (`=1`)

Krytyk czeka na sygnal, nie odpytuje repo w petli. Developerzy musza go zawolac -
dodaj do promptu KAZDEGO developera:

```
Po zakonczeniu pracy wyslij SendMessage do agenta "krytyk" z lista zmienionych plikow
i jednozdaniowym opisem zmiany. To sygnal do rozpoczecia review.
```

A do promptu krytyka:

```
Jestes Krytykiem. Oceniasz prace developerow na tickecie [tytul].

RAPORT RESEARCHERA:
[pelny raport]

Zespol (N developerow):
- <agent-1>: [zakres] (pipeline job_id: <id>)
- <agent-2>: [zakres] (pipeline job_id: <id>)

1. CZEKAJ na SendMessage od WSZYSTKICH N developerow. NIE zaczynaj review wczesniej -
   git diff przed ich zakonczeniem pokaze niekompletny stan.
2. Po otrzymaniu N wiadomosci: sprawdz git diff wszystkich zmienionych plikow.
3. Przeczytaj plik `review-rubric.md` z katalogu skilla work i oceniaj SCISLE wedlug
   tamtej tabeli odjec. Kazde odjecie z lokalizacja plik:linia.
4. Odpowiedz w formacie z rubryki. Prog zaliczenia: 82.
5. Jesli instrumentacja pipeline aktywna - zapisz score do joba kazdego agenta
   (sekcja 5 `pipeline.md`).
```

#### Prompt krytyka - bez Agent Teams

Brak komunikacji miedzy agentami, wiec krytyka uruchamiasz **osobno, po**
zakonczeniu pracy developerow (nie w tej samej wiadomosci). Ten sam prompt co
wyzej, ale punkt 1 zastap:

```
1. Developerzy juz skonczyli. Zmienione pliki: [lista od Team Managera].
```

### 6d. Obsluz wyniki

1. **Zbierz wyniki** od wszystkich agentow i krytyka, w tym linie `CZAS PRACY: X min`
2. **Jesli krytyk dal >= 82 kazdemu agentowi** -> przejdz do 6e
3. **Jesli krytyk dal < 82 jakiemus agentowi**:
   - Uruchom TYLKO tego agenta ponownie z feedbackiem krytyka
   - Jesli instrumentacja aktywna - podbij `attempt` joba (sekcja 5 `pipeline.md`)
   - Uruchom krytyka ponownie dla poprawionego kodu (zaktualizuje `score`)
   - **Maksymalnie 3 iteracje** na agenta
   - Po 3 nieudanych iteracjach -> zapytaj uzytkownika o decyzje

### 6e. Komentarze i czas pracy agentow

Dodaj komentarz do ticketa **W IMIENIU KAZDEGO agenta**:

```
mcp__monolynx__add_comment(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  content="**[Nazwa agenta] - Podsumowanie pracy**\n\nCo zrobiono:\n- [zmiana 1 - plik/pliki]\n- [zmiana 2 - plik/pliki]\n\nOcena krytyka: [score]/100 ([APPROVED/NEEDS WORK] -> ile iteracji)\n\nCzas pracy: [X] min\n[Jedno zdanie podsumowujace prace agenta]"
)
```

Zaloguj czas KAZDEGO agenta osobno - wartosc z jego linii `CZAS PRACY`, nie
z wlasnego stopera:

```
mcp__monolynx__log_time(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  duration_minutes=<czas zgloszony przez agenta, minimum 1>,
  date_logged="<YYYY-MM-DD>",
  description="[Nazwa agenta] - [krotki opis co zrobiono]"
)
```

Agent nie podal czasu -> uzyj wlasnego pomiaru (6b -> teraz) i zaznacz w opisie
`(czas szacowany)`.

### 6f. Weryfikacja kryteriow akceptacji

1. Pobierz aktualna liste: `mcp__monolynx__list_acceptance_criteria(project_slug="straznik-tajemnic", ticket_id="<ID>")`
2. Dla kazdego nieodhaczonego kryterium:
   - Sprawdz czy praca faktycznie zostala wykonana (wyniki agentow, git diff)
   - **Wykonana** -> odhacz: `mcp__monolynx__update_acceptance_criterion(project_slug="straznik-tajemnic", ticket_id="<ID>", criterion_id="<CID>", is_completed=true)`
   - **Niewykonana** -> zapisz jako niezrealizowane (raport w KROK 7f)

## KROK 6.5: Lint i testy - gate przed review

**CEL**: Ticket nie trafia do `in_review` z kodem, ktory sie nie kompiluje albo lamie testy.

### Skad komendy

Z sekcji "Toolchain" raportu Researchera (strona wiki `toolchain`).

**Brak strony `toolchain`** - poinformuj uzytkownika:

> Projekt nie ma strony wiki `toolchain`, wiec nie znam komend lint/test.
> Uruchom `/monolynx:project-toolchain` zeby ja utworzyc (jednorazowo).
>
> Kontynuowac bez lintu i testow? (tak / podam komendy recznie)

Poczekaj na odpowiedz. Bez potwierdzenia nie zmieniaj statusu ticketu.

### Wykonanie

**`MONOLYNX_AUTOTEST=false`** (domyslnie) - wypisz komendy i poczekaj:

> Uruchom i wklej wynik:
> ```
> [komenda lint z toolchain]
> [komenda test z toolchain]
> ```

**`MONOLYNX_AUTOTEST=true`** - odpal komendy sam.

### Decyzja

- **Wszystko zielone** -> przejdz do KROK 7
- **Cokolwiek czerwone** -> uruchom ponownie agenta odpowiedzialnego za wadliwy
  obszar z trescia bledu. Po poprawce powtorz lint i testy. Maksymalnie 3 iteracje,
  potem zapytaj uzytkownika.
- **Uzytkownik swiadomie pominal** -> odnotuj w podsumowaniu (KROK 7f) jako
  "lint/testy pominiete"

Jesli instrumentacja aktywna - zaloguj job `lint-test` (sekcja 6 `pipeline.md`).

## KROK 7: Podsumowanie Team Managera

### 7a. Zmierz calkowity czas

```bash
date +%s
```

Oblicz czas Team Managera (od KROK 4 do teraz).

### 7b. Dodaj komentarz podsumowujacy

```
mcp__monolynx__add_comment(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  content="**Team Manager - Podsumowanie zadania**\n\nZrealizowane:\n- [podsumowanie co zostalo zrobione]\n\nRaport Researchera: [1-2 zdania podsumowania] ([X] min)\n\nZespol i oceny:\n- [agent 1]: [score]/100 - [1 zdanie] ([X] min)\n- [agent 2]: [score]/100 - [1 zdanie] ([X] min)\n\nLint i testy: [zielone / czerwone -> ile iteracji / pominiete]\n\nLaczny czas pracy zespolu: [suma minut wszystkich agentow + Researcher + TM] min\n\nCzas pracy Team Managera: [X] min\n[Jedno zdanie podsumowujace calosc zadania]"
)
```

### 7c. Zaloguj czas pracy Team Managera

```
mcp__monolynx__log_time(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  duration_minutes=<calkowity czas Team Managera, minimum 1>,
  date_logged="<YYYY-MM-DD>",
  description="Team Manager - koordynacja zadania"
)
```

### 7d. Commit

Zaleznie od konfiguracji:

**`MONOLYNX_AUTOCOMMIT=false`** (domyslnie) - wypisz gotowa komende, nie wykonuj:

> Zmiany gotowe do commita:
> ```bash
> git add -A && git commit -m "[PROJ-XX] [tytul ticketu]"
> ```

**`MONOLYNX_AUTOCOMMIT=true`** - wykonaj commit (tylko po zielonym lincie i testach).

**`MONOLYNX_AUTOPUSH=true`** - dodatkowo `git push`. Przy `false` nigdy nie pushuj,
nawet gdy uzytkownik commituje sam - push zostaje jego decyzja.

### 7e. Zamknij pipeline i zmien status

Jesli instrumentacja aktywna - job `team-manager-summary` i `finish_pipeline`
(sekcja 7 `pipeline.md`).

```
mcp__monolynx__update_ticket(project_slug="straznik-tajemnic", ticket_id="<ID>", status="in_review")
```

### 7f. Podsumowanie dla uzytkownika

- Co zostalo zrobione
- Oceny krytyka dla kazdego agenta
- **Wynik lintu i testow**
- Laczny czas pracy (Researcher + agenci + TM)
- Status ticketa
- **Kryteria akceptacji** - ile odhaczonych / ile lacznie. Niezrealizowane wylistuj z powodem
- Komenda commita, jesli `AUTOCOMMIT=false`

---

## WAZNE ZASADY

1. **Krytyk NIGDY nie pisze kodu** - tylko ocenia prace innych, wedlug `review-rubric.md`
2. **Komentarze do ticketa sa OBOWIAZKOWE** - plan (KROK 5), kazdy agent (6e), podsumowanie (7b)
3. **Czas mierzy KAZDY agent osobno** i raportuje go w odpowiedzi. Team Manager loguje zgloszone wartosci, nie wlasny stoper. Czas Researchera i Team Managera logowany osobno. Suma to roboczogodziny, nie czas zegarowy
4. **Jezyk komentarzy**: polski
5. **Nie zgaduj** - jesli cos jest niejasne w tickecie, zapytaj uzytkownika
6. **Nie pomijaj krytyka** - kazdy agent MUSI przejsc review, nawet jesli zadanie wydaje sie proste
7. **Lint i testy sa gate'em** - KROK 6.5 przed `in_review`. Pominiecie tylko za jawna zgoda uzytkownika, odnotowane w podsumowaniu
8. **Rownolegla praca wymaga rozlacznych plikow** - agenci o wspolnych plikach ida sekwencyjnie (KROK 5). Krytyk zaczyna review dopiero po sygnale od wszystkich developerow (6c)
9. **Branch** - twardy gate na `main`/`master` zawsze. Reszta wg `MONOLYNX_BRANCH_MODE`
10. **Commit i push tylko za zgoda** - domyslnie skill wypisuje komendy, nie wykonuje. Flagi `MONOLYNX_AUTOCOMMIT` / `MONOLYNX_AUTOPUSH` zmieniaja to swiadomie
11. **Researcher jest pierwszym krokiem** - KROK 3 obowiazkowy. Bez raportu nie uruchamiaj zespolu (chyba ze uzytkownik swiadomie zrezygnuje)
12. **Acceptance criteria sa obowiazkowe** - kazdy agent odhacza swoje (6c), Team Manager weryfikuje kompletnosc (6f) PRZED podsumowaniem
13. **Graf kodu jest opcjonalny** - Neo4j niedostepny, Researcher kontynuuje bez grafu. Graf aktualizuje zewnetrzny [graphify](https://github.com/Graphify-Labs/graphify) po merge do main (`cicd/sync_graph.py` -> `replace_graph`); setup: `/monolynx:create-graph-ci-script` (CI) lub `/monolynx:graph-sync` (lokalnie)
14. **Pipeline jest best-effort, nie gate** - protokol w `pipeline.md`. Blad ktoregokolwiek toola pipeline NIGDY nie przerywa pracy. Toole niedostepne -> pomin instrumentacje w calosci
15. **Agentow dobieramy dynamicznie** - Claude Code: `.claude/agents/*.md` (plus agenci pluginowi jako fallback); Codex: role z `AGENTS.md`. Agenci projektowi maja pierwszenstwo
