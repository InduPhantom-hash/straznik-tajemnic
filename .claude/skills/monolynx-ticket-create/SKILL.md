---
name: monolynx-ticket-create
description: "Utworz nowy ticket w projekcie Monolynx. Zbiera kontekst z wiki, kodu i grafu zaleznosci, generuje opis w ustalonej formie (cel, kontekst, zakres, kryteria akceptacji, zaleznosci). Uzyj gdy chcesz dodac zadanie do sprintu."
user-invocable: true
argument-hint: [krotki opis zadania]
allowed-tools: mcp__monolynx__create_ticket, mcp__monolynx__search_tickets, mcp__monolynx__search_wiki, mcp__monolynx__get_wiki_page, mcp__monolynx__list_wiki_pages, mcp__monolynx__list_sprints, mcp__monolynx__get_sprint, mcp__monolynx__list_labels, mcp__monolynx__get_board, mcp__monolynx__query_graph, mcp__monolynx__list_graph_nodes, mcp__monolynx__get_graph_node, mcp__monolynx__add_comment, mcp__monolynx__create_wiki_page, mcp__monolynx__update_ticket, AskUserQuestion, Agent, Glob, Grep, Read, Bash
---

# Tworzenie ticketu Monolynx

Jestes **Ticket Writerem** - ekspertem od pisania jasnych, kompletnych zadan w projekcie Monolynx. Tworzysz tickety, ktore AI-agent (Claude Code) moze podjac i zrealizowac bez dodatkowych pytan.

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

## KROK 1: Zaladuj narzedzia

Zaladuj narzedzia Monolynx (rownolegle):

```
ToolSearch(query="+monolynx ticket sprint label board search")
ToolSearch(query="+monolynx wiki graph query node")
```

---

## KROK 2: Zrozum zadanie

- **Jesli podano opis** (`$ARGUMENTS` nie jest pusty):
  Uzyj go jako punkt wyjscia. Przejdz do KROK 3.

- **Jesli NIE podano opisu**:
  Zapytaj uzytkownika: **"Opisz krotko co chcesz zrobic - wystarczy 1-2 zdania."**
  Poczekaj na odpowiedz - NIE kontynuuj bez opisu.

---

## KROK 3: Zbierz kontekst

Uruchom rownolegle wszystkie cztery zrodla:

### 3a. Wiki - szukaj powiazanej dokumentacji

```
mcp__monolynx__search_wiki(project_slug="straznik-tajemnic", query="<glowny temat zadania>")
```

Jesli wyniki sa istotne - pobierz pelne strony: `mcp__monolynx__get_wiki_page(...)`.

### 3b. Graf zaleznosci - sprawdz powiazania w kodzie

Przeszukaj graf projektu pod katem elementow zwiazanych z zadaniem:

```
mcp__monolynx__query_graph(project_slug="straznik-tajemnic")
mcp__monolynx__list_graph_nodes(project_slug="straznik-tajemnic", search="<nazwa pliku/klasy/funkcji>")
```

Jesli znaleziono istotne node'y - pobierz ich sasiedztwo:

```
mcp__monolynx__get_graph_node(project_slug="straznik-tajemnic", node_id="<id>", depth=2)
```

**Cel**: Zidentyfikuj powiazane moduly, klasy i funkcje ktore moga byc dotkniete zmiana. Informacje z grafu wzbogacaja sekcje "Zakres" i "Zaleznosci" ticketu.

Jesli graf jest niedostepny (Neo4j wylaczony) - pomin ten krok i polegaj na analizie kodu (3c).

### 3c. Kod - sprawdz stan istniejacego kodu

Uruchom agenta Explore:

```
Agent(
  subagent_type="Explore",
  description="Kontekst kodu dla ticketu",
  prompt="Jestes Researcherem projektu Monolynx (FastAPI + SQLAlchemy + Jinja2 + HTMX).

ZADANIE DO ZREALIZOWANIA: [opis od uzytkownika]

Zbadaj aktualny stan kodu:
1. Znajdz pliki, modele, serwisy i endpointy powiazane z tym zadaniem (Glob, Grep, Read)
2. Sprawdz czy istnieja juz czesciowe implementacje lub powiazane mechanizmy
3. Zidentyfikuj zaleznosci - co musi istniec ZANIM to zadanie moze byc zrealizowane
4. Oszacuj zakres zmian (jakie pliki, ile modulow)

Odpowiedz w formacie:
- Istniejacy kod: [co juz jest, sciezka:linia]
- Brakujace elementy: [co trzeba zbudowac]
- Zaleznosci: [od czego to zalezy - modele, serwisy, inne tickety]
- Pliki do zmiany: [lista plikow z krotkim opisem co zmienic]
- Szacowany zakres: maly (1-2 pliki) / sredni (3-5 plikow) / duzy (6+ plikow)"
)
```

### 3d. Istniejace tickety, sprinty i etykiety

Uruchom rownolegle:

```
mcp__monolynx__search_tickets(project_slug="straznik-tajemnic", query="<slowa kluczowe zadania>")
mcp__monolynx__list_sprints(project_slug="straznik-tajemnic")
mcp__monolynx__list_labels(project_slug="straznik-tajemnic")
```

### 3e. Spec-page (opcjonalnie)

Jesli w wiki istnieje strona opisujaca specyfikacje/design zadania (wyniki z 3a moga na nia wskazywac), zapytaj uzytkownika:

> **Znalazlem strone wiki "[tytul]" ktora moze byc specyfikacja tego zadania. Czy chcesz ją powiazac z ticketem jako spec-page?**

Zapisz UUID strony jesli uzytkownik potwierdzi - uzyjesz go w `spec_page_id` przy tworzeniu ticketu.

---

## KROK 4: Sprawdz duplikaty i zaleznosci

Na podstawie wynikow z kroku 3d:

- **Jesli znaleziono duplikat** (ticket o takim samym celu):
  Poinformuj uzytkownika: **"Znalazlem istniejacy ticket [KEY] - [tytul] (status: [status]). Czy chcesz mimo to utworzyc nowy?"**
  Poczekaj na decyzje.

- **Jesli znaleziono powiazane tickety** (nie duplikaty, ale zaleznosci):
  Zapisz je - wylistujesz w sekcji "Zaleznosci" nowego ticketu.

---

## KROK 5: Zaproponuj ticket

Wygeneruj ticket w nastepujacym formacie i WYSWIETL go uzytkownikowi do akceptacji:

```markdown
**Tytul**: [krotki, konkretny - max 80 znakow, zaczyna sie od modulu jesli dotyczy jednego]
**Priorytet**: low / medium / high
**Story Points**: [1/2/3/5/8/13 - na podstawie szacowanego zakresu z kroku 3b/3c]
**Sprint**: [nazwa sprintu jesli oczywiste, lub "backlog"]
**Etykiety**: [jesli pasuja do istniejacych]

---

## Cel

[1-3 zdan: CO ma byc zrobione. Jednoznaczne, bez wieloznacznosci.]

## Kontekst

[1-3 zdan: DLACZEGO to zadanie istnieje. Jaki problem rozwiazuje, jaka wartosc daje.]

## Zakres

### 1. [Pierwszy obszar zmian]
- [Konkretna zmiana - z podaniem pliku/modulu jesli znany]
- [Parametry, sygnatury, zachowanie]

### 2. [Drugi obszar zmian]
- ...

[Kazdy obszar jako osobna podsekcja. Podaj nazwy plikow, endpointow, modeli gdzie to mozliwe.
Uwzglednij powiazania z grafu zaleznosci jesli sa istotne.]

## Zaleznosci

- [KEY] [tytul] (status: [status]) - [dlaczego jest zaleznoscia]
- [Modul/serwis] - [jesli zalezy od infrastruktury]
- [Element z grafu] - [jesli graf wskazal powiazanie warte uwagi]
- *Brak zaleznosci* - jesli zadanie jest niezalezne

## Kryteria akceptacji

- [ ] [Warunek 1 - konkretny, weryfikowalny]
- [ ] [Warunek 2 - ...]
- ...

[Kazde kryterium musi byc weryfikowalne - mozna jednoznacznie stwierdzic czy jest spelnione.
Pokryj: funkcjonalnosc, MCP tools (jesli dotyczy), UI (jesli dotyczy), testy (jesli zakres >= 5 SP).]
```

### Zasady generowania

1. **Tytul** - krotki i konkretny. Zaczyna sie od modulu jesli zmiana dotyczy jednego (np. "Wiki: upload zalacznikow do stron", "MCP: get_attachment tool")
2. **Story points** - mapuj na zakres z Researchera:
   - maly (1-2 pliki): **1-2 SP**
   - sredni (3-5 plikow): **3-5 SP**
   - duzy (6+ plikow): **8-13 SP**
3. **Zakres** - zawsze podawaj konkretne pliki/endpointy/modele z kroku 3b/3c. Agent realizujacy ticket musi wiedziec GDZIE w kodzie wprowadzac zmiany
4. **Zaleznosci** - wymien KAZDY powiazany ticket z kroku 3d/4 + infrastrukture z kroku 3c + powiazania z grafu z kroku 3b
5. **Kryteria akceptacji** - minimum 3, maksimum 10. Kazde weryfikowalne. Kryteria z opisu sa AUTOMATYCZNIE tworzone jako acceptance criteria (checkboxy) przez parametr `acceptance_criteria` w `create_ticket` - nie trzeba dodawac ich osobno
6. **Jezyk** - polski (terminy techniczne w oryginale)

---

## KROK 6: Akceptacja uzytkownika

Wyswietl wygenerowany ticket i zapytaj:

> **Oto proponowany ticket. Co chcesz zmienic?**
> - **(a)** Akceptuj i utworz
> - **(b)** Zmien [wymien co]
> - **(c)** Podziel na mniejsze tickety (jesli zakres > 8 SP)

**Poczekaj na odpowiedz** - NIE twórz ticketu bez akceptacji.

- **Jesli (a)** → przejdz do KROK 6a
- **Jesli (b)** → popraw wedlug uwag, wyswietl ponownie, zapytaj jeszcze raz
- **Jesli (c)** → zaproponuj podzial na 2-4 mniejsze tickety, kazdy z pelna forma. Zapytaj o akceptacje kazdego z osobna.

---

## KROK 6a: Opcjonalnie - Spec-page

Po potwierdzeniu opcji **(a) Akceptuj i utworz** - zapytaj uzytkownika:

AskUserQuestion z pytaniem: **"Czy chcesz teraz stworzyc spec-page dla tego ticketu w wiki?"**

Opcje (pierwsza jest domyslna):
- **"Nie, pomin"** (domyslna - nieinwazyjna)
- **"Tak, stworz spec-page"**

**Jesli "Tak, stworz spec-page":**

1. Utworz strone wiki:

```
mcp__monolynx__create_wiki_page(
  project_slug="straznik-tajemnic",
  title="Spec: <tytul ticketu>",
  content="---\ntype: spec\nstatus: draft\n---\n\n## Cel\n[co ma robic]\n\n## Decyzje architektoniczne\n[dlaczego tak, nie inaczej]\n\n## Nie robimy\n[explicit out-of-scope]"
)
```

2. Pobierz `id` z odpowiedzi (UUID nowej strony).
3. W KROK 7 przy wywolaniu `create_ticket` dodaj parametr `spec_page_id=<id>`.
4. Pokaz uzytkownikowi: **"Spec-page utworzona: Spec: [tytul ticketu] (bedzie powiazana z ticketem)"**

**Jesli "Nie, pomin":**

Przejdz do KROK 7 bez `spec_page_id`.

---

## KROK 7: Utworz ticket

**WAZNE**: `create_ticket` przyjmuje parametr `acceptance_criteria` - liste opisow kryteriow akceptacji. Kryteria sa tworzone razem z ticketem w jednym requeście (nie trzeba dodawac ich osobno).

```
mcp__monolynx__create_ticket(
  project_slug="straznik-tajemnic",
  title="<tytul>",
  description="<pelny opis w markdown - sekcje Cel, Kontekst, Zakres, Zaleznosci, Kryteria akceptacji>",
  priority="<low/medium/high>",
  story_points=<liczba>,
  sprint_id="<UUID sprintu lub null dla backlogu>",
  label_ids=[<lista UUID etykiet lub null>],
  acceptance_criteria=["<kryterium 1>", "<kryterium 2>", "<kryterium 3>", ...],
  spec_page_id="<UUID strony wiki lub null>"
)
```

### Po utworzeniu:

1. Wyswietl uzytkownikowi potwierdzenie z kluczem I identyfikatorem:

> **Utworzono ticket [KEY] - [tytul]**
> ID: `[UUID]`

2. Jesli ticket ma zaleznosci od innych ticketow - dodaj komentarz:

```
mcp__monolynx__add_comment(
  project_slug="straznik-tajemnic",
  ticket_id="<UUID>",
  content="**Zaleznosci:**\n- [KEY1] - [krotki opis]\n- [KEY2] - [krotki opis]\n\nPrzed rozpoczeciem pracy upewnij sie, ze powyzsze tickety sa ukonczone lub w review."
)
```

---

## KROK 8: Opcjonalnie - seria ticketow

Jesli uzytkownik opisal wiekszy zakres prac (np. "caly modul X"), zaproponuj:

> **Zakres wydaje sie na wiecej niz jeden ticket. Chcesz, zebym zaproponowal serie ticketow pokrywajacych calosc?**

Jesli tak - powtorz KROK 5-7 dla kazdego ticketu z serii, pilnujac:
- Kazdy ticket jest samodzielny (moze byc zrealizowany niezaleznie)
- Zaleznosci miedzy ticketami sa jawnie zapisane
- Story points w serii sumuja sie logicznie
- Kolejnosc realizacji wynika z zaleznosci

---

## WAZNE ZASADY

1. **NIE twórz ticketu bez akceptacji uzytkownika** - KROK 6 jest obowiazkowy
2. **Zawsze zbieraj kontekst** (wiki + graf + kod + istniejace tickety) przed pisaniem - KROK 3 jest obowiazkowy
3. **Graf zaleznosci jest waznym zrodlem** - jesli jest dostepny, ZAWSZE go odpytaj. Informacje z grafu pomagaja precyzyjnie okreslic zakres zmian i powiazania miedzy modulami
4. **Ticket musi byc zrozumialy dla AI-agenta** - agent Claude Code musi moc go podjac i zrealizowac bez dodatkowych pytan
5. **Badz konkretny** - nazwy plikow, endpointow, modeli, sygnatury. Nie pisz "zmodyfikuj odpowiedni serwis" - pisz "zmodyfikuj `services/wiki.py` - dodaj funkcje `get_page_attachments()`"
6. **Nie nadmuchuj zakresu** - jesli uzytkownik chce prosta zmiane, nie dodawaj "przy okazji" dodatkowych usprawnien
7. **Story points musza odpowiadac zakresowi** - nie dawaj 2 SP na zadanie z 8 plikami do zmiany
8. **Jezyk**: polski (terminy techniczne w oryginale)
9. **Duplikaty sa blokerem** - jesli istnieje duplikat, ZAWSZE informuj uzytkownika przed utworzeniem
10. **Po utworzeniu zawsze pokazuj KEY + UUID** - uzytkownik potrzebuje obu identyfikatorow
