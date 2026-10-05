/**
 * Three Clue Rule RAW Validator (The Alexandrian Canon & Call of Cthulhu 7e)
 *
 * Zgodnie z Kanonem Justina Alexandra (The Alexandrian):
 * Kazda kluczowa konkluzja sledcza, waskie gardlo (bottleneck) lub punkt kulminacyjny (climax)
 * musi posiadac co najmniej 3 niezalezne poszlaki wejsciowe (lead-in clues)
 * ze zroznicowanych zrodel dowodowych (material, testimony, document, anomaly).
 *
 * Modul realizuje:
 * 1. Wykrywanie wezlow krytycznych (isBottleneck, isClimax, type: 'climax', fallback na ostatni wezel).
 * 2. Zliczanie wlotow ze wszystkich 3 kanalow (targetNodeId, leadInClueIds, GraphConnection.toId).
 * 3. Ignorowanie falszywych tropow (isRedHerring: true).
 * 4. Egzekwowanie dywersyfikacji zrodel (min. 2, optymalnie 3 rozne sourceType).
 * 5. Deterministyczna synteze poszlak dopasowanych do 5 epok CoC ('classic', 'gaslight', 'noir', 'modern', 'prl').
 * 6. Pelne 4-krotne polaczenie grafu (clues, leadInClueIds, leadOutClueIds, connections).
 * 7. Pelna idempotencje wywolan.
 */

import type {
  AdventureGraph,
  AdventureNode,
  AdventureClue,
  ClueSourceType,
  ClueType,
  GraphConnection,
} from '../types';

export type SupportedEra = 'classic' | 'gaslight' | 'noir' | 'modern' | 'prl';

export interface ClueValidationIssue {
  nodeId: string;
  nodeName: string;
  leadInCount: number;
  distinctSourcesCount: number;
  missingCluesCount: number;
  synthesizedClueIds: string[];
}

export interface ClueValidationResult {
  isValid: boolean;
  checkedBottlenecks: number;
  totalSynthesizedClues: number;
  issues: ClueValidationIssue[];
  graph: AdventureGraph & { nodes: AdventureNode[] };
}

export interface ClueTemplate {
  name: string;
  descriptionPattern: string;
  requiredSkill: string;
}

/**
 * Normalizacja identyfikatora lub opisu epoki do 5 wspieranych kategorii CoC.
 */
export function normalizeEra(
  eraInfo?: { era?: string; yearRange?: string; eraLabel?: string } | string
): SupportedEra {
  let raw = '';
  if (typeof eraInfo === 'string') {
    raw = eraInfo;
  } else if (eraInfo && typeof eraInfo === 'object') {
    raw = [eraInfo.era, eraInfo.yearRange, eraInfo.eraLabel].filter(Boolean).join(' ');
  }

  const s = raw.toLowerCase().trim();
  if (s.includes('gaslight') || s.includes('1890') || s.includes('victorian') || s.includes('wiktoria')) {
    return 'gaslight';
  }
  if (
    s.includes('noir') ||
    s.includes('pulp') ||
    s.includes('1930') ||
    s.includes('1940') ||
    s.includes('gangster') ||
    s.includes('lata 30') ||
    s.includes('lata 40')
  ) {
    return 'noir';
  }
  if (
    s.includes('modern') ||
    s.includes('contemporary') ||
    s.includes('2000') ||
    s.includes('2020') ||
    s.includes('202') ||
    s.includes('wspolczes') ||
    s.includes('współczes') ||
    s.includes('cyfrow')
  ) {
    return 'modern';
  }
  if (
    s.includes('prl') ||
    s.includes('coldwar') ||
    s.includes('1970') ||
    s.includes('1980') ||
    s.includes('197') ||
    s.includes('198') ||
    s.includes('zimna wojna') ||
    s.includes('komunizm') ||
    s.includes('ludowa')
  ) {
    return 'prl';
  }
  // Domyslny kanoniczny standard CoC 7e RAW (USA lata 20., Arkham, Boston)
  return 'classic';
}

/**
 * Pelna matryca szablonow poszlak dla 5 epok CoC i 4 typow zrodel (lacznie 60 szablonow).
 * Wszystkie teksty wykorzystuja wylacznie standardowy myslnik '-', zero polpauz i pauz.
 */
export const CLUE_TEMPLATES: Record<SupportedEra, Record<ClueSourceType, ClueTemplate[]>> = {
  // ==========================================
  // 1. CLASSIC / 1920s (Arkham, Boston, USA lata 20.)
  // ==========================================
  classic: {
    document: [
      {
        name: 'Wycinek prasowy z "Arkham Advertiser" z odręczną adnotacją',
        descriptionPattern:
          'Pożółkły wycinek prasowy z archiwum z zakreślonym nekrologiem lub anonsem handlowym, wskazujący na bezpośredni związek ze sprawą w: {targetName}.',
        requiredSkill: 'Biblioteka',
      },
      {
        name: 'Skasowany bilet kolejowy Boston-Maine z odręczną notatką',
        descriptionPattern:
          'Bilet pasażerski drugiej klasy ze stemplem konduktora z archiwum i zanotowaną godziną odjazdu w stronę rejonu: {targetName}.',
        requiredSkill: 'Biblioteka',
      },
      {
        name: 'Poufny list handlowy z lakową pieczęcią syndykatu',
        descriptionPattern:
          'Korespondencja na czerpanym papierze z nagłówkiem domu kupieckiego, zawierająca rachunek i zestawienie dostaw skierowanych do: {targetName}.',
        requiredSkill: 'Prawo',
      },
    ],
    testimony: [
      {
        name: 'Zeznanie nocnego dorożkarza z dworca',
        descriptionPattern:
          'Woźnica po wypiciu mocnej kawy przypomina sobie zdenerwowanego pasażera z ciężką walizą, który kazał wieźć się wprost pod: {targetName}.',
        requiredSkill: 'Perswazja',
      },
      {
        name: 'Relacja przestraszonego stróża nocnego',
        descriptionPattern:
          'Starszy dozorca przysięga na pamięć zmarłych, że widział dziwne cienie i procesję wchodzącą w zaułek wiodący do: {targetName}.',
        requiredSkill: 'Psychologia',
      },
      {
        name: 'Szepty bywalców lokalu speakeasy',
        descriptionPattern:
          'Za kilka srebrnych dolarów barman z nielegalnej piwnicy zdradza plotki o dziwnych zebraniach organizowanych w: {targetName}.',
        requiredSkill: 'Zastraszanie',
      },
    ],
    material: [
      {
        name: 'Srebrny monogramowany portcygar zabłocony gliną',
        descriptionPattern:
          'Zguba należąca do zamożnego mieszkańca, nosząca na wieczku ślady specyficznej czerwonej gliny rzecznej typowej dla: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
      {
        name: 'Złamany wytrych i opiłki mosiądzu',
        descriptionPattern:
          'Porzucone narzędzie włamywacza dopasowane do nietypowych, starych zamków patentowych zainstalowanych w: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
      {
        name: 'Błotniste odciski butów z unikalnym wzorem zelówki',
        descriptionPattern:
          'Ślady podkutych butów roboczych prowadzące z miejsca zdarzenia przez mokradła bezpośrednio ku: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
    ],
    anomaly: [
      {
        name: 'Wyblakły symbol Starszego Znaku nakreślony węglem',
        descriptionPattern:
          'Rozmazany na futrynie lub murze symbol ochronny, wykonany w pośpiechu przez kogoś uciekającego w stronę: {targetName}.',
        requiredSkill: 'Okultyzm',
      },
      {
        name: 'Zimny powiew i woń morskiej zgnilizny',
        descriptionPattern:
          'Nienaturalny, lodowaty przeciąg niosący odór gnijących wodorostów i rybich łusek, wiejący wprost z kierunku: {targetName}.',
        requiredSkill: 'Mity Cthulhu',
      },
      {
        name: 'Gwałtowne zakłócenie igły magnetycznej kompasu',
        descriptionPattern:
          'Igła mosiężnego kompasu polowego wiruje bezładnie, po czym z nienaturalną siłą stabilizuje się w osi wiodącej do: {targetName}.',
        requiredSkill: 'Nauki Przyrodnicze',
      },
    ],
  },

  // ==========================================
  // 2. GASLIGHT / 1890s (Wiktoriański Londyn, mgła, lampy gazowe)
  // ==========================================
  gaslight: {
    document: [
      {
        name: 'Wpis w księdze meldunkowej parafii St. Jude',
        descriptionPattern:
          'Zażółcona karta wiktoriańskiego rejestru parafialnego, odnotowująca podejrzane zniknięcie lokatora zameldowanego pod: {targetName}.',
        requiredSkill: 'Historia',
      },
      {
        name: 'Rejestr zleceń dorożkarskich Hansom Cab',
        descriptionPattern:
          'Zapis w notesie dyspozytora stajni potwierdzający nocny kurs dorożki na odosobnione nabrzeże lub posiadłość: {targetName}.',
        requiredSkill: 'Biblioteka',
      },
      {
        name: 'Zaproszenie z prywatnego klubu dżentelmenów',
        descriptionPattern:
          'Elegancka karta wizytowa z herbem prywatnego stowarzyszenia, wskazująca tajne zebranie pod adresem: {targetName}.',
        requiredSkill: 'Prawo',
      },
    ],
    testimony: [
      {
        name: 'Zeznanie ulicznego gazeciarza z Whitechapel',
        descriptionPattern:
          'Chłopiec sprzedający wieczorne wydanie gazet widział dżentelmena w cylindrze znikającego w gęstej mgle w stronę: {targetName}.',
        requiredSkill: 'Urok Osobisty',
      },
      {
        name: 'Relacja miejskiego latarnika',
        descriptionPattern:
          'Mężczyzna z tyczką do zapalania lamp gazowych donosi o niezwykłych hałasach i powozach z zasłoniętymi herbami zmierzających do: {targetName}.',
        requiredSkill: 'Perswazja',
      },
      {
        name: 'Spowiedź służącej z kamienicy czynszowej',
        descriptionPattern:
          'Zapłakana praczka przyznaje podczas rozmowy, że jej pracodawca nocami odprawiał dziwne obrzędy powiązane z: {targetName}.',
        requiredSkill: 'Psychologia',
      },
    ],
    material: [
      {
        name: 'Złamana laska ze srebrną gałką i sadzą węglową',
        descriptionPattern:
          'Wytworna laska spacerowa porzucona w rynsztoku, pokryta pyłem fabrycznym charakterystycznym wyłącznie dla: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
      {
        name: 'Pusta buteleczka po laudanum z apteczną etykietą',
        descriptionPattern:
          'Flakonik z ciemnego szkła z pieczęcią aptekarza zaopatrującego wiktoriańskie sanatorium lub rezydencję w: {targetName}.',
        requiredSkill: 'Medycyna',
      },
      {
        name: 'Fragment czarnego jedwabiu z herbem rodowym',
        descriptionPattern:
          'Rozdarty skrawek żałobnej peleryny zahaczony o żelazne ogrodzenie prowadzące prosto do: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
    ],
    anomaly: [
      {
        name: 'Fosforyzująca poświata w oparach gazowych',
        descriptionPattern:
          'Nienaturalna zielonkawa mgła snująca się nisko nad brukiem, niepodatna na podmuchy wiatru i ciągnąca ku: {targetName}.',
        requiredSkill: 'Okultyzm',
      },
      {
        name: 'Metaliczny lament dochodzący z kanałów burzowych',
        descriptionPattern:
          'Głuchy, pulsujący dźwięk niosący się podziemną siecią ściekową, którego źródło mieści się bezpośrednio pod: {targetName}.',
        requiredSkill: 'Mity Cthulhu',
      },
      {
        name: 'Martwe szczury ułożone w koncentryczne okręgi',
        descriptionPattern:
          'Kilkadziesiąt gryzoni bez śladów ran, leżących w geometrycznym szyku zwróconym łbami w stronę: {targetName}.',
        requiredSkill: 'Mity Cthulhu',
      },
    ],
  },

  // ==========================================
  // 3. NOIR / PULP (Lata 30./40., gangsterzy, deszcz, kryzys)
  // ==========================================
  noir: {
    document: [
      {
        name: 'Policyjny raport patrolowy i kwit z lombardu',
        descriptionPattern:
          'Zmięta notatka z archiwum komisariatu oraz rewers zastawionego zegarka z adresem meliny powiązanej z: {targetName}.',
        requiredSkill: 'Prawo',
      },
      {
        name: 'Notes bukmacherski z listą dłużników mafii',
        descriptionPattern:
          'Skórzany notes z zaszyfrowanymi stawkami i rejestrem zbiega ukrywającego się na terenie: {targetName}.',
        requiredSkill: 'Biblioteka',
      },
      {
        name: 'Biling połączeń z miejskiej centrali telefonicznej',
        descriptionPattern:
          'Wykaz ręcznie łączonych rozmów kablowych z centrali, wskazujący powtarzające się telefony do: {targetName}.',
        requiredSkill: 'Historia',
      },
    ],
    testimony: [
      {
        name: 'Zeznanie barmana z podrzędnego lokalu jazzowego',
        descriptionPattern:
          'Mężczyzna za barem po dociśnięciu do ściany ujawnia tożsamość kurierów gangsterskich zmierzających do: {targetName}.',
        requiredSkill: 'Zastraszanie',
      },
      {
        name: 'Relacja pobitej tancerki rewiowej',
        descriptionPattern:
          'Dziewczyna w garderobie teatru rewiowego w zamian za ochronę opisuje kryjówkę bossa w: {targetName}.',
        requiredSkill: 'Urok Osobisty',
      },
      {
        name: 'Wyznanie skorumpowanego tajniaka policji',
        descriptionPattern:
          'Funkcjonariusz z wydziału kryminalnego przyznaje, że akta sprawy zniknęły na polecenie ludzi z: {targetName}.',
        requiredSkill: 'Psychologia',
      },
    ],
    material: [
      {
        name: 'Wystrzelona łuska kalibru .45 ze skazą iglicy',
        descriptionPattern:
          'Łuska od pistoletu maszynowego Thompson, nosząca unikalne nacięcie rusznikarza działającego dla grupy w: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
      {
        name: 'Zakrwawione pudełko zapałek z adresem motelu',
        descriptionPattern:
          'Pudełko zapałek z reklamą przydrożnego motelu, będącego punktem zbornym przed uderzeniem na: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
      {
        name: 'Pęknięty sygnet z syntetycznym rubinem i pyłem cementowym',
        descriptionPattern:
          'Kradziona biżuteria pokryta pyłem z opuszczonych doków lub magazynów otaczających: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
    ],
    anomaly: [
      {
        name: 'Piszczący szept na krótkich falach radiowych',
        descriptionPattern:
          'Odbiornik w samochodzie detektywa samoczynnie dostraja się do częstotliwości emitującej bluźnierczą mantrę z: {targetName}.',
        requiredSkill: 'Okultyzm',
      },
      {
        name: 'Wypalony w asfaltowej nawierzchni kontur cienia',
        descriptionPattern:
          'Ślad po nienaturalnym błysku światła, pozostawiający sylwetkę nieludzkiego kształtu zwróconego ku: {targetName}.',
        requiredSkill: 'Okultyzm',
      },
      {
        name: 'Zwęglone zwłoki gołębi miejskich bez zapachu spalenizny',
        descriptionPattern:
          'Ptaki, które spadły martwe z przewodów telegraficznych w promieniu kilometra od: {targetName}.',
        requiredSkill: 'Mity Cthulhu',
      },
    ],
  },

  // ==========================================
  // 4. MODERN (Współczesność: GPS, monitoring, pliki cyfrowe)
  // ==========================================
  modern: {
    document: [
      {
        name: 'Zaszyfrowany plik cyfrowy i rejestr logów GPS',
        descriptionPattern:
          'Zaszyfrowany plik cyfrowy i rejestr logów geolokalizacji z nośnika pamięci, wyznaczający trasę do: {targetName}.',
        requiredSkill: 'Komputery',
      },
      {
        name: 'Zrzut klatek z miejskiego monitoringu CCTV',
        descriptionPattern:
          'Cyfrowy plik z nagrania miejskiej sieci kamer, ukazujący rejestr pojazdu skręcającego ku: {targetName}.',
        requiredSkill: 'Elektronika',
      },
      {
        name: 'Elektroniczny wyciąg bankowy z transakcji kartą płatniczą',
        descriptionPattern:
          'Cyfrowy rejestr transakcji płatniczych dokumentujący zakup specjalistycznego sprzętu i paliwa w rejonie: {targetName}.',
        requiredSkill: 'Szukanie',
      },
    ],
    testimony: [
      {
        name: 'Zeznanie kuriera firmy przesyłkowej',
        descriptionPattern:
          'Kierowca firmy spedycyjnej potwierdza dostarczenie nieoznakowanych kontenerów z chemikaliami pod adres: {targetName}.',
        requiredSkill: 'Perswazja',
      },
      {
        name: 'Nagranie zgłoszenia z dyspozytorni numeru 112',
        descriptionPattern:
          'Zapis audio z dramatycznym zgłoszeniem od anonimowego świadka, który uciekł z terenu: {targetName}.',
        requiredSkill: 'Psychologia',
      },
      {
        name: 'Rozmowa z nocnym operatorem szlabanu osiedla',
        descriptionPattern:
          'Ochroniarz za drobne wynagrodzenie udostępnia zapis wjazdu podejrzanego konwoju zmierzającego do: {targetName}.',
        requiredSkill: 'Urok Osobisty',
      },
    ],
    material: [
      {
        name: 'Rozbity aparat telefoniczny z nienaruszoną kartą pamięci',
        descriptionPattern:
          'Uszkodzony aparat telefoniczny, którego stacja bazowa logowała ostatnie sygnały w pobliżu: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
      {
        name: 'Strzęp kombinezonu chemicznego z nieznanym polimerem',
        descriptionPattern:
          'Materiał syntetyczny odporny na kwasy, pozostawiony na ogrodzeniu przemysłowym okalającym: {targetName}.',
        requiredSkill: 'Medycyna',
      },
      {
        name: 'Fiolka z krwią i wynikami badań toksykologicznych',
        descriptionPattern:
          'Próbka biologiczna wykazująca obecność niesklasyfikowanych neurotoksyn, pobrana na szlaku do: {targetName}.',
        requiredSkill: 'Medycyna',
      },
    ],
    anomaly: [
      {
        name: 'Cyfrowe artefakty i zniekształcenia w zapisie wideo',
        descriptionPattern:
          'Kamera samochodowa nagrała geometryczne załamania światła i anomalną pikselizację przestrzeni w otoczeniu: {targetName}.',
        requiredSkill: 'Okultyzm',
      },
      {
        name: 'Lokalny impuls elektromagnetyczny i przepięcie sieci',
        descriptionPattern:
          'Ślad po nagłym skoku napięcia, który spalił układy we wszystkich transformatorach w pobliżu: {targetName}.',
        requiredSkill: 'Nauki Przyrodnicze',
      },
      {
        name: 'Wynik sekwencjonowania DNA o nieludzkim kodzie genetycznym',
        descriptionPattern:
          'Raport z aparatury badawczej wykazujący brak ziemskich zasad azotowych w próbce znalezionej przy: {targetName}.',
        requiredSkill: 'Mity Cthulhu',
      },
    ],
  },

  // ==========================================
  // 5. PRL / COLD WAR (Polska lat 70./80., MO, SB, archiwa)
  // ==========================================
  prl: {
    document: [
      {
        name: 'Poufny meldunek operacyjny Komendy Dzielnicowej MO',
        descriptionPattern:
          'Przebitka na maszynopisie przez fioletową kalkę z pieczęcią "Tylko do użytku służbowego", dotycząca incydentu w: {targetName}.',
        requiredSkill: 'Prawo',
      },
      {
        name: 'Karta ewidencyjna z magazynu zakładowego FSO lub GS-u',
        descriptionPattern:
          'Rachunek materiałowy potwierdzający nielegalne wydanie aparatury pomiarowej z przeznaczeniem dla obiektu: {targetName}.',
        requiredSkill: 'Biblioteka',
      },
      {
        name: 'Ulotka podziemnego biuletynu z odręcznym dopiskiem bibułą',
        descriptionPattern:
          'Powielaczowy komunikat opozycyjny z dopisanym ołówkiem ostrzeżeniem przed tajnymi pracami w: {targetName}.',
        requiredSkill: 'Historia',
      },
    ],
    testimony: [
      {
        name: 'Relacja stróża z bazy maszyn rolniczych PGR',
        descriptionPattern:
          'Starszy pracownik w waciaku przy szklance herbaty wspomina nocny przejazd wojskowych ciężarówek w stronę: {targetName}.',
        requiredSkill: 'Perswazja',
      },
      {
        name: 'Notatka ze sprawozdania Tajnego Współpracownika (TW)',
        descriptionPattern:
          'Doniesienie agenturalne rejestrujące podejrzane zebrania naukowców i dygnitarzy partyjnych w: {targetName}.',
        requiredSkill: 'Psychologia',
      },
      {
        name: 'Opowieść kierowcy zakładowej Nyski 522',
        descriptionPattern:
          'Kierowca po postawieniu kieliszka czystej wódki zdradza, jak pod przymusem przewoził skrzynie z ołowiem do: {targetName}.',
        requiredSkill: 'Zastraszanie',
      },
    ],
    material: [
      {
        name: 'Zgnieciona paczka po papierosach "Sport" ze szkicem mapy',
        descriptionPattern:
          'Tekturowe opakowanie papierosów, na którego wewnętrznej stronie rozrysowano plan ominięcia posterunku MO pod: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
      {
        name: 'Fragment radzieckiego izolatora ceramicznego wysokiego napięcia',
        descriptionPattern:
          'Ciężki element osprzętu radiolokacyjnego ze stemplem z cyrylicą, zgubiony na leśnej drodze do: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
      {
        name: 'Bieżnik opon wojskowego UAZ-a odbity w leśnym błocie',
        descriptionPattern:
          'Głębokie koleiny terenowego wozu wojskowego prowadzące w zakazaną strefę leśną otaczającą: {targetName}.',
        requiredSkill: 'Spostrzegawczosc',
      },
    ],
    anomaly: [
      {
        name: 'Piszczące pasmo radiostacji numerycznej w odbiorniku "Safari"',
        descriptionPattern:
          'Milicyjne radio samochodowe odbiera upiorne, monotonne sekwencje liczbowe czytane przez syntezator ze stacji w: {targetName}.',
        requiredSkill: 'Okultyzm',
      },
      {
        name: 'Sczerniałe pnie sosen w strefie skażenia biologicznego',
        descriptionPattern:
          'Martwy pas lasu iglastego, w którym wszystkie gałęzie wygięły się ku ziemi w nienaturalnym pokłonie ku: {targetName}.',
        requiredSkill: 'Mity Cthulhu',
      },
      {
        name: 'Gwałtowne trzaski wojskowego dozymetru DP-66',
        descriptionPattern:
          'Sygnalizator promieniowania wskazuje anomalne tło energetyczne bez obecności znanych izotopów, bijące z: {targetName}.',
        requiredSkill: 'Nauki Przyrodnicze',
      },
    ],
  },
};

export class ThreeClueRuleValidator {
  /**
   * Waliduje i automatycznie naprawia graf przygody zgodnie z Zasadą 3 Poszlak (RAW).
   * Gwarantuje pelna idempotencje oraz unikalnosc struktur.
   */
  public static validateAndRepairGraph(
    graph: AdventureGraph,
    eraInfo?: { era?: string; yearRange?: string; eraLabel?: string } | string,
    locationInfo?: { location?: string; country?: string } | string
  ): ClueValidationResult {
    // 1. Bezpieczna normalizacja wejscia i odpornosc na Object.freeze
    if (!graph || typeof graph !== 'object') {
      return {
        isValid: true,
        checkedBottlenecks: 0,
        totalSynthesizedClues: 0,
        issues: [],
        graph: { nodes: [], clues: [], connections: [], npcs: [], locations: [] },
      };
    }

    // Wykrycie zamrozenia obiektu glownego grafu
    const isGraphFrozen = Object.isFrozen(graph) || !Object.isExtensible(graph);
    const workingGraph: AdventureGraph = isGraphFrozen ? { ...graph } : graph;

    const rawNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const nodes: AdventureNode[] = [];
    const existingNodeIds = new Set<string>();

    for (let i = 0; i < rawNodes.length; i++) {
      const rawNode = rawNodes[i];
      if (!rawNode || typeof rawNode !== 'object') continue;

      const isNodeFrozen = Object.isFrozen(rawNode) || !Object.isExtensible(rawNode);
      let node: AdventureNode;

      if (isNodeFrozen) {
        node = {
          ...rawNode,
          leadInClueIds: Array.isArray(rawNode.leadInClueIds)
            ? rawNode.leadInClueIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            : [],
          leadOutClueIds: Array.isArray(rawNode.leadOutClueIds)
            ? rawNode.leadOutClueIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            : [],
        };
      } else {
        node = rawNode;
        const isLeadInFrozen =
          !Array.isArray(node.leadInClueIds) ||
          Object.isFrozen(node.leadInClueIds) ||
          !Object.isExtensible(node.leadInClueIds);
        node.leadInClueIds = isLeadInFrozen
          ? (Array.isArray(node.leadInClueIds) ? [...node.leadInClueIds] : []).filter(
              (id): id is string => typeof id === 'string' && id.trim().length > 0
            )
          : node.leadInClueIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

        const isLeadOutFrozen =
          !Array.isArray(node.leadOutClueIds) ||
          Object.isFrozen(node.leadOutClueIds) ||
          !Object.isExtensible(node.leadOutClueIds);
        node.leadOutClueIds = isLeadOutFrozen
          ? (Array.isArray(node.leadOutClueIds) ? [...node.leadOutClueIds] : []).filter(
              (id): id is string => typeof id === 'string' && id.trim().length > 0
            )
          : node.leadOutClueIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      }

      // Zapewnij poprawny string ID dla kazdego wezla
      if (typeof node.id === 'string' && node.id.trim().length > 0) {
        node.id = node.id.trim();
      } else if (typeof node.id === 'number' && !Number.isNaN(node.id)) {
        node.id = String(node.id);
      } else {
        const typePrefix =
          typeof node.type === 'string' && node.type.trim().length > 0 ? node.type.trim() : 'node';
        let candidateId = `node-${typePrefix}-${i + 1}`;
        let seq = 1;
        while (existingNodeIds.has(candidateId)) {
          seq++;
          candidateId = `node-${typePrefix}-${i + 1}-${seq}`;
        }
        node.id = candidateId;
      }
      existingNodeIds.add(node.id);

      nodes.push(node);
    }

    // Normalizacja poszlak z defensywnym klonowaniem zamrozonych obiektow
    const rawClues = Array.isArray(graph.clues) ? graph.clues : [];
    const clues: AdventureClue[] = [];
    for (const rawClue of rawClues) {
      if (!rawClue || typeof rawClue !== 'object') continue;
      if (Object.isFrozen(rawClue) || !Object.isExtensible(rawClue)) {
        clues.push({ ...rawClue });
      } else {
        clues.push(rawClue);
      }
    }

    // Normalizacja polaczen z defensywnym klonowaniem zamrozonych obiektow
    const rawConnections = Array.isArray(graph.connections) ? graph.connections : [];
    const connections: GraphConnection[] = [];
    for (const rawConn of rawConnections) {
      if (!rawConn || typeof rawConn !== 'object') continue;
      if (Object.isFrozen(rawConn) || !Object.isExtensible(rawConn)) {
        connections.push({ ...rawConn });
      } else {
        connections.push(rawConn);
      }
    }

    workingGraph.nodes = nodes;
    workingGraph.clues = clues;
    workingGraph.connections = connections;
    workingGraph.npcs = Array.isArray(graph.npcs)
      ? Object.isFrozen(graph.npcs) || !Object.isExtensible(graph.npcs)
        ? [...graph.npcs]
        : graph.npcs
      : [];
    workingGraph.locations = Array.isArray(graph.locations)
      ? Object.isFrozen(graph.locations) || !Object.isExtensible(graph.locations)
        ? [...graph.locations]
        : graph.locations
      : [];

    if (nodes.length === 0) {
      return {
        isValid: true,
        checkedBottlenecks: 0,
        totalSynthesizedClues: 0,
        issues: [],
        graph: workingGraph as AdventureGraph & { nodes: AdventureNode[] },
      };
    }

    // 2. Identyfikacja wezlow krytycznych (bottleneck / climax)
    const bottleneckNodes: AdventureNode[] = [];
    const seenNodeIds = new Set<string>();

    for (const node of nodes) {
      const isBottleneck = node.isBottleneck === true;
      const isClimax = node.isClimax === true || node.type === 'climax';
      if (isBottleneck || isClimax) {
        if (!seenNodeIds.has(node.id)) {
          bottleneckNodes.push(node);
          seenNodeIds.add(node.id);
        }
      }
    }

    // Fallback: gdy brak jawnych oznaczen, a graf ma wiecej niz 1 wezel,
    // ostatni wezel traktowany jest jako punkt kulminacyjny scenariusza.
    if (bottleneckNodes.length === 0 && nodes.length > 1) {
      const lastNode = nodes[nodes.length - 1];
      lastNode.isClimax = true;
      bottleneckNodes.push(lastNode);
      seenNodeIds.add(lastNode.id);
    }

    const issues: ClueValidationIssue[] = [];
    let totalSynthesized = 0;
    const existingClueIds = new Set<string>();

    for (const c of clues) {
      if (c && typeof c.id === 'string' && c.id.trim().length > 0) {
        existingClueIds.add(c.id.trim());
      }
    }

    // 3. Iteracja po wezlach krytycznych i uzupelnianie brakow
    for (const targetNode of bottleneckNodes) {
      const leadInCluesMap = new Map<string, AdventureClue>();

      for (const c of clues) {
        if (!c || typeof c.id !== 'string' || c.id.trim().length === 0) continue;
        const validClueId = c.id.trim();

        const isTargetMatch = c.targetNodeId === targetNode.id;
        const isLeadInMatch = targetNode.leadInClueIds.includes(validClueId);
        const isConnMatch = connections.some(
          (conn) => conn && conn.toId === targetNode.id && conn.clueId === validClueId
        );

        if (isTargetMatch || isLeadInMatch || isConnMatch) {
          c.targetNodeId = targetNode.id;
          if (!targetNode.leadInClueIds.includes(validClueId)) {
            targetNode.leadInClueIds.push(validClueId);
          }

          // Falszywe tropy nie licza sie do Zasady 3 Poszlak
          if (!c.isRedHerring) {
            if (!c.sourceType) {
              c.sourceType = this.inferClueSourceType(c);
            }
            leadInCluesMap.set(validClueId, c);
          }
        }
      }

      const existingLeadInClues = Array.from(leadInCluesMap.values());
      const existingSources = new Set<ClueSourceType>(
        existingLeadInClues.map((c) => c.sourceType).filter(Boolean) as ClueSourceType[]
      );

      let missingCount = 0;
      if (existingLeadInClues.length < 3) {
        missingCount = 3 - existingLeadInClues.length;
      } else if (existingSources.size === 1) {
        // Wszystkie poszlaki tego samego typu: wymagana 1 poszlaka dywersyfikujaca
        missingCount = 1;
      }

      if (missingCount > 0) {
        // Kandydaci na wezel zrodlowy (poprzednik)
        let candidateSourceNodes = workingGraph.nodes.filter(
          (n) => n.id !== targetNode.id && n.type !== 'climax' && !n.isClimax
        );

        if (candidateSourceNodes.length === 0 && workingGraph.nodes.length > 1) {
          candidateSourceNodes = workingGraph.nodes.filter((n) => n.id !== targetNode.id);
        }

        if (candidateSourceNodes.length === 0) {
          // Fallback dla grafu jednowezlowego: utworzenie syntetycznego wezla prologu
          const rawIntroTargetId =
            typeof targetNode?.id === 'string' && targetNode.id.trim()
              ? targetNode.id.trim()
              : typeof targetNode?.id === 'number'
              ? String(targetNode.id)
              : 'target';
          const sanitizedIntroTargetId =
            rawIntroTargetId.replace(/[^a-zA-Z0-9_-]/g, '-') || 'target';

          const introNode: AdventureNode = {
            id: `node-intro-${sanitizedIntroTargetId}`,
            name: 'Prolog Śledztwa / Zlecenie',
            type: 'intro',
            description: 'Początek dochodzenia, w którym badacze natrafiają na pierwsze tropy.',
            leadInClueIds: [],
            leadOutClueIds: [],
          };
          workingGraph.nodes.unshift(introNode);
          candidateSourceNodes = [introNode];
        }

        const allSourceTypes: ClueSourceType[] = ['document', 'testimony', 'material', 'anomaly'];
        const remainingSources = allSourceTypes.filter((s) => !existingSources.has(s));
        const synthesizedClueIds: string[] = [];

        for (let i = 0; i < missingCount; i++) {
          const chosenSourceType =
            remainingSources.length > 0
              ? remainingSources.shift()!
              : allSourceTypes[(existingLeadInClues.length + i) % allSourceTypes.length];
          existingSources.add(chosenSourceType);

          const sourceNode =
            candidateSourceNodes[(existingLeadInClues.length + i) % candidateSourceNodes.length];
          sourceNode.leadOutClueIds = Array.isArray(sourceNode.leadOutClueIds)
            ? sourceNode.leadOutClueIds
            : [];

          // Unikalne deterministyczne ID poszlaki
          const rawTargetId =
            typeof targetNode?.id === 'string' && targetNode.id.trim()
              ? targetNode.id.trim()
              : typeof targetNode?.id === 'number'
              ? String(targetNode.id)
              : 'target';
          const sanitizedTargetId = rawTargetId.replace(/[^a-zA-Z0-9_-]/g, '-') || 'target';
          let seq = targetNode.leadInClueIds.length + 1;
          let clueId = `clue-synth-${sanitizedTargetId}-${chosenSourceType}-${seq}`;
          while (existingClueIds.has(clueId)) {
            seq++;
            clueId = `clue-synth-${sanitizedTargetId}-${chosenSourceType}-${seq}`;
          }
          existingClueIds.add(clueId);

          const variantIndex = targetNode.leadInClueIds.length + i;
          const synthesizedClue = this.synthesizeClue(
            clueId,
            chosenSourceType,
            targetNode,
            sourceNode,
            eraInfo,
            locationInfo,
            variantIndex
          );

          // 1. Dodanie poszlaki do workingGraph.clues
          workingGraph.clues.push(synthesizedClue);

          // 2. Dodanie ID do targetNode.leadInClueIds
          targetNode.leadInClueIds.push(clueId);

          // 3. Dodanie ID do sourceNode.leadOutClueIds
          if (!sourceNode.leadOutClueIds.includes(clueId)) {
            sourceNode.leadOutClueIds.push(clueId);
          }

          // 4. Dodanie krawedzi GraphConnection
          workingGraph.connections.push({
            fromId: sourceNode.id,
            toId: targetNode.id,
            description: `Prowadzi do celu za pośrednictwem poszlaki: ${synthesizedClue.name}`,
            clueId: clueId,
          });

          synthesizedClueIds.push(clueId);
          totalSynthesized++;
        }

        issues.push({
          nodeId: targetNode.id,
          nodeName: targetNode.name || targetNode.id,
          leadInCount: existingLeadInClues.length,
          distinctSourcesCount: existingSources.size,
          missingCluesCount: missingCount,
          synthesizedClueIds,
        });
      }
    }

    // 4. Spojnosc topologiczna: synchronizacja referencji
    const finalClueMap = new Map<string, AdventureClue>();
    for (const c of workingGraph.clues) {
      if (c && typeof c.id === 'string' && c.id.trim().length > 0) {
        finalClueMap.set(c.id.trim(), c);
      }
    }

    for (const node of workingGraph.nodes) {
      node.leadInClueIds = (node.leadInClueIds || []).filter((id): id is string => {
        if (typeof id !== 'string' || id.trim().length === 0) return false;
        const clue = finalClueMap.get(id.trim());
        return Boolean(clue && clue.targetNodeId === node.id);
      });

      node.leadOutClueIds = (node.leadOutClueIds || []).filter((id): id is string => {
        if (typeof id !== 'string' || id.trim().length === 0) return false;
        const clue = finalClueMap.get(id.trim());
        return Boolean(clue && clue.sourceNodeId === node.id);
      });
    }

    for (const clue of workingGraph.clues) {
      if (
        clue &&
        typeof clue.id === 'string' &&
        clue.id.trim().length > 0 &&
        typeof clue.sourceNodeId === 'string' &&
        clue.sourceNodeId.trim().length > 0
      ) {
        const validClueId = clue.id.trim();
        const validSourceNodeId = clue.sourceNodeId.trim();
        const sourceNode = workingGraph.nodes.find((n) => n.id === validSourceNodeId);
        if (sourceNode) {
          sourceNode.leadOutClueIds = Array.isArray(sourceNode.leadOutClueIds)
            ? sourceNode.leadOutClueIds
            : [];
          if (!sourceNode.leadOutClueIds.includes(validClueId)) {
            sourceNode.leadOutClueIds.push(validClueId);
          }
        }
      }
    }

    return {
      isValid: totalSynthesized === 0,
      checkedBottlenecks: bottleneckNodes.length,
      totalSynthesizedClues: totalSynthesized,
      issues,
      graph: workingGraph as AdventureGraph & { nodes: AdventureNode[] },
    };
  }

  /**
   * Wersja inspekcyjna (w 100% read-only). Nie modyfikuje oryginalnego obiektu grafu.
   */
  public static inspectGraph(
    graph: AdventureGraph,
    eraInfo?: { era?: string; yearRange?: string; eraLabel?: string } | string,
    locationInfo?: { location?: string; country?: string } | string
  ): ClueValidationResult {
    if (!graph || typeof graph !== 'object') {
      return {
        isValid: true,
        checkedBottlenecks: 0,
        totalSynthesizedClues: 0,
        issues: [],
        graph: { nodes: [], clues: [], connections: [], npcs: [], locations: [] },
      };
    }

    const clonedGraph: AdventureGraph = {
      nodes: Array.isArray(graph.nodes)
        ? graph.nodes.map((n) => ({
            ...n,
            leadInClueIds: Array.isArray(n.leadInClueIds) ? [...n.leadInClueIds] : [],
            leadOutClueIds: Array.isArray(n.leadOutClueIds) ? [...n.leadOutClueIds] : [],
          }))
        : [],
      clues: Array.isArray(graph.clues) ? graph.clues.map((c) => ({ ...c })) : [],
      connections: Array.isArray(graph.connections)
        ? graph.connections.map((conn) => ({ ...conn }))
        : [],
      npcs: Array.isArray(graph.npcs) ? [...graph.npcs] : [],
      locations: Array.isArray(graph.locations) ? [...graph.locations] : [],
    };

    const repairResult = this.validateAndRepairGraph(clonedGraph, eraInfo, locationInfo);

    return {
      isValid: repairResult.isValid,
      checkedBottlenecks: repairResult.checkedBottlenecks,
      totalSynthesizedClues: repairResult.totalSynthesizedClues,
      issues: repairResult.issues,
      graph: (Array.isArray(graph.nodes) ? graph : { ...graph, nodes: [] }) as AdventureGraph & { nodes: AdventureNode[] },
    };
  }

  /**
   * Generuje deterministyczna, diegetyczna poszlake dopasowana do epoki i kategorii zrodla.
   */
  public static synthesizeClue(
    id: string,
    sourceType: ClueSourceType,
    targetNode: AdventureNode,
    sourceNode?: AdventureNode,
    eraInfo?: { era?: string; yearRange?: string; eraLabel?: string } | string,
    locationInfo?: { location?: string; country?: string } | string,
    variantIndex = 0
  ): AdventureClue {
    const era = normalizeEra(eraInfo);
    const eraTemplates = CLUE_TEMPLATES[era] || CLUE_TEMPLATES.classic;
    const typeTemplates = eraTemplates[sourceType] || eraTemplates.document;

    const safeIndex = Math.abs(variantIndex) % typeTemplates.length;
    const template = typeTemplates[safeIndex];

    const targetDisplayName = targetNode.name || 'cel śledztwa';
    let description = template.descriptionPattern.replace('{targetName}', targetDisplayName);

    if (locationInfo) {
      const loc = typeof locationInfo === 'string' ? locationInfo : locationInfo.location || '';
      if (loc) {
        description = description.replace('{location}', loc);
      }
    }

    return {
      id,
      name: template.name,
      description,
      sourceType,
      clueType: 'core',
      targetNodeId: targetNode.id,
      ...(sourceNode ? { sourceNodeId: sourceNode.id } : {}),
      requiredSkill: template.requiredSkill,
      isSynthesized: true,
      isRedHerring: false,
    };
  }

  /**
   * Automatyczne wnioskowanie kategorii zrodla poszlaki z jej nazwy i opisu.
   */
  private static inferClueSourceType(clue: AdventureClue): ClueSourceType {
    const text = `${clue.name || ''} ${clue.description || ''}`.toLowerCase();
    if (
      /list|pamiętnik|pamietnik|dziennik|notatk|telegram|wycinek|fotograf|księg|ksieg|akt|testament|recept|rachunek|bilet|map|dokument|akta|raport|archiw|rejestr/i.test(
        text
      )
    ) {
      return 'document';
    }
    if (
      /zeznani|relacj|świadek|swiadek|opowiada|zdradza|przyznaje|zeznaje|rozmow|plotk|informator|słyszał|slyszal|widział|widzial|mówi|mowi/i.test(
        text
      )
    ) {
      return 'testimony';
    }
    if (
      /zapach|chłód|chlod|jęk|jek|odgłos|odglos|symbol|hieroglif|poświat|poswiat|śluz|sluz|drżeni|drzeni|aura|anomali|wibracj|mistyczn|okulty|bóstw|bostw|rytuał|rytual/i.test(
        text
      )
    ) {
      return 'anomaly';
    }
    return 'material';
  }
}

/**
 * Kanoniczny punkt wejscia walidacji i egzekwowania Zasady 3 Poszlak (RAW).
 * Sprawdza kazde waskie gardlo oraz punkt kulminacyjny i syntetyzuje brakujace poszlaki.
 */
export function validateAndEnforceThreeClueRule(
  graph: AdventureGraph,
  eraInfo?: { era?: string; yearRange?: string; eraLabel?: string } | string,
  locationInfo?: { location?: string; country?: string } | string
): ClueValidationResult {
  return ThreeClueRuleValidator.validateAndRepairGraph(graph, eraInfo, locationInfo);
}
