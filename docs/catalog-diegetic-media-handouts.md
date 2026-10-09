# Diegetyczny Katalog Handoutów Audio i Wideo - Strażnik Tajemnic AI

> **Status:** Zatwierdzony Standard Kanoniczny (SSOT Mediów Diegetycznych)  
> **Data:** 2026-10-08  
> **Zasada nadrzędna:** Rekwizyty Audio i Wideo powstają **wyłącznie** dla nośników fizycznie istniejących i odtwarzanych w świecie gry (taśmy szpulowe ZK-140, kasety Stilon C-60 / mikrokasety, cylindry fonografu Edisona, płyty szelakowe gramofonu, przechwycone transmisje radiowe / alfabet Morse'a, taśmy filmowe, kasety VHS/CRT, aplikacje mobilne AR).  
> **Całkowity zakaz:** Zabrania się tworzenia "audiobooków", audiodeskrypcji i syntetycznych lektorów czytających papierowe listy, pamiętniki, wycinki z gazet czy telegramy.

---

## 1. Wytyczne Inżynierii Dźwięku i Obrazu (Sound & Video Design)

Każde nagranie diegetyczne musi spełniać rygorystyczne kryteria immersji akustycznej epoki:
1. **Zakaz sterylnego lektora:** Żaden plik audio nie może być suchym, laboratoryjnym głosem lektorskim TTS. Każdy głos musi brzmieć z wnętrza pomieszczenia lub urządzenia.
2. **Warstwa nośnika fizycznego (Medium Layer):**
   - **Gramofon / Wałek Edisona:** Trzaski igły, szum wosku/szelaku, ograniczone pasmo częstotliwości (300 Hz - 3 kHz), rezonans mechanicznej tuby.
   - **Taśma szpulowa (np. ZK-140 SB):** Szum przesuwu taśmy magnetycznej, charakterystyczny przydźwięk sieciowy 50 Hz, kliknięcia przełączników klawiszowych, mikrofon węglowy/dynamiczny.
   - **Kaseta magnetofonowa (np. Stilon C-60 / mikrokaseta):** Pisk napędu silniczka kasetowego, nasycenie taśmy żelazowej, kliknięcia stop/play, kompresja dynamiki.
   - **Transmisja radiowa / CB / Krótkofalówka:** Szumy eteru, zaniki fali (fading), trzaski wyładowań atmosferycznych, ton nośnej 1 kHz, pikanie alfabetu Morse'a.
   - **Kaseta VHS / CRT:** Szum nośnej telewizyjnej, pisk transformatora odchylania 15.6 kHz, tracking jitter, zakłócenia głowicy wirującej.
   - **Smartfon / Aplikacja AR:** Nowoczesna kompresja cyfrowa (AAC/Opus), artefakty głośnika telefonu, pogłos otwartej przestrzeni leśnej / miejskiej.
3. **Limity wagowe i formaty:**
   - Audio: format `.mp3`, mono lub narrow stereo, 64-96 kbps, limit wagi **<= 1.5 MB** na nagranie.
   - Wideo: format `.mp4` / `.webm` (H.264 / VP9), krótkie zapętlone sekwencje 5-8 sekund, rozdzielczość 720p/480p, limit wagi **<= 1.5 MB** na klip.

---

## 2. Podsumowanie Inwentaryzacji (Stan Faktyczny)

Zbadano 30+ scenariuszy z oficjalnych wydań Black Monk Games, Chaosium oraz modułów autorskich repozytorium.

| Kategoria | Liczba | Charakterystyka |
|---|:---:|---|
| **A. Oficjalne materiały od wydawcy (Black Monk)** | **1 scenariusz** (4 Audio + 3 Wideo) | *Kwiat paproci AR* - gotowe pliki produkcyjne w archiwum ZIP na dysku. |
| **B. Autentyczna mechanika z podręczników oficjalnych** | **5 scenariuszy** | Rekwizyty, w których autorzy podręcznika wprost przewidzieli nagranie/nośnik jako element zagadki lub klimatu. |
| **C. Dedykowane nośniki w przygodach autorskich** | **8 scenariuszy** | Przygody Strefy 11 (PRL/III RP) oraz American Cold Cases z zaprojektowaną diegezą. |
| **D. Sprawdzone i odrzucone (Brak nośnika / Fake Audio)** | **18 scenariuszy** | Scenariusze papierowo-przedmiotowe, z których wycofano pomysł dodawania lektorów. |

---

## 3. Szczegółowy Rejestr Rekwizytów Diegetycznych

### Grupa A: Oficjalne Multimedia Wydawcy (Black Monk Games)

#### 1. `case-os-03` - Kwiat paproci AR
- **Źródło:** `/Volumes/Karta/Zew - materiały/Zew Cthulhu - podręczniki/Black Monk Games/Kwiat paproci.zip` (`Kwiat_paproci_AR_-pomoce_audio_i_wideo.zip`)
- **Epoka / Rejestr:** Współczesność (Noc Kupały) | Urban Legend / AR Investigation
- **Opis fabularny:** Uczestnicy miejskiej gry terenowej AR "Kwiat Paproci" (stworzonej przez firmę Slavic Games) trafiają na ślad zaginionego gracza FilipsaNo1 oraz opętanej dziewczyny o pseudonimie Krystynator. Antagonista Eliasz wykorzystuje aplikację mobilną i przenośne głośniki do zasilenia rytuału Bramy.
- **Wykaz plików:**
  1. `Audio 1 - dla Badacza.mp3` (1.3 MB) - dźwięk w aplikacji AR na smartfonie Badacza.
  2. `Audio 2 - dla Krystynatora.mp3` (1.2 MB) - nagranie audio ze stacji w parku, na której odpadła Krystynator.
  3. `Audio 3 - dla DM.mp3` (1.6 MB) - nagranie audio dla gracza DisasterMaster.
  4. `zaklecie 3.wav` -> `zaklecie-3.mp3` (po kompresji ~1.2 MB) - inkantacja na Noc Kupały odtwarzana przez Eliasza ze smartfona przez głośniki estradowe z powerbanku.
  5. `Wideo 1 - dla Badacza.mp4` - nagranie wideo z kamery telefonu w lesie (styl Blair Witch Project).
  6. `Wideo 2 - dla Krystynatora.mp4` - wideo przesłane Krystynatorowi przez FilipsaNo1.
  7. `Wideo 3 - dla DM.mp4` - wideo od FilipsaNo1 dla gracza DM.
- **Węzeł w grze:** Węzły stacji miejskich w Głębicy / parku (`node-ar-station-3`, `node-ar-station-7`, `node-ar-final`).
- **Status:** Pliki fizycznie istnieją na dysku w archiwum ZIP. Wymagają jedynie rozpakowania, optymalizacji kompresji do standardu silnika i wpięcia pod tag `[HANDOUT:<slug>]`.

---

### Grupa B: Diegetyczne Nośniki w Oficjalnych Podręcznikach

#### 2. `case-ct-06` - Pociąg do szaleństwa
- **Źródło:** *Cienie Tatr* (Rozdział 6, str. 119-148)
- **Epoka / Rejestr:** 2015, Góry Sowie (Kompleks Rzeczka, Walim) | Modern Survival Horror
- **Rekwizyt:** Surówka z kamery ekipy dokumentalnej ze sztolni Rzeczka (`camcorder_hi8` / raw footage).
- **Opis fabularny:** Badacze wcielają się w ekipę dokumentalną badającą legendę Złotego Pociągu w sztolniach Gór Sowich. W komorze podziemnej dochodzi do załamania czasoprzestrzeni i manifestacji Bramy Wielkiej Rasy z Yith. Kamera rejestruje anomalię.
- **Mechanika podręcznikowa:** Test Fotografii lub Spostrzegawczości przy przeglądaniu nagrania na komputerze/kamerze:
  - Sukces zwykły (20% szans): zamazany obraz, stożkowate kształty Yithian, w tle dziwne, niepokojące piski i trzaski falowe.
  - Sukces trudny (40% szans): zarysy postaci we mgle, rezonans podziemny.
  - Sukces ekstremalny (60% szans): ostry kadr komory i obcych istot.
- **Warstwa audio:** Dźwięk mikrofonu kamerowego z potężnym echem sztolni, trzaski wyładowań elektromagnetycznych i obcy, nieludzki pisk.
- **Węzeł w grze:** `node-sztolnia-rzeczka-glebia` / `node-baza-dokumentalistow`.
- **Status:** Do wyrenderowania (krótka pętla wideo 6s + audio ze stożkowatymi cieniami i piskami).

#### 3. `case-os-04` - Miłość ci wszystko wybaczy? (Scenariusz "Druga")
- **Źródło:** *Miłość ci wszystko wybaczy?* (Scenariusz 3, str. 55-80)
- **Epoka / Rejestr:** Współczesność, Skandynawia / Europa Północna | Psychological Mystery (1 na 1)
- **Rekwizyt:** Zapis dyktafonu z przesłuchania odnalezionej kobiety (`cassette` / dyktafon cyfrowy).
- **Opis fabularny:** Na pustej drodze odnaleziona zostaje zdezorientowana kobieta. Na posterunku policji majaczy w niezrozumiałym języku.
- **Mechanika podręcznikowa:**
  - Trudny test Języka Ojczystego ujawnia, że kobieta mówi w języku ojczystym Badacza, lecz wymawia słowa od tyłu (wspak).
  - Badacz nagrywa wypowiedź na dyktafon i wykonuje udany test Korzystania z Komputerów, by odwrócić ścieżkę dźwiękową.
  - Odsłuch po odwróceniu ujawnia koszmarne słowa: *"to nie straszydło z bajki, wydzierające dzieciom oczy, aby zjeść je na księżycu... Świat koszmarów Piaskuna to potworne lustrzane odbicie naszego świata, w którym wiele rzeczy, w tym ludzka mowa, jest na opak"*.
- **Warstwa audio:** 
  - Wersja A: Surowa mowa wspak w zaszumionym pokoju przesłuchań.
  - Wersja B: Odwrócona cyfrowo mowa ujawniająca treść.
- **Węzeł w grze:** `node-komisariat-przesluchanie`.
- **Status:** Do nagrania z lektorką (nowoczesny model v3/v4) i odwrócenia fazowego w skrypcie.

#### 4. `case-uz-02` - Dawno temu w Dusznikach
- **Źródło:** *Usłysz Zew Cthulhu* (Rozdział 2, str. 35-62)
- **Epoka / Rejestr:** 1923, Duszniki-Zdrój | Classic / Period Gothic
- **Rekwizyt:** Płyta szelakowa gramofonu w Villa Hygiea (`gramophone`).
- **Opis fabularny:** W Domu Zanna (Villa Hygiea) w salonie gra zabytkowy gramofon. Na płycie zarejestrowano wariację utworów Chopina zmieszaną z dysonansowymi frazami Ericha Zanna. Ponadto w finale autorzy wprost rekomendują: *"Jako podkład dźwiękowy na zakończenie rytuału polecam dowolne nagranie z praktyki uczenia się gry na skrzypcach, najlepiej z pierwszych trzech tygodni"*.
- **Warstwa audio:** Trzeszcząca płyta szelakowa 78 RPM, miękki szum tuby gramofonowej, melancholijny fortepian przełamany atonalnymi zgrzytami smyczka.
- **Węzeł w grze:** `node-villa-hygiea-salon`.
- **Status:** Do przygotowania z historycznym sound designem szelaku.

#### 5. `case-uz-03` - Babie lato
- **Źródło:** *Usłysz Zew Cthulhu* (Rozdział 3, str. 63-125)
- **Epoka / Rejestr:** 1944, Beskid Niski / Dukla | WWII Partisan Mystery
- **Rekwizyt:** Przechwycony meldunek radiowy niemieckiej jednostki Netzwaffe (`radio`).
- **Opis fabularny:** Polowa radiostacja partyzantów Armii Krajowej przechwytuje wojskową transmisję nadawaną alfabetem Morse'a. Meldunek jest zaszyfrowany autentycznym historycznym szyfrem ADFGVX pułkownika Fritza Nebela z kluczem *"Ubermnsch"*.
- **Warstwa audio:** Pikanie alfabetu Morse'a w zaszumionym eterze lampowego odbiornika wojskowego, trzaski modulacji i szum wiatru w leśnej ziemiance.
- **Węzeł w grze:** `node-oboz-partyzantow-radiostacja`.
- **Status:** Do wygenerowania generatorami sygnałów Morse'a + sound designem odbiornika Torn.Fu.b1.

#### 6. `case-os-02` - Wrak (The Derelict)
- **Źródło:** Scenariusz oficjalny *Wrak* (wyd. Black Monk Games)
- **Epoka / Rejestr:** Współczesność / Atlantyk Północny | Maritime Cosmic Horror
- **Rekwizyt:** Przechwycony sygnał radiowy ze zniszczonej kabiny radiowej chłodniowca *Groenland Tropisch* (`radio`).
- **Opis fabularny:** Radiooperator Thorolf Löfgren oszalał po kontakcie ze Skazą w lodzie i rozbił nadajnik toporkiem pożarniczym w kabinie radiowej (lokacja 27). Badacze próbują naprawić sprzęt lub podsłuchują zakłóconą częstotliwość morską.
- **Warstwa audio:** Szum fali morskiej, urwany sygnał awaryjny VHF, piski zakłóconej nośnej i odgłos kapiącej wody z topniejącego lodu w korytarzu wraku.
- **Węzeł w grze:** `node-groenland-radio-cabin`.
- **Status:** Do przygotowania w module sound designu radiowego.

---

### Grupa C: Dedykowane Nośniki w Przygodach Autorskich (Strefa 11 & Cold Cases)

#### 7. `case-s11-01` - Cień nad Prabutami: Widzenie Ojca Klimuszki
- **Epoka / Rejestr:** PRL 1973, Elbląg / Prabuty | Cold War Supernatural
- **Rekwizyt:** Taśma szpulowa ZK-140 SB: Podsłuch celi w Elblągu (`reel_to_reel`).
- **Opis fabularny:** Meldunek operacyjny z podsłuchu obiektu KLIN. Oficer SB notuje skok natężenia pola elektromagnetycznego w wozie operacyjnym Nysa, pisk wskaźników wychyłowych i pękanie szyb w celi klasztornej podczas modlitwy o. Klimuszki.
- **Sound design:** Szum głowicy ZK-140, jednostajna modlitwa w tle, narastający pisk pętli sprzężenia akustycznego i gwałtowny brzęk pękającego szkła.
- **Plik w repo:** `/audio/handouts/cien-nad-prabutami/tasma-sb-elblag.mp3` (wymaga re-masteringu z bogatszym sound designem SB).

#### 8. `case-s11-02` - Tajemnica Pędnika: Genialny Wynalazca z Kowar
- **Epoka / Rejestr:** 1996, Kowary / Sudety | 90s Fringe Science
- **Rekwizyt:** Nagranie magnetofonowe: Próba zderzeniowa Kowary 1996 (`cassette`).
- **Opis fabularny:** Rejestracja czwartej próby zderzeniowej Fiata 126p z wirnikiem zderzeniowym Łągiewki uderzającego w betonowy blok na stadionie w Kowarach. Wskazówki grawimetryczne przekraczają skalę.
- **Sound design:** Dźwięk wkręcanego na obroty Malucha, tępy huk uderzenia bez jakiegokolwiek odrzutu blach i narastające buczenie wirnika pochłaniającego wektor pędu.
- **Plik w repo:** `/audio/handouts/tajemnica-pendnika-lagiewki/proba-zderzeniowa-kowary.mp3` (wymaga re-masteringu).

#### 9. `case-s11-03` - Tajemnica Dzieci z Traszyna: Klucz i Odwrócony Krzyż
- **Epoka / Rejestr:** 1983/1999, Mazury (Traszyn) | Folk Horror
- **Rekwizyt:** Kaseta Stilon C-60: Wywiad z przerażonym dzieckiem (`cassette`).
- **Opis fabularny:** Przesłuchanie ocalałego chłopca po seansie spirytystycznym z mosiężnym kluczem w modlitewniku w stodole. Dziecko opisuje czarną maź kapiącą z krokwi i obcy głos ziemi.
- **Sound design:** Szum polskiej taśmy żelazowej Stilon Gorzów, łamiący się głos dziecka, głuche stukanie deszczu o dach stodoły.
- **Plik w repo:** `/audio/handouts/tajemnica-dzieci-z-traszyna/wywiad-dziecko-1983.mp3` (wymaga re-masteringu głosu dziecięcego).

#### 10. `case-s11-04` - Przybysz z Matriksa: Zjawisko z Głogowa
- **Epoka / Rejestr:** 2001, Głogów / Dolny Śląsk | Y2K Cyber-Occult
- **Rekwizyt:** Taśma VHS: Przechwycona audycja z przyszłości (`vhs_crt`).
- **Opis fabularny:** Przechwycony nielegalny sygnał na kanale 37 lokalnej telewizji kablowej w Głogowie. Komunikat o zapadającej się pętli czasowej wokół podziemi Twierdzy Głogów i zalanego sektora Odry.
- **Sound design:** Pisk kineskopu CRT 15 kHz, trzask mechanizmu wciągania taśmy VHS, pisk połączenia modemowego i syntetyczny, zniekształcony głos transmitowany zza horyzontu zdarzeń.
- **Plik w repo:** `/audio/handouts/przybysz-z-matriksa-glogow/sygnal-vhs-glogow.mp3` (wymaga re-masteringu).

#### 11. `englewood-murder-castle-1893` - The Englewood Labyrinth
- **Epoka / Rejestr:** 1893, Chicago | Victorian Gaslight Mystery
- **Rekwizyt:** Cylinder woskowy Edisona: "Experiment IX - Room 14" (`gramophone`).
- **Opis fabularny:** Cylinder fonograficzny wydobyty z pancernego sejfu w sypialni H.H. Holmesa. Chłodny głos mordercy odlicza minuty otwarcia zaworu gazu miejskiego w celi nr 14 i wsłuchuje się w odgłos zstępujący z szybu pieca.
- **Sound design:** Trzask igły na miękkim wosku, syk ulatniającego się gazu, metaliczny pogłos szybu.
- **Plik w repo:** `/audio/handouts/englewood-murder-castle-1893/edison-wax-cylinder-1893.mp3`.

#### 12. `almer-coe-spectacles-1924` - The Almer Coe Spectacles
- **Epoka / Rejestr:** 1924, Chicago | Jazz Age Noir
- **Rekwizyt:** Wałek dyktomagnetofonu biurowego (Dictaphone Record - LaSalle Hotel) (`gramophone`).
- **Opis fabularny:** Zeznanie szofera Svena Englunda w sprawie czerwonego samochodu Willys-Knight oraz lodowaty głos Nathana Leopolda tłumaczącego, że czysty intelekt stoi ponad moralnością.
- **Sound design:** Dźwięk biurowego aparatu Dictaphone, trzaski cylindra, szelest teczek prokuratorskich.
- **Plik w repo:** `/audio/handouts/almer-coe-spectacles-1924/crowe-interrogation-1924.mp3`.

#### 13. `circleville-letters-1983` - Postmarked Columbus
- **Epoka / Rejestr:** 1977/1983, Circleville, Ohio | 70s Analog Paranoia
- **Rekwizyt:** Mikrokaseta podsłuchu telefonu Rona Gillespiego (`cassette`).
- **Opis fabularny:** Rejestracja ostatniej rozmowy telefonicznej Rona Gillespiego z 19 sierpnia 1977 r. przed śmiertelnym wypadkiem. Tajemniczy rozmówca opisuje ruchy w kuchni i każe wyjechać na Route 56.
- **Sound design:** Kliknięcia tarczy numerowej telefonu stacjonarnego, charakterystyczny przydźwięk 18.9 Hz na linii party-line, nienaturalnie rytmiczny, modulowany głos.
- **Plik w repo:** `/audio/handouts/circleville-letters-1983/gillespie-wiretap-1977.mp3`.

#### 14. `ovidhall-lake-anomaly-2005` - I'm in a Field
- **Epoka / Rejestr:** 2005, Jezioro Ovidhall, Michigan | 2000s Cellular Liminal Horror
- **Rekwizyt:** Poczta głosowa telefonu komórkowego GSM (`cassette` / digital).
- **Opis fabularny:** Nagranie ze skrzynki głosowej Cingular Wireless z godziny 00:51 w nocy. Zdezorientowany szept zaginionego studenta: *"Hello? I left the bonfire... I am in a field. Why is there limestone above my head? The water is above me..."*.
- **Sound design:** Kompresja kodeka GSM AMR-NB, urwane pakiety sygnału, głuche bulgotanie wody i metaliczny dzwon w tle.
- **Plik w repo:** `/audio/handouts/ovidhall-lake-anomaly-2005/voicemail-in-a-field-2005.mp3`.

---

## 4. Rejestr Scenariuszy Przebadanych i Odrzuconych (Zero Fake-Audio)

Poniższe scenariusze zostały zweryfikowane pod kątem obecności urządzeń nagrywających. **W żadnym z nich nie występują diegetyczne nagrania.** Zgodnie z zasadą "File Over AI", wszelkie próby dorabiania im syntetycznych lektorów zostały bezwzględnie odrzucone:

1. **`case-s01` - Nawiedzony dom (*The Haunting* / Starter):**  
   Pomoce to: artykuł z Boston Globe 1918, rejestr gruntów 1852, pamiętnik Corbitta, akta policyjne z nalotu. Żadne z nich nie jest nagraniem. Pliki `corbitt_journal.mp3` i `boston_globe_radio.mp3` zostały słusznie wycofane z gry.
2. **`case-m02` - Szkarłatne litery (*Crimson Letters* / Podręcznik Główny 7e):**  
   Pomoce to: akadyjski pergamin z krwią, list dziekana Fallona, anonim z wycinków gazet. Zero urządzeń nagrywających w Arkham lat 20. Plik `audio-leiter-cylinder.mp3` w repozytorium to sztuczny wymysł – **do usunięcia**.
3. **`case-m01` - Pośród pradawnych drzew (*Amidst the Ancient Trees* / Podręcznik Główny 7e):**  
   Pomoce to: plakat zaginionej dziewczynki, notatka porywaczy. Brak jakichkolwiek urządzeń. Plik `audio-glaaki-dream-call.mp3` to sztuczny monolog – **do usunięcia**.
4. **`case-os-10` - Noc Zagłady (*World War Cthulhu*):**  
   Pomoce to: rękopiśmienne notatki Tomasza Burskiego i spowiedź Jarosława Mycielskiego. W podręczniku ZERO nagrań (`audio-burski-fever-plea.mp3` i `audio-mycielski-confession.mp3` to odczytane kartki papieru) – **do usunięcia**.
5. **`case-s03` - Czarny Sarkofag / Krakowska Enigma (*Prolog do Masek*):**  
   Pomoce to: list i telegram Jacksona Eliasa, mapa kopalni Puno, złoty amulet Kharisiri. Zero nagrań (`audio-elias-briefing.mp3` to telegram czytany przez lektora) – **do usunięcia**.
6. **`case-hw-04` - Miłość (Horror nad Wartą, Rozdział 4):**  
   W Issue #665 sugerowano dyktafon z 3:00 nad ranem. W kanonie Pomoc #14 to seria rysunków i szkiców w notesie ("Wizje Jerzego Rzymowskiego zesłane przez Gwiezdną Matkę"). Brak audio.
7. **`case-uz-05` - Dom, którego nie ma (Usłysz Zew Cthulhu, Rozdział 5):**  
   W Issue #665 sugerowano nagrania dr. Hoppe z widmowej kliniki. W kanonie Mateusz Hoppe to współczesny aspirant policji przy ul. Śliskiej w Warszawie, a scenariusz operuje zniszczonymi drzwiami i zjawami. Brak audio/wideo.
8. **`case-os-07` - Uwierz w duchy: Prosta robota:**  
   W Issue #665 sugerowano wałek fonograficzny z seansu Abigail Dietrich. W kanonie pomocami są wyłącznie listy w kopercie i wycinki prasowe. Brak fonografu.
9. **`case-ct-03`/`case-ct-04` - Pozdrowienia z Polski (Cienie Tatr, Rozdział 4):**  
   W Issue #665 sugerowano taśmę szpulową SB z przesłuchania Marka Zabłockiego. Kanon podręcznika wprost to wyklucza: *"podporucznik Stanisław Różycki nigdy nie przesłuchał Marka Zabłockiego. Zdołał jedynie przebrnąć przez papierkową robotę"*. Brak taśmy.
10. **`case-os-08` - W czeluściach sklepów:**  
    Kanon operuje labiryntem regałów sklepowych we Wrocławiu. Brak zapisu komunikatów megafonu jako pomocy.
11. **`case-hw-05` - Trzeba karmić ogień:**  
    Kanon operuje syberyjskim mrozem, szamanem i kopalnią diamentów Oczystka. Brak audycji radiowej jako pomocy dla graczy.
12. **`case-hw-01` - Dorośli we mgle / `case-hw-02` - W cieniu świateł / `case-hw-03` - Koszmar Poznania:**  
    Sprawdzone pod kątem Issue #665. Pomoce to mapy topograficzne, nekrologi, wycinki z gazet, bilety na imprezę. Brak dedykowanych handoutów dźwiękowych.
13. **`Sprawa małego Cohna`, `Na dnie smętnego jeziora`, `Dziedzictwo Tatr`, `Czarny jak węgiel`, scenariusze Pulp Cthulhu (*Dezintegrator*, *Puszka Pandory* itd.):**  
    Czysto papierowe lub przedmiotowe śledztwa bez urządzeń nagrywających.

---

## 5. Macierz Wdrożeniowa Silnika (Plan Działań)

| Lp. | ID Przygody | Nazwa Rekwizytu | Typ Nośnika | Źródło Pliku / Zadanie |
|:---:|---|---|:---:|---|
| 1 | `case-os-03` | Pakiet Kwiat Paproci (4x Audio, 3x Wideo) | Smartfon AR / Wideo | Wypakowanie z `Kwiat paproci.zip` i optymalizacja wagowa. |
| 2 | `case-ct-06` | Pętla wideo i zakłócenia ze sztolni Rzeczka | `camcorder_hi8` | Wyrenderowanie pętli 6s (stożkowate sylwetki Yithian + audio). |
| 3 | `case-os-04` | Przesłuchanie na komisariacie (mowa wspak) | `cassette` | Nagranie lektorki v3/v4 + filtr mowy od tyłu i wersja odwrócona. |
| 4 | `case-uz-02` | Płyta szelakowa Villa Hygiea | `gramophone` | Fortepian Chopina + dysonanse skrzypiec Zanna + szelak 78 RPM. |
| 5 | `case-uz-03` | Przechwycony meldunek ADFGVX (Morse) | `radio` | Generator Morse'a (hasło Ubermnsch) + szum lampowy AK. |
| 6 | `case-os-02` | Awaryjny sygnał radiowy Groenland Tropisch | `radio` | Szum fali morskiej + pisk VHF ze zniszczonej kabiny radiowej. |
| 7 | `case-s11-01` | Taśma SB: Podsłuch celi w Elblągu | `reel_to_reel` | Re-mastering pliku `tasma-sb-elblag.mp3` (szum ZK-140, trzask szkła). |
| 8 | `case-s11-02` | Nagranie próby zderzeniowej Kowary | `cassette` | Re-mastering pliku `proba-zderzeniowa-kowary.mp3` (silnik Fiata 126p). |
| 9 | `case-s11-03` | Kaseta Stilon C-60: Wywiad z dzieckiem | `cassette` | Re-mastering pliku `wywiad-dziecko-1983.mp3` (taśma żelazowa Stilonu). |
| 10 | `case-s11-04` | Taśma VHS: Zjawisko z Głogowa | `vhs_crt` | Re-mastering pliku `sygnal-vhs-glogow.mp3` (pisk kineskopu 15 kHz, modem). |
| 11 | `englewood` | Edison Cylinder: Room 14 | `gramophone` | Gotowy plik w repozytorium (`edison-wax-cylinder-1893.mp3`). |
| 12 | `almer-coe` | Dictaphone Record: Leopold Inquest | `gramophone` | Gotowy plik w repozytorium (`crowe-interrogation-1924.mp3`). |
| 13 | `circleville` | Micro-Cassette: Gillespie Wiretap | `cassette` | Gotowy plik w repozytorium (`gillespie-wiretap-1977.mp3`). |
| 14 | `ovidhall` | Voicemail: I'm in a Field | Digital GSM | Gotowy plik w repozytorium (`voicemail-in-a-field-2005.mp3`). |

**Zadanie czyszczące (Purge Fake Audio):**
Usunięcie z manifestów i katalogu `public/` zmyślonych plików pseudo-audio:
- `szkarlatne-litery/audio-leiter-cylinder.mp3`
- `posrod-pradawnych-drzew/audio-glaaki-dream-call.mp3`
- `noc-zaglady/audio-burski-fever-plea.mp3`
- `noc-zaglady/audio-mycielski-confession.mp3`
- `czarny-sarkofag/audio-elias-briefing.mp3`
