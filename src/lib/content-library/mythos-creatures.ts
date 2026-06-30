// ============================================================
// MYTHOS CREATURES - Bestiariusz istot Mitów Cthulhu
// Based on Call of Cthulhu 7th Edition Keeper's Rulebook
// ============================================================

import { MythosCreature } from './types';

export const MYTHOS_CREATURES: MythosCreature[] = [
    // ============================================================
    // SERWITORZY (Servitor Races)
    // ============================================================
    {
        id: 'deep-one',
        name: 'Głębinowy (Deep One)',
        alternativeNames: ['Ryboludzie', 'Dzieci Dagona'],
        type: 'servitor',
        sanLoss: '0/1d6',
        combatStats: {
            str: 80, con: 60, siz: 75, dex: 50, int: 65, pow: 50,
            hp: 14, mp: 10, armor: 1, movement: 8,
            attacks: [
                { name: 'Pazury', skill: 45, damage: '1d6+1d4', attacksPerRound: 1 },
                { name: 'Włócznia', skill: 25, damage: '1d8+1d4', attacksPerRound: 1 }
            ],
            specialAbilities: ['Amfibijny — pływanie MOV 10', 'Nieśmiertelność — nie umierają ze starości'],
            dodgeValue: 25
        },
        firstGlimpse: [
            'Coś wynurza się z wody - połyskujące łuski, za dużo oczu...',
            'Widzisz sylwetkę - humanoidalną, ale niewłaściwą. Kończyny wyginają się pod złymi kątami.',
            'Zapach gnijących ryb i czegoś gorszego. Coś chlapie w ciemności...'
        ],
        fullDescription: [
            'Istota jest hybrydą między człowiekiem a rybą, z żabimi cechami. Skóra pokryta śliskimi, zielonkawymi łuskami. Ogromne, nieruchome oczy ryby. Błoniaste dłonie zakończone pazurami.',
            'Wysoka na metr osiemdziesiąt, wyprostowana na tylnych kończynach. Skrzela pulsują po bokach szyi. Z gardła wydobywa się bulgotliwy, nieludzki głos.',
            'Pachnie morzem i rozkładem. Zostawia śluzowaty ślad tam, gdzie chodzi.'
        ],
        atmospheric: [
            'Z ciemnych wód rozlega się bulgotliwy śpiew - słowa języka, który nigdy nie był ludzki.',
            'Światło latarni odbija się od setek par oczu pod powierzchnią wody.',
            'Dźwięk mokrych stóp na drewnianych deskach molo. Zbliża się.'
        ],
        behaviors: [
            'Porusza się wolno na lądzie, ale błyskawicznie w wodzie',
            'Komunikuje się bulgotliwym językiem',
            'Nosi prymitywną biżuterię ze złota i perał'
        ],
        weaknesses: ['Światło słoneczne je osłabia', 'Czysta, słodka woda jest nieprzyjemna'],
        associatedCults: ['Kult Dagona', 'Ezoteryczny Zakon Dagona w Innsmouth'],
        illustrationTags: ['fish-human hybrid', 'scales', 'bulging eyes', 'webbed hands', 'coastal horror']
    },
    {
        id: 'ghoul',
        name: 'Ghul',
        alternativeNames: ['Pożeracz zwłok', 'Mieszkaniec catacomb'],
        type: 'servitor',
        sanLoss: '0/1d6',
        combatStats: {
            str: 70, con: 60, siz: 55, dex: 65, int: 55, pow: 50,
            hp: 12, mp: 10, armor: 0, movement: 9,
            attacks: [
                { name: 'Pazury', skill: 40, damage: '1d6+1d4', attacksPerRound: 2, description: 'Dwa ataki pazurami w jednej rundzie' },
                { name: 'Ugryzienie', skill: 30, damage: '1d6+trupi jad', attacksPerRound: 1, description: 'Trafienie wymaga testu CON — porażka = paraliż na 1d6 rund' }
            ],
            specialAbilities: ['Trupi jad — paraliżujące ugryzienie (test CON)', 'Widzenie w ciemności'],
            dodgeValue: 32
        },
        firstGlimpse: [
            'Kształt skulony nad czymś... nad kimś. Odgłosy szarpania i chrzęstu kości.',
            'Para świecących oczu wpatruje się w ciebie z ciemności krypty.',
            'Coś przemknęło między nagrobkami - szybkie, zgarbione, głodne.'
        ],
        fullDescription: [
            'Przypomina skrajnie wychudzonego człowieka, ale proporcje są złe. Ręce za długie, palce zakończone ostrymi pazurami. Twarz psia, z ostrymi zębami.',
            'Skóra gumowata, szarożółta. Śmierdzi zgnilizną i surowym mięsem. Porusza się na czterech kończynach jak zwierzę.',
            'Oczy świecą słabym fosforycznym światłem. Mluczy w dziwnym języku - niektóre słowa brzmią prawie jak ludzkie.'
        ],
        atmospheric: [
            'Z głębi tunelu dobiega odgłos skrobania pazurów o kamień.',
            'Świeży grób został rozkopany od środka. Nie od zewnątrz - od środka.',
            'Śmiech. Dziecięcy, ale zniekształcony, jakby wydobywał się z gardeł, które nie są ludzkie.'
        ],
        behaviors: [
            'Żywi się ludzkimi zwłokami',
            'Buduje skomplikowane tunele pod cmentarzami',
            'Może zostać zmuszone do rozmowy - zna wiele sekretów zmarłych'
        ],
        weaknesses: ['Światło ważne je rani', 'Można z nimi negocjować - cenią wiedzę'],
        illustrationTags: ['gaunt figure', 'graveyard', 'claws', 'glowing eyes', 'hunched posture']
    },
    {
        id: 'mi-go',
        name: 'Mi-Go (Grzyby z Yuggoth)',
        alternativeNames: ['Kosmiczne grzyby', 'Jeźdźcy z Plutona'],
        type: 'servitor',
        sanLoss: '0/1d6',
        combatStats: {
            str: 60, con: 55, siz: 55, dex: 80, int: 85, pow: 65,
            hp: 11, mp: 13, armor: 0, movement: 7,
            attacks: [
                { name: 'Szczypce', skill: 45, damage: '1d6', attacksPerRound: 2 },
                { name: 'Miotacz mgielny', skill: 50, damage: 'specjalne', attacksPerRound: 1, description: 'Mgła paraliżująca — test CON lub utrata przytomności na 1d6 godzin' }
            ],
            specialAbilities: ['Lot — MOV 12 w powietrzu', 'Przetrwanie w próżni kosmicznej', 'Chirurgia mózgu — ekstrakcja żywego mózgu'],
            dodgeValue: 40
        },
        firstGlimpse: [
            'Coś leci - za cicho, za szybko. Brzęczenie jak tysiąc owadów.',
            'Widzisz to przez okno: kształt jak skrzydlaty grzyb, z dziesięcioma odnóżami...',
            'Na śniegu dziwne ślady. Setki drobnych odcisków, ułożonych w niewłaściwe wzory.'
        ],
        fullDescription: [
            'Kształtem przypomina wielkiego, różowawego homara ze skrzydłami ćmy. Głowa to skupisko czułków i organów zmysłowych.',
            'Ciało grzybowate, miękkie, ale wytrzymałe. Potrafi przetrwać w kosmicznej próżni.',
            'Komunikuje się przez zmianę kolorów i bzyczące dźwięki. Może naśladować ludzką mowę - brzmi jak zepsute radio.'
        ],
        atmospheric: [
            'Na nocnym niebie widzisz ruch - nie ptaki, nie samoloty. Coś skrzydlatego, co nie powinno latać.',
            'W laboratorium słychać brzęczenie. Próbówki wibrują same.',
            'Znajdujesz cylinder - a w nim zachowany mózg. Mózg, który mruga.'
        ],
        behaviors: [
            'Prowadzą eksperymenty na ludziach - szczególnie interesują ich mózgi',
            'Potrafią chirurgicznie usunąć mózg i zachować go żywym',
            'Handlują z niektórymi ludźmi - wymieniają technologię za "próbki"'
        ],
        associatedCults: ['Brak klasycznego kultu - indywidualni współpracownicy'],
        illustrationTags: ['fungoid', 'wings', 'multiple limbs', 'pink flesh', 'alien technology']
    },
    {
        id: 'shoggoth',
        name: 'Shoggoth',
        alternativeNames: ['Pramateria', 'Tworzywo'],
        type: 'servitor',
        sanLoss: '1d6/1d20',
        combatStats: {
            str: 350, con: 200, siz: 450, dex: 30, int: 10, pow: 20,
            hp: 65, mp: 4, armor: 8, movement: 10,
            attacks: [
                { name: 'Wchłonięcie', skill: 70, damage: '8d6', attacksPerRound: 1, description: 'Otacza i rozpuszcza cel — obrażenia każdej rundy aż do wyrwania się (test STR przeciw STR 350)' },
                { name: 'Uderzenie pseudopodem', skill: 80, damage: '4d6', attacksPerRound: 2 }
            ],
            specialAbilities: [
                'Regeneracja 2 HP/rundę',
                'Odporność na broń fizyczną — kule i ostrza zadają min. obrażenia',
                'Ogień i elektryczność zadają pełne obrażenia'
            ],
            dodgeValue: 15
        },
        firstGlimpse: [
            'Masa... poruszająca się masa. Czarna jak smoła, połyskująca tysiącem oczu.',
            'Coś płynie przez tunel - wypełnia go całkowicie, cmoka i bulgocze.',
            '"Tekeli-li!" Dźwięk bez źródła. Echo czego? Czyjego głosu?'
        ],
        fullDescription: [
            'Gigantyczna ameba, pięć metrów średnicy minimum. Czarna jak otchłań, ale pulsująca wewnętrznym światłem.',
            'Na jej powierzchni tworzą się i znikają oczy, usta, macki - wszystko to narzędzia tymczasowe.',
            'Pozostawia za sobą szlam wypalający kamień. Smród dziwny, chemiczny, nieziemski.'
        ],
        atmospheric: [
            '"Tekeli-li! Tekeli-li!" - echo bez źródła, naśladujące dawnych panów.',
            'Tunel przed wami ODDYCHA. Ściany pulsują.',
            'Metal skrzypi i pęka. Coś przepycha się przez zbyt wąskie przejście - ale przejście się rozszerza.'
        ],
        behaviors: [
            'Stworzone jako słudzy Starszej Rasy - teraz dzikie',
            'Niemal niezniszczalne, potrafią się regenerować z najmniejszych fragmentów',
            'Naśladują dźwięki, których kiedyś słuchały - w tym język dawnych panów'
        ],
        weaknesses: ['Ogień i elektryczność spowalniają', 'Intensywne światło dezorientuje'],
        illustrationTags: ['amorphous', 'black mass', 'countless eyes', 'tentacles', 'cosmic horror']
    },
    {
        id: 'byakhee',
        name: 'Byakhee',
        alternativeNames: ['Kosmiczny służący', 'Wierzchowiec Hastura'],
        type: 'servitor',
        sanLoss: '1/1d6',
        combatStats: {
            str: 90, con: 50, siz: 90, dex: 95, int: 25, pow: 50,
            hp: 14, mp: 10, armor: 2, movement: 13,
            attacks: [
                { name: 'Ugryzienie', skill: 45, damage: '1d6+1d4', attacksPerRound: 1 },
                { name: 'Pazury', skill: 55, damage: '1d6+1d4', attacksPerRound: 2 },
                { name: 'Wysysanie krwi', skill: 45, damage: '1d6 HP/rundę', attacksPerRound: 1, description: 'Po trafieniu ugryzeniem — przyczepia się i wysysa krew co rundę. Wyrwanie się = test STR' }
            ],
            specialAbilities: ['Lot — MOV 24 w powietrzu', 'Przetrwanie w próżni kosmicznej', 'Może służyć jako wierzchowiec'],
            dodgeValue: 47
        },
        firstGlimpse: [
            'Na tle gwiazd pojawia się sylwetka - skrzydła jak u nietoperza, ale za duże.',
            'Dźwięk jak szyb wiatrem... ale nie ma wiatru. Coś nadlatuje.',
            'Łopota skrzydeł z ciemności, i zapach - chemiczny, kosmiczny, błędny.'
        ],
        fullDescription: [
            'Wielkości konia, ze skrzydłami jak u nietoperza. Twarz przypomina insekta - bez żuchwy, z ogromnymi fasetowymi oczami.',
            'Ciało pokryte prążkowaną, ciemną skórą. Może przetrwać w kosmicznej próżni.',
            'Służy jako wierzchowiec dla tych, którzy znają rytuał przyzwania.'
        ],
        atmospheric: [
            'W bezchmurną noc słyszysz łopotanie skrzydeł - wysoko, bardzo wysoko.',
            'Jeden z kultysynów patrzy w niebo i uśmiecha się. "Nadchodzi mój pojazd."',
            'Między gwiazdami porusza się ciemność - kształt, który nie powinien latać.'
        ],
        behaviors: [
            'Służy jako wierzchowiec przez kosmiczną pustkę',
            'Może pić krew - przyjemność, nie konieczność',
            'Przybywają na wezwanie tych, którzy znają stare pieśni'
        ],
        associatedCults: ['Wyznawcy Hastura', 'Kult Żółtego Znaku'],
        illustrationTags: ['winged creature', 'bat-like wings', 'insectoid face', 'space', 'dark silhouette']
    },

    // ============================================================
    // DODATKOWI SERWITORZY
    // ============================================================
    {
        id: 'hunting-horror',
        name: 'Łowczy Horror (Hunting Horror)',
        alternativeNames: ['Cień na niebie', 'Czarny skrzydlaty'],
        type: 'servitor',
        sanLoss: '0/1d10',
        combatStats: {
            str: 120, con: 60, siz: 200, dex: 70, int: 20, pow: 60,
            hp: 26, mp: 12, armor: 4, movement: 11,
            attacks: [
                { name: 'Ugryzienie', skill: 60, damage: '1d6+2d6', attacksPerRound: 1 },
                { name: 'Owinięcie ogonem', skill: 80, damage: '1d4+zmiażdżenie', attacksPerRound: 1, description: 'Schwytana ofiara otrzymuje 1d6 obrażeń każdej kolejnej rundy. Wyrwanie = test STR vs STR 120' }
            ],
            specialAbilities: ['Lot', 'Wrażliwość na światło — silne światło zadaje 1d6 obrażeń/rundę', 'Może być przywołany zaklęciem'],
            dodgeValue: 35
        },
        firstGlimpse: [
            'Gwiazdy gasną - jedna po drugiej. Coś je zasłania.',
            'Cień. Gigantyczny cień przesuwający się po ziemi, ale na niebie nie ma nic...',
            'Wiatr niesie odór, jakiego nie znasz. Zimny. Kosmiczny.'
        ],
        fullDescription: [
            'Wężowaty kształt o ogromnych rozmiarach, z paroma skrzydłami. Ciało jest półprzezroczyste, jak z ciemnego dymu.',
            'Nie ma wyraźnej twarzy — jedynie mrok z rozjarzającymi się punktami, które mogą być oczami.',
            'Porusza się bezgłośnie, ale powietrze wokół niego wibruje z niesłyszalną częstotliwością.'
        ],
        atmospheric: [
            'Pies wyje w ciemność — potem milknie nagle. Cisze przerywa szept wiatru między skrzydłami.',
            'Latarnia na ganku gaśnie. Potem następna. Ciemność posuwa się w twoją stronę.',
            'Noc jest bezgwiezdna. Chmury? Nie. Coś jest POMIĘDZY tobą a gwiazdami.'
        ],
        behaviors: [
            'Służą Nyarlathotepowi jako strażnicy i ścigacze',
            'Polują wyłącznie nocą — światło dzienne je rani',
            'Można je przywołać, ale trudno kontrolować'
        ],
        weaknesses: ['Silne światło zadaje obrażenia', 'Światło dzienne je odpędza'],
        associatedCults: ['Wyznawcy Nyarlathotepa'],
        illustrationTags: ['serpentine', 'darkness', 'wings', 'cosmic void', 'shadow horror']
    },
    {
        id: 'dark-young',
        name: 'Ciemne Młode (Dark Young of Shub-Niggurath)',
        alternativeNames: ['Drzewa chodzące', 'Leśny koszmar'],
        type: 'servitor',
        sanLoss: '0/1d8',
        combatStats: {
            str: 180, con: 120, siz: 280, dex: 55, int: 35, pow: 75,
            hp: 40, mp: 15, armor: 5, movement: 8,
            attacks: [
                { name: 'Macka', skill: 70, damage: '2d6+3d6', attacksPerRound: 4, description: 'Cztery ataki mackami w jednej rundzie na różne cele' },
                { name: 'Podeptanie', skill: 50, damage: '4d6', attacksPerRound: 1, description: 'Tylko cele mniejsze niż SIZ 100' }
            ],
            specialAbilities: ['4 ataki mackami na rundę', 'Schwytana ofiara jest wciągana do pnia i zgniatana', 'Regeneracja 3 HP/rundę'],
            dodgeValue: 27
        },
        firstGlimpse: [
            'To nie drzewo. Drzewa nie mają kopyt. Drzewa nie mają ust.',
            'Las się porusza — ale to nie wiatr. Pnie IDISZ.',
            'Ziemia drży pod kopytami czegoś, co wygląda jak dąb stojący na trzech grubych nogach.'
        ],
        fullDescription: [
            'Monstrualny kształt — połączenie wielkiego drzewa i ośmiornicy. Trzy masywne nogi zakończone kopytami.',
            'Z pnia wyrasta gąszcz macek, a na ich końcach otwierają się ssące usta. Gałęzie to nie gałęzie — to kończyny.',
            'Śmierdzi wilgotną ziemią, rozkładem roślinnym i czymś jeszcze — płodnym, odrażającym, praprzyrodzonym.'
        ],
        atmospheric: [
            'Głęboko w lesie słyszysz pieśń — niską, dudniącą, jakby las sam śpiewał.',
            'Drzewa wokół polany są... pochylone. Jakby się kłaniały. Czemuś pośrodku.',
            'Pod stopami czujesz wibrację. Ziemia drży w rytmie kroków czegoś ogromnego.'
        ],
        behaviors: [
            'Strzegą miejsc świętych dla Shub-Niggurath',
            'Pojawiają się podczas rytuałów płodności',
            'Łapią ofiary mackami i wciągają do pnia'
        ],
        weaknesses: ['Ogień', 'Powolne — można uciec biegiem na otwartej przestrzeni'],
        associatedCults: ['Wyznawcy Shub-Niggurath', 'Kulty płodności'],
        illustrationTags: ['tree horror', 'tentacles', 'hooves', 'forest', 'mouths', 'dark woodland']
    },
    {
        id: 'star-vampire',
        name: 'Gwiezdny Wampir (Star Vampire)',
        alternativeNames: ['Niewidzialny Ssący', 'Shambler from the Stars'],
        type: 'independent',
        sanLoss: '0/1d8',
        combatStats: {
            str: 130, con: 70, siz: 100, dex: 70, int: 50, pow: 60,
            hp: 17, mp: 12, armor: 2, movement: 9,
            attacks: [
                { name: 'Ugryzienie/Ssanie', skill: 65, damage: '1d6+wysysanie krwi', attacksPerRound: 1, description: 'Przyczepiony wampir wysysa 1d6 STR każdej rundy. Ofiara traci przytomność przy STR 0, śmierć przy -5' }
            ],
            specialAbilities: ['Niewidzialność — staje się widoczny dopiero gdy pije krew', 'Przyzwanie zaklęciem — "Shambler from the Stars"', 'Może latać'],
            dodgeValue: 35
        },
        firstGlimpse: [
            'Powietrze się zniekształca — coś tu jest, ale nie widzisz. Czujesz oddech na karku.',
            'Krew kapie z sufitu. Z NICZEGO. Z pustego powietrza.',
            'Słyszysz mlaskanie — chciwe, wilgotne, głodne. Ale pokój jest pusty.'
        ],
        fullDescription: [
            'Gdy pije krew, staje się widoczny: galaretowaty, karmazynowy kształt z setkami ssawek.',
            'Przypomina wielki, pulsujący czerwony balon z mackami zakończonymi przyssawkami.',
            'Śmieje się piskliwie — straszliwy, bulgotliwy dźwięk radości drapieżnika.'
        ],
        atmospheric: [
            'Ciepło opuszcza pokój — jakby coś chłonęło energię z otoczenia.',
            'Na ścianie pojawia się mokry ślad, okrągły, wielkości talerza. Potem drugi.',
            'Śmiech — piskliwy, nieludzki, pełen radości. Ale nikogo tu nie ma.'
        ],
        behaviors: [
            'Przywoływany zaklęciem — potem jest wolny i głodny',
            'Niewidzialny, dopóki nie zacznie pić krwi',
            'Preferuje samotne ofiary'
        ],
        weaknesses: ['Widoczny gdy pije krew — wtedy można go zaatakować', 'Można odpędzić silnym zaklęciem ochronnym'],
        illustrationTags: ['invisible horror', 'blood', 'suckers', 'crimson', 'tentacles', 'invisible predator']
    },
    {
        id: 'nightgaunt',
        name: 'Nocny Oprawca (Night-Gaunt)',
        alternativeNames: ['Nocne cienie', 'Beztwarzowi'],
        type: 'independent',
        sanLoss: '0/1d6',
        combatStats: {
            str: 80, con: 55, siz: 75, dex: 90, int: 35, pow: 45,
            hp: 13, mp: 9, armor: 0, movement: 6,
            attacks: [
                { name: 'Łaskotanie', skill: 75, damage: 'specjalne', attacksPerRound: 1, description: 'Ofiara musi zdać test CON lub bezradnie się śmieje i nie może działać przez 1d4 rund' },
                { name: 'Chwycenie i upuszczenie', skill: 60, damage: 'zależne od wysokości', attacksPerRound: 1, description: 'Chwyta ofiarę i wznosi się. Upuszczenie z wysokości = 1d6 za każde 3 metry' }
            ],
            specialAbilities: ['Lot — MOV 14 w powietrzu', 'Bezgłośne — nie wydają żadnych dźwięków', 'Łaskotanie paraliżujące'],
            dodgeValue: 45
        },
        firstGlimpse: [
            'Cień odrywa się od ściany. Nie — to nie cień. To coś bez twarzy.',
            'Gładka, czarna skóra. Gdzie powinna być twarz — jest nic. Gładka płaszczyzna.',
            'Porusza się bezgłośnie. Nie słyszałeś go, dopóki nie dotknęło twojego ramienia.'
        ],
        fullDescription: [
            'Humanoidalna istota, szczupła i muskularna. Skóra gładka, czarna jak obsydian.',
            'Twarz jest pusta — brak oczu, ust, nosa. Tylko gładka, czarna powierzchnia.',
            'Ogon zakończony kolcem. Skrzydła jak u nietoperza, ale cieńsze, bardziej membranowe.'
        ],
        atmospheric: [
            'W ciemności coś cię dotyka — delikatnie, prawie pieszczotliwie. Ale nic nie widzisz.',
            'Cisza. Absolutna cisza. Nawet świerszcze umilkły.',
            'Twój latarnia oświetla coś na ścianie — cień bez źródła, który się porusza.'
        ],
        behaviors: [
            'Działają w grupach, porywając ofiary w powietrze',
            'Łaskocą schwytanych do utraty zmysłów',
            'Służą Nodens lub operują niezależnie w Krainie Snów'
        ],
        weaknesses: ['Nie atakują bezpośrednio — wolą porywać', 'Można odpędzić symbolem Starszych Bogów'],
        associatedCults: ['Nodens (sługi)'],
        illustrationTags: ['faceless', 'black skin', 'wings', 'slender', 'tail', 'dreamlands']
    },
    {
        id: 'dimensional-shambler',
        name: 'Wymiarowy Włóczęga (Dimensional Shambler)',
        alternativeNames: ['Coś z innego wymiaru'],
        type: 'independent',
        sanLoss: '0/1d10',
        combatStats: {
            str: 100, con: 80, siz: 80, dex: 45, int: 55, pow: 70,
            hp: 16, mp: 14, armor: 3, movement: 8,
            attacks: [
                { name: 'Chwycenie', skill: 60, damage: '1d8+1d6', attacksPerRound: 2 },
                { name: 'Porwanie wymiarowe', skill: 40, damage: 'specjalne', attacksPerRound: 1, description: 'Porywa cel do innego wymiaru — ofiara znika na zawsze, chyba że ktoś ją przywoła z powrotem' }
            ],
            specialAbilities: ['Przechodzenie między wymiarami', 'Odporność na broń konwencjonalną — zadaje połowę obrażeń', 'Może pojawiać się i znikać dowolnie'],
            dodgeValue: 22
        },
        firstGlimpse: [
            'Powietrze pęka. Nie — ono się rozstępuje. Coś wychodzi z POMIĘDZY.',
            'Widzisz to kątem oka — potwór tam, gdzie nie powinno być nic. Obracasz się — znikł. Obracasz się znowu — jest bliżej.',
            'Kształt zmienia się z każdym krokiem — jakby rzeczywistość nie mogła się zdecydować, jak on wygląda.'
        ],
        fullDescription: [
            'Humanoidalny kształt, ale pulsujący, niestabilny. Jedna chwila — przerośnięty goryl. Następna — coś bezforemnego.',
            'Masywne, muskularne ramiona zakończone szponiastymi dłońmi. Sierść lub łuski — trudno powiedzieć.',
            'Tam, gdzie stoi, przestrzeń się zniekształca — jak odbicie w krzywym lustrze.'
        ],
        atmospheric: [
            'Powietrze pachnie ozonem i czymś metalicznym. Temperatura spada.',
            'Twój zegarek staje. Potem zaczyna iść do tyłu.',
            'Kąt pokoju wygląda... źle. Za głęboki. Ciemniejszy niż powinien być.'
        ],
        behaviors: [
            'Poluje między wymiarami — porywa ofiary w inne plany egzystencji',
            'Może być przywołane zaklęciem, ale jest nieposłuszne',
            'Pojawia się w miejscach, gdzie tkanka rzeczywistości jest cienka'
        ],
        weaknesses: ['Zaklęcia wiążące mogą je unieruchomić', 'Znak Starszych czasem odpycha'],
        illustrationTags: ['dimensional', 'shifting form', 'claws', 'between worlds', 'unstable reality']
    },
    {
        id: 'serpent-people',
        name: 'Ludzie-Węże (Serpent People)',
        alternativeNames: ['Wężoludzie', 'Valusians', 'Dzieci Yig'],
        type: 'independent',
        sanLoss: '0/1d6',
        combatStats: {
            str: 60, con: 55, siz: 60, dex: 70, int: 90, pow: 80,
            hp: 12, mp: 16, armor: 1, movement: 8,
            attacks: [
                { name: 'Ugryzienie (jadowite)', skill: 50, damage: '1d4+jad', attacksPerRound: 1, description: 'Jad — test CON lub śmierć w ciągu 1d6 × 10 minut. Nawet sukces = 1d10 obrażeń' },
                { name: 'Broń lub magia', skill: 65, damage: 'wg zaklęcia/broni', attacksPerRound: 1 }
            ],
            specialAbilities: ['Zaklęcia — znają 1d6+2 zaklęć', 'Zmiennokształtność — mogą przyjmować ludzką postać', 'Odporność na jad'],
            dodgeValue: 35
        },
        firstGlimpse: [
            'Jego oczy. Mają pionowe źrenice. Przez ułamek sekundy, zanim zamruga.',
            'Skóra na nadgarstku ma dziwną fakturę. Łuski? Nie — to musi być choroba skóry. Prawda?',
            'Szept w języku, który brzmi jak syk węża. Pochodzi od profesora Mortona.'
        ],
        fullDescription: [
            'W prawdziwej postaci: humanoidalny gad, wyprostowany, z wydłużoną czaszką i pionowymi źrenicami.',
            'Łuski od jadeitowozielonej do ciemnobrązowej. Ręce z trzema palcami zakończonymi pazurami.',
            'W ludzkiej postaci wyglądają normalnie — ale coś jest nie tak. Zbyt zimne dłonie. Zbyt długie mrugnięcia.'
        ],
        atmospheric: [
            'W archiwach muzeum znajdujesz inskrypcje starsze niż ludzka cywilizacja. Pismo wężowe.',
            'Profesor zawsze nosi rękawiczki. I nigdy nie pije kawy — tylko surowe jajka.',
            'Wśród ruin odkrywasz miasto — prehimeryczne, zbudowane na planie spirali. Kto tu mieszkał?'
        ],
        behaviors: [
            'Żyją ukryte wśród ludzi, w ludzkiej postaci',
            'Są niezwykle inteligentne i władają potężną magią',
            'Dążą do odzyskania dawnego imperium sprzed ludzkości'
        ],
        weaknesses: ['Zimno spowalnia ich metabolizm', 'Mogą zostać zdemaskowane przez Zaklęcie Widzenia Prawdy'],
        associatedCults: ['Kult Yig', 'Tajne stowarzyszenia wężoludzi'],
        illustrationTags: ['serpentine', 'scales', 'slit pupils', 'humanoid reptile', 'ancient civilization']
    },
    {
        id: 'sand-dweller',
        name: 'Mieszkaniec Piasków (Sand Dweller)',
        alternativeNames: ['Pustynny Robak'],
        type: 'independent',
        sanLoss: '1/1d8',
        combatStats: {
            str: 150, con: 100, siz: 180, dex: 40, int: 10, pow: 30,
            hp: 28, mp: 6, armor: 4, movement: 6,
            attacks: [
                { name: 'Ugryzienie', skill: 55, damage: '2d6+2d6', attacksPerRound: 1 },
                { name: 'Połknięcie', skill: 35, damage: 'specjalne', attacksPerRound: 1, description: 'Cel SIZ ≤ 80. Połknięta ofiara otrzymuje 1d6 kwasowych obrażeń na rundę' }
            ],
            specialAbilities: ['Kopanie tuneli — MOV 4 pod ziemią', 'Wykrywanie wibracji — wyczuwa kroki na 100m', 'Zakopuje się pod piaskiem i atakuje od dołu'],
            dodgeValue: 20
        },
        firstGlimpse: [
            'Piasek się porusza. Fala biegnie w twoją stronę — pod powierzchnią.',
            'Dźwięk — niski, wibrujący, jak krztuszenie się ziemi.',
            'Wielbłąd znika. W jednej chwili — pożarty przez ziemię pod kopytami.'
        ],
        fullDescription: [
            'Masywny robak z twardą, piaskową skorupą. Gardziel pełna obrotowych rzędów zębów.',
            'Ciało segmentowane, pokryte piaskowym pancerzem. Gdy się porusza, ziemia drży.',
            'Oczy szczątkowe lub brak — poluje poprzez wibracje.'
        ],
        atmospheric: [
            'Beduini odmawiają iść dalej. Mówią, że piasek tu "oddycha".',
            'Na pustyni znajdziesz okrągłe zagłębienia — dziesiątki. Jak ślady gigantycznych meduz.',
            'Cisza pustyni jest złowroga. Żaden owad, żaden ptak. Wszystko ucieka.'
        ],
        behaviors: [
            'Czai się pod piaskiem, atakując od dołu',
            'Poluje na wibracje — spokojne stanie minimalizuje ryzyko',
            'Tworzy podpoziemne tunele w pustynnym piasku'
        ],
        weaknesses: ['Nie może kopać w skale — ucieczka na skaliste podłoże', 'Silne hałasy mogą je zdezorientować'],
        illustrationTags: ['sand worm', 'desert', 'teeth', 'burrowing', 'ancient']
    },

    // ============================================================
    // WIELCY PRZEDWIECZNI (Great Old Ones)
    // ============================================================
    {
        id: 'cthulhu',
        name: 'Cthulhu',
        alternativeNames: ['Śpiący w R\'lyeh', 'Wielki Cthulhu', 'Pan R\'lyeh'],
        type: 'great_old_one',
        sanLoss: '1d10/1d100',
        combatStats: {
            str: 840, con: 1200, siz: 1100, dex: 210, int: 420, pow: 500,
            hp: 230, mp: 100, armor: 21, movement: 40,
            attacks: [
                { name: 'Macka', skill: 100, damage: '10d6', attacksPerRound: 6, description: '6 ataków mackami na rundę. Każdy trafiony cel jest automatycznie podnoszony i połykany następnej rundy' },
                { name: 'Podeptanie', skill: 100, damage: 'śmierć', attacksPerRound: 1, description: 'Automatyczna śmierć dla celów mniejszych niż SIZ 100' }
            ],
            specialAbilities: [
                'Regeneracja 12 HP/rundę',
                'Jeśli zabity — odradza się w 1d6+6 minut z pełnym HP',
                'Telepatie — wywołuje szaleństwo w promieniu kilometrów',
                'Zaklęcia — zna wszystkie zaklęcia Mitów',
                'Latanie'
            ],
            dodgeValue: 100
        },
        firstGlimpse: [
            'Morze się rozstępuje. Wyłania się coś tak ogromnego, że umysł odmawia rejestrowania.',
            'Widzisz... górę? Nie — górę, która się PORUSZA. Która ma skrzydła. Która na ciebie PATRZY.',
            'Nad horyzontem wyrasta kształt — humanoidalny, ale kosmiczny. Twój umysł pęka.'
        ],
        fullDescription: [
            'Humanoidalny kształt setek metrów wysokości. Głowa ośmiornicy z lasem macek. Skrzydła jak u smoka.',
            'Ciało pokryte łuskami, miękkie i elastyczne, ale niezniszczalne. Oczy — inteligentne, zimne, kosmiczne.',
            'Sam widok pozbawia rozumu. Rzeczywistość zniekształca się w jego obecności.'
        ],
        atmospheric: [
            'Fh\'tagn. Słowo pojawia się we snach — milionów ludzi, tej samej nocy.',
            'Woda w porcie się cofa. Statki osiadają na dnie. Coś zbliża się od strony otwartego oceanu.',
            'Powietrze gęstnieje. Grawitacja się zmienia. Kompasy wirują. On się budzi.'
        ],
        behaviors: [
            'Śpi w zatopionej cytadeli R\'lyeh na dnie Pacyfiku',
            'Nawet śpiący wysyła telepatyczne sny do wrażliwych umysłów',
            'Gdy się obudzi — koniec ludzkiej cywilizacji'
        ],
        weaknesses: ['Można go tymczasowo "zabić" — ale odradza się', 'Gwiazdy muszą być odpowiednie do przebudzenia'],
        associatedCults: ['Kult Cthulhu — globalny', 'Kult z bagien Luizjany', 'Morskie kulty'],
        illustrationTags: ['octopus head', 'dragon wings', 'cosmic scale', 'ocean', 'Rlyeh', 'cosmic horror']
    },
    {
        id: 'hastur',
        name: 'Hastur (Król w Żółci)',
        alternativeNames: ['Nie-Wyrażalny', 'Żółty Król', 'Ten, Którego Nie Wolno Nazywać'],
        type: 'great_old_one',
        sanLoss: '1d10/1d100',
        combatStats: {
            str: 500, con: 600, siz: 800, dex: 300, int: 350, pow: 400,
            hp: 140, mp: 80, armor: 18, movement: 30,
            attacks: [
                { name: 'Dotknięcie', skill: 95, damage: '10d6', attacksPerRound: 2 },
                { name: 'Magiczny atak', skill: 100, damage: 'specjalne', attacksPerRound: 1, description: 'Może użyć dowolnego zaklęcia Mitów jako akcji' }
            ],
            specialAbilities: [
                'Przywołanie Żółtego Znaku — każdy kto widzi Znak traci 1d6 SAN',
                'Teleportacja',
                'Zna wszystkie zaklęcia Mitów',
                'Obecność powoduje szaleństwo'
            ],
            dodgeValue: 100
        },
        firstGlimpse: [
            'Widzisz Żółty Znak. Nie wiesz, skąd go znasz. Ale go rozpoznajesz. I JEST ZA PÓŹNO.',
            'Mgła żółtawa, gęsta, pachnie ozonem i gnijącymi fiołkami. Coś stoi w jej centrum.',
            'Postać w żółtych szatach. Maska. Pod maską... nic. Nie — coś GORSZEGO niż nic.'
        ],
        fullDescription: [
            'Postać w rozwianych żółtych szatach, zakrywających wszystko. Pod nimi — kształty, które nie powinny istnieć.',
            'Twarz — jeśli to twarz — ukryta za Bladą Maską. Gdy maska spada, świadkowie tracą rozum.',
            'Otaczany mgłą, za którą widać czarne gwiazdy obcego nieba — nieba Carcosa.'
        ],
        atmospheric: [
            'Wśród papierów twojego wuja znajdujesz rękopis sztuki teatralnej. "Król w Żółci". NIE CZYTAJ DRUGIEGO AKTU.',
            'Nad jeziorem unosi się mgła. Żółta mgła. I za nią — wieże miasta, którego tu nie ma.',
            'Aktorzy na scenie nagle mówią tekstem, którego nie ma w skrypcie. Publiczność zaczyna krzyczeć.'
        ],
        behaviors: [
            'Rezyduje w Carcosa — mieście na brzegu jeziora Hali pod czarnymi gwiazdami',
            'Działa przez sztukę teatralną "Król w Żółci" — kto przeczyta Drugi Akt, traci rozum',
            'Rywalizuje z Cthulhu o wpływy na Ziemi'
        ],
        weaknesses: ['Nie może działać swobodnie, gdy gwiazdy są niewłaściwe', 'Rytuał odpędzenia specyficzny dla Hastura'],
        associatedCults: ['Kult Żółtego Znaku', 'Wyznawcy Hastura', 'Bractwo Żółtej Maski'],
        illustrationTags: ['yellow robes', 'pale mask', 'Carcosa', 'alien stars', 'mist', 'cosmic horror']
    },
    {
        id: 'ithaqua',
        name: 'Ithaqua (Kroczyściel)',
        alternativeNames: ['Chodzący po Wietrze', 'Wendigo', 'Lodowy Bóg'],
        type: 'great_old_one',
        sanLoss: '1d6/1d20',
        combatStats: {
            str: 300, con: 250, siz: 350, dex: 120, int: 80, pow: 150,
            hp: 60, mp: 30, armor: 10, movement: 30,
            attacks: [
                { name: 'Chwycenie i porwanie', skill: 85, damage: '3d6', attacksPerRound: 2, description: 'Chwyta cel i wznosi się w powietrze. Ofiara upuszczona z dużej wysokości' },
                { name: 'Lodowy podmuch', skill: 90, damage: '4d6 (mróz)', attacksPerRound: 1, description: 'Stożkowy atak lodowatym wiatrem na wszystkich w promieniu 10m' }
            ],
            specialAbilities: [
                'Lot — MOV 100 w powietrze',
                'Kontrola pogody — burze śnieżne, temperatury do -60°C',
                'Porywanie ofiar w arktyczną pustkę',
                'Zamrożone ofiary stają się wiecznymi sługami'
            ],
            dodgeValue: 60
        },
        firstGlimpse: [
            'Wiatr wyje jak tuzin wilków. Temperatura spada — dziesięć, dwadzieścia stopni w minutę.',
            'W zamieci widzisz kształt — gigantyczny, na dwóch nogach, z oczami jak czerwone węgle.',
            'Znajdujesz ciało wmrożone w lód — dwa metry nad ziemią. Twarz — czysta groza.'
        ],
        fullDescription: [
            'Gigantyczna, humanoidalna postać o wzroście kilkudziesięciu metrów. Ciało z lodu i wiatru.',
            'Oczy żarzą się na czerwono. Każdy krok podnosi zamieć. Temperatura spada do arktycznych poziomów.',
            'Dwunożny, z gigantycznymi ramionami. Poniżej kolan — mgła i lodowy wicher.'
        ],
        atmospheric: [
            'Trapper nie wrócił. Znaleziono jego obóz — zamrożony jesienny posiłek, ciepłe jeszcze ognisko. I ślady OGROMNYCH stóp w śniegu.',
            'Zamiecie o tej porze roku? Meteorolodzy nie potrafią tego wytłumaczyć.',
            'Eskimoskie legendy mówią o Chodzącym po Wietrze. Mówią, żeby nie patrzeć w niebo podczas burzy.'
        ],
        behaviors: [
            'Poluje w arktycznych regionach',
            'Porywa ludzi i wynosi ich na wielką wysokość',
            'Zamraża ofiary żywcem, czyniąc je wiecznymi sługami'
        ],
        weaknesses: ['Ogień i ciepło osłabiają', 'Rzadko pojawia się poza arktycznymi regionami'],
        associatedCults: ['Kulty eskimoskie', 'Wyznawcy na północy Kanady i Syberii'],
        illustrationTags: ['ice giant', 'blizzard', 'red eyes', 'arctic', 'wind', 'frozen horror']
    },
    {
        id: 'dagon',
        name: 'Ojciec Dagon',
        alternativeNames: ['Pan Głębin', 'Wielki Głębinowy'],
        type: 'great_old_one',
        sanLoss: '1d6/1d20',
        combatStats: {
            str: 280, con: 200, siz: 350, dex: 80, int: 100, pow: 120,
            hp: 55, mp: 24, armor: 10, movement: 8,
            attacks: [
                { name: 'Pazur', skill: 80, damage: '5d6', attacksPerRound: 2 },
                { name: 'Podeptanie', skill: 60, damage: '8d6', attacksPerRound: 1, description: 'Tylko cele na lądzie, SIZ ≤ 120' }
            ],
            specialAbilities: [
                'Pływanie — MOV 20 w wodzie',
                'Kontrola Głębinowych — telepatyczne rozkazy',
                'Zaklęcia — zna zaklęcia morskie i przyzywające',
                'Regeneracja 4 HP/rundę'
            ],
            dodgeValue: 40
        },
        firstGlimpse: [
            'Fale rosną. Coś się wynurza — głowa, barki — Głębinowy? Nie. DUŻO za duży.',
            'Molo pęka pod naporem czegoś pod wodą. Deszczułki wylatują w powietrze. Dłoń — wielkości łodzi.',
            'Rybacy krzyczą coś o "Ojcu" — zanim fala ich pochłania.'
        ],
        fullDescription: [
            'Głębinowy, ale o wzroście piętnastu metrów. Łuski grube jak tarcze, oczy jak reflektor.',
            'Humanoidalny, ale masywniejszy, starszy, potężniejszy. Koronowany — nie metalem, ale koralowcem i kością.',
            'Woda wokół niego kipi i faluje. Samo jego wynurzenie powoduje lokalne tsunami.'
        ],
        atmospheric: [
            'Stare ryciny pokazują istotę w oceanie — kapłani w Innsmouth nazywają ją Ojcem.',
            'Sieć rybacka wraca pusta. Znowu. Rybacy szepcą: "Ojciec jest głodny."',
            'W nocy, z klifu, widzisz światło pod wodą. Głębokie. Poruszające się.'
        ],
        behaviors: [
            'Lider Głębinowych — wraz z Matką Hydra',
            'Rezyduje w podwodnym mieście blisko Innsmouth',
            'Przyjmuje ofiary od kultu'
        ],
        weaknesses: ['Powolny na lądzie', 'Można tymczasowo odpędzić potężnymi zaklęciami ochronnymi'],
        associatedCults: ['Ezoteryczny Zakon Dagona', 'Kult Dagona i Hydry'],
        illustrationTags: ['giant deep one', 'ocean', 'coral crown', 'massive', 'coastal horror']
    },

    // ============================================================
    // ZEWNĘTRZNI BOGOWIE (Outer Gods)
    // ============================================================
    {
        id: 'nyarlathotep-bloated-woman',
        name: 'Nyarlathotep — Spasiona Kobieta',
        alternativeNames: ['Pełzający Chaos — awatar'],
        type: 'outer_god',
        sanLoss: '1/1d10',
        combatStats: {
            str: 200, con: 300, siz: 120, dex: 110, int: 500, pow: 400,
            hp: 42, mp: 80, armor: 8, movement: 12,
            attacks: [
                { name: 'Dotknięcie', skill: 90, damage: '3d6+drenujące MP', attacksPerRound: 1, description: 'Oprócz obrażeń wysysa 1d10 MP od ofiary' },
                { name: 'Zaklęcie', skill: 100, damage: 'wg zaklęcia', attacksPerRound: 1 }
            ],
            specialAbilities: [
                'Zna wszystkie zaklęcia Mitów',
                'Może przybrać dowolny z tysiąca awatarów',
                'Manipulacja umysłami — test POW vs POW 400',
                'Teleportacja'
            ],
            dodgeValue: 55
        },
        firstGlimpse: [
            'Kobieta w tłumie — otyła, uśmiechnięta, otoczona kultysynami. Jej oczy są STARE.',
            'Każdy, kto na nią patrzy, czuje irracjonalny lęk. Ale nie może odwrócić wzroku.',
            'Porusza się z gracją, która nie pasuje do jej postury. Jakby grawitacja była sugestią.'
        ],
        fullDescription: [
            'Otyła kobieta azjatyckiego wyglądu, ubrana w jaskrawe szaty. Uśmiech nie dotyka oczu — oczu starych jak wszechświat.',
            'Jej cień nie pasuje do niej — jest za długi, ma za dużo kończyn.',
            'Wokół niej rzeczywistość jest cieńsza. Słyszysz szepty z innych wymiarów.'
        ],
        atmospheric: [
            'Pielgrzymi w Szanghaju mówią o "Matce", która zna wszystkie odpowiedzi. Proszą o wiedzę. Płacą rozumem.',
            'Stoisko z jedwabiem na bazarze — sprzedawczyni szepcze rzeczy, których nie powinna znać. O tobie.',
            'W jej oczach widzisz na chwilę kosmos — i kosmos patrzy na ciebie z rozbawieniem.'
        ],
        behaviors: [
            'Jeden z tysiąca awatarów Nyarlathotepa',
            'Manipuluje kultami i ludźmi dla kosmicznej rozrywki',
            'Oferuje wiedzę — za cenę, której ofiara nie rozumie'
        ],
        weaknesses: ['To "tylko" awatar — zniszczenie go nie rani Nyarlathotepa', 'Może być odpędzony Znakiem Starszych'],
        associatedCults: ['Zakon Spasionej Kobiety (Szanghaj)', 'Bezpośredni kult Nyarlathotepa'],
        illustrationTags: ['obese woman', 'ancient eyes', 'cultists', 'Shanghai', 'cosmic manipulation']
    },
    {
        id: 'nyarlathotep-dark-pharaoh',
        name: 'Nyarlathotep — Mroczny Faraon',
        alternativeNames: ['Pełzący Chaos — egipski awatar', 'Czarny Faraon'],
        type: 'outer_god',
        sanLoss: '1d6/1d20',
        combatStats: {
            str: 250, con: 350, siz: 100, dex: 180, int: 500, pow: 400,
            hp: 45, mp: 80, armor: 12, movement: 15,
            attacks: [
                { name: 'Berło', skill: 100, damage: '5d6', attacksPerRound: 1, description: 'Berło z obsydianu — ignoruje pancerz' },
                { name: 'Zaklęcie', skill: 100, damage: 'wg zaklęcia', attacksPerRound: 1 }
            ],
            specialAbilities: [
                'Zna wszystkie zaklęcia Mitów',
                'Niezniszczalny — jeśli "zabity", pojawia się ponownie w 1d6 rund',
                'Aura strachu — test SAN 1d6/1d20 na jego widok',
                'Kontrola umysłu — test POW vs POW 400'
            ],
            dodgeValue: 90
        },
        firstGlimpse: [
            'Wysoka postać w egipskich szatach. Skóra ciemna jak noc. Oczy — złote, pionowe źrenice.',
            'Faraon? Tu? Teraz? Ale procesja za nim jest prawdziwa — i ludzie padają na twarze.',
            'Uśmiecha się. Wie, co zrobisz, zanim ty to wiesz.'
        ],
        fullDescription: [
            'Wysoki, atletyczny mężczyzna o ciemnej skórze. Nosi szaty egipskiego faraona — ale z ery, której archeolodzy nie znają.',
            'Berło z czarnego obsydianu pulsuje energią. Oczy są złote i widzą wszystko.',
            'Charyzmatyczny — przyciąga uwagę i lojalność. Ale za fasadą — starożytna, kosmiczna inteligencja.'
        ],
        atmospheric: [
            'W piramidzie jest korytarz, którego nie ma na żadnym planie. Prowadzi W DÓŁ.',
            'Hieroglify na ścianie zaczynają się ruszać, gdy na nie nie patrzysz.',
            'Człowiek w garniturze na wykładzie o Egipcie — ma w oczach coś dziwnego. Mówi rzeczy, które są prawdziwe, ale nie powinien ich znać.'
        ],
        behaviors: [
            'Najbardziej aktywny na Ziemi spośród Zewnętrznych Bogów',
            'Bawi się ludzkością — jest jednocześnie destrukcyjny i charyzmatyczny',
            'Manipuluje kultami, rządami, wydarzeniami historycznymi'
        ],
        weaknesses: ['Zniszczenie awatara nie niszczy boga', 'Można opóźnić jego plany — ale nie zatrzymać'],
        associatedCults: ['Bractwo Czarnego Faraona', 'Kult Pełzającego Chaosu', 'Zakon Nocnego Oblicza'],
        illustrationTags: ['dark pharaoh', 'Egyptian', 'obsidian staff', 'golden eyes', 'cosmic intelligence']
    },
    {
        id: 'shub-niggurath',
        name: 'Shub-Niggurath',
        alternativeNames: ['Czarna Koza z Tysiącem Młodych', 'Matka Wszystkiego'],
        type: 'outer_god',
        sanLoss: '1d10/1d100',
        combatStats: {
            str: 600, con: 800, siz: 700, dex: 50, int: 200, pow: 350,
            hp: 150, mp: 70, armor: 15, movement: 12,
            attacks: [
                { name: 'Macka', skill: 85, damage: '6d6', attacksPerRound: 8, description: '8 ataków mackami na rundę na różne cele' },
                { name: 'Pożarcie', skill: 70, damage: 'śmierć', attacksPerRound: 1, description: 'Automatyczna śmierć dla SIZ ≤ 100' }
            ],
            specialAbilities: [
                'Nieśmiertelność i regeneracja 10 HP/rundę',
                'Każda runda może spawnować 1d4 Ciemnych Młodych',
                'Zna liczne zaklęcia płodności i przemiany',
                'Jej obecność powoduje niekontrolowany wzrost organiczny wokół'
            ],
            dodgeValue: 25
        },
        firstGlimpse: [
            'Las rośnie. Dosłownie — gałęzie pęcznieją, trawa sięga kolan, a z ziemi wyrastają... macki?',
            'Zapach — ciężki, płodny, słodki aż do mdłości. Zapach życia doprowadzonego do granic obrzydliwości.',
            'Na polanie — masa. Żywa, pulsująca, rodząca. Z każdej powierzchni wyrasta coś nowego.'
        ],
        fullDescription: [
            'Gigantyczna, amorficzna masa — połączenie roślinnego i zwierzęcego. Macki, usta, oczy, kopyta wyrastają i znikają.',
            'Nieustannie rodzi — z jej ciała odrywają się mniejsze istoty (Ciemne Młode) i odchodzą.',
            'Jej obecność wywołuje eksplozję życia — rośliny rosną na oczach, insekty mnożą się, grzyby wyrastają.'
        ],
        atmospheric: [
            'Iä! Shub-Niggurath! Czarna Koza z Tysiącem Młodych!',
            'Na polanie w lesie — ołtarz pokryty mchem i krwią. Wokół — ślady kopyt, ale za duże.',
            'Koza na farmie urodzi kozłka z za dużą ilością nóg. Farmer się powiesi tej nocy.'
        ],
        behaviors: [
            'Pojawia się podczas rytuałów płodności',
            'Nieustannie rodzi nowe istoty',
            'Mniej aktywna na Ziemi niż jej potomstwo'
        ],
        weaknesses: ['Ogień hamuje regenerację', 'Rzadko pojawia się fizycznie — zwykle działa przez potomstwo'],
        associatedCults: ['Kulty płodności na całym świecie', 'Kult Czarnej Kozy'],
        illustrationTags: ['amorphous', 'birth', 'tentacles', 'hooves', 'forest', 'fertility horror', 'cosmic mother']
    },

    // ============================================================
    // DODATKOWE STWORZENIA
    // ============================================================
    {
        id: 'elder-thing',
        name: 'Starsza Istota (Elder Thing)',
        alternativeNames: ['Starsi', 'Dawni'],
        type: 'independent',
        sanLoss: '0/1d6',
        combatStats: {
            str: 120, con: 100, siz: 100, dex: 60, int: 120, pow: 80,
            hp: 20, mp: 16, armor: 5, movement: 7,
            attacks: [
                { name: 'Macka', skill: 50, damage: '1d6+1d6', attacksPerRound: 5, description: '5 ramion z mackami — 5 ataków na rundę' }
            ],
            specialAbilities: ['Amfibijne', 'Lot — skrzydła membranowe', 'Zaawansowana technologia', 'Telepatia z innymi Starszymi Istotami'],
            dodgeValue: 30
        },
        firstGlimpse: [
            'Beczkowaty kształt — z pięcioma ramionami? Skrzydłami? Nie pasuje do niczego, co znasz.',
            'W lodzie Antarktydy coś jest uwięzione — i to coś otwiera oczy. Pięć oczu.',
            'Malowidło na ścianie jaskini. Istota jak gwiazda morska, ale wyprostowana, z narzędziami...'
        ],
        fullDescription: [
            'Beczkowaty tułów, ~180cm. Pięć grzbietowych grzebieni, pięć ramion z mackami, pięcioramienna "głowa".',
            'Skóra twarda, szarozielona. Skrzydła membranowe zwinięte na plecach.',
            'Narzędzia — kamienne, metalowe, z materiałów niewyrażalnych. Twórcy Shoggotha.'
        ],
        atmospheric: [
            'Pod lodem Antarktydy kryje się miasto. Nie ludzkie. Starsze niż ludzkość o miliardy lat.',
            'Malowidła na ścianach opowiadają historię — przybyli z gwiazd, stworzyli życie na Ziemi. Stworzyli NAS.',
            'Jeden się porusza. Przez miliardy lat zamrożony, a teraz — budzi się.'
        ],
        behaviors: [
            'Niegdyś panowie Ziemi — twórcy życia i Shoggothów',
            'Zaawansowani naukowo — biotechnologia przekraczająca ludzkie pojmowanie',
            'Teraz prawie wymarli — ostatni ukrywają się w Antarktyce i morzach'
        ],
        weaknesses: ['Wrażliwe na zimno mimo adaptacji', 'Shoggothy — ich twory — zbuntowały się'],
        illustrationTags: ['barrel-shaped', 'five arms', 'starfish head', 'wings', 'Antarctica', 'ancient alien']
    },
    {
        id: 'flying-polyp',
        name: 'Latający Polip (Flying Polyp)',
        alternativeNames: ['Praprzyrodni'],
        type: 'independent',
        sanLoss: '1d6/1d20',
        combatStats: {
            str: 350, con: 200, siz: 300, dex: 80, int: 80, pow: 100,
            hp: 50, mp: 20, armor: 6, movement: 8,
            attacks: [
                { name: 'Wicher', skill: 75, damage: '2d6+rzucenie', attacksPerRound: 1, description: 'Generuje wicher — obrażenia + rzucenie ofiary na 2d6 metrów' },
                { name: 'Zmiażdżenie', skill: 60, damage: '6d6', attacksPerRound: 1, description: 'Przygniecenie ofiary amorficznym ciałem' }
            ],
            specialAbilities: [
                'Częściowa niewidzialność — widoczny tylko okresowo',
                'Lot — MOV 20 w powietrzu',
                'Kontrola wiatrów',
                'Przejście przez szczelinę dowolnej wielkości (amorficzne ciało)'
            ],
            dodgeValue: 40
        },
        firstGlimpse: [
            'Wiatr dmie z wnętrza budynku. Jak to możliwe?',
            'Coś prawie widzialnego — jak szklany reflekcja w powietrzu — porusza się w twoją stronę.',
            'Na podłodze okrągły ślad — jakby gigantyczna przyssawka. Mokry.'
        ],
        fullDescription: [
            'Niewidzialny przez większość czasu. Gdy widoczny — ogromna, amorficzna masa z mackami i przyssawkami.',
            'Ciało półprzezroczyste, pulsujące. Generuje silne wiatry swoim ruchem.',
            'Zostawia okrągłe ślady wielkości stołu. Śmierdzi ozonem.'
        ],
        atmospheric: [
            'W podziemnym mieście Wielkiej Rasy — puste ulice. Ale wiatr dmie w zamkniętych korytarzach.',
            'Na kamiennych ścianach — ślady pazurów. Wiele. Głębokie. Z zewnątrz.',
            'Gwizdanie — niskie, pulsujące. Nie instrumentu. Nie natury. Czegoś, co oddycha wiatrem.'
        ],
        behaviors: [
            'Odwieczni wrogowie Wielkiej Rasy z Yith',
            'Żyją pod ziemią — w kolosalnych kavernach',
            'Kontrolują wiatry i używają ich jako broni'
        ],
        weaknesses: ['Prąd elektryczny je solidyfikuje — wtedy można atakować', 'Specyficzne dźwięki ultradźwiękowe je dezorientują'],
        illustrationTags: ['invisible', 'wind', 'polyp', 'tentacles', 'underground', 'semi-transparent']
    },
    {
        id: 'ghast',
        name: 'Ghast',
        alternativeNames: ['Podziemne bestie'],
        type: 'independent',
        sanLoss: '0/1d8',
        combatStats: {
            str: 110, con: 80, siz: 100, dex: 75, int: 25, pow: 40,
            hp: 18, mp: 8, armor: 2, movement: 10,
            attacks: [
                { name: 'Pazury', skill: 55, damage: '1d8+1d6', attacksPerRound: 2 },
                { name: 'Kopnięcie', skill: 40, damage: '2d6', attacksPerRound: 1, description: 'Kopnięcie kończynami tylnymi — może odrzucić cel na 1d6 metrów' }
            ],
            specialAbilities: ['Widzenie w ciemności', 'Skok — mogą skakać na 10m z miejsca', 'Kanibalizm — żywią się ghulami i innymi ghastami'],
            dodgeValue: 37
        },
        firstGlimpse: [
            'Kangur? Nie — za duży, za kościsty, za dużo zębów. I biegnie na DWÓCH nogach.',
            'Z ciemności tunel dobiega tupot — szybki, ciężki. Coś skacze w twoją stronę.',
            'Smród — gorszy niż ghul. Ostrzejszy. I bliżej.'
        ],
        fullDescription: [
            'Dwa i pół metra wzrostu. Krępa budowa, nogi jak u kangura. Twarz ludzka, ale zniekształcona — bez nosa, z ogromnymi oczami.',
            'Skóra blada, prawie przezroczysta. Widać niebieskie żyły i pulsujące organy.',
            'Porusza się skokami — szybko i cicho jak na swój rozmiar.'
        ],
        atmospheric: [
            'Ghule się boją. TO musi ci wystarczyć za ostrzeżenie.',
            'Tunel rozszerza się w kavernę — na jej ścianach ślady pazurów. DUŻYCH pazurów.',
            'Kości na podłodze — ludzkie, ghuli, i... ghastów. Zjadają się nawzajem.'
        ],
        behaviors: [
            'Żyją w najgłębszych tunelach Krainy Snów',
            'Polują na ghule — i na wszystko inne',
            'Piekielnie szybkie i agresywne'
        ],
        weaknesses: ['Światło oślepia na 1d4 rund', 'Głupie — łatwe do sprowokowania i zmylenia'],
        illustrationTags: ['kangaroo legs', 'faceless', 'pale skin', 'underground', 'cave horror']
    }
];
