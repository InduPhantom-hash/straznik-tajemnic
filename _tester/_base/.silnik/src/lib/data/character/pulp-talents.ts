/**
 * pulp-talents.ts - Rejestr Talentów Pulp Cthulhu (RAW)
 * Zgodny z oficjalnym podręcznikiem "Pulp Cthulhu 7ed" (Rozdział 2, Tabele 3-6).
 *
 * Zawiera 4 kategorie talentów:
 * 1. Fizyczne (physical)
 * 2. Umysłowe (mental)
 * 3. Bojowe (combat)
 * 4. Użytkowe (miscellaneous)
 *
 * Zwięzłe, autorskie opisy funkcjonalne (ochrona praw autorskich).
 */

import type { PulpTalentDefinition, PulpTalentCategory } from '@/lib/types';

export const PULP_TALENTS: PulpTalentDefinition[] = [
  {
    "id": "keen_vision",
    "name": {
      "pl": "Bystry Wzrok",
      "en": "Keen Vision"
    },
    "category": "physical",
    "description": {
      "pl": "Wyjątkowa ostrość widzenia pozwalająca dostrzec najmniejsze detale i ruch w oddali.",
      "en": "Exceptional visual acuity allowing the hero to spot minute details and movement from afar."
    },
    "benefitSummary": {
      "pl": "Kość premiowa do testów Spostrzegawczości.",
      "en": "Bonus die on Spot Hidden checks."
    }
  },
  {
    "id": "rapid_recovery",
    "name": {
      "pl": "Szybka Regeneracja",
      "en": "Rapid Recovery"
    },
    "category": "physical",
    "description": {
      "pl": "Niezwykłe tempo gojenia się ran i regeneracji tkanek.",
      "en": "Uncanny healing rate and tissue regeneration under rest."
    },
    "benefitSummary": {
      "pl": "Naturalne leczenie wzrasta do +3 PW na dobę pełnego odpoczynku.",
      "en": "Natural healing increases to +3 HP per day of full rest."
    }
  },
  {
    "id": "night_vision",
    "name": {
      "pl": "Widzenie w Ciemności",
      "en": "Night Vision"
    },
    "category": "physical",
    "description": {
      "pl": "Wzrok doskonale przystosowany do mroku i słabego oświetlenia.",
      "en": "Eyes remarkably adapted to gloom, shadow, and low-light environments."
    },
    "benefitSummary": {
      "pl": "Obniża poziom trudności Spostrzegawczości w ciemności i znosi kość karną za strzał po ciemku.",
      "en": "Lowers Spot Hidden difficulty in darkness and eliminates penalty die for shooting in the dark."
    }
  },
  {
    "id": "iron_constitution",
    "name": {
      "pl": "Żelazna Kondycja",
      "en": "Iron Constitution"
    },
    "category": "physical",
    "description": {
      "pl": "Organizm ze stali, odporny na skrajne zmęczenie i wyczerpanie.",
      "en": "A frame forged of iron, enduring extreme fatigue and physical strain."
    },
    "benefitSummary": {
      "pl": "Kość premiowa do testów Kondycji (CON), w tym pościgów.",
      "en": "Bonus die on Constitution checks, including chase movements."
    }
  },
  {
    "id": "heavy_lifter",
    "name": {
      "pl": "Ciężarowiec",
      "en": "Heavy Lifter"
    },
    "category": "physical",
    "description": {
      "pl": "Potężna dźwignia mięśni pozwalająca unosić i przesuwać ogromne ciężary.",
      "en": "Raw muscular leverage allowing the lifting and heaving of immense weights."
    },
    "benefitSummary": {
      "pl": "Kość premiowa do testów Siły (STR) przy podnoszeniu obiektów i osób.",
      "en": "Bonus die on Strength checks when lifting objects or people."
    }
  },
  {
    "id": "strong_stomach",
    "name": {
      "pl": "Mocna Głowa",
      "en": "Strong Stomach"
    },
    "category": "physical",
    "description": {
      "pl": "Niewrażliwość na mocne trunki, toksyny pokarmowe i mdłości.",
      "en": "Immunity to hard liquor, gastrointestinal distress, and incapacitating nausea."
    },
    "benefitSummary": {
      "pl": "Wydanie 5 pkt Szczęścia znosi kary i oszołomienie po alkoholu lub lekkich toksynach.",
      "en": "Spend 5 Luck to negate skill penalties from intoxication or mild toxins."
    }
  },
  {
    "id": "resilient",
    "name": {
      "pl": "Zahartowany",
      "en": "Resilient"
    },
    "category": "physical",
    "description": {
      "pl": "Odporność na jady, chemikalia i ostre infekcje.",
      "en": "Robust resistance against venoms, chemical poisons, and virulent infections."
    },
    "benefitSummary": {
      "pl": "Wydanie 10 pkt Szczęścia zmniejsza obrażenia i skutki trucizny lub choroby o połowę.",
      "en": "Spend 10 Luck to halve damage and effects from poison or disease."
    }
  },
  {
    "id": "tough_guy",
    "name": {
      "pl": "Twardziel",
      "en": "Tough Guy"
    },
    "category": "physical",
    "description": {
      "pl": "Zdolność zaciskania zębów i ignorowania tępych uderzeń.",
      "en": "The grit to shrug off blunt force trauma and grazing strikes."
    },
    "benefitSummary": {
      "pl": "Wydanie 10 pkt Szczęścia pozwala zignorować do 5 pkt obrażeń w jednej rundzie walki.",
      "en": "Spend 10 Luck to ignore up to 5 points of damage taken in a single combat round."
    }
  },
  {
    "id": "keen_hearing",
    "name": {
      "pl": "Czuły Słuch",
      "en": "Keen Hearing"
    },
    "category": "physical",
    "description": {
      "pl": "Zdolność wychwytywania najcichszego szelestu i kroków za drzwiami.",
      "en": "Acute auditory sense catching the faintest whisper or approaching step."
    },
    "benefitSummary": {
      "pl": "Kość premiowa do testów Nasłuchiwania.",
      "en": "Bonus die on Listen checks."
    }
  },
  {
    "id": "smooth_talker",
    "name": {
      "pl": "Bajerant",
      "en": "Smooth Talker"
    },
    "category": "physical",
    "description": {
      "pl": "Niewymuszona charyzma, urok osobisty i magnetyczny uśmiech.",
      "en": "Effortless magnetism, physical poise, and winning smile."
    },
    "benefitSummary": {
      "pl": "Kość premiowa do testów Uroku Osobistego.",
      "en": "Bonus die on Charm checks."
    }
  },
  {
    "id": "steadfast",
    "name": {
      "pl": "Hart Ducha",
      "en": "Steadfast"
    },
    "category": "mental",
    "description": {
      "pl": "Niewzruszony spokój wobec widoku ludzkich tragedii i makabrycznych ran.",
      "en": "Unshakable composure in the face of human carnage and gruesome scenes."
    },
    "benefitSummary": {
      "pl": "Ignorujesz utratę Poczytalności za atakowanie ludzi, widok ran lub zwłok.",
      "en": "Ignore Sanity loss from violence against humans, gore, or mundane corpses."
    }
  },
  {
    "id": "iron_nerves",
    "name": {
      "pl": "Nerwy ze Stali",
      "en": "Iron Nerves"
    },
    "category": "mental",
    "description": {
      "pl": "Zdolność stłumienia paniki czystą siłą woli i determinacji.",
      "en": "The mental fortitude to repress creeping panic through sheer grit."
    },
    "benefitSummary": {
      "pl": "Wydajesz punkty Szczęścia w stosunku 1:1, by uniknąć utraty Poczytalności.",
      "en": "Spend Luck points at a 1:1 ratio to prevent Sanity loss."
    }
  },
  {
    "id": "strong_willed",
    "name": {
      "pl": "Silna Wola",
      "en": "Strong Willed"
    },
    "category": "mental",
    "description": {
      "pl": "Potężna determinacja psychiczna odpierająca hipnozę i wpływy obcych umysłów.",
      "en": "Unyielding mental strength resisting hypnosis and alien psychic intrusions."
    },
    "benefitSummary": {
      "pl": "Kość premiowa do testów Mocy (POW).",
      "en": "Bonus die on Power checks."
    }
  },
  {
    "id": "quick_study",
    "name": {
      "pl": "Pojętny Uczeń",
      "en": "Quick Study"
    },
    "category": "mental",
    "description": {
      "pl": "Szybka synteza skomplikowanych tekstów naukowych i okultystycznych.",
      "en": "Rapid absorption of complex scholarly and occult literature."
    },
    "benefitSummary": {
      "pl": "Wstępna i pełna lektura grymuarów oraz ksiąg zajmuje o połowę mniej czasu.",
      "en": "Initial and full reading of tomes takes half the standard time."
    }
  },
  {
    "id": "linguist",
    "name": {
      "pl": "Lingwista",
      "en": "Linguist"
    },
    "category": "mental",
    "description": {
      "pl": "Talent do natychmiastowego chwytania gramatyki, dialektów i akcentów.",
      "en": "Innate flair for deciphering foreign grammars, dialects, and idioms."
    },
    "benefitSummary": {
      "pl": "Błyskawicznie rozpoznajesz język mowy lub pisma; kość premiowa do testów Języków.",
      "en": "Instantly identify spoken/written languages; bonus die on Language checks."
    }
  },
  {
    "id": "arcane_intuition",
    "name": {
      "pl": "Magiczna Intuicja",
      "en": "Arcane Intuition"
    },
    "category": "mental",
    "description": {
      "pl": "Wrodzone wyczucie przepływu energii magicznych i geometrii rytuałów.",
      "en": "An instinctual grasp of arcane currents and ritual geometry."
    },
    "benefitSummary": {
      "pl": "Nauka czarów trwa o połowę krócej; kość premiowa do testów rzucania czarów.",
      "en": "Spell learning time is halved; bonus die on spellcasting tests."
    }
  },
  {
    "id": "photographic_memory",
    "name": {
      "pl": "Fotograficzna Pamięć",
      "en": "Photographic Memory"
    },
    "category": "mental",
    "description": {
      "pl": "Umysł rejestrujący dokumenty, mapy, twarze i tablice rejestracyjne z krystaliczną precyzją.",
      "en": "An eidetic memory capturing maps, ledgers, faces, and codes with crystal clarity."
    },
    "benefitSummary": {
      "pl": "Kość premiowa do testów Wiedzy i odtwarzania szczegółów z przeszłości.",
      "en": "Bonus die on Know rolls and recalling intricate historical or visual details."
    }
  },
  {
    "id": "occult_specialist",
    "name": {
      "pl": "Wiedza Tajemna",
      "en": "Occult Specialist"
    },
    "category": "mental",
    "description": {
      "pl": "Wąska, ale bezcenna wiedza o konkretnym zjawisku nadnaturalnym (np. wampiry, sny, kulty).",
      "en": "Deep expertise in a specific esoteric branch of supernatural lore."
    },
    "benefitSummary": {
      "pl": "Zyskujesz dedykowaną specjalizację umiejętności Wiedza Tajemna.",
      "en": "Gain a specialized Occult Lore skill focused on chosen supernatural phenomena."
    }
  },
  {
    "id": "psychic_power",
    "name": {
      "pl": "Moc Parapsychiczna",
      "en": "Psychic Power"
    },
    "category": "mental",
    "description": {
      "pl": "Ukryty potencjał psioniczny manifestujący się jako wróżbiarstwo, mediumizm lub telekineza.",
      "en": "Latent psionic potential manifesting as clairvoyance, mediumship, or telekinesis."
    },
    "benefitSummary": {
      "pl": "Dostęp do wybranej mocy parapsychicznej (Wróżbiarstwo, Jasnowidzenie, Telekineza).",
      "en": "Unlocks one psychic ability (Divination, Clairvoyance, Mediumship, Telekinesis)."
    }
  },
  {
    "id": "sharp_intellect",
    "name": {
      "pl": "Bystry Umysł",
      "en": "Sharp Intellect"
    },
    "category": "mental",
    "description": {
      "pl": "Błyskawiczne kojarzenie pozornie niepowiązanych poszlak w spójną całość.",
      "en": "Lightning-fast deduction connecting disparate clues into a coherent picture."
    },
    "benefitSummary": {
      "pl": "Kość premiowa do testów Inteligencji (INT) przy logicznej dedukcji.",
      "en": "Bonus die on Intelligence (INT) checks when piecing clues together."
    }
  },
  {
    "id": "alert",
    "name": {
      "pl": "Czujność",
      "en": "Alert"
    },
    "category": "combat",
    "description": {
      "pl": "Szósty zmysł wyczuwający zasadzki i nagłe ataki w ułamku sekundy.",
      "en": "A sixth sense detecting ambushes and surprise attacks before they strike."
    },
    "benefitSummary": {
      "pl": "Badacza nie można zaskoczyć w walce (brak utraty tury ani darmowego ataku wroga).",
      "en": "The investigator cannot be surprised in combat."
    }
  },
  {
    "id": "heavy_hitter",
    "name": {
      "pl": "Ciężka Ręka",
      "en": "Heavy Hitter"
    },
    "category": "combat",
    "description": {
      "pl": "Niszczycielska siła uderzenia w walce wręcz powalająca wrogów z nóg.",
      "en": "Devastating striking power in melee combat knocking enemies off their feet."
    },
    "benefitSummary": {
      "pl": "Wydanie 10 pkt Szczęścia dodaje dodatkową kość obrażeń broni w walce wręcz.",
      "en": "Spend 10 Luck to add an extra weapon damage die in close combat."
    }
  },
  {
    "id": "fast_loader",
    "name": {
      "pl": "Szybkie Przeładowanie",
      "en": "Fast Loader"
    },
    "category": "combat",
    "description": {
      "pl": "Pamięć mięśniowa pozwalająca ładować broń w ułamku sekundy pod ostrzałem.",
      "en": "Flawless muscle memory reloading firearms in a heartbeat under heavy fire."
    },
    "benefitSummary": {
      "pl": "Ignorujesz kość karną za przeładowanie i oddanie strzału w tej samej rundzie.",
      "en": "Ignore penalty die for reloading and firing a firearm in the same combat round."
    }
  },
  {
    "id": "nimble",
    "name": {
      "pl": "Niezwykła Zwinność",
      "en": "Nimble"
    },
    "category": "combat",
    "description": {
      "pl": "Kocie odruchy pozwalające unikać serii z karabinów i błyskawicznie kontratakować.",
      "en": "Feline reflexes evading gunfire while maintaining battlefield initiative."
    },
    "benefitSummary": {
      "pl": "Nie tracisz kolejnej akcji po wykonaniu manewru szukania osłony (Dive for Cover).",
      "en": "Do not lose your next action after performing Dive for Cover."
    }
  },
  {
    "id": "sharp_eye",
    "name": {
      "pl": "Celne Oko",
      "en": "Sharp Eye"
    },
    "category": "combat",
    "description": {
      "pl": "Sokoli wzrok i pewna ręka eliminujące błędy paralaksy i chaos starcia.",
      "en": "Dead-eye marksmanship eliminating sighting errors in the chaos of melee."
    },
    "benefitSummary": {
      "pl": "Brak kości karnej przy celowaniu w mały cel lub strzelaniu w zwarcie.",
      "en": "No penalty die for targeting small targets or firing into melee."
    }
  },
  {
    "id": "firm_stance",
    "name": {
      "pl": "Pewna Postawa",
      "en": "Firm Stance"
    },
    "category": "combat",
    "description": {
      "pl": "Niezachwiany balans ciała i technika zapasów dająca przewagę w zwarciu.",
      "en": "Unwavering balance and grappling mastery yielding tactical control in clinches."
    },
    "benefitSummary": {
      "pl": "Krzepa badacza jest traktowana jako o 1 wyższa na potrzeby manewrów bojowych.",
      "en": "Your Build counts as 1 point higher for combat maneuvers."
    }
  },
  {
    "id": "rapid_attack",
    "name": {
      "pl": "Szybki Atak",
      "en": "Rapid Attack"
    },
    "category": "combat",
    "description": {
      "pl": "Grad błyskawicznych ciosów zasypujący obronę przeciwnika.",
      "en": "A flurry of lightning-fast blows overwhelming opponent defenses."
    },
    "benefitSummary": {
      "pl": "Wydanie 10 pkt Szczęścia daje dodatkowy atak wręcz w tej samej rundzie.",
      "en": "Spend 10 Luck to gain an additional melee attack in the same round."
    }
  },
  {
    "id": "fleet_footed",
    "name": {
      "pl": "Szybkonogi",
      "en": "Fleet Footed"
    },
    "category": "combat",
    "description": {
      "pl": "Dynamiczna praca nóg uniemożliwiająca wrogom okrążenie badacza.",
      "en": "Dynamic footwork preventing hostile groups from cornering the hero."
    },
    "benefitSummary": {
      "pl": "Wydanie 10 pkt Szczęścia na jedno starcie neguje premię wrogów za przewagę liczebną.",
      "en": "Spend 10 Luck to negate enemy outnumbered advantage for one engagement."
    }
  },
  {
    "id": "quick_draw",
    "name": {
      "pl": "Szybkie Dobywanie",
      "en": "Quick Draw"
    },
    "category": "combat",
    "description": {
      "pl": "Błyskawiczny ruch ręki wyciągający broń z kabury zanim wróg mrugnie okiem.",
      "en": "Instantaneous draw from holster before the opponent can blink."
    },
    "benefitSummary": {
      "pl": "Zyskujesz +50 ZR do inicjatywy z bronią palną bez konieczności wcześniejszego przygotowania.",
      "en": "Gain +50 DEX to firearms initiative without having the weapon pre-drawn."
    }
  },
  {
    "id": "gunslinger",
    "name": {
      "pl": "Rewolwerowiec",
      "en": "Gunslinger"
    },
    "category": "combat",
    "description": {
      "pl": "Mistrzostwo strzelectwa z broni krótkiej, prowadzenie ognia z biodra.",
      "en": "Legendary prowess with handguns, fanning hammers and hip-firing."
    },
    "benefitSummary": {
      "pl": "Ignorujesz kość karną za oddawanie wielokrotnych strzałów z broni krótkiej w rundzie.",
      "en": "Ignore the penalty die for multiple handgun shots in a single round."
    }
  },
  {
    "id": "tough_cookie",
    "name": {
      "pl": "Zakapior",
      "en": "Tough Cookie"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Groźna aparycja i spojrzenie mrożące krew w żyłach nawet u recydywistów.",
      "en": "Menacing demeanor and a piercing stare terrifying hardened underworld thugs."
    },
    "benefitSummary": {
      "pl": "Kość premiowa lub obniżenie trudności o jeden stopień przy Zastraszaniu.",
      "en": "Bonus die or reduced difficulty level on Intimidate checks."
    }
  },
  {
    "id": "gadget",
    "name": {
      "pl": "Gadżet",
      "en": "Gadget"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Posiadanie prototypowego urządzenia szalonej nauki (np. mini-detektor, pistolet paraliżujący).",
      "en": "Possession of a prototype weird science device (e.g. ectoray, miniature booster)."
    },
    "benefitSummary": {
      "pl": "Zaczynasz grę z jednym unikalnym gadżetem Szalonej Nauki (Weird Science).",
      "en": "Begin play equipped with one unique Weird Science apparatus."
    }
  },
  {
    "id": "lucky",
    "name": {
      "pl": "Szczęściarz",
      "en": "Lucky"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Urodzony pod szczęśliwą gwiazdą, los zawsze daje mu drugą szansę.",
      "en": "Born under a lucky star, fate continually smiling upon close calls."
    },
    "benefitSummary": {
      "pl": "Zyskujesz dodatkowe +1K10 punktów Szczęścia po udanym teście odzyskiwania Szczęścia.",
      "en": "Gain an extra +1D10 Luck points when recovering Luck between sessions."
    }
  },
  {
    "id": "mythos_knowledge",
    "name": {
      "pl": "Znajomość Mitów",
      "en": "Mythos Knowledge"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Przeszłe spotkanie z zakazanym bluźnierstwem, które odcisnęło trwałe piętno.",
      "en": "A past brush with cosmic blasphemy leaving indelible, horrifying insight."
    },
    "benefitSummary": {
      "pl": "Rozpoczynasz grę z 10 punktami umiejętności Mity Cthulhu bez utraty maksymalnej Poczytalności.",
      "en": "Start play with 10% in Cthulhu Mythos skill without initial Sanity cap reduction."
    }
  },
  {
    "id": "weird_science",
    "name": {
      "pl": "Szalona Nauka",
      "en": "Weird Science"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Geniusz techniczny łączący naukę z mechaniką Mitów w działające prototypy.",
      "en": "Visionary technical genius combining physical science with Mythos anomalies."
    },
    "benefitSummary": {
      "pl": "Możliwość konstruowania, kalibracji i naprawy aparatury Weird Science.",
      "en": "Ability to invent, modify, and repair Weird Science apparatuses."
    }
  },
  {
    "id": "shadow",
    "name": {
      "pl": "Cień",
      "en": "Shadow"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Zdolność stapiania się z mrokiem i bezszelestnego przemykania obok strażników.",
      "en": "Melding effortlessly into darkness and ghosting past alert sentries."
    },
    "benefitSummary": {
      "pl": "Kość premiowa do Ukrywania; z ukrycia możesz wykonać 2 ataki przed wykryciem.",
      "en": "Bonus die on Stealth checks; deliver 2 surprise attacks before being revealed."
    }
  },
  {
    "id": "handyman",
    "name": {
      "pl": "Majsterkowicz",
      "en": "Handyman"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Zdolność zmuszenia do działania każdego silnika, bezpiecznika i maszyny.",
      "en": "Innate touch coaxing performance from any engine, fuse, or heavy machine."
    },
    "benefitSummary": {
      "pl": "Kość premiowa lub łatwiejszy test w Elektryce, Mechanice i Ciężkim Sprzęcie.",
      "en": "Bonus die or lower difficulty on Electrical, Mechanical, and Heavy Machinery checks."
    }
  },
  {
    "id": "animal_companion",
    "name": {
      "pl": "Zwierzęcy Towarzysz",
      "en": "Animal Companion"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Wierny pies, sokół lub kot ostrzegający przed nadnaturalnym zagrożeniem.",
      "en": "A loyal hound, falcon, or cat alerting the hero to unnatural perils."
    },
    "benefitSummary": {
      "pl": "Startujesz z wiernym zwierzęciem i zyskujesz kość premiową do Tresury Zwierząt.",
      "en": "Start play with a loyal animal and gain a bonus die on Animal Handling."
    }
  },
  {
    "id": "master_of_disguise",
    "name": {
      "pl": "Mistrz Kamuflażu",
      "en": "Master of Disguise"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Kunszt charakteryzacji, zmiany głosu i manier nie do rozpoznania.",
      "en": "Consummate art of vocal manipulation, prosthetics, and total persona alteration."
    },
    "benefitSummary": {
      "pl": "Wydanie 10 Szczęścia daje kość premiową do Charakteryzacji; podnosi trudność zdemaskowania.",
      "en": "Spend 10 Luck for bonus die on Disguise/Acting; raises enemy detection difficulty to Hard."
    }
  },
  {
    "id": "resourceful",
    "name": {
      "pl": "Zaradność",
      "en": "Resourceful"
    },
    "category": "miscellaneous",
    "description": {
      "pl": "Niezwykłe szczęście do znajdowania w otoczeniu dokładnie tego rekwizytu, którego akurat potrzeba.",
      "en": "Improbable fortune in finding precisely the necessary tool or gadget nearby."
    },
    "benefitSummary": {
      "pl": "Wydanie 10 pkt Szczęścia pozwala znaleźć w pobliżu przydatny przedmiot (np. łom, lina, latarka).",
      "en": "Spend 10 Luck to discover a conveniently placed tool or item in immediate surroundings."
    }
  }
];

export function getPulpTalent(id: string): PulpTalentDefinition | undefined {
  return PULP_TALENTS.find((t) => t.id === id);
}

export function getPulpTalentsByCategory(category: PulpTalentCategory): PulpTalentDefinition[] {
  return PULP_TALENTS.filter((t) => t.category === category);
}

export function getAllPulpTalents(): PulpTalentDefinition[] {
  return PULP_TALENTS;
}
