// ============================================================
// NPC ARCHETYPES - Archetypy postaci niezależnych
// Based on CZĘŚĆ IV of prompt-baza.md
// ============================================================

import { NPCArchetype } from './types';

export const NPC_ARCHETYPES: NPCArchetype[] = [
    {
        id: 'traumatic-witness',
        name: 'Świadek Traumatyczny',
        type: 'witness',
        personality: 'Roztrzęsiony, nieufny, skłonny do histerii przy wspomnieniach',
        appearance: [
            'Podkrążone oczy, drżące dłonie',
            'Rozgardiasz w ubraniu, jakby nie dbał o siebie',
            'Nerwowo rozgląda się po pomieszczeniu',
            'Trzyma się z dala od okien i ciemnych kątów'
        ],
        speechPatterns: [
            'Mówi urywanymi zdaniami, często przerywa',
            'Powtarza: "Nie rozumiecie... nikt nie rozumie..."',
            'Ścisza głos przy kluczowych szczegółach',
            'Nagle milknie, jakby słyszał coś, czego inni nie słyszą'
        ],
        motivations: [
            'Chce, żeby ktoś mu uwierzył',
            'Próbuje zapomnieć, ale nie może',
            'Szuka ochrony przed "tym, co widziałem"'
        ],
        secrets: [
            'Widział więcej, niż mówi',
            'Zna nazwisko osoby odpowiedzialnej',
            'Sam był częściowo zaangażowany'
        ],
        conversationLevers: {
            empathy: 'Współczucie i cierpliwość otwierają go najbardziej',
            protection: 'Obietnica bezpieczeństwa może przekonać do zeznań',
            threat: 'Groźby tylko go zamkną - stanie się histeryczny'
        },
        sampleDialogue: [
            '"To... to nie było normalne. Żaden człowiek nie mógłby... to nie był człowiek."',
            '"Proszę, nie każcie mi tam wracać. Ja wiem, że to brzmi szalenie, ale..."',
            '"*szepcze* Ono nadal tam jest. Czuję to nawet teraz."'
        ],
        illustrationTags: ['nervous', 'disheveled', 'hollow eyes', '1920s attire', 'trembling hands']
    },
    {
        id: 'suspicious-academic',
        name: 'Podejrzany Akademik',
        type: 'suspect',
        personality: 'Arogancki, protekcjonalny, ukrywa wiedzę za fasadą wyższości',
        appearance: [
            'Tweedowa marynarka z łatami na łokciach',
            'Złote okulary, zawsze czyste',
            'Wyprostowana postawa, dumne uniesienie głowy',
            'Biurko zastawione dziwnymi artefaktami'
        ],
        speechPatterns: [
            'Mówi z wyraźnym protekcjonalizmem',
            'Często używa łacińskich i greckich zwrotów',
            'Poprawia innych - "Właściwie, to nie do końca prawda..."',
            'Unika bezpośrednich odpowiedzi, mówi ogólnikami'
        ],
        motivations: [
            'Ochrona własnej reputacji akademickiej',
            'Zdobycie zakazanej wiedzy za wszelką cenę',
            'Ukrycie własnych eksperymentów'
        ],
        secrets: [
            'Studiował księgi, których dotykać nie powinien',
            'Wie, gdzie znaleźć odpowiedzi - ale cena jest straszna',
            'Eksperymentował na czymś... kimś'
        ],
        conversationLevers: {
            knowledge: 'Pochwal jego wiedzę - ego jest jego słabością',
            threat: 'Groźba ujawnienia jego badań',
            money: 'Granty badawcze mogą przekonać'
        },
        sampleDialogue: [
            '"Widzę, że nie macie podstawowej wiedzy w tej dziedzinie. Pozwólcie, że wyjaśnię..."',
            '"Te... spekulacje... są oczywiście całkowicie bezpodstawne. *nerwowo poprawia okulary*"',
            '"Są rzeczy, których laicy po prostu nie są w stanie pojąć."'
        ],
        illustrationTags: ['professor', 'tweed jacket', 'glasses', 'bookshelf', 'arrogant posture']
    },
    {
        id: 'hidden-cultist',
        name: 'Wyznawca w Ukryciu',
        type: 'cultist',
        personality: 'Pozornie normalny, ale z dziwną intensywnością w oczach',
        appearance: [
            'Na pierwszy rzut oka całkowicie normalny',
            'Ale przy bliższym spojrzeniu: dziwny wisiorek pod koszulą',
            'Blizny na nadgarstkach, ukryte pod rękawami',
            'Unika tematu swojej przeszłości'
        ],
        speechPatterns: [
            'Mówi spokojnie, niemal hipnotycznie',
            'Subtelnie przekierowuje rozmowę na temat "przeznaczenia"',
            'Czasem używa dziwnych, archaicznych sformułowań',
            'Uśmiecha się na niewłaściwe momenty'
        ],
        motivations: [
            'Zdobycie nowych wyznawców',
            'Ochrona sekretów kultu',
            'Wypełnienie misji zleconej przez starszych'
        ],
        secrets: [
            'Wie o rytuałach, które mogą zniszczyć lub uzdrowić',
            'Zna datę "Przebudzenia"',
            'Sam był kiedyś ofiarą - teraz jest katem'
        ],
        conversationLevers: {
            empathy: 'Fałszywa empatia - próbuje się wkraść w łaski',
            knowledge: 'Może zaoferować "prawdziwą wiedzę" jako przynętę'
        },
        sampleDialogue: [
            '"Rozumiem waszą... ciekawość. My wszyscy szukamy odpowiedzi, prawda?"',
            '"Są moce starsze niż ludzkość. Niektórzy z nas... nauczyli się z nimi współpracować."',
            '"*uśmiecha się dziwnie* Niedługo sami zobaczycie. Wszyscy zobaczycie."'
        ],
        illustrationTags: ['normal appearance', 'hidden symbol', 'intense eyes', 'knowing smile']
    },
    {
        id: 'madness-victim',
        name: 'Ofiara Szaleństwa',
        type: 'victim',
        personality: 'Mówi z pozoru bez sensu, ale w chaosie kryją się prawdy',
        appearance: [
            'Szpitalny szlafrok lub zniszczone ubrania',
            'Włosy w nieładzie, nieobcięte paznokcie',
            'Rysuje coś kompulsywnie na każdej powierzchni',
            'Wpatruje się w punkt za rozmówcą'
        ],
        speechPatterns: [
            'Myli przeszłość z przyszłością',
            'Przeskakuje między tematami chaotycznie',
            'Nagle mówi coś profetycznego - i wraca do majaczenia',
            'Powtarza jedną frazę jak mantrę'
        ],
        motivations: [
            'Próbuje ostrzec, ale nikt nie słucha',
            'Szuka czegoś, co "utracił w ciemności"'
        ],
        secrets: [
            'Widział prawdę - i dlatego oszalał',
            'Zna imiona tych, którzy przyjdą',
            'Pamięta mapę do miejsca, którego inni nie znają'
        ],
        conversationLevers: {
            empathy: 'Cierpliwość może wyłowić perły mądrości z oceanu szaleństwa',
            knowledge: 'Wspomnienie konkretnego wydarzenia może wywołać moment jasności'
        },
        sampleDialogue: [
            '"Słyszysz je też, prawda? Muzyka... taka piękna muzyka... *zaczyna płakać*"',
            '"NIE IDŹCIE TAM W NOWIE! *uspokaja się* Przepraszam... co mówiłem?"',
            '"*rysuje symbol* To jest klucz. Albo zamek. Już nie pamiętam..."'
        ],
        illustrationTags: ['asylum patient', 'wild eyes', 'drawings on walls', 'disheveled']
    },
    {
        id: 'skeptical-authority',
        name: 'Sceptyczny Policjant/Dziennikarz',
        type: 'skeptic',
        personality: 'Pragmatyczny, nieufny wobec "bzdur", ale uczciwy',
        appearance: [
            'Wymięta koszula, luźny krawat',
            'Notes w ręku, zawsze coś zapisuje',
            'Zmęczone oczy kogoś, kto widział wiele',
            'Cygaro lub papieros między palcami'
        ],
        speechPatterns: [
            'Krótkie, rzeczowe pytania',
            'Sarkastyczne komentarze: "Więc mówi pan, że..."',
            'Prosi o fakty, nie opinie',
            'Nie daje się zbyć - wraca do pytań'
        ],
        motivations: [
            'Znaleźć racjonalne wyjaśnienie',
            'Chronić społeczeństwo przed oszustami',
            'Zdobyć tę jedną wielką historię / rozwiązać sprawę'
        ],
        conversationLevers: {
            knowledge: 'Twarde dowody przekonują bardziej niż słowa',
            empathy: 'Pokazanie, że też zależy ci na prawdzie',
            money: 'Nie przekupny - to go obrazi'
        },
        sampleDialogue: [
            '"Proszę pana, widziałem dużo rzeczy. Ale diabły? Duchy? Z całym szacunkiem..."',
            '"Rozumiem, że to było... przerażające. Ale skupmy się na faktach."',
            '"*zapisuje* Interesujące. Bardzo... interesujące. Ma pan na to jakieś dowody?"'
        ],
        illustrationTags: ['detective', 'fedora', 'notepad', 'cigarette', 'skeptical expression']
    }
];
