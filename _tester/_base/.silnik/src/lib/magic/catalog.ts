import type { SpellDefinition, TomeDefinition } from './types';

/**
 * Kanoniczny katalog oficjalnych zaklęć CoC 7e RAW oraz z Wielkiego Grymuaru.
 * Każdy rekord zawiera dokładny odnośnik do podręcznika, diegetyczne nazwy,
 * jawne koszty PM/SAN/POW/HP oraz czas rzucania.
 */
export const CANONICAL_SPELLS: Record<string, SpellDefinition> = {
  'wither-limb': {
    id: 'wither-limb',
    name: 'Uwiąd Kończyny',
    namePl: 'Uwiąd Kończyny',
    nameEn: 'Wither Limb',
    diegeticNames: {
      pl: ['Pieśń Bólu', 'Czar Czarnej Zgnilizny', 'Klątwa Uschnięcia'],
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
      name: { pl: 'Całkowity Uwiąd Ciała', en: 'Complete Corporeal Wither' },
      description: {
        pl: 'Pozwala objąć klątwą dwie kończyny naraz lub wywołać natychmiastową martwicę tkanek.',
        en: 'Affects two limbs simultaneously or induces immediate gangrenous necrosis.',
      },
      costMultiplier: 2,
      effectMod: { pl: 'Podwójny zasięg i uwiąd 2 kończyn', en: 'Double range and 2 limbs withered' },
    },
    description: {
      pl: 'Powoduje natychmiastowe uschnięcie, skurczenie i bezużyteczność ramienia lub nogi ofiary.',
      en: 'Causes a chosen arm or leg of the target to instantly wither, shrivel, and become useless.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 268,
      language: 'pl',
    },
    definitionVersion: 1,
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
      page: 268,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'flesh-ward': {
    id: 'flesh-ward',
    name: 'Tarcza z Ciała',
    namePl: 'Tarcza z Ciała',
    nameEn: 'Flesh Ward',
    diegeticNames: {
      pl: ['Pancerz Kości', 'Żelazna Skóra', 'Płaszcz Nieczułości'],
      en: ['Armor of Bone', 'Iron Flesh', 'Mantle of Callousness'],
    },
    category: 'protective',
    mpCost: 'zmienne (każde 2 PM = 1k6 pancerza)',
    sanCost: '1k4',
    castingTime: {
      type: 'minutes',
      value: { pl: '5 rund (około 1 minuta)', en: '5 rounds (approx. 1 minute)' },
    },
    range: { pl: 'Rzucający lub dotknięty sojusznik', en: 'Caster or touched ally' },
    duration: { pl: '24 godziny lub do wyczerpania punktów pancerza', en: '24 hours or until armor pool is exhausted' },
    description: {
      pl: 'Wzmacnia tkanki rzucającego, pochłaniając obrażenia fizyczne (pociski, cięcia, uderzenia).',
      en: 'Toughens the target flesh to absorb non-magical kinetic damage (bullets, blades, impacts).',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 262,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'dominate': {
    id: 'dominate',
    name: 'Zdominowanie',
    namePl: 'Zdominowanie',
    nameEn: 'Dominate',
    diegeticNames: {
      pl: ['Rozkaz Woli', 'Związanie Umysłu', 'Hipnoza Cienia'],
      en: ['Command of Will', 'Mind Binding', 'Shadow Hypnosis'],
    },
    category: 'influence',
    mpCost: 10,
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
      page: 250,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'contact-deep-ones': {
    id: 'contact-deep-ones',
    name: 'Nawiązanie Kontaktu z Istotami z Głębin',
    namePl: 'Nawiązanie Kontaktu z Istotami z Głębin',
    nameEn: 'Contact Deep Ones',
    diegeticNames: {
      pl: ['Modlitwa do Morza', 'Zew z Otchłani Dagonowej', 'Pieśń Rafy'],
      en: ['Prayer to the Sea', 'Call of Dagon Abyssal', 'Song of the Reef'],
    },
    category: 'contact',
    mpCost: 3,
    sanCost: '1k3',
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
      pl: 'Przywołuje jedną lub więcej Istot z Głębin ku brzegowi w celu pertraktacji lub wymiany darów.',
      en: 'Summons one or more Deep Ones to the water edge to parley or trade.',
    },
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 256,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'summon-bind-byakhee': {
    id: 'summon-bind-byakhee',
    name: 'Przywołanie / Związanie Byakhee',
    namePl: 'Przywołanie / Związanie Byakhee',
    nameEn: 'Summon/Bind Byakhee',
    diegeticNames: {
      pl: ['Gwizd Kosmicznej Pustki', 'Przyzwanie Wierzchowca Gwiazd'],
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
      page: 261,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'shriveling': {
    id: 'shriveling',
    name: 'Spopielenie',
    namePl: 'Spopielenie',
    nameEn: 'Shriveling',
    diegeticNames: {
      pl: ['Czarny Płomień', 'Spalenie Trzewi', 'Klątwa Ogniem Cienia'],
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
      page: 266,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'voorish-sign': {
    id: 'voorish-sign',
    name: 'Znak Voorish',
    namePl: 'Znak Voorish',
    nameEn: 'Voorish Sign',
    diegeticNames: {
      pl: ['Gest Przeniknięcia Zasłony', 'Ręka Przejrzenia'],
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
      page: 269,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'cloud-memory': {
    id: 'cloud-memory',
    name: 'Zamglenie Pamięci',
    namePl: 'Zamglenie Pamięci',
    nameEn: 'Cloud Memory',
    diegeticNames: {
      pl: ['Kradzież Wspomnienia', 'Mgła Zapomnienia', 'Zasłona Niepamięci'],
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
      page: 248,
      language: 'pl',
    },
    definitionVersion: 1,
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
      type: 'hours',
      hours: 2,
      value: { pl: '2 godziny nad naczyniem z prochami', en: '2 hours over funerary crucible' },
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
      page: 265,
      language: 'pl',
    },
    definitionVersion: 1,
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
      hours: 33,
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
      page: 227,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'book-of-eibon-english': {
    id: 'book-of-eibon-english',
    title: 'Księga Eibona (Tłumaczenie angielskie)',
    titlePl: 'Księga Eibona (Angielski)',
    titleEn: 'Book of Eibon (English)',
    author: 'Eibon z Hyperborei',
    language: 'Angielski',
    languageDifficulty: 'hard', // archaiczna, zniekształcona angielszczyzna
    initialReading: {
      hours: 18,
      sanCost: '1k8',
      cmi: 3,
    },
    fullStudy: {
      weeks: 36,
      sanCost: '1k8',
      cmf: 8,
      mr: 33,
    },
    spells: ['wither-limb', 'flesh-ward', 'voorish-sign', 'cloud-memory'],
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 226,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'de-vermis-mysteris': {
    id: 'de-vermis-mysteris',
    title: 'De Vermis Mysteriis (O Tajemnicach Czerwia)',
    titlePl: 'De Vermis Mysteriis (Łacina, 1542)',
    titleEn: 'De Vermis Mysteriis (Latin, 1542)',
    author: 'Ludvig Prinn',
    language: 'Łacina',
    languageDifficulty: 'regular',
    initialReading: {
      hours: 24,
      sanCost: '1k10',
      cmi: 3,
    },
    fullStudy: {
      weeks: 48,
      sanCost: '1k10',
      cmf: 8,
      mr: 36,
    },
    spells: ['shriveling', 'summon-bind-byakhee', 'dominate', 'resurrection'],
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 228,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'cultes-des-goules': {
    id: 'cultes-des-goules',
    title: 'Cultes des Goules (Kulty Ghuli)',
    titlePl: 'Cultes des Goules (Francuski, 1702)',
    titleEn: 'Cultes des Goules (French, 1702)',
    author: 'François-Honoré Balfour, hrabia d’Erlette',
    language: 'Francuski',
    languageDifficulty: 'regular',
    initialReading: {
      hours: 11,
      sanCost: '1k6',
      cmi: 2,
    },
    fullStudy: {
      weeks: 22,
      sanCost: '1k6',
      cmf: 6,
      mr: 24,
    },
    spells: ['resurrection', 'cloud-memory', 'flesh-ward'],
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 228,
      language: 'pl',
    },
    definitionVersion: 1,
  },

  'unaussprechlichen-kulten': {
    id: 'unaussprechlichen-kulten',
    title: 'Unaussprechlichen Kulten (Bezbrzmienne Kulty)',
    titlePl: 'Unaussprechlichen Kulten (Niemiecki, 1839)',
    titleEn: 'Unaussprechlichen Kulten (German, 1839)',
    author: 'Friedrich Wilhelm von Junzt',
    language: 'Niemiecki',
    languageDifficulty: 'regular',
    initialReading: {
      hours: 17,
      sanCost: '1k8',
      cmi: 3,
    },
    fullStudy: {
      weeks: 34,
      sanCost: '1k8',
      cmf: 7,
      mr: 30,
    },
    spells: ['contact-deep-ones', 'elder-sign', 'wither-limb'],
    source: {
      sourceId: 'keeper-rulebook-7e',
      title: 'Księga Strażnika CoC 7e',
      edition: '7e',
      page: 231,
      language: 'pl',
    },
    definitionVersion: 1,
  },
};

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
