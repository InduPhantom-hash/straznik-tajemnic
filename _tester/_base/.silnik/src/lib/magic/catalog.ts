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

  'summon-bind-byakhee': {
    id: 'summon-bind-byakhee',
    name: 'Przywołanie / Spętanie Byakhee',
    namePl: 'Przywołanie / Spętanie Byakhee',
    nameEn: 'Summon/Bind Byakhee',
    diegeticNames: {
      pl: ['Gwizd Kosmicznej Pustki', 'Przyzwanie Wierzchowca Gwiazd', 'Przywołanie / Związanie Byakhee'],
      en: ['Whistle of the Void', 'Call Star-Steed'],
    },
    category: 'summon',
    mpCost: 'zmienne (1 punkt PM = +10% do szansy związania)',
    sanCost: '1k4',
    castingTime: {
      type: 'rounds',
      value: { pl: '1 runda na każdy punkt PM', en: '1 round per MP spent' },
    },
    range: { pl: 'Otwarta przestrzeń pod nocnym niebem', en: 'Open outdoors beneath night sky' },
    duration: { pl: 'Do wykonania jednego polecenia lub świtu', en: 'Until one task is fulfilled or sunrise' },
    requirements: {
      conditions: { pl: 'Gwiazda Aldebaran widoczna nad horyzontem', en: 'Aldebaran above horizon' },
      components: { pl: ['Gwizdek z kości ptaka lub człowieka'], en: ['Bone whistle'] },
    },
    opposedRoll: 'pow',
    description: {
      pl: 'Przyzywa z kosmicznej otchłani skrzydlatego Byakhee i zmusza go do posłuszeństwa.',
      en: 'Summons an interstellar Byakhee from the void and attempts to bind its will.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 288,
      pagePl: 288,
      pageEn: 261,
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
      'summon-bind-byakhee',
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
    spells: ['shriveling', 'summon-bind-byakhee', 'dominate', 'resurrection'],
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
 * Oficjalna tabela katastrof pomniejszych CoC 7e RAW (s. 197).
 */
export const CATASTROPHE_TABLE_MINOR: CatastropheEffect[] = [
  {
    id: 1,
    tier: 'minor',
    name: { pl: 'Utrata ostrości widzenia lub tymczasowa ślepota', en: 'Loss of vision sharpness or temporary blindness' },
    description: { pl: 'Wzrok czarownika lub świadków zachodzi mgłą, świat staje się rozmazany i niewyraźny.', en: 'Caster or bystander vision turns hazy, blurring the surrounding world.' },
    mechanicalEffect: { pl: 'Kość karna do testów Percepcji i Strzelectwa przez 1K6 rund', en: 'Penalty die to Perception and Firearms checks for 1d6 rounds' },
  },
  {
    id: 2,
    tier: 'minor',
    name: { pl: 'Słyszenie pozbawionych źródła krzyków i omamy słuchowe', en: 'Sourceless screams and auditory hallucinations' },
    description: { pl: 'W uszach rzucającego rozbrzmiewa kakofonia nieludzkich zawodzeń i upiornych głosów.', en: 'A cacophony of inhuman wails and spectral voices echoes in the caster ears.' },
    mechanicalEffect: { pl: 'Trudność testów opartych na słuchu i koncentracji wzrasta o jeden poziom', en: 'Hearing and concentration tests difficulty increased by one step' },
  },
  {
    id: 3,
    tier: 'minor',
    name: { pl: 'Silny wicher lub inne zjawisko atmosferyczne', en: 'Strong gale or sudden atmospheric disturbance' },
    description: { pl: 'Niewytłumaczalny podmuch lodowatego wichru gasi źródła ognia i przewraca lekkie przedmioty.', en: 'An inexplicable freezing gale extinguishes fires and scatters loose items.' },
    mechanicalEffect: { pl: 'Ugaszenie pochodni i świec, zamieszanie w otoczeniu', en: 'Extinguishes open flames and creates environmental chaos' },
  },
  {
    id: 4,
    tier: 'minor',
    name: { pl: 'Krwawienie czarownika, otoczenia lub ścian', en: 'Bleeding of caster, bystanders, or walls' },
    description: { pl: 'Z porów skóry czarownika, a nawet ze ścian i podłogi zaczyna sączyć się lepka krew.', en: 'Sticky blood seeps from the caster pores and runs down walls and floors.' },
    mechanicalEffect: { pl: 'Dodatkowa utrata 1 SAN u wszystkich świadków za makabryczny widok', en: 'Additional 1 SAN loss for all bystanders from the macabre sight' },
  },
  {
    id: 5,
    tier: 'minor',
    name: { pl: 'Dziwne wizje bądź halucynacje', en: 'Bizarre visions or hallucinations' },
    description: { pl: 'Rzeczywistość pęka, ukazując geometryczne koszmary spoza ludzkiej percepcji.', en: 'Reality warps, unveiling non-Euclidean nightmares beyond human perception.' },
    mechanicalEffect: { pl: 'Dezorientacja na 1 rundę walki', en: 'Disorientation for 1 combat round' },
  },
  {
    id: 6,
    tier: 'minor',
    name: { pl: 'Małe zwierzęta w pobliżu nagle eksplodują', en: 'Small animals nearby suddenly explode' },
    description: { pl: 'Szczury, ptaki czy owady w promieniu kilkunastu metrów pękają z cichym mlaśnięciem.', en: 'Rats, birds, or insects within yards violently burst with a sickening pop.' },
    mechanicalEffect: { pl: 'Test Poczytalności (utrata 0/1K2 SAN)', en: 'Sanity roll (0/1d2 SAN loss)' },
  },
  {
    id: 7,
    tier: 'minor',
    name: { pl: 'Wokół roznosi się odór siarki i zgnilizny', en: 'Stench of sulfur and decay spreads all around' },
    description: { pl: 'Powietrze wypełnia duszący, gryzący w gardło smród piekielnej siarki i rozkładu.', en: 'Choking, acrid stench of brimstone and decay fills the air.' },
    mechanicalEffect: { pl: 'Test Budowy Ciała (CON), porażka wywołuje mdłości i kaszel', en: 'Constitution (CON) check, failure causes nausea and retching' },
  },
  {
    id: 8,
    tier: 'minor',
    name: { pl: 'Przypadkowe przywołanie mitycznego potwora', en: 'Accidental summoning of a Mythos monster' },
    description: { pl: 'Wyrwa w czasoprzestrzeni przyciąga drapieżny byt z cienia lub wymiaru pośredniego.', en: 'A rift in spacetime attracts a predatory entity from shadows or interstitial dimensions.' },
    mechanicalEffect: { pl: 'Pojawienie się wrogiej istoty Mitów (np. Ghul, Pomiot lub Byt z Cienia)', en: 'Hostile Mythos creature manifests (e.g. Ghoul, Spawn, or Shadow Being)' },
  },
];

/**
 * Oficjalna tabela katastrof potężniejszych CoC 7e RAW (s. 197).
 */
export const CATASTROPHE_TABLE_MAJOR: CatastropheEffect[] = [
  {
    id: 1,
    tier: 'major',
    name: { pl: 'Trzęsienie ziemi, pękanie ścian budynków', en: 'Earthquake, walls cracking' },
    description: { pl: 'Grunt drży gwałtownie, fundamenty pękają, a tynk sypie się z sufitu.', en: 'Ground heaves violently, foundations fracture, plaster rains down.' },
    mechanicalEffect: { pl: 'Test Zręczności (DEX) przeciwko przewróceniu lub 2K6 obrażeń od gruzu', en: 'Dexterity check to avoid falling or 2d6 falling debris damage' },
  },
  {
    id: 2,
    tier: 'major',
    name: { pl: 'Pioruny i błyskawice o epickim natężeniu', en: 'Epic thunderbolts and lightning' },
    description: { pl: 'Niebo rozrywają oślepiające wyładowania uderzające wprost w miejsce rytuału.', en: 'Blinding electrical discharges tear the sky, striking the ritual site directly.' },
    mechanicalEffect: { pl: 'Obrażenia elektryczne w promieniu 10 metrów', en: 'Electrical damage within 10 yards' },
  },
  {
    id: 3,
    tier: 'major',
    name: { pl: 'Deszcz krwi wprost z nieba', en: 'Rain of blood falling directly from the sky' },
    description: { pl: 'Z chmur spada gęsty, cuchnący opad szkarłatnej posoki pokrywającej wszystko dokoła.', en: 'Thick, foul-smelling crimson gore showers down, soaking everything.' },
    mechanicalEffect: { pl: 'Utrata 1/1K6 SAN u wszystkich świadków', en: '1/1d6 SAN loss for all witnesses' },
  },
  {
    id: 4,
    tier: 'major',
    name: { pl: 'Ręka czarownika usycha i ulega spaleniu', en: 'Caster hand withers and burns to ash' },
    description: { pl: 'Moc zaklęcia obraca się przeciw rzucającemu, niszcząc jego ciało.', en: 'Eldritch feedback turns on the caster, reducing flesh and bone to ash.' },
    mechanicalEffect: { pl: 'Trwała utrata ręki i 1K6 PW oraz test na Ranę Ciężką', en: 'Permanent loss of hand, 1d6 HP loss and Major Wound check' },
  },
  {
    id: 5,
    tier: 'major',
    name: { pl: 'Czarownik nienaturalnie się starzeje (+2K10 lat)', en: 'Caster unnaturally ages (+2d10 years)' },
    description: { pl: 'Czasoprzestrzeń wysysa lata życia rzucającego w kilka sekund.', en: 'Spacetime drains years of life from the caster in seconds.' },
    mechanicalEffect: { pl: 'Postarzenie o +2K10 lat i modyfikatory cech fizycznych wg CoC 7e RAW s. 36', en: 'Aging +2d10 years and physical stat adjustments per CoC 7e RAW p. 36' },
  },
  {
    id: 6,
    tier: 'major',
    name: { pl: 'Potężne istoty z Mitów atakują wszystkich obecnych', en: 'Powerful Mythos entities manifest and attack everyone' },
    description: { pl: 'Rozbita bariera rzeczywistości uwalnia hordę potworów, rzucających się najpierw na czarownika.', en: 'Shattered barrier of reality unleashes horrors attacking the caster first.' },
    mechanicalEffect: { pl: 'Natychmiastowe rozpoczęcie walki o przetrwanie', en: 'Immediate survival combat initiated' },
  },
  {
    id: 7,
    tier: 'major',
    name: { pl: 'Przeniesienie do odległego miejsca lub czasu', en: 'Hurled across space or distant time' },
    description: { pl: 'Czarownik lub świadkowie zostają wessani w szczelinę wprost do innego wymiaru.', en: 'Caster or bystanders sucked into a vortex directly to another dimension or era.' },
    mechanicalEffect: { pl: 'Zagubienie w czasie/przestrzeni', en: 'Lost across time and space' },
  },
  {
    id: 8,
    tier: 'major',
    name: { pl: 'Przypadkowe przyzwanie bóstwa Mitów', en: 'Accidental manifestation of a Mythos deity' },
    description: { pl: 'Otwarta zostaje brama ku awatarowi Wielkiego Przedwiecznego lub Zewnętrznego Boga.', en: 'A rift opens to an avatar of a Great Old One or Outer God.' },
    mechanicalEffect: { pl: 'Ekstremalna utrata Poczytalności (1K10/1K100 SAN)', en: 'Extreme Sanity loss (1d10/1d100 SAN)' },
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
