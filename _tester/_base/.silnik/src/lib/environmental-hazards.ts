// ============================================================
// ENVIRONMENTAL HAZARDS — Zagrożenia środowiskowe (CoC 7e)
// Tabele obrażeń, testów i efektów dla ognia, utonięcia,
// upadku, trucizn, chorób, ekspozycji i elektryczności
// ============================================================

export type HazardType = 'fire' | 'drowning' | 'falling' | 'poison' | 'disease' | 'exposure' | 'electricity';

export interface EnvironmentalHazard {
  id: string;
  type: HazardType;
  name: string;
  description: string;
  damagePerRound: string;         // formula, np. '1d6'
  testToAvoid?: string;           // np. 'CON' lub 'DEX'
  testDifficulty?: 'Normal' | 'Hard' | 'Extreme';
  effectOnFailure: string;
  effectOnSuccess: string;
  duration?: string;              // np. 'do ugaszenia', '1d6 rund'
  specialRules?: string[];
}

// === OGIEŃ I POPARZENIA ===

export const FIRE_HAZARDS: EnvironmentalHazard[] = [
  {
    id: 'fire-small',
    type: 'fire',
    name: 'Mały ogień (pochodnia, świeca)',
    description: 'Kontakt z małym źródłem ognia',
    damagePerRound: '1d3',
    testToAvoid: 'DEX',
    testDifficulty: 'Normal',
    effectOnFailure: '1d3 obrażeń + ubranie może się zapalić (20% szansy)',
    effectOnSuccess: 'Unikasz ognia',
    specialRules: ['Łatwe do ugaszenia — jedna runda akcji']
  },
  {
    id: 'fire-medium',
    type: 'fire',
    name: 'Średni ogień (ognisko, płonące meble)',
    description: 'Przebywanie w pobliżu lub przechodzenie przez średni pożar',
    damagePerRound: '1d6',
    testToAvoid: 'DEX',
    testDifficulty: 'Hard',
    effectOnFailure: '1d6 obrażeń/rundę. Ubranie się pali (+1d6/rundę dopóki nie ugaszone). Test CON lub ból uniemożliwia działanie.',
    effectOnSuccess: 'Przebiegasz przez ogień — 1d3 obrażeń jednorazowo',
    duration: 'Do ugaszenia lub opuszczenia strefy',
    specialRules: ['Ugaszenie płonącego ubrania: test DEX + 1 runda akcji lub woda', 'Dym: test CON każdą rundę lub kaszel (-20% do akcji)']
  },
  {
    id: 'fire-large',
    type: 'fire',
    name: 'Duży pożar (płonący budynek)',
    description: 'Pożar budynku — ogień, dym, zawalenie',
    damagePerRound: '2d6',
    testToAvoid: 'DEX',
    testDifficulty: 'Extreme',
    effectOnFailure: '2d6 obrażeń/rundę. Dym: test CON (Trudny) lub utrata przytomności w 1d4 rund.',
    effectOnSuccess: 'Uciekasz — 1d6 obrażeń jednorazowo',
    duration: 'Do ucieczki z budynku',
    specialRules: [
      'Zawalenie się stropu: test Szczęścia — porażka = 4d6 obrażeń',
      'Dym jest bardziej zabójczy niż ogień — 1d4 rund do utraty przytomności bez testu CON',
      'Widoczność: 0 w gęstym dymie — wszystkie testy wizualne na Ekstremalnym'
    ]
  },
  {
    id: 'fire-explosion',
    type: 'fire',
    name: 'Eksplozja (dynamit, gaz)',
    description: 'Wybuch w bliskiej odległości',
    damagePerRound: '4d6',
    testToAvoid: 'DEX',
    testDifficulty: 'Extreme',
    effectOnFailure: '4d6 obrażeń + odrzucenie na 2d6 metrów + możliwa głuchota (test CON)',
    effectOnSuccess: 'Połowa obrażeń (2d6) + odrzucenie na 1d6 metrów',
    specialRules: ['Zasięg: pełne obrażenia do 3m, połowa do 6m, ćwierć do 10m', 'Głuchota: test CON — porażka = głuchota na 2d6 godzin']
  }
];

// === UTONIĘCIE ===

export const DROWNING_HAZARDS: EnvironmentalHazard[] = [
  {
    id: 'drowning-calm',
    type: 'drowning',
    name: 'Utonięcie (spokojna woda)',
    description: 'Postać nie umie pływać lub jest wyczerpana w spokojnej wodzie',
    damagePerRound: '1d6',
    testToAvoid: 'Pływanie',
    testDifficulty: 'Normal',
    effectOnFailure: 'Postać tonie. Po CON/2 rundach: 1d6 obrażeń/rundę od niedotlenienia. Utrata przytomności po kolejnych CON/4 rundach.',
    effectOnSuccess: 'Utrzymujesz się na powierzchni tę rundę',
    duration: 'Do wyciągnięcia z wody lub śmierci',
    specialRules: [
      'Wstrzymanie oddechu: postać może wstrzymać oddech przez CON/5 rund (zaokrąglone w górę)',
      'Ratowanie tonącego: test Pływania + test STR aby utrzymać tonącego',
      'Ciężki ekwipunek: kara -20% do Pływania za pancerz lub ciężkie przedmioty'
    ]
  },
  {
    id: 'drowning-rough',
    type: 'drowning',
    name: 'Utonięcie (wzburzone morze, rwący nurt)',
    description: 'Walka z prądem lub falami',
    damagePerRound: '1d8',
    testToAvoid: 'Pływanie',
    testDifficulty: 'Hard',
    effectOnFailure: '1d8 obrażeń od fal/skał + ryzyko utonięcia jak wyżej',
    effectOnSuccess: 'Utrzymujesz się, ale nie posuwasz się do przodu',
    specialRules: ['Wyczerpanie: po CON/3 rundach pływania — testy stają się Trudne']
  }
];

// === UPADEK ===

export const FALLING_HAZARDS: EnvironmentalHazard[] = [
  {
    id: 'fall-short',
    type: 'falling',
    name: 'Upadek z niewielkiej wysokości (do 3m)',
    description: 'Upadek z pierwszego piętra, drzewa, ogrodzenia',
    damagePerRound: '1d6',
    testToAvoid: 'DEX',
    testDifficulty: 'Normal',
    effectOnFailure: '1d6 obrażeń. Możliwe skręcenie (test Szczęścia — porażka = -10% do ZR na 1d6 dni)',
    effectOnSuccess: 'Lądujesz bezpiecznie — brak obrażeń',
  },
  {
    id: 'fall-medium',
    type: 'falling',
    name: 'Upadek z wysokości (3-10m)',
    description: 'Upadek z drugiego/trzeciego piętra, klifu',
    damagePerRound: '2d6',
    testToAvoid: 'DEX',
    testDifficulty: 'Hard',
    effectOnFailure: '1d6 obrażeń za każde 3 metry. Major Wound: test CON lub utrata przytomności.',
    effectOnSuccess: 'Połowa obrażeń — kontrolowany upadek',
    specialRules: ['Regula: 1d6 obrażeń za każde pełne 3 metry spadania']
  },
  {
    id: 'fall-high',
    type: 'falling',
    name: 'Upadek z dużej wysokości (10m+)',
    description: 'Upadek z dachu, wieży, klifu',
    damagePerRound: '1d6 za każde 3m',
    effectOnFailure: '1d6 za każde 3m (max 10d6 = 30m). Powyżej 30m = automatyczna śmierć. Major Wound pewny.',
    effectOnSuccess: 'Brak — upadek z tej wysokości nie pozwala na test unikowy',
    specialRules: [
      'Lądowanie w wodzie: zmniejsz obrażenia o połowę (do 15m). Powyżej 15m do wody = pełne obrażenia.',
      'Lądowanie na miękkim (siano, śnieg): zmniejsz o 1d6'
    ]
  }
];

// === TRUCIZNY ===

export interface Poison {
  id: string;
  name: string;
  type: 'injected' | 'ingested' | 'contact' | 'inhaled';
  potency: number;              // wartość potency — ofiara testuje CON vs potency
  onset: string;                // czas działania
  damage: string;               // efekt na porażkę testu CON
  partialEffect?: string;       // efekt na sukces testu CON
  cure?: string;
}

export const POISONS: Poison[] = [
  {
    id: 'arsenic',
    name: 'Arszenik',
    type: 'ingested',
    potency: 80,
    onset: '1-2 godziny',
    damage: '2d10 obrażeń + wymioty, konwulsje. Bez leczenia: śmierć w 1d4 dni.',
    partialEffect: '1d10 obrażeń + ciężka choroba na 1d6 dni',
    cure: 'Płukanie żołądka w ciągu 30 minut. Później: leczenie objawowe (Medycyna Trudna).'
  },
  {
    id: 'cyanide',
    name: 'Cyjanek',
    type: 'ingested',
    potency: 95,
    onset: '1-5 minut',
    damage: 'Śmierć w ciągu 1d6 minut. Bez testu.',
    partialEffect: '3d10 obrażeń + konwulsje, utrata przytomności',
    cure: 'Antidotum (tiosiarczan sodu) w ciągu 2 minut. Później: za późno.'
  },
  {
    id: 'chloroform',
    name: 'Chloroform',
    type: 'inhaled',
    potency: 70,
    onset: '1-3 rundy',
    damage: 'Utrata przytomności na 1d6 × 10 minut. Przedawkowanie (>3 rundy ekspozycji): 1d10 obrażeń.',
    partialEffect: 'Zawroty głowy, -40% do wszystkich testów na 1d6 rund',
    cure: 'Świeże powietrze. Ofiara budzi się naturalnie.'
  },
  {
    id: 'snake-venom',
    name: 'Jad węża',
    type: 'injected',
    potency: 60,
    onset: '1d6 × 10 minut',
    damage: '2d6 obrażeń + obrzęk, ból, możliwa martwica tkanek',
    partialEffect: '1d6 obrażeń + ból i obrzęk na 1d6 dni',
    cure: 'Surowica antyjadowa (Medycyna Normalna) + unieruchomienie kończyny.'
  },
  {
    id: 'curare',
    name: 'Kurara',
    type: 'injected',
    potency: 85,
    onset: '1-3 rundy',
    damage: 'Paraliż postępujący. Bez leczenia: paraliż mięśni oddechowych = śmierć w 1d6 × 10 minut.',
    partialEffect: 'Paraliż kończyny trafionej na 2d6 godzin',
    cure: 'Sztuczne oddychanie do ustąpienia efektu (1-2 godziny). Medycyna Trudna.'
  },
  {
    id: 'mi-go-mist',
    name: 'Mgła Mi-Go',
    type: 'inhaled',
    potency: 75,
    onset: 'Natychmiastowy',
    damage: 'Utrata przytomności na 1d6 godzin. Przebudzenie z amnezją (1d6 godzin wspomnień straconych).',
    partialEffect: 'Oszołomienie na 1d6 rund, -30% do wszystkich akcji',
    cure: 'Brak znanego antidotum. Amnezja jest permanentna.'
  }
];

// === CHOROBY ===

export interface Disease {
  id: string;
  name: string;
  contagion: string;            // sposób zarażenia
  incubation: string;           // czas inkubacji
  conTest: number;              // wartość testu CON do odparcia
  symptoms: string;
  progression: string;          // co się dzieje bez leczenia
  treatment: string;
}

export const DISEASES: Disease[] = [
  {
    id: 'typhoid',
    name: 'Dur brzuszny (Typhoid)',
    contagion: 'Skażona woda lub jedzenie',
    incubation: '1-2 tygodnie',
    conTest: 50,
    symptoms: 'Gorączka, ból głowy, biegunka, wysypka różowa na brzuchu',
    progression: 'Bez leczenia: -1 CON/dzień. Przy CON 0 = śmierć. Trwa 3-4 tygodnie.',
    treatment: 'Medycyna (Normalna) + odpoczynek + nawodnienie. Szpital zwiększa szanse przeżycia.'
  },
  {
    id: 'pneumonia',
    name: 'Zapalenie płuc',
    contagion: 'Ekspozycja na zimno/wilgoć + osłabiony organizm',
    incubation: '2-5 dni',
    conTest: 60,
    symptoms: 'Kaszel, gorączka, duszność, ból w klatce piersiowej',
    progression: 'Bez leczenia: -1 CON/2 dni. Przy CON ≤ 20 = ryzyko śmierci (test CON/tydzień).',
    treatment: 'Medycyna (Normalna) + ciepło + odpoczynek. Penicylina (po 1928) = automatyczne wyleczenie w 1-2 tygodnie.'
  },
  {
    id: 'gangrene',
    name: 'Gangrena',
    contagion: 'Nieleczona rana otwarta',
    incubation: '3-7 dni',
    conTest: 40,
    symptoms: 'Obrzęk, zmiana koloru skóry na czarny/zielony, cuchnący ropień, gorączka',
    progression: 'Bez amputacji: -2 CON/dzień. Sepsa = śmierć w 1d6 dni.',
    treatment: 'Amputacja (Medycyna Trudna) lub intensywne leczenie antyseptyczne (Medycyna Ekstremalna).'
  },
  {
    id: 'mythos-taint',
    name: 'Skażenie Mityczne',
    contagion: 'Kontakt z substancją Mitów (śluz Shoggotha, krew Głębinowego)',
    incubation: '1d6 dni',
    conTest: 30,
    symptoms: 'Zmiana pigmentacji skóry, dziwne sny, przyciąganie uwagi istot Mitów',
    progression: 'Bez leczenia: powolna transformacja fizyczna (1 punkt APP/tydzień). Nieodwracalne po 4 tygodniach.',
    treatment: 'Znak Starszych + Medycyna (Ekstremalna). Sukces zatrzymuje transformację, ale nie cofa zmian.'
  }
];

// === EKSPOZYCJA NA ŻYWIOŁY ===

export const EXPOSURE_HAZARDS: EnvironmentalHazard[] = [
  {
    id: 'cold-mild',
    type: 'exposure',
    name: 'Zimno (0°C do -10°C)',
    description: 'Ekspozycja na mróz bez odpowiedniego ubrania',
    damagePerRound: '1 HP/godzinę',
    testToAvoid: 'CON',
    testDifficulty: 'Normal',
    effectOnFailure: '1 HP/godzinę + hipotermia: -10% do ZR i INT co godzinę',
    effectOnSuccess: 'Brak obrażeń tę godzinę',
    specialRules: ['Odpowiednie ubranie: brak testów do -20°C', 'Mokre ubranie: testy co 30 minut zamiast co godzinę']
  },
  {
    id: 'cold-extreme',
    type: 'exposure',
    name: 'Ekstremalny mróz (poniżej -20°C)',
    description: 'Arktyczne warunki — Antarktyda, góry, tundra',
    damagePerRound: '1d4 HP/godzinę',
    testToAvoid: 'CON',
    testDifficulty: 'Hard',
    effectOnFailure: '1d4 HP/godzinę + odmrożenia (permanentna utrata 1d4 APP)',
    effectOnSuccess: '1 HP/godzinę mimo sukcesu',
    specialRules: ['Odmrożenia zaczynają się po 1d6 godzinach bez ciepła', 'Hipotermia: utrata przytomności przy HP ≤ 3']
  },
  {
    id: 'heat-exhaustion',
    type: 'exposure',
    name: 'Uderzenie cieplne (40°C+)',
    description: 'Pustynny upał lub zamknięte pomieszczenie bez wentylacji',
    damagePerRound: '1 HP/godzinę',
    testToAvoid: 'CON',
    testDifficulty: 'Normal',
    effectOnFailure: '1 HP/godzinę + odwodnienie: -20% do wszystkich testów. Przy HP ≤ 5 = utrata przytomności.',
    effectOnSuccess: 'Odwodnienie, ale brak obrażeń',
    specialRules: ['Woda: 1 litr/godzinę zapobiega obrażeniom', 'Bez wody: testy co 30 minut zamiast co godzinę']
  }
];

// === ELEKTRYCZNOŚĆ ===

export const ELECTRICITY_HAZARDS: EnvironmentalHazard[] = [
  {
    id: 'shock-minor',
    type: 'electricity',
    name: 'Porażenie prądem (domowe 110-220V)',
    description: 'Kontakt z wadliwym okablowaniem lub urządzeniem',
    damagePerRound: '1d6',
    testToAvoid: 'DEX',
    testDifficulty: 'Normal',
    effectOnFailure: '1d6 obrażeń + skurcz mięśni (nie może puścić źródła przez 1d4 rund)',
    effectOnSuccess: 'Cofasz rękę — 1 HP obrażeń od oparzenia',
    specialRules: ['Mokre ręce/podłoga: obrażenia × 2', 'Uwolnienie: test STR (Trudny) lub ktoś odłączy prąd']
  },
  {
    id: 'shock-major',
    type: 'electricity',
    name: 'Porażenie wysokim napięciem (1000V+)',
    description: 'Kontakt z linią energetyczną, transformatorem, piorunem',
    damagePerRound: '3d10',
    testToAvoid: 'Szczęście',
    testDifficulty: 'Hard',
    effectOnFailure: '3d10 obrażeń + zatrzymanie akcji serca (Medycyna Trudna w ciągu 3 rund lub śmierć)',
    effectOnSuccess: '1d10 obrażeń + odrzucenie na 1d6 metrów',
    specialRules: ['Piorun: 3d10 obrażeń, test Szczęścia czy trafi', 'Poparzenia: permanentna utrata 1d6 APP']
  }
];

// === HELPER: Resolve poison test ===

export function resolvePoisonTest(con: number, poison: Poison): {
  roll: number;
  passed: boolean;
  effect: string;
} {
  const roll = Math.floor(Math.random() * 100) + 1;
  const passed = roll <= con;

  return {
    roll,
    passed,
    effect: passed
      ? (poison.partialEffect || 'Organizm odparł truciznę — brak efektu.')
      : poison.damage
  };
}

// === HELPER: Resolve disease test ===

export function resolveDiseaseTest(con: number, disease: Disease): {
  roll: number;
  infected: boolean;
  description: string;
} {
  const roll = Math.floor(Math.random() * 100) + 1;
  const infected = roll > con;

  return {
    roll,
    infected,
    description: infected
      ? `Zarażenie! ${disease.symptoms}. ${disease.progression}`
      : `Organizm odparł ${disease.name}. Brak objawów.`
  };
}
