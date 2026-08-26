---
name: monolynx-wiki-ingest
description: "Zintegruj nowe zrodlo (plik, URL lub wklejona tresc) z wiki projektu metoda LLM Wiki. Tworzy strone zrodla, aktualizuje powiazane strony, linkuje wikilinkami, odswieza katalog i dziennik. Uzyj gdy masz dokument lub artykul do wlaczenia w wiki."
user-invocable: true
argument-hint: [sciezka pliku / URL / temat zrodla]
allowed-tools: mcp__monolynx__get_wiki_config, mcp__monolynx__search_wiki, mcp__monolynx__list_wiki_pages, mcp__monolynx__get_wiki_page, mcp__monolynx__create_wiki_page, mcp__monolynx__update_wiki_page, mcp__monolynx__regenerate_wiki_index, mcp__monolynx__append_wiki_log, mcp__monolynx__get_wiki_backlinks, AskUserQuestion, Bash, Read, WebFetch
---

# INGEST - integracja zrodla z wiki

Realizujesz operacje **INGEST** metody LLM Wiki: bierzesz jedno zrodlo (dokument, artykul, transkrypcje, wklejona tresc) i wpisujesz jego wiedze trwale w wiki projektu. Wiki to narastajacy artefakt - jedno dobre zrodlo zwykle dotyka wielu stron, a nie jednej. Twoim celem jest **aktualizowac istniejace strony**, nie duplikowac wiedzy, i wszystko **linkowac wikilinkami**, zeby graf rosl.

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

## Krok 0: Warunek wstepny - metoda musi byc wlaczona

Sprawdz stan:

```
mcp__monolynx__get_wiki_config(project_slug="straznik-tajemnic")
```

- **Jesli `wiki_llm_enabled` jest `false`** - metoda nie jest jeszcze wlaczona. Poinformuj uzytkownika: _"Metoda LLM Wiki nie jest wlaczona dla tego projektu. Uruchom najpierw `/monolynx:wiki-init`."_ i **przerwij** skill.
- **Jesli `true`** - zapamietaj `schema_page_id` (regulamin) i `index_page_id` (katalog), kontynuuj.

---

## Krok 1: Ustal zrodlo

`$ARGUMENTS` moze byc sciezka pliku, adresem URL albo tematem/wklejona trescia.

- **Sciezka pliku** - przeczytasz go w Kroku 3 narzedziem `Read`.
- **URL** - pobierzesz go w Kroku 3 narzedziem `WebFetch`.
- **Wklejona tresc / temat** - uzyj tego co podal uzytkownik.
- **Brak argumentu** - zapytaj uzytkownika (`AskUserQuestion`): _"Jakie zrodlo chcesz zintegrowac z wiki? Podaj sciezke pliku, URL albo wklej tresc."_ Poczekaj na odpowiedz; nie kontynuuj bez zrodla.

---

## Krok 2: Przeczytaj regulamin wiki

ZAWSZE zacznij od regulaminu, zeby trzymac sie konwencji tego konkretnego projektu (typy stron, frontmatter, format markera sprzecznosci, zasada summary):

```
mcp__monolynx__get_wiki_page(project_slug="straznik-tajemnic", page_id="<schema_page_id>")
```

Zastosuj jego zasady w calym ingest. Najwazniejsze z regulaminu:

- **Typy stron**: `encja` (modul/model/endpoint/usluga/tabela), `koncept` (idea/wzorzec/decyzja), `źródło` (streszczenie jednego dokumentu), `synteza` (przekrojowe opracowanie).
- **Frontmatter** na poczatku `content`: `type`, `status` (`aktywna`|`szkic`|`przestarzała`), `ostatni_przeglad` (`YYYY-MM-DD`), `tagi`.
- **Summary**: pierwsza nie-naglowkowa linia strony = 1-2 zdania (trafia do `wiki-index`).
- **Linkowanie**: ZAWSZE wikilink ze slugiem docelowej strony, nigdy pelny URL.
- **Marker sprzecznosci** w dokladnej formie: `> **Sprzeczność [YYYY-MM-DD]:** ...`.

---

## Krok 3: Przeczytaj zrodlo w calosci i omow wnioski

- Plik: `Read(file_path="<sciezka>")`.
- URL: `WebFetch(url="<url>", prompt="streszcz tresc i wyciagnij kluczowe fakty")`.
- Wklejona tresc: uzyj bezposrednio.

Przeczytaj **calosc**, nie fragmenty. Nastepnie omow z uzytkownikiem:

- co jest istotne i warte zapisania,
- co jest sporne lub przeczy temu, co moze juz byc w wiki,
- ktore obszary projektu zrodlo dotyka.

---

## Krok 4: Znajdz powiazane istniejace strony

Zanim cokolwiek utworzysz, sprawdz co juz jest - zeby AKTUALIZOWAC, nie duplikowac:

```
mcp__monolynx__search_wiki(project_slug="straznik-tajemnic", query="<glowny temat zrodla>")
```

Dla szerszego rozeznania struktury mozesz tez wylistowac strony:

```
mcp__monolynx__list_wiki_pages(project_slug="straznik-tajemnic")
```

Dla kandydatow do aktualizacji pobierz pelna tresc (`get_wiki_page`) i sprawdz powiazania (`get_wiki_backlinks`), zeby zrozumiec, gdzie strona siedzi w grafie.

---

## Krok 5: Zapisz i zaktualizuj strony

Typ strony ustalasz **przez frontmatter YAML** na poczatku `content` (narzedzia `create_wiki_page` / `update_wiki_page` nie maja parametru `type`). Slug generuje sie automatycznie z tytulu.

1. **Strona zrodla** (typ `źródło`) - jedna na ingestowane zrodlo, ze streszczeniem najwazniejszych faktow. Linkuj z niej wikilinkami do stron encji/konceptow, ktorych dotyczy.

   ```
   mcp__monolynx__create_wiki_page(
     project_slug="straznik-tajemnic",
     title="<naturalny tytul zrodla>",
     content="---\ntype: źródło\nstatus: aktywna\nostatni_przeglad: <YYYY-MM-DD>\ntagi: [...]\n---\n\n<1-2 zdania summary>\n\n<streszczenie + wikilinki>"
   )
   ```

2. **Strony encji i konceptow** - jedno dobre zrodlo dotyka wielu stron. Dla kazdego istotnego bytu/idei:
   - jesli strona **istnieje** - `update_wiki_page(project_slug=..., page_id=..., content=...)` (wzbogac tresc, dodaj wikilinki),
   - jesli **nie istnieje** - `create_wiki_page(...)` z odpowiednim `type` (`encja` lub `koncept`) we frontmatterze.

3. **Linkowanie** - wszystko lacz wikilinkami ze slugami docelowych stron (nie pelne URL), zeby graf powiazan rosl.

4. **Sprzecznosci** - gdy nowe zrodlo przeczy istniejacej tresci, **NIE nadpisuj po cichu**. Dodaj na stronie marker w dokladnej formie:

   ```
   > **Sprzeczność [<YYYY-MM-DD>]:** Zrodlo A mowi X, dotychczasowa tresc mowi Y. Nierozstrzygniete.
   ```

   Flaga zostaje, az czlowiek rozstrzygnie spor.

---

## Krok 6: Odswiez katalog

```
mcp__monolynx__regenerate_wiki_index(project_slug="straznik-tajemnic")
```

Katalog `wiki-index` zbiera streszczenia wszystkich stron; po dodaniu/zmianie stron trzeba go przebudowac.

---

## Krok 7: Dopisz wpis do dziennika

```
mcp__monolynx__append_wiki_log(project_slug="straznik-tajemnic", entry="INGEST: <co zaingestowano> - utworzono N stron, zaktualizowano M stron")
```

Dziennik `wiki-log` jest append-only - nie kasuj historii.

---

## Podsumowanie dla uzytkownika

Na koniec pokaz:

- jakie zrodlo zintegrowano,
- ile stron utworzono i ile zaktualizowano (z tytulami),
- czy oznaczono jakies sprzecznosci do rozstrzygniecia,
- przypomnienie, ze katalog `wiki-index` jest odswiezony.

---

## Wazne zasady

1. **Najpierw regulamin** - Krok 2 jest obowiazkowy, trzymaj sie konwencji projektu.
2. **Aktualizuj, nie duplikuj** - zawsze szukaj istniejacych stron (Krok 4) przed tworzeniem nowych.
3. **Jedno zrodlo dotyka wielu stron** - nie poprzestawaj na samej stronie `źródło`.
4. **Wszystko wikilinkami** - nigdy pelnymi URL do stron wewnetrznych.
5. **Sprzecznosci flaguj, nie nadpisuj** - dokladny format markera, decyzje zostawia czlowiekowi.
6. **Index i log na koncu** - po kazdym ingest odswiez katalog i dopisz wpis do dziennika.
7. **Jezyk**: polski (terminy techniczne i nazwy narzedzi w oryginale).
