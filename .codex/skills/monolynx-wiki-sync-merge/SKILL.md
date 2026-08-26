---
name: monolynx-wiki-sync-merge
description: >
  Post-merge INGEST do wiki metodą LLM Wiki. Odpala człowiek po merge
  ticketów/PR do main. Gated na wiki_llm_enabled. Używaj plain [[slug]].
user-invocable: true
argument-hint: [ticket-id lub lista ticket-id, np. MON-75 MON-76]
allowed-tools: mcp__monolynx__get_wiki_config, mcp__monolynx__get_ticket, mcp__monolynx__search_wiki, mcp__monolynx__list_wiki_pages, mcp__monolynx__get_wiki_page, mcp__monolynx__create_wiki_page, mcp__monolynx__update_wiki_page, mcp__monolynx__regenerate_wiki_index, mcp__monolynx__append_wiki_log, mcp__monolynx__get_wiki_backlinks
---

# wiki-sync-merge - INGEST po merge do main

Realizujesz **post-merge INGEST** metody LLM Wiki: bierzesz zamknięte tickety (zmergowane do main) i wpisujesz ich wiedzę trwale w wiki projektu. Skill odpala **człowiek ręcznie** po merge, nigdy automatycznie w trakcie pracy nad branchy.

**Zasada nadrzędna**: ZAWSZE używaj plain `[[slug]]` w wikilinkach. NIGDY `[[slug|label]]` - parser aliasów (MON-74) nie jest jeszcze wdrożony.

---

## Ustalenie slug projektu

Slug projektu pochodzi ze zmiennej środowiskowej `MONOLYNX_PROJECT_SLUG`. Sprawdź ją:

```bash
echo "${MONOLYNX_PROJECT_SLUG:-(nie ustawiono)}"
```

- **Zmienna ustawiona** - użyj jej wartości jako `project_slug` we wszystkich wywołaniach narzędzi MCP poniżej. Slug podany wprost przez użytkownika ma pierwszeństwo.
- **Zmienna nie ustawiona** - NIE zgaduj sluga i NIE rozpoczynaj pracy. Poproś użytkownika, by skonfigurował slug w pliku `.claude/settings.json` projektu (pole `env`), po czym uruchomił skill ponownie:

  ```json
  {
    "env": { "MONOLYNX_PROJECT_SLUG": "twoj-slug-projektu" }
  }
  ```

  Zakończ bez dalszych akcji, dopóki slug nie jest znany.

---

## Warunek wstępny: tylko branch main/master

Zapis do wiki wykonuj wyłącznie z brancha `main` lub `master`. Sprawdź aktualny branch:

```bash
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(brak repozytorium git)"
```

- **Branch `main` lub `master`** - kontynuuj normalnie.
- **Inny branch** - NIE zapisuj automatycznie. Poinformuj użytkownika: _"Jesteś na branchu `<branch>`, nie na main/master. Uruchom skill ponownie po merge do main."_ i **zakończ** bez zapisu.

---

## Krok 0: Gating - sprawdź czy metoda LLM Wiki jest włączona

```
mcp__monolynx__get_wiki_config(project_slug="straznik-tajemnic")
```

- **Jeśli `wiki_llm_enabled` jest `false`** - zakończ z informacją: _"LLM Wiki wyłączona dla tego projektu, INGEST pominięty. Włącz metodę przez `/monolynx:wiki-init`."_ Nie wykonuj żadnych zapisów.
- **Jeśli `true`** - zapamiętaj `schema_page_id` (regulamin) i `index_page_id` (katalog), kontynuuj.

---

## Krok 1: Ustal listę ticketów do przetworzenia

`$ARGUMENTS` to ticket-id lub lista ticket-id (np. `MON-75 MON-76` albo samo UUID).

- **Argumenty podane** - użyj ich bezpośrednio.
- **Brak argumentów** - zapytaj użytkownika: _"Podaj ID ticketów zmergowanych do main (np. MON-75 MON-76 lub UUID). Możesz podać kilka naraz."_ Poczekaj; nie kontynuuj bez listy.

---

## Krok 2: Przeczytaj regulamin wiki

Zawsze zacznij od regulaminu, żeby trzymać się konwencji projektu (typy stron, frontmatter, format markera sprzeczności):

```
mcp__monolynx__get_wiki_page(project_slug="straznik-tajemnic", page_id="<schema_page_id>")
```

Zastosuj jego zasady w całym INGEST. Kluczowe zasady z regulaminu:

- **Typy stron**: `encja`, `koncept`, `źródło`, `synteza`.
- **Frontmatter** na początku `content`: `type`, `status` (`aktywna`|`szkic`|`przestarzała`), `ostatni_przeglad` (`YYYY-MM-DD`), `tagi`.
- **Summary**: pierwsza nie-nagłówkowa linia strony = 1-2 zdania.
- **Linkowanie**: ZAWSZE plain `[[slug]]`, NIGDY `[[slug|label]]` (MON-74 parser aliasów niezakończony).
- **Marker sprzeczności**: `> **Sprzeczność [YYYY-MM-DD]:** ...`

---

## Krok 3: Pobierz kontekst każdego ticketu

Dla każdego ticket-id z listy pobierz dane:

```
mcp__monolynx__get_ticket(project_slug="straznik-tajemnic", ticket_id="<ticket-id>")
```

Zapamiętaj dla każdego ticketu:
- tytuł i opis (źródło wiedzy do INGEST),
- etykiety i moduły, których dotyczy (pomoc przy klasyfikacji stron wiki),
- komentarze - mogą zawierać ustalenia architektoniczne, odkrycia z review.

Jeśli ticket nie istnieje lub nie można go pobrać - odnotuj to i pomiń dany ticket.

---

## Krok 4: INGEST każdego ticketu do wiki

Dla każdego ticketu wykonaj pełny INGEST (wzoruj się na flow z `wiki-ingest`):

### 4a. Znajdź powiązane istniejące strony

Zanim cokolwiek stworzysz, sprawdź co już jest - żeby aktualizować, nie duplikować:

```
mcp__monolynx__search_wiki(project_slug="straznik-tajemnic", query="<kluczowe słowa z tytułu ticketu>")
```

Dla kandydatów do aktualizacji pobierz pełną treść (`get_wiki_page`) i sprawdź powiązania (`get_wiki_backlinks`).

### 4b. Zapisz i zaktualizuj strony

Typ strony ustalasz przez frontmatter YAML na początku `content`.

1. **Strona źródła ticketu** (typ `źródło`) - jedno na ticket, ze streszczeniem co zostało zrobione i dlaczego. Linkuj z niej `[[slug]]` do stron encji/konceptów, których dotyczy zmiana.

   ```
   mcp__monolynx__create_wiki_page(
     project_slug="straznik-tajemnic",
     title="<np. 'MON-75: wiki-sync-merge - INGEST po merge'>",
     content="---\ntype: źródło\nstatus: aktywna\nostatni_przeglad: <YYYY-MM-DD>\ntagi: [...]\n---\n\n<1-2 zdania summary>\n\n<opis co zmieniono + wikilinki [[slug]]>"
   )
   ```

   Strony źródła ticketu twórz tylko jeśli wnoszą realną wiedzę (nie sam fakt "ticket zamknięty"). Pomiń jeśli ticket był drobnym bugfixem bez wartości dokumentacyjnej.

2. **Strony encji i konceptów** - zmiana w tickecie często dotyka kilku modułów. Dla każdego istotnego bytu/idei:
   - jeśli strona **istnieje** - `update_wiki_page(...)` (wzbogać treść, dodaj wikilinki `[[slug]]`),
   - jeśli **nie istnieje** - `create_wiki_page(...)` z odpowiednim `type` we frontmatterze.

3. **Linkowanie** - wszystko łącz przez plain `[[slug]]`. Nigdy pełny URL do stron wewnętrznych, nigdy `[[slug|label]]`.

4. **Sprzeczności** - gdy wiedza z ticketu przeczy istniejącej treści, NIE nadpisuj po cichu. Dodaj marker:

   ```
   > **Sprzeczność [<YYYY-MM-DD>]:** Ticket X mówi Y, dotychczasowa treść mówi Z. Nierozstrzygnięte.
   ```

---

## Krok 5: Odśwież katalog

Po przetworzeniu wszystkich ticketów:

```
mcp__monolynx__regenerate_wiki_index(project_slug="straznik-tajemnic")
```

Katalog `wiki-index` zbiera streszczenia wszystkich stron; po dodaniu/zmianie stron trzeba go przebudować.

---

## Krok 6: Dopisz wpis do dziennika

Jeden wpis zbiorczy dla całego przebiegu (nie osobny na każdy ticket):

```
mcp__monolynx__append_wiki_log(project_slug="straznik-tajemnic", entry="INGEST po merge: <lista ticketów, np. MON-75, MON-76> - utworzono N stron, zaktualizowano M stron")
```

Dziennik `wiki-log` jest append-only - nie kasuj historii.

---

## Podsumowanie dla użytkownika

Na koniec pokaż:

- które tickety przetworzono (i które pominięto z powodu braku wartości dokumentacyjnej),
- ile stron wiki utworzono i ile zaktualizowano (z tytułami),
- czy oznaczono jakieś sprzeczności do rozstrzygnięcia,
- przypomnienie, że katalog `wiki-index` jest odświeżony.

---

## Ważne zasady

1. **Gating jest twardy** - jeśli `wiki_llm_enabled=false`, skill kończy się bez żadnych zapisów.
2. **Tylko main/master** - żaden zapis do wiki na branchu feature.
3. **Plain `[[slug]]` zawsze** - nigdy `[[slug|label]]` (MON-74 niezakończony).
4. **Aktualizuj, nie duplikuj** - zawsze szukaj istniejących stron przed tworzeniem nowych.
5. **Jedno źródło dotyka wielu stron** - nie poprzestawaj na samej stronie `źródło`.
6. **Sprzeczności flaguj, nie nadpisuj** - dokładny format markera, decyzje zostawiasz człowiekowi.
7. **Index i log na końcu** - po całym przebiegu odśwież katalog i dopisz jeden wpis zbiorczy.
8. **Język**: polski (terminy techniczne i nazwy narzędzi w oryginale).
