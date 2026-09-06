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
          description: 'Kawałek laku z odciśniętym symbolem trzech splecionych pętli (Żółty Znak).'
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

  return {
    id,
    title: `${template.themes[0]}: ${template.location.split(',')[0]}`,
    era: template.era,
    eraLabel: template.eraLabel,
    yearRange: template.year,
    location: template.location,
    country: template.country,
    tone: template.tone,
    themes: template.themes,
    suggestedOccupations: template.suggestedOccupations,
    suggestedArchetypes: template.suggestedArchetypes,
    hook: template.hook,
    description: template.playerTeaser,
    customDescription: template.description,
    estimatedSessions: '1-2 sesje',
    playerCount: '1-4 badaczy',
    difficulty: 'normal',
    isCustom: true,
    documentType: 'scenario',
    graph: template.graph,
  };
}
