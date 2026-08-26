---
name: monolynx-wiki-init
description: "Wlacz metode LLM Wiki dla biezacego projektu. Tworzy strony systemowe (regulamin, katalog, dziennik) i wlacza flage. Uzyj gdy chcesz zaczac prowadzic wiki metoda LLM Wiki (wg Karpathy'ego)."
user-invocable: true
argument-hint: []
allowed-tools: mcp__monolynx__get_wiki_config, mcp__monolynx__bootstrap_wiki_llm, mcp__monolynx__list_projects, AskUserQuestion, Bash
---

# Inicjalizacja metody LLM Wiki

Wlaczasz dla biezacego projektu metode **LLM Wiki** (wg pomyslu Andreja Karpathy'ego): wiki to narastajacy, kompilowany artefakt wiedzy, ktory pisze i utrzymuje agent AI, a czlowiek dostarcza zrodla i zadaje pytania. Ten skill jednorazowo przygotowuje projekt: tworzy strony systemowe i wlacza flage metody.

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

## Warunek wstepny: tylko branch main/master

Operacje zapisu do wiki (create / update / delete stron) wykonuj wylacznie z brancha `main` lub `master`. Wiki ma odzwierciedlac stan zmergowany do glownej galezi, a nie prace w toku na branchu feature. Sprawdz aktualny branch:

```bash
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(brak repozytorium git)"
```

- **Branch `main` lub `master`** - kontynuuj normalnie.
- **Inny branch albo brak repozytorium git** - NIE zapisuj automatycznie. Zapytaj uzytkownika (`AskUserQuestion`): _"Jestes na branchu `<branch>`, nie na main/master. Zapis do wiki zalecany dopiero po merge do main. Kontynuowac mimo to?"_ z opcjami:
  - **Nie, przerwij (zalecane)** - zakoncz bez zapisu do wiki.
  - **Tak, kontynuuj mimo to** - przejdz dalej.

  Rekomendujesz **Nie**. Czekaj na decyzje uzytkownika; bez wyraznej zgody nie zapisuj do wiki.

---

## Krok 1: Sprawdz aktualny stan

Zanim cokolwiek utworzysz, sprawdz czy metoda nie jest juz wlaczona:

```
mcp__monolynx__get_wiki_config(project_slug="straznik-tajemnic")
```

Zwraca `wiki_llm_enabled` oraz id stron systemowych (`schema_page_id`, `log_page_id`, `index_page_id`) lub `null`, gdy strona jeszcze nie istnieje. To narzedzie dziala niezaleznie od flagi - mozesz go wywolac zawsze.

Decyzja:

- **Jesli `wiki_llm_enabled` jest `true` i wszystkie trzy strony systemowe istnieja** (id nie sa null) - metoda jest juz wlaczona. Poinformuj uzytkownika i zapytaj (`AskUserQuestion`):
  - **Odswiez** - ponowny bootstrap jest idempotentny: odbuduje katalog `wiki-index` i dopisze wpis do dziennika `wiki-log`, nie nadpisze ani nie usunie istniejacych stron.
  - **Przerwij** - nic nie rob, zakoncz.

  Poczekaj na decyzje. Jesli **Przerwij** - zakoncz skill z krotka informacja, ze metoda jest juz aktywna (podaj linki/id stron systemowych z `get_wiki_config`).

- **W przeciwnym razie** (flaga off lub brak ktorejs strony) - przejdz do Kroku 2.

---

## Krok 2: Bootstrap metody

Wywolaj:

```
mcp__monolynx__bootstrap_wiki_llm(project_slug="straznik-tajemnic")
```

Co robi to narzedzie (idempotentnie, samo wlacza flage):

- tworzy `wiki-schema` - **regulamin** metody LLM Wiki: typy stron, frontmatter, konwencje linkowania, workflow INGEST/QUERY/LINT, marker sprzecznosci. Agent czyta go na poczatku kazdej operacji,
- tworzy `wiki-index` - **katalog** wszystkich stron ze streszczeniami, odbudowywany automatycznie (nie edytuj recznie),
- tworzy `wiki-log` - **dziennik** operacji w trybie append-only,
- ustawia `wiki_llm_enabled = true` dla projektu.

Bootstrap kataloguje tez istniejace strony wiki (jesli jakies sa) do `wiki-index`.

---

## Krok 3: Pokaz wynik i nastepne kroki

Bootstrap zwraca m.in. `wiki_llm_enabled`, `schema_page_id`, `log_page_id`, `index_page_id`, `catalogued_pages`, `message`.

Podsumuj uzytkownikowi:

- metoda LLM Wiki jest **wlaczona**,
- utworzone/odswiezone strony systemowe z ich id (regulamin `wiki-schema`, katalog `wiki-index`, dziennik `wiki-log`),
- ile stron skatalogowano (`catalogued_pages`).

Dodaj wskazowki:

- **Regulamin (`wiki-schema`) jest edytowalny** - to najwazniejszy plik konfiguracyjny metody. Wspolewoluuje z projektem; dostraj konwencje, gdy zajdzie potrzeba, i dopisuj uzasadnienie do `wiki-log`.
- **Nastepny krok**: uruchom `/monolynx:wiki-ingest`, zeby zintegrowac pierwsze zrodlo (dokument, artykul, wklejona tresc) z wiki.
- Do audytu zdrowia wiki sluzy `/monolynx:wiki-lint`.

---

## Wazne zasady

1. **Nie pomijaj Kroku 1** - zawsze sprawdz stan przez `get_wiki_config`, zanim wywolasz bootstrap. Gdy metoda juz dziala, pytaj uzytkownika o decyzje (odswiez/przerwij).
2. **Bootstrap jest idempotentny** - bezpieczny do ponownego uruchomienia, nie niszczy danych.
3. **Slug systemowy ma prefiks `wiki-`** - poprawne nazwy stron systemowych to `wiki-index`, `wiki-log`, `wiki-schema`.
4. **Jezyk**: polski (terminy techniczne i nazwy narzedzi w oryginale).
