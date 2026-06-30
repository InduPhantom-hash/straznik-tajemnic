// ============================================================
// LOCATIONS - Lokacje do gry Call of Cthulhu
// Based on CZĘŚĆ II of prompt-baza.md
// ============================================================

import { ContentLocation } from './types';

// Re-eksport typu jako Location dla kompatybilności wstecznej
export type Location = ContentLocation;

export const LOCATIONS: ContentLocation[] = [
    {
        id: 'abandoned-house',
        name: 'Opuszczony Dom',
        type: 'building',
        era: 'timeless',
        sights: [
            'Kurz tańczy w smugach światła przebijającego przez brudne okna',
            'Tapety odchodzą od ścian, odsłaniając zbutwiałe drewno',
            'Na kominku stoją zdjęcia - twarze wydrapane',
            'Schody skrzypią podejrzanie, kilka stopni brakuje'
        ],
        sounds: [
            'Cichy skrzypot desek pod czyjąś niewidzialną stopą',
            'Wiatr wyje przez szczeliny, niczym lament',
            'Z góry dobiegają szmery - myszy? Czy coś większego?',
            'Nagle - cisza. Absolutna, przytłaczająca cisza'
        ],
        smells: [
            'Pleśń i wilgoć przenikają wszystko',
            'Pod spodem coś słodkiego, gnilnego',
            'Stary dym papierosów wsiąkł w meble',
            'W piwnicy - zapach chemikaliów? Formaldehyd?'
        ],
        touches: [
            'Kurz osiada na palcach przy każdym dotyku',
            'Klamki są lodowato zimne, nawet latem',
            'Podłoga ugina się niepokojąco',
            'Coś kleistego pod ręką - nie sprawdzaj co'
        ],
        atmosphere: [
            'Dom PAMIĘTA. Czujesz to w kościach.',
            'Jakby powietrze było gęstsze niż powinno',
            'Masz wrażenie, że ściany się przysuwają',
            'Coś cię obserwuje. Nie widzisz, ale WIESZ.'
        ],
        secrets: [
            'Pod podłogą w salonie ukryta jest skrytka z dziennikiem poprzedniego właściciela',
            'W piwnicy są ślady rytuału - rysunki kredą, świece, plamy',
            'Jeden z portretów ma dziurę zamiast oczu - przez nią widać pokój za ścianą'
        ],
        dangers: [
            'Podłoga może się zawalić (szczególnie w łazience)',
            'Coś żyje na strychu - nie wiadomo co',
            'Niektóre drzwi otwierają się tylko w jedną stronę'
        ],
        clues: [
            'Gazeta z datą zaginięcia poprzedniego właściciela',
            'Lista nazwisk na odwrocie obrazu',
            'Klucz do niezidentyfikowanej skrzynki'
        ],
        illustrationTags: ['abandoned', 'dusty', 'Victorian', 'cobwebs', 'broken windows']
    },
    {
        id: 'forbidden-library',
        name: 'Biblioteka z Zakazanymi Księgami',
        type: 'building',
        era: '1920s',
        sights: [
            'Regały sięgają sufitu, pełne ksiąg w każdym języku - i niektórych, które nie są językami',
            'Świece w brązowych świecznikach - elektryczność zdaje się nie działać',
            'Księga na pulpicie otwarta na stronie z dziwnym diagramem',
            'Na wprost: drzwi do "Sekcji Specjalnej" - zamknięte na trzy zamki'
        ],
        sounds: [
            'Szelest stron, choć nikt ich nie przewraca',
            'Szepty w języku, którego nie znasz - a może znasz?',
            'Skrzypienie regałów, jakby się przekrzywiały',
            'Daleki dźwięk jak nucąca melodia'
        ],
        smells: [
            'Stary papier, wosk, kurz wieków',
            'Ślad kadzidła - sandałowiec, może coś jeszcze',
            'Niepokojący zapach zza zamkniętych drzwi - siarki?',
            'W powietrzu leciutki aromat perfum dawno zmarłej osoby'
        ],
        touches: [
            'Grzbiety ksiąg - niektóre z ludzkiej skóry',
            'Strony szeleścą pod palcami jak coś żywego',
            'Klucze do sekcji specjalnej są lodowato zimne',
            'Niektóre szuflady biurek nie chcą się zamknąć'
        ],
        atmosphere: [
            'Wiedza tu zgromadzona mogłaby zmienić świat - lub go zniszczyć',
            'Masz wrażenie, że książki PATRZĄ',
            'Czas płynie tu inaczej - wchodzisz na godzinę, wychodzisz po pięciu',
            'Nie jesteś sam. Bibliotekarz nie wychodzi od lat.'
        ],
        secrets: [
            'Za fałszywą ścianą kryje się kolekcja artefaktów',
            'Bibliotekarz nie jest do końca człowiekiem - jest kimś, kto czytał zbyt wiele',
            'Jedno okno wychodzi na krajobraz, który nie istnieje w tym świecie'
        ],
        dangers: [
            'Niektóre księgi są dosłownie niebezpieczne do dotknięcia',
            'Czytanie więcej niż 30 minut wymaga testu SAN',
            'Coś żyje między regałami Sekcji Specjalnej'
        ],
        clues: [
            'Notatki poprzedniego badacza - urywają się w połowie zdania',
            'Mapa z zaznaczoną lokalizacją - inne pismo niż reszta',
            'Rytuał przyzwania - ale brakuje jednej strony'
        ],
        illustrationTags: ['dark library', 'ancient books', 'candlelight', 'forbidden knowledge', 'occult']
    },
    {
        id: 'midnight-cemetery',
        name: 'Cmentarz o Północy',
        type: 'outdoor',
        era: 'timeless',
        sights: [
            'Nagrobki pochylają się pod dziwnymi kątami, jakby ziemia je wypychała',
            'Mgła snuje się między grobami, sięgając do pasa',
            'Posąg anioła - twarz ukryta, ale czy właśnie się nie poruszyła?',
            'Jeden grób jest świeżo kopany - ale cmentarz zamknięto lata temu'
        ],
        sounds: [
            'Gdzieś daleko sowa. Potem milknie nagle',
            'Szelest w krzakach - wiatr czy coś innego?',
            'Cichy, rytmiczny dźwięk kopania',
            'Trzask gałązki za twoimi plecami'
        ],
        smells: [
            'Mokra ziemia i opadłe liście',
            'Zapach kwiatów - zdziwiać, o tej porze roku?',
            'Ślad czegoś słodko-gnilnego zza kaplicy',
            'Dym - ktoś pali ognisko? Tu?'
        ],
        touches: [
            'Nagrobki są zimniejsze niż powietrze wokół',
            'Ziemia pod stopami jest miękka, zbyt miękka',
            'Ktoś dotknął twojego ramienia - ale nie ma nikogo',
            'Kłódka na bramie kaplicy jest otwarta'
        ],
        atmosphere: [
            'Martwe oczy nagrobków śledzą każdy twój ruch',
            'Czujesz obecność tych, którzy spoczywają pod ziemią',
            'Cisza jest nieprzystępna - nawet twój oddech brzmi jak intruz',
            'Za każdym razem, kiedy patrzysz na anioła, wydaje się być bliżej'
        ],
        secrets: [
            'Pod starą kryptą jest tunel do sieci jaskiń',
            'Niektóre groby są puste - od środka',
            'Strażnik cmentarza wie więcej niż mówi'
        ],
        dangers: [
            'Ghule polują nocą',
            'Niektóri zmarli nie zostają martwi',
            'Ktoś składa tu ofiary - i szuka następnej'
        ],
        clues: [
            'Daty na nagrobkach - dlaczego wszystkie kończą się tego samego dnia?',
            'Symbol na obelisku pasuje do tego z biblioteki',
            'Ślady stóp prowadzą DO grobu, nie od niego'
        ],
        illustrationTags: ['cemetery', 'fog', 'tombstones', 'moonlight', 'gothic angel']
    },
    {
        id: 'underground-catacombs',
        name: 'Podziemny Tunel / Katakumby',
        type: 'underground',
        era: 'timeless',
        sights: [
            'Korytarz ciągnie się w mrok dalej, niż sięga światło latarki',
            'Ściany pokryte są wilgotnym, fosforyzującym mchem - zielonkawe światło pulsuje słabo',
            'Nisze w ścianach pełne są kości - ułożonych w ozdobne wzory, czaszki patrzą pustymi oczodołami',
            'Rozwidlenie - trzy tunele, każdy prowadzi w ciemność, każdy pachnie inaczej'
        ],
        sounds: [
            'Kapanie wody odbija się echem - lub kroki? Trudno odróżnić',
            'Skrobanie pazurów o kamień - daleko? blisko? echo wszystko zniekształca',
            'Cichy, bulgotliwy śmiech znikąd i zewsząd jednocześnie',
            'Twój własny oddech brzmi nienaturalnie głośno w martwej ciszy'
        ],
        smells: [
            'Stęchlizna wieków, wilgoć i rozkład',
            'Słodkawy smród gnijącego mięsa - świeży',
            'Chemiczny odór, nienaturalny - ktoś tu przeprowadza eksperymenty?',
            'Ziemia pachnie inaczej na różnych rozwidleniach'
        ],
        touches: [
            'Ściany są ślizkie, pokryte czymś, co przypomina śluz',
            'Podłoga jest nierówna - nie można iść szybko bez ryzykowania upadku',
            'Powietrze jest ciężkie, cieplejsze niż powinno być tak głęboko',
            'Coś muska twoją twarz - pajęczyna? palce?'
        ],
        atmosphere: [
            'Czujesz się obserwowany przez setki pustych oczodołów',
            'Tunele próbują cię POŻREĆ, wchłonąć w swoje wnętrzności',
            'Każdy krok może być ostatnim - pulapki, przepaście, mieszkańcy',
            'Tu, pod ziemią, zasady ludzkiego świata nie obowiązują'
        ],
        secrets: [
            'Tunele sięgają głębiej, niż ktokolwiek podejrzewa - pod całym miastem',
            'Ghule mają tu swoją "bibliotekę" - wiedzę zebraną z tysięcy ciał',
            'Jeden z tuneli prowadzi do starożytnej świątyni - sprzed ludzkości'
        ],
        dangers: [
            'Ghule - dziesiątki, może setki, w głębi tuneli',
            'Pułapki pozostawione przez poprzednich badaczy',
            'Tunele mogą się zawalić - lub zostać zablokowane za tobą',
            'Coś WIĘKSZEGO mieszka w najgłębszej komorze'
        ],
        clues: [
            'Rysunki na ścianach - mapa? ostrzeżenie? instrukcja?',
            'Świeże ślady łap i zadrapania - ktoś tu był niedawno',
            'Medalion z symbolem kultu - zerwany z szyi uciekiniera'
        ],
        illustrationTags: ['catacombs', 'skulls', 'tunnels', 'green phosphorescence', 'underground horror']
    },
    {
        id: 'coastal-fishing-village',
        name: 'Nadbrzeżna Wioska Rybacka',
        type: 'coastal',
        era: '1920s',
        sights: [
            'Chaty rybackie stoją przy samej wodzie, fundamenty pokryte wodorostami i małżami',
            'Mieszkańcy patrzą spod opuszczonych głów - oczy zbyt okrągłe, zbyt wilgotne, zbyt RYBNE',
            'Kościół na wzgórzu - jedyny budynek, przy którym ludzie się żegnają',
            'Na horyzoncie widać rafę - i światło, którego tam być nie powinno'
        ],
        sounds: [
            'Morze szumi nieustannie, jak oddech śpiącego giganta',
            'Dzwony z kościoła biją o dziwnych porach - nigdy w pełne godziny',
            'Nocą śpiew dobiega znad wody - w języku, który nie jest ludzki',
            'Kroki na kamienistej plaży - ale nikogo nie widać'
        ],
        smells: [
            'Rybny smród jest wszędzie - przenika ubrania, włosy, myśli',
            'Sól morska i gnijące wodorosty',
            'Coś słodko-metalicznego unosi się znad portu nocą',
            'Dom burmistrza pachnie kadzidłem - i czymś starszym, gorszym'
        ],
        touches: [
            'Powietrze jest wilgotne, kleiste - nigdy się nie osusza',
            'Podane ręce mieszkańców są zimne i chropawe',
            'Ściany budynków są ślizkie od soli i wilgoci',
            'Woda w studni ma dziwny, oleisty dotyk'
        ],
        atmosphere: [
            'Wszyscy cię obserwują. WSZYSCY. Nawet gdy się nie patrzą.',
            'Masz wrażenie, że morze CZEKA. Na coś. Na kogoś.',
            'Czas płynie tu inaczej - dni zdają się trwać dłużej w nocy',
            'Coś jest głęboko, głęboko złe w tym miejscu - w samej ziemi, w wodzie'
        ],
        secrets: [
            'Mieszkańcy nie są do końca ludźmi - pokolenia krzyżówek z Głębinowymi',
            'Pod rafą leży zatopione miasto - i NIE jest opuszczone',
            'Burmistrz odprawia rytuał w każdą noc pełni',
            'Niektórzy mieszkańcy "odchodzą do morza" gdy transformacja postępuje'
        ],
        dangers: [
            'Deep Ones patrolują wody - i czasem wychodzą na ląd',
            'Mieszkańcy bronią swoich sekretów - każdą ceną',
            'Wypływanie nocą to PEWNA śmierć',
            'Jedzenie ryb stąd może... zmienić cię'
        ],
        clues: [
            'Brak dzieci poniżej 5 lat - gdzie one są?',
            'Biżuteria rybacka: złoto o dziwnych wzorach - skąd je mają?',
            'Stare kroniki mówiące o "pakcie z morzem" z 1692 roku',
            'Zdjęcia rodzinne - pradziadkowie wyglądają DOKŁADNIE jak obecni mieszkańcy'
        ],
        illustrationTags: ['fishing village', 'Innsmouth', 'Deep Ones', 'coastal fog', 'strange villagers', 'lighthouse']
    }
];
