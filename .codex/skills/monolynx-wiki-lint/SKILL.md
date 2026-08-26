---
name: monolynx-wiki-lint
description: "Audyt zdrowia wiki projektu (metoda LLM Wiki). Wykrywa sieroty, martwe linki, sprzecznosci i luki, prezentuje raport i proponuje naprawy. Uzyj gdy chcesz sprawdzic spojnosc wiki i ja uporzadkowac."
user-invocable: true
argument-hint: []
allowed-tools: mcp__monolynx__get_wiki_config, mcp__monolynx__lint_wiki, mcp__monolynx__get_wiki_page, mcp__monolynx__list_wiki_pages, mcp__monolynx__get_wiki_backlinks, mcp__monolynx__create_wiki_page, mcp__monolynx__update_wiki_page, mcp__monolynx__append_wiki_log, AskUserQuestion, Bash
---

# LINT - audyt zdrowia wiki

Realizujesz operacje **LINT** metody LLM Wiki: okresowy audyt spojnosci wiki. Sprawdzasz, czy graf wiedzy jest spojny (brak sierot i martwych linkow), czy nie ma nierozstrzygnietych sprzecznosci i czy nie brakuje stron dla wielokrotnie wzmiankowanych konceptow. Po raporcie pomagasz uzytkownikowi naprawic znalezione problemy.

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

## Krok 0: Warunek wstepny - metoda musi byc wlaczona

Sprawdz stan:

```
mcp__monolynx__get_wiki_config(project_slug="straznik-tajemnic")
```

- **Jesli `wiki_llm_enabled` jest `false`** - poinformuj uzytkownika: _"Metoda LLM Wiki nie jest wlaczona dla tego projektu. Uruchom najpierw `/monolynx:wiki-init`."_ i **przerwij** skill.
- **Jesli `true`** - kontynuuj.

---

## Krok 1: Uruchom audyt

```
mcp__monolynx__lint_wiki(project_slug="straznik-tajemnic")
```

Zwraca raport z czterema listami:

- `orphans` - strony bez zadnego backlinku przychodzacego,
- `dead_links` - wikilinki do nieistniejacych stron,
- `contradictions` - strony z markerem sprzecznosci (`> **Sprzeczność ...`),
- `gaps` - koncepty wzmiankowane wielokrotnie jako wikilink, ale bez wlasnej strony.

---

## Krok 2: Zaprezentuj raport

Pokaz raport czytelnie, w czterech sekcjach. Dla kazdej kategorii podaj liste pozycji i krotkie wyjasnienie, co oznacza:

### Sieroty (`orphans`)

Strony, do ktorych nic nie prowadzi. Nie da sie do nich dotrzec przez nawigacje grafu - latwo o nich zapomniec.

### Martwe linki (`dead_links`)

Wikilinki wskazujace na strony, ktore nie istnieja. Albo brakuje strony docelowej, albo slug w linku jest bledny.

### Sprzecznosci (`contradictions`)

Strony z markerem sprzecznosci. Czekaja na rozstrzygniecie przez czlowieka - zawieraja dwie wersje, ktore sie wykluczaja.

### Luki (`gaps`)

Koncepty wzmiankowane wielokrotnie jako wikilink, ale bez wlasnej strony. Sygnal, ze warto utworzyc dla nich dedykowana strone.

Jesli ktoras lista jest pusta - napisz to wprost (np. "Sieroty: brak").

---

## Warunek: naprawy tylko z brancha main/master

Audyt (Kroki 1-2) jest tylko do odczytu i dziala na kazdym branchu. Natomiast **naprawy** (create / update / delete stron w Kroku 3) wykonuj wylacznie z brancha `main` lub `master` - wiki ma odzwierciedlac stan zmergowany, nie prace w toku. Przed jakakolwiek naprawa sprawdz branch:

```bash
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(brak repozytorium git)"
```

- **Branch `main` lub `master`** - mozesz wykonywac naprawy.
- **Inny branch albo brak repozytorium git** - NIE naprawiaj automatycznie. Zapytaj uzytkownika (`AskUserQuestion`): _"Jestes na branchu `<branch>`, nie na main/master. Zmiany w wiki zalecane dopiero po merge do main. Kontynuowac naprawy mimo to?"_ z opcjami:
  - **Nie, przerwij (zalecane)** - pokaz raport, ale nie zapisuj zmian.
  - **Tak, kontynuuj mimo to** - wykonaj naprawy.

  Rekomendujesz **Nie**. Czekaj na decyzje; bez wyraznej zgody nie modyfikuj stron.

---

## Krok 3: Zaproponuj naprawy

Dla kazdej niepustej kategorii zaproponuj konkretna akcje naprawcza:

- **Sieroty** - dolinkuj strone z `wiki-index` lub z powiazanej tematycznie strony (dodaj wikilink przez `update_wiki_page`). Uzyj `get_wiki_backlinks`, zeby znalezc dobre miejsce na link.
- **Martwe linki** - albo utworz brakujaca strone docelowa (`create_wiki_page` z odpowiednim frontmatterem), albo popraw bledny slug w stronie zrodlowej (`update_wiki_page`).
- **Sprzecznosci** - rozstrzygnij z uzytkownikiem ktora wersja jest aktualna, zaktualizuj tresc i **usun marker** sprzecznosci ze strony (`update_wiki_page`).
- **Luki** - rozwaz utworzenie strony konceptu (`create_wiki_page`, `type: koncept`) i podlaczenie do niej istniejacych wzmianek.

Zapytaj uzytkownika (`AskUserQuestion`), ktore problemy naprawic teraz - nie naprawiaj wszystkiego automatycznie. Sprzecznosci ZAWSZE wymagaja decyzji czlowieka. Po decyzji wykonaj zaakceptowane naprawy.

---

## Krok 4 (opcjonalnie): Dopisz wpis do dziennika

Jesli cokolwiek naprawiono, odnotuj audyt w dzienniku:

```
mcp__monolynx__append_wiki_log(project_slug="straznik-tajemnic", entry="LINT: audyt zdrowia - naprawiono <co> (sieroty: N, martwe linki: M, sprzecznosci: K, luki: L)")
```

---

## Podsumowanie dla uzytkownika

Na koniec pokaz:

- liczbe znalezionych problemow w kazdej kategorii,
- co naprawiono w tej sesji,
- co pozostaje do rozstrzygniecia (zwlaszcza nierozstrzygniete sprzecznosci).

---

## Wazne zasady

1. **Warunek wstepny** - Krok 0 jest obowiazkowy; bez wlaczonej metody `lint_wiki` zwroci blad.
2. **Sprzecznosci rozstrzyga czlowiek** - nigdy nie usuwaj markera bez decyzji uzytkownika.
3. **Pytaj przed naprawa** - nie modyfikuj stron automatycznie; zatwierdz zakres przez `AskUserQuestion`.
4. **Odnotuj audyt** - jesli cos naprawiono, dopisz wpis do `wiki-log`.
5. **Jezyk**: polski (terminy techniczne i nazwy narzedzi w oryginale).
