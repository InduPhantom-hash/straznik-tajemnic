## Research: Czyszczenie po sesji bibliografii postaci + naprawa launchera
Data: 2026-08-03

### Mapowanie (Wiedza z RAG + Drzewo Plików)

Analiza objela trzy obszary rownolegle: (A) logike restartu serwera w launcherze, (B) inwentaryzacje plikow smieciowych, (C) stan uncommitted zmian w kodzie.

**Pipeline budowania i uruchamiania:**
1. Kod zrodlowy: `_tester/_base/.silnik/src/`
2. Build: `npm run build` -> `.next/BUILD_ID` na dysku
3. Launcher (`desktop/launcher.sh`) sprawdza czy serwer odpowiada na porcie 4050
4. Jesli odpowiada -> otwiera Chrome bez restartu serwera
5. Next.js `next start` keszuje chunki JS w pamieci - zmiana `.next/` na dysku nie ma znaczenia

### Obszar problemu

| Plik | Rola | Status |
|------|------|--------|
| `desktop/launcher.sh` (linie 69-95) | **ROOT CAUSE** - brak porownania BUILD_ID miedzy dyskiem a serwerem | Do naprawy |
| `desktop/build-app.sh` | Sklada .app, podmienia placeholdery sed-em | Bez zmian |
| `desktop/test-launcher-regressions.sh` | Testy launchera - NIE pokrywa scenariusza stale BUILD_ID | Do rozszerzenia |
| 17 plikow smieciowych (PNG, .js, .mjs, .sh) | Tymczasowe skrypty debugowania Puppeteer/Node | Do usuniecia |
| 5 redundantnych kopii w `src/` | Lustrzane kopie zmian z `_tester/` - zbedne | Do usuniecia (git restore) |
| 6 plikow z biografiami w `_tester/` | Kompletne, poprawne rozbudowane backstory | Do commita |
| `state.md`, `zadania.md` | Zaktualizowane o wymagania generatora biografii | Do commita |

### Blast Radius Analysis (Zagrozenia i Skutki Uboczne)

**Naprawa launchera (launcher.sh):**
- Dodanie bloku porownania BUILD_ID miedzy liniami 76-78 (po cold-start API check, przed glownym blokiem startu serwera).
- Metoda pobierania BUILD_ID z serwera: `curl -sf http://localhost:4050 | grep -o '"buildId":"[^"]*"'` wyciaga z `__NEXT_DATA__` w HTML.
- Ryzyko: NISKIE - dodajemy nowy blok warunkowy bez modyfikacji istniejacych sciezek. Fallback (serwer nie odpowiada) dzialajak dotychczas.
- build-app.sh uzywa `sed -e "s|__APP_DIR__|...|g"` do wstrzykiwania sciezek - nowy blok nie uzywa placeholderow, wiec jest bezpieczny.

**Czyszczenie plikow smieciowych:**
- 17 plikow (6 PNG, 8 skryptow .js/.mjs, 1 .sh, 1 katalog scripts/) - lacznie ~1.77 MB.
- Zadne nie sa czescia kodu zrodlowego, testow ani pipeline buildu.
- Ryzyko: ZEROWE - wszystkie sa untracked (git clean je usunie).

**Redundantne kopie w src/:**
- 5 plikow w `src/` to lustrzane kopie zmian z `_tester/_base/.silnik/src/`.
- Aktywny kod gry uzywa wylacznie katalogu `_tester/` (potwierdzone przez package.json i launcher).
- Kopie w `src/` powstaly jako proba obejscia problemu z niewidocznymi zmianami.
- Ryzyko: Zostawienie ich moze prowadzic do rozbieznosci w przyszlosci. Nalezy je usunac lub przywrocic do stanu HEAD.

**Zmiany biografii (kompletne, gotowe do commita):**
- Wszystkie 46 postaci predefiniowanych ma rozbudowane backstory (200-300 slow).
- Zmiana nie uszkadza struktury statystyk ani identyfikatorow postaci.
- Wiekszy obiekt postaci = wiekszy kontekst LLM = lepsza immersja (w granicach okna Gemini Flash).

### Zaleznosci (Testy i Markdowny do aktualizacji)

- `desktop/test-launcher-regressions.sh` - dodac test: serwer + zmiana BUILD_ID -> restart.
- `.agent/research/build-pipeline-not-propagating-2026-08-03.md` - juz istnieje, bez potrzeby aktualizacji.
- `state.md` - juz zaktualizowany w uncommitted zmianach (Faza 3 generatora biografii w Onboardingu).
- `ARCHITECTURE.md` / `README.md` - bez wplywu (launcher to wewnetrzna logika, nie API).

### Rekomendowany nastepny krok

Przechodzimy do `/dev-2-plan` z nastepujacym zakresem:

**Faza 1 - Czyszczenie (5 min, bez planu):**
- `git clean -fd` na smieciowe pliki (17 plikow)
- `git restore` na redundantne kopie w `src/` (5 plikow)
- `lsof -ti :4050 | xargs kill -9` (zabicie starego serwera)

**Faza 2 - Naprawa launchera (wymaga planu):**
- Dodanie bloku BUILD_ID check w `launcher.sh` (linie 76-78)
- Rozszerzenie `test-launcher-regressions.sh` o scenariusz stale BUILD_ID
- Przebudowa .app na biurku (`desktop/build-app.sh`)

**Faza 3 - Commit i weryfikacja:**
- Commit zmian biografii z `_tester/` + state.md + zadania.md
- Rebuild aplikacji i weryfikacja wizualna
