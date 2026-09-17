import type { SpellDefinition, TomeDefinition, CatastropheEffect } from './types';

/**
 * Kanoniczny katalog oficjalnych zaklęć CoC 7e RAW oraz z Wielkiego Grymuaru.
 * Każdy rekord zawiera dokładny odnośnik do podręcznika, diegetyczne nazwy,
 * jawne koszty PM/SAN/POW/HP oraz czas rzucania.
 */
export const CANONICAL_SPELLS: Record<string, SpellDefinition> = {
  'wither-limb': {
    id: 'wither-limb',
    name: 'Uschnięcie Kończyny',
    namePl: 'Uschnięcie Kończyny',
    nameEn: 'Wither Limb',
    diegeticNames: {
      pl: ['Pieśń Bólu', 'Czar Czarnej Zgnilizny', 'Klątwa Uschnięcia', 'Uwiąd Kończyny'],
      en: ['Song of Pain', 'Black Rot Hex', 'Curse of Withered Flesh'],
    },
    category: 'combat',
    mpCost: 8,
    sanCost: '1k6',
    castingTime: {
      type: 'rounds',
      rounds: 1,
      value: { pl: '1 runda', en: '1 round' },
    },
    range: { pl: '10 metrów (wzrok)', en: '10 yards (sight)' },
    duration: { pl: 'Trwały (wymaga leczenia szpitalnego)', en: 'Permanent (requires hospital care)' },
    opposedRoll: 'pow',
    deeperMagic: {
      name: { pl: 'Całkowite Uschnięcie Ciała', en: 'Complete Corporeal Wither' },
      description: {
        pl: 'Pozwala objąć klątwą dwie kończyny naraz lub wywołać natychmiastową martwicę tkanek.',
        en: 'Affects two limbs simultaneously or induces immediate gangrenous necrosis.',
      },
      costMultiplier: 2,
      effectMod: { pl: 'Podwójny zasięg i uschnięcie 2 kończyn', en: 'Double range and 2 limbs withered' },
    },
    description: {
      pl: 'Powoduje natychmiastowe uschnięcie, skurczenie i bezużyteczność ramienia lub nogi ofiary.',
      en: 'Causes a chosen arm or leg of the target to instantly wither, shrivel, and become useless.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 278,
      pagePl: 278,
      pageEn: 268,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'elder-sign': {
    id: 'elder-sign',
    name: 'Znak Starszych Bogów',
    namePl: 'Znak Starszych Bogów',
    nameEn: 'Elder Sign',
    diegeticNames: {
      pl: ['Znak Gałęzi', 'Święta Pieczęć Ochronna', 'Pentagram Gwiazdy'],
      en: ['Branch Sigil', 'Sacred Ward', 'Star Pentagram'],
    },
    category: 'protective',
    mpCost: 0,
    sanCost: 0,
    powCost: 10, // TRWAŁA utrata POW zgodnie z RAW!
    castingTime: {
      type: 'hours',
      hours: 1,
      value: { pl: '1 godzina rytuału', en: '1 hour ritual' },
    },
    range: { pl: 'Dotyk (ryty w kamieniu, metalu lub ołowiu)', en: 'Touch (carved in stone, lead, or metal)' },
    duration: { pl: 'Dopóki znak nie zostanie zniszczony fizycznie', en: 'Permanent until physically broken' },
    requirements: {
      components: {
        pl: ['Rylec z czystego ołowiu lub żelaza', 'Krew rzucającego'],
        en: ['Pure lead or iron stylus', 'Caster blood'],
      },
    },
    description: {
      pl: 'Potężna pieczęć ochronna odstraszająca sługi Wielkich Przedwiecznych i Zewnętrznych Bogów.',
      en: 'A powerful defensive sigil that blocks and deters minions of Great Old Ones and Outer Gods.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 295,
      pagePl: 295,
      pageEn: 268,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'flesh-ward': {
    id: 'flesh-ward',
    name: 'Ochrona Ciała',
    namePl: 'Ochrona Ciała',
    nameEn: 'Flesh Ward',
    diegeticNames: {
      pl: ['Pancerz Kości', 'Żelazna Skóra', 'Płaszcz Nieczułości', 'Tarcza z Ciała'],
      en: ['Armor of Bone', 'Iron Flesh', 'Mantle of Callousness'],
    },
    category: 'protective',
    mpCost: 'zmienne (każdy 1 PM = 1k6 pancerza)',
    sanCost: '1k4',
    castingTime: {
      type: 'minutes',
      value: { pl: '5 rund (około 1 minuta)', en: '5 rounds (approx. 1 minute)' },
    },
    range: { pl: 'Rzucający lub dotknięty sojusznik', en: 'Caster or touched ally' },
    duration: { pl: '24 godziny lub do wyczerpania punktów pancerza', en: '24 hours or until armor pool is exhausted' },
    description: {
      pl: 'Wzmacnia tkanki rzucającego, pochłaniając obrażenia fizyczne (każdy wydany 1 PM daje 1K6 punktów pancerza).',
      en: 'Toughens the target flesh to absorb non-magical kinetic damage (each 1 MP grants 1d6 armor).',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 272,
      pagePl: 272,
      pageEn: 262,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'dominate': {
    id: 'dominate',
    name: 'Dominacja',
    namePl: 'Dominacja',
    nameEn: 'Dominate',
    diegeticNames: {
      pl: ['Rozkaz Woli', 'Związanie Umysłu', 'Hipnoza Cienia', 'Zdominowanie'],
      en: ['Command of Will', 'Mind Binding', 'Shadow Hypnosis'],
    },
    category: 'influence',
    mpCost: 1,
    sanCost: 1,
    castingTime: {
      type: 'instantaneous',
      dexBonus: 50,
      value: { pl: 'Natychmiastowe (+50 DEX do inicjatywy)', en: 'Instantaneous (+50 DEX to initiative)' },
    },
    range: { pl: '10 metrów (kontakt wzrokowy)', en: '10 yards (eye contact)' },
    duration: { pl: 'Do końca następnej rundy', en: 'Until end of next combat round' },
    opposedRoll: 'pow',
    description: {
      pl: 'Narzuca celowi bezwzględne posłuszeństwo jednemu telepatycznemu rozkazowi rzucającego.',
      en: 'Bends the target will, forcing obedience to a single telepathic command of the caster.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 271,
      pagePl: 271,
      pageEn: 250,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'contact-deep-ones': {
    id: 'contact-deep-ones',
    name: 'Nawiązanie Kontaktu z Istotą z Głębin',
    namePl: 'Nawiązanie Kontaktu z Istotą z Głębin',
    nameEn: 'Contact Deep One',
    diegeticNames: {
      pl: ['Modlitwa do Morza', 'Zew z Otchłani Dagonowej', 'Pieśń Rafy', 'Nawiązanie Kontaktu z Istotami z Głębin'],
      en: ['Prayer to the Sea', 'Call of Dagon Abyssal', 'Song of the Reef'],
    },
    category: 'contact',
    mpCost: 3,
    sanCost: 0,
    castingTime: {
      type: 'hours',
      hours: 1,
      value: { pl: '1 godzina inkantacji nad wodą', en: '1 hour chanting over ocean water' },
    },
    range: { pl: 'Wybrzeże oceanu lub głęboka zatoka', en: 'Ocean coast or deep inlet' },
    duration: { pl: 'Do przybycia istoty (1k6 godzin)', en: 'Until entity arrives (1d6 hours)' },
    requirements: {
      location: { pl: 'Słona woda morska, noc', en: 'Salt seawater, nighttime' },
      components: {
        pl: ['Kawałek surowego złota z Innsmouth lub kamień z dna morza'],
        en: ['Raw Innsmouth gold or deep sea stone'],
      },
    },
    description: {
      pl: 'Przywołuje jedną Istotę z Głębin ku brzegowi w celu pertraktacji lub wymiany darów.',
      en: 'Summons a Deep One to the water edge to parley or trade.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 286,
      pagePl: 286,
      pageEn: 256,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'shriveling': {
    id: 'shriveling',
    name: 'Uschnięcie',
    namePl: 'Uschnięcie',
    nameEn: 'Shriveling',
    diegeticNames: {
      pl: ['Czarny Płomień', 'Spalenie Trzewi', 'Klątwa Ogniem Cienia', 'Spopielenie'],
      en: ['Black Flame', 'Visceral Incineration', 'Shadow Fire Curse'],
    },
    category: 'combat',
    mpCost: 'zmienne (od 1 do 6 PM; 1 PM = 1k6 obrażeń)',
    sanCost: '1k4',
    castingTime: {
      type: 'instantaneous',
      dexBonus: 50,
      value: { pl: 'Natychmiastowe (+50 DEX do inicjatywy)', en: 'Instantaneous (+50 DEX to initiative)' },
    },
    range: { pl: 'Dotyk lub do 15 metrów', en: 'Touch or up to 15 yards' },
    duration: { pl: 'Natychmiastowy', en: 'Instantaneous' },
    opposedRoll: 'pow',
    description: {
      pl: 'Niszczycielski atak psychokinetyczny, który pali i zwęgla żywe ciało od środka.',
      en: 'A devastating blast of eldritch force that chars, blackens, and scorches living flesh.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 278,
      pagePl: 278,
      pageEn: 266,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'voorish-sign': {
    id: 'voorish-sign',
    name: 'Znak Voorycki',
    namePl: 'Znak Voorycki',
    nameEn: 'Voorish Sign',
    diegeticNames: {
      pl: ['Gest Przeniknięcia Zasłony', 'Ręka Przejrzenia', 'Znak Voorish'],
      en: ['Gesture of the Veil', 'Sight Unbound Hand'],
    },
    category: 'folk',
    mpCost: 1,
    sanCost: 1,
    castingTime: {
      type: 'rounds',
      rounds: 1,
      value: { pl: '1 runda (szybki gest dłoni)', en: '1 round (rapid hand gesture)' },
    },
    range: { pl: 'Rzucający', en: 'Caster' },
    duration: { pl: '1k4 rund lub do rzucenia kolejnego zaklęcia', en: '1d4 rounds or until next spell cast' },
    description: {
      pl: 'Rytualny gest dłoni czyniący niewidzialne byty widocznymi oraz ułatwiający inkantację magii.',
      en: 'An ancient hand sign that reveals invisible entities and aids subsequent spellcasting.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 295,
      pagePl: 295,
      pageEn: 269,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'cloud-memory': {
    id: 'cloud-memory',
    name: 'Zmącenie Pamięci',
    namePl: 'Zmącenie Pamięci',
    nameEn: 'Cloud Memory',
    diegeticNames: {
      pl: ['Kradzież Wspomnienia', 'Mgła Zapomnienia', 'Zasłona Niepamięci', 'Zamglenie Pamięci'],
      en: ['Theft of Recollection', 'Fog of Forgetting', 'Veil of Amnesia'],
    },
    category: 'influence',
    mpCost: '1k6',
    sanCost: '1k2',
    castingTime: {
      type: 'instantaneous',
      value: { pl: 'Natychmiastowe', en: 'Instantaneous' },
    },
    range: { pl: 'Wzrok (rozmowa z celem)', en: 'Sight (conversing with target)' },
    duration: { pl: 'Trwały (dopóki coś nie wywoła skojarzenia)', en: 'Permanent unless strongly triggered' },
    opposedRoll: 'pow',
    description: {
      pl: 'Pozwala zatrzeć w pamięci ofiary konkretne, niedawne wydarzenie lub spotkanie z Mitami.',
      en: 'Blots out a specific recent event or mythos encounter from the target memory.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 295,
      pagePl: 295,
      pageEn: 248,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'resurrection': {
    id: 'resurrection',
    name: 'Wskrzeszenie',
    namePl: 'Wskrzeszenie',
    nameEn: 'Resurrection',
    diegeticNames: {
      pl: ['Zgromadzenie Prochów Umarłego', 'Odwołanie Śmierci z Soli Istotnych'],
      en: ['Assembly of Essential Salts', 'Undoing Death'],
    },
    category: 'other',
    mpCost: 3,
    sanCost: '1k10',
    castingTime: {
      type: 'rounds',
      rounds: 2,
      value: { pl: '1 lub 2 rundy', en: '1 or 2 rounds' },
    },
    range: { pl: 'Dotyk naczynia', en: 'Touch of urn' },
    duration: { pl: 'Trwały (chyba że formuła zostanie wypowiedziana wspak)', en: 'Permanent unless reversed' },
    requirements: {
      components: {
        pl: ['Kompletne sole istotne / prochy zmarłego', 'Kadzidła rytualne'],
        en: ['Complete essential salts of deceased', 'Ritual incenses'],
      },
    },
    description: {
      pl: 'Odtwarza żywe ciało i duszę zmarłego z jego soli istotnych. Odwrócenie słów zamienia istotę w proch.',
      en: 'Reassembles the deceased body and soul from essential salts. Reversing chant decomposes entity.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 279,
      pagePl: 279,
      pageEn: 265,
      language: 'pl',
    },
    definitionVersion: 2,
  },
};

/**
 * Kanoniczny katalog tomisk Mitów z Księgi Strażnika CoC 7e RAW (Rozdział 11).
 */
export const CANONICAL_TOMES: Record<string, TomeDefinition> = {
  'necronomicon-latin': {
    id: 'necronomicon-latin',
    title: 'Necronomicon (Wydanie łacińskie Olausa Wormiusa, 1228)',
    titlePl: 'Necronomicon (Łacina, 1228)',
    titleEn: 'Necronomicon (Latin, 1228)',
    author: 'Abdul Alhazred (tłum. Olaus Wormius)',
    language: 'Łacina',
    languageDifficulty: 'regular',
    initialReading: {
      hours: 66,
      sanCost: '2k10',
      cmi: 5,
    },
    fullStudy: {
      weeks: 66,
      sanCost: '2k10',
      cmf: 11,
      mr: 48,
    },
    spells: [
      'wither-limb',
      'elder-sign',
      'dominate',
      'contact-deep-ones',
      'shriveling',
      'resurrection',
    ],
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 262,
      pagePl: 262,
      pageEn: 227,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'book-of-eibon-english': {
    id: 'book-of-eibon-english',
    title: 'Księga Eibona (Tłumaczenie angielskie, ok. XV w.)',
    titlePl: 'Księga Eibona (Angielski, ok. XV w.)',
    titleEn: 'Book of Eibon (English, c. 15th century)',
    author: 'Eibon z Hyperborei',
    language: 'Angielski',
    languageDifficulty: 'hard', // archaiczna, zniekształcona angielszczyzna
    initialReading: {
      hours: 32,
      sanCost: '2k4',
      cmi: 3,
    },
    fullStudy: {
      weeks: 32,
      sanCost: '2k4',
      cmf: 8,
      mr: 33,
    },
    spells: ['wither-limb', 'flesh-ward', 'voorish-sign', 'cloud-memory'],
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 262,
      pagePl: 262,
      pageEn: 226,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'de-vermis-mysteris': {
    id: 'de-vermis-mysteris',
    title: 'De Vermis Mysteriis (O Tajemnicach Czerwia, 1542)',
    titlePl: 'De Vermis Mysteriis (Łacina, 1542)',
    titleEn: 'De Vermis Mysteriis (Latin, 1542)',
    author: 'Ludvig Prinn',
    language: 'Łacina',
    languageDifficulty: 'regular',
    initialReading: {
      hours: 48,
      sanCost: '2k6',
      cmi: 4,
    },
    fullStudy: {
      weeks: 48,
      sanCost: '2k6',
      cmf: 8,
      mr: 36,
    },
    spells: ['shriveling', 'dominate', 'resurrection'],
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 261,
      pagePl: 261,
      pageEn: 228,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'cultes-des-goules': {
    id: 'cultes-des-goules',
    title: 'Cultes des Goules (Kulty Ghuli, 1702)',
    titlePl: 'Cultes des Goules (Francuski, 1702)',
    titleEn: 'Cultes des Goules (French, 1702)',
    author: 'François-Honoré Balfour, hrabia d’Erlette',
    language: 'Francuski',
    languageDifficulty: 'regular',
    initialReading: {
      hours: 22,
      sanCost: '1k10',
      cmi: 4,
    },
    fullStudy: {
      weeks: 22,
      sanCost: '1k10',
      cmf: 8,
      mr: 36,
    },
    spells: ['resurrection', 'cloud-memory', 'flesh-ward'],
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 261,
      pagePl: 261,
      pageEn: 228,
      language: 'pl',
    },
    definitionVersion: 2,
  },

  'unaussprechlichen-kulten': {
    id: 'unaussprechlichen-kulten',
    title: 'Unaussprechlichen Kulten (Bezbrzmienne Kulty, 1839)',
    titlePl: 'Unaussprechlichen Kulten (Niemiecki, 1839)',
    titleEn: 'Unaussprechlichen Kulten (German, 1839)',
    author: 'Friedrich Wilhelm von Junzt',
    language: 'Niemiecki',
    languageDifficulty: 'regular',
    initialReading: {
      hours: 52,
      sanCost: '2k8',
      cmi: 5,
    },
    fullStudy: {
      weeks: 52,
      sanCost: '2k8',
      cmf: 10,
      mr: 45,
    },
    spells: ['contact-deep-ones', 'elder-sign', 'wither-limb'],
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 262,
      pagePl: 262,
      pageEn: 231,
      language: 'pl',
    },
    definitionVersion: 2,
  },
};

/**
 * Tabela pomniejszych anomalii i rykoszetów mistycznych (proceduralny silnik magii d100).
 */
export const CATASTROPHE_TABLE_MINOR: CatastropheEffect[] = [
  {
    id: 1,
    tier: 'minor',
    name: { pl: 'Załamanie percepcji i rozmycie wzroku', en: 'Sensory refraction and blurred vision' },
    description: { pl: 'Światło wokół zakrzywia się pod nienaturalnym kątem, wywołując mdłości i ostry spadek ostrości wzroku.', en: 'Surrounding light refracts unnaturally, triggering nausea and acute loss of visual clarity.' },
    mechanicalEffect: { pl: 'Kość karna do testów Spostrzegawczości i Strzelectwa przez 1K6 rund', en: 'Penalty die to Spot Hidden and Firearms checks for 1d6 rounds' },
  },
  {
    id: 2,
    tier: 'minor',
    name: { pl: 'Rezonans soniczny i głosy z eteru', en: 'Sonic resonance and spectral whispers' },
    description: { pl: 'W uszach rzucającego i świadków rozbrzmiewa przeszywający pisk zniekształconych, obcych szeptów.', en: 'A piercing cacophony of distorted, alien whispers reverberates in the ears of the caster and bystanders.' },
    mechanicalEffect: { pl: 'Trudność testów opartych na słuchu i skupieniu wzrasta o jeden poziom', en: 'Hearing and concentration checks difficulty increased by one step' },
  },
  {
    id: 3,
    tier: 'minor',
    name: { pl: 'Termiczna anomalia i lodowaty szkwał', en: 'Thermal anomaly and freezing squall' },
    description: { pl: 'Gwałtowny spadek temperatury mrozi powietrze, gasi pochodnie i świece oraz przewraca luźne przedmioty.', en: 'A sudden thermal plunge freezes the air, extinguishes candles and lanterns, and scatters loose gear.' },
    mechanicalEffect: { pl: 'Ugaszenie otwartego ognia, drżenie rąk i chaos w otoczeniu', en: 'Extinguishes flames, induces shivering, and creates spatial disorder' },
  },
  {
    id: 4,
    tier: 'minor',
    name: { pl: 'Eksudacja hematyczna ścian i podłoża', en: 'Hematic seepage from walls and ground' },
    description: { pl: 'Ze ścian, podłogi oraz porów skóry czarownika zaczyna powoli sączyć się gęsta, ciemna ciecz.', en: 'Thick, dark hematic fluid slowly weeps from walls, floorboards, and the caster pores.' },
    mechanicalEffect: { pl: 'Dodatkowa utrata 1 SAN u wszystkich świadków zjawiska', en: 'Additional 1 SAN loss for all witnesses to the phenomenon' },
  },
  {
    id: 5,
    tier: 'minor',
    name: { pl: 'Geometryczne załamanie przestrzeni', en: 'Non-Euclidean spatial warping' },
    description: { pl: 'Perspektywa pokoju wykrzywia się w niemożliwy sześcian, uniemożliwiając ocenę odległości.', en: 'Room perspective warps into an impossible polyhedron, disorienting spatial judgment.' },
    mechanicalEffect: { pl: 'Dezorientacja przestrzenna na 1 rundę walki', en: 'Spatial disorientation for 1 combat round' },
  },
  {
    id: 6,
    tier: 'minor',
    name: { pl: 'Mikroimplozja kruchych materiałów', en: 'Micro-implosion of brittle objects' },
    description: { pl: 'Kieliszki, lustra, żarówki lub drobne szklane naczynia pękają jednocześnie z cichym trzaskiem.', en: 'Glassware, mirrors, or small brittle vessels shatter simultaneously with a sharp crack.' },
    mechanicalEffect: { pl: 'Test Poczytalności (utrata 0/1K2 SAN)', en: 'Sanity roll (0/1d2 SAN loss)' },
  },
  {
    id: 7,
    tier: 'minor',
    name: { pl: 'Gryzący obłok zjonizowanego ozonu', en: 'Choking ionized ozone cloud' },
    description: { pl: 'Przestrzeń wypełnia duszący, chemiczny zapach spalonego eteru i siarki drażniący drogi oddechowe.', en: 'A choking chemical stench of burnt ether and brimstone irritates respiratory tracts.' },
    mechanicalEffect: { pl: 'Test Budowy Ciała (CON), porażka wywołuje kaszel i mdłości', en: 'Constitution (CON) check, failure causes coughing and nausea' },
  },
  {
    id: 8,
    tier: 'minor',
    name: { pl: 'Spontaniczna szczelina cienia', en: 'Spontaneous shadow rift' },
    description: { pl: 'Pęknięcie w barierze wymiarowej uwalnia drapieżny cień lub zjawę czatującą na granicy percepcji.', en: 'A rupture in the dimensional barrier unleashes a predatory shadow entity stalking the threshold.' },
    mechanicalEffect: { pl: 'Pojawienie się wrogiego bytu z wymiaru pośredniego (np. Byt z Cienia)', en: 'Hostile entity from interstitial dimension manifests (e.g. Shadow Stalker)' },
  },
];

/**
 * Tabela potężnych katastrof metafizycznych (proceduralny silnik magii d100).
 */
export const CATASTROPHE_TABLE_MAJOR: CatastropheEffect[] = [
  {
    id: 1,
    tier: 'major',
    name: { pl: 'Lokalne pęknięcie tektoniczne', en: 'Localized tectonic fracture' },
    description: { pl: 'Podłoże faluje i pęka, fundamenty jęczą pod naporem sił, a z sufitu sypie się lawina gruzu.', en: 'Floor heaves and cracks, structural foundations groan, and debris cascades from above.' },
    mechanicalEffect: { pl: 'Test Zręczności (DEX) przeciwko upadkowi lub 2K6 obrażeń od walącego się stropu', en: 'Dexterity check to avoid falling or 2d6 falling debris damage' },
  },
  {
    id: 2,
    tier: 'major',
    name: { pl: 'Gwałtowne wyładowanie plazmatyczne', en: 'Violent plasmatic discharge' },
    description: { pl: 'Rozbłysk szmaragdowej lub błękitnej energii uderza wprost w epicentrum rzucanego czaru.', en: 'A searing burst of emerald or azure energy strikes the ritual epicenter.' },
    mechanicalEffect: { pl: 'Porażenie energią o wartości 3K6 w promieniu 10 metrów', en: '3d6 electrical/energy damage within 10 yards' },
  },
  {
    id: 3,
    tier: 'major',
    name: { pl: 'Opady szkarłatnego kondensatu', en: 'Precipitation of crimson condensate' },
    description: { pl: 'Z sufitu lub nieba spada gęsty, lepki opad organicznej posoki, pokrywający całe otoczenie.', en: 'Thick, foul organic gore showers down from above, soaking the entire perimeter.' },
    mechanicalEffect: { pl: 'Utrata 1/1K6 SAN u wszystkich świadków zjawiska', en: '1/1d6 SAN loss for all witnesses' },
  },
  {
    id: 4,
    tier: 'major',
    name: { pl: 'Zwapnienie lub zwęglenie tkanek rzucającego', en: 'Calcification and burning of caster tissue' },
    description: { pl: 'Fala powrotna wypala nerwy i tkanki dłoni czarownika, zamieniając je w popiół lub kamień.', en: 'Mystic backfire scorches nerve and muscle in the caster hand, reducing it to ash or stone.' },
    mechanicalEffect: { pl: 'Trwałe okaleczenie dłoni, utrata 1K6 PW i test na Ciężką Ranę', en: 'Permanent hand injury, 1d6 HP loss and Major Wound check' },
  },
  {
    id: 5,
    tier: 'major',
    name: { pl: 'Chronosferyczny drenaż wieku (+2K10 lat)', en: 'Chronospheric aging drain (+2d10 years)' },
    description: { pl: 'Ucieczka entropii wysysa dekady życia czarownika – włosy siwieją, a skóra gwałtownie marszczy się w parę sekund.', en: 'Entropic backwash leeches decades of vitality; hair greys and skin wrinkles in seconds.' },
    mechanicalEffect: { pl: 'Fizyczne postarzenie o +2K10 lat i obniżenie cech fizycznych (STR, CON, DEX po -5 na dekadę)', en: 'Aging +2d10 years and physical attribute reduction (STR, CON, DEX -5 per decade)' },
  },
  {
    id: 6,
    tier: 'major',
    name: { pl: 'Przełamanie kordonu ochronnego przez drapieżne byty', en: 'Breach of warding perimeter by predatory horrors' },
    description: { pl: 'Rozbita zapora mistyczna uwalnia wygłodniałe istoty z pustki, które natychmiast rzucają się na obecnych.', en: 'Shattered protective barrier unleashes starving void predators attacking everyone in sight.' },
    mechanicalEffect: { pl: 'Natychmiastowe rozpoczęcie walki o przetrwanie przeciw wrogiej manifestacji', en: 'Immediate survival combat initiated against hostile manifestations' },
  },
  {
    id: 7,
    tier: 'major',
    name: { pl: 'Zapadlisko temporalno-przestrzenne', en: 'Spatiotemporal sinkhole' },
    description: { pl: 'Wir grawitacyjny wsysa czarownika lub świadków, wyrzucając ich w odległym, niebezpiecznym miejscu.', en: 'A gravitational vortex sucks in the caster or bystanders, depositing them in a distant, perilous locale.' },
    mechanicalEffect: { pl: 'Natychmiastowe przemieszczenie w obce miejsce i czas', en: 'Instant displacement across space and time' },
  },
  {
    id: 8,
    tier: 'major',
    name: { pl: 'Zwiastun Obecności Przedwiecznego', en: 'Harbinger of an Ancient Presence' },
    description: { pl: 'Rzeczywistość pęka na wylot, odsłaniając ułamek oka lub macki tytanicznego bóstwa poza czasem.', en: 'Reality fissures open, revealing a fleeting glimpse of an ancient cosmic deity beyond time.' },
    mechanicalEffect: { pl: 'Porażający szok i skrajna utrata Poczytalności (1K10/1K100 SAN)', en: 'Paralyzing horror and catastrophic Sanity loss (1d10/1d100 SAN)' },
  },
];

export function getSpellDefinition(spellId: string): SpellDefinition | undefined {
  return CANONICAL_SPELLS[spellId];
}

export function getTomeDefinition(tomeId: string): TomeDefinition | undefined {
  return CANONICAL_TOMES[tomeId];
}

export function getAllSpells(): SpellDefinition[] {
  return Object.values(CANONICAL_SPELLS);
}

export function getAllTomes(): TomeDefinition[] {
  return Object.values(CANONICAL_TOMES);
}

export function getCatastropheEffect(tier: 'minor' | 'major', roll: number): CatastropheEffect {
  const table = tier === 'major' ? CATASTROPHE_TABLE_MAJOR : CATASTROPHE_TABLE_MINOR;
  const clampedRoll = Math.max(1, Math.min(table.length, roll));
  return table[clampedRoll - 1];
}

/**
 * Szuka zaklęcia po dowolnej diegetycznej lub technicznej nazwie (PL lub EN).
 */
export function findSpellByAnyName(query: string): SpellDefinition | undefined {
  const q = query.trim().toLowerCase();
  for (const spell of Object.values(CANONICAL_SPELLS)) {
    if (spell.id.toLowerCase() === q) return spell;
    if (spell.name.toLowerCase() === q) return spell;
    if (spell.namePl.toLowerCase() === q) return spell;
    if (spell.nameEn.toLowerCase() === q) return spell;
    if (spell.diegeticNames.pl.some(n => n.toLowerCase() === q)) return spell;
    if (spell.diegeticNames.en.some(n => n.toLowerCase() === q)) return spell;
  }
  return undefined;
}

/**
 * Szuka tomu Mitów po dowolnej nazwie, tytule lub autorze (PL lub EN).
 */
export function findTomeByAnyName(query: string): TomeDefinition | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  // 1. Dopasowanie dokładne po ID
  if (CANONICAL_TOMES[q]) return CANONICAL_TOMES[q];

  // 2. Dopasowanie częściowe po ID lub tytułach
  for (const tome of Object.values(CANONICAL_TOMES)) {
    const idLower = tome.id.toLowerCase();
    const titleLower = tome.title.toLowerCase();
    const titlePlLower = tome.titlePl.toLowerCase();
    const titleEnLower = tome.titleEn.toLowerCase();
    const authorLower = tome.author?.toLowerCase() ?? '';

    if (
      idLower === q ||
      idLower.includes(q) ||
      q.includes(idLower) ||
      titleLower.includes(q) ||
      titlePlLower.includes(q) ||
      titleEnLower.includes(q) ||
      (authorLower && authorLower.includes(q))
    ) {
      return tome;
    }
  }

  return undefined;
}
