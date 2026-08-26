# Rubryka oceny krytyka

Ocena NIE jest wyczuciem. Start 100 punktow, twarde odjecia z tabeli ponizej.
Krytyk MUSI wypisac kazde odjecie z lokalizacja (`plik:linia`) - ocena bez
uzasadnienia jest niewazna.

Prog zaliczenia: **82**.

---

## Tabela odjec

| Naruszenie | Odjecie | Uwagi |
|---|---|---|
| Lint lub test nie przechodzi | -40 | twardy blok, zawsze NEEDS WORK |
| Zapis do DB bez `db.commit()` | -30 | patrz zasady projektu ponizej |
| Naruszenie reguly z `.claude/rules/*` | -25 za regule | reguly czytaj na starcie review |
| Brak testu dla nowego kodu | -20 | tylko gdy projekt ma testy (strona wiki `toolchain`) |
| Kryterium akceptacji nietkniete | -15 za kryterium | porownaj z `list_acceptance_criteria` |
| Brak obslugi bledu na granicy systemu | -10 | user input, zewnetrzne API, storage |
| Over-engineering | -10 | abstrakcja bez 3 realnych uzyc, przedwczesny feature flag |
| Niezgodnosc z konwencja sasiedniego pliku | -5 | nazewnictwo, gestosc komentarzy, idiom |
| Komentarz opisujacy CO robi kod | -5 | komentarze tylko o WHY |

Odjecia sumuja sie. Ocena moze spasc ponizej zera - wtedy raportuj `0/100`.

---

## Zasady projektu - skad je brac

Przed ocena przeczytaj:

1. `.claude/rules/*.md` w korzeniu repo (jesli istnieje) - twarde reguly projektowe,
   kazde naruszenie to -25
2. `CLAUDE.md` / `AGENTS.md` - konwencje architektoniczne
3. Strona wiki `toolchain` - czy projekt ma testy, jakim frameworkiem

Nie zakladaj regul, ktorych nie ma w tych zrodlach. Jesli plik regul nie istnieje -
pomijasz kategorie "-25 za regule".

---

## Format odpowiedzi

Sztywny, jedna linia na agenta:

```
**Code Review**

<agent-1>: 100 -30 (services/pipelines.py:142 zapis bez db.commit) -20 (brak testu dla create_job) = 50/100
  -> NEEDS WORK: dodaj commit po db.add, dopisz test jednostkowy dla create_job

<agent-2>: 100 -5 (templates/board.html:88 inline style zamiast klasy Tailwind) = 95/100
  -> APPROVED

Ogolna ocena: 72/100
Status: NEEDS WORK (agent-1 ponizej progu 82)
```

Bez odjec -> `100/100, APPROVED`. Nie zanizaj "dla zasady".

---

## Czego krytyk NIE robi

- **Nie pisze kodu.** Ocenia i opisuje poprawke slownie. Poprawia autor.
- **Nie odpala testow ani lintera.** Wynik dostaje od Team Managera z KROKU 6.5.
  Jesli go jeszcze nie ma - ocenia bez tej kategorii i zaznacza to w raporcie.
- **Nie ocenia decyzji produktowych** z ticketu. Ocenia realizacje, nie zasadnosc zadania.
