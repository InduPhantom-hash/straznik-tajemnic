import { AdventureContext } from '../adventures-data';
import { AdventureGraph } from '../types';

export interface SurpriseAdventureSeed {
  era: 'classic' | 'gaslight' | 'noir' | 'prl' | 'modern';
  eraLabel: string;
  year: string;
  location: string;
  country: string;
  tone: 'purist' | 'pulp' | 'noir';
  themes: string[];
  mythosEntity: string;
  hook: string;
  playerTeaser: string;
  /** Bezspoilerowe dossier wprowadzające dla Badacza */
  investigatorIntro?: string;
  /** Autorskie ciekawostki historyczne, prawne i obyczajowe epoki */
  settingTrivia?: string[];
  description: string;
  suggestedOccupations: string[];
  suggestedArchetypes: string[];
  graph: AdventureGraph;
}

const SEED_TEMPLATES: SurpriseAdventureSeed[] = [
  {
    era: 'classic',
    eraLabel: 'Klasyczne lata 20. (USA)',
    year: '1925',
    location: 'Arkham, Massachusetts',
    country: 'USA',
    tone: 'purist',
    themes: ['Zaginięcie', 'Zakazany antykwariat', 'Kult Cthulhu', 'Mroźna zima'],
    mythosEntity: 'Hastur / Żółty Znak',
    hook: 'W mroźny listopadowy poranek w witrynie antykwariatu na French Hill pojawia się niezwykły, opalizujący kamień. Właściciel przepadł bez śladu, zostawiając otwarty sejf i świeże ślady pazurów na deskach podłogi.',
    playerTeaser: 'Zostajecie wezwani do zabytkowego antykwariatu w Arkham przez zaniepokojoną rodzinę właściciela. Sklep jest pusty, w powietrzu unosi się zapach ozonu, a w piwnicy słychać cichy, jednostajny stukot.',
    investigatorIntro: 'List z prośbą o pomoc od córki antykwariusza zastaje Was w chłodny listopadowy poranek. Jej ojciec, szanowany marszand z French Hill, zniknął bez śladu z zamkniętego od wewnątrz sklepu, pozostawiając jedynie porozrzucane tomy i dziwny zapach ozonu. Zgłaszacie się na miejsce, by zbadać opuszczony lokal, nim sprawą zainteresuje się policja z Arkham.',
    settingTrivia: [
      'W 1925 roku w stanie Massachusetts obowiązuje rygorystyczna prohibicja federalna (Ustawa Volsteada); alkohol można nabyć legalnie jedynie na receptę lekarską lub w celach obrzędowych.',
      'Policja w Arkham korzysta z pieszych patroli i budek telefonicznych z bezpośrednim łączem do komisariatu; łączność radiowa w radiowozach pojawi się w policji dopiero w latach 30.',
      'Miskatonic University to zamknięta społeczność akademicka o surowym rygorze; wstęp do Zbiorów Specjalnych biblioteki uniwersyteckiej wymaga pisemnej rekomendacji dziekana wydziału.'
    ],
    description: 'Śledztwo w sprawie zniknięcia antykwariusza Ephraima Vance’a, który nieświadomie wszedł w posiadanie rękopisu "Króla w Żółci". Wątki prowadzą przez korytarze Uniwersytetu Miskatonic aż po zapomniane tunele pod cmentarzem Meadow Hill.',
    suggestedOccupations: ['Dziennikarz', 'Antykwariusz', 'Profesor uniwersytecki', 'Prywatny detektyw'],
    suggestedArchetypes: ['Dociekliwy uczony', 'Sceptyczny śledczy', 'Śmiałek'],
    graph: {
      npcs: [
        {
          id: 'npc-1',
          name: 'Eleanor Vance',
          description: 'Córka zaginionego antykwariusza, wykształcona w Bostonie, przerażona nocnymi wizjami ojca.',
          secret: 'Widziała ojca rysującego Żółty Znak własną krwią na wewnętrznej stronie szafy.',
          statsSummary: 'STR 45, CON 50, SIZ 40, DEX 60, INT 75, POW 70, CHA 65, HP 9, SAN 60'
        },
        {
          id: 'npc-2',
          name: 'Prof. Warren Rice',
          description: 'Wykładowca języków starożytnych na Miskatonic University, dawny przyjaciel rodziny.',
          secret: 'Kupował od Ephraima podejrzane gliniane tabliczki z Bliskiego Wschodu.',
          statsSummary: 'STR 40, CON 45, SIZ 65, DEX 50, INT 85, POW 60, CHA 55, HP 11, SAN 50'
        },
        {
          id: 'npc-3',
          name: 'Silas "Kulawy" Drake',
          description: 'Nocny stróż w dokach nad rzeką Miskatonic, weteran Wielkiej Wojny.',
          secret: 'Przekupił go nieznajomy w jedwabnym turbanie, by wpuścił nocą skrzynię bez inspekcji celnej.',
          statsSummary: 'STR 70, CON 65, SIZ 75, DEX 45, INT 50, POW 40, CHA 40, HP 14, SAN 35'
        }
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Antykwariat Vance & Son',
          description: 'Ciemne, przeładowane książkami pomieszczenie przy French Hill w Arkham.',
          atmosphere: 'Zapach starego papieru, kurzu i metalicznego posmaku ozonu.'
        },
        {
          id: 'loc-2',
          name: 'Magazyn nr 4 w Dokach Miskatonic',
          description: 'Zbutwiały, drewniany skład rybny i ładunków morskich spowity gęstą mgłą.',
          atmosphere: 'Skrzypienie belek, odgłos pluskającej rzeki i odór gnijących wodorostów.'
        },
        {
          id: 'loc-3',
          name: 'Krypta rodziny Vance na Cmentarzu Meadow Hill',
          description: 'Kamienny grobowiec z XIX wieku z podważoną płytą wejściową.',
          atmosphere: 'Grobowy chłód, wilgoć ściekająca po murach, dziwne symbole wyryte w granicie.'
        }
      ],
      clues: [
        {
          id: 'clue-1',
          name: 'Dziennik z ołowianą oprawą',
          description: 'Notatki antykwariusza opisujące senne koszmary o mieście Carcosa i tajemniczym kupcu z Bostonu.'
        },
        {
          id: 'clue-2',
          name: 'Bilet na poranny pociąg bostoński',
          description: 'Skasowany wczoraj w nocy, z odręczną adnotacją: "Magazyn 4, przed północą".'
        },
        {
          id: 'clue-3',
          name: 'Znak w wosku pieczętnym',
          description: 'Kawałek laku z odciśniętym niepokojącym, wijącym się hieroglifem (Żółty Znak z Carcosy).'
        }
      ],
      connections: [
        {
          fromId: 'loc-1',
          toId: 'clue-1',
          description: 'Ukryty za podwójnym dnem biurka w kantorze antykwariatu.'
        },
        {
          fromId: 'clue-1',
          toId: 'loc-2',
          description: 'Wpisy jednoznacznie wskazują na spotkanie w dokach nad rzeką.'
        },
        {
          fromId: 'loc-2',
          toId: 'npc-3',
          description: 'Nocny stróż pilnuje wejścia i pamięta podejrzany ładunek.'
        },
        {
          fromId: 'npc-3',
          toId: 'loc-3',
          description: 'Zeznaje, że wóz z ładunkiem odjechał w kierunku cmentarza Meadow Hill.'
        }
      ]
    }
  },
  {
    era: 'gaslight',
    eraLabel: 'Wiktoriańska Anglia (Gaslight)',
    year: '1892',
    location: 'Londyn, Whitechapel i City',
    country: 'Wielka Brytania',
    tone: 'noir',
    themes: ['Kłęby smogu', 'Tajne bractwo', 'Medycyna eksperymentalna', 'Kradzież zwłok'],
    mythosEntity: 'Nyarlathotep / Czarny Faraon',
    hook: 'W gęstej londyńskiej mgle na nabrzeżu Tamizy wyłowiono ciało młodego dżentelmena. Z jego klatki piersiowej chirurgicznie wycięto serce, wkładając w jego miejsce mechanizm zegarowy z brązu.',
    playerTeaser: 'Inspektor ze Scotland Yardu prosi Was o dyskretną pomoc w sprawie morderstwa powiązanego z elitarnym klubem dżentelmenów w Mayfair. Ciało ofiary nosi nienaturalne ślady.',
    investigatorIntro: 'Dyskretna depesza od inspektora Scotland Yardu wzywa Was do prywatnego gabinetu przy Whitehall. Na nabrzeżu Tamizy odnaleziono zwłoki młodego arystokraty powiązanego z elitarnym klubem w Mayfair, a sprawa grozi skandalem towarzyskim. Waszym zadaniem jest wyjaśnienie ostatnich kontaktów ofiary bez alarmowania prasy brukowej.',
    settingTrivia: [
      'W wiktoriańskim Londynie pozycja społeczna i akcent decydują o wiarygodności świadka; wejście do klubu dżentelmenów w Mayfair bez rekomendacji członka jest niemożliwe dla osób spoza wyższych sfer.',
      'Ustawa o anatomii (Anatomy Act) zakazuje sekcji zwłok bez zgody rodziny lub urzędnika, co napędza nielegalny handel ciałami ze szpitalnych kostnic dla prywatnych laboratoriów.',
      'Ulice oświetlają latarnie gazowe zapalane o zmierzchu przez latarników; w gęstym smogu (tzw. grochówce) widoczność spada do kilkunastu cali, tłumiąc dźwięki kroków i dorożek konnych.'
    ],
    description: 'Mroczne śledztwo w wiktoriańskim Londynie, gdzie nielegalne sekcje zwłok i badania nad ożywianiem tkanek krzyżują się z kultem egipskiego bóstwa zwanego Królem Ciszy.',
    suggestedOccupations: ['Lekarz / Chirurg', 'Dziennikarz śledczy', 'Konsultant Scotland Yardu', 'Arystokrata'],
    suggestedArchetypes: ['Genialny dedukcjonista', 'Lekarz polowy', 'Mól książkowy'],
    graph: {
      npcs: [
        {
          id: 'npc-1',
          name: 'Dr Archibald Sterling',
          description: 'Ceniony chirurg ze szpitala St. Jude, członek Królewskiego Towarzystwa Medycznego.',
          secret: 'Używa esencji mumii z wykopalisk w Sakkarze do prób ożywiania martwych nerwów.',
          statsSummary: 'STR 50, CON 55, SIZ 60, DEX 70, INT 85, POW 65, CHA 60, HP 11, SAN 45'
        },
        {
          id: 'npc-2',
          name: 'Lady Beatrice Windermere',
          description: 'Wpływowa patronka sztuki, gospodyni cotygodniowych seansów spirytystycznych.',
          secret: 'Jest wysoką kapłanką Bractwa Czarnego Faraona w Londynie.',
          statsSummary: 'STR 35, CON 50, SIZ 45, DEX 55, INT 80, POW 85, CHA 80, HP 9, SAN 40'
        }
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Klub Dżentelmenów Pod Czarnym Pawiem',
          description: 'Dyskretny lokal w bocznej uliczce Mayfair, obity mahoniem i ciężkim aksamitem.',
          atmosphere: 'Dym z cygar, szmer przyciszonych rozmów i chłodne spojrzenia lokajów.'
        },
        {
          id: 'loc-2',
          name: 'Prywatne prosektorium St. Jude',
          description: 'Podziemia wiktoriańskiego szpitala oświetlane syczącymi lampami gazowymi.',
          atmosphere: 'Ostry zapach kwasu karbolowego, formaliny i chłód kamiennych stołów.'
        }
      ],
      clues: [
        {
          id: 'clue-1',
          name: 'Zegarkowy mechanizm z hieroglifami',
          description: 'Brązowy cylinder z wyrytymi symbolami bóstwa nocy i miniaturową pieczęcią jubilerską.'
        },
        {
          id: 'clue-2',
          name: 'List z pogróżkami na czerpanym papierze',
          description: 'Podpisany inicjałem "B.W.", nakazujący natychmiastowe zniszczenie próbek tkanki.'
        }
      ],
      connections: [
        {
          fromId: 'loc-1',
          toId: 'clue-1',
          description: 'Mechanizm został zamówiony przez członka klubu u zegarmistrza w Soho.'
        },
        {
          fromId: 'clue-1',
          toId: 'loc-2',
          description: 'Ślady narzędzi chirurgicznych prowadzą wprost do prosektorium dr Sterlinga.'
        }
      ]
    }
  },
  {
    era: 'noir',
    eraLabel: 'Lata 30./40. (Cthulhu Noir)',
    year: '1937',
    location: 'Chicago / Lake Michigan',
    country: 'USA',
    tone: 'noir',
    themes: ['Gangsterzy', 'Przemyt alkoholu', 'Głęboki deszcz', 'Dagon / Istoty z Głębin'],
    hook: 'Ciężarówka z nielegalnym alkoholem należąca do syndykatu Capone’a wpada do zamarzniętego jeziora Michigan. Z ładunku nie ocalała ani jedna butelka, za to na lodzie znaleziono zmasakrowane ciała strażników z błonami pławnymi.',
    playerTeaser: 'Prywatny detektyw otrzymuje zlecenie od prawnika rodziny jednego ze strażników konwoju. Sprawa miała dotyczyć zwykłej porachunki mafijnej, lecz rany ofiar nie pochodzą od kul Tommy Guna.',
    investigatorIntro: 'Adwokat reprezentujący rodziny robotników portowych z Calumet składa na Waszym biurku grubą kopertę z zaliczką. Oficjalna wersja policji mówi o wypadku ciężarówki i utonięciu konwojentów w lodowatych wodach jeziora Michigan, lecz rodziny twierdzą, że ciała nosiły ślady nienaturalnych ran szarpanych. Musicie ustalić prawdę, nim sprawę zatuszują ludzie z syndykatu.',
    settingTrivia: [
      'W 1937 roku Chicago wciąż odczuwa skutki Wielkiego Kryzysu; po zniesieniu prohibicji dawne gangi przemytnicze przekształciły się w zorganizowane syndykaty kontrolujące porty, doki i związki zawodowe.',
      'Korupcja w policji miejskiej jest powszechna, a detektywi bez formalnej licencji lub kontaktów w ratuszu ryzykują natychmiastowe aresztowanie pod zarzutem włóczęgostwa lub utrudniania śledztwa.',
      'Doki i baseny portowe rzeki Calumet to niebezpieczna strefa przemysłowa; zimą krążące kry lodowe i odpady hutnicze uniemożliwiają skuteczną pracę nurków policyjnych.'
    ],
    description: 'Skrzyżowanie gangsterskich porachunków z koszmarem morskiego kultu w deszczowym, zadymionym Chicago u schyłku Wielkiego Kryzysu.',
    suggestedOccupations: ['Prywatny detektyw', 'Zdemobilizowany żołnierz', 'Kierowca syndykatu', 'Patolog policyjny'],
    suggestedArchetypes: ['Twardziel z zasadami', 'Sprytny kombinator', 'Zimnokrwisty rewolwerowiec'],
    mythosEntity: 'Dagon / Istoty z Głębin (Deep Ones)',
    graph: {
      npcs: [
        {
          id: 'npc-1',
          name: 'Tommy "Dwa Palce" Moretti',
          description: 'Caporegime kontrolujący składy nad jeziorem, blady, nerwowo pocierający kark.',
          secret: 'Jego babka pochodziła z Innsmouth; pod koszulą zaczynają mu rosnąć rybie łuski.',
          statsSummary: 'STR 65, CON 70, SIZ 70, DEX 55, INT 60, POW 50, CHA 45, HP 14, SAN 40'
        }
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Przystań Rybacka Calumet',
          description: 'Rdzewiejące kutry i drewniane pomosty skute ciemnym lodem.',
          atmosphere: 'Zapach stęchlizny, rybich wnętrzności i deszczu ze śniegiem bębniącego o blachę.'
        }
      ],
      clues: [
        {
          id: 'clue-1',
          name: 'Łuska z zielonkawego złota',
          description: 'Płytka o dziwnej metalurgii, niewpisująca się w żadne znane stopy metali.'
        }
      ],
      connections: [
        {
          fromId: 'loc-1',
          toId: 'clue-1',
          description: 'Znaleziona w sieci wyciągniętej z przerębli przy pomoście.'
        }
      ]
    }
  },
  {
    era: 'prl',
    eraLabel: 'Polska Rzeczpospolita Ludowa (PRL 1976)',
    year: '1976',
    location: 'Gdynia, Port i Oksywie',
    country: 'Polska',
    tone: 'purist',
    themes: ['Port morski', 'Kontrabanda', 'Służba Bezpieczeństwa', 'Bałtycka mgła'],
    mythosEntity: 'Cthulhu / Pomiot Głębin',
    hook: 'W basenie portowym w Gdyni rybacy z kutra dalekomorskiego wyławiają z sieci dziwną, pokrytą glonami skrzynię z radzieckimi plombami wojskowymi. Szyper kutra znika w nocy z hotelu garnizonowego, a kapitanat portu ogłasza stan podwyższonej gotowości.',
    playerTeaser: 'Zostajecie poproszeni przez zaufanego inżyniera portowego o wyjaśnienie nocnego incydentu w basenie przeładunkowym. Teren wokół magazynów patroluje Milicja Obywatelska, a w sprawę angażują się funkcjonariusze Służby Bezpieczeństwa.',
    investigatorIntro: 'Inżynier z kapitanatu portu w Gdyni prosi Was o pilne spotkanie w kawiarni przy Skwerze Kościuszki. Podczas nocnego rozładunku kutra doszło do incydentu, po którym zniknął szyper jednostki, a nabrzeże zostało odcięte przez WOP i Milicję. Musicie dowiedzieć się, co naprawdę sprowadzono z morskiego rejsu, zanim SB obejmie sprawę klauzulą tajemnicy państwowej.',
    settingTrivia: [
      'W PRL lat 70. cała strefa portowa i pas nadmorski podlegają Wojskom Ochrony Pogranicza (WOP); wstęp na nabrzeże wymaga specjalnej przepustki imiennej i dowodu osobistego.',
      'Milicja Obywatelska i SB stosują stały nadzór nad obywatelami; prowadzenie prywatnego dochodzenia grozi zatrzymaniem na 48 godzin pod zarzutem szpiegostwa lub sabotażu gospodarczego.',
      'Legalna łączność z zagranicą i połączenia międzymiastowe podlegają kontroli central telefonicznych Poczty Polskiej; prywatne telefony na wybrzeżu są powszechnie podsłuchiwane.'
    ],
    description: 'Śledztwo w scenerii gierkowskiego Trójmiasta. Wątki łączą morską kontrabandę, tajne eksperymenty oceanograficzne i starożytny kult wód Bałtyku z opresyjnym aparatem państwowym PRL.',
    suggestedOccupations: ['Inżynier portowy', 'Lekarz zakładowy', 'Oficer Marynarki Handlowej', 'Dziennikarz Głosu Wybrzeża'],
    suggestedArchetypes: ['Dociekliwy obserwator', 'Doświadczony specjalista', 'Sceptyk'],
    graph: {
      npcs: [
        {
          id: 'npc-1',
          name: 'Inż. Zygmunt Brzeski',
          description: 'Główny dyspozytor techniczny nabrzeża w Gdyni, członek PZPR, zaniepokojony uszkodzeniami żurawia.',
          secret: 'Dostrzegł organiczny śluz i ludzkie szczątki wewnątrz zgniecionej ładowni kutra.',
          statsSummary: 'STR 55, CON 60, SIZ 65, DEX 50, INT 80, POW 55, CHA 60, HP 12, SAN 55'
        },
        {
          id: 'npc-2',
          name: 'Kpt. Marian Korda (SB)',
          description: 'Oficer Wydziału II SB ds. zabezpieczenia portu, małomówny, w skórzanym płaszczu.',
          secret: 'Realizuje ściśle tajny rozkaz z Warszawy nakazujący przejęcie i ukrycie ładunku przed marynarką wojenną.',
          statsSummary: 'STR 65, CON 65, SIZ 70, DEX 60, INT 75, POW 70, CHA 50, HP 13, SAN 45'
        }
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Nabrzeże Francuskie, Basen IV w Gdyni',
          description: 'Betonowe molo portowe otoczone dźwigami bramowymi, spowite zimną morską mgłą.',
          atmosphere: 'Ryk syren okrętowych, skrzyp lin dźwigowych i zapach oleju napędowego zmieszany z gnijącą solanką.'
        },
        {
          id: 'loc-2',
          name: 'Magazyn Celny nr 12 na Oksywiu',
          description: 'Zamknięty skład wojskowy z czasów międzywojennych, pilnowany przez uzbrojonych wartowników WOP.',
          atmosphere: 'Ciemność, zapach stęchłego betonu i rytmiczne, metaliczne uderzenia dochodzące ze skrzyni.'
        }
      ],
      clues: [
        {
          id: 'clue-1',
          name: 'Manifest ładunkowy z fałszywym stemplem',
          description: 'Karta załadunku deklarująca części maszyn rolniczych, ze stemplem radzieckiej stacji polarnej na Nowej Ziemi.'
        },
        {
          id: 'clue-2',
          name: 'Notatka szypra na bibułce papierosowej',
          description: 'Pośpieszny zapis współrzędnych geograficznych na Bałtyku z dopiskiem: "To nie była łódź podwodna, to miało oczy".'
        }
      ],
      connections: [
        {
          fromId: 'loc-1',
          toId: 'clue-1',
          description: 'Znaleziony w dyżurce dyspozytora pośpiesznie opuszczonej w nocy.'
        },
        {
          fromId: 'clue-1',
          toId: 'loc-2',
          description: 'Dokument wskazuje Magazyn 12 jako miejsce docelowe depozytu SB.'
        }
      ]
    }
  },
  {
    era: 'modern',
    eraLabel: 'Współczesność (Polska 2024)',
    year: '2024',
    location: 'Wetlina i Dolina Sanu, Bieszczady',
    country: 'Polska',
    tone: 'purist',
    themes: ['Dzikie ostępy', 'Zaginięcie turystów', 'Opuszczona cerkiew', 'Pradawny kult lasu'],
    mythosEntity: 'Shub-Niggurath / Czarne Kozły',
    hook: 'Grupa studentów geologii badająca relikty dawnych bieszczadzkich wsi nie wraca ze szlaku w dolinie Górnego Sanu. W ich porzuconym aucie terenowym ratownicy GOPR odnajdują rejestrator dźwięku z nagranymi nieludzkimi rytmami z głębi lasu.',
    playerTeaser: 'Rodzina zaginionych prosi Was o dołączenie do poszukiwań w Bieszczadzkim Parku Narodowym. Oficjalna akcja GOPR i policji skupia się na granicy, lecz odnalezione ślady prowadzą ku zarośniętym ruinom wysiedlonej w 1947 roku wsi.',
    investigatorIntro: 'Rodzina dwójki studentów geologii wynajmuje Was po tym, jak ich dzieci przestały odpowiadać na wiadomości podczas wyprawy w dolinę Górnego Sanu. Służby ratunkowe podejrzewają wypadek w górach lub nielegalne przekroczenie granicy, lecz ostatnie przesłane zdjęcie satelitarne wskazuje na nieoznaczony krąg kamienny ukryty w gęstwinie rezerwatu.',
    settingTrivia: [
      'W przygranicznych dolinach Bieszczadów zasięg sieci komórkowej niemal całkowicie zanika; nowoczesne smartfony tracą połączenie z nadajnikami BTS, uniemożliwiając wezwanie natychmiastowej pomocy.',
      'Pas drogi granicznej jest ściśle monitorowany przez Straż Graniczną za pomocą kamer termowizyjnych i czujników sejsmicznych; wejście na zamknięte obszary bez zgody grozi natychmiastową interwencją patrolu.',
      'Tereny wysiedlonych po wojnie wsi są zarośnięte buczyną karpacką; jedynymi punktami orientacyjnymi w głębokim lesie są zdziczałe sady, podmurówki cerkwi i stare krzyże przydrożne.'
    ],
    description: 'Współczesny thriller śledczy w odciętych od świata zakątkach Bieszczadów, gdzie nowoczesna technologia GPS i drony zawodzą w starciu z pierwotną grozą prastarej puszczy.',
    suggestedOccupations: ['Ratownik GOPR', 'Geolog / Badacz', 'Prywatny detektyw', 'Przewodnik górski'],
    suggestedArchetypes: ['Człowiek czynu', 'Dociekliwy naukowiec', 'Twardy traper'],
    graph: {
      npcs: [
        {
          id: 'npc-1',
          name: 'Tomasz Jaworski (GOPR)',
          description: 'Doświadczony starszy ratownik bieszczadzkiej grupy GOPR, zna każdy jar w pasmie granicznym.',
          secret: 'Odnalazł w lesie aparat z kartą pamięci zniekształconą przez promieniowanie nieznanego pochodzenia.',
          statsSummary: 'STR 65, CON 70, SIZ 75, DEX 65, INT 70, POW 60, CHA 65, HP 14, SAN 60'
        },
        {
          id: 'npc-2',
          name: 'Olga Berezowska',
          description: 'Lokalna przewodniczka i etnografka badająca folklor bojkowski, mieszka na skraju Wetliny.',
          secret: 'Jej prababka ostrzegała w zapiskach przed "Tą, Która Karmi Korzenie" pod Połoniną Caryńską.',
          statsSummary: 'STR 45, CON 50, SIZ 50, DEX 60, INT 85, POW 75, CHA 70, HP 10, SAN 50'
        }
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Opuszczone uroczysko wsi Caryńskie',
          description: 'Zdziczała polana w dolinie potoku, porosła starymi jabłoniami, ze zrujnowaną kamienną kaplicą.',
          atmosphere: 'Grobowa cisza, brak śpiewu ptaków i woń gnijącego mchu oraz czarnej próchnicy.'
        },
        {
          id: 'loc-2',
          name: 'Stacja Badań Glebowych PAN w Ustrzykach Górnych',
          description: 'Niewielki budynek laboratoryjny wyposażony w komputery polowe, mikroskopy i mapy satelitarne.',
          atmosphere: 'Szum wiatraków chłodzących, migające ekrany i sterty próbek ziemi o nienaturalnie smolistej barwie.'
        }
      ],
      clues: [
        {
          id: 'clue-1',
          name: 'Dyktafon ratowników GOPR',
          description: 'Cyfrowy rejestrator audio; ostatnie nagranie zawiera szum wiatru przerywany nieludzkim, gardłowym zaśpiewem.',
          isRedHerring: false
        },
        {
          id: 'clue-2',
          name: 'Fragment mapy satelitarnej z GPS',
          description: 'Zrzut ekranu z oznaczonym punktem anomalii magnetycznej w wąwozie za starym cmentarzem w Caryńskim.',
          isRedHerring: false
        }
      ],
      connections: [
        {
          fromId: 'loc-1',
          toId: 'clue-1',
          description: 'Dyktafon leżał w poszyciu obok porzuconego plecaka ze złamanym statywem.'
        },
        {
          fromId: 'clue-1',
          toId: 'loc-2',
          description: 'Analiza pasma dźwięku w stacji badawczej ujawnia infradźwięki generowane głęboko pod ziemią.'
        }
      ]
    }
  }
];

export function generateSurpriseAdventure(preferredEra?: string): AdventureContext {
  const matching = preferredEra && preferredEra !== 'custom'
    ? SEED_TEMPLATES.filter((s) => s.era === preferredEra)
    : SEED_TEMPLATES;
  
  const template = matching.length > 0
    ? matching[Math.floor(Math.random() * matching.length)]
    : SEED_TEMPLATES[0];

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = `custom-surprise-${template.era}-${randomSuffix}`;
  const parsedYear = Number.parseInt(template.year.match(/\b\d{4}\b/)?.[0] || '1925', 10);

  return {
    id,
    title: `${template.themes[0]}: ${template.location.split(',')[0]}`,
    era: template.era,
    eraLabel: template.eraLabel,
    yearRange: template.year,
    activeSceneYear: parsedYear,
    location: template.location,
    country: template.country,
    tone: template.tone,
    themes: template.themes,
    suggestedOccupations: template.suggestedOccupations,
    suggestedArchetypes: template.suggestedArchetypes,
    hook: template.hook,
    description: template.playerTeaser,
    investigatorIntro: template.investigatorIntro || template.playerTeaser,
    settingTrivia: template.settingTrivia,
    customDescription: template.description,
    estimatedSessions: '1-2 sesje',
    playerCount: '1-4 badaczy',
    difficulty: 'normal',
    isCustom: true,
    documentType: 'scenario',
    graph: template.graph,
  };
}
