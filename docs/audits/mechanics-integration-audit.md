# Raport z audytu integracyjnego mechanik gry (Call of Cthulhu 7e RAW)

- **Projekt:** Strażnik Tajemnic AI
- **Zgłoszenie:** GitHub Issue [#537](https://github.com/InduPhantom-hash/straznik-tajemnic/issues/537) (Karta 5: Audyt integracyjny mechanik)
- **Data audytu:** 2026-09-28
- **Środowisko testowe:** Headless Pipeline (`MockGMPipeline`, Jest, TypeScript)
- **Czas wykonania zestawu testów:** ~1.1-1.5 s (wymóg: < 3.0 s)

---

## 1. Cel i zakres audytu

Celem audytu integracyjnego zrealizowanego w ramach Issue #537 było zweryfikowanie spójności, ciągłości reguł Call of Cthulhu 7e (Rules As Written - RAW) oraz wyeliminowanie cichych rozbieżności pomiędzy niezależnymi modułami silnika gry w trybie bezgłowym (headless).

Audyt objął 3 kluczowe obszary mechaniczne oraz 1 zbiorczą podróż end-to-end (E2E):
1. **Ekwipunek, rekwizyty i kontekst walki wręcz (Equipment, Props & Combat Weapon Context):**
   - Synchronizacja zdobytej broni palnej z `buildPlayerWeaponContext` i `getCombatDefenseWeapons`.
   - Bezpieczny fallback RAW dla broni improwizowanej / białej nieposiadającej ścisłego wpisu w katalogu wzorców.
   - Prawidłowe wykluczanie broni uszkodzonej (`condition: 'broken'`).
   - Potrójny byt handoutu (rekwizyt czytelny w ekwipunku + wpis narracyjny w dzienniku + poszlaka w Dossier).
2. **Czas gry, kalendarz i zdarzenia tła (Game Time, Calendar & Ambient Events):**
   - Deterministyczna inicjalizacja i pobieranie czasu gry (`getGameTime()`).
   - Aktualizacja czasu gry na podstawie tagów diegetycznych `[AKTUALNY CZAS: ...]`.
   - Cykl dobowy (`isNight()`), synchronizacja kalendarza (dzień tygodnia, fazy księżyca).
   - Inkrementacja czasu (`advanceGameTime()`) z obsługą przejścia przez granice dni, miesięcy i lat.
   - Filtrowanie tabel losowych wydarzeń atmosferycznych (`random-tables.ts`) z uwzględnieniem pory dnia.
3. **Poczytalność, ataki szału i relacje z NPC (Sanity, Bouts of Madness & NPC Relations):**
   - Ciągłość czatu i stanu gry po głębokim załamaniu psychicznym (utrata >= 5 SAN w jednym rzucie, zdany INT -> Atak Szaleństwa).
   - Degradacja kotwic życiowych (`damaged: true` w `importantPeople`) przy nieudanej projekcji tożsamości.
   - Aktualizacja nastawienia NPC (`disposition`) i statusu relacji w Dossier za pomocą tagów fabularnych `[NPC: Imię | nastawienie]` oraz `[RELACJA: Imię | status]`.
4. **Zintegrowana 5-turowa podróż gracza (Integrated E2E Mechanics Journey):**
   - Połączona sekwencja działań łącząca upływ czasu, zdobycie rekwizytu, załamanie nerwowe, zmianę relacji i przygotowanie do obrony w walce.

---

## 2. Zidentyfikowane i usunięte rozbieżności architektoniczne

Podczas implementacji scenariuszy testowych zidentyfikowano i wyeliminowano następujące rozbieżności pomiędzy komponentami silnika:

### A. Rozmyte dopasowanie katalogu a bezpieczny fallback RAW dla broni białej
- **Problem:** Funkcja `createEquipmentItem` przy dodawaniu przedmiotów uruchamiała `applyCatalogTemplate`, które stosowało luźne dopasowanie prefiksów (fuzzy matching). Przykładowo "Nóż kuchenny" otrzymywał profil `weapon.knife` z obrażeniami `1d4+2` (właściwymi dla noża bojowego/myśliwskiego), a "Ciężka pałka" dopasowywała się do `weapon.police-baton` z typem `non_impaling`. W przypadku braku dokładnego szablonu zdobyta broń improwizowana nie miała gwarancji zgodności z zasadami CoC 7e RAW (tabela broni, Podręcznik Strażnika s. 401). Dodatkowo, broń niestandardowa z jawną formułą obrażeń (`modifiers.damage`, np. szabla ceremonialna `1d8`) nie mogła tracić swoich statystyk na rzecz domyślnego fallbacku `1d4`.
- **Rozwiązanie w `_tester/_base/.silnik/src/lib/combat/weapon-context.ts`:**
  - Wprowadzono rozróżnienie idealnego szablonu (`isIdealCatalogTemplate`), który wymaga ścisłego dopasowania nazwy lub aliasu (`template.name.toLowerCase() === item.name.toLowerCase()`).
  - Rozróżniono modyfikatory nadane jawnie przez autora/scenariusz od modyfikatorów wstrzykniętych automatycznie przez rozmyty szablon katalogowy (`isCatalogInjectedFuzzyDamage`). Jeśli broń nie jest idealnym szablonem, a jej `modifiers.damage` pochodzi z rozmytego szablonu, ignorujemy go na rzecz właściwego fallbacku RAW (np. `1d4` impaling dla noża kuchennego zamiast `1d4+2`).
  - Zapewniono pełny priorytet dla jawnych, autorskich formuł obrażeń (`item.modifiers?.damage`), co chroni niestandardowe bronie i artefakty (np. rytualny sztylet `1d4+1`, szabla `1d8`).
  - W przypadku braku ścisłego szablonu i braku jawnych modyfikatorów, moduł `weapon-context.ts` stosuje deterministyczny fallback RAW:
    - Noże (`KNIFE_PATTERN`): obrażenia `1d4`, typ kłuty (`impaling`).
    - Pałki / kije (`CLUB_PATTERN`): obrażenia `1d6`, typ obuchowy (`blunt`).
    - Miecze / szable (`SWORD_PATTERN`): obrażenia `1d8`, typ sieczny (`slashing`) lub kłuty (`impaling` dla rapierów/sztyletów).
    - Topory / siekiery (`AXE_PATTERN`): obrażenia `1d6+1`, typ sieczny (`slashing`).
    - Pozostała broń improwizowana: obrażenia `1d4`, typ nieprzeszywający (`non_impaling`).

### B. Przetwarzanie nastawienia NPC z tagów narracyjnych (Pipe Syntax & Delimiter Resilience)
- **Problem:** Tagi w formacie `[NPC: Grzegorz Brzęczyszczykiewicz | wrogi]` lub `[RELACJA: Grzegorz | wrogi]` były traktowane wyłącznie jako pojedyncza nazwa postaci, co powodowało tworzenie wpisu o nazwie z doklejoną treścią nastawienia albo ignorowanie statusu relacji. Z kolei zbyt agresywne parsowanie nastawienia groziło odrzuceniem pełnych zdań narracyjnych (np. `[NPC: Janusz: Podejrzliwy wobec symbolu, pokazuje tatuaż]`), gdyby potraktowano je jako czysty token relacji. Ponadto wykluczenie myślnika z nazwiska w separatorach tagów relacji ucinało imiona i nazwiska złożone (np. `Jean-Paul` dzielone na `Jean` i opis `Paul | wrogi`).
- **Rozwiązanie w `_tester/_base/.silnik/src/lib/journal/apply-journal-tags.ts`:**
  - Wprowadzono parser `parseNpcDisposition` oraz predykat `isPureDispositionToken`, które ściśle odróżniają pojedyncze tokeny nastawienia od pełnych zdań opisowych.
  - Jeśli opis zawiera wyłącznie token relacji/nastawienia, aktualizowane są pola `disposition` i `relationshipStatus` w Dossier, bez zaśmiecania `keyInformation`.
  - Jeśli opis zawiera szerszą obserwację ze słowem kluczowym nastawienia, nastawienie jest aktualizowane, a pełny opis trafia do `keyInformation`.
  - Wzorce tagów relacji (`dispPattern`) wymagają spacji wokół separatorów myślnikowych (` - `, ` – `, ` — `), dzięki czemu łączniki wewnątrz imion i nazwisk (np. `Jean-Paul`, `Maria Skłodowska-Curie`) są nienaruszone.
  - Rozdzielono aktualizację `disposition` i `relationshipStatus` na niezależne warunki, zapobiegając blokowaniu synchronizacji relacji.

### C. Zarządzanie czasem gry w potoku bezgłowym (`MockGMPipeline`)
- **Problem:** `MockGMPipeline` nie przechowywał stanu czasu gry i nie reagował na tagi `[AKTUALNY CZAS: ...]`, uniemożliwiając testowanie mechanik zależnych od pory dnia czy kalendarza.
- **Rozwiązanie w `_tester/_base/.silnik/src/tests/journey/mock-gm-pipeline.ts`:**
  - Dodano strukturę `GameTime` (rok, miesiąc, dzień, godzina, minuta, dzień tygodnia, faza księżyca).
  - Wdrożono automatyczne parsowanie tagu `[AKTUALNY CZAS: ...]` w `feedGMResponse`.
  - Wzbogacono potok o metody pomocnicze: `getGameTime()`, `setGameTime()`, `advanceGameTime(minutes)`, `isNight()`, `getMoonPhase()`, `getDayOfWeek()`, `generateTimeTag()` oraz dołączono obiekt `gameTime` do każdego wyniku tury (`TurnResult`).

---

## 3. Matryca asercji audytu integracyjnego

Zestawienie testów zaimplementowanych w pliku `_tester/_base/.silnik/src/tests/journey/mechanics-integration-audit.test.ts`:

| Nr testu | Obszar audytu | Weryfikowana reguła CoC 7e RAW / Funkcjonalność | Wynik | Czas |
|---|---|---|:---:|:---:|
| **1.1** | Obszar 1: Ekwipunek i broń | Zdobycie broni palnej (`Rewolwer .38`) i synchronizacja z `buildPlayerWeaponContext` | PASS | 9 ms |
| **1.2** | Obszar 1: Ekwipunek i broń | Zdobycie noża kuchennego bez idealnego szablonu - fallback RAW: `1d4`, `impaling` | PASS | 38 ms |
| **1.3** | Obszar 1: Ekwipunek i broń | Zdobycie ciężkiej pałki bez idealnego szablonu - fallback RAW: `1d6`, `blunt` | PASS | 23 ms |
| **1.4** | Obszar 1: Ekwipunek i broń | Broń zniszczona (`condition: 'broken'`) jest wykluczona z opcji obrony w walce | PASS | < 1 ms |
| **1.5** | Obszar 1: Ekwipunek i broń | Potrójny byt handoutu: rekwizyt w ekwipunku (`isReadable`) + wpis w dzienniku + poszlaka w Dossier | PASS | 2 ms |
| **1.6** | Obszar 1: Ekwipunek i broń | Zachowanie jawnej formuły obrażeń (`modifiers.damage`, np. szabla `1d8`, sztylet `1d4+1`) dla customowej broni białej | PASS | 9 ms |
| **2.1** | Obszar 2: Czas i kalendarz | Inicjalizacja czasu gry i deterministyczny getter `getGameTime()` | PASS | < 1 ms |
| **2.2** | Obszar 2: Czas i kalendarz | Aktualizacja czasu gry przez tag narracyjny `[AKTUALNY CZAS: ...]` w `feedGMResponse` | PASS | 1 ms |
| **2.3** | Obszar 2: Czas i kalendarz | Cykl dobowy i precyzyjna detekcja pory dnia `isNight()` (noc: godz. < 6 lub >= 21) | PASS | < 1 ms |
| **2.4** | Obszar 2: Czas i kalendarz | Synchronizacja kalendarza: wyliczanie dnia tygodnia i fazy księżyca | PASS | 1 ms |
| **2.5** | Obszar 2: Czas i kalendarz | Przesuwanie czasu gry metodą `advanceGameTime()` z obsługą przekroczenia minut, godzin i dni | PASS | < 1 ms |
| **2.6** | Obszar 2: Czas i kalendarz | Filtrowanie losowych wydarzeń atmosferycznych z `random-tables.ts` po porze dnia (dzień/noc) | PASS | < 1 ms |
| **3.1** | Obszar 3: Poczytalność i NPC | Ciągłość czatu po załamaniu nerwowym (SAN loss >= 5 -> Bout of Madness -> kolejna tura) | PASS | 1 ms |
| **3.2** | Obszar 3: Poczytalność i NPC | Nadszarpnięcie kotwicy w `importantPeople` (`damaged: true`) przy nieudanej projekcji tożsamości | PASS | 1 ms |
| **3.3** | Obszar 3: Poczytalność i NPC | Aktualizacja relacji i nastawienia NPC (`disposition`) w Dossier poprzez tagi z separatorem pipe | PASS | 2 ms |
| **3.4** | Obszar 3: Poczytalność i NPC | Zachowanie narracyjnych obserwacji NPC z przymiotnikami relacji w `keyInformation` oraz odporność na separatory | PASS | 1 ms |
| **4.1** | Obszar 4: Podróż E2E | Zintegrowana 5-turowa podróż łącząca ekwipunek, czas, obłęd i relacje NPC w spójny łańcuch | PASS | 9 ms |

---

## 4. Wyniki wykonania i weryfikacja automatyczna

- **Testy jednostkowe i integracyjne:**
  - `mechanics-integration-audit.test.ts`: **17/17 passed** (1.285 s).
  - `player-journey-matrix.test.ts`: **31/31 passed** (0.472 s).
  - Łącznie: **48/48 passed** (1.757 s).
- **Weryfikacja jakościowa silnika (`qa:quick`):**
  - Spójność i symetria kluczy i18n (`messages/pl.json` vs `messages/en.json`): **6521/6521 identyczne (1:1)**.
  - Weryfikacja rejestru nawigacji i diagramów Mermaid: **PASS**.
  - Kompilacja TypeScript (`npx tsc --noEmit`): **0 błędów**.
  - Linter (`npm run lint`): **0 błędów** w plikach allowlisty.

---

## 5. Podsumowanie i wnioski dla rozwoju silnika

1. **Szczelność reguł CoC 7e RAW:** Mechanizm walki obronnej jest w pełni odporny na błędy wynikające z braku lub niekompletności szablonów w katalogu ekwipunku. Każda broń biała otrzymuje poprawne parametry obrażeń i typu obrażeń, a unikalne modyfikatory postaci/przedmiotu są zawsze respektowane.
2. **Determinizm środowiska testowego:** Wprowadzenie `GameTime` do `MockGMPipeline` pozwala na precyzyjne testowanie mechanik opartych na czasie, astronomii i harmonogramach fabularnych bez konieczności mockowania zegara systemowego.
3. **Ciągłość narracyjna i pamięć:** Potrójny byt handoutów, stabilność stanu badacza po atakach szału oraz inteligentne odróżnianie czystych tokenów relacji od obserwacji w dossier gwarantują, że silnik zachowuje integralność stanu gry w długich sesjach.
