// ============================================================
// SCENARIO HOOKS - Haki fabularne do scenariuszy
// Based on CZĘŚĆ XVII of prompt-baza.md
// ============================================================

import { ScenarioHook } from './types';

export const SCENARIO_HOOKS: ScenarioHook[] = [
    {
        id: 'inheritance',
        title: 'Przeklęte Dziedzictwo',
        category: 'inheritance',
        era: '1920s',
        location: 'Polska, wieś na Podhalu',
        hook: 'Badacze dziedziczą dom po zmarłym wuju, którego prawie nie znali. W testamencie jest dziwny warunek: muszą spędzić w domu trzy noce.',
        openingScene: 'Notariusz wręcza wam klucze do starej drewnianej chaty w górach. "Pański wuj był... ekscentryczny" - mówi, unikając waszego wzroku. "Proszę pamiętać o warunku. Trzy noce."',
        suggestedNPCs: [
            'Stary notariusz, który wie więcej niż mówi',
            'Miejscowy ksiądz, który odradza wejście do domu',
            'Staruszka z wioski, która pamięta wuja jako dziecko',
            'Podejrzany antykwariusz, który chce kupić "niektóre przedmioty"'
        ],
        keyLocations: [
            'Drewniana chata z zatarasowaną piwnicą',
            'Stary cmentarz z grobem wuja',
            'Kościółek z XV-wieczną kryptą',
            'Jaskinia w górach, oznaczona na starej mapie wuja'
        ],
        initialClues: [
            'Dziennik wuja z urwanymi wpisami',
            'Mapa z zaznaczoną jaskinią i symbolami',
            'Stare zdjęcia pokazujące wuja z nieznajomymi w szatach',
            'Klucz do niezidentyfikowanego zamka'
        ],
        redHerrings: [
            'Sąsiad, który kradnie drewno z posesji',
            'Opowieści o "leśnym duchku" (lokalna legenda)'
        ],
        potentialDevelopments: [
            'Wuj był członkiem kultu czczącego górskiego bożka',
            'Pod domem znajduje się świątynia sprzed chrystianizacji',
            'Testament jest rytuałem - trzy noce to czas przebudzenia',
            'Lokalni mieszkańcy chronią tajemnicę od pokoleń'
        ],
        climaxSuggestions: [
            'Trzeciej nocy otwiera się przejście do świątyni',
            'Bożek (lub jego sługa) przebudza się',
            'Badacze muszą wybrać: zniszczyć czy przejąć moc'
        ],
        suggestedSkills: ['Historia', 'Wiedza Tajna', 'Ukrywanie się', 'Wspinaczka'],
        estimatedSAN: '1d10-2d10 total',
        difficulty: 'either'
    },
    {
        id: 'newspaper-article',
        title: 'Artykuł w Gazecie',
        category: 'mystery',
        era: '1920s',
        location: 'Warszawa, II RP',
        hook: 'Gazeta donosi o serii tajemniczych zgonów wśród artystów. Wszyscy zmarli malowali ten sam, nieistniejący pejzaż.',
        openingScene: 'Przy porannej kawie czytacie Kurier Warszawski. Artykuł wspomina, że piąty artysta w tym miesiącu zmarł w dziwnych okolicznościach - tym razem to Henryk Kowalski, malarz awangardowy. Wszyscy ofiary miały jedno wspólne: nieukończony obraz przedstawiający ten sam tajemniczy krajobraz.',
        suggestedNPCs: [
            'Dziennikarz, który pierwszy połączył kropki',
            'Wdowa po jednym z malarzy',
            'Galerzysta, który sprzedaje te obrazy',
            'Psychiatra, który leczył dwóch ofiar'
        ],
        keyLocations: [
            'Pracownie zmarłych artystów',
            'Galeria sztuki "Nowa Wizja"',
            'Zakład psychiatryczny, gdzie leczono dwóch ofiar',
            'Miejsce przedstawione na obrazach - które według map nie istnieje'
        ],
        initialClues: [
            'Wszyscy malarze uczęszczali na te same "salony artystyczne"',
            'Obrazy przedstawiają ruiny w miejscu, którego nie ma na żadnej mapie',
            'Ofiary przed śmiercią miewały intensywne sny',
            'Na każdym obrazie widać tę samą postać w tle'
        ],
        potentialDevelopments: [
            '"Salony" są fasadą dla kultu artystycznego',
            'Obrazy to OKNA do innego wymiaru, nie zwykłe pejzaże',
            'Postać z obrazów to istota, która wchodzi do naszego świata poprzez malarstwo',
            'Każdy obraz "przebudza" fragment ruiny w prawdziwym świecie'
        ],
        climaxSuggestions: [
            'Znalezienie ukończonego obrazu otwiera płótno jako portal',
            'Badacze muszą zniszczyć wszystkie obrazy zanim... coś... przyjdzie',
            'Konfrontacja z liderem kultu w częściowo przebudzonej ruinie'
        ],
        suggestedSkills: ['Sztuka', 'Znajomość Ludzi', 'Perswazja', 'Biblioteki'],
        estimatedSAN: '2d6-2d10 total',
        difficulty: 'purist'
    },
    {
        id: 'lost-letter',
        title: 'Zagubiony List',
        category: 'social',
        era: '1920s',
        location: 'Kraków',
        hook: 'Badacz otrzymuje list od dawno niewidzianego przyjaciela z dzieciństwa, który prosi o natychmiastową pomoc. List jest datowany trzy lata temu.',
        openingScene: 'Poczta przyniosła list. Znasz pismo - to Stanisław, twój przyjaciel z dzieciństwa. "Błagam, przyjedź natychmiast. Tylko tobie mogę zaufać." Data na stemplu: trzy lata temu. Dlaczego list dotarł dopiero teraz?',
        suggestedNPCs: [
            'Stanisław - przyjaciel, teraz zmieniony, przerażony',
            'Żona Stanisława - coś ukrywa',
            'Listonosz - pamięta "dziwności" z listem',
            'Stary profesor - mentor Stanisława w jego tajnych badaniach'
        ],
        keyLocations: [
            'Dom Stanisława na przedmieściach (w ruinie)',
            'Uniwersytet Jagielloński (gabinet profesora)',
            'Stary młyn za miastem (gdzie spotykał się kult)',
            'Katakumby kościoła św. Andrzeja'
        ],
        initialClues: [
            'List nosi ślady ognia, ale nie jest spalony',
            'Stanisław zaginął trzy lata temu - policja zamknęła sprawę',
            'Żona Stanisława mieszka sama, nigdy nie wyszła za mąż ponownie',
            'Profesor milczy, ale drżą mu ręce na wspomnienie Stanisława'
        ],
        potentialDevelopments: [
            'Stanisław odkrył sposób wysyłania wiadomości przez czas - ale coś poszło nie tak',
            'List jest DOSŁOWNIE sprzed trzech lat - czas dla Stanisława płynął inaczej',
            'Kult wykorzystał eksperymenty Stanisława do własnych celów',
            'Stanisław nadal żyje - ale "gdzie" to złe pytanie'
        ],
        climaxSuggestions: [
            'Odnalezienie Stanisława zamkniętego w "pęcherzach czasowych" w katakumbach',
            'Wybór: uratować przyjaciela czy zamknąć pęknięcie w czasie',
            'Konfrontacja z tym, co czeka "pomiędzy" chwilami'
        ],
        suggestedSkills: ['Biblioteki', 'Nauka', 'Perswazja', 'Nasłuchiwanie'],
        estimatedSAN: '1d10-3d10 total',
        difficulty: 'purist'
    },
    {
        id: 'strange-dream',
        title: 'Dziwny Sen',
        category: 'supernatural',
        era: 'timeless',
        location: 'Dowolna',
        hook: 'Wszyscy badacze mieli tej nocy ten sam sen. Nieznajomy w żółtych szatach dał im zadanie.',
        openingScene: 'Budzisz się z krzykiem. Sen był tak rzeczywisty... Nieznajomy w żółtych szatach, twarz ukryta za bladą maską, podał ci przedmiot i powiedział jedno słowo. Nie pamiętasz słowa, ale wiesz, że było ważne. W dłoni trzymasz... klucz? Którego nie miałeś zasypiając.',
        suggestedNPCs: [
            'Antykwariusz specjalizujący się w kluczach (sam miał podobny sen lata temu)',
            'Psychiatra badający "zbiorowe halucynacje"',
            'Emerytowany profesor teatrologii, który rozpoznaje żółte szaty',
            'Bezdomny "prorok" widzący więcej niż powinien'
        ],
        keyLocations: [
            'Sen jest miejscem - można do niego wrócić',
            'Teatr, gdzie wystawiano "Króla w Żółci" przed dekadami',
            'Lokal pasujący do klucza (stary magazyn? piwnica?)',
            'Miejsce, gdzie zbierają się inni "naznaczeni"'
        ],
        initialClues: [
            'Klucz jest prawdziwy, ale nie pasuje do żadnego zamka',
            'Żółte szaty pojawiają się w starych sztukach teatralnych',
            'Inni ludzie w mieście mieli podobne sny',
            'Antykwariusz ma kolekcję przedmiotów "wyjętych ze snów"'
        ],
        potentialDevelopments: [
            'Hastur/Król w Żółci wybiera sługi przez sny',
            'Klucz to test - ci, którzy go użyją, znajdą "prawdziwą" sztukę',
            'Inni naznaczeni są wrogami lub sojusznikami - albo obiema rzeczami',
            'Sen to brama - Carcosa jest bliżej niż ktokolwiek myśli'
        ],
        climaxSuggestions: [
            'Użycie klucza otwiera przejście do Carcosa - lub jej fragmentu',
            'Wystawienie drugiego aktu "Króla w Żółci"',
            'Odmowa zadania ściąga gniew... czegoś'
        ],
        suggestedSkills: ['Wiedza Tajna', 'Psychologia', 'Ukrywanie się', 'Spostrzegawczość'],
        estimatedSAN: '2d10-4d10 total',
        difficulty: 'purist'
    },
    {
        id: 'old-acquaintance',
        title: 'Stara Znajomość',
        category: 'social',
        era: '1920s',
        location: 'Lwów',
        hook: 'Na ulicy spotykasz kolegę ze studiów. Problem: widziałeś jego pogrzeb pięć lat temu.',
        openingScene: 'Ulica Akademicka, wczesny wieczór. Krzyk. Twój krzyk? Przed tobą stoi Antoni Wiśniewski - kolega ze studiów, przyjaciel. Byłeś na jego pogrzebie. Pamiętasz trumnę, łzy wdowy. A jednak... "Stary!" woła, jakby nic się nie stało. "Dawno się nie widzieliśmy!"',
        suggestedNPCs: [
            'Antoni - taki sam jak dawniej, ale coś jest nie tak',
            'Wdowa po Antonim - teraz żona innego mężczyzny',
            'Profesor anatomii, który zbadał ciało Antoniego',
            'Ksiądz, który odprawiał pogrzeb'
        ],
        keyLocations: [
            'Grób Antoniego na Łyczakowskim (pusta trumna?)',
            'Dom, gdzie teraz mieszka Antoni (dziwne sąsiedztwo)',
            'Uniwersytet - stara pracownia Antoniego',
            'Szpital, gdzie "zmarł" pięć lat temu'
        ],
        initialClues: [
            'Antoni nie pamięta własnej śmierci - dla niego to było "krótkie zaćmienie"',
            'Dokumentacja medyczna pokazuje prawdziwą śmierć',
            'Sąsiedzi Antoniego nigdy go nie widzieli - "mieszkanie stoi puste"',
            'Rzeczy Antoniego wciąż zachowuje wdowa - "nie może się pozbyć"'
        ],
        potentialDevelopments: [
            'Antoni został podmieniony - coś nosi jego twarz',
            'Antoni nigdy nie umarł - sfingowany pogrzeb ukrył go przed... czym?',
            'Śmierć Antoniego była eksperymentem - powrócił, ale nie do końca',
            'Antoni jest częścią większego spisku - jednym z wielu "powracających"'
        ],
        climaxSuggestions: [
            'Odkrycie prawdziwej natury "Antoniego" w krytycznym momencie',
            'Znalezienie miejsca, gdzie ukrywają się inni "zmarli"',
            'Konfrontacja z tym, kto organizuje "powroty"'
        ],
        suggestedSkills: ['Znajomość Ludzi', 'Psychologia', 'Medycyna', 'Biblioteki'],
        estimatedSAN: '1d6-2d10 total',
        difficulty: 'either'
    },
    {
        id: 'artwork',
        title: 'Dzieło Sztuki',
        category: 'academic',
        era: '1920s',
        location: 'Dowolna galeria/muzeum',
        hook: 'Muzeum nabyło starożytny artefakt. Od tej pory nocni stróże znikają.',
        openingScene: 'Kurator muzeum - stary przyjaciel - prosi was o pomoc. "Trzeci stróż w tym miesiącu. Policja mówi, że uciekli, ale... ja widzę ten artefakt. Widzę, jak patrzysz na niego. A on patrzy z powrotem."',
        suggestedNPCs: [
            'Kurator muzeum - przerażony, ale ciekawy',
            'Handlarz antykami, który sprzedał artefakt',
            'Archeolog, który znalazł artefakt w wykopaliskach',
            'Ostatni żyjący stróż - teraz w szpitalu psychiatrycznym'
        ],
        keyLocations: [
            'Sala z artefaktem (coraz zimniejsza)',
            'Wykopalisko, skąd pochodzi artefakt',
            'Piwnice muzeum (gdzie znikają stróże?)',
            'Dom handlarza (skąd NAPRAWDĘ wziął artefakt?)'
        ],
        initialClues: [
            'Artefakt nie pasuje do innych znalezisk z tego samego wykopaliska',
            'Stróże nie znikali - ich ubrania znajduje się w piwnicy',
            'Handlarz twierdzi, że kupił od "wędrownego kolekcjonera"',
            'Opisy artefaktu w katalogach są sprzeczne - jakby się zmieniał'
        ],
        potentialDevelopments: [
            'Artefakt to więzienie - stróże zostali wciągnięci do środka',
            'Artefakt żywi się ludźmi - rośnie w siłę',
            'Artefakt to brama - coś przez nią przychodzi',
            'Artefakt był kluczowym elementem dawno zakazanego kultu'
        ],
        climaxSuggestions: [
            'Rytuał uwolnienia więźniów artefaktu',
            'Zniszczenie artefaktu (z konsekwencjami)',
            'Odkrycie, że artefakt to tylko "kotwica" czegoś większego'
        ],
        suggestedSkills: ['Archeologia', 'Historia', 'Wiedza Tajna', 'Biblioteki'],
        estimatedSAN: '1d10-2d10 total',
        difficulty: 'either'
    }
];

/**
 * Zwraca losowy hak fabularny
 */
export function getRandomScenarioHook(category?: ScenarioHook['category']): ScenarioHook {
    let hooks = SCENARIO_HOOKS;

    if (category) {
        hooks = hooks.filter(h => h.category === category);
        if (hooks.length === 0) hooks = SCENARIO_HOOKS;
    }

    return hooks[Math.floor(Math.random() * hooks.length)];
}

/**
 * Generuje intro narracyjne dla danego haka
 */
export function generateScenarioIntro(hook: ScenarioHook): string {
    const intro = `## ${hook.title}

*${hook.hook}*

---

${hook.openingScene}

---

**Sugerowane umiejętności:** ${hook.suggestedSkills.join(', ')}
**Szacowana strata SAN:** ${hook.estimatedSAN}
**Tryb:** ${hook.difficulty === 'purist' ? 'Purystyczny (wysoka śmiertelność)' :
            hook.difficulty === 'pulp' ? 'Pulpowy (więcej akcji)' : 'Dowolny'}`;

    return intro;
}
