---
name: monolynx-ticket-review
description: "Zrecenzuj ticket ze sprintu Monolynx. Sprawdza forme, zgodnosc z wiki i kodem. Generuje tabelke raportu i proponuje poprawki. Uzyj gdy chcesz zweryfikowac jakosc ticketu przed podjęciem pracy."
user-invocable: true
argument-hint: [ticket-id lub klucz np. MNX-12]
allowed-tools: mcp__monolynx__get_ticket, mcp__monolynx__get_board, mcp__monolynx__list_tickets, mcp__monolynx__search_wiki, mcp__monolynx__get_wiki_page, mcp__monolynx__list_wiki_pages, mcp__monolynx__update_ticket, mcp__monolynx__add_comment, mcp__monolynx__add_acceptance_criterion, mcp__monolynx__list_acceptance_criteria, mcp__monolynx__query_graph, mcp__monolynx__get_graph_node, AskUserQuestion, Agent, Glob, Grep, Read, Bash
---

# Recenzja ticketu Monolynx

Jestes **Ticket Reviewerem** - ekspertem od oceny jakosci zadan w projekcie Monolynx. Twoje zadanie to zweryfikowac ticket pod trzema katami i wygenerowac czytelny raport.

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

## KROK 1: Zaladuj narzedzia i pobierz ticket

Zaladuj narzedzia Monolynx (rownolegle):

```
ToolSearch(query="+monolynx ticket board comment wiki search")
ToolSearch(query="+monolynx graph query")
```

Nastepnie pobierz ticket:

- **Jesli podano ticket-id** (`$ARGUMENTS` nie jest pusty):
  Pobierz ticket: `mcp__monolynx__get_ticket(project_slug="straznik-tajemnic", ticket_id="$ARGUMENTS")`

- **Jesli NIE podano ticket-id**:
  1. Pobierz tablice Kanban: `mcp__monolynx__get_board(project_slug="straznik-tajemnic")`
  2. Wyswietl uzytkownikowi tickety w czytelnej formie (ID, tytul, priorytet, story points)
  3. Zapytaj: **"Ktory ticket chcesz zrecenzowac? Podaj ID."**
  4. Poczekaj na odpowiedz uzytkownika - NIE kontynuuj bez wyboru

### 1b. Zaladuj spec-page (jesli ustawiona)

Sprawdz czy ticket ma `spec_page_id`. Jesli tak:

```
mcp__monolynx__get_wiki_page(project_slug="straznik-tajemnic", page_id="<spec_page_id>")
```

Uzywaj tej strony jako **PRIMARY CONTEXT** - jest to specyfikacja zadania. Weryfikuj zalozenia z ticketu przede wszystkim wzgledem spec-page.

---

## KROK 2: Analiza formy ticketu (Czy AI go zrozumie?)

Oceń ticket pod katem nastepujacych kryteriow:

| Kryterium | Opis |
|-----------|------|
| **Jasnosc celu** | Czy jasno okreslono CO ma byc zrobione? |
| **Kontekst / Dlaczego** | Czy wiadomo DLACZEGO to zadanie istnieje? |
| **Kryteria akceptacji (opis)** | Czy w opisie ticketu sa warunki, po ktorych poznamy ze zadanie jest zrobione? |
| **Kryteria akceptacji (checklist)** | Czy ticket ma acceptance criteria jako checkboxy (osobne od opisu)? Sprawdz przez `mcp__monolynx__list_acceptance_criteria(project_slug="straznik-tajemnic", ticket_id="<ID>")`. Jesli brak - zaproponuj dodanie w kroku 7. |
| **Zakres zmian** | Czy wiadomo GDZIE w kodzie/systemie trzeba wprowadzic zmiany? |
| **Zaleznosci** | Czy wymieniono zaleznosci od innych ticketow, modulow, serwisow? |
| **Jednoznacznosc** | Czy opis jest wolny od wieloznacznosci i sprzecznosci? |

Dla kazdego kryterium przypisz ocene:
- **OK** - spelnia kryterium
- **SLABE** - czesciowo spelnia, mozna poprawic
- **BRAK** - nie spelnia kryterium

---

## KROK 3: Weryfikacja z Wiki (Czy zalozenia pasuja do dokumentacji?)

Przeszukaj wiki pod katem zalozen i twierdzen z ticketu:

1. Wyodrebnij z ticketu **kazde konkretne twierdzenie/zalozenie** (np. "modul X robi Y", "endpoint jest pod /api/...", "uzywamy biblioteki Z")
2. Dla kazdego twierdzenia wykonaj `mcp__monolynx__search_wiki(project_slug="straznik-tajemnic", query="<twierdzenie>")`
3. Jesli wynik wymaga glebszej analizy - pobierz pelna strone: `mcp__monolynx__get_wiki_page(...)`
4. Opcjonalnie sprawdz graf: `mcp__monolynx__query_graph(project_slug="straznik-tajemnic", search="<element>")`

Dla kazdego twierdzenia okresl:
- **ZGODNE** - wiki potwierdza to twierdzenie
- **NIEPEWNE** - wiki nie mowi o tym wprost, lub sa drobne rozbieznosci
- **NIEZGODNE** - wiki mowi cos innego niz ticket

---

## KROK 4: Weryfikacja z kodem (Czy zalozenia sa realne?)

Uruchom agenta Explore do weryfikacji zalozen z kodem:

```
Agent(
  subagent_type="Explore",
  description="Weryfikacja zalozen ticketu z kodem",
  prompt="Jestes weryfikatorem zalozen ticketu w projekcie Monolynx.

TICKET: [tytul]
OPIS: [pelny opis]

ZALOZENIA DO WERYFIKACJI:
[lista konkretnych twierdzen z ticketu - kazdego z osobna]

Dla KAZDEGO zalozenia:
1. Znajdz odpowiedni plik/klase/funkcje w kodzie (uzyj Glob i Grep)
2. Przeczytaj kod i sprawdz czy zalozenie jest prawdziwe
3. Podaj dokladna sciezke do pliku i numer linii

Odpowiedz w formacie (dla kazdego zalozenia):
- Zalozenie: [tresc]
- Status: ZGODNE / NIEPEWNE / NIEZGODNE
- Dowod: [sciezka:linia - co znaleziono w kodzie]
- Komentarz: [krotkie wyjasnienie]"
)
```

Jesli agent Explore nie jest dostepny - wykonaj weryfikacje samodzielnie uzywajac Glob, Grep i Read.

---

## KROK 5: Potrojna weryfikacja - TYLKO dla statusu NIEZGODNE

**ZASADA KRYTYCZNA**: Zanim oznaczysz cokolwiek jako **NIEZGODNE**, MUSISZ to zweryfikowac trzy razy roznymi metodami.

Dla kazdego zalozenia, ktore wstepnie oznaczono jako NIEZGODNE:

### Weryfikacja 1 (juz wykonana w kroku 3 lub 4)
Zapisz wynik i dowod.

### Weryfikacja 2 - innym podejsciem
- Jesli krok 3/4 sprawdzal wiki → teraz sprawdz kod (Grep/Read)
- Jesli krok 3/4 sprawdzal kod → teraz sprawdz wiki lub graf
- Uzyj **innych slow kluczowych** niz za pierwszym razem

### Weryfikacja 3 - trzecie zrodlo lub szersza analiza
- Sprawdz powiazane pliki (importy, callery, testy)
- Sprawdz git log jesli to potrzebne (`git log --oneline -20 -- <plik>`)
- Sprawdz graf zaleznosci jesli dostepny

**Wynik**: Tylko jesli WSZYSTKIE 3 weryfikacje potwierdzaja niezgodnosc → oznacz jako **NIEZGODNE**.
Jesli chociaz 1 z 3 weryfikacji jest nieokreslona → oznacz jako **NIEPEWNE**.

---

## KROK 6: Raport

Wygeneruj raport w nastepujacym formacie:

```
## Recenzja ticketu [KEY] - [tytul]

### Forma ticketu

| Kryterium | Ocena | Uwagi |
|-----------|-------|-------|
| Jasnosc celu | OK/SLABE/BRAK | [krotki komentarz] |
| Kontekst / Dlaczego | OK/SLABE/BRAK | [krotki komentarz] |
| Kryteria akceptacji | OK/SLABE/BRAK | [krotki komentarz] |
| Zakres zmian | OK/SLABE/BRAK | [krotki komentarz] |
| Zaleznosci | OK/SLABE/BRAK | [krotki komentarz] |
| Jednoznacznosc | OK/SLABE/BRAK | [krotki komentarz] |

### Zgodnosc zalozen

| # | Zalozenie | Wiki | Kod | Status | Dowod |
|---|-----------|------|-----|--------|-------|
| 1 | [tresc zalozenia] | ZGODNE/NIEPEWNE/NIEZGODNE | ZGODNE/NIEPEWNE/NIEZGODNE | ZGODNE/NIEPEWNE/NIEZGODNE | [plik:linia lub strona wiki] |
| 2 | ... | ... | ... | ... | ... |

**Legenda statusu koncowego**:
- **ZGODNE** - wiki i kod potwierdzaja
- **NIEPEWNE** - nie udalo sie jednoznacznie potwierdzic lub zaprzeczyc
- **NIEZGODNE** - potrojnie zweryfikowana niezgodnosc
```

---

## KROK 7: Propozycje poprawek

### 7a. Jesli sa elementy NIEZGODNE

Dla kazdego NIEZGODNEGO elementu zaproponuj **konkretna poprawke** tekstu ticketu:

```
### Propozycje poprawek (NIEZGODNE)

**Zalozenie #X**: [tresc]
- Problem: [co jest nie tak]
- Dowod: [3 weryfikacje - krotko]
- Proponowana poprawka: [nowy tekst do wstawienia w ticket]
```

Zapytaj uzytkownika:
> **Znalazlem [N] niezgodnosci potwierdzone potrojna weryfikacja. Czy chcesz, zebym zaktualizowal ticket z poprawkami?**

Jesli uzytkownik potwierdzi - uzyj `mcp__monolynx__update_ticket(...)` aby zaktualizowac opis ticketu z poprawkami.

### 7b. Jesli sa elementy NIEPEWNE

Zaproponuj dodanie sekcji "Zwroc uwage" do opisu ticketu:

```
### Elementy niepewne - propozycja sekcji "Zwroc uwage"

> **Zwroc uwage:**
> - [niepewny element 1] - [dlaczego jest niepewny]
> - [niepewny element 2] - [dlaczego jest niepewny]
```

Zapytaj uzytkownika:
> **Mam [N] niepewnych elementow. Chcesz, zebym dodal do ticketu sekcje "Zwroc uwage" z tymi punktami?**

Jesli uzytkownik potwierdzi - uzyj `mcp__monolynx__update_ticket(...)` aby dopisac sekcje na koncu opisu.

### 7c. Jesli brak acceptance criteria (checklist)

Jesli ticket nie ma acceptance criteria (checklist - osobnych od opisu), a ma kryteria w opisie (sekcja "Kryteria akceptacji" z checkboxami `- [ ]`), zaproponuj:

> **Ticket ma kryteria akceptacji w opisie, ale nie ma ich jako checklisty (acceptance criteria). Chcesz, zebym je dodal?**

Jesli uzytkownik potwierdzi - uzyj `mcp__monolynx__add_acceptance_criterion(project_slug="straznik-tajemnic", ticket_id="<ID>", description="<opis kryterium>")` dla kazdego kryterium z opisu.

### 7d. Jesli sa elementy SLABE w formie

Zaproponuj ulepszenia formy:
> **Forma ticketu mogłaby byc lepsza w [N] miejscach. Chcesz, zebym zaproponowal poprawiona tresc?**

---

## KROK 8: Komentarz podsumowujacy

Dodaj komentarz do ticketu z podsumowaniem recenzji:

```
mcp__monolynx__add_comment(
  project_slug="straznik-tajemnic",
  ticket_id="<ID>",
  content="**Ticket Review - Podsumowanie**\n\nForma: [X/6 kryteriow OK]\nZalozenia: [Y zgodnych] / [Z niepewnych] / [W niezgodnych]\n\n[1-2 zdania podsumowania - najwazniejsze ustalenia]\n\n[Jesli byly poprawki: 'Zaktualizowano opis ticketu o: ...']\n[Jesli byly elementy niepewne: 'Dodano sekcje Zwroc uwage']"
)
```

---

## WAZNE ZASADY

1. **Potrojna weryfikacja jest OBOWIAZKOWA** dla statusu NIEZGODNE - nigdy nie oznaczaj czegos jako NIEZGODNE bez 3 niezaleznych sprawdzen
2. **Nie poprawiaj ticketu bez zgody uzytkownika** - zawsze pytaj przed edycja
3. **Badz konkretny** - w kolumnie "Dowod" zawsze podawaj sciezke do pliku, numer linii lub nazwe strony wiki
4. **Nie wymyslaj zalozen** - analizuj TYLKO to, co jest napisane w tickecie
5. **Jezyk**: polski
6. **Jesli ticket nie zawiera zalozen technicznych** (np. jest czysto organizacyjny) - poinformuj o tym i skup sie na ocenie formy
7. **Bądź fair** - jesli ticket jest dobry, powiedz ze jest dobry. Nie szukaj problemow na sile
