---
typ_wiedzy: wniosek
tematy:
  - coc-7e
  - audit
  - mechanika
  - podrecznik-badacza
  - occupations
  - skills
  - credit-rating
  - ii-rp
podmioty:
  - Chaosium
  - Black Monk Games
  - Straznik Tajemnic AI
ai_summary: Rozdział po rozdziale audyt oficjalnego Podręcznika Badacza CoC 7ed pod kątem mechanik silnika, zawodów, umiejętności, realiów II RP oraz promptów MG.
---

# Raport z audytu Podręcznika Badacza 7ed (Rozdział po Rozdziale)

- **Projekt:** Strażnik Tajemnic AI
- **Zgłoszenie:** GitHub Issue [#210](https://github.com/InduPhantom-hash/straznik-tajemnic/issues/210) (Duplikat [#209](https://github.com/InduPhantom-hash/straznik-tajemnic/issues/209) zamknięty)
- **Data audytu:** 2026-09-11
- **Materiał źródłowy:** *Zew Cthulhu 7. edycja - Podręcznik Badacza* (Black Monk Games / Chaosium Inc., plik `/Volumes/Karta/Zew - materiały/Takie se/Zew_Cthulhu_7ed._Podrecznik_Badacza.pdf`, 282 strony)
- **Status:** Kompletny audyt referencyjny architektury silnika, bazy danych, promptów i reguł gry

---

## 1. Streszczenie wykonawcze (Executive Summary)

Audyt weryfikuje szczegółowo, rozdział po rozdziale, zgodność silnika aplikacji *Strażnik Tajemnic AI* (`_tester/_base/.silnik/src/`) z oficjalnym polskim wydaniem podręcznika *Zew Cthulhu 7. edycja - Podręcznik Badacza*.

### Główne wnioski z audytu:

1. **Luki w katalogu zawodów (Rozdział 4):**
   - Podręcznik Badacza (s. 59-60) zawiera **112 wpisów zawodowych**: 88 unikalnych zawodów z własnymi blokami statystyk oraz 24 odnośniki referencyjne ("patrz...").
   - W silniku (`_tester/_base/.silnik/src/lib/data/character/occupations.ts`) zaimplementowano **29 zawodów**. Występują w nim podstawowe wersje profesji: `author` (Autor), `dilettante` (Diletant) oraz `antiquarian` (Antykwariusz).
   - W silniku brakuje **59 unikalnych zawodów** podręcznikowych (lub 83 pozycji licząc wszystkie warianty). Nie ma fundamentalnych archetypów lovecraftowskich i epokowych: *Alienisty*, *Agenta federalnego*, *Archeologa*, *Funkcjonariusza publicznego*, *Gangstera*, *Handlarza antykami* (odrębny wpis od Antykwariusza, s. 69), *Łowcy nagród*, *Odkrywcy*, *Oficera wojskowego*, *Okultysty*, *Poszukiwacza*, *Psychiatry*, *Sędziego* czy *Wspinacza wysokogórskiego*.
   - W module `_tester/_base/.silnik/src/lib/random-character-generator.ts` zidentyfikowano zamakietowaną listę umiejętności z niekanonicznymi umiejętnościami spoza CoC 7e RAW (*Śledztwo*, *Bibliotekarstwo*, *Kredyt*, *Ocena*).

2. **Braki i błędy w rejestrze umiejętności (Rozdział 5):**
   - W `_tester/_base/.silnik/src/lib/data/character/skills.ts` brakuje umiejętności CoC 7e RAW: *Obsługi Ciężkiego Sprzętu (01%)*, *Zręcznych Palców (10%)*, *Mitów Cthulhu (00%)*, *Psychoanalizy (01%)*, *Wiedzy o Naturze (10%)*, *Wiedzy Tajemnej (01%)*, a także pełnego podziału na specjalizacje *Broni Palnej* i *Walki Wręcz*.
   - Wykryto literówkę w kluczu: `Occultyzm: 5` zamiast `Okultyzm: 5`.
   - Rozbieżności w nazewnictwie względem podręcznika: *Przebranie* zamiast *Charakteryzacja*, *Skok* zamiast *Skakanie*, *Przetrwanie* zamiast *Sztuka Przetrwania*, *Biblioteka* zamiast *Korzystanie z Bibliotek*, *Orientacja* zamiast *Nawigacja*, *Komputery* zamiast *Korzystanie z Komputerów*.

3. **Rozjazd w mechanice ekonomicznej i Standardach Życia (Rozdział 5 & 9):**
   - Silnik posiada dwa niespójne źródła prawdy: `credit-rating.ts` stosuje mnożniki RAW (np. `Gotówka = MAJ × 1`, `Dobytek = MAJ × 10`), podczas gdy `tables.ts` wstrzykuje sztywne, arbitralne kwoty (`$10`, `$50`, `$500`, `$2,000`), co zniekształca mechanikę zamożności.
   - Całkowity brak obsługi dedykowanego modułu ekonomicznego II RP (złote / grosze) opisanego na s. 206-207 Podręcznika Badacza, oraz współczesnej polskiej tabeli majętności (PLN).

4. **Niewykorzystany potencjał realiów II Rzeczypospolitej (Rozdział 9):**
   - Dedykowany, autorski rozdział polskiej edycji (s. 205-219) zawiera gotowe tabele: 100 polskich imion męskich, 100 żeńskich, 100 nazwisk z lat 20., realia prawne dotyczące broni (dekret z 1919 r., pozwolenia starosty, restrykcje graniczne), specyficzne uzbrojenie (Nagant wz. 1895, Browning FN1905, karabinek wz. 29, karabin ppanc wz. 35 Ur, pm Mors) oraz unikalny słowniczek gwary międzywojennej. Silnik ani prompt MG nie wykorzystują dotąd żadnego z tych zasobów.

5. **Brak wsparcia dla Stowarzyszeń Badaczy (Rozdział 6):**
   - 9 gotowych szablonów organizacji spajających Badaczy (*Czyściciele*, *Cyrk Wratha*, *Ciekawe Wieści*, *Rewir 13. Południowy*, *SPWiP/PFU*, *Novem Angelus*, *Dziatwa Ratched*, *Poszukiwacze*, *Stowarzyszenie Eksploracji Niewyjaśnionego*) nie występuje w generatorze przygód ani kreatorze postaci, zmuszając gracza do gry jako pojedynczy, wyizolowany Badacz bez mecenatu i zaplecza.

---

## 2. Audyt rozdział po rozdziale

### Rozdział 1: Wprowadzenie (s. 9-15)
- **Zawartość podręcznika:** Definicja gry RPG, przykładowy zapis sesji z udziałem Strażnika i 3 graczy, rola Badaczy jako zwykłych ludzi stających w obliczu kosmicznej grozy, zestaw wymaganych kości (K4, K6, K8, K10, K20, K100).
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts`
  - `_tester/_base/.silnik/src/lib/prompts/session-zero-instructions.ts`
  - `_tester/_base/.silnik/src/components/chat/`
- **Ocena stanu obecnego:**
  - Protokół MG w `gm-protocol.ts` dobrze egzekwuje zasadę rzutów tylko w sytuacjach stresowych (`[TEST: ...]`), jednak brakowało w nim jasnej dyrektywy z s. 10-13 podręcznika: *rutynowe czynności nie wymagają rzutów kośćmi*, a nieudany rzut powinien nieść natychmiastowe rozwinięcie akcji (Zasada *Fail-Forward*).
- **Rekomendacje:**
  - Wzmocnić w `gm-protocol.ts` instrukcję, że eksploracja otoczenia w spokojnych warunkach opiera się na deklaracjach gracza i logice, a nie na spamowaniu rzutami na Spostrzegawczość.

---

### Rozdział 2: Zgroza w Dunwich (s. 17-35)
- **Zawartość podręcznika:** Kompletne opowiadanie H.P. Lovecrafta *Zgroza w Dunwich* w przekładzie Macieja Płazy. Tekst stanowi wzorzec atmosfery, narastania obłędu, zepsucia prowincjonalnej Nowej Anglii oraz konfrontacji uczonych z Miskatonic University z nienazwanym bytem.
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/lovecraft-style-guide.ts`
  - `_tester/_base/.silnik/src/lib/prompts/narrative-style-instructions.ts`
  - `_tester/_base/.silnik/src/lib/prompts/style-data.json`
- **Ocena stanu obecnego:**
  - `lovecraft-style-guide.ts` i `style-data.json` zawierają dobre reguły stylistyczne, lecz leksyka przekładu Macieja Płazy (charakterystyczne dla polskiego wydania epitety: *bluźnierczy*, *odrażający*, *miazmatyczny*, *cyklopowy*, *bezdenny*) powinna być bezpośrednio wzbogacona o zwroty z tego opowiadania.
- **Rekomendacje:**
  - Wprowadzić do `style-data.json` frazy stylistyczne opisujące deformacje anatomiczne, starożytne kamienne kręgi na wzgórzach, zakazane tomy z biblioteki Miskatonic oraz reakcję zwierząt na obecność Mitów (ujadanie psów, niepokój bydła).

---

### Rozdział 3: Tworzenie Badaczy (s. 37-57)
- **Zawartość podręcznika:**
  - Cechy główne: Siła (STR), Kondycja (CON), Budowa Ciała (SIZ), Zręczność (DEX), Wygląd (APP), Inteligencja (INT), Moc (POW), Wykształcenie (EDU).
  - Trzy oficjalne metody kreacji:
    1. *Standardowa*: rzuty 3K6×5 i (2K6+6)×5.
    2. *Alternatywna (Pula Punktowa)*: 460 punktów do podziału na cechy (min. 15, max. 90).
    3. *Szybka (Quick-Fire)*: zestaw stałych wartości (80, 70, 60, 60, 50, 50, 50, 40).
  - Wzory cech pochodnych:
    - Punkty Wytrzymałości: $PW = \lfloor(CON + SIZ) / 10\rfloor$
    - Punkty Magii: $PM = \lfloor POW / 5\rfloor$
    - Poczytalność: $POC = POW$
    - Tempo Ruchu (MOV): porównanie DEX, STR i SIZ z uwzględnieniem redukcji za wiek (-1 za każdą dekadę od 40. roku życia).
    - Modyfikator Obrażeń i Budowa: tabela sumy STR + SIZ.
  - Wpływ wieku: modyfikatory cech fizycznych, testy rozwoju EDU oraz rzuty na Szczęście dla młodych Badaczy (15-19 lat).
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/character/derived-stats.ts`
  - `_tester/_base/.silnik/src/lib/data/character/stats.ts`
  - `_tester/_base/.silnik/src/lib/data/character/tables.ts`
  - `_tester/_base/.silnik/src/lib/random-character-generator.ts`
  - `_tester/_base/.silnik/src/components/ui/character-wizard.tsx`
- **Ocena stanu obecnego:**
  - Wzory w `derived-stats.ts` są w 100% poprawne matematycznie względem RAW.
  - **Luka w UI kreatora:** Kreator postaci w aplikacji wspiera wyłącznie losowanie rzutami kości. Brakuje wyboru metody *Puli Punktowej (460 pkt)* oraz *Quick-Fire*, które stanowią oficjalne reguły CoC 7e RAW dla graczy preferujących zbalansowane postacie.
  - **Błąd w `random-character-generator.ts`:** Generator losowy nie uwzględnia poprawnie modyfikatorów wieku dla cech fizycznych i EDU.

---

### Rozdział 4: Zawody (s. 59-87)
- **Zawartość podręcznika:** Pełny katalog 112 wpisów profesjonalnych z formułami punktów umiejętności zawodowych, widełkami Majętności, sugerowanymi kontaktami oraz listami 8 umiejętności.
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/data/character/occupations.ts`
  - `_tester/_base/.silnik/src/lib/character/occupation-points.ts`
  - `_tester/_base/.silnik/src/lib/enhanced-character-templates.ts`
- **Ocena stanu obecnego:**
  - **Krytyczny brak zasobów:** Obecnie w `occupations.ts` istnieje tylko 29 zawodów.
  - Brakuje aż 83 oficjalnych zawodów CoC 7e (szczegółowa tabela w Sekcji 3).
  - Wiele zawodów z obecnej listy ma uproszczone pule umiejętności, które nie odzwierciedlają wariantowości opisanej w podręczniku (np. wybór między dwiema cechami w formule punktów zawodowych).

---

### Rozdział 5: Umiejętności (s. 89-115)
- **Zawartość podręcznika:**
  - Pełny spis umiejętności ze stałymi wartościami początkowymi.
  - Reguły forsowania rzutów (przykłady uzasadnień i konsekwencji porażki).
  - Zasady łączenia testów (rzut na dwie umiejętności równocześnie).
  - Standardy życia (Majętność 0 do 99): wyznaczenie dziennego poziomu wydatków bez żmudnego księgowania drobiazgów.
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/data/character/skills.ts`
  - `_tester/_base/.silnik/src/lib/economy/credit-rating.ts`
  - `_tester/_base/.silnik/src/lib/data/character/tables.ts`
  - `_tester/_base/.silnik/src/lib/skill-test-resolver.ts`
- **Ocena stanu obecnego:**
  - W `skills.ts` brakuje: *Obsługi Ciężkiego Sprzętu*, *Zręcznych Palców*, *Mitów Cthulhu*.
  - Istnieje błąd pisowni: `Occultyzm: 5` zamiast `Okultyzm: 5`.
  - W `tables.ts` i `credit-rating.ts` występuje rozbieżność danych majątkowych (tabela w `tables.ts` ignoruje oficjalne mnożniki i podaje sztywne kwoty).
  - Brak implementacji mechaniki forsowania rzutu w oknie czatu/dialogu rzutu (`DiceDialog.tsx`) jako ustrukturyzowanej akcji z konsekwencjami narracyjnymi.

---

### Rozdział 6: Stowarzyszenia Badaczy (s. 117-139)
- **Zawartość podręcznika:**
  - 9 gotowych organizacji i mecenasów spajających drużynę:
    1. *Czyściciele* (weterani I WŚ)
    2. *Cyrk Osobliwości Cecila Wratha* (artyści i dziwadła cyrkowe)
    3. *Tygodnik „Ciekawe Wieści”* (dziennikarze i badacze)
    4. *Rewir 13. Południowy* (policjanci z Nowego Jorku)
    5. *SPWiP / Jednostki Badawcze PFU* (korporacja naukowa, czasy współczesne)
    6. *Novem Angelus* (tajemniczy filantropi i arystokraci)
    7. *Dziatwa Ratched* (byli pacjenci szpitali psychiatrycznych)
    8. *Poszukiwacze* (tajny krąg okultystyczny)
    9. *Stowarzyszenie Eksploracji Niewyjaśnionego* (londyńskie towarzystwo dżentelmenów)
  - Przykładowe karty postaci pre-definiowanych (Pierre LeBlanc, Duane Haven itp.).
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/adventures-data.ts`
  - `_tester/_base/.silnik/src/lib/prompts/session-zero-instructions.ts`
  - `_tester/_base/.silnik/src/lib/hot-seat/`
- **Ocena stanu obecnego:**
  - W aplikacji brak jest jakiejkolwiek wzmianki o Stowarzyszeniach Badaczy. W kreatorze przygód i postaci gracz jest zawsze traktowany jako wolny strzelec bez powiązań organizacyjnych.
- **Rekomendacje:**
  - Wprowadzić pole `investigatorSociety` do szablonu kampanii i kreatora postaci, co pozwoli promptowi MG odwoływać się do mecenasa, bazy wypadowej i zleceniodawcy.

---

### Rozdział 7: Życie Badacza w praktyce (s. 141-153)
- **Zawartość podręcznika:**
  - 5-etapowy proces śledczy: 1) Zebranie informacji, 2) Wywiady/obserwacja, 3) Motyw, 4) Plan, 5) Realizacja.
  - Archiwa miejskie, księgi parafialne, kataster, prasa lokalna, nekrologi, wywiady środowiskowe.
  - Inwigilacja i jej technologiczne ograniczenia wobec Mitów (aparaty fotograficzne i kamery rzadko rejestrują anomalie poprawnie).
  - Taktyka ucieczki i odwrotu ("Chyże stopy") - zasada, że ucieczka to sukces taktyczny, a nie tchórzostwo.
  - Diagramy porównawcze rozmiarów potworów (od człowieka BC 50 po Cthulhu BC 1050).
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts`
  - `_tester/_base/.silnik/src/lib/journal/`
  - `_tester/_base/.silnik/src/lib/investigation-board/`
- **Ocena stanu obecnego:**
  - Prompt MG posiada tagi `[DZIENNIK:trop]`, lecz brakuje mu wiedzy proceduralnej na temat kwerendy w archiwach (kataster, księgi hipoteczne, mikrofilmy) oraz realistycznych przeszkód biurokratycznych z lat 20.

---

### Rozdział 8: Szalone lata 20. XX wieku (s. 155-203)
- **Zawartość podręcznika:**
  - Szczegółowa chronologia dekady 1919-1930.
  - Realia prohibicji (Volstead Act, speakeasies, spekulanci).
  - 45 biografii wybitnych postaci historycznych epoki (Hemingway, Houdini, Lovecraft, Capone, Ford, Tesla, Crowley, Eliot Ness itp.).
  - Kompendium muzeów i bibliotek (Biblioteka Kongresu, Smithsonian, Harvard, American Museum of Natural History, British Museum, Bibliothèque Nationale, Biblioteka Watykańska).
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/era-presets.ts`
  - `_tester/_base/.silnik/src/lib/location-era-validator.ts`
  - `_tester/_base/.silnik/src/lib/vector-db/`
- **Ocena stanu obecnego:**
  - W `era-presets.ts` znajduje się ogólny opis epoki `1920s`, ale brakuje wstrzykiwania do RAG bazy wiedzy o autentycznych instytucjach naukowych i postaciach historycznych, przez co MG może halucynować nieistniejące biblioteki lub anachronizmy.

---

### Rozdział 9: Polska w latach 20. XX wieku (s. 205-219)
- **Zawartość podręcznika:**
  - Gospodarka i rynek pracy II RP: zarobki robotników (90-120 zł), urzędników (150-180 zł), ministrów (do 3000 zł). Reforma Władysława Grabskiego (1924 r.) i wprowadzenie polskiego złotego (1 zł = 100 groszy).
  - Tabela Majętności w złotych (II RP) oraz Współcześnie (PLN).
  - Tabela 100 polskich imion męskich, 100 żeńskich i 100 nazwisk z epoki.
  - Życie codzienne: analfabetyzm, matura ("abitura"), tramwaje, kolej, dorożki, abonamenty telefoniczne (75 połączeń/mies.).
  - Prawo i broń: restrykcyjny dekret z 25 stycznia 1919 r., uznaniowe pozwolenia Starosty Powiatowego, zakaz noszenia broni w pasie granicznym (20 km). Broń zaborcza i polska: Nagant wz. 1895, P08 Parabellum, Browning FN1905, Browning M1910, Colt M1911, karabinek wz. 29, Vis wz. 35, karabin ppanc wz. 35 Ur, pm Mors. Ceny w złotych.
  - Tło społeczne: epidemia hiszpanki, zamach majowy (1926 r.), sanacja, seanse spirytystyczne i satanizm Czesława Czyńskiego.
  - Słowniczek mowy międzywojennej: *ancug*, *akuratny*, *anawa!*, *bana*, *barachło*, *belfer*, *budrys*, *browning*, *cierpiarz*, *chłopka*, *cymes*, *ćma*, *dolina*, *doliniarz*, *drynda*, *fagas*, *fomka*, *geszeft*, *hauba*, *juchcić*, *kibitka* itd.
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/economy/credit-rating.ts`
  - `_tester/_base/.silnik/src/lib/era-presets.ts`
  - `_tester/_base/.silnik/src/lib/equipment-catalog.ts`
  - `_tester/_base/.silnik/src/lib/random-character-generator.ts`
  - `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts`
- **Ocena stanu obecnego:**
  - **Brak integracji polskich realiów:** Aplikacja posiada kilka scenariuszy osadzonych w Polsce (m.in. *Cień nad Prabutami*, *Tajemnica Dzieci z Traszyna*), jednak silnik finansowy nie obsługuje złotych, generator imion nie posiada bazy z s. 208, w katalogu ekwipunku brak polskich broni z s. 214-216, a prompt MG nie używa słowniczka epoki.

---

### Rozdział 10: Porady dla graczy (s. 221-235)
- **Zawartość podręcznika:**
  - Porady taktyczne: jak unikać impasów, rola notatek i dziennika, współpraca zespołowa.
  - Zarządzanie Poczytalnością: punkty oparcia psychicznego (Kluczowe osoby, Znaczące miejsca, Cenne przedmioty), unikanie niepotrzebnych konfrontacji, rola odpoczynku.
  - Mechanika Szczęścia: strategiczne wydawanie punktów Szczęścia vs zachowanie puli na rzuty obronne grupy.
  - Świadome forsowanie rzutów (ocena ryzyka katastrofalnych konsekwencji).
  - Walka jako ostateczność (śmiertelność broni palnej w CoC 7e).
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts`
  - `_tester/_base/.silnik/src/components/chat/`
  - `_tester/_base/.silnik/src/lib/pacing-controller.ts`
- **Ocena stanu obecnego:**
  - Aplikacja posiada mechanizm śledzenia więzi na Karcie Postaci, lecz prompt MG rzadko wplata te więzi w mechanizm odzyskiwania lub obrony Poczytalności.

---

### Rozdział 11: Odniesienia i tabele (s. 237-267)
- **Zawartość podręcznika:**
  - Zestawienie cen i kosztów życia: lata 20. XX w. vs Współczesność (odzież, transport, noclegi, żywność, usługi).
  - Prędkości i odległości środków transportu (pociągi 55 km/h, parowce 35 km/h, samoloty 150 km/h).
  - Kompletna tabela broni CoC 7e:
    - Broń biała (obrażenia, zasięg, ataki na rundę, zawodność).
    - Broń krótka (.22, .25, .32, .38, 9mm, .45 ACP, .357, .44).
    - Strzelby i karabiny (12G, 16G, 20G, .30-06, .303, Mauser).
    - Broń maszynowa (Thompson M1921/1928, BAR M1918, MP 18/28, Vickers).
    - Materiały wybuchowe (dynamit, trotyl, granaty, koktajle Mołotowa).
  - Konwersja statystyk z wydań 1e-6e do 7e.
- **Powiązane moduły w kodzie:**
  - `_tester/_base/.silnik/src/lib/equipment-catalog.ts`
  - `_tester/_base/.silnik/src/lib/equipment-data.ts`
  - `_tester/_base/.silnik/src/lib/combat/`
- **Ocena stanu obecnego:**
  - Katalog w `equipment-catalog.ts` posiada 134 przedmioty, lecz wiele broni palnych ma uproszczone parametry (brak progów zawodności / *malfunction*, brak rozróżnienia na strzały pojedyncze i serie, brak cen czarnorynkowych).

---

## 3. Zestawienie brakujących zawodów (Rozdział 4 vs Kod)

W poniższej tabeli zestawiono wszystkie oficjalne profesje z *Podręcznika Badacza 7ed* (s. 60-87) wraz z ich statusem w kodzie silnika (`occupations.ts`):

| Lp. | Zawód w Podręczniku Badacza | Formuła punktów zawodowych | Majętność (RAW) | Status w `occupations.ts` | Sugerowana akcja |
|:---|:---|:---|:---|:---:|:---|
| 1 | **Agent federalny** | WYK × 4 | 20-40 | [BRAK] | Dodać do `occupations.ts` |
| 2 | **Akrobata** | WYK × 2 + ZR × 2 | 9-20 | [BRAK] | Dodać do `occupations.ts` |
| 3 | **Aktor** | WYK × 2 + APP × 2 | 9-40 (9-90) | [BRAK] | Dodać do `occupations.ts` |
| 4 | **Alienista [klasyczny]** | WYK × 4 | 10-60 | [BRAK] | Dodać do `occupations.ts` |
| 5 | **Antykwariusz [lovecraftowski]** | WYK × 4 | 30-70 |  Jest | Zaktualizowany |
| 6 | **Archeolog [lovecraftowski]** | WYK × 4 | 10-40 | [BRAK] | Dodać do `occupations.ts` |
| 7 | **Architekt** | WYK × 4 | 30-70 | [BRAK] | Dodać do `occupations.ts` |
| 8 | **Artysta** | WYK × 2 + (MOC × 2 lub ZR × 2) | 9-50 |  Jest | Zgodny |
| 9 | **Artysta estradowy** | WYK × 2 + APP × 2 | 9-70 |  Jest | Uzupełnić formułę |
| 10 | **Barman** | WYK × 2 + APP × 2 | 8-25 | [BRAK] | Dodać do `occupations.ts` |
| 11 | **Bibliotekarz [lovecraftowski]** | WYK × 4 | 9-35 |  Jest | Zaktualizować zakres MAJ |
| 12 | **Bogaty hobbysta [lovecraftowski]**| WYK × 2 + APP × 2 (lub ZR × 2) | 50-99 | [BRAK] | Zintegrować z diletantem |
| 13 | **Bokser / Zapaśnik** | WYK × 2 + S × 2 | 9-60 | [BRAK] | Dodać do `occupations.ts` |
| 14 | **Człowiek plemienny** | WYK × 2 + (ZR × 2 lub S × 2) | 0-15 |  Jest | Nazwany `tribe_member` |
| 15 | **Deprogramator [współczesny]** | WYK × 4 | 20-50 | [BRAK] | Dodać jako opcję współczesną |
| 16 | **Detektyw agencji** | WYK × 2 + (ZR × 2 lub S × 2) | 20-45 | [BRAK] | Dodać do `occupations.ts` |
| 17 | **Detektyw policyjny** | WYK × 2 + (ZR × 2 lub S × 2) | 20-50 |  Jest | Zgodny |
| 18 | **Duchowny** | WYK × 4 | 9-60 |  Jest | Zgodny |
| 19 | **Działacz związkowy** | WYK × 4 | 5-30 | [BRAK] | Dodać do `occupations.ts` |
| 20 | **Dziennikarz [lovecraftowski]** | WYK × 4 | 9-30 |  Jest | Zgodny |
| 21 | **Dżentelmen / Dama** | WYK × 2 + APP × 2 | 40-90 | [BRAK] | Dodać do `occupations.ts` |
| 22 | **Fanatyk** | WYK × 2 + (APP × 2 lub MOC × 2) | 0-30 | [BRAK] | Dodać do `occupations.ts` |
| 23 | **Farmaceuta** | WYK × 4 | 35-75 | [BRAK] | Dodać do `occupations.ts` |
| 24 | **Farmer** | WYK × 2 + (ZR × 2 lub S × 2) | 9-30 |  Jest | Zgodny |
| 25 | **Fotograf / Fotoreporter** | WYK × 4 | 9-30 | [BRAK] | Dodać do `occupations.ts` |
| 26 | **Funkcjonariusz publiczny** | WYK × 2 + APP × 2 | 50-90 | [BRAK] | Dodać do `occupations.ts` |
| 27 | **Gangster** | WYK × 2 + (ZR × 2 lub S × 2) | 20-80 | [BRAK] | Dodać do `occupations.ts` |
| 28 | **Handlarz antykami** | WYK × 4 | 30-70 | [BRAK] | Odmiana Antykwariusza |
| 29 | **Hazardzista** | WYK × 2 + (APP × 2 lub ZR × 2) | 8-60 | [BRAK] | Dodać do `occupations.ts` |
| 30 | **Inżynier** | WYK × 4 | 30-70 |  Jest | Zgodny |
| 31 | **Kamerdyner / Lokaj** | WYK × 4 | 9-20 | [BRAK] | Dodać do `occupations.ts` |
| 32 | **Kaskader** | WYK × 2 + (ZR × 2 lub S × 2) | 10-40 | [BRAK] | Dodać do `occupations.ts` |
| 33 | **Kelner** | WYK × 2 + (APP × 2 lub ZR × 2) | 5-20 | [BRAK] | Dodać do `occupations.ts` |
| 34 | **Kierowca / Taksówkarz** | WYK × 2 + ZR × 2 | 9-30 | [BRAK] | Dodać do `occupations.ts` |
| 35 | **Komiwojażer** | WYK × 2 + APP × 2 | 9-40 | [BRAK] | Dodać do `occupations.ts` |
| 36 | **Korespondent zagraniczny** | WYK × 4 | 10-40 | [BRAK] | Dodać do `occupations.ts` |
| 37 | **Kowboj** | WYK × 2 + (ZR × 2 lub S × 2) | 9-20 | [BRAK] | Dodać do `occupations.ts` |
| 38 | **Księgarz** | WYK × 4 | 20-40 | [BRAK] | Dodać do `occupations.ts` |
| 39 | **Księgowy** | WYK × 4 | 30-70 | [BRAK] | Dodać do `occupations.ts` |
| 40 | **Kustosz** | WYK × 4 | 10-30 | [BRAK] | Dodać do `occupations.ts` |
| 41 | **Laborant** | WYK × 4 | 10-30 | [BRAK] | Dodać do `occupations.ts` |
| 42 | **Lekarz [lovecraftowski]** | WYK × 4 | 30-80 |  Jest | Zgodny |
| 43 | **Lekarz medycyny sądowej** | WYK × 4 | 30-60 | [BRAK] | Dodać do `occupations.ts` |
| 44 | **Łowca grubego zwierza** | WYK × 2 + (ZR × 2 lub S × 2) | 20-50 | [BRAK] | Dodać do `occupations.ts` |
| 45 | **Łowca nagród** | WYK × 2 + (ZR × 2 lub S × 2) | 9-30 | [BRAK] | Dodać do `occupations.ts` |
| 46 | **Marynarz** | WYK × 2 + (ZR × 2 lub S × 2) | 9-30 |  Jest | Zgodny |
| 47 | **Mechanik** | WYK × 4 | 9-40 | [BRAK] | Dodać do `occupations.ts` |
| 48 | **Misjonarz** | WYK × 4 | 0-10 | [BRAK] | Dodać do `occupations.ts` |
| 49 | **Muzyk** | WYK × 2 + (APP × 2 lub ZR × 2) | 9-30 | [BRAK] | Dodać do `occupations.ts` |
| 50 | **Naukowiec** | WYK × 4 | 9-50 |  Jest | Zgodny |
| 51 | **Nurek** | WYK × 2 + ZR × 2 | 9-30 | [BRAK] | Dodać do `occupations.ts` |
| 52 | **Odkrywca [klasyczny]** | WYK × 2 + (APP × 2 lub S × 2) | 0-45 | [BRAK] | Dodać do `occupations.ts` |
| 53 | **Oficer wojskowy** | WYK × 2 + (ZR × 2 lub S × 2) | 20-70 | [BRAK] | Zintegrowany z `military` |
| 54 | **Okultysta [lovecraftowski]** | WYK × 4 | 9-65 | [BRAK] | Dodać do `occupations.ts` |
| 55 | **Opiekun zwierząt w zoo** | WYK × 2 + (ZR × 2 lub S × 2) | 9-20 | [BRAK] | Dodać do `occupations.ts` |
| 56 | **Parapsycholog** | WYK × 4 | 9-40 |  Jest | Zgodny |
| 57 | **Pielęgniarka / Pielęgniarz** | WYK × 4 | 9-30 |  Jest | Zgodny |
| 58 | **Pilot** | WYK × 2 + ZR × 2 | 20-70 |  Jest | Zgodny |
| 59 | **Pisarz [lovecraftowski]** | WYK × 4 | 9-30 |  Jest | W kodzie jako `author` |
| 60 | **Poszukiwacz** | WYK × 2 + (ZR × 2 lub S × 2) | 0-10 | [BRAK] | Dodać do `occupations.ts` |
| 61 | **Pracownik fizyczny** | WYK × 2 + (ZR × 2 lub S × 2) | 5-30 | [BRAK] | Dodać do `occupations.ts` |
| 62 | **Pracownik naukowy** | WYK × 4 | 10-30 | [BRAK] | Dodać do `occupations.ts` |
| 63 | **Pracownik umysłowy** | WYK × 4 | 9-20 | [BRAK] | Dodać do `occupations.ts` |
| 64 | **Prawnik** | WYK × 4 | 30-80 |  Jest | Zgodny |
| 65 | **Profesor [lovecraftowski]** | WYK × 4 | 20-70 |  Jest | Zgodny |
| 66 | **Programista / Haker [współcz.]** | WYK × 4 | 10-70 |  Jest | W kodzie jako `hacker` |
| 67 | **Projektant** | WYK × 4 | 20-60 | [BRAK] | Dodać do `occupations.ts` |
| 68 | **Prostytutka** | WYK × 2 + APP × 2 | 5-50 | [BRAK] | Dodać do `occupations.ts` |
| 69 | **Prywatny detektyw** | WYK × 2 + (ZR × 2 lub S × 2) | 9-30 |  Jest | Zgodny |
| 70 | **Przedsiębiorca pogrzebowy** | WYK × 4 | 10-40 | [BRAK] | Dodać do `occupations.ts` |
| 71 | **Przestępca** | WYK × 2 + (APP × 2 lub ZR × 2) | 5-65 |  Jest | Zgodny |
| 72 | **Przywódca kultu** | WYK × 2 + APP × 2 | 30-60 | [BRAK] | Dodać do `occupations.ts` |
| 73 | **Psychiatra** | WYK × 4 | 30-80 | [BRAK] | Dodać do `occupations.ts` |
| 74 | **Psycholog / Psychoanalityk**| WYK × 4 | 10-40 | [BRAK] | Dodać do `occupations.ts` |
| 75 | **Redaktor** | WYK × 4 | 10-30 | [BRAK] | Dodać do `occupations.ts` |
| 76 | **Rękodzielnik** | WYK × 2 + ZR × 2 | 10-40 | [BRAK] | Dodać do `occupations.ts` |
| 77 | **Salowy** | WYK × 2 + (ZR × 2 lub S × 2) | 6-15 | [BRAK] | Dodać do `occupations.ts` |
| 78 | **Sanitariusz psychiatryczny** | WYK × 2 + S × 2 | 6-15 | [BRAK] | Dodać do `occupations.ts` |
| 79 | **Sekretarz / Sekretarka** | WYK × 2 + APP × 2 | 9-30 | [BRAK] | Dodać do `occupations.ts` |
| 80 | **Sędzia** | WYK × 4 | 50-90 | [BRAK] | Dodać do `occupations.ts` |
| 81 | **Sklepikarz** | WYK × 2 + (APP × 2 lub ZR × 2) | 20-40 | [BRAK] | Dodać do `occupations.ts` |
| 82 | **Sportowiec** | WYK × 2 + (ZR × 2 lub S × 2) | 9-70 |  Jest | W kodzie jako `athlete` |
| 83 | **Strażak** | WYK × 2 + (ZR × 2 lub S × 2) | 9-30 | [BRAK] | Dodać do `occupations.ts` |
| 84 | **Student / Stażysta** | WYK × 4 | 5-10 | [BRAK] | Dodać do `occupations.ts` |
| 85 | **Szpieg** | WYK × 2 + (APP × 2 lub ZR × 2) | 20-60 |  Jest | Zgodny |
| 86 | **Tramp** | WYK × 2 + (ZR × 2 lub APP × 2) | 0-5 | [BRAK] | Dodać do `occupations.ts` |
| 87 | **Traper** | WYK × 2 + (ZR × 2 lub S × 2) | 0-20 | [BRAK] | Dodać do `occupations.ts` |
| 88 | **Treser** | WYK × 2 + (APP × 2 lub MOC × 2) | 10-40 | [BRAK] | Dodać do `occupations.ts` |
| 89 | **Włóczęga** | WYK × 2 + (APP × 2 lub ZR × 2) | 0-5 |  Jest | W kodzie jako `drifter` |
| 90 | **Wspinacz wysokogórski** | WYK × 2 + (ZR × 2 lub S × 2) | 30-60 | [BRAK] | Dodać do `occupations.ts` |
| 91 | **Żołnierz** | WYK × 2 + (ZR × 2 lub S × 2) | 9-30 |  Jest | W kodzie jako `soldier` |

---

## 4. Zestawienie brakujących umiejętności i specjalizacji (Rozdział 5)

| Umiejętność (RAW CoC 7e) | Wartość bazowa (%) | Typ / Epoka | Stan w `skills.ts` | Diagnoza i wymagana zmiana |
|:---|:---:|:---:|:---:|:---|
| **Antropologia** | 01% | Standardowa | Jest (1%) | Zgodna |
| **Archeologia** | 01% | Standardowa | Jest (1%) | Zgodna |
| **Broń Artyleryjska** | 01% | Rzadka | [BRAK] | Dodać do listy rzadkich |
| **Broń Ciężka** | 10% | Specjalizacja Broni Palnej | [BRAK] | Wprowadzić specjalizację |
| **Broń Krótka** | 20% | Specjalizacja Broni Palnej | Jest jako ogólna 'Broń Palna' | Rozróżnić na Krótką i Długą |
| **Broń Obuchowa** | 10% | Specjalizacja Walki Wręcz | [BRAK] | Wprowadzić specjalizację |
| **Charakteryzacja** | 05% | Standardowa | Jest jako 'Przebranie' | Ujednolicić z nazwą podręcznikową |
| **Czytanie z Ruchu Warg** | 01% | Rzadka | [BRAK] | Dodać do listy rzadkich |
| **Elektronika** | 01% | Współczesna | [BRAK] | Dodać dla epok > 1950s |
| **Elektryka** | 10% | Standardowa | Jest (10%) | Zgodna |
| **Gadanina** | 05% | Interpersonalna | Jest (5%) | Zgodna |
| **Hipnoza** | 01% | Rzadka | [BRAK] | Dodać do listy rzadkich |
| **Historia** | 05% | Standardowa | Jest (5%) | Zgodna |
| **Jeździectwo** | 05% | Standardowa | Jest (5%) | Zgodna |
| **Język Obcy** | 01% | Specjalizacje per język | Jest (1%) | Zgodna |
| **Język Ojczysty** | = WYK | Standardowa | Jest (= WYK) | Zgodna |
| **Karabin / Strzelba** | 25% | Specjalizacja Broni Palnej | Jest (25%) | Zgodna |
| **Karabin Maszynowy** | 10% | Specjalizacja Broni Palnej | [BRAK] | Wprowadzić specjalizację |
| **Korzystanie z Bibliotek** | 20% | Standardowa | Jest jako 'Biblioteka' | Zmienić na pełną nazwę RAW |
| **Korzystanie z Komputerów** | 05% | Współczesna | Jest jako 'Komputery' | Zmienić na pełną nazwę RAW |
| **Księgowość** | 05% | Standardowa | Jest (5%) | Zgodna |
| **Łuk** | 15% | Specjalizacja Broni Palnej | [BRAK] | Wprowadzić specjalizację |
| **Majętność** | 00% | Zasób ekonomiczny | Jest (0%) | Zgodna |
| **Materiały Wybuchowe** | 01% | Rzadka | [BRAK] | Dodać do listy rzadkich |
| **Mechanika** | 10% | Standardowa | Jest (10%) | Zgodna |
| **Medycyna** | 01% | Standardowa | Jest (1%) | Zgodna |
| **Miotacz Ognia** | 10% | Specjalizacja Broni Palnej | [BRAK] | Wprowadzić specjalizację |
| **Mity Cthulhu** | 00% | Zakazana / Odkrywana | [BRAK] w bazie | Dodać z bazą 0% i blokadą kreacji |
| **Nasłuchiwanie** | 20% | Standardowa | Jest (20%) | Zgodna |
| **Nauka (różne)** | 01% (Mat. 10%) | Specjalizacje naukowe | Jest ogólna | Dodać podkategorie (Biologia, Chemia, Fizyka) |
| **Nawigacja** | 10% | Standardowa | Jest jako 'Orientacja' | Zmienić na kanoniczną nazwę 'Nawigacja' |
| **Nurkowanie** | 01% | Rzadka | [BRAK] | Dodać do listy rzadkich |
| **Obsługa Ciężkiego Sprzętu** | 01% | Standardowa | [BRAK] | **Krytyczny brak** - dodać natychmiast |
| **Okultyzm** | 05% | Standardowa | W kodzie: `Occultyzm` | **Naprawić literówkę** |
| **Perswazja** | 10% | Interpersonalna | Jest (10%) | Zgodna |
| **Pierwsza Pomoc** | 30% | Standardowa | Jest (30%) | Zgodna |
| **Pilotowanie (różne)** | 01% | Specjalizacje (samolot/łódź)| Jest (1%) | Zgodna |
| **Pistolet Maszynowy** | 15% | Specjalizacja Broni Palnej | [BRAK] | Wprowadzić specjalizację |
| **Pływanie** | 20% | Standardowa | Jest (20%) | Zgodna |
| **Prawo** | 05% | Standardowa | Jest (5%) | Zgodna |
| **Prowadzenie Samochodu** | 20% | Standardowa | Jest (20%) | Zgodna |
| **Psychoanaliza** | 01% | Standardowa | [BRAK] | **Krytyczny brak dla Alienisty** |
| **Psychologia** | 10% | Standardowa | Jest (10%) | Zgodna |
| **Rzucanie** | 20% | Standardowa | Jest (20%) | Zgodna |
| **Skakanie** | 20% | Standardowa | Jest jako 'Skok' | Zmienić na formę rzeczownikową 'Skakanie' |
| **Spostrzegawczość** | 25% | Standardowa | Jest (25%) | Zgodna |
| **Sztuka Przetrwania** | 10% | Specjalizacje (dzicz/arktyka)| Jest jako 'Przetrwanie'| Ujednolicić z podręcznikiem |
| **Sztuka / Rzemiosło** | 05% | Specjalizacje | Jest (5%) | Zgodna |
| **Ślusarstwo** | 01% | Standardowa | Jest (1%) | Zgodna |
| **Tresura Zwierząt** | 05% | Rzadka | [BRAK] | Dodać do listy rzadkich |
| **Tropienie** | 10% | Standardowa | Jest (10%) | Zgodna |
| **Ukrywanie** | 20% | Standardowa | Jest (20%) | Zgodna |
| **Unik** | = 1/2 ZR | Bojowa / Dynamiczna | Jest (= 1/2 ZR) | Zgodna |
| **Urok Osobisty** | 15% | Interpersonalna | Jest (15%) | Zgodna |
| **Walka Wręcz (Bijatyka)** | 25% | Bojowa podstawowa | Jest ogólna | Rozdzielić na Bijatykę i spec. białe |
| **Wiedza o Naturze** | 10% | Standardowa | [BRAK] | Dodać do listy umiejętności |
| **Wiedza Tajemna** | 01% | Rzadka | [BRAK] | Dodać do listy rzadkich |
| **Wspinaczka** | 20% | Standardowa | Jest (20%) | Zgodna |
| **Wycena** | 05% | Standardowa | Jest (5%) | Zgodna |
| **Zastraszanie** | 15% | Interpersonalna | Jest (15%) | Zgodna |
| **Zręczne Palce** | 10% | Standardowa | [BRAK] | **Krytyczny brak** - dodać natychmiast |

---

## 5. Zestawienie ekwipunku i uzbrojenia

### A. Broń historyczna II Rzeczypospolitej (Rozdział 9, s. 214-216)
W katalogu `equipment-catalog.ts` brakuje dedykowanego oręża polskiego dwudziestolecia międzywojennego:

1. **Browning FN1905 (6,35 mm / .25 ACP):**
   - *Cena:* 120 zł (dostępny bez pozwolenia w zaborze pruskim, powszechny w półświatku).
   - *Obrażenia:* 1K6, *Zawodność:* 98, *Magazynek:* 6, *Zasięg:* 15 m.
2. **Rewolwer Nagant wz. 1895 (7,62 mm Nagant):**
   - *Cena:* 80 zł (uzbrojenie Policji Państwowej, KOP, Straży Granicznej).
   - *Obrażenia:* 1K8, *Zawodność:* 100, *Bęben:* 7, *Zasięg:* 15 m.
3. **Pistolet P08 Parabellum (Luger 9 mm):**
   - *Cena:* 200-250 zł (bardzo ceniona broń poniemiecka).
   - *Obrażenia:* 1K10, *Zawodność:* 99, *Magazynek:* 8, *Zasięg:* 15 m.
4. **Browning M1910 (7,65 mm lub 9 mm krótki):**
   - *Cena:* 150 zł (standard oficerów WP i wyższych urzędników).
   - *Obrażenia:* 1K8 / 1K10, *Zawodność:* 99, *Magazynek:* 7, *Zasięg:* 15 m.
5. **Karabinek wz. 29 / Karabin wz. 98 (7,92 mm Mauser):**
   - *Cena:* 250 zł (podstawowy karabin Wojska Polskiego z Fabryki Broni w Radomiu).
   - *Obrażenia:* 2K6+4, *Zawodność:* 100, *Magazynek:* 5, *Zasięg:* 100 m.
6. **Karabin przeciwpancerny wz. 35 Ur (7,92 mm DS):**
   - *Cena:* 2000 zł (ściśle tajna broń przeciwpancerna, waga ponad 10 kg).
   - *Obrażenia:* 2K10+4 / przebicie pancerza lekkiego, *Zawodność:* 99, *Magazynek:* 4, *Zasięg:* 150 m.
7. **Pistolet maszynowy Mors wz. 39 (9 mm Parabellum):**
   - *Cena:* Broń prototypowa wojskowa (brak na wolnym rynku).
   - *Obrażenia:* 1K10, *Zawodność:* 96, *Magazynek:* 24, *Tryb:* Ogień ciągły.

### B. Standardowe wyposażenie podróżne i polowe (Rozdział 11, s. 251-258)
Do `equipment-catalog.ts` należy dopisać brakujące pozycje ze stawkami dla lat 20. ($) i II RP (zł):
- *Ubiór elegancki:* Garnitur z wełny czesankowej ($17.95 / 150-1000 zł), Płaszcz Chesterfield ($19.95 / 200 zł).
- *Sprzęt badawczy:* Aparat fotograficzny skrzynkowy ($3.50 / 50 zł), Lornetka pryzmatyczna ($22.50 / 120 zł), Maszyna do pisania Corona ($50.00 / 350 zł), Notes śledczy w skórzanej oprawie ($0.50 / 2 zł).
- *Transport:* Bilet tramwajowy (5 centów / 30 groszy), Kurs taksówką w mieście ($0.50-$1.50 / 3-5 zł), Bilet na parowiec transatlantycki w klasie turystycznej ($120 / 700 zł).

---

## 6. Zestawienie mechanik ekonomicznych i Standardów Życia

Zgodnie z Rozdziałem 5 (s. 96-97) oraz Rozdziałem 9 (s. 206-207) Podręcznika Badacza, majątek Badacza podlega następującym ścisłym formułom (RAW):

### Tabela 1: Klasyczne Lata 20. USA (USD $)
| Próg Majętności | Poziom życia | Gotówka pod ręką | Dobytek i aktywa | Dzienny limit wydatków (bez liczenia) | Warunki mieszkaniowe i transport |
|:---:|:---|:---|:---|:---:|:---|
| **0** | **Nędzarz (Penniless)** | 0.50 $ | Brak | 0.50 $ | Życie na ulicy / w przytułku; pieszo, autostop, na gapę pociągiem. |
| **1-9** | **Biedny (Poor)** | MAJ × 1 (1-9 $) | MAJ × 10 (10-90 $) | 2 $ | Najtańszy wynajmowany pokój/podły motel; najtańszy transport publiczny. |
| **10-49** | **Przeciętny (Average)** | MAJ × 2 (20-98 $) | MAJ × 50 (500-2450 $) | 10 $ | Przeciętny dom/mieszkanie; pociągi 2. klasy, tani automobil (Ford T). |
| **50-89** | **Zamożny (Wealthy)** | MAJ × 5 (250-445 $) | MAJ × 500 (25k-44.5k $) | 50 $ | Duża rezydencja ze służbą, dom letni; 1. klasa pociąg/statek, drogi automobil. |
| **90-98** | **Bogaty (Rich)** | MAJ × 20 (1.8k-1.96k $) | MAJ × 2000 (180k-196k $) | 250 $ | Luksusowa posiadłość, liczna służba; luksusowe auta, prywatne rejsy, hotele 5-gwiazdkowe. |
| **99** | **Krezus (Superrich)** | 50 000 $ | 5 000 000 $+ | 5 000 $ | Niewyobrażalny majątek (dynastie Rockefellerów, Morganów); finanse bez ograniczeń. |

### Tabela 2: Polska w latach 20. / 30. XX wieku (PLN zł / grosze)
| Próg Majętności | Poziom życia | Gotówka pod ręką | Dobytek i aktywa | Dzienny limit wydatków | Warunki w realiach II RP |
|:---:|:---|:---|:---|:---:|:---|
| **0** | **Ubogi** | 50 groszy | Brak | 50 groszy | Bezdomność, noclegownie, tułaczka po stacjach kolejowych. |
| **1-9** | **Biedny** | MAJ × 1 (1-9 zł) | MAJ × 10 (10-90 zł) | 3 zł | Izba w kamienicy czynszowej na przedmieściu; tramwaj, pieszo. |
| **10-49** | **Przeciętny** | MAJ × 2 (20-98 zł) | MAJ × 50 (500-2450 zł) | 20 zł | Wynajmowane 2-pokojowe mieszkanie, stała posada; dorożki, kolej 2/3 klasy. |
| **50-89** | **Zamożny** | MAJ × 5 (250-445 zł) | MAJ × 500 (25k-44.5k zł) | 30 zł | Kamienica, willa podmiejska (Konstancin/Milanówek), gosposia; auto, dorożka na stałe. |
| **90-98** | **Bogaty** | MAJ × 20 (1.8k-2k zł) | MAJ × 2000 (180k-200k zł) | 100 zł | Pałacyk miejski, majątek ziemski, szofer, kucharz; luksusowy Mercedes/Fiat. |
| **99** | **Krezus** | 10 000 zł | > 1 000 000 zł | 2 000 zł | Magnateria przemysłowa (Łódź, Górny Śląsk), arystokracja rodowa (Radziwiłłowie, Potoccy). |

### Tabela 3: Czasy współczesne (PLN)
| Próg Majętności | Poziom życia | Gotówka pod ręką | Dobytek i aktywa | Dzienny limit wydatków |
|:---:|:---|:---|:---|:---:|
| **0** | **Ubogi** | 10 zł | Brak | 10 zł |
| **1-9** | **Biedny** | MAJ × 20 (20-180 zł) | MAJ × 200 (200-1800 zł) | 30 zł |
| **10-49** | **Przeciętny** | MAJ × 40 (400-1960 zł) | MAJ × 1000 (10k-49k zł) | 150 zł |
| **50-89** | **Zamożny** | MAJ × 100 (5k-8.9k zł) | MAJ × 10 000 (500k-890k zł) | 500 zł |
| **90-98** | **Bogaty** | MAJ × 400 (36k-39.2k zł) | MAJ × 40 000 (3.6M-3.92M zł) | 5 000 zł |
| **99** | **Krezus** | 1 000 000 zł | > 50 000 000 zł | 50 000 zł |

---

## 7. Zestawienie wytycznych dla promptów Mistrza Gry (AI Game Master)

W celu zachowania 100% zgodności z duchem Podręcznika Badacza, protokoły systemowe AI (`gm-protocol.ts`, `session-zero-instructions.ts`, `narrative-style-instructions.ts`) muszą zostać zaktualizowane o następujące żelazne dyrektywy:

### 1. Eliminacja mikrozarządzania finansami (RAW s. 96-97)
- **Instrukcja dla AI:** *"Nigdy nie zmuszaj gracza do odliczania pojedynczych dolarów lub złotych za posiłki, gazety, bilety tramwajowe, nocleg w hotelu o standardzie odpowiadającym jego Majętności czy podstawową amunicję. Jeśli koszt zakupu mieści się w dziennym limicie wydatków (Spending Level), postać po prostu to kupuje bez rzutu i bez potrącania gotówki. Dopiero wydatki przekraczające limit wymagają rzutu na Majętność, naruszenia gotówki podręcznej lub spieniężenia dobytku."*

### 2. Autentyzm realiów II RP (RAW Rozdział 9)
- **Instrukcja dla AI w polskich przygodach:** *"Gdy akcja toczy się w Polsce lat 20. XX w. (II Rzeczpospolita):
  - Walutą jest polski złoty (1 zł = 100 groszy) wprowadzony w 1924 r. (przed kwietniem 1924 r. - marka polska).
  - Posiadanie broni palnej podlega rygorystycznemu dekretowi z 1919 r. i wymaga uznaniowego pozwolenia Starosty Powiatowego; noszenie broni w pasie granicznym (20 km) jest surowo karane przez KOP i Policję.
  - Wykorzystuj autentyczne zwroty dwudziestolecia: garnitur to 'ancug', pistolet to potocznie 'browning', pociąg to 'bana', dorożka to 'drynda', taksówkarz to 'cierpiarz', a nauczyciel to 'belfer'.
  - Oddawaj napięcia epoki: podziały pozaborcze, walkę z analfabetyzmem, echa wojny 1920 r., zamach majowy oraz modę na seanse spirytystyczne w warszawskich kawiarniach."*

### 3. Heurystyka śledcza i szacunek dla badań (RAW Rozdział 7)
- **Instrukcja dla AI:** *"Śledztwo w Zewie Cthulhu to nie dungeon crawl. Badania biblioteczne, analiza mikrofilmów, przeglądanie starych roczników lokalnych gazet, sprawdzanie rejestrów zgonów i katastru w ratuszu to fundamentalne metody odkrywania prawdy. Kiedy gracz deklaruje kwerendę w archiwum, nagródź go konkretnymi, klimatycznymi wycinkami prasowymi lub fragmentami kronik. Zastosuj zasadę Fail-Forward: porażka w teście Korzystania z Bibliotek nie oznacza, że gracz nic nie znalazł - oznacza, że spędził na poszukiwaniach kilkanaście wycieńczających godzin, naruszył kruche woluminy ściągając na siebie gniew bibliotekarza lub natknął się na zniekształcony, niepokojący fragment obniżający Poczytalność."*

### 4. Taktyka odwrotu i rola ucieczki (RAW Rozdział 7 & 10)
- **Instrukcja dla AI:** *"Bezpośrednie starcie z istotami Mitów kończy się śmiercią lub trwałym obłędem. Ucieczka i przygotowany odwrót ('Chyże stopy') są pełnoprawnymi, mądrymi decyzjami taktycznymi. Jeśli gracz postanawia ratować życie i uciekać, nigdy nie karz go arbitralną śmiercią. Przełącz narrację w Bieg 3 (Pościg), nakreśl przeszkody terenowe i daj szansę na bezpieczne zerwanie kontaktu kosztem utraconego sprzętu lub zatartego tropu."*

### 5. Mecenat Stowarzyszeń Badaczy (RAW Rozdział 6)
- **Instrukcja dla AI:** *"Jeśli postać należy do Stowarzyszenia Badaczy (np. Towarzystwa Eksploracji Niewyjaśnionego, Rewiru 13. czy Czyścicieli), organizacja ta stanowi diegetyczne zaplecze: może udostępnić prywatną bibliotekę, opłacić kaucję, dostarczyć specjalistyczny ekwipunek polowy lub skierować do sojuszniczego lekarza/alienisty. Mecenas ma jednak swoje cele i oczekuje regularnych raportów ze śledztwa."*

---

## 8. Plan wdrożenia (Roadmapa naprawcza w backlogu)

W celu systematycznego zamknięcia zidentyfikowanych długów i braków, rekomenduje się podział prac na 4 etapy deweloperskie w GitHub Issues:

1. **Pakiet 1: Baza Danych Zawodów i Umiejętności (PR #1):**
   - Dodanie brakujących 83 zawodów do `occupations.ts` wraz z formułami punktowymi i widełkami Majętności.
   - Uzupełnienie `skills.ts` o brakujące umiejętności (*Obsługa Ciężkiego Sprzętu*, *Zręczne Palce*, *Mity Cthulhu*, *Psychoanaliza*) oraz poprawa literówki `Okultyzm`.
   - Zastąpienie zamakietowanych danych w `random-character-generator.ts` oficjalnymi zasadami CoC 7e.
   - Pełna symetria językowa w `_tester/_base/.silnik/messages/pl.json` i `_tester/_base/.silnik/messages/en.json`.

2. **Pakiet 2: Reformacja Silnika Ekonomicznego (PR #2):**
   - Rozbudowa `credit-rating.ts` o obsługę trzech epok walutowych: 1920s USA ($), 1920s II RP (zł/gr) oraz Współczesność (PLN).
   - Usunięcie sztywnych, fałszywych liczb z `tables.ts` i oparcie obliczeń majątku na czystych funkcjach mnożnikowych RAW.
   - Aktualizacja widoków Karty Postaci pod kątem wyświetlania dziennego Spending Level.

3. **Pakiet 3: Realia Historyczne II RP & Polska Broń (PR #3):**
   - Dodanie presetu `1920s-poland` do `era-presets.ts`.
   - Wprowadzenie bazy 100 polskich imion męskich, 100 żeńskich i 100 nazwisk z s. 208 do generatora postaci.
   - Wzbogacenie `equipment-catalog.ts` o 7 historycznych modeli broni z s. 214-216 (Nagant, Vis, FN1905, Mauser wz.29, Ur wz.35 itp.).

4. **Pakiet 4: Protokół Mistrza Gry i Stowarzyszenia Badaczy (PR #4):**
   - Wstrzyknięcie dyrektyw śledczych i ekonomicznych do `gm-protocol.ts` i `narrative-style-instructions.ts`.
   - Wprowadzenie słowniczka dwudziestolecia do podpowiedzi narracyjnych dla polskich scenariuszy.
   - Integracja 9 szablonów Stowarzyszeń Badaczy z `session-zero-instructions.ts`.
