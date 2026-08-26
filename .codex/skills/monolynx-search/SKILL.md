---
name: monolynx-search
description: Szukaj informacji w wiki projektu na platformie Monolynx. Użyj gdy użytkownik pyta o dokumentację projektu, architekturę, API, integracje, standardy kodu lub inne informacje zapisane w wiki Monolynx. Trigger na słowa "monolynx", "wiki", "szukaj w wiki", "sprawdź w monolynx", "co mamy w wiki", "jak działa" (w kontekście dokumentacji projektu).
allowed-tools: mcp__monolynx__search_wiki, mcp__monolynx__get_wiki_page, mcp__monolynx__list_wiki_pages, mcp__monolynx__list_projects, mcp__monolynx__log_time, mcp__monolynx__get_wiki_config, mcp__monolynx__create_wiki_page, mcp__monolynx__regenerate_wiki_index, mcp__monolynx__append_wiki_log, AskUserQuestion, Bash
---

# Wyszukiwanie w Wiki Monolynx

## Kiedy użyć

Użyj tego Skill'a gdy użytkownik:
- Pyta "sprawdź w monolynx", "szukaj w wiki", "co mamy w wiki"
- Pyta o dokumentację projektu (architektura, API, integracje, standardy)
- Chce wiedzieć jak coś działa w projekcie i informacja może być w wiki
- Wspomina "monolynx", "wiki", "dokumentacja projektu"

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

## Proces

### Krok 1: Ustal projekt

Jeśli użytkownik podał slug projektu - użyj go (nadpisuje powyższe).

Jeśli NIE podał projektu i `PROJECT_SLUG` nie jest ustawiony ze środowiska:
1. Użyj `mcp__monolynx__list_projects` aby wylistować dostępne projekty
2. Jeśli jest tylko 1 projekt - użyj go automatycznie
3. Jeśli jest więcej projektów - zapytaj użytkownika za pomocą `AskUserQuestion`:
   - "W którym projekcie Monolynx szukać?"
   - Opcje: lista dostępnych projektów (slug + nazwa)

### Krok 2: Wyszukaj w wiki

Użyj `mcp__monolynx__search_wiki` z:
- `project_slug`: ustalony slug projektu
- `query`: pytanie użytkownika (w naturalnym języku)
- `limit`: 5 (domyślnie)

### Krok 3: Pobierz szczegóły

Jeśli wyniki wyszukiwania semantycznego nie wystarczają do pełnej odpowiedzi:
1. Użyj `mcp__monolynx__get_wiki_page` aby pobrać pełną treść najlepiej dopasowanej strony
2. Jeśli potrzeba - pobierz dodatkowe strony

### Krok 4: Odpowiedz

Podaj:
- Bezpośrednią odpowiedź na pytanie użytkownika
- Kluczowe fragmenty z wiki (cytaty, tabele, diagramy)
- Nazwę strony wiki, z której pochodzi informacja
- Jeśli informacja nie została znaleziona - powiedz o tym jasno

### Krok 5: Zapisz odpowiedz z powrotem (QUERY)

To kluczowa zasada metody LLM Wiki (wg Karpathy'ego): dobra synteza wraca do wiki jako trwala strona, zamiast ginac w oknie czatu. Dzieki temu eksploracje sie kumuluja - nastepne pytanie startuje z lepszego miejsca.

**Warunek**: ten krok dziala tylko, gdy metoda LLM Wiki jest wlaczona dla projektu. Sprawdz:

```
mcp__monolynx__get_wiki_config(project_slug="<slug projektu>")
```

- **Jesli `wiki_llm_enabled` jest `false`** - pomin ten krok. Zwykle wyszukiwanie (Kroki 1-4) dziala dalej bez zmian.
- **Jesli `true` i odpowiedz jest wartosciowa** (przekrojowa synteza, a nie trywialny lookup) - zapytaj uzytkownika (`AskUserQuestion`): _"Zapisac te odpowiedz jako strone typu synteza w wiki?"_

**Jesli uzytkownik sie zgodzi**:

Zanim cokolwiek zapiszesz, sprawdz branch - zapis syntezy do wiki rob wylacznie z brancha `main` lub `master`:

```bash
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(brak repozytorium git)"
```

Jesli to nie `main`/`master` (albo brak repozytorium git), NIE zapisuj automatycznie. Zapytaj uzytkownika (`AskUserQuestion`): _"Jestes na branchu `<branch>`, nie na main/master. Zapis do wiki zalecany dopiero po merge do main. Zapisac synteze mimo to?"_ z opcjami **Nie, przerwij (zalecane)** oraz **Tak, zapisz mimo to**. Rekomendujesz **Nie**; bez wyraznej zgody pomin zapis (odpowiedz z Krokow 1-4 zostala juz udzielona).

1. Utworz strone syntezy. Typ ustalasz przez frontmatter YAML na poczatku `content` (slug generuje sie automatycznie z tytulu):

   ```
   mcp__monolynx__create_wiki_page(
     project_slug="<slug projektu>",
     title="<pytanie lub temat>",
     content="---\ntype: synteza\nstatus: aktywna\nostatni_przeglad: <YYYY-MM-DD>\ntagi: [...]\n---\n\n<1-2 zdania summary>\n\n<synteza z cytatami i wikilinkami do stron zrodlowych>"
   )
   ```

   Linkuj wikilinkami ze slugami stron zrodlowych (nigdy pelne URL).

2. Odswiez katalog:

   ```
   mcp__monolynx__regenerate_wiki_index(project_slug="<slug projektu>")
   ```

3. Dopisz wpis do dziennika:

   ```
   mcp__monolynx__append_wiki_log(project_slug="<slug projektu>", entry="QUERY: zapisano synteze - <temat>")
   ```

4. Pokaz uzytkownikowi link/tytul nowej strony syntezy.

## Wskazówki

- Wyszukiwanie semantyczne (`search_wiki`) jest najlepsze do szerokich pytań
- Do przeglądania struktury wiki użyj `list_wiki_pages`
- Odpowiadaj w języku, w którym pyta użytkownik
- Nie kopiuj całych stron - wyciągaj istotne fragmenty
- Jeśli wiki nie zawiera odpowiedzi, zaproponuj przeszukanie kodu źródłowego
