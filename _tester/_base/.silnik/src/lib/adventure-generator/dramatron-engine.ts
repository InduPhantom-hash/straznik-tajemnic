/**
 * Silnik hierarchicznego generatora intrygi i scenariuszy (DeepMind Dramatron CoC 7e RAW).
 *
 * Implementuje 5 zagnieżdżonych etapów dekompozycji fabuły:
 * 1. Logline & Ziarno Mitów (Premise)
 * 2. Dramatis Personae z Maskami (Profile Lajosa Egriego 3D: fizjo, socjo, psycho)
 * 3. Drzewo Poszlak i Graf Śledztwa (Reguła 3 Poszlak Alexandriana + M.I.C.E. + Kotwica Prawdy)
 * 4. Karty Lokacji (Topografia, sensoryka + Zagadki Zamkniętego Pokoju Johna Dicksona Carra)
 * 5. Sceny i Beaty Śledztwa (4 Akty Obłędu, progi SAN, testy umiejętności CoC 7e)
 */

import { getGeminiClient } from '../gemini-client-pool';
import { DEFAULT_CHAT_MODEL } from '../model-registry';
import type {
  DramatronAdventure,
  DramatronClue,
  DramatronClueWeb,
  DramatronEra,
  DramatronGenerationInput,
  DramatronLocation,
  DramatronNpc,
  DramatronPremise,
  DramatronScene,
  DramatronTone,
  DramatronTruthAnchor,
} from './types';
import type { GraphConnection } from '../types';

interface EraPresetArchetype {
  eraLabel: string;
  defaultYear: string;
  defaultLocation: string;
  defaultCountry: string;
  mythosEntities: string[];
  anomalies: string[];
  culprits: Array<{ name: string; occupation: string; motive: string; weapon: string; secret: string }>;
  suspects: Array<{ name: string; occupation: string; mask: string; secret: string; quirk: string; socio: string; psycho: string; stats: string }>;
  locations: Array<{ name: string; address: string; atmosphere: string; illusion: string; carrType: any; carrAnomaly: string; carrHint: string }>;
  clueTemplates: Array<{ title: string; desc: string; category: any; miceType: any }>;
}

const ERA_PRESETS: Record<DramatronEra, EraPresetArchetype> = {
  classic: {
    eraLabel: 'Klasyczne lata 20. (USA / Arkham Country)',
    defaultYear: '1925',
    defaultLocation: 'Arkham, Massachusetts',
    defaultCountry: 'USA',
    mythosEntities: ['Hastur / Król w Żółci', 'Nyarlathotep', 'Yog-Sothoth', 'Dagon / Istoty z Głębin'],
    anomalies: [
      'Opalizujący kamień emitujący niesłyszalny dźwięk wywołujący lunatyzm',
      'Rycina z nieznanego wydania Necronomiconu ożywiająca cienie',
      'Zimny ogień trawiący wyłącznie tkankę nerwową w zamkniętej krypcie',
    ],
    culprits: [
      {
        name: 'Dr Silas Thorne',
        occupation: 'Kurator Działu Archeologii Uniwersytetu Miskatonic',
        motive: 'Poświęcenie dusz studentów w zamian za trans-wymiarową wiedzę o Carcosie',
        weapon: 'Sztylet z meteorytowego żelaza z rytem Żółtego Znaku',
        secret: 'Od trzech lat nosi na piersi wypalony Żółty Znak i komunikuje się z bytami z mgły',
      },
    ],
    suspects: [
      {
        name: 'Eleanor Vance',
        occupation: 'Konserwatorka starych druków',
        mask: 'Oddana badaczka literatury kolonialnej i cicha samotniczka',
        secret: 'Jej ojciec zniknął po przetłumaczeniu sztuki Król w Żółci; potajemnie pali kopie rękopisów',
        quirk: 'Nerwowy tik lewej dłoni, chroniczny zapach lawendy i popiołu, zgarbiona postawa',
        socio: 'Zubożała arystokracja bostońska, zależna od stypendium uniwersyteckiego',
        psycho: 'Paranoiczny lęk przed lustrami, panika w ciemnych pomieszczeniach',
        stats: 'STR 40, CON 50, SIZ 45, DEX 65, INT 80, POW 70, CHA 60, HP 9, SAN 50',
      },
      {
        name: 'Inspektor Thomas Maloney',
        occupation: 'Detektyw policji w Arkham',
        mask: 'Twardy, cyniczny stróż prawa ignorujący lokalne przesądy',
        secret: 'Zatuszował dwa rytualne morderstwa w dokach pod naciskiem loży masońskiej',
        quirk: 'Ciężki krok weterana wojennego, zapach tytoniu Virginia, blizna nad prawą brwią',
        socio: 'Klasa robotnicza, 20 lat służby w policji, członek lokalnego bractwa rzemieślniczego',
        psycho: 'Syndrom stresu pourazowego z bitwy nad Sommą, ucieczka w alkohol',
        stats: 'STR 70, CON 65, SIZ 75, DEX 50, INT 60, POW 55, CHA 45, HP 14, SAN 40',
      },
      {
        name: 'Prof. Warren Rice',
        occupation: 'Językoznawca i hebraista',
        mask: 'Poważany wykładowca języków semickich, autorytet moralny',
        secret: 'Tłumaczy tabliczki z pismem akadyjskim dla sekty odprawiającej rytuały na bagnach',
        quirk: 'Krótkowzroczność, nawyk poprawiania okularów w rogowej oprawie, cichy świszczący oddech',
        socio: 'Elita akademicka Nowej Anglii, posiadacz kamienicy przy French Hill',
        psycho: 'Urażona duma naukowa, paniczny lęk przed demencją i utratą pamięci',
        stats: 'STR 45, CON 45, SIZ 60, DEX 45, INT 85, POW 65, CHA 60, HP 10, SAN 55',
      },
    ],
    locations: [
      {
        name: 'Antykwariat Vance & Son',
        address: 'ul. French Hill 42, Arkham',
        atmosphere: 'Zapach butwiejącego welinu, gryzący ozon, szelest nienaturalnie suchych kartek',
        illusion: 'W witrynie odbijają się postacie w szkarłatnych maskach, których nie ma na ulicy',
        carrType: 'accident_feigned_as_murder',
        carrAnomaly: 'Ciało asystenta znalezione pod zwaloną dębową szafą, lecz rygiel drzwi był zasunięty od zewnątrz',
        carrHint: 'Ślady cienkiego drutu fortepianowego na framudze i dźwigni zamka zegarowego',
      },
      {
        name: 'Skrzydło Rękopisów Biblioteki Miskatonic',
        address: 'Kampus Miskatonic University, Arkham',
        atmosphere: 'Półmrok lamp oliwnych, zapach wosku i wilgotnego tynku, echo kroków w sklepionych salach',
        illusion: 'Litery w katalogu kartkowym układają się w imiona badaczy czytających w sali',
        carrType: 'strike_from_outside',
        carrAnomaly: 'Księga leżąca w oszklonej gablocie została pocięta, choć szkło nie zostało rozbite ani otwarte',
        carrHint: 'Szczelina wentylacyjna pod sufitem i ślady kwasu organicznego na ołowianym okuciu',
      },
      {
        name: 'Zalana Krypta na Cmentarzu Meadow Hill',
        address: 'Meadow Hill Cemetery, obrzeża Arkham',
        atmosphere: 'Lodowaty przeciąg z krypt, odór gnijących liści, odgłos kapiącej z sufitu cieczy',
        illusion: 'Cienie rzucane przez latarnie poruszają się pod prąd źródła światła',
        carrType: 'mechanical_trap',
        carrAnomaly: 'Kamienny sarkofag zamknięty od środka monolityczną płytą o wadze dwóch ton',
        carrHint: 'Ukryty mechanizm przeciwwag wypełnionych rtęcią pod posadzką ołtarza',
      },
    ],
    clueTemplates: [
      {
        title: 'Nadtrawiony list z pieczęcią laku',
        desc: 'Odręczny list Thorne’a nakazujący dostarczenie "substancji z gabloty 12" przed nowiem księżyca.',
        category: 'document',
        miceType: 'inquiry',
      },
      {
        title: 'Zakrwawiony fragment tkaniny z jedwabiu',
        desc: 'Skrawek podszewki z monogramem "S.T.", wyrwany na framudze piwnicznego włazu.',
        category: 'forensic',
        miceType: 'inquiry',
      },
      {
        title: 'Zeznanie nocnego woźnego biblioteki',
        desc: 'Woźny widział doktora Thorne’a wchodzącego do podziemi w towarzystwie zamaskowanej postaci o nienaturalnym chodzie.',
        category: 'testimony',
        miceType: 'character',
      },
      {
        title: 'Ołowiana tabliczka z zaklęciem wiążącym',
        desc: 'Starożytna inskrypcja w języku akadyjskim opisująca rytuał otwarcia bramy do Carcosy.',
        category: 'occult',
        miceType: 'event',
      },
      {
        title: 'Rozkład odpływów i przypływów rzeki Miskatonic',
        desc: 'Dziennik hydrograficzny z zaznaczonymi godzinami zrzutu skrzyń do wód rzeki.',
        category: 'document',
        miceType: 'milieu',
      },
      {
        title: 'Zegarek kieszonkowy zatrzymany na 03:17',
        desc: 'Mechanizm stopiony od wewnątrz bez śladów ognia zewnętrznego, wskazówki pokryte siarką.',
        category: 'forensic',
        miceType: 'inquiry',
      },
    ],
  },
  gaslight: {
    eraLabel: 'Wiktoriański Londyn (Gaslight 1890s)',
    defaultYear: '1895',
    defaultLocation: 'Londyn, Whitechapel & Mayfair',
    defaultCountry: 'Wielka Brytania',
    mythosEntities: ['Nyarlathotep / Czarny Faraon', 'Ithaqua / Wędrowiec Wiatru'],
    anomalies: ['Kłęby smogu o zapachu siarki i mirry wywołujące paraliż senny', 'Mechaniczne organy grające melodię w pustym kościele'],
    culprits: [
      {
        name: 'Lord Arthur Ponsonby',
        occupation: 'Prezes Klubu Diogenesa i mecenas Królewskiego Towarzystwa',
        motive: 'Pozyskanie eliksiru długowieczności kosztem krwi imigrantów z doków',
        weapon: 'Chirurgiczny skalpel z brązu fenickiego',
        secret: 'Należy do Hermetycznego Zakonu Srebrnego Zmierzchu i składa ofiary w tunelach metra',
      },
    ],
    suspects: [
      {
        name: 'Dr Johnathan Seward',
        occupation: 'Medyk sądowy Scotland Yardu',
        mask: 'Chłodny scjentysta i pozytywista wierzący wyłącznie w mikroskop',
        secret: 'Ukradł z prosektorium trzy zniekształcone czaszki o anatomii rybiej',
        quirk: 'Ciągłe mycie rąk karbolem, drżenie palców, monokl na srebrnym łańcuszku',
        socio: 'Burżuazja medyczna, absolwent Oksfordu',
        psycho: 'Lęk przed skażeniem biologicznym, obsesja na punkcie czystości',
        stats: 'STR 50, CON 55, SIZ 60, DEX 65, INT 85, POW 60, CHA 55, HP 11, SAN 45',
      },
      {
        name: 'Lady Gwendolyn Blackwood',
        occupation: 'Spirytystka i kuratorka salonu literackiego',
        mask: 'Modna arystokratka zabawiająca wyższe sfery seansami mediumicznymi',
        secret: 'Medium opętane przez ektoplazmatyczną emanację Czarnego Faraona',
        quirk: 'Aksamitny głos, blada jak kreda cera, wachlarz z pawich piór maskujący grymasy',
        socio: 'Wysoka arystokracja, koneksje na dworze królewskim',
        psycho: 'Narkotyczne uzależnienie od laudanum, lęk przed starzeniem',
        stats: 'STR 35, CON 50, SIZ 45, DEX 55, INT 80, POW 85, CHA 85, HP 9, SAN 40',
      },
      {
        name: 'Barnaby "Igła" Briggs',
        occupation: 'Przewoźnik po Tamizie i paser',
        mask: 'Zwykły prosty wioślarz znający każdy zaułek rzeki',
        secret: 'Wyławia skrzynie z nielegalnymi mumiami z portu w Tilbury',
        quirk: 'Braki w uzębieniu, ochrypły rechot, fajka z gliny palona w kąciku ust',
        socio: 'Lumpenproletariat londyński',
        psycho: 'Paniczny lęk przed mgłą po zmroku',
        stats: 'STR 75, CON 70, SIZ 65, DEX 60, INT 50, POW 45, CHA 40, HP 13, SAN 35',
      },
    ],
    locations: [
      {
        name: 'Klub Dżentelmenów Carlton',
        address: 'Pall Mall 10, Londyn',
        atmosphere: 'Ciężka woń cygar, skóry i wosku meblowego, stłumiony stukot bil bilardowych',
        illusion: 'Portrety dawnych premierów zdają się odprowadzać wzrokiem każdego wchodzącego',
        carrType: 'victim_impersonation',
        carrAnomaly: 'Członek klubu widziany w fotelu czytelni godzinę po tym, jak stwierdzono jego zgon w łaźni',
        carrHint: 'Woskowa maska pośmiertna i peruka ukryte w skrytce za kominkiem',
      },
      {
        name: 'Opuszczony Magazyn Przypraw w Dokach St Katharine',
        address: 'St Katharine Docks, Londyn',
        atmosphere: 'Duszący odór cynamonu zmieszanego ze ściekami, chlupot Tamizy o pale',
        illusion: 'W workach z pieprzem słychać rytmiczne bicie serca',
        carrType: 'toxic_gas_or_paroxysm',
        carrAnomaly: 'Strażnik zmarł z wyrazem skrajnego przerażenia bez śladów przemocy fizycznej w zaryglowanym składzie',
        carrHint: 'Pęknięta szklana ampułka po ekstrakcie z Czarnego Lotosu pod podłogą',
      },
      {
        name: 'Podziemia Szpitala Bethlem (Bedlam)',
        address: 'St George\'s Fields, Londyn',
        atmosphere: 'Jęki pacjentów niosące się po wilgotnych korytarzach, fetor wapna gaszonego',
        illusion: 'Cienie pacjentów na ścianach wykonują skomplikowane tańce rytualne',
        carrType: 'strike_during_break_in',
        carrAnomaly: 'Zamordowanie ordynatora w celi izolacyjnej w trakcie gdy pięciu strażników próbowało wyważyć dębowe wrota',
        carrHint: 'Ukryta zapadnia w posadzce połączona ze średniowiecznym kanałem burzowym',
      },
    ],
    clueTemplates: [
      {
        title: 'Szyfrowany rejestr darowizn Klubu Diogenesa',
        desc: 'Księga rachunkowa ze specjalnymi wpłatami na rzecz "Wyprawy do Oazy Siwa".',
        category: 'document',
        miceType: 'inquiry',
      },
      {
        title: 'Flakonik z brunatną cieczą o zapachu żywicy',
        desc: 'Balsam używany przy mumifikacji faraońskiej, zawierający mikroskopijne kryształy.',
        category: 'forensic',
        miceType: 'inquiry',
      },
      {
        title: 'Zeznanie dorożkarza z Charing Cross',
        desc: 'Dorożkarz potwierdza, że wysadził Lorda Ponsonby przy tajnym wejściu do prosektorium.',
        category: 'testimony',
        miceType: 'character',
      },
      {
        title: 'Papirus w języku hieratycznym',
        desc: 'Rytuał przywołania Czarnego Posłańca w noc zaćmienia księżyca.',
        category: 'occult',
        miceType: 'event',
      },
      {
        title: 'Klucz matka do kanałów miejskich',
        desc: 'Mosiężny klucz z pieczęcią Koronnego Inżyniera Metropolii.',
        category: 'document',
        miceType: 'milieu',
      },
      {
        title: 'Ślady stóp w popiele o rozwidlonych palcach',
        desc: 'Odciski w węglowym pyle nieprzypominające żadnego ssaka lądowego.',
        category: 'forensic',
        miceType: 'inquiry',
      },
    ],
  },
  noir: {
    eraLabel: 'Noir / Lata 30.-40. (Wielki Kryzys i Gangsterzy)',
    defaultYear: '1937',
    defaultLocation: 'Nowy Jork / Chicago',
    defaultCountry: 'USA',
    mythosEntities: ['Shub-Niggurath', 'Yig / Wężowi Ludzie'],
    anomalies: ['Płynny asfalt na ulicach pulsujący w rytmie bicia serca', 'Płyty gramofonowe odtwarzające głosy zmarłych bliskich'],
    culprits: [
      {
        name: 'Vito "Dwa Palce" Marcone',
        occupation: 'Boss podziemnego syndykatu przemytniczego',
        motive: 'Wykorzystanie krwi potwora do produkcji bezkonkurencyjnego narkotyku "Czarne Mleko"',
        weapon: 'Pistolet maszynowy Thompson z bębnem i rytualną amunicją z kości',
        secret: 'Karmi embrion shoggotha w chłodni rzeźni miejskiej',
      },
    ],
    suspects: [
      {
        name: 'Detektyw Frank Malone',
        occupation: 'Prywatny detektyw, były gliniarz',
        mask: 'Zgorzkniały twardziel biorący każdą sprawę za 25 dolarów dziennie plus koszty',
        secret: 'Prowadzi śledztwo w sprawie zniknięcia własnej siostry, która wstąpiła do kultu',
        quirk: 'Przetarty płaszcz prochowy, wiecznie gasnący papieros Lucky Strike, chrapliwy głos',
        socio: 'Wyrzucony z policji, żyje z dnia na dzień w obskurnym biurze',
        psycho: 'Cynizm obronny, bezsenność',
        stats: 'STR 65, CON 60, SIZ 70, DEX 55, INT 70, POW 60, CHA 50, HP 13, SAN 45',
      },
      {
        name: 'Vivian Vance',
        occupation: 'Śpiewaczka w nocnym klubie "Kobra"',
        mask: 'Femme fatale w szmaragdowej sukni, obiekt westchnień gangsterów i polityków',
        secret: 'Kapłanka kultu Yiga, której skóra pod sukniami pokryta jest drobną łuską',
        quirk: 'Hipnotyzujące zielone oczy, zwyczaj powolnego oblizywania warg, zapach piżma',
        socio: 'Gwiazda rewii jazzowej, powiązana z elitami finansowymi',
        psycho: 'Lęk przed zimnem, chłodne bezwzględne kalkulowanie każdego sojuszu',
        stats: 'STR 40, CON 50, SIZ 45, DEX 75, INT 75, POW 80, CHA 90, HP 9, SAN 40',
      },
      {
        name: 'Prohibicjonista Walter Crane',
        occupation: 'Agent federalny Departamentu Skarbu',
        mask: 'Fanatyczny bojownik z nielegalnym alkoholem i korupcją',
        secret: 'Bierze łapówki w postaci starożytnych amuletów i złotych monet z Innsmouth',
        quirk: 'Nerwowe skubanie wąsa, surowy wzrok, sztywne wojskowe ruchy',
        socio: 'Urzędnik państwowy z uprawnieniami federalnymi',
        psycho: 'Manichejska wizja świata, skrywany lęk przed własną seksualnością',
        stats: 'STR 60, CON 65, SIZ 60, DEX 55, INT 65, POW 70, CHA 55, HP 12, SAN 50',
      },
    ],
    locations: [
      {
        name: 'Klub Jazzowy "Kobra"',
        address: 'Wabash Avenue 142, Chicago',
        atmosphere: 'Dym tytoniowy, rzewna trąbka jazzowa, brzęk kieliszków i szelest banknotów',
        illusion: 'W cieniach za estradą kontury muzyków wydają się wielorękie i wężowe',
        carrType: 'suicide_framed_as_murder',
        carrAnomaly: 'Barman znaleziony w zamkniętej chłodni powieszony na rurze, brak taboretu lub podpory',
        carrHint: 'Ślady roztopionego bloku lodu, na którym stała ofiara przed uduszeniem',
      },
      {
        name: 'Rzeźnia Miejska Marcone & Sons',
        address: 'Stockyards District, Chicago',
        atmosphere: 'Metaliczny zapach świeżej krwi, para buchająca z rur, tępy odgłos haków na szynach',
        illusion: 'Tusze wołowe drgają i wydają z siebie cichy, gardłowy świst',
        carrType: 'mechanical_trap',
        carrAnomaly: 'Księgowy mafii zmiażdżony w prasie hydraulicznej uruchomionej z zewnątrz przy zaryglowanych drzwiach',
        carrHint: 'Przełącznik czasowy podłączony do regulatora pary i stopiony ołowiany bezpiecznik',
      },
      {
        name: 'Podziemna Destylarnia w Nieczynnym Kolektorze',
        address: 'Pod 12th Street Bridge, Chicago',
        atmosphere: 'Wilgoć, woń fermentującego zacieru, szum przepływającej rzeki',
        illusion: 'Krople wody kapiące ze stropu układają się w słowa ostrzeżenia',
        carrType: 'strike_from_outside',
        carrAnomaly: 'Zastrzelenie bimbrownika w hermetycznym bunkrze destylarni bez widocznego strzelca',
        carrHint: 'Kula wystrzelona przez rurę odpowietrzającą z poziomu mostu za pomocą celownika peryskopowego',
      },
    ],
    clueTemplates: [
      {
        title: 'Broszura mafijna z listą dostaw "Czarnego Mleka"',
        desc: 'Zaszyfrowany spis lokali z ilościami tajemniczego ekstraktu i kwotami w tysiącach dolarów.',
        category: 'document',
        miceType: 'inquiry',
      },
      {
        title: 'Złota łuska wielkości dłoni',
        desc: 'Odrzucona łuska o opalizującej strukturze, wydzielająca zapach ziół i piżma.',
        category: 'forensic',
        miceType: 'inquiry',
      },
      {
        title: 'Zeznanie rannego rewolwerowca',
        desc: 'Płatny zabójca przed śmiercią wyznaje, że widział bossa kłaniającego się potworowi w chłodni.',
        category: 'testimony',
        miceType: 'character',
      },
      {
        title: 'Wężowy talizman z jadeitu',
        desc: 'Figurka zwiniętego węża o ludzkiej twarzy, w dotyku nienaturalnie ciepła.',
        category: 'occult',
        miceType: 'event',
      },
      {
        title: 'Plan sieci tuneli kanalizacyjnych',
        desc: 'Mapa miejska z lat 20. z naniesionymi trasami omijającymi posterunki policji.',
        category: 'document',
        miceType: 'milieu',
      },
      {
        title: 'Łuski pistoletowe z wygrawerowanym symbolem oka',
        desc: 'Amunicja kalibru .45 z nacięciami krzyżowymi na ołowianym czubku.',
        category: 'forensic',
        miceType: 'inquiry',
      },
    ],
  },
  prl: {
    eraLabel: 'Polska Ludowa / PRL (Strefa 11 / Zimna Wojna)',
    defaultYear: '1984',
    defaultLocation: 'Gdańsk / Prabuty / Bieszczady',
    defaultCountry: 'Polska',
    mythosEntities: ['Cthulhu / Śniący z Głębin', 'Mi-Go / Grzyby z Yuggoth'],
    anomalies: ['Puste pasma telewizyjne emitujące hipnotyczny szum kineskopowy', 'Luminescencyjny popiół z pieców koksowniczych'],
    culprits: [
      {
        name: 'Płk Ryszard Kwiecień',
        occupation: 'Dowódca Tajnej Grupy "Klin" Departamentu IV MSW',
        motive: 'Zbudowanie parapsychologicznej broni psychotronicznej dla Układu Warszawskiego',
        weapon: 'Pistolet P-64 oraz generator częstotliwości podprogowych Mi-Go',
        secret: 'Wymienia polski węgiel i rudę uranu na cylindry mózgowe z Yuggoth',
      },
    ],
    suspects: [
      {
        name: 'Dr Helena Borewicz',
        occupation: 'Biofizyk w Instytucie Badań Jądrowych w Świerku',
        mask: 'Partyjna stypendystka i racjonalistyczna badaczka promieniowania',
        secret: 'Wykradła próbkę tkanki z meteorytu suwalskiego; prowadzi nielegalne hodowle',
        quirk: 'Palenie papierosów "Sport" jeden od drugiego, popielate włosy, stalowy ton głosu',
        socio: 'Nomenklatura naukowa PRL',
        psycho: 'Strach przed aresztowaniem przez SB, megalomania naukowa',
        stats: 'STR 45, CON 55, SIZ 50, DEX 60, INT 85, POW 70, CHA 60, HP 10, SAN 50',
      },
      {
        name: 'Porucznik SB Janusz Zięba',
        occupation: 'Oficer prowadzący rozpracowanie środowisk opozycyjnych',
        mask: 'Służbista w szarym garniturze, cichy urzędnik aparatu bezpieczeństwa',
        secret: 'Szantażowany przez kultystów nagraniami z nielegalnych seansów bioenergoterapii',
        quirk: 'Ciągłe stukanie długopisem Zenith, spocone dłonie, unikanie kontaktu wzrokowego',
        socio: 'Funkcjonariusz resortu spraw wewnętrznych',
        psycho: 'Lęk przed czystką w partii, paranoja podsłuchowa',
        stats: 'STR 60, CON 65, SIZ 65, DEX 55, INT 65, POW 50, CHA 50, HP 13, SAN 45',
      },
      {
        name: 'Ojciec Wawrzyniec',
        occupation: 'Proboszcz parafii św. Rocha',
        mask: 'Pokorny kapłan wspierający represjonowane rodziny stoczniowców',
        secret: 'Przechowuje w krypcie kościoła monstrancję z meteorytu spadłego w 1648 roku',
        quirk: 'Głęboki niski głos, znoszona sutanna, modlitewne przesuwanie paciorków różańca',
        socio: 'Kler katolicki, środowisko opozycyjne',
        psycho: 'Rozdarcie moralne między wiarą a kosmiczną prawdą o pustce niebios',
        stats: 'STR 50, CON 60, SIZ 60, DEX 45, INT 75, POW 80, CHA 75, HP 12, SAN 55',
      },
    ],
    locations: [
      {
        name: 'Ośrodek Wypoczynkowy MSW "Rybak"',
        address: 'Jezioro Gałęźne, Prabuty',
        atmosphere: 'Zapach boazerii sosnowej, chloru i mokrego betonu, rzężenie starej lodówki Silesia',
        illusion: 'W lustrach łazienkowych woda płynie z dołu do góry',
        carrType: 'accident_feigned_as_murder',
        carrAnomaly: 'Utonięcie oficera w wannie w zamkniętym od wewnątrz pokoju hotelowym na 3. piętrze',
        carrHint: 'Ślady płynu mózgowo-rdzeniowego w odpływie i wygięta rurka igielitowa w kratce wentylacyjnej',
      },
      {
        name: 'Nieczynna Sztolnia Uranowa w Kletnie',
        address: 'Masyw Śnieżnika, Sudety',
        atmosphere: 'Grobowy chłód, pył kwarcowy, trzask licznika Geigera w ciemności',
        illusion: 'W żyłach kwarcu widoczne są pulsujące zielonym światłem naczynia krwionośne',
        carrType: 'mechanical_trap',
        carrAnomaly: 'Górnik zamurowany za ścianą z poniemieckich szyn stalowych bez narzędzi spawalniczych',
        carrHint: 'Ciekły azot użyty do zesztywnienia i skruszenia rygli przed ponownym zamarznięciem',
      },
      {
        name: 'Podziemia Kościoła św. Rocha',
        address: 'Stare Miasto, Gdańsk',
        atmosphere: 'Chłód ceglanych sklepień, woń kadzidła i wilgotnej ziemi, odgłos dalekiego dzwonu',
        illusion: 'Fresk z Sądem Ostatecznym przedstawia mackowate istoty zamiast aniołów',
        carrType: 'victim_impersonation',
        carrAnomaly: 'Świadek rozmawiał z kościelnym w zakrystii, podczas gdy jego ciało leżało już w kostnicy',
        carrHint: 'Aparat projekcyjny z taśmą 16mm ukryty za konfesjonałem oraz magnetofon szpulowy Kasprzak',
      },
    ],
    clueTemplates: [
      {
        title: 'Teczka tajna MSW: "Kryptonim KLIN"',
        desc: 'Materiały operacyjne SB dotyczące obserwacji dziwnych zjawisk nad jeziorem w Prabutach.',
        category: 'document',
        miceType: 'inquiry',
      },
      {
        title: 'Luminescencyjny cylinder z mosiądzu',
        desc: 'Pojemnik z płynem odżywczym z wygrawerowanymi piktogramami Mi-Go.',
        category: 'forensic',
        miceType: 'inquiry',
      },
      {
        title: 'Taśma szpulowa z nagraniem przesłuchania',
        desc: 'Zapis krzyków aresztowanego leśnika opowiadającego o "skrzydlatych cieniach w koronach drzew".',
        category: 'testimony',
        miceType: 'character',
      },
      {
        title: 'Zeszyt z odręcznymi modlitwami do Dagona',
        desc: 'Notatki rybaka z Helu pisane krwią i atramentem kałamarnicy.',
        category: 'occult',
        miceType: 'event',
      },
      {
        title: 'Przepustka do strefy zamkniętej garnizonu radzieckiego',
        desc: 'Dokument z pieczęcią dowództwa Północnej Grupy Wojsk Armii Radzieckiej w Legnicy.',
        category: 'document',
        miceType: 'milieu',
      },
      {
        title: 'Fragment metalu o ujemnej masie',
        desc: 'Próbka ze stopu nieznanego na Ziemi, która unosi się 2 mm nad metalowym stołem.',
        category: 'forensic',
        miceType: 'inquiry',
      },
    ],
  },
  modern: {
    eraLabel: 'Współczesność (Lata 2020. / Cyfrowy Koszmar)',
    defaultYear: '2026',
    defaultLocation: 'Berlin / Warszawa / Nowy Jork',
    defaultCountry: 'Polska / Niemcy',
    mythosEntities: ['Azathoth / Jądro Chaosu', 'Yog-Sothoth'],
    anomalies: ['Algorytmy LLM generujące fraktalne halucynacje zarażające ludzką pamięć', 'Anomalie kwantowe w serwerowniach chmurowych'],
    culprits: [
      {
        name: 'Dr Marc Eisenberg',
        occupation: 'Główny Architekt AI w startupie "Aletheia Neuro"',
        motive: 'Zasilenie sieci neuronowej fragmentami Necronomiconu w celu osiągnięcia Osobliwości',
        weapon: 'Ukierunkowany impuls elektromagnetyczny i dron z syntetyczną neurotoksyną',
        secret: 'Przestał spać pół roku temu; jego fale mózgowe zsynchronizowały się z sułtanem demonów Azathothem',
      },
    ],
    suspects: [
      {
        name: 'Kaja Werner',
        occupation: 'Dziennikarka śledcza portalu technologicznego',
        mask: 'Dociekliwa reporterka śledząca etykę sztucznej inteligencji',
        secret: 'Jej brat popełnił samobójstwo po testach prototypu modelu; ma jego zaszyfrowany dysk',
        quirk: 'Picie napojów energetycznych, niebieskie światło ekranu smartfona odbijające się w okularach',
        socio: 'Freelancerka, prekariat medialny',
        psycho: 'Lęk przed inwigilacją, zespół wypalenia zawodowego',
        stats: 'STR 45, CON 50, SIZ 45, DEX 65, INT 80, POW 70, CHA 70, HP 9, SAN 55',
      },
      {
        name: 'Sven Lindqvist',
        occupation: 'Administrator klastra serwerów kwantowych',
        mask: 'Typowy introwertyczny inżynier devops pracujący na nocnych zmianach',
        secret: 'Zbudował w darknecie giełdę organów dla kultu czczącego Yog-Sothotha',
        quirk: 'Kaptur naciągnięty na czoło, unikanie dotyku, nerwowe obgryzanie paznokci',
        socio: 'Wysoko opłacany inżynier IT',
        psycho: 'Agorafobia, mizantropia',
        stats: 'STR 40, CON 55, SIZ 65, DEX 60, INT 90, POW 55, CHA 40, HP 11, SAN 40',
      },
      {
        name: 'Nadkomisarz Piotr Kalita',
        occupation: 'Szef wydziału cyberprzestępczości KGP',
        mask: 'Spokojny profesjonalista w garniturze, negocjator policyjny',
        secret: 'Wycisza sprawy zaginięć programistów na polecenie zagranicznego konsorcjum',
        quirk: 'Zegarek smartwatch stale mierzący tętno, zimna uprzejmość, papierosy elektroniczne',
        socio: 'Wyższy oficer policji państwowej',
        psycho: 'Cynizm korporacyjny, lęk przed utratą emerytury mundurowej',
        stats: 'STR 65, CON 65, SIZ 70, DEX 55, INT 75, POW 60, CHA 65, HP 13, SAN 50',
      },
    ],
    locations: [
      {
        name: 'Centrum Obliczeniowe "Aletheia"',
        address: 'Dzielnica Przemysłowa, Berlin',
        atmosphere: 'Buczenie setek wentylatorów, sterylne białe światło jarzeniówek, mroźne powietrze z chłodnic',
        illusion: 'Na monitorach konsoli pojawiają się twarze przodków użytkownika proszące o pomoc',
        carrType: 'toxic_gas_or_paroxysm',
        carrAnomaly: 'Śmierć programisty z niedotlenienia w szczelnie zamkniętym boksie z działającą klimatyzacją',
        carrHint: 'Odwrócony obieg ciekłego azotu w rurach chłodzenia procesorów kwantowych',
      },
      {
        name: 'Opuszczony Szpital Psychiatryczny w Otwocku',
        address: 'Zofiówka, Otwock',
        atmosphere: 'Wilgoć, zapach butwiejącego drewna i grzyba, odgłos kropel spadających na potłuczone szkło',
        illusion: 'W pustych salach szpitalnych działają niewidzialne telefony komórkowe z wibracją',
        carrType: 'strike_from_outside',
        carrAnomaly: 'Zabójstwo bezdomnego w celi bez okien za pomocą miniaturowego pocisku wolframowego',
        carrHint: 'Otwór wentylacyjny o średnicy 3 cm i ślady zminiaturyzowanego drona taktycznego',
      },
      {
        name: 'Penthouse na 45. piętrze wieżowca Varso',
        address: 'Chmielna 69, Warszawa',
        atmosphere: 'Panoramiczny widok na światła nocnej metropolii, cichy szum klimatyzacji, woń drogich perfum',
        illusion: 'Światła miasta poniżej układają się w gigantyczny pulsujący symbol Oka Azathotha',
        carrType: 'mechanical_trap',
        carrAnomaly: 'Właściciel apartamentu wypadł przez pancerną szybę, która nie uległa stłuczeniu ani otwarciu',
        carrHint: 'Elektrochromatyczny mechanizm szyby sterowany z aplikacji mobilnej na mikrosekundy przed uderzeniem',
      },
    ],
    clueTemplates: [
      {
        title: 'Zaszyfrowany pendrive z kodem modelu "Necro-LLM"',
        desc: 'Dysk z wielowarstwowym szyfrowaniem kwantowym zawierający wagi modelu generującego koszmary.',
        category: 'document',
        miceType: 'inquiry',
      },
      {
        title: 'Próbka syntetycznego płynu mózgowego',
        desc: 'Bezbarwna ciecz o nienaturalnej lepkości z mikro-procesorami krzemowymi.',
        category: 'forensic',
        miceType: 'inquiry',
      },
      {
        title: 'Logi serwera proxy z węzła w Szwajcarii',
        desc: 'Ślady transferu terabajtów danych o anatomii mózgu do serwerowni w Alpach.',
        category: 'document',
        miceType: 'inquiry',
      },
      {
        title: 'Nocne nagranie audio z kamery bezpieczeństwa',
        desc: 'Dźwięk fletu o częstotliwości 14 Hz powodujący mdłości i utratę równowagi u słuchacza.',
        category: 'occult',
        miceType: 'event',
      },
      {
        title: 'Karta dostępu poziomu 5 (Black Access)',
        desc: 'Karta magnetyczna z wygrawerowanym symbolem odwróconego pentagramu wewnątrz atomu.',
        category: 'document',
        miceType: 'milieu',
      },
      {
        title: 'Nagranie rozmowy na komunikatorze Signal',
        desc: 'Zapis audio, w którym Eisenberg mówi o "przebudzeniu Śpiącego w jądrze procesora".',
        category: 'testimony',
        miceType: 'character',
      },
    ],
  },
};

export class DramatronEngine {
  public generateDeterministic(input: DramatronGenerationInput): DramatronAdventure {
    const era: DramatronEra = input.era || 'classic';
    const preset = ERA_PRESETS[era] || ERA_PRESETS.classic;
    const tone: DramatronTone = input.tone || 'purist';
    const year = input.exactYear || preset.defaultYear;
    const location = input.location || preset.defaultLocation;
    const country = input.country || preset.defaultCountry;
    const mythosEntity = input.mythosEntity || preset.mythosEntities[0];
    const theme = input.theme || 'Zakazana wiedza i tajemnicze zaginięcie';

    const timestamp = Date.now();
    const advId = `adv-dramatron-${timestamp}`;

    // 1. PREMISE
    const premise: DramatronPremise = {
      id: `${advId}-premise`,
      title: `${theme} w ${location.split(',')[0]}`,
      logline: `W ${year} roku w ${location} dochodzi do serii niewytłumaczalnych incydentów powiązanych z bóstwem ${mythosEntity}. Śledztwo ujawnia zacieranie granicy między jawą a obłędem.`,
      mythosEntity,
      anomalyType: preset.anomalies[0],
      centralMystery: `Kto i dlaczego manipuluje manifestacją ${mythosEntity}, doprowadzając mieszkańców do szaleństwa?`,
      era,
      eraLabel: preset.eraLabel,
      exactYear: year,
      location,
      country,
      tone,
      investigatorHook: `Zostajecie wezwani do ${location} w sprawie nagłego incydentu w lokalnym antykwariacie/instytucji. Na miejscu zastajecie ślady nienaturalnego chłodu i otwartą skrytkę ścienną.`,
      keeperTruthOverview: `Zbrodni dopuścił się ${preset.culprits[0].name}, którego motywem jest ${preset.culprits[0].motive}.`,
      themes: [theme, mythosEntity, 'Szaleństwo CoC 7e', era],
    };

    // 2. CAST (LAJOS EGRI 3D)
    const culprit = preset.culprits[0];
    const cast: DramatronNpc[] = [
      {
        id: `npc-${advId}-culprit`,
        name: culprit.name,
        occupation: culprit.occupation,
        firstImpression: 'Niezwykle uprzejmy, dystyngowany dżentelmen o badawczym, świdrującym spojrzeniu.',
        relationshipStatus: 'suspicious',
        disposition: 'suspicious',
        physiologicalDetail: 'Blada woskowa cera, delikatne drżenie lewej dłoni ukrywane w kieszeni płaszcza.',
        sociologicalStatus: 'Wysoki autorytet w lokalnej społeczności, członek elitarnego gremium.',
        psychologicalAgenda: culprit.motive,
        mask: 'Poważany filantrop i niestrudzony badacz prawdy historycznej.',
        secret: culprit.secret,
        statsSummary: 'STR 55, CON 65, SIZ 65, DEX 60, INT 85, POW 80, CHA 70, HP 13, SAN 30',
      },
      ...preset.suspects.slice(0, 3).map((s, idx) => ({
        id: `npc-${advId}-suspect-${idx + 1}`,
        name: s.name,
        occupation: s.occupation,
        firstImpression: `Postać sprawiająca wrażenie znerwicowanej; ${s.mask.toLowerCase()}.`,
        relationshipStatus: 'neutral' as const,
        disposition: (idx === 0 ? 'friendly' : idx === 1 ? 'neutral' : 'suspicious') as any,
        physiologicalDetail: s.quirk,
        sociologicalStatus: s.socio,
        psychologicalAgenda: s.psycho,
        mask: s.mask,
        secret: s.secret,
        statsSummary: s.stats,
      })),
    ];

    // 3. CLUE WEB (ALEXANDRIAN THREE-CLUE RULE & M.I.C.E.)
    const clueNodeCulprit = `node-${advId}-culprit`;
    const clueNodeRitual = `node-${advId}-ritual`;

    const clues: DramatronClue[] = preset.clueTemplates.map((tpl, idx) => {
      const isForCulprit = idx < 3;
      const targetNode = isForCulprit ? clueNodeCulprit : clueNodeRitual;
      return {
        id: `clue-${advId}-${idx + 1}`,
        title: tpl.title,
        description: tpl.desc,
        category: tpl.category,
        isKeyClue: true,
        miceType: tpl.miceType,
        miceObjective: isForCulprit
          ? 'Zidentyfikować inicjatora rytuału powiązanego z kultem'
          : 'Ustalić czas i współrzędne otwarcia bramy Mitów',
        sourceNpcId: idx === 2 ? cast[1].id : undefined,
        foundLocationId: undefined,
        leadsToNodeId: targetNode,
        alternativeClueIds: isForCulprit
          ? [`clue-${advId}-1`, `clue-${advId}-2`, `clue-${advId}-3`].filter((_, i) => i !== idx)
          : [`clue-${advId}-4`, `clue-${advId}-5`, `clue-${advId}-6`].filter((_, i) => i !== (idx - 3)),
        insightHint: 'Rzut na Pomysł (Wiedza/INT) ujawnia zbieżność terminów dostawy z astronomicznym nowiem.',
      };
    });

    const connections: GraphConnection[] = [
      { fromId: `loc-${advId}-1`, toId: clues[0].id, description: 'Ukryty w podwójnym dnie kantorka' },
      { fromId: `loc-${advId}-1`, toId: clues[1].id, description: 'Zahaczony o gwóźdź framugi piwnicznej' },
      { fromId: `npc-${advId}-suspect-1`, toId: clues[2].id, description: 'Wyznanie podczas przesłuchania' },
      { fromId: `loc-${advId}-2`, toId: clues[3].id, description: 'Ukryta w zablokowanej gablocie' },
      { fromId: `loc-${advId}-2`, toId: clues[4].id, description: 'Rozrzucone kartki na biurku portiera' },
      { fromId: `loc-${advId}-3`, toId: clues[5].id, description: 'Znaleziony na ołtarzu przy ciele ofiary' },
      { fromId: clues[0].id, toId: clueNodeCulprit, description: 'Tkanina i pismo wskazują jednoznacznie na sprawcę' },
      { fromId: clues[3].id, toId: clueNodeRitual, description: 'Inskrypcja definiuje dokładne miejsce kulminacji' },
    ];

    const truthAnchor: DramatronTruthAnchor = {
      culprit: culprit.name,
      motive: culprit.motive,
      murderWeapon: culprit.weapon,
      keyAlibi: 'Twierdzi, że w noc morderstwa przebywał na zamkniętym posiedzeniu uniwersytetu.',
      immutableFacts: [
        `Rytuał wymaga zogniskowania anomalii: "${premise.anomalyType}".`,
        `Ślady wosku i żelaza z meteorytu występują wyłącznie w gabinecie ${culprit.name}.`,
        'Zegar mechaniczny w krypcie został celowo przestawiony o 45 minut wstecz.',
      ],
    };

    const clueWeb: DramatronClueWeb = {
      clues,
      connections,
      truthAnchor,
    };

    // 4. LOCATIONS & JOHN DICKSON CARR LOCKED ROOM
    const locations: DramatronLocation[] = preset.locations.map((loc, idx) => ({
      id: `loc-${advId}-${idx + 1}`,
      name: loc.name,
      addressOrRegion: loc.address,
      description: `Kluczowe miejsce śledztwa w ${location}. Topografia typowa dla epoki: ${preset.eraLabel}.`,
      sensoryAtmosphere: loc.atmosphere,
      sensoryIllusions: loc.illusion,
      clueIds: idx === 0 ? [clues[0].id, clues[1].id] : idx === 1 ? [clues[3].id, clues[4].id] : [clues[5].id],
      lockedRoomMystery: {
        type: loc.carrType,
        anomalyDescription: loc.carrAnomaly,
        investigationHint: loc.carrHint,
      },
    }));

    clues[0].foundLocationId = locations[0].id;
    clues[1].foundLocationId = locations[0].id;
    clues[2].foundLocationId = locations[0].id;
    clues[3].foundLocationId = locations[1].id;
    clues[4].foundLocationId = locations[1].id;
    clues[5].foundLocationId = locations[2].id;

    // 5. SCENES & 4 AKTY OBŁĘDU
    const scenes: DramatronScene[] = [
      {
        id: `scene-${advId}-act-1`,
        title: 'Akt I: Naruszenie Status Quo',
        act: 1,
        actLabel: 'Wprowadzenie & Pierwsza Krew',
        locationId: locations[0].id,
        npcIds: [cast[1].id],
        description: 'Badacze przybywają na miejsce zdarzenia i odkrywają pierwsze niepokojące poszlaki oraz zagadkę zamkniętego pokoju.',
        clueIds: [clues[0].id, clues[1].id],
        beats: [
          {
            id: `beat-${advId}-1-1`,
            title: 'Przełamanie progu',
            description: 'Oględziny miejsca przestępstwa i konfrontacja z zapachem ozonu oraz zaryglowanymi drzwiami.',
            miceType: 'milieu',
            skillChecks: ['Spostrzegawczość', 'Ślusarstwo / Zręczność'],
            outcome: 'Odnalezienie skrawka tkaniny ze szkarłatnym monogramem.',
          },
          {
            id: `beat-${advId}-1-2`,
            title: 'Wstrząs Percepcji',
            description: 'Cienie w witrynie antykwariatu zdają się poruszać niezależnie od sylwetek badaczy.',
            sanLossRisk: '0/1 SAN',
            skillChecks: ['Rzut na Poczytalność (SAN)'],
            outcome: 'Pierwsze przeczucie, że sprawa wykracza poza zwykłe zabójstwo.',
          },
        ],
      },
      {
        id: `scene-${advId}-act-2`,
        title: 'Akt II: Labirynt Śledztwa',
        act: 2,
        actLabel: 'Śledztwo & Przesłuchania',
        locationId: locations[1].id,
        npcIds: [cast[0].id, cast[2].id],
        description: 'Dociekanie prawdy w bibliotece i archiwach. Konfrontacja zeznań podejrzanych i analiza dokumentów.',
        clueIds: [clues[2].id, clues[3].id, clues[4].id],
        beats: [
          {
            id: `beat-${advId}-2-1`,
            title: 'Pojedynek socjalny z podejrzanym',
            description: 'Przesłuchanie podejrzanego ukrywającego się za maską szanowanego obywatela.',
            miceType: 'character',
            skillChecks: ['Perswazja / Zastraszanie / Urok Osobisty', 'Psychologia'],
            outcome: 'Zdemaskowanie kłamstwa dotyczącego alibi w noc zniknięcia.',
          },
          {
            id: `beat-${advId}-2-2`,
            title: 'Dedykcja nad manuskryptem',
            description: 'Próba odczytania fragmentu starożytnej tabliczki z ołowiu.',
            miceType: 'inquiry',
            skillChecks: ['Język Obcy / Nauka / Okultyzm'],
            sanLossRisk: '1/1D3 SAN',
            outcome: 'Ustalenie, że rytuał odbędzie się o północy w starej krypcie.',
          },
        ],
      },
      {
        id: `scene-${advId}-act-3`,
        title: 'Akt III: Zstąpienie w Ciemność',
        act: 3,
        actLabel: 'Konfrontacja z Niepojętym',
        locationId: locations[2].id,
        npcIds: [cast[0].id, cast[3].id],
        description: 'Dotarcie do miejsca kultu w cmentarnej krypcie. Obserwacja przygotowań do ceremonii.',
        clueIds: [clues[5].id],
        beats: [
          {
            id: `beat-${advId}-3-1`,
            title: 'Przeprawa przez strefę anomalii',
            description: 'Przekroczenie progu krypt, gdzie grawitacja i światło ulegają nienaturalnemu załamaniu.',
            miceType: 'milieu',
            sanLossRisk: '1/1D4 SAN',
            skillChecks: ['Ukrywanie się', 'Skradanie'],
            outcome: 'Zajęcie pozycji obserwacyjnej przed rozpoczęciem inkantacji.',
          },
          {
            id: `beat-${advId}-3-2`,
            title: 'Objawienie Maski Sprawcy',
            description: 'Sprawca zdejmuje ceremonialną maskę, ujawniając swoją prawdziwą tożsamość.',
            miceType: 'character',
            outcome: 'Pewność co do tożsamości zdrajcy i celów kultu.',
          },
        ],
      },
      {
        id: `scene-${advId}-act-4`,
        title: 'Akt IV: Kulminacja & Upadek',
        act: 4,
        actLabel: 'Rytuał, Konfrontacja lub Ucieczka',
        locationId: locations[2].id,
        npcIds: [cast[0].id],
        description: 'Ostateczne starcie: przerwanie rytuału, zniszczenie nośnika anomalii lub dramatyczna ucieczka z zapadających się katakumb.',
        clueIds: [],
        isClimax: true,
        beats: [
          {
            id: `beat-${advId}-4-1`,
            title: 'Manifestacja Bóstwa Mitów',
            description: `Rozdarcie tkaniny czasoprzestrzeni i częściowe objawienie obecności ${mythosEntity}.`,
            miceType: 'event',
            sanLossRisk: '1D3/1D10 SAN',
            skillChecks: ['Rzut na Poczytalność (SAN)', 'Uniki / Walka wręcz / Broń Palna'],
            outcome: 'Konfrontacja fizyczna lub desperacka próba rozbicia ołtarza.',
          },
          {
            id: `beat-${advId}-4-2`,
            title: 'Epilog i Koszt Prawdy',
            description: 'Ocena strat: ocalenie miasta za cenę ran psychicznych, trwałych fobii i policyjnego tuszowania prawdy.',
            outcome: 'Rozliczenie sesji wg zasad CoC 7e RAW (rozwój postaci, rzut na leczenie obłędu).',
          },
        ],
      },
    ];

    return {
      version: '1.0.0',
      generatedAt: new Date(timestamp).toISOString(),
      premise,
      cast,
      clueWeb,
      locations,
      scenes,
    };
  }

  public async generateAI(input: DramatronGenerationInput): Promise<DramatronAdventure> {
    const fallback = this.generateDeterministic(input);
    const apiKey = input.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return fallback;
    }

    try {
      const ai = getGeminiClient(apiKey);
      if (!ai) return fallback;

      const systemPrompt = `
Jesteś Głównym Reżyserem Śledztwa (DeepMind Dramatron Engine) dla oficjalnego systemu Call of Cthulhu 7th Edition (RAW).
Twoim zadaniem jest wygenerować kompletną intrygę kryminalno-okultystyczną w oparciu o 5-etapową hierarchiczną dekompozycję fabularną:

1. PREMISE: Logline, esencja kosmicznego horroru, pradawne bóstwo/byt, tło historyczne epoki.
2. CAST (Lajos Egri 3D): Postacie z 3 wymiarami (fizjologia, socjologia, psychologia), publiczną maską i mrocznym sekretem.
3. CLUE WEB (Alexandrian Three-Clue Rule & M.I.C.E.): Minimum 3 poszlaki na każdy kluczowy węzeł wnioskowania (forensic, testimony, document, occult), wektory dramatyczne (milieu, inquiry, character, event), niezmienna Kotwica Prawdy (Sealed Envelope).
4. LOCATIONS (John Dickson Carr): Topografia, progi zmysłowe, anomalie oraz minimum jedna klasyczna zagadka zamkniętego pokoju.
5. SCENES (4 Akty Obłędu): 1. Wprowadzenie, 2. Śledztwo, 3. Konfrontacja, 4. Kulminacja. Każda scena z beatami akcji, testami umiejętności CoC 7e i kosztami SAN.

Zwróć ZAWSZE wyłącznie poprawny format JSON zgodny ze strukturą DramatronAdventure.
Język odpowiedzi: ${input.locale === 'en' ? 'English' : 'Polski'}.
`;

      const userPrompt = `
Wygeneruj scenariusz Dramatron:
- Motyw/Temat: ${input.theme || fallback.premise.title}
- Epoka: ${input.era || 'classic'} (${input.exactYear || fallback.premise.exactYear})
- Miejsce: ${input.location || fallback.premise.location}
- Ton: ${input.tone || 'purist'}
- Bóstwo/Manifestacja Mitów: ${input.mythosEntity || fallback.premise.mythosEntity}
`;

      const response = await ai.models.generateContent({
        model: DEFAULT_CHAT_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);

      if (
        parsed &&
        parsed.premise?.title &&
        Array.isArray(parsed.cast) &&
        parsed.cast.length > 0 &&
        parsed.clueWeb?.clues &&
        Array.isArray(parsed.locations) &&
        Array.isArray(parsed.scenes)
      ) {
        return {
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          premise: {
            ...fallback.premise,
            ...parsed.premise,
          },
          cast: parsed.cast.map((npc: any, idx: number) => ({
            ...fallback.cast[idx % fallback.cast.length],
            ...npc,
            id: npc.id || `npc-ai-${idx + 1}`,
          })),
          clueWeb: {
            clues: parsed.clueWeb.clues.map((c: any, idx: number) => ({
              ...fallback.clueWeb.clues[idx % fallback.clueWeb.clues.length],
              ...c,
              id: c.id || `clue-ai-${idx + 1}`,
            })),
            connections: Array.isArray(parsed.clueWeb.connections)
              ? parsed.clueWeb.connections
              : fallback.clueWeb.connections,
            truthAnchor: parsed.clueWeb.truthAnchor || fallback.clueWeb.truthAnchor,
          },
          locations: parsed.locations.map((loc: any, idx: number) => ({
            ...fallback.locations[idx % fallback.locations.length],
            ...loc,
            id: loc.id || `loc-ai-${idx + 1}`,
          })),
          scenes: parsed.scenes.map((sc: any, idx: number) => ({
            ...fallback.scenes[idx % fallback.scenes.length],
            ...sc,
            id: sc.id || `scene-ai-${idx + 1}`,
          })),
        };
      }

      return fallback;
    } catch (error) {
      console.warn('Błąd generowania Dramatron AI, używam silnika deterministycznego:', error);
      return fallback;
    }
  }
}

export const dramatronEngine = new DramatronEngine();
