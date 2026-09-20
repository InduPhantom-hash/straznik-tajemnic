/**
 * pulp-archetypes.ts - Kanoniczny rejestr Archetypów Pulp Cthulhu (RAW)
 * Zgodny z podręcznikiem "Pulp Cthulhu 7ed" (Rozdział 2, s. 17-26).
 *
 * Każdy archetyp definiuje:
 * - Cecha bazowa (+20 premii do wybranej cechy kluczowej)
 * - 100 dodatkowych punktów umiejętności archetypu
 * - Sugerowane zawody i talenty
 */

import type { PulpArchetypeDefinition } from '@/lib/types';

export const PULP_ARCHETYPES: PulpArchetypeDefinition[] = [
  {
    "id": "outsider",
    "name": {
      "pl": "Autsajder",
      "en": "Outsider"
    },
    "description": {
      "pl": "Samotnik żyjący na obrzeżach społeczeństwa, zahartowany przez surowe warunki i polegający wyłącznie na sobie.",
      "en": "A loner living on the fringes of society, hardened by rough conditions and relying only on oneself."
    },
    "coreCharacteristics": [
      "int",
      "con"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Sztuka Przetrwania",
      "Nawigacja",
      "Tropienie",
      "Ukrywanie",
      "Nasłuchiwanie",
      "Spostrzegawczość",
      "Pierwsza Pomoc"
    ],
    "suggestedOccupations": [
      "Odkrywca",
      "Tramp",
      "Myśliwy",
      "Robotnik"
    ],
    "suggestedTalents": [
      "Zahartowany",
      "Czuły Słuch",
      "Cień"
    ],
    "suggestedTraits": [
      "milczący",
      "samotny",
      "czujny",
      "nieufny"
    ]
  },
  {
    "id": "adventurer",
    "name": {
      "pl": "Awanturnik",
      "en": "Adventurer"
    },
    "description": {
      "pl": "Nienasycony poszukiwacz adrenaliny, dla którego życie bez ryzyka, chwały i dalekich wypraw jest równoznaczne ze śmiercią.",
      "en": "An insatiable thrill-seeker for whom life without danger, glory, and distant expeditions is no life at all."
    },
    "coreCharacteristics": [
      "dex",
      "app"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Broń Palna",
      "Walka Wręcz",
      "Wspinaczka",
      "Skakanie",
      "Prowadzenie Samochodu",
      "Pierwsza Pomoc",
      "Pływanie"
    ],
    "suggestedOccupations": [
      "Lotnik",
      "Archeolog",
      "Łowca nagród",
      "Marynarz",
      "Żołnierz"
    ],
    "suggestedTalents": [
      "Szybka Regeneracja",
      "Bystry Wzrok",
      "Czujność"
    ],
    "suggestedTraits": [
      "brawurowy",
      "charyzmatyczny",
      "niecierpliwy",
      "żądny przygód"
    ]
  },
  {
    "id": "cold_blooded",
    "name": {
      "pl": "Bezwzględny",
      "en": "Cold Blooded"
    },
    "description": {
      "pl": "Chłodny kalkulator, który nie cofnie się przed niczym, by zrealizować swój cel, wyzbyty skrupułów i paraliżującego lęku.",
      "en": "A cold, calculating operator who stops at nothing to achieve their goal, free from hesitation and fear."
    },
    "coreCharacteristics": [
      "int"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Zastraszanie",
      "Broń Palna",
      "Psychologia",
      "Spostrzegawczość",
      "Ukrywanie",
      "Ślusarstwo"
    ],
    "suggestedOccupations": [
      "Detektyw agencji",
      "Gangster",
      "Szpieg",
      "Płatny zbir"
    ],
    "suggestedTalents": [
      "Hart Ducha",
      "Nerwy ze Stali",
      "Czujność"
    ],
    "suggestedTraits": [
      "opanowany",
      "bezwzględny",
      "małomówny",
      "skupiony"
    ]
  },
  {
    "id": "crusader",
    "name": {
      "pl": "Bojownik o sprawę",
      "en": "Crusader"
    },
    "description": {
      "pl": "Niezłomny obrońca słabszych o żelaznym kręgosłupie moralnym, gotów poświęcić wszystko w imię wyższej sprawiedliwości.",
      "en": "An unyielding champion of the weak with an iron moral compass, willing to sacrifice everything for justice."
    },
    "coreCharacteristics": [
      "con"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Historia",
      "Przekonywanie",
      "Zastraszanie",
      "Walka Wręcz",
      "Spostrzegawczość",
      "Pierwsza Pomoc"
    ],
    "suggestedOccupations": [
      "Duchowny",
      "Dziennikarz śledczy",
      "Gliniarz",
      "Żołnierz"
    ],
    "suggestedTalents": [
      "Silna Wola",
      "Żelazna Kondycja",
      "Hart Ducha"
    ],
    "suggestedTraits": [
      "honorowy",
      "nieugięty",
      "ofiarny",
      "wierny zasadom"
    ]
  },
  {
    "id": "bon_vivant",
    "name": {
      "pl": "Bon vivant",
      "en": "Bon Vivant"
    },
    "description": {
      "pl": "Dusza towarzystwa i uroczy hedonista, który czerpie z życia pełnymi garściami i obraca niebezpieczeństwo w dobrą zabawę.",
      "en": "The life of the party and a charming hedonist, savoring every luxury and turning perils into sport."
    },
    "coreCharacteristics": [
      "siz"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Urok Osobisty",
      "Gadanina",
      "Sztuka/Rzemiosło",
      "Majętność",
      "Prowadzenie Samochodu",
      "Wiedza o Świecie"
    ],
    "suggestedOccupations": [
      "Aktor",
      "Dyleton",
      "Muzyk",
      "Hazardzista"
    ],
    "suggestedTalents": [
      "Mocna Głowa",
      "Bajerant",
      "Szczęściarz"
    ],
    "suggestedTraits": [
      "dowcipny",
      "beztroski",
      "elegancki",
      "lubiący luksus"
    ]
  },
  {
    "id": "rogue",
    "name": {
      "pl": "Buntownik",
      "en": "Rogue"
    },
    "description": {
      "pl": "Cyniczny zawadiaka łamiący wszelkie reguły i autorytety, który ufa tylko własnemu sprytowi i szybkim nogom.",
      "en": "A cynical rogue defying rules and authority, trusting solely in wits, street sense, and quick feet."
    },
    "coreCharacteristics": [
      "dex",
      "app"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Zwinne Dłonie",
      "Ukrywanie",
      "Ślusarstwo",
      "Unik",
      "Gadanina",
      "Spostrzegawczość"
    ],
    "suggestedOccupations": [
      "Złodziej",
      "Włamywacz",
      "Przemytnik",
      "Chuligan"
    ],
    "suggestedTalents": [
      "Cień",
      "Szybkonogi",
      "Niezwykła Zwinność"
    ],
    "suggestedTraits": [
      "niepokorny",
      "bystry",
      "zuchwały",
      "zaradny"
    ]
  },
  {
    "id": "femme_fatale",
    "name": {
      "pl": "Femme fatale",
      "en": "Femme Fatale"
    },
    "description": {
      "pl": "Tajemnicza postać o magnetycznym uroku, manipulująca ludźmi i sytuacjami, by zawsze postawić na swoim.",
      "en": "A magnetic and enigmatic figure, turning charm and deception into deadly tools to always come out on top."
    },
    "coreCharacteristics": [
      "app",
      "int"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Urok Osobisty",
      "Psychologia",
      "Gadanina",
      "Ukrywanie",
      "Zwinne Dłonie",
      "Spostrzegawczość"
    ],
    "suggestedOccupations": [
      "Aktorka",
      "Szpieg",
      "Kobieta z wyższych sfer",
      "Dziewczyna gangstera"
    ],
    "suggestedTalents": [
      "Bajerant",
      "Mistrz Kamuflażu",
      "Czujność"
    ],
    "suggestedTraits": [
      "tajemnicza",
      "uwodzicielska",
      "przebiegła",
      "niebezpieczna"
    ]
  },
  {
    "id": "fixer",
    "name": {
      "pl": "Intrygant",
      "en": "Fixer"
    },
    "description": {
      "pl": "Człowiek od załatwiania spraw niemożliwych; zna każdego, wie gdzie zdobyć każdy towar i jak ominąć każdą przeszkodę.",
      "en": "The ultimate broker who knows everyone, procures anything, and circumvents any obstacle for the right price."
    },
    "coreCharacteristics": [
      "app"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Przekonywanie",
      "Gadanina",
      "Wiedza o Świecie",
      "Psychologia",
      "Zastraszanie",
      "Majętność"
    ],
    "suggestedOccupations": [
      "Paser",
      "Prywatny detektyw",
      "Dziennikarz",
      "Agent polityczny"
    ],
    "suggestedTalents": [
      "Zaradność",
      "Szczęściarz",
      "Bystry Umysł"
    ],
    "suggestedTraits": [
      "kontaktowy",
      "sprytny",
      "dyskretny",
      "obrotny"
    ]
  },
  {
    "id": "hunter",
    "name": {
      "pl": "Łowca",
      "en": "Hunter"
    },
    "description": {
      "pl": "Mistrz tropienia i polowania na najgroźniejszą zwierzynę i potwory, bezszelestny i zabójczo precyzyjny.",
      "en": "A master tracker and stalker of dangerous beasts and monsters, silent and lethally accurate."
    },
    "coreCharacteristics": [
      "int",
      "con"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Tropienie",
      "Broń Palna",
      "Sztuka Przetrwania",
      "Ukrywanie",
      "Spostrzegawczość",
      "Nasłuchiwanie"
    ],
    "suggestedOccupations": [
      "Łowca grubego zwierza",
      "Strażnik leśny",
      "Przewodnik",
      "Żołnierz"
    ],
    "suggestedTalents": [
      "Celne Oko",
      "Czuły Słuch",
      "Bystry Wzrok"
    ],
    "suggestedTraits": [
      "cierpliwy",
      "skupiony",
      "czujny",
      "cichy"
    ]
  },
  {
    "id": "dreamer",
    "name": {
      "pl": "Marzyciel",
      "en": "Dreamer"
    },
    "description": {
      "pl": "Wrażliwy wizjoner dostrzegający ukryte nici rzeczywistości i powiązania ze światem snów oraz innych wymiarów.",
      "en": "A sensitive visionary sensing unseen threads of reality, connecting with dreams and bizarre dimensions."
    },
    "coreCharacteristics": [
      "pow"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Sztuka/Rzemiosło",
      "Historia",
      "Okultyzm",
      "Spostrzegawczość",
      "Język Obcy",
      "Nasłuchiwanie"
    ],
    "suggestedOccupations": [
      "Artysta",
      "Pisarz",
      "Poeta",
      "Okultysta"
    ],
    "suggestedTalents": [
      "Silna Wola",
      "Moc Parapsychiczna",
      "Magiczna Intuicja"
    ],
    "suggestedTraits": [
      "uduchowiony",
      "zamyślony",
      "intuicyjny",
      "nadwrażliwy"
    ]
  },
  {
    "id": "mystic",
    "name": {
      "pl": "Mistyk",
      "en": "Mystic"
    },
    "description": {
      "pl": "Badacz tajemnic wykraczających poza zmysłowy świat, parający się pradawną wiedzą, rytuałami lub parapsychologią.",
      "en": "A scholar of truths beyond mundane senses, delving into esoteric rites, psychic phenomena, and ancient lore."
    },
    "coreCharacteristics": [
      "pow"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Okultyzm",
      "Historia",
      "Język Obcy",
      "Psychologia",
      "Spostrzegawczość",
      "Wiedza Tajemna"
    ],
    "suggestedOccupations": [
      "Okultysta",
      "Medium",
      "Parapsycholog",
      "Antykwariusz"
    ],
    "suggestedTalents": [
      "Moc Parapsychiczna",
      "Wiedza Tajemna",
      "Magiczna Intuicja"
    ],
    "suggestedTraits": [
      "tajemniczy",
      "wnikliwy",
      "spokojny",
      "uduchowiony"
    ]
  },
  {
    "id": "egghead",
    "name": {
      "pl": "Mózgowiec",
      "en": "Egghead"
    },
    "description": {
      "pl": "Genialny umysł analityczny i teoretyk, który w ułamku sekundy rozwiązuje łamigłówki, szyfry i skomplikowane równania.",
      "en": "A brilliant analytical mind deciphering codes, complex scientific puzzles, and arcane equations in a flash."
    },
    "coreCharacteristics": [
      "int"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Nauka",
      "Elektryka",
      "Mechanika",
      "Bibliotekoznawstwo",
      "Język Obcy",
      "Medycyna"
    ],
    "suggestedOccupations": [
      "Naukowiec",
      "Profesor",
      "Inżynier",
      "Kryptolog"
    ],
    "suggestedTalents": [
      "Fotograficzna Pamięć",
      "Bystry Umysł",
      "Pojętny Uczeń"
    ],
    "suggestedTraits": [
      "rozkojarzony",
      "ciekawski",
      "błyskotliwy",
      "skrupulatny"
    ]
  },
  {
    "id": "explorer",
    "name": {
      "pl": "Odkrywca",
      "en": "Explorer"
    },
    "description": {
      "pl": "Niestrudzony pionier przecierający szlaki w niezbadane rejony globu, odporny na trudy klimatu i nieznane zarazy.",
      "en": "A tireless pioneer blazing trails into uncharted territory, resilient against harsh climates and ancient hazards."
    },
    "coreCharacteristics": [
      "dex",
      "pow"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Nawigacja",
      "Sztuka Przetrwania",
      "Wspinaczka",
      "Archeologia",
      "Język Obcy",
      "Jeździectwo"
    ],
    "suggestedOccupations": [
      "Archeolog",
      "Podróżnik",
      "Kartograf",
      "Antropolog"
    ],
    "suggestedTalents": [
      "Żelazna Kondycja",
      "Bystry Wzrok",
      "Zahartowany"
    ],
    "suggestedTraits": [
      "zdeterminowany",
      "odważny",
      "hartowany",
      "ciekawy świata"
    ]
  },
  {
    "id": "beefcake",
    "name": {
      "pl": "Osiłek",
      "en": "Beefcake"
    },
    "description": {
      "pl": "Fizyczny tytan o potężnej muskulaturze, który pokonuje przeszkody siłą mięśni i z uśmiechem przyjmuje potężne ciosy.",
      "en": "A muscular powerhouse crushing obstacles through sheer physical brawn and taking heavy hits with a grin."
    },
    "coreCharacteristics": [
      "str"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Walka Wręcz",
      "Rzucanie",
      "Skakanie",
      "Zastraszanie",
      "Pływanie",
      "Wspinaczka"
    ],
    "suggestedOccupations": [
      "Bokser",
      "Robotnik",
      "Górnik",
      "Kaskader",
      "Ochroniarz"
    ],
    "suggestedTalents": [
      "Ciężarowiec",
      "Twardziel",
      "Pewna Postawa"
    ],
    "suggestedTraits": [
      "pewny siebie",
      "hałaśliwy",
      "prostolinijny",
      "lojalny"
    ]
  },
  {
    "id": "sidekick",
    "name": {
      "pl": "Pomagier",
      "en": "Sidekick"
    },
    "description": {
      "pl": "Niezawodny i wierny kompan wspierający lidera w każdej opresji, zawsze zjawiający się w odpowiednim momencie.",
      "en": "A loyal and resourceful companion standing shoulder-to-shoulder with mentors, ready when trouble strikes."
    },
    "coreCharacteristics": [
      "dex",
      "con"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Pierwsza Pomoc",
      "Mechanika",
      "Prowadzenie Samochodu",
      "Nasłuchiwanie",
      "Ukrywanie",
      "Unik"
    ],
    "suggestedOccupations": [
      "Kierowca",
      "Praktykant",
      "Fotograf",
      "Młody asystent"
    ],
    "suggestedTalents": [
      "Zaradność",
      "Szczęściarz",
      "Czujność"
    ],
    "suggestedTraits": [
      "pomocny",
      "sprytny",
      "oddany",
      "rezolutny"
    ]
  },
  {
    "id": "seeker",
    "name": {
      "pl": "Poszukiwacz prawdy",
      "en": "Seeker"
    },
    "description": {
      "pl": "Nieustępliwy tropiciel spisków i tajemnic, dla którego odkrycie prawdy jest ważniejsze niż własne bezpieczeństwo.",
      "en": "A relentless seeker of truth, tearing down conspiratorial veils regardless of peril or convenience."
    },
    "coreCharacteristics": [
      "int"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Dziennikarstwo",
      "Historia",
      "Bibliotekoznawstwo",
      "Psychologia",
      "Spostrzegawczość",
      "Fotografia"
    ],
    "suggestedOccupations": [
      "Dziennikarz śledczy",
      "Detektyw",
      "Prawnik",
      "Historyk"
    ],
    "suggestedTalents": [
      "Bystry Umysł",
      "Fotograficzna Pamięć",
      "Hart Ducha"
    ],
    "suggestedTraits": [
      "dociekliwy",
      "nieustraszony",
      "podejrzliwy",
      "uparty"
    ]
  },
  {
    "id": "daredevil",
    "name": {
      "pl": "Śmiałek",
      "en": "Daredevil"
    },
    "description": {
      "pl": "Szaleńczy kaskader igrający ze śmiercią, podejmujący najbardziej ryzykowne manewry dla samego dreszczu emocji.",
      "en": "A fearless stunt performer flirting with demise, executing insane feats purely for the electric rush."
    },
    "coreCharacteristics": [
      "dex",
      "pow"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Skakanie",
      "Unik",
      "Prowadzenie Samochodu",
      "Pilotowanie",
      "Wspinaczka",
      "Zwinne Dłonie"
    ],
    "suggestedOccupations": [
      "Pilot akrobata",
      "Kierowca wyścigowy",
      "Kaskader",
      "Treser drapieżników"
    ],
    "suggestedTalents": [
      "Niezwykła Zwinność",
      "Szczęściarz",
      "Szybkonogi"
    ],
    "suggestedTraits": [
      "brawurowy",
      "lekkomyślny",
      "żywy",
      "pogodny"
    ]
  },
  {
    "id": "hard_boiled",
    "name": {
      "pl": "Twarda sztuka",
      "en": "Hard Boiled"
    },
    "description": {
      "pl": "Doświadczony przez los twardziel o cynicznym spojrzeniu na świat, który widział już wszystko i nie daje się złamać.",
      "en": "A world-weary cynic who has witnessed every brand of grime and corruption, refusing to break."
    },
    "coreCharacteristics": [
      "con"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Broń Palna",
      "Walka Wręcz",
      "Psychologia",
      "Zastraszanie",
      "Spostrzegawczość",
      "Prawo"
    ],
    "suggestedOccupations": [
      "Prywatny detektyw",
      "Oficer policji",
      "Ochroniarz",
      "Dziennikarz kryminalny"
    ],
    "suggestedTalents": [
      "Twardziel",
      "Hart Ducha",
      "Czujność"
    ],
    "suggestedTraits": [
      "cyniczny",
      "nieugięty",
      "szorstki",
      "doświadczony"
    ]
  },
  {
    "id": "scholar",
    "name": {
      "pl": "Uczony",
      "en": "Scholar"
    },
    "description": {
      "pl": "Erudyta i autorytet akademicki, posiadający encyklopedyczną wiedzę o starożytnych cywilizacjach, językach i kulturach.",
      "en": "An erudite academic with encyclopedic mastery of ancient tongues, civilizations, and lost relics."
    },
    "coreCharacteristics": [
      "edu"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Historia",
      "Bibliotekoznawstwo",
      "Język Obcy",
      "Archeologia",
      "Nauka",
      "Okultyzm"
    ],
    "suggestedOccupations": [
      "Profesor",
      "Bibliotekarz",
      "Muzealnik",
      "Tłumacz"
    ],
    "suggestedTalents": [
      "Fotograficzna Pamięć",
      "Lingwista",
      "Pojętny Uczeń"
    ],
    "suggestedTraits": [
      "dystyngowany",
      "skupiony",
      "erudyta",
      "roztargniony"
    ]
  },
  {
    "id": "heavy",
    "name": {
      "pl": "Zabijaka",
      "en": "Heavy"
    },
    "description": {
      "pl": "Groźny wojownik i człowiek czynu, który najpierw uderza, a potem zadaje pytania, dominując wrogów brutalną siłą.",
      "en": "A dangerous brawler and enforcer who strikes first and asks questions never, dominating enemies with violence."
    },
    "coreCharacteristics": [
      "str",
      "siz"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Walka Wręcz",
      "Broń Palna",
      "Zastraszanie",
      "Rzucanie",
      "Unik",
      "Prowadzenie Samochodu"
    ],
    "suggestedOccupations": [
      "Goryl",
      "Weteran wojenny",
      "Zapaśnik",
      "Najemnik"
    ],
    "suggestedTalents": [
      "Ciężka Ręka",
      "Pewna Postawa",
      "Szybki Atak"
    ],
    "suggestedTraits": [
      "agresywny",
      "brutalny",
      "porywczy",
      "niebezpieczny"
    ]
  },
  {
    "id": "swashbuckler",
    "name": {
      "pl": "Zawadiaka",
      "en": "Swashbuckler"
    },
    "description": {
      "pl": "Rycerski i elegancki szermierz o nienagannych manierach, walczący z uśmiechem na ustach i popisujący się akrobatyką.",
      "en": "A chivalric and dashing duelist with impeccable flair, parrying foes with a smile and acrobatic bravado."
    },
    "coreCharacteristics": [
      "dex",
      "app"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Walka Wręcz",
      "Unik",
      "Skakanie",
      "Wspinaczka",
      "Urok Osobisty",
      "Jeździectwo"
    ],
    "suggestedOccupations": [
      "Aktor awanturniczy",
      "Mistrz fechtunku",
      "Oficer kawalerii",
      "Arystokrata"
    ],
    "suggestedTalents": [
      "Szybki Atak",
      "Niezwykła Zwinność",
      "Bajerant"
    ],
    "suggestedTraits": [
      "szarmancki",
      "efektowny",
      "dowcipny",
      "honorowy"
    ]
  },
  {
    "id": "grease_monkey",
    "name": {
      "pl": "Złota rączka",
      "en": "Grease Monkey"
    },
    "description": {
      "pl": "Mistrz mechaniki i improwizacji, potrafiący złożyć samolot z części ze złomowiska i naprawić każdy silnik pod ostrzałem.",
      "en": "A mechanical prodigy capable of repairing anything under gunfire and coaxing miracles from machines."
    },
    "coreCharacteristics": [
      "int"
    ],
    "coreCharacteristicBonus": 20,
    "bonusSkillPoints": 100,
    "bonusSkills": [
      "Mechanika",
      "Elektryka",
      "Obsługa Ciężkiego Sprzętu",
      "Ślusarstwo",
      "Prowadzenie Samochodu",
      "Nauka"
    ],
    "suggestedOccupations": [
      "Mechanik",
      "Kierowca",
      "Inżynier",
      "Kolejarz"
    ],
    "suggestedTalents": [
      "Majsterkowicz",
      "Gadżet",
      "Szalona Nauka"
    ],
    "suggestedTraits": [
      "praktyczny",
      "zaradny",
      "pracowity",
      "pomysłowy"
    ]
  }
];

export function getPulpArchetype(id: string): PulpArchetypeDefinition | undefined {
  return PULP_ARCHETYPES.find((a) => a.id === id);
}

export function getAllPulpArchetypes(): PulpArchetypeDefinition[] {
  return PULP_ARCHETYPES;
}
