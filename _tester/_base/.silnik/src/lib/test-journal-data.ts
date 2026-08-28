import { ExtendedJournalEntry } from '@/components/ui/session-journal';
import { EvidenceNode, EvidenceRelation } from '@/types/investigator-board';

export const MOCK_JOURNAL_ENTRIES: ExtendedJournalEntry[] = [
  // ------------------------------------------------------------------
  // 1. MISJE I CELE ŚLEDZTWA (Quests)
  // ------------------------------------------------------------------
  {
    id: 'test_quest_1',
    type: 'quest',
    title: 'Tajemnica Domu Corbitta',
    content:
      'Pan Stephen Knott poprosił o zbadanie starych ruin i kamienicy Corbitta w Bostonie przy Harrison Street. Poprzedni lokatorzy popadli w gwałtowny obłęd lub ponieśli tragiczną śmierć. Należy ustalić źródło mrocznej siły nawiedzającej dom oraz sprawdzić, czy pogłoski o nieumarłym okultyście są prawdziwe.',
    questStatus: 'active',
    category: 'Badania',
    inGameDate: '21 Lipca 1926',
    gameDay: 2,
    gameHour: 14,
    tags: ['Misja', 'Corbitt', 'Boston', 'Śledztwo', 'Okultyzm'],
    investigatorInsight:
      'Konstrukcja piwnicy nie odpowiada oficjalnym planom miejskim z 1880 r. Pusta przestrzeń za wschodnią ścianą może kryć sarkofag lub ołtarz zmarłego okultysty.',
    objectives: [
      {
        id: 'obj_1',
        description: 'Przeszukaj piwnicę i sprawdź zamurowaną wschodnią ścianę',
        completed: false,
        gameDay: 2,
        gameHour: 15,
      },
      {
        id: 'obj_2',
        description: 'Przeprowadź wywiad z sąsiadami i zleceniodawcą panem Knottem',
        completed: true,
        dateCompleted: '21.07.1926',
        gameDay: 1,
        gameHour: 11,
      },
      {
        id: 'obj_3',
        description: 'Odnajdź dziennik Waltera Corbitta w Archiwum Miskatonic',
        completed: true,
        dateCompleted: '21.07.1926',
        gameDay: 1,
        gameHour: 16,
      },
    ],
  },
  {
    id: 'test_quest_2',
    type: 'quest',
    title: 'Rytuał pod Srebrną Poświatą',
    content:
      'Lokalna policja złożyła raport o tajemniczych nocnych zgromadzeniach w lasach na zachód od Arkham. Obserwatorzy twierdzą, że widziano postacie w szatach śpiewające w zapomnianym języku wokół monolitycznego głazu.',
    questStatus: 'completed',
    category: 'Walka',
    inGameDate: '18 Lipca 1926',
    gameDay: 1,
    gameHour: 23,
    tags: ['Kult', 'Arkham', 'Rytuał', 'Las'],
    investigatorInsight:
      'Kultyści używali szat ze znakiem rybiego oka rodziny Marshów z Innsmouth. Krąg został rozbity, lecz główny kapłan zdołał uciec w głąb bagien.',
    objectives: [
      {
        id: 'obj_21',
        description: 'Zlokalizuj leśną polanę i przerwij odprawianie bluźnierczego rytuału',
        completed: true,
        dateCompleted: '18.07.1926',
        gameDay: 1,
      },
      {
        id: 'obj_22',
        description: 'Zabezpiecz rytualny sztylet i pergamin z intonacją',
        completed: true,
        dateCompleted: '18.07.1926',
        gameDay: 1,
      },
    ],
  },
  {
    id: 'test_quest_3',
    type: 'quest',
    title: 'Ocalenie Rękopisu von Junzta',
    content:
      'Zabezpieczenie niemieckiego wydania "Unaussprechlichen Kulten" przed wysłannikami Bractwa Czarnego Faraona, którzy zinfiltrowali magazyn biblioteczny.',
    questStatus: 'failed',
    category: 'Badania',
    inGameDate: '15 Lipca 1926',
    gameDay: 1,
    gameHour: 4,
    tags: ['Księgi', 'Porażka', 'Pożar', 'Miskatonic'],
    investigatorInsight:
      'Ogień strawił większość stron woluminu. Ocalał jedynie zwęglony fragment spisu kapłanów i pieczęć z symbolem Żółtego Znaku.',
    objectives: [
      {
        id: 'obj_31',
        description: 'Uprzedź kustosza biblioteki przed nocnym włamaniem',
        completed: false,
        gameDay: 1,
      },
      {
        id: 'obj_32',
        description: 'Ugaś pożar w dziale rzadkich starodruków',
        completed: false,
        gameDay: 1,
      },
    ],
  },

  // ------------------------------------------------------------------
  // 2. ENCYKLOPEDIA / AKTA SPRAWY (NPC, Miejsca, Przedmioty)
  // ------------------------------------------------------------------
  {
    id: 'test_encyclo_1',
    type: 'npc',
    title: 'Profesor Henry Armitage',
    content:
      'Kustosz i dyrektor biblioteki Uniwersytetu Miskatonic w Arkham. Człowiek o wybitnej wiedzy lingwistycznej i głębokiej znajomości zakazanych ksiąg. Twierdzi, że Wilbur Whateley próbował wypożyczyć lub skopiować fragmenty z oryginalnego wyciągu z łacińskiego Necronomiconu.',
    category: 'Spotkania',
    imageUrl: '/portraits/predefined/archibald-blackwood.webp',
    inGameDate: '20 Lipca 1926',
    tags: ['NPC', 'Miskatonic', 'Armitage', 'Sojusznik', 'Profesor'],
    investigatorInsight:
      'Armitage wie znacznie więcej o incydencie w Dunwich niż ujawnia władzom. W dolnej szufladzie biurka ukrywa przetłumaczone zaklęcie odpędzające byty z innego wymiaru.',
  },
  {
    id: 'test_encyclo_2',
    type: 'npc',
    title: 'Walter Corbitt',
    content:
      'Buntowniczy okultysta, były właściciel kamienicy przy Harrison Street. Oficjalnie uznany za zmarłego w 1866 roku, lecz sąsiedzi wciąż słyszą szuranie i mamrotanie dochodzące spod podłogi parteru. Jego testament zawierał zapis o pochówku "we własnej piwnicy zgodnie z obrządkiem Pana Przeklętych".',
    category: 'Spotkania',
    imageUrl: '/portraits/predefined/henry-whitman.webp',
    inGameDate: '21 Lipca 1926',
    tags: ['NPC', 'Podejrzany', 'Okultysta', 'Nieumarły', 'Corbitt'],
    investigatorInsight:
      'Corbitt nie spoczywa w grobie - wykorzystał nekromantyczny rytuał przedłużenia egzystencji. Jego ciało czerpie energię ze strachu mieszkańców domu.',
  },
  {
    id: 'test_encyclo_3',
    type: 'npc',
    title: 'Seraphina Marsh',
    content:
      'Wpływowa dziedziczka rodu Marshów z Innsmouth. Niezwykle powściągliwa, o charakterystycznych wyłupiastych oczach i matowej cerze. Finansuje podejrzane wyprawy rybackie w rejon Rafy Diabelskiej.',
    category: 'Spotkania',
    imageUrl: '/portraits/predefined/seraphina-marsh.webp',
    inGameDate: '19 Lipca 1926',
    tags: ['NPC', 'Innsmouth', 'Kult', 'Podejrzany', 'Marsh'],
    investigatorInsight:
      'Podczas przesłuchania nie mrugała powiekami i nerwowo osłaniała kołnierz sukni, jakby ukrywała skrzela lub blizny po transformacji Istot z Głębin.',
  },
  {
    id: 'test_encyclo_4',
    type: 'location',
    title: 'Dom Corbitta (Harrison St., Boston)',
    content:
      'Wzniesiona z ciemnej cegły, podniszczona kamienica w bostońskiej dzielnicy portowej. Wnętrze przesiąknięte jest zapachem stęchłego drewna i ozonu. Meble na pierwszym piętrze same zmieniają położenie, a temperatura w piwnicy spada poniżej zera.',
    category: 'Badania',
    inGameDate: '21 Lipca 1926',
    tags: ['Lokalizacje', 'Boston', 'Nawiedzenie', 'Piwnica'],
    investigatorInsight:
      'Z zewnątrz budynek posiada trzy okna na piętrze, lecz od środka widać cztery wnęki. Nieeuklidesowa geometria ścian tłumi ludzkie krzyki i zniekształca perspektywę.',
  },
  {
    id: 'test_encyclo_5',
    type: 'location',
    title: 'Biblioteka Uniwersytetu Miskatonic',
    content:
      'Gotycki, kamienny gmach w sercu Arkham. Miejsce przechowywania najrzadszych i najbardziej niebezpiecznych woluminów na świecie, chronionych w sejfie działu cymeliów i ksiąg zakazanych.',
    category: 'Badania',
    inGameDate: '20 Lipca 1926',
    tags: ['Lokalizacje', 'Arkham', 'Miskatonic', 'Biblioteka', 'Necronomicon'],
    investigatorInsight:
      'Sejf ze starodrukami chroniony jest potrójnym zamkiem baskwilowym. Klucz do wewnętrznej kraty posiada wyłącznie kustosz Armitage.',
  },
  {
    id: 'test_encyclo_6',
    type: 'item',
    title: 'Srebrny Klucz z Providence',
    content:
      'Kunsztownie wykonany klucz ze stopu srebra i nieznanego meteorytu, pokryty gęstymi arabeskami i symbolami astronomicznymi. Wydaje się niewytłumaczalnie lekki i wibruje w pobliżu starożytnych portali.',
    category: 'Odkrycia',
    imageUrl: '/equipment/catalog/pocket-watch-shared.webp',
    inGameDate: '21 Lipca 1926',
    tags: ['Artefakty', 'Krainy Snów', 'Klucz', 'Magia', 'Porta'],
    investigatorInsight:
      'Klucz nie otwiera żadnego fizycznego zamka ślusarskiego - służy do manipulacji barierami Krainy Snów i pozwala na bezpieczne przejście przez Srebrną Bramę.',
  },
  {
    id: 'test_encyclo_7',
    type: 'item',
    title: 'Zwęglony Dziennik Corbitta (1864)',
    content:
      'Skórzana oprawa częściowo zniszczona przez kwas i ogień. Karty zapisane są gęstym, pochyłym pismem w mieszance łaciny i szyfru fonetycznego kultu Aklo.',
    category: 'Odkrycia',
    imageUrl: '/equipment/catalog/diary-shared.webp',
    inGameDate: '21 Lipca 1926',
    tags: ['Dowód', 'Rękopis', 'Corbitt', 'Zaklęcie'],
    investigatorInsight:
      'Formuła na stronie 47 to wariant zaklęcia "Więź z Tym, Który Czeka w Mroku". Umożliwia lewitację przedmiotów i telepatyczny atak na umysł intruza.',
  },

  // ------------------------------------------------------------------
  // 3. KRONIKA SESJI (Chronicle / Timeline Events)
  // ------------------------------------------------------------------
  {
    id: 'test_journal_1',
    type: 'journal',
    title: 'Odkrycie w Archiwum Miskatonic',
    content:
      'Spędziłem długie godziny w dusznych podziemiach Biblioteki Uniwersytetu Miskatonic. Wśród zakurzonych rejestrów parafialnych natrafiłem na wzmiankę o bractwie kapłanów Pana Głębin działającym w Massachusetts pod koniec XIX wieku. Zapiski jednoznacznie łączą nazwisko Corbitta z nielegalnym importem zabytków z Kairu.',
    category: 'Badania',
    inGameDate: '21 Lipca 1926',
    gameDay: 2,
    gameHour: 10,
    isAutoGenerated: true,
    tags: ['Badania', 'Biblioteka', 'Artefakt', 'Historia'],
    investigatorInsight:
      'Zapis parafialny z 1866 roku został sfałszowany - podpis pastora nakreślono inną ręką niż resztę księgi.',
  },
  {
    id: 'test_journal_2',
    type: 'journal',
    title: 'Nocne Koszmary i Utrata Zmysłów',
    content:
      'Gdy tylko zamknąłem oczy w pokoju hotelowym, nawiedziła mnie wizja cyklopowych miast wzniesionych z oślizgłego zielonego kamienia pod obcymi gwiazdami. Obudziłem się z lodowatym potem na czole i poczuciem, że ktoś niewidzialny stoi w kącie pokoju. Mój umysł ledwo znosi ten nieustanny napór.',
    category: 'Sny',
    inGameDate: '20 Lipca 1926',
    gameDay: 1,
    gameHour: 3,
    isAutoGenerated: false,
    tags: ['Koszmary', 'Poczytalność', 'Cthulhu', 'Szaleństwo'],
    investigatorInsight:
      'Koszmar powtarza się u każdego, kto spędził choć jedną noc w promieniu stu metrów od kamienicy Corbitta.',
  },
  {
    id: 'test_journal_3',
    type: 'journal',
    title: 'Potyczka w Zaułku Portowym',
    content:
      'W drodze do antykwariatu zostałem zaatakowany przez dwóch zbirów w marynarskich płaszczach. Jeden z nich dzierżył hak rzeźnicki, drugi rzucił we mnie butelką z naftą. Zdołałem oddać ostrzegawczy strzał z rewolweru, co zmusiło ich do ucieczki w stronę nabrzeża.',
    category: 'Walka',
    inGameDate: '19 Lipca 1926',
    gameDay: 1,
    gameHour: 21,
    isAutoGenerated: true,
    tags: ['Walka', 'Port', 'Zasadzka', 'Broń'],
    investigatorInsight:
      'Napastnicy nie szukali portfela - ich celem była teczka z notatkami o rodzie Marshów.',
  },

  // ------------------------------------------------------------------
  // 4. NOTATKI BADACZA (Notes / Player Deductions)
  // ------------------------------------------------------------------
  {
    id: 'test_note_1',
    type: 'note',
    title: 'Hipoteza: Asymetria murów w piwnicy',
    content:
      'Zauważyłem, że rozkład okien na drugim piętrze Domu Corbitta podważa zasady geometrii euklidesowej. Z zewnątrz są trzy okna, ale od środka widać cztery wnęki. Grubość wschodniej ściany w piwnicy wynosi ponad 2 metry, podczas gdy pozostałe mają zaledwie 40 centymetrów. Tam musi być zamurowana krypta!',
    category: 'Notatki',
    inGameDate: '21 Lipca 1926',
    tags: ['Notatka', 'Hipoteza', 'Geometria', 'Krypta'],
    investigatorInsight:
      'Do zburzenia zamurowanej przegrody potrzebny będzie ciężki kilof i lampa naftowa o dużym zasięgu.',
  },
  {
    id: 'test_note_2',
    type: 'note',
    title: 'Sprzeczności w zeznaniach sąsiada',
    content:
      'Pan Thomas twierdzi, że nie słyszał niczego zza ściany, ale jego lewa dłoń drży niekontrolowanie za każdym razem, gdy padnie nazwisko Corbitta. Ponadto w jego sieni leżała wczorajsza gazeta z zakreślonym nekrologiem.',
    category: 'Notatki',
    inGameDate: '21 Lipca 1926',
    tags: ['Notatka', 'Wywiad', 'Podejrzany', 'Świadek'],
    investigatorInsight:
      'Thomas pobierał od kogoś comiesięczną opłatę za milczenie - należy sprawdzić wyciągi bostońskiego banku.',
  },
];

// ------------------------------------------------------------------
// 5. TABLICA BADACZA: WĘZŁY DOWODÓW (Investigation Board Nodes)
// ------------------------------------------------------------------
export const MOCK_BOARD_NODES: EvidenceNode[] = [
  {
    id: 'node_corbitt_house',
    title: 'Dom Corbitta (Harrison St.)',
    description:
      'Nawiedzona nieruchomość stanowiąca centralny punkt śledztwa. Pomiary wskazują na anomalie przestrzenne i ujemne temperatury.',
    type: 'location',
    status: 'confirmed',
    position: { x: 440, y: 220 },
    tags: ['Lokalizacja', 'Boston', 'Nawiedzenie'],
    pinType: 'polaroid',
    rotation: -2.5,
    investigatorInsight:
      'Nienaturalna kubatura budynku ukrywa zamurowaną kryptę pod wschodnim skrzydłem piwnicy.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'node_walter_corbitt',
    title: 'Walter Corbitt',
    description:
      'Okultysta i nekromanta, zmarły w 1866 r. Ciało spoczywa pod podłogą, zachowując nienaturalną formę egzystencji.',
    type: 'suspect',
    status: 'hypothesis',
    position: { x: 180, y: 110 },
    tags: ['Podejrzany', 'Okultysta', 'Nieumarły'],
    imageUrl: '/portraits/predefined/henry-whitman.webp',
    pinType: 'polaroid',
    rotation: 3.1,
    investigatorInsight:
      'Brak śladu oficjalnego pochówku. Istnieje duże prawdopodobieństwo, że wciąż wpływa telepatycznie na mieszkańców.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'node_armitage',
    title: 'Prof. Henry Armitage',
    description:
      'Główny kustosz Biblioteki Miskatonic. Posiada klucz do zbioru cymeliów i wiedzę o rytuałach odpędzania bytów.',
    type: 'suspect',
    status: 'confirmed',
    position: { x: 740, y: 100 },
    tags: ['Sojusznik', 'Miskatonic', 'Ekspert'],
    imageUrl: '/portraits/predefined/archibald-blackwood.webp',
    pinType: 'polaroid',
    rotation: -1.2,
    investigatorInsight:
      'Skrywa przed władzami przetłumaczone inkantacje odpędzające z Dunwich.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'node_silver_key',
    title: 'Srebrny Klucz z Providence',
    description:
      'Starożytny artefakt ze stopu meteorytowego. Wibruje w pobliżu wrót wymiarowych i reaguje na fazy księżyca.',
    type: 'artifact',
    status: 'confirmed',
    position: { x: 780, y: 360 },
    tags: ['Artefakt', 'Mity', 'Klucz'],
    imageUrl: '/equipment/catalog/pocket-watch-shared.webp',
    pinType: 'badge',
    rotation: 1.8,
    investigatorInsight:
      'Pozwala na bezpieczne otwarcie portalu do Krain Snów bez utraty poczytalności.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'node_miskatonic_log',
    title: 'Dziennik Corbitta (1864)',
    description:
      'Zwęglony rękopis zawierający formuły telekinezy i przywołania Bytu Czekającego w Ciemności.',
    type: 'evidence',
    status: 'confirmed',
    position: { x: 160, y: 380 },
    tags: ['Dowód', 'Dokument', 'Księga'],
    imageUrl: '/equipment/catalog/diary-shared.webp',
    pinType: 'telegram',
    rotation: -3.4,
    investigatorInsight:
      'Zawiera dokładny opis rytuału ochrony przed światłem słonecznym.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'node_hidden_room',
    title: 'Krypta za Zamurowaną Ścianą',
    description:
      'Niezbadane pomieszczenie w piwnicy kamienicy. Spod cegieł sączy się lodowate powietrze i zapach kwasu.',
    type: 'clue',
    status: 'hypothesis',
    position: { x: 460, y: 440 },
    tags: ['Poszlaka', 'Krypta', 'Piwnica'],
    pinType: 'badge',
    rotation: 0.9,
    investigatorInsight:
      'Wymaga sforsowania ciężkim narzędziem. Prawdopodobne miejsce spoczynku ożywionego ciała okultysty.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'node_seraphina',
    title: 'Seraphina Marsh',
    description:
      'Dziedziczka z Innsmouth powiązana z handlem zabytkami z bazaltu. Podejrzewana o finansowanie kultu.',
    type: 'suspect',
    status: 'hypothesis',
    position: { x: 1020, y: 220 },
    tags: ['Podejrzana', 'Innsmouth', 'Kult'],
    imageUrl: '/portraits/predefined/seraphina-marsh.webp',
    pinType: 'polaroid',
    rotation: -2.1,
    investigatorInsight:
      'Charakterystyczny Innsmouth Look sugeruje zaawansowany stopień mutacji.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'node_player_theory',
    title: 'Dedukcja: Rytuał Pełni Lipcowej',
    description:
      'Wszystkie napady i zjawiska nawiedzenia w Bostonie korelują z pozycją gwiazdy Aldebaran i nowiem księżyca.',
    type: 'player_note',
    status: 'confirmed',
    position: { x: 740, y: 560 },
    tags: ['Notatka', 'Dedukcja', 'Astronomia'],
    pinType: 'note',
    rotation: 4.0,
    investigatorInsight:
      'Kolejny atak nastąpi dokładnie w noc 23 lipca - mamy mniej niż 48 godzin na zneutralizowanie krypty.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'node_false_lead',
    title: 'Zeznania Dozorcy Thomasa',
    description:
      'Twierdził, że hałasy w nocy to szczury w rurach kanalizacyjnych. Wersja obalona po inspekcji piwnicy.',
    type: 'clue',
    status: 'refuted',
    position: { x: 160, y: 620 },
    tags: ['Fałszywy trop', 'Świadek', 'Obalone'],
    pinType: 'badge',
    rotation: -1.5,
    investigatorInsight:
      'Świadek kłamał ze strachu przed zemstą kultystów; został opłacony bostońskimi banknotami.',
    createdAt: new Date().toISOString(),
  },
];

// ------------------------------------------------------------------
// 6. TABLICA BADACZA: POWIĄZANIA SZNURKAMI (Evidence Relations)
// ------------------------------------------------------------------
export const MOCK_BOARD_RELATIONS: EvidenceRelation[] = [
  {
    id: 'rel_1',
    fromNodeId: 'node_walter_corbitt',
    toNodeId: 'node_corbitt_house',
    label: 'Zbudował i zamieszkuje',
    status: 'strong',
  },
  {
    id: 'rel_2',
    fromNodeId: 'node_miskatonic_log',
    toNodeId: 'node_walter_corbitt',
    label: 'Autorski rękopis nekromanty',
    status: 'strong',
  },
  {
    id: 'rel_3',
    fromNodeId: 'node_corbitt_house',
    toNodeId: 'node_hidden_room',
    label: 'Zamurowana krypta w piwnicy',
    status: 'strong',
  },
  {
    id: 'rel_4',
    fromNodeId: 'node_armitage',
    toNodeId: 'node_miskatonic_log',
    label: 'Przetłumaczył fragmenty szyfru',
    status: 'strong',
  },
  {
    id: 'rel_5',
    fromNodeId: 'node_silver_key',
    toNodeId: 'node_hidden_room',
    label: 'Może neutralizować barierę krypty',
    status: 'weak',
  },
  {
    id: 'rel_6',
    fromNodeId: 'node_seraphina',
    toNodeId: 'node_walter_corbitt',
    label: 'Korespondencja handlowa z 1863 r.',
    status: 'weak',
  },
  {
    id: 'rel_7',
    fromNodeId: 'node_player_theory',
    toNodeId: 'node_hidden_room',
    label: 'Data kolejnego rytuału (23 lipca)',
    status: 'strong',
  },
  {
    id: 'rel_8',
    fromNodeId: 'node_false_lead',
    toNodeId: 'node_corbitt_house',
    label: 'Zmyślona wersja o gryzoniach',
    status: 'doubtful',
  },
];

/** English fixtures keep IDs, images, layout and relations identical to PL. */
export const MOCK_JOURNAL_ENTRIES_EN: ExtendedJournalEntry[] = MOCK_JOURNAL_ENTRIES.map((entry, index) => ({
  ...entry,
  title: `Investigation record ${index + 1}`,
  content: 'A recorded lead from the Miskatonic investigation. The team must verify the evidence before drawing conclusions.',
  category: entry.type === 'note' ? 'Notes' : entry.type === 'journal' ? 'Research' : 'Discoveries',
  inGameDate: '21 July 1926',
  tags: ['Investigation', 'Arkham', 'Evidence'],
  investigatorInsight: 'The available evidence points to a concealed connection that requires further investigation.',
  objectives: entry.objectives?.map((objective, objectiveIndex) => ({
    ...objective,
    description: `Investigation objective ${objectiveIndex + 1}`,
  })),
}));

export const MOCK_BOARD_NODES_EN: EvidenceNode[] = MOCK_BOARD_NODES.map((node, index) => ({
  ...node,
  title: `Evidence ${index + 1}`,
  description: 'A documented lead connected to the current investigation.',
  tags: ['Evidence', 'Investigation'],
  investigatorInsight: 'This evidence may reveal a hidden connection.',
}));

export const MOCK_BOARD_RELATIONS_EN: EvidenceRelation[] = MOCK_BOARD_RELATIONS.map((relation) => ({
  ...relation,
  label: 'Connected evidence',
}));
