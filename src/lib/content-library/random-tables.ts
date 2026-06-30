// ============================================================
// RANDOM TABLES - Losowe wydarzenia, księgi Mitów, polski folklor
// ============================================================

import {
    RandomEvent,
    MythosBook,
    MythosBookFragment,
    SessionTemplate,
    AmbientSound,
    PolishFolklore
} from './types';

// === RANDOM EVENTS (CZĘŚĆ XIX) ===

export const RANDOM_EVENTS: RandomEvent[] = [
    // Atmosferyczne - dzień
    { id: 'a1', category: 'atmospheric', title: 'Nagła mgła', description: 'Gęsta mgła spływa z niczego, widoczność spada do kilku metrów. Dźwięki się tłumią, kroki echo stają się nierozpoznawalne.', timeOfDay: 'either' },
    { id: 'a2', category: 'atmospheric', title: 'Zimny podmuch', description: 'Lodowaty wiatr przeszywa cię na wskroś, choć drzewa wokół stoją nieruchomo. Czujesz zapach morza - ale morze jest daleko.', timeOfDay: 'either' },
    { id: 'a3', category: 'atmospheric', title: 'Dziwna cisza', description: 'Nagle wszystkie ptaki milkną. Nawet wiatr się ucisza. Cisza trwa minutę - potem wszystko wraca do normy, jakby nic się nie stało.', timeOfDay: 'day' },
    { id: 'a4', category: 'atmospheric', title: 'Zegar bije 13', description: 'Z wieży kościelnej dobiega bicie zegara - trzynaście uderzeń. Nikt inny nie wydaje się tego zauważać.', timeOfDay: 'either' },

    // Atmosferyczne - noc
    { id: 'a5', category: 'atmospheric', title: 'Dziwne światło', description: 'Na niebie pojawia się blade, zielonkawe światło - nie zorza, coś bliższe, jakby promieniujące z konkretnego punktu. Znika po minucie.', timeOfDay: 'night' },
    { id: 'a6', category: 'atmospheric', title: 'Nieznajomy śpiew', description: 'Na wietrze niesie się cichy śpiew - obca melodia, słowa nieludzkie. Nie możesz zlokalizować źródła.', timeOfDay: 'night' },
    { id: 'a7', category: 'atmospheric', title: 'Cień bez źródła', description: 'Kątem oka widzisz cień poruszający się niezależnie od źródeł światła. Kiedy patrzysz wprost - znika.', timeOfDay: 'night' },

    // Komplikacje
    { id: 'c1', category: 'complication', title: 'Samochód się psuje', description: 'Silnik gaśnie bez ostrzeżenia. Mechanik twierdzi, że nie ma powodu awarii - a jednak nie odpala.', mechanicalEffect: 'Konieczna naprawa lub inna forma transportu' },
    { id: 'c2', category: 'complication', title: 'Zaginiony klucz', description: 'Klucz, który na pewno był w kieszeni, zniknął. Pojawia się później w miejscu, gdzie na pewno go nie kładziono.', mechanicalEffect: 'Opóźnienie lub potrzeba włamania' },
    { id: 'c3', category: 'complication', title: 'Świadek przestraszony', description: 'Osoba, z którą chciałeś porozmawiać, widzi cię - i ucieka. Wyraźnie się boi, ale nie wiadomo czego.', mechanicalEffect: 'Test Perswazji z karą lub pościg' },

    // Wskazówki
    { id: 'cl1', category: 'clue', title: 'Znaleziona notatka', description: 'Pod stopą chrzęszcze papier - pognieciona notatka z adresem i datą. Pismo drżące, jakby pisane w strachu.', mechanicalEffect: 'Nowy trop' },
    { id: 'cl2', category: 'clue', title: 'Dziwny symbol', description: 'Na ścianie, drzewie lub kamieniu widzisz wyrysowany symbol - pasujący do tego z innych miejsc. Ktoś zostawia ślady.', mechanicalEffect: 'Test Wiedzy Tajemnej lub badanie' },

    // Horror
    { id: 'h1', category: 'horror', title: 'Ktoś obserwuje', description: 'Przez chwilę czujesz na sobie intensywne spojrzenie. Kiedy się odwracasz - nikogo nie ma. Ale wrażenie zostaje.', mechanicalEffect: 'Test SAN 0/1' },
    { id: 'h2', category: 'horror', title: 'Dziecięcy śmiech', description: 'Z opuszczonego budynku dobiega cichy, dziecięcy śmiech. Budynek jest pusty od lat.', mechanicalEffect: 'Test SAN 0/1, badanie opcjonalne' },
    { id: 'h3', category: 'horror', title: 'Odbicie w lustrze', description: 'Przez ułamek sekundy widzisz w lustrze kogoś za sobą. Kiedy się odwracasz - nikogo. Kiedy patrzysz znów - odbicie normalne.', mechanicalEffect: 'Test SAN 0/1d3' }
];

// === MYTHOS BOOKS (CZĘŚĆ XVIII) ===

export const MYTHOS_BOOKS: MythosBook[] = [
    {
        id: 'necronomicon',
        name: 'Necronomicon',
        originalTitle: 'Al Azif (Kitab al-Azif)',
        author: 'Abdul Alhazred (Szalony Arab)',
        language: 'latin',
        era: 'VIII wiek n.e. (oryginał arabski), XIII wiek (przekład łaciński)',
        rarity: 'unique',
        studyTime: {
            initial: '4 tygodnie',
            full: '56 tygodni',
            hoursPerDay: 6
        },
        effects: {
            sanLoss: '2d10',
            cthulhuMythosGain: '+18% Wiedzy Mitów Cthulhu',
            spellsContained: [
                'Przyzwanie Yog-Sothotha',
                'Brama Srebrnego Klucza',
                'Rytuał Dhol',
                'Znak Starszych',
                'Kontakt z Wielkim Przedwiecznym'
            ]
        },
        physicalDescription: 'Masywny tom w oprawie z niezidentyfikowanej skóry, która wydaje się ciepła w dotyku. Strony z pergaminu pożółkłego od wieków, pokryte zagęszczonym pismem łacińskim z marginesami pełnymi przerażających ilustracji. Zamek z brązu w kształcie splątanych macek.',
        reputation: 'Najniebezpieczniejsza księga świata. Każda kopia jest przeklęta. Bibliotekarze wolą spalić bibliotekę niż przyznać, że ją posiadają.',
        fragments: [
            {
                id: 'necro-1',
                title: 'O Starszych i Ich Powrocie',
                content: `"Nie jest martwe to, co wiecznie żyć może,
I w dziwnych eonach nawet śmierć umrzeć może.

Wielcy Przedwieczni przybyli z gwiazd, gdy Ziemia była młoda.
Spali teraz w miastach pod morzami, w podziemnych kryptach.
Gdy gwiazdy ułożą się właściwie - z R'lyeh wstanie Wielki Cthulhu.
Wtedy szaleństwo ogarnie ludzkość, a ci, którzy służyli,
Staną się panami nowego porządku."`,
                sanCost: '0/1d3',
                revealedSecrets: [
                    'Wielcy Przedwieczni nie są martwi - śpią',
                    'R\'lyeh leży pod Pacyfikiem',
                    'Pewnego dnia gwiazdy się ułożą i Oni powrócą'
                ]
            },
            {
                id: 'necro-2',
                title: 'O Bramach Między Światami',
                content: `"Yog-Sothoth jest Bramą. Yog-Sothoth jest Kluczem i Strażnikiem Bramy.
Przeszłość, teraźniejszość, przyszłość - wszystko jest jednym w Yog-Sothocie.
On zna, gdzie Oni przeszli przez Bramę, i gdzie przejdą znowu.
On wie, gdzie Oni deptali pola Ziemi, i gdzie jeszcze deptać będą.

Kto Go wezwie, przekroczy wszystkie progi.
Ale cena jest straszna, a powrót - niepewny."`,
                sanCost: '1/1d4',
                revealedSecrets: [
                    'Yog-Sothoth istnieje poza czasem i przestrzenią',
                    'Można podróżować między wymiarami - za przerażającą cenę',
                    'Niektórzy wracają... zmienieni'
                ]
            },
            {
                id: 'necro-3',
                title: 'Rytuał Ochronny Starszych',
                content: `"Znak Koth, ryty przed progiem, odpędza sługi Ciemności.
Pięcioramienna gwiazda, wyrysowana krwią nosiciela światła,
Zamyka wrota przed Tymi, Którzy Czekają Za Progiem.

Ale pamiętaj: Starsi odeszli. Ich znaki słabną.
Co chroniło waszych przodków, może was nie ochronić.
Ciemność się uczy. Ciemność pamięta."`,
                revealedSecrets: [
                    'Znak Starszych (Elder Sign) może chronić przed istotami Mitów',
                    'Dawne zabezpieczenia słabną z czasem',
                    'Istoty Mitów adaptują się do obrony ludzkości'
                ]
            }
        ],
        illustrationTags: ['ancient tome', 'leather binding', 'occult symbols', 'tentacle motif', 'aged pages']
    },
    {
        id: 'book-of-eibon',
        name: 'Księga Eibona',
        originalTitle: 'Liber Ivonis (Livre d\'Eibon)',
        author: 'Eibon z Hyperborei',
        language: 'latin',
        era: 'Hyperborea (przed ludzkością), przekłady średniowieczne',
        rarity: 'rare',
        studyTime: {
            initial: '3 tygodnie',
            full: '44 tygodnie',
            hoursPerDay: 5
        },
        effects: {
            sanLoss: '2d6',
            cthulhuMythosGain: '+13% Wiedzy Mitów Cthulhu',
            spellsContained: [
                'Kontakt z Tsathoggua',
                'Zaklęcie Cienia Eibona',
                'Brama do Hyperborei',
                'Formuła Przeniesienia'
            ]
        },
        physicalDescription: 'Księga oprawiona w fioletową skórę niewiadomego pochodzenia. Strony wykonane z materiału przypominającego metal, ale giętkiego jak pergamin. Pismo zmienia się w zależności od oświetlenia - przy świecach ujawnia dodatkowe marginalia.',
        reputation: 'Dzieło przedpotopowego czarownika, który służył Tsathoggua. Mówi się, że sam autor nadal żyje - gdzieś.',
        fragments: [
            {
                id: 'eibon-1',
                title: 'O Tsathoggua i Jego Czeladnikach',
                content: `"W ciemnościach pod górami N'kai siedzi Tsathoggua, 
Bezwładny i leniwy jak Wielki Ropuch, którym jest.
Czeka na ofiary, które przychodzą same,
Bo Głód Jego jest wieczny, a Cierpliwość - bezgraniczna.

Służyli Mu Voormis, zanim ludzie przybyli.
Służą Mu Formless Spawn - dzieci Jego Cienia.
I służyć Mu będą wszyscy, którzy spojrzą w Ciemność zbyt długo."`,
                sanCost: '0/1d3',
                revealedSecrets: [
                    'Tsathoggua ukrywa się w jaskiniach pod ziemią',
                    'Formless Spawn to jego "dzieci" z pramaterji',
                    'Voormis to rasa sprzed ludzi, która mu służyła'
                ]
            },
            {
                id: 'eibon-2',
                title: 'Formuła Zmiany Cienia',
                content: `"Cień jest prawdziwszy niż ciało, które go rzuca.
Eibon odkrył to w Komnatach Mu.
Ciało można zniszczyć, ale Cień - nigdy.

Przez Formułę Zmiany, cień staje się rzeczywisty,
A ciało - cieniem. Tak Eibon umknął Inkwizytorom.
Tak i ty możesz umknąć - ale pamiętaj:
Cień nie potrzebuje jedzenia ani snu.
Cień nie żyje. Cień tylko JEST."`,
                sanCost: '1/1d4',
                revealedSecrets: [
                    'Istnieje sposób zamiany miejscami z własnym cieniem',
                    'Eibon użył tej formuły, by przetrwać wieki',
                    'Forma cienia nie jest ludzka'
                ]
            }
        ],
        illustrationTags: ['purple leather', 'metallic pages', 'toad symbol', 'hyperborean glyphs']
    },
    {
        id: 'pnakotic-manuscripts',
        name: 'Manuskrypty Pnakotyczne',
        originalTitle: 'Pnakotic Manuscripts',
        author: 'Wielka Rasa z Yith (kontrowersyjne)',
        language: 'ancient',
        era: 'Nieznana (prawdopodobnie przed-ludzka)',
        rarity: 'unique',
        studyTime: {
            initial: '6 tygodni',
            full: '64 tygodnie',
            hoursPerDay: 4
        },
        effects: {
            sanLoss: '2d8',
            cthulhuMythosGain: '+15% Wiedzy Mitów Cthulhu',
            spellsContained: [
                'Projekcja Umysłu',
                'Kontakt z Wielką Rasą',
                'Wizja Przeszłości',
                'Odczytanie Czasu'
            ]
        },
        physicalDescription: 'Zwoje wykonane z materiału przypominającego jedwab, ale trwalszego niż stal. Pismo jest trójwymiarowe - dotyk pozwala "czytać" dodatkowe warstwy znaczeń. Niektóre fragmenty zmieniają się za każdym razem, gdy patrzysz.',
        reputation: 'Najstarszy zachowany tekst. Mówi się, że pochodzi od rasy istot, która podróżowała w czasie, zbierając wiedzę wszystkich epok.',
        fragments: [
            {
                id: 'pnak-1',
                title: 'O Wielkiej Rasie i Wymianie Umysłów',
                content: `"Przybliśmy z przyszłości, która jeszcze nie nadeszła,
I z przeszłości, która dawno minęła.
Czas jest dla nas jak morze - pływamy w nim swobodnie.

Nasze ciała stożkowate przenoszą umysły,
Ale sama świadomość może podróżować dalej.
Wysyłamy ją w ciała innych - w inne czas, inne miejsce.
Tak zbieramy wiedzę. Tak PRZETRWALIŚMY.

Jeśli czujesz, że twój umysł nie jest twój -
Jeśli masz wspomnienia, które nie są twoje -
Może jeden z nas właśnie cię odwiedził."`,
                sanCost: '1/1d6',
                revealedSecrets: [
                    'Wielka Rasa z Yith podróżuje przez czas poprzez wymianę umysłów',
                    'Można mieć wspomnienia, które nie należą do nas',
                    'Niektórzy ludzie "gościli" obce umysły'
                ]
            },
            {
                id: 'pnak-2',
                title: 'Ostrzeżenie Przed Latającymi Wielościanami',
                content: `"Są istoty, przed którymi nawet My uciekliśmy w czasie.
Latające Wielościany - bezwzględne, niezniszczalne, wieczne.
Gdy nasze ostatnie ciała uległy, przenieśliśmy się jeszcze dalej.

Ale One nas znajdą. Zawsze znajdują.
To tylko kwestia czasu - a czas jest ich domeną tak samo jak naszą.

Jeśli usłyszysz bzyczenie jak tysiąca pszczół -
Jeśli zobaczysz błyszczący kształt nadlatujący z pustki -
UCIEKAJ. Nie ma innej rady."`,
                sanCost: '0/1d4',
                revealedSecrets: [
                    'Latające Wielościany są wrogami Wielkiej Rasy',
                    'Nawet podróżnicy czasu uciekają przed nimi',
                    'Nie można ich pokonać - tylko uciekać'
                ]
            }
        ],
        illustrationTags: ['ancient scrolls', 'alien writing', 'cone-shaped beings', 'time motifs']
    },
    {
        id: 'cultes-des-goules',
        name: 'Kulty Ghuli',
        originalTitle: 'Cultes des Goules',
        author: 'François-Honoré Balfour, Comte d\'Erlette',
        language: 'latin',
        era: '1702 n.e.',
        rarity: 'rare',
        studyTime: {
            initial: '1 tydzień',
            full: '16 tygodni',
            hoursPerDay: 4
        },
        effects: {
            sanLoss: '1d8',
            cthulhuMythosGain: '+9% Wiedzy Mitów Cthulhu',
            spellsContained: [
                'Kontakt z Ghulem',
                'Stworzenie Zombie',
                'Wrota do Tuneli Głodnych'
            ]
        },
        physicalDescription: 'Książka w zniszczonej oprawie, pachnąca stęchlizną grobów. Ilustracje są obsceniczne i przerażające. Niektóre strony są poplamione czymś ciemnym.',
        reputation: 'Przewodnik po kultach nekromancji we Francji. Autor zaginął w katakumbach pod Paryżem.',
        fragments: [
            {
                id: 'goules-1',
                title: 'O Naturze Pożeraczy',
                content: `"Ghule nie są umarłymi, jak sądzi prosty lud.
Są rasą starszą od ludzi - ale spokrewnioną.
Żywią się ciałami zmarłych, bo ich metabolizm tego wymaga.
Ale mogą jeść i żywych - z przyjemnością.

Ich tunele przebiegają pod każdym miastem.
Ich wiedza sięga początków ludzkości.
Można z nimi rozmawiać. Można ich przekupić.
Ale nigdy im nie ufaj. Głód jest silniejszy od umów."`,
                revealedSecrets: [
                    'Ghule to odrębna rasa, nie nieumarli',
                    'Żyją w tunelach pod miastami',
                    'Można z nimi negocjować - ostrożnie'
                ]
            }
        ],
        illustrationTags: ['french medieval', 'ghoul illustrations', 'catacombs', 'necromancy']
    },
    {
        id: 'de-vermis-mysteriis',
        name: 'Tajemnice Robaka',
        originalTitle: 'De Vermis Mysteriis',
        author: 'Ludvig Prinn',
        language: 'latin',
        era: 'XV wiek n.e.',
        rarity: 'rare',
        studyTime: {
            initial: '2 tygodnie',
            full: '32 tygodnie',
            hoursPerDay: 5
        },
        effects: {
            sanLoss: '1d10',
            cthulhuMythosGain: '+11% Wiedzy Mitów Cthulhu',
            spellsContained: [
                'Przyzwanie Byakhee',
                'Sabat Czarownic',
                'Formuła Nieśmiertelności',
                'Kontakt z Hasturem'
            ]
        },
        physicalDescription: 'Czarna skórzana oprawa z wytłoczonym symbolem robaka pożerającego własny ogon. Strony są niezwykle cienkie, jakby z ludzkiej skóry. Tekst miejscami jest napisany od prawej do lewej.',
        reputation: 'Prinn przeżył 200 lat i uczestniczył w sabatach czarownic w całej Europie. Spalony na stosie - ale czy naprawdę zmarł?',
        fragments: [
            {
                id: 'vermis-1',
                title: 'O Wiecznie Powracającym',
                content: `"Śmierć jest iluzją dla tych, którzy znają Prawdę.
Ciało może spłonąć, może się rozpaść, może być pożarte.
Ale dusza - odpowiednio przygotowana - powraca.

Robak zjada własny ogon. Koniec jest początkiem.
Tak i ja powrócę, gdy moje ciało będzie prochem.
I powrócę, i powrócę, i powrócę znowu.

Śmierć? Śmierć jest tylko przerwą na odpoczynek."`,
                sanCost: '1/1d4',
                revealedSecrets: [
                    'Istnieją rytuały prolongujące życie poza naturalną śmierć',
                    'Prinn mógł przetrwać spalenie na stosie',
                    'Niektórzy czarownicy potrafią się reinkarnować'
                ]
            }
        ],
        illustrationTags: ['ouroboros worm', 'witch sabbath', 'medieval occult', 'dark ritual']
    },
    {
        id: 'revelations-of-glaaki',
        name: 'Objawienia Glaaki',
        originalTitle: 'Revelations of Glaaki',
        author: 'Nieznany (dyktowane przez wyznawców)',
        language: 'english',
        era: 'XIX wiek (ciągłe dodawanie)',
        rarity: 'unique',
        studyTime: {
            initial: '2 tygodnie',
            full: '40 tygodni',
            hoursPerDay: 4
        },
        effects: {
            sanLoss: '2d6',
            cthulhuMythosGain: '+12% Wiedzy Mitów Cthulhu',
            spellsContained: [
                'Przyzwanie Glaaki',
                'Służba Nieśmiertelna',
                'Kontakt z Y\'golonac',
                'Zielona Dekadencja'
            ]
        },
        physicalDescription: 'Dwanaście tomów w różnej jakości opraw - od profesjonalnych do ręcznie szyty. Wszystkie pisane różnymi charakterami pisma, ale tą samą "inspiracją". Niektóre strony są poplamione zielonkawą substancją.',
        reputation: 'Dzieło pisane przez pokolenia wyznawców Glaaki - istoty zamieszkującej jeziora w Anglii. Każdy tom dodaje nowa wiedzę.',
        fragments: [
            {
                id: 'glaaki-1',
                title: 'O Zielonych Sługach',
                content: `"Pan jeziora wybiera swoich. 
Kolec jego ciała przenika ofiarę.
Zielona substancja przepływa i przemienia.

Sługa wstaje - nie żywy, nie martwy.
Służy wiecznie, dopóki Słońce go nie spali.
Bo światło dnia jest wrogiem Zmienionych.

Nie płacz za nimi. Są szczęśliwi.
W służbie jest spokój. W służbie jest cel.
Czy nie tego wszyscy szukamy?"`,
                sanCost: '0/1d4',
                revealedSecrets: [
                    'Glaaki mieszka w jeziorze w Anglii',
                    'Jego ofiary stają się nieśmiertelnymi sługami',
                    'Słudzy nie znoszą światła słonecznego'
                ]
            }
        ],
        illustrationTags: ['lake monster', 'green substance', 'undead servants', 'twelve volumes']
    }
];

// === POLISH CONTEXT (CZĘŚĆ XXII) ===

export const POLISH_FOLKLORE: PolishFolklore = {
    creatures: [
        { name: 'Strzyga', description: 'Upiór kobiety zmarłej przed ślubem, wypijająca krew żywym', sanLoss: '1/1d6', weakness: 'Żelazny nóż wbity w serce' },
        { name: 'Topielec', description: 'Duch utopionego, wciągający przechodniów do wody', sanLoss: '0/1d4', weakness: 'Nie może działać w dzień' },
        { name: 'Licho', description: 'Złośliwy duch domu, sprowadzający pecha', sanLoss: '0/1', weakness: 'Rytuał oczyszczenia domu' },
        { name: 'Leszy', description: 'Duch lasu, władca zwierząt, może zgubić podróżnych', sanLoss: '0/1d3', weakness: 'Szacunek dla lasu go uspokaja' },
        { name: 'Utopiec', description: 'Demon wodny, topielec który stał się istotą nadprzyrodzoną', sanLoss: '1/1d6', weakness: 'Poświęcona woda' },
        { name: 'Wiła', description: 'Duch młodej kobiety, zamieszkujący źródła i studnie', sanLoss: '0/1d3', weakness: 'Ofiary z kwiatów' }
    ],
    locations: [
        { name: 'Warszawa', setting: 'Stolica II RP, nowoczesna i elegancka, ale z mroczną przeszłością', features: ['Stare Miasto', 'Cytadela', 'Dzielnica żydowska', 'Pałac Kultury (jeśli modern)'] },
        { name: 'Kraków', setting: 'Miasto królów, alchemia i tajemnice', features: ['Wawel', 'Kazimierz', 'Kościół Mariacki', 'Katakumby'] },
        { name: 'Lwów', setting: 'Perła Kresów, wielokulturowa, academia', features: ['Uniwersytet', 'Cmentarz Łyczakowski', 'Stare Miasto'] },
        { name: 'Gdańsk', setting: 'Port hanzeatycki, kontakt z morzem i tym, co w nim żyje', features: ['Długi Targ', 'Żuraw', 'Westerplatte', 'Stocznie'] },
        { name: 'Zakopane', setting: 'Góry, góralski folklor, odizolowanie', features: ['Tatry', 'Morskie Oko', 'Góralskie chaty', 'Sabała'] }
    ],
    handoutNewspapers: [
        'Kurier Warszawski',
        'Gazeta Lwowska',
        'Ilustrowany Kurier Codzienny (IKC)',
        'Robotnik',
        'Morze Bałtyckie'
    ]
};

// === SESSION STRUCTURE TEMPLATES (CZĘŚĆ XV) ===

export const SESSION_TEMPLATES: SessionTemplate[] = [
    // === INTRO TEMPLATES ===
    {
        id: 'intro-classic',
        type: 'intro',
        title: 'Klasyczne Otwarcie',
        text: `*Lampa naftowa rzuca migotliwe cienie na ściany. Za oknem szumi deszcz. Gdzieś w oddali bije kościelny zegar - ale nie liczyłeś uderzeń.*

**Poprzednio:** {previous_summary}

*Wracasz myślami do teraźniejszości. Co robisz?*`,
        atmosphere: 'gothic, noir, mystery',
        followUp: 'Czekam na twój ruch.'
    },
    {
        id: 'intro-action',
        type: 'intro',
        title: 'Otwarcie w Akcji',
        text: `*Serce bije głośno. Oddech przyspiesza. Nie ma czasu na zastanowienie - zmysły krzyczą NIEBEZPIECZEŃSTWO.*

**Sytuacja:** {current_situation}

*Co robisz W TEJ CHWILI?*`,
        atmosphere: 'action, tension, urgency'
    },
    {
        id: 'intro-investigation',
        type: 'intro',
        title: 'Otwarcie Śledcze',
        text: `*Notatnik w dłoni. Ołówek przyciśnięty do papieru. Fakty wirują w głowie, szukając wzorca.*

**Wiesz już:** {known_facts}

**Do zbadania:** {pending_leads}

*Od czego zaczynasz?*`,
        atmosphere: 'investigation, analytical, noir'
    },
    {
        id: 'intro-nightmare',
        type: 'intro',
        title: 'Otwarcie z Koszmaru',
        text: `*Budzisz się z krzykiem. Pościel jest mokra od potu. Sen... to był tylko sen?*

*Ale dłonie nadal drżą. A w pamięci pozostał obraz: {nightmare_image}*

*Dzień się zaczyna. Co robisz?*`,
        atmosphere: 'horror, psychological, dream'
    },
    {
        id: 'intro-calm',
        type: 'intro',
        title: 'Otwarcie Spokojne',
        text: `*{time_of_day}. {weather}. Na chwilę wszystko wydaje się normalne - zwyczajny dzień w {location}.*

*Ale wiesz, że to spokój przed burzą. Coś nadchodzi.*

*Jak spędzasz te chwile?*`,
        atmosphere: 'calm before storm, daily life, normalcy'
    },
    {
        id: 'intro-flashback',
        type: 'intro',
        title: 'Retrospekcja',
        text: `*{years} lat temu. {location}. Byłeś wtedy innym człowiekiem.*

*Wspomnienie wraca z bólem: {flashback_scene}*

*Powracasz do teraźniejszości. Pytanie brzmi - dlaczego o tym teraz myślisz?*`,
        atmosphere: 'flashback, memory, past'
    },

    // === OUTRO TEMPLATES ===
    {
        id: 'outro-sunset',
        type: 'outro',
        title: 'Zakończenie o Zmierzchu',
        text: `*Słońce chowa się za horyzontem. Cienie się wydłużają. Dzień dobiega końca.*

**Osiągnięcia:** {achievements}

*Ale pytania pozostają. I pozostaną - do następnego razu.*`,
        atmosphere: 'reflective, transition, evening'
    },
    {
        id: 'outro-safe',
        type: 'outro',
        title: 'Bezpieczna Przystań',
        text: `*Drzwi zamykają się za tobą. Na chwilę jesteś bezpieczny. Ogień trzaska w kominku.*

*Masz czas pomyśleć. Odpocząć. Przygotować się na to, co nadejdzie.*

**Kończymy tutaj. Do zobaczenia.**`,
        atmosphere: 'safety, rest, reprieve'
    },
    {
        id: 'outro-mystery',
        type: 'outro',
        title: 'Zakończenie z Tajemnicą',
        text: `*Więcej pytań niż odpowiedzi. Tak to zawsze jest z tajemnicami, które lepiej zostawić w spokoju.*

*Ale ty nie zostawisz. Prawda?*

**Ciąg dalszy nastąpi...**`,
        atmosphere: 'mysterious, unresolved, ominous'
    },

    // === CLIFFHANGER TEMPLATES ===
    {
        id: 'cliff-danger',
        type: 'cliffhanger',
        title: 'Nagłe Zagrożenie',
        text: `*Za twoimi plecami rozlega się dźwięk, którego nie chcesz rozpoznać.*

*Powoli się odwracasz...*

**Urywamy w tym miejscu.**`,
        atmosphere: 'danger, tension, fear'
    },
    {
        id: 'cliff-reveal',
        type: 'cliffhanger',
        title: 'Szokujące Odkrycie',
        text: `*Dokumenty wypadają ci z rąk. Nie. To niemożliwe.*

*A jednak słowa na papierze nie kłamią: {shocking_reveal}*

**Przerywamy tutaj.**`,
        atmosphere: 'revelation, shock, twist'
    },
    {
        id: 'cliff-choice',
        type: 'cliffhanger',
        title: 'Niemożliwy Wybór',
        text: `*Dwie drogi. Żadna dobra. A czas się kończy.*

*{option_a} czy {option_b}?*

**Decyzja - następnym razem.**`,
        atmosphere: 'dilemma, choice, tension'
    },
    {
        id: 'cliff-knockdoor',
        type: 'cliffhanger',
        title: 'Pukanie do Drzwi',
        text: `*Trzy uderzenia w drzwi. Głuche. Ciężkie. Niecierpliwe.*

*Któż może pukać o tej porze?*

**Koniec sesji.**`,
        atmosphere: 'suspense, mystery, dread'
    },
    {
        id: 'cliff-phone',
        type: 'cliffhanger',
        title: 'Telefon Dzwoni',
        text: `*Dzwonek telefonu przerywa ciszę. Raz. Drugi. Trzeci.*

*Słuchawka jest zimna w dłoni. „Halo?"*

*Głos po drugiej stronie mówi: „{ominous_message}"*

**Tu przerywamy.**`,
        atmosphere: 'communication, mystery, dread'
    },
    {
        id: 'cliff-shadow',
        type: 'cliffhanger',
        title: 'Cień w Ciemności',
        text: `*Świeczka gaśnie. Ciemność. A w niej... ruch.*

*Coś tu jest z tobą.*

**Do następnego razu.**`,
        atmosphere: 'darkness, presence, horror'
    },

    // === TIME PASSAGE TEMPLATES ===
    {
        id: 'time-night',
        type: 'time_passage',
        title: 'Zapada Noc',
        text: `*Godziny mijają. Lampy gazowe zapalają się jedna po drugiej wzdłuż ulicy. Noc przejmuje władzę nad miastem.*

*Minęło kilka godzin. Teraz jest noc.*`,
        atmosphere: 'transition, evening, night'
    },
    {
        id: 'time-dawn',
        type: 'time_passage',
        title: 'Świta',
        text: `*Pierwsze promienie słońca przebijają przez mrok. Ptaki zaczynają śpiewać. Noc minęła - przetrwałeś.*

*Jest ranek następnego dnia.*`,
        atmosphere: 'transition, dawn, hope'
    },
    {
        id: 'time-week',
        type: 'time_passage',
        title: 'Tydzień Później',
        text: `*Dni zlewają się w jeden ciąg rutyny i oczekiwania. Tydzień mija w pozornej normalności.*

*Jest {day}. Minął tydzień.*`,
        atmosphere: 'ellipsis, time skip, routine'
    },
    {
        id: 'time-month',
        type: 'time_passage',
        title: 'Miesiąc Później',
        text: `*Liście na drzewach zmieniły kolor. Lub opadły. Albo pojawiły się nowe. Czas płynie nieubłaganie.*

*Minął miesiąc. Wiele się zmieniło. Lub nic.*`,
        atmosphere: 'ellipsis, significant time skip, change'
    },

    // === CHECKPOINT TEMPLATES ===
    {
        id: 'checkpoint-rest',
        type: 'checkpoint',
        title: 'Chwila Oddechu',
        text: `*Możesz odetchnąć. Przynajmniej na chwilę. Co chcesz zrobić przed kontynuacją?*`,
        atmosphere: 'rest, choice, preparation'
    }
];

// === AMBIENT SOUNDS ===

export const AMBIENT_SOUNDS: AmbientSound[] = [
    {
        id: 'library',
        locationType: 'Biblioteka',
        keywords: ['biblioteka', 'księgarnia', 'archiwum', 'gabinet', 'biuro'],
        prompt: 'quiet library ambiance, pages rustling, distant clock ticking, wooden floor creaking, hushed whispers',
        duration: 30,
        loopable: true
    },
    {
        id: 'cemetery',
        locationType: 'Cmentarz',
        keywords: ['cmentarz', 'grób', 'krypta', 'nekropolia', 'mauzoleum'],
        prompt: 'eerie cemetery at night, wind through dead trees, distant owl hooting, crows cawing, leaves rustling',
        duration: 30,
        loopable: true
    },
    {
        id: 'forest',
        locationType: 'Las',
        keywords: ['las', 'puszcza', 'bór', 'drzewa', 'leśny'],
        prompt: 'dark forest ambiance, wind through branches, wolves howling in distance, twigs snapping, rustling undergrowth',
        duration: 30,
        loopable: true
    },
    {
        id: 'mansion',
        locationType: 'Rezydencja',
        keywords: ['dwór', 'rezydencja', 'posiadłość', 'pałac', 'willa', 'dom'],
        prompt: 'old mansion interior, creaking floorboards, grandfather clock, wind rattling windows, distant piano notes',
        duration: 30,
        loopable: true
    },
    {
        id: 'church',
        locationType: 'Kościół',
        keywords: ['kościół', 'kaplica', 'świątynia', 'klasztor', 'opactwo'],
        prompt: 'empty church interior, stone echo, distant organ music, candles flickering, wooden pews creaking',
        duration: 30,
        loopable: true
    },
    {
        id: 'underground',
        locationType: 'Podziemia',
        keywords: ['piwnica', 'tunel', 'katakumby', 'loch', 'podziemny', 'jaskinia'],
        prompt: 'underground cave ambiance, dripping water echoing, distant rumbling, scurrying sounds, damp stone atmosphere',
        duration: 30,
        loopable: true
    },
    {
        id: 'village',
        locationType: 'Wioska',
        keywords: ['wioska', 'miasteczko', 'osada', 'wieś'],
        prompt: 'small village at night, distant dog barking, wind whistling, shutters creaking, crickets chirping',
        duration: 30,
        loopable: true
    },
    {
        id: 'city',
        locationType: 'Miasto',
        keywords: ['miasto', 'ulica', 'kamienica', 'bar', 'restauracja', 'hotel'],
        prompt: '1920s city street ambiance, distant car horns, footsteps on cobblestone, muffled jazz music, urban atmosphere',
        duration: 30,
        loopable: true
    },
    {
        id: 'sea',
        locationType: 'Morze',
        keywords: ['port', 'statek', 'dok', 'morze', 'plaża', 'wybrzeże', 'zatoka'],
        prompt: 'coastal harbor at night, waves crashing, seagulls calling, ship bells ringing, wooden dock creaking',
        duration: 30,
        loopable: true
    },
    {
        id: 'hospital',
        locationType: 'Szpital',
        keywords: ['szpital', 'sanatorium', 'klinika', 'psychiatryk', 'azyl'],
        prompt: 'abandoned asylum ambiance, distant moaning, metal cart rolling, flickering lights humming, doors slamming',
        duration: 30,
        loopable: true
    }
];

// === HELPER FUNCTIONS ===

/**
 * Zwraca losowe wydarzenie z kategorii
 */
export function getRandomEvent(category?: RandomEvent['category']): RandomEvent {
    let events = RANDOM_EVENTS;

    if (category) {
        events = events.filter(e => e.category === category);
        if (events.length === 0) events = RANDOM_EVENTS;
    }

    return events[Math.floor(Math.random() * events.length)];
}

/**
 * Get a random book fragment for handout generation
 */
export function getRandomBookFragment(bookId?: string): MythosBookFragment | null {
    const books = bookId
        ? MYTHOS_BOOKS.filter(b => b.id === bookId)
        : MYTHOS_BOOKS;

    if (books.length === 0) return null;

    const randomBook = books[Math.floor(Math.random() * books.length)];
    if (randomBook.fragments.length === 0) return null;

    return randomBook.fragments[Math.floor(Math.random() * randomBook.fragments.length)];
}

/**
 * Get book study progress for a character
 */
export function calculateStudyProgress(
    hoursStudied: number,
    book: MythosBook
): { percentComplete: number; canLearnSpells: boolean; safetyWarning: string } {
    const totalHours = parseInt(book.studyTime.full) * 7 * (book.studyTime.hoursPerDay || 4);
    const percentComplete = Math.min(100, Math.round((hoursStudied / totalHours) * 100));

    return {
        percentComplete,
        canLearnSpells: percentComplete >= 50,
        safetyWarning: percentComplete >= 25
            ? 'Studiowanie tej księgi może prowadzić do trwałych zmian psychicznych.'
            : ''
    };
}

/**
 * Pobiera losowy szablon danego typu
 */
export function getRandomSessionTemplate(type: SessionTemplate['type']): SessionTemplate {
    const templates = SESSION_TEMPLATES.filter(t => t.type === type);
    return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Formatuje szablon z podstawionymi zmiennymi
 */
export function formatSessionTemplate(template: SessionTemplate, variables: Record<string, string>): string {
    let text = template.text;

    for (const [key, value] of Object.entries(variables)) {
        text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return text;
}

/**
 * Znajduje odpowiedni dźwięk otoczenia na podstawie opisu lokacji
 */
export function getAmbientSoundForLocation(locationDescription: string): AmbientSound | null {
    const lowerDesc = locationDescription.toLowerCase();

    for (const sound of AMBIENT_SOUNDS) {
        if (sound.keywords.some(kw => lowerDesc.includes(kw))) {
            return sound;
        }
    }

    return null;
}
