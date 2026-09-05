# Audyt manifestów epok, CoC 7e i warsztatu MG

Data: 2026-09-05. Właściciel decyzji: PO. Powiązanie: [GitHub #4 — manifesty epok i preflight świata](https://github.com/InduPhantom-hash/straznik-tajemnic/issues/4).

Zakres: diagnoza, porównanie źródeł, testy i raport. Bez napraw kodu, manifestów, publikacji i zmian GitHuba. Raport jest materiałem do istniejącego issue, nie drugim backlogiem.

## Ocena dla PO

- **Działa fundament techniczny:** jawny `ResolvedEraContext`, odrzucenie braku roku i kraju w sprawdzonych ścieżkach, walidacja grafu własnej przygody oraz przenoszenie `worldSetup` w pełnym zapisie. 49 istniejących testów przeszło; typy, mapa nawigacji i zgodność kluczy PL/EN również.
- **Manifesty nie są jeszcze zatwierdzoną wiedzą świata:** wszystkie 7 mają status `draft`, 14 pustych sekcji merytorycznych i placeholder zamiast zweryfikowanego źródła. Osobny rejestr 3 profili też zawiera wyłącznie szkice. Wypełnienie samego `manifests.ts` nie naprawi przepływu do MG.
- **Wiarygodne użycie epok blokują rozbieżne ścieżki:** narracja dostaje również stare presety dobierane po samym roku, portrety kreatora korzystają z etykiet i domyślnego `1920s`, a współczesny manifest nie dopasowuje PL/US/GB. Lata 40. mają styl w UI, lecz nie manifest. Rok 1971 ze scenariusza PRL również nie jest pokryty.
- **Materiał historyczny nie jest gotowym pakietem reguł:** 10 z 12 kombinacji epoka–region w `DeepResearch_Prompty` zawiera tylko prompty. Dwie wypełnione kolekcje wymagają redakcji źródłowej: niepowiązane znaczniki cytowań, puste tabele i propozycje dodatkowych rzutów nie mogą uzyskać etykiety RAW.
- **Nie ma podstaw do akceptacji całego desktopu ani pełnej rozgrywki E2E:** działający build na 4050 miał błędy zasobów JS/CSS. Izolowana kopia kodu na 4057 pozwoliła obejrzeć selektor PL/EN. Generowania AI i wysyłania podręczników nie wykonywano. Szczegóły pokrycia poniżej.

Rekomendowana pierwsza praca: kontrakt jednego kontekstu świata i jego odbiorców, następnie jeden mały zatwierdzony pakiet rok–region. Nie masowe wypełnienie wszystkich szkiców przed usunięciem rozjazdów.

## 1. Wersje i granice dowodu

| Obiekt | Stan odczytany podczas audytu | Co można z niego wnioskować |
|---|---|---|
| Lokalny kod | `feat/issue-62-sanity-recovery`, HEAD `0a3c2be081d137caf0d9ee8abdb6427946d18573` | Ustalenia statyczne i testy w tym raporcie |
| GitHub `main` i lokalny `origin/main` | `6bef31e03b623ba13dedf95c1872f97d11e483a5` | Osobny punkt odniesienia; nie utożsamiamy z badaną gałęzią |
| Aktywny serwer 4050 | PID 72874; cwd badanego `_tester/_base/.silnik`; `.next/BUILD_ID=XdMHS32qNJSbZnAYVCGr` | Build istnieje, ale nie ma dowodu mapowania tego identyfikatora na commit |
| Launcher zainstalowanego `.app` | wskazuje `/Volumes/Karta/Developer/straznik-worktrees/main`; HEAD tej ścieżki `d3f2fb075f967777e7c52c17ba5d354c7d38b741` | Uruchomienie aplikacji może użyć innego checkoutu niż proces aktualnie na 4050 |
| Kopia audytowa 4057 | źródła badanego checkoutu, świeży Next dev, osobny katalog tymczasowy | Dowód działania interfejsu tego kodu, nie dowód poprawności zapakowanej aplikacji |

GET `/api/desktop/cold-start` na 4050 zwrócił `available:false`. Nie wykonywano resetu, restartu istniejącego procesu ani przebudowy `.app`. Początkowy worktree był czysty. Audyt nie obejmuje przeportowania wniosków na każdą równoległą gałąź. `main` ma scaloną pracę nad 110/110 zasobami wizualnymi; ten audyt nie traktuje dawnego braku assetów jako aktualnego problemu.

Źródło kodu dla ścieżek `src/...` w dalszej części: `/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/`. Numery linii dotyczą powyższego HEAD. Materiały zewnętrzne czytano lokalnie; nie dołączano ich treści ani stron podręcznika do repozytorium.

### Stan po wznowieniu pracy

Podczas przerwy inne prace zmieniły checkout na `fix/issue-140-equipment-starting-thumbnails`, HEAD `52a5f5081487dbd1f48fef0dbfb10c3b09fe3704`. Nie cofano tych zmian. Pojawił się także cudzy nieśledzony `public/equipment/catalog/laptop-modern.webp`; audyt go nie dotykał.

Przy końcowej kontroli inne prace zmieniły również `src/hooks/useEquipmentThumbnails.ts` i `src/lib/equipment-catalog.ts`. Zachowano je bez ingerencji. Opis wyposażenia w tym raporcie dotyczy pierwotnego punktu odniesienia, nie jest recenzją tych nowych zmian roboczych.

Porównanie z pierwotnym HEAD nie wykazało zmian w badanym rdzeniu `src/lib/era`, `src/lib/world-setup`, setup API, kreatorze ani helperach czatu. Zmiana `useGameStart` dotyczy oczekiwania na bufor TTS, nie rozwiązywania epoki. Ponowne typy i mapa nawigacji przeszły na nowym HEAD; słowniki mają teraz 5521 zgodnych kluczy. To osobny wynik, nie korekta historycznej liczby 5472 z pierwszego przebiegu. Izolowana kopia 4057 nadal reprezentuje pierwotny kod. Nie wykonano ponownie pełnego audytu wszystkich zmian nowej gałęzi.

## 2. Jak naprawdę przepływa epoka

| Etap / odbiorca | Obecny przepływ | Ocena |
|---|---|---|
| Własna przygoda w UI | dokładny rok i niepusty kraj; osobna etykieta epoki | Dobry kierunek, ale walidacja formularza nie jest pełną walidacją kontekstu |
| Przygotowany scenariusz | `yearRange`, `country`, `eraLabel`; resolver bierze pierwszy rok zakresu | Zakres historii może zostać uznany za rok aktualnej sceny |
| Resolver | data sceny → pierwszy rok scenariusza → wybór użytkownika → custom; kraj ma osobną hierarchię | Brak cichego roku domyślnego w resolverze; wybór użytkownika nie zawsze wygrywa |
| Preflight własnej przygody | exact guard → dobór manifestu → research → graf → `WorldSetupBundle` | Blokuje brak kontekstu i wadliwy graf, nie blokuje braku zatwierdzonej epoki |
| Scenariusz gotowy | lokalny `createPresetWorldSetup`, bez online preflight | Szybki start; `eraManifestId:null`, brak źródeł, faza epoki mimo tego `passed` |
| Pierwsza wiadomość | `adventureContext` i `worldSetup.eraContext` | Nie przekazuje całego przygotowanego pakietu wiedzy/grafu |
| Kolejne wiadomości | `adventureContext` i `gameTime`; serwer rozwiązuje kontekst ponownie | Brak kontraktu konsumpcji zapisanego pakietu świata przez całą sesję |
| Instrukcje MG | kanoniczne zdania + zatwierdzone profile z `registry.ts` + stary preset po roku | Podwójna prawda; żaden profil szczegółowy nie jest zatwierdzony |
| RAG | wiadomość, sesja, źródło książki przygody | Wywołanie nie przekazuje roku/kraju ani manifestu jako filtra historii |
| Kreator / zawody | lista zawodów filtrowana archetypem i wyszukiwaniem | Brak filtrowania zawodów według kontekstu epoki |
| Wyposażenie | osobny `EquipmentVisualEra`, katalog i dostępność; część API korzysta z kontekstu | Istnieją zabezpieczenia, lecz nie jest to uniwersalna polityka rok–kraj–zawód |
| Portret kreatora | `yearRange || eraLabel || era || '1920s'` | Omija kanoniczny resolver; w żądaniu brak jawnego kraju |
| Immersja: czas, pogoda, ceny | rok z kontekstu, domyślne współrzędne Bostonu, przelicznik USD | Rok jest przekazany, lokalność nie jest zapewniona |
| Save/load | opcjonalny `worldSetup`, oddzielny czas i dane przygody | Roundtrip pakietu działa w testach; zgodność wszystkich odbiorców po odczycie nieudowodniona |

Najważniejsze punkty kodu: [resolver](/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/lib/era/resolve-era-context.ts), [start gry](/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/hooks/useGameStart.ts:483), [preflight](/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/app/api/adventure/setup/route.ts:93), [pipeline czatu](/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/app/api/chat/_helpers/run-chat-pipeline.ts:214), [instrukcje czasu](/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/app/api/chat/_helpers/build-time-context.ts:43), [odczyt zapisu](/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/hooks/useFullSave.ts:156).

### `draft`, puste sekcje i „verified” — znaczenie praktyczne

- `findEraManifest` dobiera zakres i region, nie wymaga `approved`.
- Brak manifestu lub szkic powoduje `knowledgeGaps`; faza `era` pozostaje zaliczona. Nie oznacza to zatwierdzenia historycznego.
- Preflight podaje modelowi identyfikator manifestu, nie rozwiniętą zawartość jego sekcji. Model nie zna lokalnego obiektu na podstawie samego ID.
- `buildEraNarrativeRules` czyta inny rejestr (`ERA_RULE_PROFILES`) i odrzuca jego szkice. Puste sekcje manifestu nie są więc jedyną przyczyną braku szczegółowych instrukcji.
- `HistoricalSourceRef.verificationStatus='verified'` oznacza dopasowanie domeny do allowlisty. Nie oznacza przeczytania źródła, potwierdzenia dat ani poparcia każdego zdania.
- `contentHash` researchu jest skrótem tytułu i URL, nie treści strony. `pending` w manifestach jest literalnym placeholderem.

## 3. Macierz pokrycia epok i regionów

`M` = manifest, `P` = odrębny profil reguł. Wszystkie istniejące M/P są `draft`. „Prompty” oznaczają zlecenia przyszłego badania, nie zebraną wiedzę. Szczegóły liczebności: [SOURCES.md](SOURCES.md).

| Epoka / region | Dostępne źródła lokalne | Pokrycie M / P | Użycie aplikacji i luka |
|---|---|---|---|
| 1880–1899 PL | 16 promptów; brak wyników w tym koszyku | brak / brak | Gaslight w UI nie rozróżnia zaboru ani instytucji; materiały obejmują szerszy okres niż M dla GB |
| 1880–1899 USA | 16 promptów | brak / brak | Styl Gaslight nie jest nakładką USA; brak źródeł do zatwierdzenia świata |
| 1890–1899 GB | recenzja Gaslight 7e, nie podręcznik dodatku | `gb-1890s` / brak | M pasuje do 1895 GB, ale pełna warstwa historyczna pusta; sprzeczne zakazy telefonów |
| 1920–1929 USA | Księga Strażnika; 1235 dodatkowych MD researchu | `us-1920s` / `us-1920` | Najlepszy punkt startu źródłowego, nadal brak zatwierdzonego pakietu i powiązania tez ze źródłami |
| 1920–1929 PL | 16 promptów; scenariusze w zbiorze nie zastępują historii kraju | brak / brak | Cennik USA z podręcznika nie jest polskim cennikiem |
| 1930–1939 | osobny styl wizualny, brak osobnego koszyka researchu | brak / brak | Narracja mapuje profil 1930s na preset 1920s; nie dowodzi zgodności dekad |
| 1939–1949 PL | 16 promptów; `Noc Zagłady` | brak / brak | Noir dostępny, brak manifestu nawet dla 1943 PL; scenariusz wymaga wyboru roku i obszaru okupacji |
| 1939–1949 USA | 16 promptów | brak / brak | Amerykańskiego noir nie można użyć jako kompletnej polityki okupowanej Polski i odwrotnie |
| 1950–1959 | profil wizualny; brak osobnej kolekcji | brak / brak | Narracja mapuje na lata 40.; brak zatwierdzenia zmian po wojnie |
| 1960–1979 PL, poza 1973–74 | koszyk promptów 1970–79; `Pełzająca kontrrewolucja` — 1971 | brak / brak | Styl PRL obejmuje więcej lat niż manifest; konkretny posiadany scenariusz wypada poza zakres |
| 1973–1974 PL | prompty + autorski scenariusz Prabuty | `pl-1973-1974` / `pl-1973` | Technicznie dopasowany manifest; preset startuje bez zapisania jego ID |
| 1970–1979 USA | 16 promptów | brak / brak | Dobór starego presetu po roku może wprowadzić milicję i PKS do USA |
| 1980–1989 PL | brak osobnej kolekcji DeepResearch | `pl-1980s` / brak | Styl 1980s istnieje, narracja sprowadza go do presetu PRL lat 70. |
| 1990–1999 PL | część kolekcji PL 1990–2005: 712 dodatkowych MD łącznie | `pl-1990s` / brak | Jeden zakres nie koduje zmian roku ani sposobu liczenia pieniędzy; Traszyn ma zakres 1983–1999 |
| 2000–2005 PL | ta sama kolekcja; scenariusz Głogów 2001 | `pl-2000-2005` / `pl-2001` | Jedyny dodatkowy plik immersji jest czytany z potencjalnie błędnego cwd; brak filtracji jego tez po roku |
| 2006 PL | brak osobnego koszyka | brak / P obejmuje jeszcze 2006 | Rozbieżne granice rejestrów; globalny M nie uzupełnia dziury |
| 1990–2005 USA | 16 promptów | brak / brak | Polska transformacja nie jest źródłem technologii i instytucji USA |
| 2006–2026 PL/US/GB | modern PL/USA zawiera tylko prompty i zaczyna od 2020+ | M globalny nie pasuje / brak | Nazwa „global” nie oznacza wildcard; próby PL2006 i US2020 dają `null` |
| 2006–2026 inne kraje, np. FR | brak nakładki lokalnej | global M pasuje przez `GLOBAL` / brak | Dopasowanie szkieletu nie jest pokryciem Francji; paradoksalnie działa tu, a nie dla US/PL |
| Inne lata/custom | resolver obsługuje szeroki zakres; przyszłość wymaga profilu custom | zależnie od zakresu, zwykle brak | Dopuszczenie roku przez resolver nie jest deklaracją historycznego wsparcia |

### Co faktycznie pokazuje UI

Selektor własnej przygody oferuje `classic`, `gaslight`, `noir`, `prl`, `modern`, `custom` oraz osobny dokładny rok. Lista autorskich scenariuszy pokazuje Prabuty 1973–1974, Kowary 1995–1999, Traszyn 1983–1999 i Głogów 2001. Etykieta „noir” jest również tonem przygody: nie należy utożsamiać jej automatycznie z latami 40. Traszyn opisuje wydarzenie sprzed 16 lat i powrót bytu, lecz resolver zakresu wybiera 1983, nie 1999. To rozbieżność semantyczna wymagająca decyzji o roku bieżącej akcji, nie zgadywania po etykiecie Y2K.

## 4. Co wynika z Księgi Strażnika

Źródło RAW: polska **Księga Strażnika, Zew Cthulhu 7. edycja, Black Monk**, plik `ZewCthulhu_KsiegaStraznika_v.1.3.pdf`, 490 stron PDF. `v.1.3` identyfikuje badany plik, nie samodzielnie ustaloną datę dodruku. W poniższych odwołaniach podano stronę drukowaną / stronę PDF (numerowanie PDF od 1). Mapowanie potwierdzono także obrazem strony drukowanej 206 / PDF 207.

| Podstawa | Typ ustalenia | Wymaganie dla aplikacji |
|---|---|---|
| s. 43 / PDF 44: Majętność i standard życia | RAW | Zawód i status postaci wpływają na zasoby; realia ekonomiczne nie są tylko symbolem waluty |
| s. 44 / PDF 45: przykładowe zawody, ograniczenie współczesnych profesji, 8 umiejętności | RAW | Nie proponować zawodów współczesnych bez sprawdzenia epoki; nowy zawód zachowuje reguły konstrukcji, nie dowolny historyczny zestaw |
| s. 107 / PDF 108: wydatki codzienne | RAW | Zwykłe wydatki w ramach standardu życia i dziennego limitu nie wymagają dokładnego rozliczania każdej czynności; większe zakupy mają osobne konsekwencje |
| s. 206 / PDF 207: konwencja, historia, granice grupy | porada MG w podręczniku podstawowym | Uprzedzenia i przemoc historyczna nie są obowiązkiem odgrywania. Uzgodnienia grupy mają pierwszeństwo przed kolekcją „historycznych barier” |
| s. 224 / PDF 225: rozwijanie pomysłów graczy, dochodzenie | porada MG w podręczniku podstawowym | Epoka powinna otwierać sensowne drogi dalszego badania, nie służyć wyłącznie odmowie |
| s. 225 / PDF 226: wskazówki oczywiste i ukryte | RAW / procedura prowadzenia wskazówek | Oczywistej, potrzebnej informacji nie ukrywać za automatycznie wymaganym rzutem. Nie wynika z tego, że każda ukryta wskazówka musi być darmowa |
| s. 447–449 / PDF 448–450: listy ekwipunku i kosztów z epoki | dane i reguły dodatku w książce podstawowej | Ceny są uśrednione, osadzone w konkretnym kontekście; nie są dowodem dokładnej ceny w każdym kraju i roku |
| s. 450 / PDF 451: osobna lista „Obecnie” | dane dodatku w książce podstawowej | „Obecnie” w wydaniu podręcznika nie znaczy automatycznie 2026 ani polskiego rynku |

Wniosek: manifest powinien dostarczać dostępność, ograniczenia i krótkie realia sceny. Nie powinien sam tworzyć nowych testów, umiejętności ani ekonomii, chyba że PO jawnie przyjmie wariant zasad. Nie utożsamiamy porad z rozdziału dla MG z twardym nakazem mechanicznym.

## 5. Ocena historyczna i użyteczność przy stole

To ocena dostępnych materiałów i gotowości do użycia, nie certyfikat prawdziwości wszystkich zebranych twierdzeń. Brak tekstów historycznych oznacza brak podstaw do zatwierdzenia pakietu, nie dowód, że dana technologia lub instytucja nie istniała.

### Gaslight: PL, USA i GB to trzy różne zadania

W PL i USA są wyłącznie prompty badawcze. Brytyjski manifest nie ma odpowiadającego mu koszyka źródeł. Recenzja Setha Skorkowsky’ego odróżnia współczesny dodatek Gaslight 7e od starszych wydań, ale nie zastępuje dostępu do zasad dodatku.

Do zatwierdzenia potrzebne są osobne ustalenia: technologia i komunikacja (istnienie kontra dostęp konkretnej osoby), transport miejski i daleki, waluta i koszt dostępu, właściwa administracja/policja, obyczaje i role społeczne, język urzędowy oraz zabudowa konkretnej miejscowości. Dla PL sam kod kraju nie identyfikuje realiów obszaru zaborowego opisanego w promptach. Dla USA etykieta „wiktoriański” nie zastępuje nakładki amerykańskiej.

Potwierdzona sprzeczność aplikacji: preset dopuszcza rzadki telefon, a wspólne guardrails zakazują wszystkich telefonów i samochodów. Nie trzeba rozstrzygać dokładnej daty wynalazku, aby stwierdzić, że te instrukcje nie tworzą spójnej polityki. Przy stole potrzebne jest „gdzie i jak można zadzwonić”, nie globalne „nie da się”.

### USA 1920–1929

To najbogatsza kolekcja i najlepszy kandydat do pierwszego małego pakietu, po sprawdzeniu źródeł. Syntezy obejmują technologię, komunikację, transport, gospodarkę, instytucje, role społeczne i wygląd. Ich wielkość nie jest miarą jakości: są agregatami ze znacznikami `[cite: n]`, a część eksportów tabel ma puste komórki.

Praktyczny podział powinien rozróżniać dokładny rok, stan/miejscowość, centrum i prowincję, dostępność zwykłą i specjalistyczną oraz pozycję badacza. Radio, telefon, samochód, gazeta czy dokument urzędowy powinny dawać konkretne kanały poszlak i ograniczenia czasowe. Tabele praw kobiet i grup społecznych nie mogą samodzielnie nadawać automatycznych kar każdej rozmowie; ramą są ustalenia grupy i reguły CoC. Język i wygląd warto zawęzić do 2–3 szczegółów bieżącej sceny. Uśredniony cennik podręcznika ma wyraźnie oznaczony zakres, nie zastępuje źródła dla każdego roku.

### Polska 1920–1929

Koszyk zawiera prompty, nie wyniki. Nie ma podstaw do zatwierdzenia technologii, sieci komunikacji, transportu, cen, instytucji, obyczajów, ról, języka i wyglądu całej II RP na podstawie manifestu USA. Same prompty wskazują zmiany wewnątrz dekady; są listą pytań do weryfikacji, nie potwierdzeniem ich treści. Scenariusz osadzony lokalnie może określać czas i miejsce swojej fikcji, lecz nie staje się encyklopedią regionu.

### Lata 40.: osobno wojna, miejsce i powojnie

`Noc Zagłady`, s. 1 / PDF 3, daje konkretny punkt scenariuszowy: okupowana Polska, jesień; dokładny rok pozostawia Strażnikowi, rekomendując okres po ataku Niemiec na ZSRR. Nie wolno przekształcać tego automatycznie w 1940 ani traktować całego zakresu 1939–1949 jako jednego świata. Opcjonalne reguły Pulp na s. 3 / PDF 5 są zasadą dodatku/wariantem, nie domyślnym RAW.

Manifest musi oddzielić technologię istniejącą od dostępnej cywilowi, komunikację oficjalną od konspiracyjnej, transport od swobody przemieszczania się, gospodarkę od zwykłego cennika, instytucje i dokumenty od abstrakcyjnej „policji”. Obyczaje, role, język i wygląd zależą od miejsca, daty i wybranej konwencji. W USA analogicznego rozróżnienia wymagają realia mobilizacji i powojnia; koszyk nie ma źródeł pozwalających to zatwierdzić.

Przy stole ważniejszy jest konkretny termin, patrol i alternatywna droga do informacji niż dziesięć stron ogólnych zakazów. Dopuszczone w scenariuszu wybory i presja czasu są lepszym punktem odniesienia niż sam filtr fotografii noir.

### PRL i USA lat 70.; osobno lata 80.

`Pełzająca kontrrewolucja`, s. 1 / PDF 2, ustala Gdańsk, wiosnę 1971 i zaleca dostosowanie scenariusza do działań graczy. Wydział X jest elementem fikcji scenariusza, nie dowodem historycznego istnienia instytucji. Manifest 1973–1974 nie obejmuje tego scenariusza. Folder PRL ma tylko prompty, a dla lat 80. nie ma osobnego koszyka.

Nie zatwierdzono przekrojowej matrycy: kto ma telefon, jak długo jedzie się koleją/PKS, jak zdobywa się sprzęt, jakie dokumenty i instytucje są właściwe danemu rokowi, jak wyglądają praca, codzienność, język i otoczenie. Są to pytania wymagające źródeł, nie powód do uczynienia każdej czynności niemożliwą. Hasła o niedoborach z promptów nie dowodzą identycznej dostępności w całej dekadzie. Lata 80. nie mogą odziedziczyć całego presetu lat 70. tylko dlatego, że oba okresy dotyczą PRL. USA nie może odziedziczyć polskich instytucji, gospodarki i transportu.

### Polska 1990–2005

Druga obszerna kolekcja obejmuje wszystkie główne dziedziny, ale wymaga najbardziej pilnej redakcji przed dopuszczeniem do narracji. W sprawdzonych syntezach transportu/komunikacji występują propozycje obowiązkowych rzutów Szczęścia przy połączeniach i nazw umiejętności niepochodzących z podstawowego CoC. Synteza gospodarcza proponuje dodatkowe testy zasobów przy rutynowym dostępie do internetu. To propozycje mechaniczne autora syntezy, nie potwierdzone fakty historyczne ani RAW.

Jest też konflikt wewnętrzny: uogólnienie o analogowym modemie przed 2004 kontra opis SDI i Neostrady we wcześniejszych latach w kolekcji transportowej. Wniosek audytu nie brzmi „każde miasto miało usługę”, lecz „syntez nie wolno scalić bez zakresu dostępności”. Niepowiązane cytowania i puste tabele ograniczają możliwość sprawdzenia liczb.

Pakiet powinien dzielić: technologię i komunikację według roku oraz miejsca, transport według relacji i czasu podróży, gospodarkę według jednostki pieniężnej i daty, instytucje według dat obowiązywania, obyczaje i role według konkretnego środowiska, język i wygląd według sceny. Jeden symbol `zł` nie rozwiązuje porównania kwot po obu stronach zmiany jednostki pieniężnej. Audit nie zatwierdza tu tabel kursów ani historycznych cen. Najlepszy mały zakres produktowy może stanowić Głogów 2001, ponieważ scenariusz ma jednoznaczny rok — pod warunkiem ręcznej selekcji źródeł.

### USA 1990–2005 i współczesność

USA 1990–2005 oraz PL/USA modern mają tylko prompty. Modern źródłowo zaczyna się od 2020+, manifest od 2006: jest jawna luka zakresów. Nie ma podstaw do jednego globalnego pakietu komunikacji, transportu, gospodarki, instytucji, ról, języka i wyglądu na dwadzieścia lat. Informacja „jest internet” nie rozstrzyga dostępu do archiwum, prywatności danych, lokalnej instytucji ani modelu telefonu w danym roku. Zasady prawne wymagałyby osobnej weryfikacji oficjalnych źródeł; audyt nie daje porady prawnej ani nie zatwierdza treści promptów jako prawa.

### Warsztat MG: co zachować z materiałów dodatkowych

| Materiał | Klasyfikacja | Użyteczne dla epok | Granica zastosowania |
|---|---|---|---|
| `Dead Ends — Running the Game` | porada MG, przykłady D&D | Nie uzależniać całego śledztwa od jednej drogi; dać inne dojście do informacji | Nie jest regułą CoC ani nakazem likwidacji wszystkich przeszkód |
| `Building Calendars and Tracking Time` | porada MG | Terminy i upływ dni nadają wagę wyborom; śledzić konsekwencje | Fragment o tempie leczenia innych edycji D&D nie przenosi się do CoC |
| `Worldbuilding and Lorebuilding — RPG Tutorials` | porada MG | Lokalna plotka, konflikt, informacja możliwa do użycia przez gracza | Nie robić wykładu z całej epoki przed rozpoczęciem sceny |
| `Miniporadnik W martwym punkcie` | poradnik, nie RAW | Konstrukcja zagadki: otoczka, mechanizm, wskazówki; czytelność informacji | Nie zastępuje podręcznikowej procedury oczywistych/ukrytych poszlak |
| `Cthulhu by Gaslight — RPG Review` | recenzja dodatku | Kontrola wydania i tematyki materiału | Recenzja nie jest źródłem dokładnej reguły dodatku |

Proponowana decyzja aplikacji: do bieżącej sceny podawać MG kilka zatwierdzonych faktów z zakresem i źródłem, 1–2 realne ograniczenia oraz możliwą alternatywę dojścia do informacji. Nie generować obligatoryjnych kar za historyczną przynależność postaci. To rekomendacja projektowa, nie nowa reguła CoC.

## 6. Znaleziska techniczne

Priorytet P1 oznacza blokadę wiarygodności funkcji, nie koniecznie awarię całej gry. Pewność „wysoka” odnosi się do konkretnego dowodu, nie wszystkich możliwych sesji.

### F01 — P1: dwa rejestry, żaden nie zasila pełnych zasad manifestu

- Wpływ: PO może zatwierdzić i uzupełnić manifest, a MG nadal nie otrzyma jego treści.
- Dowód: `src/lib/era/manifests.ts:14` buduje puste sekcje; `src/lib/era/runtime.ts:71` czyta `registry.ts`; setup `route.ts:110` wysyła ID. W repo są 7 manifestów i 3 osobne profile, wszystkie draft.
- Podstawa: decyzja aplikacji; wymóg spójnego preflight z issue #4. Nie wynika z RAW konkretny format rejestru.
- Pewność: wysoka, kod i probe.
- Rekomendacja: wskazać jedno źródło zatwierdzonej polityki oraz jawny adapter do promptów; dopiero potem redagować duże pakiety.

### F02 — P1: `passed` nie oznacza zatwierdzenia historycznego

- Wpływ: gracz uruchamia świat o niezweryfikowanych realiach, choć faza epoki jest zaliczona.
- Dowód: setup `route.ts:213–277` rozdziela phase results i knowledge gaps; `useGameStart.ts:64–120,483–487` tworzy preset z manifestem `null` i pustymi źródłami.
- Podstawa: decyzja aplikacji. RAW nie wymaga internetowego preflight.
- Pewność: wysoka; istniejące testy potwierdzają dopuszczenie zdegradowanego researchu.
- Rekomendacja: odróżnić „kontekst określony”, „graf poprawny” i „historia zatwierdzona”; PO wybiera blokadę albo czytelny tryb neutralny. Nie wymuszać płatnego researchu na każdym gotowym scenariuszu.

### F03 — P1: globalny manifest pomija główne kraje; brak lat 40. i 1971

- Wpływ: funkcja wygląda na dostępną, ale pod wskazanym rokiem i krajem nie ma pakietu.
- Dowód: `manifests.ts:131–150`, dopasowanie OR kraj/profil; probe: US2020 i PL2006 → `null`, FR2020 → `global-contemporary`; PL1943/1971 → `null`.
- Podstawa: decyzja aplikacji oraz czas scenariuszy dodatków, nie reguła RAW.
- Pewność: wysoka, wykonywany probe i macierz granic.
- Rekomendacja: jawna semantyka zakresów i fallbacku regionalnego; brak nakładki nie może być prezentowany jako pełne pokrycie kraju.

### F04 — P1: stare presety przeczą kanonicznemu regionowi

- Wpływ: USA lat 70. może dostać polskie instytucje; lata 80. są narracyjnie sprowadzane do lat 70.
- Dowód: `build-time-context.ts:46–62` dobiera preset po roku, mapuje 1980s→PRL; `getEraPromptInjection('prl-1970s')` zawiera PKS i milicję. Gaslight w `era-visual-style.ts` ma zakaz telefonów sprzeczny z presetem.
- Podstawa: decyzja aplikacji; konflikt instrukcji wykazany bez polegania na wiedzy modelu o historii.
- Pewność: wysoka dla zbudowanych instrukcji; faktyczne posłuszeństwo modelu nieweryfikowane.
- Rekomendacja: wszystkie instrukcje dostępności przez rok, kraj i zatwierdzony zakres; oddzielić styl obrazu od faktów używanych w narracji.

### F05 — P1: zakres scenariusza nadpisuje intencję wyboru roku

- Wpływ: retrospekcja może stać się teraźniejszością. Przykład Traszyna: 1983 zamiast powrotu 16 lat później.
- Dowód: probe dla adventure 1983–1999 i userSelection 1999 daje 1983; UI PL/EN pokazuje jednocześnie zakres i opis powrotu. Gotowy scenariusz omija wymóg wybrania jednego roku, który istnieje dla custom.
- Podstawa: decyzja aplikacji oraz treść autorskiego scenariusza (fikcja), nie fakt historyczny.
- Pewność: wysoka dla resolvera; pełnego startu tej przygody nie wykonano.
- Rekomendacja: osobno rok aktywnej sceny i lata tła; wybór jawny nie może być ignorowany przez pole opisowe.

### F06 — P1: walidacja zaufanego obiektu jest słabsza niż resolvera

- Wpływ: importowane lub ręcznie zmienione dane mogą przejść guard mimo semantycznie błędnego czasu.
- Dowód: `runtime.ts:41–60`, `world-setup/validation.ts`; probe przepuszcza `effectiveYear:-1` po podmianie w obiekcie. Resolver przyjmuje `2001-02-31` jako datę. Pipeline preferuje obiekt żądania po walidacji strukturalnej.
- Podstawa: decyzja aplikacji / integralność stanu.
- Pewność: wysoka, wykonywane funkcje. Nie oznacza, że normalny formularz pozwala wpisać ujemny rok.
- Rekomendacja: ta sama semantyczna walidacja daty, roku, kraju/profilu oraz zgodności z czasem sceny na granicach API i save/load.

### F07 — P1: zapis pakietu nie dowodzi jego użycia w sesji

- Wpływ: przygotowane uzupełnienia historyczne i graf nie gwarantują wpływu na późniejszą narrację.
- Dowód: `useGameStart.ts:549,677` zapisuje bundle, ale do czatu przekazuje jedynie jego `eraContext`; zwykły `useChat` wysyła adventure i czas. Wyszukiwanie `supplementalInformation` nie wykazało odbiorcy w kompozycji promptu. RAG w `run-chat-pipeline.ts:266` nie przyjmuje roku/kraju.
- Podstawa: decyzja aplikacji, wymaganie ciągłości świata.
- Pewność: wysoka dla widocznej ścieżki; nie twierdzimy, że czat nie ma żadnego grafu — posiada też graf przygody, co nie jest tym samym co nowy graf preflight.
- Rekomendacja: jeden kontrakt użycia zatwierdzonego pakietu przez start, kolejne tury i odczyt; test treści finalnych instrukcji, nie samego JSON roundtrip.

### F08 — P1: etykieta źródła „verified” jest za mocna

- Wpływ: niezweryfikowana synteza może wyglądać na udokumentowaną wiedzę historyczną.
- Dowód: `historical-research.ts:42–92,108–130`: hash metadanych, pierwszeństwo `web.domain` przed hostname URI, brak powiązania teza→fragment; cache bez TTL, także wyników zdegradowanych.
- Podstawa: decyzja aplikacji / jakość źródeł.
- Pewność: wysoka, statyczna. Nie wykonywano ataku ani płatnego researchu.
- Rekomendacja: sprawdzać rzeczywisty URL i zakres źródła, oddzielić zaufanie do domeny od weryfikacji tezy; wprowadzić redakcję/akceptację i unieważnianie cache.

### F09 — P1: historia w materiałach bywa podana jako nowa mechanika

- Wpływ: zwykły telefon, zakupy lub kontakt z urzędem mogą niepotrzebnie blokować grę dodatkowymi rzutami.
- Dowód: wskazane w SOURCES.md syntezy PL komunikacji i gospodarki; obowiązkowe rzuty oraz niekanoniczne nazwy testów.
- Podstawa: sprzeczność proponowanej automatyzacji z RAW s. 107 / PDF 108 i procedurą poszlak s. 225 / PDF 226. Nie każdy test historycznie utrudnionej czynności jest zakazany.
- Pewność: wysoka co do treści materiałów; nie dowiedziono, że wszystkie te zasady trafiają dziś do modelu.
- Rekomendacja: kwarantanna propozycji mechanicznych; fakty historyczne, porady MG i warianty zasad osobno. Źródło z innego systemu nie może zatwierdzać reguły CoC.

### F10 — P1: kreator i portrety omijają politykę epoki

- Wpływ: anachroniczny zawód lub wyposażenie startowe; portret z innego okresu niż scena.
- Dowód: `character-wizard.tsx:2570` filtruje zawody bez roku; `occupations.ts:222` zawiera hakera; dobór startowego wyposażenia zawodu nie otrzymuje epoki. `character-wizard.tsx:987–1010` bierze etykiety i fallback1920s, bez kraju w żądaniu.
- Podstawa: RAW s. 44 / PDF 45 dla zawodów; decyzja aplikacji dla portretów.
- Pewność: wysoka statycznie; nie wygenerowano płatnego portretu ani badacza.
- Rekomendacja: dopuszczalność zawodu i sprzętu w jednym kontekście; obraz i portret muszą dostać ten sam dokładny rok i region co MG. Nie zmieniać kanonicznych nazw mechanik na etykiety tłumaczenia.

### F11 — P2: lokalność danych immersyjnych nie jest zagwarantowana

- Wpływ: pogoda/astronomia i ceny mogą sugerować obce realia, a polski pakiet może znikać bez komunikatu.
- Dowód: `build-immersion-context.ts:141–154` ma Boston i USD; wywołanie nie podaje współrzędnych przygody. Linia 186 czyta `cwd/data/epochs/.../summary_immersion.json`; w badanym zagnieżdżonym runtime pliku brak, jest w wrapperze/public. `catch` pomija błąd. Po udanym odczycie brak filtrowania tez po dokładnym roku.
- Podstawa: decyzja aplikacji; ekonomia RAW nie jest przelicznikiem USD dla wszystkich krajów.
- Pewność: wysoka dla kodu i ścieżek; nie testowano zewnętrznych usług pogodowych/cenowych.
- Rekomendacja: lokalizacja z kontekstu, jedno jawne położenie danych, diagnostyka braku pakietu; nie zastępować cennika PL amerykańskim wskaźnikiem inflacji.

### F12 — P2: pomocnicze funkcje daty i waluty nie są gotową polityką świata

- Wpływ potencjalny: nowy odbiorca może otrzymać nieprawdziwą datę i pozornie poprawne kwoty.
- Dowód: `runtime.ts:100–132`; `getEraHandoutDefaults` dla 14 listopada 2001 daje 17 października 2001. Format waluty rozpoznaje region, nie reżim pieniężny. Nie znaleziono aktualnych odbiorców tych eksportów poza testami.
- Podstawa: decyzja aplikacji.
- Pewność: wysoka dla funkcji; **nie jest to dowód błędnego handoutu widzianego dziś przez gracza**.
- Rekomendacja: nie traktować obecności helpera jako wdrożenia; naprawić kontrakt przed podłączaniem.

### F13 — P2: język i wydanie nie mają pełnego dowodu zgodności

- Wpływ: EN może przejść polskie komunikaty preflight; uruchomiona aplikacja może nie odpowiadać badanemu kodowi.
- Dowód: setup route nie ma locale i zawiera polskie komunikaty; na 4050 błędy MIME JS/CSS. Na 4057 PL/EN pokazują selektor, ale EN ma zbyt długie nagłówki kart (obejrzany zrzut); tekst dostępności zamknięcia zawiera `Zamknij`.
- Podstawa: decyzja aplikacji / interfejs, nie RAW.
- Pewność: wysoka dla obserwacji; diagnoza przyczyny wadliwego builda 4050 poza zakresem tego audytu.
- Rekomendacja: osobny warunek odbioru finalnej paczki i PL/EN, bez naprawiania desktopu w tym zadaniu.

## 7. Weryfikacja i dowody

Przed uruchomieniem sprawdzono skrypty. Nie użyto `npm test`, ponieważ pretest generuje katalog przygód. Uruchomiono bezpośrednio binarkę Jest. TypeScript uruchomiono bez incremental, żeby nie zapisywać `.tsbuildinfo`. Sprawdzenie nawigacji użyło `--check`.

| Sprawdzenie | Wynik | Co potwierdza / czego nie potwierdza |
|---|---|---|
| Jest: era, world-setup, setup route, full-game-save-manager, useFullSave | PASS: 11 suites, 49 tests | Resolver, manifesty, walidacja, atrapy researchu/grafu, zapis/odczyt. Nie realną historię ani zachowanie LLM |
| `tsc --noEmit --incremental false` | PASS, bez diagnostyk | Typy badanego runtime, nie semantykę daty |
| `generate-navigation-map.mjs --check` | PASS | Zgodność wygenerowanej mapy |
| `check-navigation-registry-change.mjs` | SKIP — bramka PR | Nie przedstawiamy jako zaliczonej weryfikacji PR |
| `validate-messages.mjs` | PASS: 5472 klucze PL i EN | Identyczna struktura kluczy, nie pełna akceptacja wizualna |
| Probe funkcji źródłowych | wykonany: 14 przypadków + 112 punktów rok/kraj na granicach | Braki manifestów, brak roku/kraju, niepoprawna data, pierwszeństwo roku, treść guardrails |
| Browser 4050 PL/EN, osobne profile | FAIL środowiska: zasoby JS/CSS/MIME | Obserwacja aktywnego builda; brak dowodu działającej ścieżki wyboru przygody |
| Browser 4057 PL/EN, świeża kopia | selektor obejrzany w obu językach | Render i treść katalogu, nie pełna sesja |
| Własna przygoda PL/EN, 4057 | PASS: brak roku/kraju blokuje; 1943/PL zapisane | Formularz i `adventure_context` w izolowanym localStorage; nie start sesji ani `worldSetup` |
| Kopia pełnego save w testach | PASS roundtrip i odtworzenie opcjonalnego bundle | Nie pełny UI→save→reload→kolejna narracja |
| Import prawdziwego PDF / realny research / portret | NIE WYKONANO | Brak wysyłania materiałów, kosztów i zmian danych gracza |
| Import syntetyczny PL/EN po wznowieniu | NIEWERYFIKOWANY: timeout, następnie odmowa połączenia | Próby nie dotarły do aplikacji; nie klasyfikujemy tego jako błędu importera |
| Zmiana daty w grze i ponowne instrukcje MG | częściowo: resolver/probe, statyczna ścieżka pipeline | Interakcyjny E2E z pełną rozgrywką nieweryfikowany |

Polecenie testów (cwd runtime):

```text
./node_modules/.bin/jest --runInBand src/lib/era src/lib/world-setup src/app/api/adventure/setup/route.test.ts src/lib/full-game-save-manager.test.ts src/hooks/useFullSave.test.tsx
./node_modules/.bin/tsc --noEmit --incremental false
node scripts/generate-navigation-map.mjs --check
node scripts/check-navigation-registry-change.mjs
node scripts/validate-messages.mjs
```

Kopia audytowa nie dostała kluczy API ani indeksu podręcznika. Test przeglądarkowy użył atrapy `recordCount:1` dla statusu zasad, co otworzyło ekran bez przetwarzania książki. Żądania zewnętrzne oraz nie-GET API były blokowane. Błędy `net::ERR_FAILED` w tej kopii obejmują celowo zablokowane zasoby — nie należy ich automatycznie uznać za błąd aplikacji. Nie wysyłano opublikowanych scenariuszy do modelu.

Artefakty w [evidence](evidence/): log Jest, wyniki probe, wyniki browser i obejrzane zrzuty. Zrzuty nie są pełną wizualną akceptacją wszystkich stanów. Pliki robocze ekstrakcji PDF pozostały poza repo. Inwentaryzacja obejmuje nazwy i metadane, nie kopie książek.

W formularzu własnej przygody PL i EN przycisk potwierdzenia był wyłączony przy pustych polach, przy samym kraju oraz przy samym roku. Po podaniu `1943`, `PL` i wybraniu noir zapis zachował dokładnie te dane. Zrzuty formularzy obejrzano. W EN zapis nadal zawiera polskie domyślne `hook`, `description` i `source`; to dodatkowa obserwacja do F13, nie dowód zmiany roku czy kraju.

Po wznowieniu izolowany serwer przestał odpowiadać: kontrolny HTTP timeout po 10 sekundach, zero odebranych bajtów. Potwierdzono cwd procesu 54877 w katalogu audytu, zatrzymano wyłącznie ten proces i podjęto jedną próbę wznowienia. Kolejna próba importu otrzymała `ERR_CONNECTION_REFUSED`. Po dwóch nieudanych próbach zakończono naprawy środowiska zgodnie z `aios-vibe-coder`. Raport nie ma pozytywnego wyniku importu, pełnej sesji ani interakcyjnego save/load. Dalszy test wymaga sprawnego, stabilnego środowiska audytowego; nie wymaga wysyłania prawdziwego PDF.

Końcowy log próby wznowienia: Next zakończył się kodem 1, zgłaszając istniejący serwer/blokadę PID 54877 w tym samym katalogu. Początkowy komunikat `Ready` nie oznaczał trwałej gotowości. Nie usuwano blokad ani katalogu builda, nie restartowano aplikacji użytkownika.

### Drugi przegląd ustaleń

Wykonano ponowną kontrolę wniosków względem kodu i probe, bez zewnętrznego recenzenta LLM. To druga kontrola tego samego audytora, nie niezależna certyfikacja.

- Skorygowano twierdzenie o „globalnym” pokryciu: pokazano konkretnie FR kontra US/PL.
- Rozdzielono zapis `worldSetup` od konsumpcji jego treści; zielony test roundtrip nie dowodzi tej drugiej.
- Ograniczono zarzut daty handoutu do nieużywanego helpera.
- Oddzielono wadliwy aktywny build od świeżej kopii źródeł.
- Odróżniono błędy blokowanej sieci od wyjątków aplikacji.
- Oddzielono placeholdery, prompty, syntezy, źródła pierwotne, dodatki i RAW; nie uznano numerów `[cite:n]` za samodzielne cytowania.
- Ponownie sprawdzono końce syntez PL komunikacji i gospodarki: zawierają bibliografie URL. Zarzut dotyczy braku potwierdzonego mapowania numerów na dowody i ich zakresu, nie całkowitego braku bibliografii. Automatyczne odrzucenie całej kolekcji byłoby nieuzasadnione.
- Nie zatwierdzono historycznych liczb, cen ani przepisów bez odtworzonego źródła. Nie nazwano wszystkich pustawych eksportów uszkodzonymi: to kandydaci do przeglądu.

## 8. Zalecana kolejność dalszych prac i decyzje PO

- Najpierw rozstrzygnąć, co oznacza „epoka wspierana”: poprawny kontekst, tryb neutralny czy historycznie zatwierdzony pakiet. Ustalić komunikaty i blokady dla każdego poziomu.
- Następnie ujednolicić przepływ: aktywny rok oddzielony od tła, kanoniczny kraj/region, semantyczna walidacja oraz ten sam pakiet dla wszystkich tur, RAG i save/load. Warunek odbioru: test finalnej instrukcji i porównanie stanu przed/po odczycie.
- Usunąć konflikt podwójnych rejestrów i starych presetów; dopiero wtedy wypełnić jeden wąski manifest. Kandydaci: USA 1925 (lepsza baza podręcznikowa) albo PL 2001/Głogów (jednoznaczny scenariusz i obszerna kolekcja wymagająca redakcji).
- Dodać dokładne granice dostępności i nakładki regionów; oddzielnie rozstrzygnąć 1940s, PRL1971 oraz współczesny fallback. Nie publikować pokrycia krajów, dla których istnieją tylko prompty.
- Podłączyć politykę do zawodów, wyposażenia, cen, portretów i obrazów. Trzymać reguły gry deterministycznie; zaakceptowane realia mają wspierać narrację.
- Zamknąć odbiór na świeżej paczce desktopowej: PL/EN, własna przygoda, import z atrapą, brak danych, granice, zmiana daty, pełny save/load i kolejna tura. Bez tego nie oznaczać issue jako ukończonego.

Decyzje regułowe/produktowe wymagające PO:

- Czy brak zatwierdzonego manifestu blokuje start, czy pozwala na jawny tryb ograniczony?
- Który dokładny rok jest bieżącą akcją Traszyna i jak użytkownik wybiera rok w pozostałych gotowych zakresach?
- Który mały pakiet zatwierdzamy jako pierwszy i kto zatwierdza źródła?
- Czy jakiekolwiek propozycje testów z syntez historycznych mają zostać wariantami zasad? Domyślnie nie są RAW.
- Jak traktujemy wątki dyskryminacji i przemocy historycznej w uzgodnieniach sesji, zamiast automatycznych kar postaci?

## 9. Nieprzebadane i niezatwierdzone

Nie przeczytano w całości 490 stron podręcznika ani wszystkich transkryptów i eksportów: wybrano rozdziały i materiały związane z zakresem. Nie wykonano pełnej weryfikacji teza-po-tezie wszystkich 1947 dodatkowych MD dwóch kolekcji. Nie odczytano wszystkich PDF w archiwach ZIP. `ONI`, `Krakowska Enigma`, `Trzeba karmić ogień` i pozostałe moduły mają status inwentaryzacji, nie pełnego przeglądu merytorycznego.

Nie zweryfikowano każdego pierwotnego URL ukrytego za cytowaniami syntez. Nie ma podstaw do uznania samych promptów za zakończony research. Pełna walidacja historyczna wszystkich epok pozostaje otwarta, podobnie jak wskazane braki E2E. Raport dokumentuje wykryte luki i wykonane badanie; **nie jest zgodą na publikację manifestów ani deklaracją pełnego wykonania wszystkich scenariuszy weryfikacyjnych z planu**.
