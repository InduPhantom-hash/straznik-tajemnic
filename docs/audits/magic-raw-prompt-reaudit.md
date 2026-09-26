---
typ_wiedzy: wniosek
tematy:
  - coc-7e
  - audit
  - mechanika
  - magia
  - tomy
  - raw
  - prompty
  - gm-protocol
podmioty:
  - Chaosium
  - Black Monk Games
  - Seth Skorkowsky
  - Straznik Tajemnic AI
ai_summary: Źródłowy audyt magii i tomów Mitów d100 Weird Fiction, suplementów, poradników MG i korpusu sesji względem silnika, promptów i UI Strażnika Tajemnic (Issue 318).
---

# Ponowna weryfikacja RAW, mechanik i promptów magii (Issue #318)

- **Projekt:** Strażnik Tajemnic AI
- **Zgłoszenie:** GitHub Issue [#318](https://github.com/InduPhantom-hash/straznik-tajemnic/issues/318)
- **Data audytu:** 2026-09-13
- **Audytor:** Antigravity / aios-vibe-coder / boost (Niezależna rewizja źródłowa)
- **Materiały źródłowe zbadane bezpośrednio na dysku:**
  - *Zew Cthulhu 7. edycja - Księga Strażnika v1.3* (Black Monk Games / Chaosium Inc., `/Volumes/Karta/Zew - materiały/Zew Cthulhu - podręczniki/Black Monk Games/ZewCthulhu_KsiegaStraznika_v.1.3.pdf`, 490 stron)
  - *Wielki grymuar magii mitów Cthulhu* (Black Monk Games / Chaosium Inc., `/Volumes/Karta/Zew - materiały/Takie se/Wielki_grymuar_magii_mitow_Cthulhu.pdf`, 186 stron)
  - Seth Skorkowsky: *Call of Cthulhu: Part 8 - The Mythos & Magic* (`/Volumes/Karta/Zew - materiały/SethSkorkowsky/Call of Cthulhu_ Part 8 - The Mythos _ Magic.md`)
  - Seth Skorkowsky: *Call of Cthulhu: The Grand Grimoire of Cthulhu Mythos Magic - RPG Review* (`/Volumes/Karta/Zew - materiały/SethSkorkowsky/Call of Cthulhu_ The Grand Grimoire of Cthulhu Mythos Magic - RPG Review.md`)
  - Korpus sesji rzeczywistych MG (`/Volumes/Karta/Developer/Korpus-Prowadzenia-MG/Raw/transcripts/`): sesje 027, 032, 036, 037
  - Repozytorium kodu i prompty: `_tester/_base/.silnik/src/`

---

## 1. Streszczenie wykonawcze i diagnoza krytyczna

Poprzednie issue [#252](https://github.com/InduPhantom-hash/straznik-tajemnic/issues/252) zostało zamknięte po wdrożeniu trzech PR-ów (PR #293, PR #294, PR #295). Implementacja ta wprowadziła moduł `src/lib/magic/`, komponenty `SpellCard` i `TomeCard` oraz testy jednostkowe.

**Niezależna rewalidacja źródłowa wykazała jednak, że poprzedni audyt i wdrożenie opierały się na poważnych błędach faktograficznych, zmyślonych numerach stron oraz niesprawdzonych założeniach, które zostały zamaskowane przez syntetyczne zielone testy jednostkowe. Co więcej, wstępna próba audytu powieliła część z tych błędów, myląc tomy w tabelach i pomijając czary z katalogu:**

1. **Zafałszowana struktura rozdziałów i stron podręcznika:**
   - W zgłoszeniu #252 nazwano magię "Rozdziałem 8" (co odpowiada rozdziałowi Poczytalności w edycji angielskiej). W oficjalnej polskiej *Księdze Strażnika v1.3*:
     - Magia to **Rozdział 9** (strony drukowane 190-203 / PDF 191-204).
     - Rozgrywka to **Rozdział 10** (strony drukowane 204-245 / PDF 205-246).
     - Księgi wiedzy nadprzyrodzonej to **Rozdział 11** (strony drukowane **246-265** / PDF 247-266), a nie tylko strony 259-265! Na stronach 246-258 znajdują się opisy poszczególnych tomów (m.in. s. 250 to opis *Króla w Żółci*, a nie Rozdział 10), na stronach 259-260 księgi okultystyczne, a na stronach 261-264 *Tabela XI: Księgi mitów*.
     - Zaklęcia to **Rozdział 12** (strony drukowane **266-296** / PDF 267-297).
   - W pliku `catalog.ts` do polskich zaklęć i tomów przypisano numery stron z **edycji angielskiej** (np. s. 226, 227, 228, 248, 250, 256, 261, 262, 265, 266, 268) z fałszywą etykietą `language: 'pl'`.

2. **Niezgodny z RAW mechanizm forsowania pierwszego rzucenia:**
   - W `magic-engine.ts` w przypadku porażki forsowanego rzutu (`pushedFailedCatastrophe`) wylosowano formułę `1k4` i dodano wyłącznie do punktów Poczytalności.
   - Literalny RAW CoC 7e (str. 197) stanowi jednoznacznie: **czarownik płaci pełny koszt zaklęcia (PM, PP i POW) pomnożony przez kość 1K6**, każda brakująca nadwyżka PM jest **odliczana od Punktów Wytrzymałości (HP) 1:1**, a Strażnik losuje lub wybiera skutek uboczny z **oficjalnej tabeli 1K8 katastrof magicznych** (zwykłej dla zaklęć pomniejszych lub potężnej dla bóstw i kosztu POW).

3. **Fałszywy rzut obronny na SAN przy pełnym studium księgi:**
   - W `tome-engine.ts` zaimplementowano test obronny na Poczytalność (`sanRoll`), który w razie sukcesu zmniejsza stratę SAN o połowę. W literalnym RAW (str. 193) **nie ma rzutu obronnego przy lekturze tomu** - badacz po prostu wykonuje rzut kośćmi wskazanymi w opisie księgi (np. 2K4) i traci tę wartość bezpośrednio. Reguła "save for half" to mechanika zapożyczona z gier fantasy / potocznej wypowiedzi Setha Skorkowsky'ego, a nie reguła RAW.

4. **Zniekształcone nazwy, koszty i mechaniki w katalogu zaklęć i tomów:**
   - *Dominacja* (str. 271) kosztuje w RAW **1 PM i 1 PP**; w `catalog.ts` wprowadzono ją jako *Zdominowanie* z kosztem **10 PM** na fałszywej stronie 250.
   - *Ochrona Ciała* (str. 272) kosztuje w RAW zmienną liczbę PM, gdzie **każdy 1 PM daje 1K6 pancerza**; w `catalog.ts` wprowadzono ją jako *Tarcza z Ciała* z przestarzałą mechaniką CoC 6e ("każde 2 PM = 1k6 pancerza") na fałszywej stronie 262.
   - *Uschnięcie Kończyny* (str. 278) wprowadzono jako *Uwiąd Kończyny* na stronie 268.
   - *Uschnięcie* (str. 278, ang. *Shriveling*) wprowadzono jako *Spopielenie* na stronie 266.
   - *Wskrzeszenie* (str. 279) w RAW ma czas rzucania **1 lub 2 rundy**; w `catalog.ts` wpisano **2 godziny** na stronie 265.
   - *Nawiązanie Kontaktu z Istotą z Głębin* (str. 286) wprowadzono w liczbie mnogiej na stronie 256.
   - *Przywołanie / Spętanie Byakhee* (str. 288) wprowadzono jako *Przywołanie / Związanie Byakhee* na stronie 261 (oficjalna polska terminologia CoC 7e to *spętanie*).
   - *Księga Eibona (Book of Eibon)* w Tabeli XI (str. 262) posiada parametry: język angielski, ok. XV w., czas: 32 tyg., utrata PP: **2K4**, WMC: **+3**, PMC: **+8**, WM: **33**. W `catalog.ts` wpisano: 36 tyg., 1k8 PP, CMF 8, MR 33. We wstępnej próbie audytu błędnie przypisano jej parametry *Objawień Gla'akiego* (1842 r., 2K8 PP, +5 WMC, +10 PMC, WM 45)!
   - *De Vermis Mysteriis* w Tabeli XI (str. 261) posiada utratę PP **2K6** i WMC **+4**; w `catalog.ts` wpisano 1k10 PP i CMI 3.
   - *Cultes des Goules* w Tabeli XI (str. 261) posiada utratę PP **1K10**, WMC **+4**, PMC **+8**, WM **36**; w `catalog.ts` wpisano 1k6 PP, CMI 2, CMF 6, MR 24.
   - *Nienazwane kulty (Unaussprechlichen Kulten)* w Tabeli XI (str. 262) posiada: 52 tyg., 2K8 PP, WMC +5, PMC +10, WM 45; w `catalog.ts` wpisano: 34 tyg., 1k8 PP, CMF 7, MR 30.

5. **Ślepa plama AI w architekturze promptu (`build-context.ts`):**
   - Stan magii postaci (`character.magic`: znane czary, przestudiowane tomy, status sceptyk/wierzący) **w ogóle nie jest przekazywany do modelu LLM w `build-context.ts`**!
   - Model nie wie, jakie zaklęcia badacz zna, co zmusza AI do konfabulowania tagów lub prób rozstrzygania czarów w narracji.

6. **Brak spójnej obsługi magii spontanicznej w czacie:**
   - Metoda `attemptSpontaneousMagic` istnieje w kodzie TypeScript, ale nie posiada dedykowanego tagu promptu (np. `[MAGIA_SPONTANICZNA:...]`), nie jest parsowana przez `mechanics-parser.ts` i nie posiada interaktywnej karty w interfejsie.

7. **Iluzoryczne bezpieczeństwo testów jednostkowych:**
   - Istniejące testy w `magic.test.ts` (17/17 PASS) badały wymyślone założenia (np. asercja `spell.source.page > 0` sprawdzała jedynie czy liczba jest dodatnia, a nie czy strona jest prawdziwa; test pełnego studium asertował fałszywy rzut obronny SAN).

---

## 2. Źródła referencyjne i weryfikacja numeracji

### A. Księga Strażnika CoC 7e v1.3 (Wydanie polskie Black Monk Games)

| Jednostka | Tytuł polski | Tytuł angielski | Strony drukowane | Strony PDF | Kluczowa zawartość mechaniczna |
|---|---|---|---|---|---|
| **Rozdział 9** | Magia | Magic | **190-203** | **191-204** | Definicja magii (s. 191), lektura tomów (s. 192), wstępne czytanie (s. 192), pełne studium (s. 193), księgi jako źródła bibliograficzne (s. 195), nauka zaklęć (z księgi 2K6 tyg, od nauczyciela 1K8 dni, od bytu 1K6 PP; s. 196-197), pierwsze rzucenie (Hard POW) i kolejne rzucenia automatyczne (s. 197), forsowanie i katastrofa (koszt x 1K6, PM->HP 1:1, tabela 1K8 skutków; s. 197-198), przerwanie rzucania (s. 198), reguła wiary/sceptycyzmu (s. 198), zwiększanie Mocy (s. 201), magia spontaniczna (s. 200-202). |
| **Rozdział 10** | Rozgrywka | Playing the Game | **204-245** | **205-246** | Magia w scenariuszu (s. 234-236), rola Strażnika, prowadzenie rytuałów kultów. |
| **Rozdział 11** | Księgi wiedzy nadprzyrodzonej | Tomes of Eldritch Lore | **246-265** | **247-266** | Wprowadzenie i opisy konkretnych ksiąg Mitów (s. 246-258: Necronomicon, Król w Żółci, Księga Eibona itd.), Księgi okultystyczne (s. 259-260), Tabela XI: Księgi Mitów (s. 261-264) z parametrami: Język, Data, Autor, Czas czytania (tygodnie), Utrata PP, WMC (CMI), PMC (CMF), Wskaźnik Mitów (WM/MR), zawarte zaklęcia. |
| **Rozdział 12** | Księga Zaklęć | The Grimoire / Spells | **266-296** | **267-297** | Nazwy alternatywne (s. 266), Głębsza magia (s. 266-267), przeciwstawne testy Mocy (s. 267), czas rzucania w walce (s. 267), katalog zaklęć od *Bramy* do *Znaku Vooryckiego* (s. 270-296). |
| **Rozdział 13** | Artefakty i obce urządzenia | Alien Artifacts | **297+** | **298+** | Magiczne przedmioty, gwiezdne kamienie z Mnar, szkło z Leng. |

> [!CAUTION]
> **Koniec z powoływaniem się na strony 226-228 i Rozdział 8!**
> Wszelkie odwołania do stron 226-228 w `catalog.ts` są fałszywym importem z podręcznika amerykańskiego. W polskim podręczniku Tabela Ksiąg Mitów to strony **261-264**, a Księga Zaklęć to strony **266-296**.

### B. Wielki Grymuar Magii Mitów Cthulhu (Black Monk Games)

- **Rozdział 1: W sprawie magii (str. 8-16):** Rytuały zależą od formy ofiary, układu ciał niebieskich, dni tygodnia, faz księżyca oraz pór roku; magia ludowa (s. 13).
- **Rozdział 2: Magiczne relikty i linie geomantyczne (str. 17-21):**
  - *Magiczne relikty (str. 17):* Przedmioty ogniskujące energię Mitów.
  - *Linie geomantyczne (str. 18):* Miejsca mocy wzmacniające lub modyfikujące rzuty magiczne.
- **Kategorie zaklęć (str. 22-26):** Oficjalna kategoryzacja Chaosium / Black Monk Games: Komunikacyjne, Ludowe, Ochronne, Przegnania lub kontroli, Przemiany, Walki, Inne.
- **Rozdział 3: Katalog Zaklęć (str. 28-170):** Ponad 500 zaklęć od A do Z z oficjalnymi parametrami i ikonami kategorii.

### C. Poradniki MG (Seth Skorkowsky)

- **Cthulhu Mythos & Reading Tomes (Part 8):**
  - Rozróżnienie *Initial Reading* (przegląd w godzinach = tygodnie pełnego studium) oraz *Full Study* (tygodnie/miesiące w downtime).
  - *Belief Rule:* Sceptyk nie traci SAN przy czytaniu, dopóki nie uwierzy. Utrata 1 SAN w spotkaniu z potworem lub dobrowolna konwersja uderza natychmiast skumulowaną stratą równą pełnej wartości Mitów Cthulhu.
- **Spellcasting & RAW Nuances:**
  - Pierwsze rzucenie wymaga Trudnego POW. Porażka = zaklęcie nie działa, ale koszty są pobrane!
  - Pushed Roll przy pierwszym rzuceniu: jeśli porażka, **zaklęcie i tak działa**, lecz sprowadza katastrofę (koszty x 1K6, PM->HP 1:1, groźne skutki uboczne).
  - Kolejne rzucenia udają się **automatycznie** bez rzutu kością.
  - Magia w Zewie Cthulhu to nie D&D: brak rutynowego leczenia, ogromne koszty SAN, stała utrata POW dla pieczęci.
- **Jawne House Rules Setha (oznaczone jako opcjonalne):**
  - +1 kość premiowa przy nauce zaklęcia od nauczyciela.
  - Błędne założenie Setha: w wideo twierdził, że przy pełnym studium wykonuje się "sanity save to see if you lose sanity", co nie występuje w drukowanym RAW (w RAW rzuca się po prostu kośćmi straty PP dla danej księgi).

### D. Praktyka Sesji (Korpus-Prowadzenia-MG)

1. **Sesja 027 (*027-badacze-mitow-26-jego-wola...md*, L1414-1440):**
   - *Sytuacja:* Badaczka rzuca zaklęcie kontaktu z Yithitami.
   - *Praktyka MG:* Strażnik pobiera 4 PM i 1 PP (K6/2). Nie wykonuje rzutu na udanie się zaklęcia, lecz od razu przechodzi do opisu falowania powietrza i pyta o intencję. Następnie zarządza test Mitów Cthulhu na wynik kontaktu.
   - *Wniosek:* Na sesjach MG rzadko pamiętają o rzucie Trudnego POW przy pierwszym rzuceniu, traktując rzucenie czaru od razu jako narracyjny test Mitów. **Aplikacja musi wymusić dyscyplinę RAW poprzez `SpellCard`.**
2. **Sesja 032 (*032-badacze-mitow-31-nalot-na-kult...md*, L48-74):**
   - *Sytuacja:* Jeremaja przegląda łaciński egzemplarz księgi.
   - *Praktyka MG:* Strażnik kwalifikuje działanie jako wstępne przejrzenie, pobiera 4 PP, zarządza test Języka (łacina) i każe zaznaczyć łacinę do rozwoju na koniec sesji.
   - *Wniosek:* Sesja w 100% odzwierciedla RAW ze str. 195 (rozwój umiejętności języka po lekturze tomu).
3. **Sesja 036 (*036-badacze-mitow-35-ten-w-ksiedze...md*, L1352-1372):**
   - *Sytuacja:* Badacz Salivan rzuca *Znak Voorycki* (1 runda, 1 PP) oraz *Zgubny wpływ* (1 PP).
   - *Praktyka MG:* Ponieważ Salivan zna czary, MG nie każe rzucać na udanie się zaklęcia (sukces automatyczny). Od razu przechodzi do spornego testu Mocy przeciwko celowi, uwzględniając gesty dłoni i czas rzucania.
   - *Wniosek:* Pełna zgodność z regułą automatycznego sukcesu dla znanych czarów i rzutów spornych POW.
4. **Sesja 037 (*037-badacze-mitow-36-koszmar-z-atramentu...md*, L860-890):**
   - *Sytuacja:* Konsekwencje moralne i fabularne po rzuceniu modyfikacji pamięci na uniwersytecie i czaru na dziecku.
   - *Praktyka MG:* Strach przed przyciągnięciem Ogarów z Tindalos, brak możliwości "przetestowania na sucho".
   - *Wniosek:* Magia w narracji zawsze niesie paranoję i koszty psychiczne.

---

## 3. Macierz reguł: RAW vs Opcjonalne vs Poradniki vs Sesje vs Aplikacja

| Obszar mechaniczny | Źródło pierwotne & strona | Kategoria reguły | Stan w kodzie silnika | Stan w promptach MG (`gm-protocol.ts`) | Stan w testach (`magic.test.ts`) | Ocena i decyzja projektowa |
|---|---|---|---|---|---|---|
| **Nauka zaklęcia z tomu** | KS str. 196 (Rozdz. 9) | **RAW Literalny** | Brak dedykowanego silnika nauki w `TomeEngine` (zaklęcia są od razu odkrywane po wstępnym czytaniu). | Brak instrukcji dla MG o czasie 2K6 tyg i Trudnym teście INT. | Brak testu czasu nauki i testu INT. | 🔴 **ROZJAZD.** Należy dodać do `tome-engine.ts` metodę `learnSpellFromTome` (2K6 tyg, Trudny test INT, forsowanie). |
| **Nauka od nauczyciela** | KS str. 197 (Rozdz. 9); Seth Part 8 | **RAW / Poradnik** | Niewspierane mechanicznie (pole `source: 'teacher'` istnieje tylko jako znacznik w typach). | Brak wzmianki w protokole. | Brak testu. | 🟡 **LUKA.** Dodać wsparcie dla 1K8 dni nauki z opcjonalną kością premiową wg house rule Setha Skorkowsky'ego. |
| **Nauka od bytu Mitów** | KS str. 197 (Rozdz. 9) | **RAW Literalny** | Niewspierane mechanicznie (`source: 'entity'`). | Brak wzmianki w protokole. | Brak testu. | 🟡 **LUKA.** Dodać procedurę: koszt co najmniej 1K6 SAN + regularny test INT w snach/transie. |
| **Bramka Wiary (Belief Gate)** | KS str. 198 (Rozdz. 9); Seth Part 8 | **RAW Literalny** | Zaimplementowano w `magic-engine.ts` (blokada rzucania dla sceptyka). | Protokół zabrania rzucania sceptykom. | Test istnieje (`✓ blokuje rzucanie czarów u sceptyka`). | 🟢 **ZGODNE.** Zgodność z RAW i poradnikami Setha. |
| **Konwersja sceptyka w wierzącego** | KS str. 198 (Rozdz. 9) | **RAW Literalny** | `tome-engine.ts` liczy `Math.max(deferredSanLoss, currentMythos)`. | Protokół nakazuje opisać przełom psychiczny. | Test istnieje, ale bada odłożony dług. | 🟡 **DO POPRAWY.** Zgodnie z RAW (s. 198) utrata SAN wynosi **DOKŁADNIE aktualną wartość Mitów Cthulhu** postaci. Usunąć zawiłe pole `deferredSanLoss`. |
| **Wstępne czytanie tomu (Skimming)** | KS str. 192 (Rozdz. 9); Seth Part 8 | **RAW / Poradnik** | `tome-engine.ts`: rzut na język, czas w godzinach, utrata SAN, zysk CMI. | Protokół nakazuje emitować `[TOM:... akcja=skimming]`. | Test istnieje (`✓ wstępny przegląd`). | 🟢 **ZGODNE.** Pełna harmonia RAW z regułą kciuka Setha Skorkowsky'ego (godziny = tygodnie). |
| **Pełne studium tomu (Full Study)** | KS str. 193 (Rozdz. 9); Tab. XI str. 261-264 | **RAW Literalny** | `tome-engine.ts` wykonuje **fałszywy rzut obronny SAN** (`sanRoll`) zmniejszający stratę o połowę! | Protokół nakazuje emitować `[TOM:... akcja=study]`. | Test asertuje fałszywy rzut obronny. | 🔴 **BŁĄD FAKTOGRAFICZNY.** RAW nie daje rzutu obronnego przy lekturze. Usunąć "save for half" jako domyślne zachowanie RAW, dodać ewentualny opcjonalny przełącznik w konfiguracji. |
| **Limit Wskaźnika Mitów (MR/WM)** | KS str. 193 (Rozdz. 9) | **RAW Literalny** | `tome-engine.ts` prawidłowo ucina przyrost CMF na poziomie `mr`. | Wzmianka w dokumentacji. | Test sprawdza limit MR. | 🟢 **ZGODNE.** |
| **Sprawdzenie referencyjne (Reference)** | KS str. 195 (Rozdz. 9) | **RAW Literalny** | `tome-engine.ts`: 1K4 godzin, test d100 <= MR. | Protokół wspiera `akcja=reference`. | Test sprawdza rzut vs MR. | 🟢 **ZGODNE.** |
| **Pierwsze rzucenie czaru** | KS str. 197 (Rozdz. 9); Seth Part 8 | **RAW Literalny** | `magic-engine.ts`: Trudny test POW, porażka pobiera koszty bazowe. | Protokół instruuje o Trudnym POW w karcie. | Test weryfikuje Hard POW. | 🟢 **ZGODNE.** |
| **Nieudane forsowanie pierwszego rzucenia** | KS str. 197-198 (Rozdz. 9) | **RAW Literalny** | `magic-engine.ts`: zaklęcie zadziałało, ale dodano tylko `1k4 SAN`. | Brak instrukcji o mnożniku 1K6 i tabeli katastrof. | Test asertuje sukces z katastrofą, ale ignoruje koszty. | 🔴 **KRYTYCZNY ROZJAZD.** Wdrożyć rygor RAW: **koszt zaklęcia x 1K6**, nadwyżka PM idzie w HP (1:1), losowanie z tabeli 1K8 skutków ubocznych. |
| **Kolejne rzucenia czaru** | KS str. 197 (Rozdz. 9); Seth Part 8 | **RAW Literalny** | `magic-engine.ts`: automatyczny sukces bez testu kośćmi. | Protokół zakazuje rzutów dla znanego czaru. | Test weryfikuje sukces automatyczny. | 🟢 **ZGODNE.** Kluczowy inwariant anty-D&D zachowany. |
| **Konwersja PM -> HP (1:1)** | KS str. 197 (Rozdz. 9) | **RAW Literalny** | `magic-engine.ts` i `SpellCard`: wymaga jawnej zgody gracza, blokuje samobójstwo. | Protokół instruuje o konwersji PM->HP. | Test sprawdza zgodę i pobranie z HP. | 🟢 **ZGODNE.** |
| **Trwała utrata Mocy (POW)** | KS str. 197, 267 (Rozdz. 9, 12) | **RAW Literalny** | `magic-engine.ts`: trwale odejmuje POW (np. Znak Starszych Bogów: 10 POW). | Protokół uwzględnia trwałą utratę. | Test weryfikuje redukcję bazowego POW. | 🟢 **ZGODNE.** |
| **Przeciwstawne testy Mocy (Opposed POW)** | KS str. 101, 267 (Rozdz. 5, 12) | **RAW Literalny** | `magic-engine.ts`: porównanie rang sukcesu, przy remisie wyższa MOC. | Protokół obsługuje pole `cel=...` i `pow=...`. | Test weryfikuje starcie woli. | 🟢 **ZGODNE.** Zasada granic możliwości (str. 99): cel o POW o 100+ wyższym nie pozwala człowiekowi na sukces. |
| **Zwiększanie Mocy (POW Improvement)** | KS str. 201 (Rozdz. 9); Seth Part 8 | **RAW / Poradnik** | `magic-engine.ts`: flaga `casterPowImprovementEligible`. | Brak obsługi rzutu na rozwój w karcie postaci. | Test sprawdza flagę. | 🟡 **DO WDROŻENIA.** Zintegrować flagę z Fazą Rozwoju Badacza (rzut 1K100 > POW daje +1K10 POW). |
| **Głębsza Magia (Deeper Magic)** | KS str. 266-267 (Rozdz. 12) | **RAW Literalny** | `magic-engine.ts`: rzucenie w stanie obłędu + rzut 1K100 <= Mity Cthulhu. | Protokół nie instruuje MG o opisie wariantu. | Test weryfikuje odblokowanie. | 🟢 **ZGODNE W SILNIKU.** Wzbogacić prompt MG o diegetyczne opisy wariantów. |
| **Magia Spontaniczna** | KS str. 200-202 (Rozdz. 9) | **RAW Opcjonalny** | `magic-engine.ts` posiada `attemptSpontaneousMagic`. | Brak dedykowanego tagu promptu w `gm-protocol.ts`. | Brak testu w `magic.test.ts`. | 🔴 **LUKA W FLOW.** Dodać tag `[MAGIA_SPONTANICZNA:...]` i interaktywną kartę w czacie. |
| **Katalog czarów i numery stron** | KS str. 266-296 (Rozdz. 12) | **RAW Literalny** | `catalog.ts`: błędne nazwy (*Zdominowanie*, *Tarcza z Ciała*, *Uwiąd Kończyny*, *Spopielenie*), zniekształcone koszty (Ochrona Ciała 2 PM=1k6 pancerza, Dominacja 10 PM), fałszywe strony z USA. | W promptach występują nazwy z katalogu. | Test sprawdzał tylko `page > 0`. | 🔴 **BŁĄD FAKTOGRAFICZNY.** Poprawić wszystkie rekordy na autentyczne polskie nazwy i numery stron z wydania BMG. |
| **Katalog tomów i Tabela XI** | KS str. 261-264 (Rozdz. 11) | **RAW Literalny** | `catalog.ts`: zniekształcone koszty SAN, WMC i WM dla Eibona, Prina, d'Erlette'a i von Junzta; strony z edycji USA. | W promptach występują ID tomów. | Test sprawdzał tylko Necronomicon. | 🔴 **BŁĄD FAKTOGRAFICZNY.** Zsynchronizować 1:1 z Tabelą XI. |
| **Wstrzykiwanie magii do promptu AI** | Architektura systemu | **Inwariant SSOT** | Brak sekcji magii w `build-context.ts`. | AI nie zna zaklęć ani wiary badacza. | Brak testu integracyjnego. | 🔴 **KRYTYCZNA LUKA ARCHITEKTURY.** Dodać `buildPlayerMagicSection` do `build-context.ts`. |

---

## 4. Wykaz rozjazdów i błędnych twierdzeń z poprzedniego audytu (#252) oraz rewizji pośredniej

Poniżej zestawiono konkretne twierdzenia z Issue #252, powiązanych PR-ów oraz wstępnej analizy, które okazały się niezgodne ze stanem faktycznym:

### 1. Błędna struktura i numeracja stron Rozdziału 11 w audycie i kodzie
- *Twierdzenie w #252:* "Rozdział 8: Magia; Rozdział 11: Tomiska Wiedzy Tajemnej (str. 226-228)".
- *Twierdzenie we wstępnej rewizji:* "Tomy to Rozdział 11 (str. 259-265), a strona 250 to Rozdział 10".
- *Stan faktyczny:* 
  - Rozdział 9 to *Magia* (str. 190-203 drukowane / 191-204 PDF).
  - Rozdział 10 to *Rozgrywka* (str. 204-245 drukowane / 205-246 PDF).
  - Rozdział 11 nosi tytuł **Księgi wiedzy nadprzyrodzonej** i obejmuje strony **246-265** (PDF 247-266). Na stronie 250 znajduje się opis tomu *Król w Żółci* (a nie Rozdział 10!). Tabela XI znajduje się na stronach **261-264** (PDF 262-265).
  - Rozdział 12 to **Księga Zaklęć** na stronach **266-296** (PDF 267-297).

### 2. Pomylenie *Księgi Eibona* z *Objawieniami Gla’akiego*
- *Błąd we wstępnej rewizji:* We wstępnej rewizji podano, że Księga Eibona w wydaniu angielskim ma parametry: "1842 r., czas: 32 tyg., utrata PP: 2K8, WMC: +5, PMC: +10, WM: 45%".
- *Stan faktyczny w Tabeli XI (str. 262):* 
  - Powyższe parametry należą do znajdujących się w tym samym wierszu **Objawień Gla’akiego (Revelations of Gla’aki)**!
  - Prawdziwy wpis dla **Księgi Eibona (Book of Eibon)** w języku angielskim to:
    - Data: **ok. XV w.** (autor nieznany)
    - Czas czytania: **32 tygodnie**
    - Utrata PP: **2K4** (nie 2K8!)
    - WMC: **+3** (nie +5!)
    - PMC: **+8** (nie +10!)
    - Wskaźnik Mitów (WM): **33** (nie 45!)

### 3. Zafałszowane dane czarów w `catalog.ts` (pominięte w poprzednich rewizjach)
- *Ochrona Ciała (flesh-ward):* W `catalog.ts` nazwano ją *Tarcza z Ciała* (str. 262) i przypisano koszt "każde 2 PM = 1k6 pancerza". W oficjalnej *Księdze Strażnika* (str. 272) czar nosi nazwę **Ochrona Ciała**, a każdy **1 punkt Magii dodaje 1K6 punktów Pancerza** (mechanika 2 PM pochodziła ze starej 6. edycji CoC!).
- *Dominacja (dominate):* W `catalog.ts` nazwano ją *Zdominowanie* (str. 250) z kosztem 10 PM. W oficjalnym podręczniku (str. 271) czar nosi nazwę **Dominacja** i kosztuje **1 punkt Magii i 1 punkt Poczytalności**.
- *Wskrzeszenie (resurrection):* W `catalog.ts` wpisano czas rzucania "2 godziny nad naczyniem z prochami" (str. 265). W oficjalnym podręczniku (str. 279) czas rzucania wynosi **1 lub 2 rundy**.
- *Przywołanie / Spętanie Byakhee (summon-bind-byakhee):* W `catalog.ts` użyto kalki *Związanie* na stronie 261. W oficjalnym podręczniku (str. 288) rozdział nosi tytuł *Zaklęcia Przywołania i Spętania*, a termin to **Spętanie Byakhee**.
- *Nawiązanie Kontaktu z Istotą z Głębin (contact-deep-ones):* W podręczniku (str. 286) czar nosi tytuł w liczbie pojedynczej: **Nawiązanie Kontaktu z Istotą z Głębin**, a koszt to 3 PM bez bazowej utraty SAN.

### 4. Zniekształcone dane tomów w `catalog.ts`
- *Nienazwane kulty (unaussprechlichen-kulten):* W `catalog.ts` wpisano czas 34 tyg., utratę SAN 1k8, CMF 7, MR 30 na s. 231. W Tabeli XI (str. 262) parametry to: czas **52 tygodnie**, utrata PP **2K8**, WMC **+5**, PMC **+10**, WM **45** na str. **262**.
- *De Vermis Mysteriis:* W `catalog.ts` wpisano utratę SAN 1k10 i CMI 3 na s. 228. W Tabeli XI (str. 261) utrata PP to **2K6**, a WMC to **+4** na str. **261**.
- *Cultes des Goules:* W `catalog.ts` wpisano utratę SAN 1k6, CMI 2, CMF 6, MR 24 na s. 228. W Tabeli XI (str. 261) parametry to: utrata PP **1K10**, WMC **+4**, PMC **+8**, WM **36** na str. **261**.

### 5. Zmyślona katastrofa forsowania w `magic-engine.ts`
- W kodzie zaimplementowano formułę `totalSanCost = rawSanCost + 1k4`.
- Literalny RAW CoC 7e (str. 197) wymaga wymnożenia **całego kosztu (PM, SAN, POW) przez kość 1K6**, pokrycia niedoboru PM z punktów Wytrzymałości (HP) 1:1 oraz rozstrzygnięcia skutku z oficjalnej tabeli 1K8 katastrof.

### 6. Fałszywy rzut obronny na SAN przy lekturze tomu w `tome-engine.ts`
- Zaimplementowano rzut obronny `sanRoll` zmniejszający stratę SAN o połowę ("save for half").
- W RAW CoC 7e (str. 193) nie ma testu obronnego - badacz wykonuje rzut kośćmi wskazanymi dla danej księgi (np. 2K4) i traci tę wartość bez redukcji.

---

## 5. Analiza ścieżek decyzyjnych i ryzyka arbitralności AI

W oparciu o analizę kodu czatu i promptów zidentyfikowano następujące wektory arbitralności modelu:

1. **Halucynacja czarów spoza karty badacza:**
   - Gdy gracz deklaruje: "Rzucam zaklęcie na kultystę", model LLM nie ma w kontekście listy `character.magic.knownSpells`.
   - W efekcie model może samowolnie wyemitować `[CZAR: @Arthur: id=wither-limb]`, nawet jeśli Arthur nigdy nie widział tomu i nie zna formuły.
   - *Rozwiązanie:* Wstrzyknięcie listy znanych czarów do promptu systemowego w `build-context.ts` z twardą dyrektywą: "Badacz zna TYLKO poniższe zaklęcia. Jeśli gracz próbuje rzucić coś innego, odmów w narracji lub potraktuj jako magię spontaniczną".

2. **Emergency Fallback w `SpellCard` maskujący błędy AI:**
   - Jeśli AI wyemituje zmyślone ID (np. `[CZAR: @Arthur: id=fireball]`), `spell-card.tsx` (linie 83-114) tworzy sztuczny czar z domyślnym kosztem 5 PM i 1k4 SAN.
   - Powoduje to wyciek konwencji fantasy (D&D) do Zewu Cthulhu.
   - *Rozwiązanie:* Jeśli zaklęcie nie figuruje w `CANONICAL_SPELLS` ani w `knownSpells` postaci, karta powinna zablokować rzucenie z ostrzeżeniem lub przekierować deklarację na procedurę Magii Spontanicznej.

3. **Samowolne rozstrzyganie magii w narracji:**
   - Pomimo zakazu w `gm-protocol.ts`, model w momentach dramatycznych może pisać: "Wypowiadasz słowa, tracisz 5 punktów magii i kultysta pada martwy".
   - *Rozwiązanie:* Wzmocnienie reguły w protokole MG oraz automatyczny walidator po stronie backendu wykrywający frazy rzucania czarów bez emisji tagu `[CZAR:]`.

---

## 6. Decyzje produktowe: Purystyczne RAW vs Wybrane House Rules

W celu zachowania tożsamości *Strażnika Tajemnic AI* jako gry wiernej duchowi CoC 7e, podjęto następujące decyzje:

1. **Purystyczne d100 Weird Fiction jako fundament (Nadrzędna Zasada):**
   - Wszystkie reguły dotyczące rzucania czarów (pierwsze rzucenie Hard POW, automatyczny sukces kolejnych, reguła wiary, koszty PM/HP/POW, brak czarów leczących w podręczniku głównym) muszą bezwzględnie odpowiadać Księdze Strażnika v1.3.

2. **Katastrofa Forsowania w pełnym rygorze RAW:**
   - Zastąpienie zmyślonego `+1k4 SAN` literalną zasadą CoC 7e: **koszt x 1K6**, odliczenie niedoboru PM od HP 1:1, oraz losowanie skutku z oficjalnej tabeli 1K8 katastrof (pomniejszych lub większych).

3. **Studium tomów bez sztucznego rzutu obronnego:**
   - Domyślnie pełne studium tomu zadaje pełną stratę SAN określoną w Tabeli XI (zgodnie z RAW).
   - "Rzut obronny na połowę straty wg Setha Skorkowsky'ego" zostaje oznaczony jako opcjonalny house rule i wyłączony domyślnie (`tomeSanitySaveEnabled: false`).

4. **Reguła Wiary zgodna z duchem podręcznika:**
   - Sceptyk nie traci SAN przy czytaniu tomów. W chwili konwersji traci natychmiast SAN równe **aktualnej wartości Mitów Cthulhu** (uproszczenie księgowości zgodnie z wytyczną ze str. 198 podręcznika).

5. **Oficjalne polskie nazewnictwo i numeracja stron:**
   - Wszystkie wpisy w katalogu otrzymują autentyczne polskie nazwy podręcznikowe (*Dominacja*, *Ochrona Ciała*, *Uschnięcie Kończyny*, *Uschnięcie*, *Wskrzeszenie*, *Nawiązanie Kontaktu z Istotą z Głębin*, *Przywołanie / Spętanie Byakhee*, *Znak Starszych Bogów*, *Zmącenie Pamięci*, *Znak Voorycki*) oraz poprawne numery stron z polskiego wydania BMG (Rozdziały 11 i 12) oraz równolegle numery stron z edycji oryginalnej Chaosium.

6. **Wstrzykiwanie Magii do Promptu MG:**
   - Dodanie modułu `buildPlayerMagicSection` do `build-context.ts`, aby model zawsze znał status wiary i listę znanych czarów badacza.

7. **Wdrożenie Magii Spontanicznej do czatu:**
   - Dodanie obsługi tagu `[MAGIA_SPONTANICZNA:...]` oraz dedykowanego komponentu w oknie czatu narracji.

---

## 7. Specyfikacja techniczna zmian przed implementacją

Przed przystąpieniem do prac kodowych zatwierdza się następujący zakres zmian w architekturze:

### A. Moduł Domenowy (`src/lib/magic/`)

1. **`types.ts`:**
   - Rozszerzenie `MagicSourceRef` o `pagePl: number` oraz `pageEn: number`.
   - Dodanie typu `CatastropheEffect`:
     ```typescript
     export interface CatastropheEffect {
       id: number;
       tier: 'minor' | 'major';
       name: { pl: string; en: string };
       description: { pl: string; en: string };
       mechanicalEffect?: { pl: string; en: string };
     }
     ```
   - Rozszerzenie `CastingResolution` o pełny raport katastrofy (mnożnik 1K6, PM potrącone z HP, wylosowany skutek uboczny z tabeli 1K8).
   - Uproszczenie `CharacterMagicState`: rozliczenie konwersji wiary bezpośrednio z wartością umiejętności `character.skills['Mity Cthulhu']`.

2. **`catalog.ts`:**
   - Korekta 10 kanonicznych zaklęć:
     - `wither-limb`: nazwa polska *Uschnięcie Kończyny*, strona PL 278, strona EN 268.
     - `dominate`: nazwa polska *Dominacja*, koszt PM: **1**, SAN: **1**, strona PL 271, strona EN 250.
     - `flesh-ward`: nazwa polska *Ochrona Ciała*, koszt: **1 PM = 1K6 pancerza**, SAN: 1K4, czas: 5 rund, strona PL 272, strona EN 262.
     - `shriveling`: nazwa polska *Uschnięcie*, koszt: 1-6 PM (1 PM = 1K6 dmg), SAN: 1K4, strona PL 278, strona EN 266.
     - `resurrection`: nazwa polska *Wskrzeszenie*, czas rzucania: **1 lub 2 rundy**, strona PL 279, strona EN 265.
     - `contact-deep-ones`: nazwa polska *Nawiązanie Kontaktu z Istotą z Głębin*, koszt: 3 PM, SAN: 0, strona PL 286, strona EN 256.
     - `summon-bind-byakhee`: nazwa polska *Przywołanie / Spętanie Byakhee*, strona PL 288, strona EN 261.
     - `elder-sign`: strona PL 295, strona EN 268.
     - `cloud-memory`: nazwa polska *Zmącenie Pamięci*, strona PL 295, strona EN 248.
     - `voorish-sign`: nazwa polska *Znak Voorycki*, strona PL 295, strona EN 269.
   - Korekta tomów wg Tabeli XI (str. 261-264):
     - `book-of-eibon-english`: język angielski, ok. XV w., czas: 32 tyg., utrata PP: **2K4**, WMC: **+3**, PMC: **+8**, WM: **33**, strona PL 262.
     - `de-vermis-mysteris`: łacina, 1542 r., czas: 48 tyg., utrata PP: **2K6**, WMC: **+4**, PMC: **+8**, WM: **36**, strona PL 261.
     - `cultes-des-goules`: francuski, ok. 1702 r., czas: 22 tyg., utrata PP: **1K10**, WMC: **+4**, PMC: **+8**, WM: **36**, strona PL 261.
     - `unaussprechlichen-kulten`: niemiecki, 1839 r., czas: **52 tyg.**, utrata PP: **2K8**, WMC: **+5**, PMC: **+10**, WM: **45**, strona PL 262.
     - `necronomicon-latin`: łacina, 1228 r., czas: 66 tyg., utrata PP: 2K10, WMC: +5, PMC: +11, WM: 48, strona PL 262.

3. **`magic-engine.ts`:**
   - Wdrożenie procedury katastrofy forsowania d100 Weird Fiction (str. 197):
     - Rzut 1K6 na mnożnik kosztu (`costMultiplier`).
     - `totalMpCost = baseMp * costMultiplier`.
     - `totalSanCost = baseSan * costMultiplier`.
     - `totalPowCost = basePow * costMultiplier`.
     - Rozliczenie niedoboru PM z HP w relacji 1:1.
     - Losowanie 1K8 z tabeli katastrof pomniejszych (zaklęcia standardowe) lub większych (bóstwa, koszt POW).
   - Uwzględnienie zasady granic możliwości (str. 99): cel o cesze POW o 100+ wyższej niż rzucający nie pozwala człowiekowi na sukces w sporze.

4. **`tome-engine.ts`:**
   - Usunięcie "save for half" jako zachowania domyślnego; rzut na SAN zadaje pełną wylosowaną wartość.
   - Dodanie metody `learnSpellFromTome(request)`: obsługa 2K6 tygodni nauki i Trudnego testu INT.

### B. Prompty i Kontekst AI (`src/lib/prompts/` & `src/app/api/chat/`)

1. **`build-context.ts`:**
   - Utworzenie funkcji `buildPlayerMagicSection(character: Character | null | undefined): string`.
   - Wstrzykiwanie sekcji zawierającej:
     - Status wiary: `Wierzący` lub `Sceptyk (nie może rzucać czarów, odłożona utrata SAN)`.
     - Punkty Magii: aktualne / maksymalne.
     - Lista znanych zaklęć (nazwa kanoniczna + diegetyczny alias znany badaczowi + czy rzucono po raz pierwszy).
     - Lista przestudiowanych tomów w ekwipunku.
     - Twarda reguła: zakaz rozstrzygania magii w prozie, zakaz rzucania czarów spoza listy bez procedury magii spontanicznej.

2. **`gm-protocol.ts`:**
   - Doprecyzowanie formatu tagu czaru: `[CZAR: @Imię: id=identyfikator | alias=Nazwa | cel=Cel | pow=N]`.
   - Dodanie specyfikacji tagu magii spontanicznej: `[MAGIA_SPONTANICZNA: @Imię: efekt=OpisEfektu | trudnosc=regular/hard/extreme | pm=N | san=N]`.
   - Zakaz wymyślania czarów leczących w realiach klasycznego CoC 7e.

### C. Interfejs Użytkownika (Komponenty React)

1. **`spell-card.tsx`:**
   - Usunięcie cichego fallbacku tworzącego fikcyjny czar fantasy przy nieznanym ID. Wyświetlenie ostrzeżenia: "Nieznana inkantacja spoza rejestru Mitów".
   - Wizualizacja katastrofy forsowania z diegetycznym opisem wylosowanego skutku z tabeli 1K8.

2. **Nowy komponent `SpontaneousMagicCard`:**
   - Obsługa improwizowanego rzutu na Mity Cthulhu z wyborem wydawanych PM i deklaracją intencji.

3. **`sheet-magic.tsx`:**
   - Prezentacja poprawnych polskich nazw czarów i tomów.
   - Przycisk konwersji sceptyka odliczający SAN równy bieżącej wartości umiejętności Mity Cthulhu.

---

## 8. Pakiet testów brzegowych (Adversarial Test Suite)

Poniższe scenariusze testowe stanowią bramkę akceptacyjną dla przyszłej implementacji:

1. **TC-MAG-01: Pierwsze rzucenie (Sukces Trudnego POW)**
   - *Warunki:* Badacz (POW 60, MP 10, SAN 50, Wierzący), czar *Uschnięcie Kończyny* (8 PM, 1K6 SAN).
   - *Oczekiwany wynik:* Wymagany próg <= 30. Rzut 25 = sukces. Pobrano 8 PM, 1K6 SAN. Flaga `isFirstCastDone` ustawiona na `true`. Zaklęcie zadziałało.
2. **TC-MAG-02: Pierwsze rzucenie (Porażka zwykła)**
   - *Warunki:* Ten sam badacz, rzut 45 (porażka). Gracz nie forsuje.
   - *Oczekiwany wynik:* Pobrano 8 PM i 1K6 SAN. Zaklęcie nie zadziałało. Flaga `isFirstCastDone` pozostaje `false`.
3. **TC-MAG-03: Nieudane forsowanie pierwszego rzucenia (Rygor RAW 1K6)**
   - *Warunki:* Badacz po porażce forsuje rzut. Rzut 55 (porażka).
   - *Oczekiwany wynik:* Zaklęcie ZADZIAŁAŁO. Rzut kością mnożnika 1K6 (np. 3). Koszt całkowity: 24 PM (8x3) oraz 3x(1K6) SAN. Ponieważ badacz miał tylko 10 PM, pozostałe 14 PM zostaje pobrane z HP (14 HP obrażeń!). Wylosowano skutek z tabeli 1K8 (np. "Krew spływająca po ścianach"). Badacz odnosi Ciężką Ranę.
4. **TC-MAG-04: Kolejne rzucenie (Automatyczny sukces RAW)**
   - *Warunki:* Badacz z `isFirstCastDone: true` rzuca *Uschnięcie Kończyny*.
   - *Oczekiwany wynik:* Sukces następuje AUTOMATYCZNIE bez rzutu kością d100. Pobrano 8 PM i 1K6 SAN.
5. **TC-MAG-05: Konwersja PM -> HP (Zgoda vs Brak zgody)**
   - *Warunki:* Badacz ma 4 PM, czar wymaga 8 PM.
   - *Oczekiwany wynik:* Bez zgody gracza (`allowHpConversion: false`) rzucenie zostaje zablokowane z komunikatem o braku energii. Ze zgodą gracza pobiera 4 PM oraz 4 HP. Jeśli HP <= 4, rzucenie zostaje zablokowane z ostrzeżeniem przed zgonem.
6. **TC-MAG-06: Bramka Sceptyka i odłożony szok**
   - *Warunki:* Sceptyk (Mity Cthulhu 15%, SAN 60) czyta *Księgę Eibona*.
   - *Oczekiwany wynik:* Zyskuje +3% WMC (Mity rosną do 18%), max SAN spada do 81. Nie traci bieżącego SAN. Próba rzucenia czaru zostaje bezwzględnie zablokowana. Przy konwersji w wierzącego natychmiast traci 18 SAN (równowartość Mitów Cthulhu), co wywołuje test INT na atak szaleństwa.
7. **TC-MAG-07: Przerwanie rzucania czaru (Interruption)**
   - *Warunki:* Czarownik w trakcie 1-godzinnego rytuału zostaje postrzelony lub zaatakowany.
   - *Oczekiwany wynik:* Inkantacja załamuje się. Koszty bazowe PM i SAN zostają utracone bez efektu czaru, Strażnik aplikuje skutek uboczny.
8. **TC-MAG-08: Starcie woli (Opposed POW) i rozwój Mocy**
   - *Warunki:* Badacz (POW 70) rzuca *Dominację* na kultystę (POW 50).
   - *Oczekiwany wynik:* Badacz rzuca 30 (Trudny sukces, ranga 2). Kultysta rzuca 45 (Zwykły sukces, ranga 1). Wygrywa badacz. Badacz otrzymuje uprawnienie do testu rozwoju Mocy (`casterPowImprovementEligible: true`).
9. **TC-MAG-09: Magia Spontaniczna (Reguła opcjonalna)**
   - *Warunki:* Badacz bez znajomości zaklęcia próbuje improwizować "Odgonienie ognia" (Mity Cthulhu 25%).
   - *Oczekiwany wynik:* Test na Mity Cthulhu (trudność zwykła). Rzut 18 = sukces. Pobrano ustalone przez MG 5 PM i 1K4 SAN. Czar NIE zostaje dopisany do znanych zaklęć (brak automatycznego sukcesu w przyszłości).
10. **TC-MAG-10: Głębsza Magia (Deeper Magic RAW)**
    - *Warunki:* Badacz w stanie Czasowej Niepoczytalności rzuca znany czar i zdaje test Mitów Cthulhu.
    - *Oczekiwany wynik:* Odblokowanie głębszej wersji czaru (`deeperUnlocked: true`). Flaga pozostaje aktywna nawet po odzyskaniu poczytalności.

---

## 9. Raport statusu systemu magii

- **Wdrożone i w pełni zgodne z RAW:**
  - Podział na pierwsze rzucenie (Hard POW) i kolejne rzucenia (sukces automatyczny).
  - Pobieranie kosztów PM/SAN nawet przy nieudanym pierwszym rzuceniu.
  - Ochrona przed samobójczą konwersją PM -> HP bez zgody gracza.
  - Rzuty sporne POW z porównaniem rang sukcesu i cechy bazowej.
  - Wycinanie tagów `[CZAR:]`, `[TOM:]`, `[WYNIK_CZARU:]` przed graczem i lektorem TTS w `cleanup.ts`.

- **Wdrożone, lecz oparte na błędach faktograficznych (Wymaga naprawy w kodzie):**
  - Numery stron, nazwy i mechaniki zaklęć w `catalog.ts`:
    - *Dominacja* (1 PM / 1 SAN, str. 271, a nie 10 PM na str. 250).
    - *Ochrona Ciała* (1 PM = 1K6 pancerza, str. 272, a nie 2 PM na str. 262).
    - *Uschnięcie Kończyny* (str. 278, a nie 268).
    - *Uschnięcie* (str. 278, a nie 266).
    - *Wskrzeszenie* (czas 1-2 rundy, str. 279, a nie 2 godziny na str. 265).
    - *Nawiązanie Kontaktu z Istotą z Głębin* (str. 286, a nie 256).
    - *Przywołanie / Spętanie Byakhee* (str. 288, a nie 261).
    - *Znak Starszych Bogów*, *Zmącenie Pamięci*, *Znak Voorycki* (str. 295, a nie 248/268/269).
  - Numery stron i statystyki tomów w `catalog.ts`:
    - *Księga Eibona*: XV w., 32 tyg, 2K4 PP, +3 WMC, +8 PMC, 33 WM (Tabela XI str. 262).
    - *De Vermis Mysteriis*: 1542 r., 48 tyg, 2K6 PP, +4 WMC, +8 PMC, 36 WM (Tabela XI str. 261).
    - *Cultes des Goules*: 1702 r., 22 tyg, 1K10 PP, +4 WMC, +8 PMC, 36 WM (Tabela XI str. 261).
    - *Unaussprechlichen Kulten*: 1839 r., 52 tyg, 2K8 PP, +5 WMC, +10 PMC, 45 WM (Tabela XI str. 262).
  - Skutek nieudanego forsowania w `magic-engine.ts` (`1k4 SAN` zamiast kosztu x 1K6, PM->HP i tabeli 1K8 katastrof).
  - Pełne studium tomów w `tome-engine.ts` (fałszywy rzut obronny zmniejszający stratę SAN o połowę).

- **Zablokowane / Niewykonane luki architektoniczne:**
  - Brak wstrzykiwania stanu magii postaci w `build-context.ts` (model AI nie wie, co potrafi badacz).
  - Brak tagu i karty czatu dla Magii Spontanicznej (`[MAGIA_SPONTANICZNA:...]`).
  - Brak mechanizmu nauki zaklęć w czasie (2K6 tyg / 1K8 dni + Trudny test INT).

---

## 10. Wnioski końcowe i następne kroki

Audyt jednoznacznie dowodzi, że samo osiągnięcie 100% zielonych testów syntetycznych w PR #293-#295 stworzyło iluzję zgodności z RAW, podczas gdy kod utrwalił błędy numeracji i zniekształcenia reguł.

Zgodnie z dyspozycją Issue #318 niniejszy raport stanowi kompletną podstawę merytoryczną i specyfikację naprawczą. Wszelkie modyfikacje kodu silnika, promptów i testów powinny zostać zrealizowane w ramach dedykowanego wdrożenia po zatwierdzeniu niniejszego raportu przez Product Ownera.
