---
name: monolynx-project-toolchain
description: "Wykryj komendy lint i testow biezacego projektu i zapisz je jako strone wiki 'toolchain' w Monolynx. Jednorazowa konfiguracja per projekt - skille work i work-simple czytaja te strone, zeby uruchomic lint i testy przed zamknieciem ticketu. Uzyj przy pierwszym setupie projektu albo gdy zmienil sie stack."
user-invocable: true
argument-hint: (bez argumentow)
---

# Toolchain projektu - konfiguracja lint i testow

Wykrywasz, jak w tym projekcie uruchamia sie linter i testy, potwierdzasz to z
uzytkownikiem i zapisujesz jako strone wiki `toolchain`. Skille `/monolynx:work`
i `/monolynx:work-simple` czytaja te strone i egzekwuja lint + testy przed
zmiana statusu ticketu na `in_review`.

Uruchamiane **raz per projekt**. Ponownie tylko gdy zmienil sie stack.

---

## Ustalenie slug projektu

Slug projektu pochodzi ze zmiennej srodowiskowej `MONOLYNX_PROJECT_SLUG`:

```bash
echo "${MONOLYNX_PROJECT_SLUG:-(nie ustawiono)}"
```

- **Ustawiona** - uzyj jej wartosci jako `project_slug`. Slug podany wprost przez uzytkownika ma pierwszenstwo.
- **Nie ustawiona** - NIE zgaduj. Popros o konfiguracje w `.claude/settings.json` (pole `env`) i zakoncz:

  ```json
  {
    "env": { "MONOLYNX_PROJECT_SLUG": "twoj-slug-projektu" }
  }
  ```

---

## KROK 1: Zaladuj narzedzia i sprawdz stan

```
ToolSearch(query="+monolynx wiki page create update search")
```

Sprawdz, czy strona juz istnieje:

```
mcp__monolynx__search_wiki(project_slug="straznik-tajemnic", query="toolchain lint test", limit=3)
```

**Strona `toolchain` istnieje** - pobierz jej tresc przez `get_wiki_page`, pokaz
uzytkownikowi i zapytaj:

> Projekt ma juz strone `toolchain`:
> ```
> [tresc]
> ```
> Zaktualizowac ja? (tak / nie)

Odpowiedz "nie" -> zakoncz bez zmian.

## KROK 2: Wykryj stack

Sprawdz obecnosc plikow konfiguracyjnych w korzeniu repo (Glob, jedno przejscie):

| Plik | Stack | Typowy lint | Typowy test |
|---|---|---|---|
| `Makefile` | dowolny | `make lint` | `make test` |
| `pyproject.toml` | Python | `ruff check . && ruff format --check .` | `pytest` |
| `setup.cfg` / `tox.ini` | Python | `flake8` | `pytest` / `tox` |
| `package.json` | Node | `npm run lint` | `npm test` |
| `Cargo.toml` | Rust | `cargo clippy` | `cargo test` |
| `go.mod` | Go | `go vet ./...` | `go test ./...` |
| `composer.json` | PHP | `composer lint` | `composer test` |
| `Gemfile` | Ruby | `rubocop` | `rspec` |
| `pom.xml` / `build.gradle` | Java | `mvn checkstyle:check` | `mvn test` |

**Priorytet**: jesli istnieje `Makefile` - przeczytaj go i wyciagnij faktyczne
nazwy targetow (`grep -E '^[a-zA-Z-]+:' Makefile`). Target zdefiniowany w repo
bije komende domyslna z tabeli.

**Docker**: sprawdz `docker-compose.yml` / `compose.yaml`. Jesli projekt uruchamia
sie w kontenerze, komendy musza miec prefiks (np. `docker compose exec app ...`).
Sprawdz tez `CLAUDE.md` / `AGENTS.md` - moga zawierac jawna regule "nigdy nie
uruchamiaj lokalnie".

**Czy sa testy**: policz pliki testowe (`tests/`, `test/`, `*_test.go`,
`*.test.ts`, `spec/`). Zero plikow -> projekt nie ma testow.

## KROK 3: Potwierdz z uzytkownikiem

Nie zapisuj wykrytych komend bez potwierdzenia - wykrywanie zgaduje, uzytkownik wie.

> Wykryty stack: **[stack]**
>
> | | Komenda |
> |---|---|
> | Lint | `[wykryta komenda]` |
> | Test | `[wykryta komenda]` |
>
> Testy w repo: **[znaleziono N plikow / brak]**
>
> 1. Komendy sie zgadzaja? (tak / podaj poprawne)
> 2. Kto uruchamia lint i testy: **user** (domyslnie, agent wypisuje komendy)
>    czy **agent** (odpala sam)?
> 3. Stosowac TDD - testy pisane przed implementacja? (tak / nie)

Poczekaj na odpowiedzi. Przy braku testow w repo pytanie o TDD pomin (wpisz `nie`).

## KROK 4: Zapisz strone wiki

```
mcp__monolynx__create_wiki_page(
  project_slug="straznik-tajemnic",
  slug="toolchain",
  title="Toolchain projektu",
  content="<tresc ponizej>"
)
```

Strona istniala -> `update_wiki_page` z tym samym `page_id`.

Format tresci - sztywny, skille parsuja go wzrokowo:

```markdown
# Toolchain projektu

Stack: [wykryty stack]
Uruchamianie: [lokalnie / docker]

## Lint

komenda: [dokladna komenda]
kto odpala: [user | agent]

## Test

komenda: [dokladna komenda]
kto odpala: [user | agent]
testy istnieja: [tak | nie]
framework: [pytest | vitest | go test | ...]

## TDD

stosowac: [tak | nie]

## Uwagi

[np. "Wszystko przez docker compose exec app - nigdy lokalnie" albo "Brak"]
```

Trzymaj sie tych naglowkow i etykiet. Zmiana formatu psuje odczyt w `work`.

## KROK 5: Podsumowanie

Wyswietl uzytkownikowi:

- Zapisana komende lint i test
- Kto je odpala
- Czy TDD wlaczone
- Link do strony wiki

Jesli uzytkownik wybral **agent** jako uruchamiajacego, przypomnij o fladze:

> Zeby `work` sam odpalal lint i testy, ustaw w `.claude/settings.local.json`:
> ```json
> { "env": { "MONOLYNX_AUTOTEST": "true" } }
> ```
> Bez niej skill wypisze komendy i poczeka na Twoj wynik.

---

## WAZNE ZASADY

1. **Nie zgaduj komend** - tabela w KROK 2 to punkt wyjscia, nie odpowiedz. Zawsze potwierdz z uzytkownikiem
2. **Nie uruchamiaj wykrytych komend** zeby je zweryfikowac - to konfiguracja, nie test. Lint na brudnym drzewie roboczym zwroci mylacy wynik
3. **Format strony jest kontraktem** - `work` i `work-simple` czytaja naglowki i etykiety doslownie
4. **Respektuj reguly repo** - jesli `CLAUDE.md` mowi "tylko przez docker" albo "Claude nigdy nie odpala testow", zapisz to w sekcji Uwagi i domyslnie ustaw `kto odpala: user`
5. **Jedna strona per projekt** - slug zawsze `toolchain`, bez wariantow
