/**
 * investigator-organizations.ts
 *
 * Kanoniczna baza 9 Stowarzyszeń Badaczy z Rozdziału 6 Podręcznika Badacza CoC 7ed (s. 117-139).
 * Organizacje stanowią diegetyczne zaplecze grupy Badaczy, zapewniając mecenat,
 * fundusze, schronienie, pomoc prawną, dostęp do zamkniętych archiwów oraz spójny cel śledztwa.
 *
 * @module investigator-organizations
 */

export interface OrganizationResources {
  funds: string;
  legal: string;
  facilities: string;
  contacts: string;
}

export interface InvestigatorOrganization {
  id: string;
  name: {
    pl: string;
    en: string;
  };
  tagline: {
    pl: string;
    en: string;
  };
  description: {
    pl: string;
    en: string;
  };
  memberProfile: {
    pl: string;
    en: string;
  };
  resources: {
    pl: OrganizationResources;
    en: OrganizationResources;
  };
  patronage: {
    pl: string;
    en: string;
  };
  suggestedOccupations: string[];
  suggestedConnections: {
    pl: string[];
    en: string[];
  };
  eraAvailability: string[];
}

export const INVESTIGATOR_ORGANIZATIONS: InvestigatorOrganization[] = [
  {
    id: 'the-cleaners',
    name: {
      pl: 'Czyściciele',
      en: 'The Cleaners',
    },
    tagline: {
      pl: 'Dyskretne sprzątanie po zjawiskach nadprzyrodzonych i eliminacja śladów Mitów',
      en: 'Covert supernatural cleanup and Mythos containment',
    },
    description: {
      pl: 'Zawiązane w 1917 r. w zrujnowanym Ypres przez sześciu weteranów I wojny światowej, którzy w podziemnej pieczarze odkryli potworności gorsze od samego konfliktu. Działają z ukrycia, bezlitośnie rugując zło Mitów z całego świata i zacierając ślady po spotkaniach z anomaliami.',
      en: 'Founded in 1917 amidst the ruins of Ypres by six WW1 veterans who encountered horrors far worse than war in an underground cavern. Operating from the shadows, they ruthlessly cleanse Mythos threats worldwide and eliminate biological evidence.',
    },
    memberProfile: {
      pl: 'Weterani wojenni, inżynierowie saperzy, lekarze polowi, oficerowie i zaufani specjaliści od zadań specjalnych.',
      en: 'Combat veterans, combat engineers, field medics, officers, and trusted specialists in hazardous disposal.',
    },
    resources: {
      pl: {
        funds: 'Umiarkowane fundusze kombatanckie i składkowe na bieżące operacje polowe.',
        legal: 'Dyskretna pomoc prawna poprzez znajomości w sądownictwie wojskowym i policji.',
        facilities: 'Bezpieczne meliny polowe, warsztaty chemiczne i zbrojownie saperskie.',
        contacts: 'Siatka weteranów Ententy, żandarmeria polowa, komitety kombatanckie.',
      },
      en: {
        funds: 'Moderate veterans pool and pooled stipends for active field logistics.',
        legal: 'Discreet legal interventions through military justice and police connections.',
        facilities: 'Field safe houses, chemical workshops, and demolition armories.',
        contacts: 'Entente veteran network, military police, and veterans associations.',
      },
    },
    patronage: {
      pl: 'Ukrywanie tożsamości, usuwanie ciał potworów i skażenia biologicznego, dostarczanie materiałów wybuchowych oraz transport wojskowy w sytuacjach kryzysowych.',
      en: 'Identity concealment, biological cleanup of monstrosities, field explosives supply, and military transport in emergency crises.',
    },
    suggestedOccupations: [
      'soldier',
      'military_officer',
      'engineer',
      'doctor',
      'clergy',
      'drifter',
    ],
    suggestedConnections: {
      pl: [
        'Wspólna służba w tym samym plutonie podczas Wielkiej Wojny',
        'Ocalenie z okopów pod Ypres lub Passchendaele',
        'Zwerbowany ekspert od chemii, balistyki lub medycyny polowej',
      ],
      en: [
        'Served in the same squad during the Great War',
        'Survived the trenches at Ypres or Passchendaele together',
        'Recruited specialist in field chemistry, ballistics, or trauma care',
      ],
    },
    eraAvailability: ['1920s', '1920s-poland', '1940s', 'modern'],
  },
  {
    id: 'wraths-circus',
    name: {
      pl: 'Cyrk Wratha (Cyrk osobliwości Cecila Wratha)',
      en: "Wrath's Circus (Wrath's Curiosities)",
    },
    tagline: {
      pl: 'Wędrowna trupa artystów i dziwolągów tropiąca mordercze kulty pod namiotem jarmarcznym',
      en: 'Traveling troupe of performers and oddities hunting murderous cults',
    },
    description: {
      pl: 'Objazdowy cyrk prowadzony przez Cecila Wratha. Gdy Kult Błękitnego Płatka Kwiatu złożył w ofierze jego żonę i dzieci, Wrath poprzysiągł krwawą zemstę. Zgromadził wokół siebie rodzinę odmieńców, którzy pod przykrywką pokazów infiltrują sekty i wymierzają sprawiedliwość.',
      en: 'A traveling curiosity circus led by Cecil Wrath. After the Cult of the Blue Petal sacrificed his family to an alien entity, Wrath swore vengeance, assembling a tight-knit family of outcasts who infiltrate cults under the cover of carnival performances.',
    },
    memberProfile: {
      pl: 'Akrobaci, treserzy dzikich zwierząt, połykacze ognia, magicy estradowi, siłacze i ludzie z marginesu społecznego.',
      en: 'Acrobats, beast tamers, fire-eaters, stage magicians, strongmen, and fringe outcasts.',
    },
    resources: {
      pl: {
        funds: 'Zmienne dochody z biletów jarmarcznych oraz ukryty fundusz osobisty Cecila Wratha.',
        legal: 'Brak oficjalnych prawników - kamuflaż wędrownego taboru i ciągły ruch uniemożliwiający namierzenie.',
        facilities: 'Tabor wozów mieszkalnych, klatki menażerii, namiot cyrkowy i warsztaty rekwizytów.',
        contacts: 'Lokalne jarmarki, robotnicy kolejowi, właściciele gruntów, półświatek estradowy.',
      },
      en: {
        funds: 'Variable carnival ticket revenues and Cecil Wrath private reserve fund.',
        legal: 'No official legal retainer - continuous mobile movement and carnival camouflage.',
        facilities: 'Caravan of living wagons, animal menagerie, big top tent, and prop workshops.',
        contacts: 'Fairground organizers, railway workers, rural landowners, vaudeville circles.',
      },
    },
    patronage: {
      pl: 'Natychmiastowa ucieczka z miasta w wozach cyrkowych, fałszywa tożsamość artysty, bezpieczny azyl w taborze oraz fizyczne wsparcie trupy i wytresowanych bestii.',
      en: 'Rapid escape from towns via circus convoy, traveling performer covers, sanctuary in the wagons, and physical muscle or trained animals in combat.',
    },
    suggestedOccupations: [
      'acrobat',
      'entertainer',
      'athlete',
      'criminal',
      'animal_trainer',
      'musician',
      'laborer',
      'drifter',
    ],
    suggestedConnections: {
      pl: [
        'Przygarnięty uciekinier ze szpecącymi bliznami po rytuale',
        'Treser zwierząt chroniący menażerię cyrkową',
        'Artysta estradowy szukający odwetu na sekcie, która zniszczyła mu życie',
      ],
      en: [
        'Rescued runaway bearing ritual scarring',
        'Animal handler safeguarding the menagerie',
        'Stage performer seeking retribution against the cult that ruined their life',
      ],
    },
    eraAvailability: ['1890s', '1920s', '1920s-poland', '1940s'],
  },
  {
    id: 'curious-news',
    name: {
      pl: 'Ciekawe Wieści (Tygodnik „Dziwne, ale prawdziwe!”)',
      en: 'Curious News ("Strange But True!" Weekly)',
    },
    tagline: {
      pl: 'Tabloid i prasa sensacyjna tropiąca anomalie oraz zjawiska nadprzyrodzone',
      en: 'Sensationalist tabloid investigating paranormal occurrences and anomalies',
    },
    description: {
      pl: 'Tygodnik prowadzony przez Elijaha Cleavera pod dewizą „Piszemy wyłącznie prawdę!”. Choć powszechnie uważany za tani brukowiec, dla wtajemniczonych stanowi bezcenne źródło faktów o Mitach. Utrzymuje armię niezależnych reporterów badających makabryczne zdarzenia w całym kraju.',
      en: 'A weekly tabloid directed by Elijah Cleaver under the motto "We print only the truth!". Regarded by mainstream society as sensationalist gossip, it serves the initiated as an invaluable intelligence source on the Mythos, fielding independent correspondents.',
    },
    memberProfile: {
      pl: 'Dociekliwi dziennikarze, fotografowie śledczy, autorzy kryminałów, parapsycholodzy i prywatni detektywi.',
      en: 'Tenacious journalists, photojournalists, crime authors, parapsychologists, and private investigators.',
    },
    resources: {
      pl: {
        funds: 'Zaliczki redakcyjne, diety podróżne i honoraria za sensacyjne artykuły.',
        legal: 'Prawnicy wydawnictwa chroniący tajemnicę dziennikarską i wolność prasy.',
        facilities: 'Archiwum wycinków prasowych, ciemnia fotograficzna, dostęp do dalekopisów.',
        contacts: 'Korespondenci lokalni, drukarze, skorumpowani urzędnicy ratusza, pracownicy telegrafu.',
      },
      en: {
        funds: 'Editorial expense advances, travel per diems, and feature story bounties.',
        legal: 'Publishing house attorneys defending shield laws and journalistic privilege.',
        facilities: 'Morgue clipping archives, darkroom facilities, and wire service teletypes.',
        contacts: 'Local stringers, printers, city hall clerks, and telegraph operators.',
      },
    },
    patronage: {
      pl: 'Legitymacje prasowe ułatwiające wejście za kordony policji, dostęp do archiwów prasowych, publikacja demaskatorskich artykułów jako nacisk na władze oraz diety śledcze.',
      en: 'Press passes bypassing police blockades, deep morgue archive searches, public exposure pressure against corrupt institutions, and investigative funding.',
    },
    suggestedOccupations: [
      'journalist',
      'photographer',
      'author',
      'private_investigator',
      'professor',
      'parapsychologist',
      'salesperson',
    ],
    suggestedConnections: {
      pl: [
        'Reporter terenowy z umową na wyłączność z redakcją Cleavera',
        'Fotograf polujący na namacalne dowody istnienia zjawisk nadnaturalnych',
        'Prywatny detektyw zatrudniany do spraw zbyt niebezpiecznych dla prasy',
      ],
      en: [
        'Freelance investigative reporter on retainer with Cleaver',
        'Staff photographer hunting physical proof of anomalous occurrences',
        'Retained detective handling matters too hazardous for print',
      ],
    },
    eraAvailability: ['1890s', '1920s', '1920s-poland', 'modern'],
  },
  {
    id: 'precinct-13-south',
    name: {
      pl: 'Rewir 13. Południowy',
      en: 'Precinct 13 South',
    },
    tagline: {
      pl: 'Nieoficjalne sprzysiężenie detektywów i policjantów z tajnym archiwum spraw nadprzyrodzonych',
      en: 'Unofficial brotherhood of beat cops and detectives with a covert occult archive',
    },
    description: {
      pl: 'Zrodzone z szokującego odkrycia w piwnicy kamienicy przy 14. Ulicy Wschodniej na nowojorskim Manhattanie. Czwórka policjantów zrozumiała, że kodeksy karne nie chronią przed grozą Mitów. Działają poza oficjalnym protokołem, wykorzystując policyjne uprawnienia do niszczenia kultów.',
      en: 'Born from a horrifying discovery in an East 14th Street basement in Manhattan. Four officers recognized that conventional laws cannot restrain Mythos horrors. They operate off the record, using police authority and street presence to crush cults.',
    },
    memberProfile: {
      pl: 'Policjanci mundurowi, detektywi wydziału zabójstw, przewodnicy psów służbowych, prawnicy i zaufani informatorzy.',
      en: 'Patrol officers, homicide detectives, K-9 handlers, prosecutors, and vetted street informants.',
    },
    resources: {
      pl: {
        funds: 'Fundusze z policyjnych konfiskat, zbiórki koleżeńskie i fundusz operacyjny rewiru.',
        legal: 'Odznaki służbowe, immunitet policyjny, znajomości w prokuraturze i areszcie miejskim.',
        facilities: 'Zbrojownia posterunku, cele aresztu, policyjne archiwum dowodów rzeczowych.',
        contacts: 'Informatorzy uliczni, lekarze medycyny sądowej, patrole miejskie, dyżurni telegrafu.',
      },
      en: {
        funds: 'Seized contraband funds, precinct fraternal pools, and discretionary operational cash.',
        legal: 'Badges, official immunity, prosecutorial contacts, and municipal jail access.',
        facilities: 'Precinct armory, holding cells, and secured impound evidence lockers.',
        contacts: 'Street snitches, medical examiners, city beat patrols, and police dispatchers.',
      },
    },
    patronage: {
      pl: 'Legalny dostęp do miejsc zbrodni i prosektoriów, umarzanie drobnych zarzutów, wyciąganie z aresztu za poręczeniem, broń służbowa i radiowozy w sytuacjach zagrożenia.',
      en: 'Official crime scene and morgue access, dismissal of minor infractions, immediate bail release, police sidearms, and squad car backup.',
    },
    suggestedOccupations: [
      'police_officer',
      'police_detective',
      'private_investigator',
      'criminal',
      'lawyer',
      'drifter',
    ],
    suggestedConnections: {
      pl: [
        'Partner z tego samego patrolu na niebezpiecznym rewirze',
        'Uliczny informator ocalony przed bezprawnym linczem kultu',
        'Prywatny śledczy współpracujący przy sprawach niewygodnych dla komendanta',
      ],
      en: [
        'Patrol partner from the same precinct detail',
        'Street informant rescued from cult reprisal',
        'Private investigator hired for inquiries off the commissioner radar',
      ],
    },
    eraAvailability: ['1920s', '1920s-poland', '1940s', 'modern'],
  },
  {
    id: 'pfu-research-units',
    name: {
      pl: 'Dział Badań SPWiP / PFU (Prywatny Fundusz Ubezpieczeń)',
      en: 'PFU Research Units (Private Insurance & Knowledge Foundation)',
    },
    tagline: {
      pl: 'Likwidatorzy szkód, rzeczoznawcy i jednostki badawcze korporacji ubezpieczeniowej',
      en: 'Loss adjusters, claims investigators, and corporate field research units',
    },
    description: {
      pl: 'Stowarzyszenie Poszukiwaczy Wiedzy i Prawdy (we współczesności: Jednostki Badawcze Prywatnego Funduszu Ubezpieczeń). Potężna instytucja wysyłająca ekspertów tam, gdzie podejrzane roszczenia majątkowe i katastrofy kryją niewytłumaczalne zjawiska, pozyskując rzadkie okazy i technologie.',
      en: 'The Society of Seekers of Knowledge and Truth (modern: Private Insurance Fund Research Units). A well-funded institution dispatching specialist teams where catastrophic claims intersect with the anomalous, securing rare specimens and technology.',
    },
    memberProfile: {
      pl: 'Likwidatorzy szkód, rzeczoznawcy majątkowi, inżynierowie, toksykolodzy, biolodzy i prawnicy korporacyjni.',
      en: 'Claims adjusters, forensic appraisers, engineers, toxicologists, field biologists, and corporate attorneys.',
    },
    resources: {
      pl: {
        funds: 'Wysokie budżety korporacyjne, nieograniczone konta delegacyjne i fundusz odszkodowawczy.',
        legal: 'Dedykowana kancelaria prawna, klauzule poufności (NDA) i ochrona korporacyjna.',
        facilities: 'Nowoczesne laboratoria analityczne, magazyny próbek, sprzęt telemetryczny i pomiarowy.',
        contacts: 'Zarządy portów, rzeczoznawcy celni, brokerzy ubezpieczeniowi, instytuty politechniczne.',
      },
      en: {
        funds: 'Substantial corporate allocations, corporate credit lines, and settlement contingency reserves.',
        legal: 'In-house legal department, strict non-disclosure agreements, and corporate legal shields.',
        facilities: 'State-of-the-art analytical labs, sample vaults, telemetry instruments, and sensor arrays.',
        contacts: 'Port authorities, customs appraisers, maritime brokers, and polytechnic institutes.',
      },
    },
    patronage: {
      pl: 'Pełne pokrycie kosztów podróży i ekspertyz laboratoryjnych, ochrona prawna przed pozwami cywilnymi, tuszowanie incydentów jako roszczenia ubezpieczeniowe i fundusz kaucji.',
      en: 'Comprehensive travel and laboratory analysis funding, civil liability defense, reclassifying incidents as confidential claims settlements, and bail bonds.',
    },
    suggestedOccupations: [
      'scientist',
      'engineer',
      'doctor',
      'accountant',
      'lawyer',
      'antiquarian',
      'technician',
    ],
    suggestedConnections: {
      pl: [
        'Likwidator szkód i naukowiec skierowani do wspólnej ekspertyzy terenowej',
        'Niezależny rzeczoznawca sztuki na stałym kontrakcie z funduszem',
        'Inżynier badający anomalousne awarie konstrukcyjne fabryk i magazynów',
      ],
      en: [
        'Claims adjuster and consulting chemist assigned to field analysis',
        'Independent antiquities appraiser under institutional retainer',
        'Forensic engineer inspecting structural failures in industrial plants',
      ],
    },
    eraAvailability: ['1920s', '1920s-poland', 'modern'],
  },
  {
    id: 'novem-angelus',
    name: {
      pl: 'Novem Angelus',
      en: 'Novem Angelus',
    },
    tagline: {
      pl: 'Tajemniczy krąg zamożnych okultystów, filantropów i mecenasów badań nad Mitami',
      en: 'Discreet circle of patrician occultists, philanthropists, and Mythos patrons',
    },
    description: {
      pl: 'Działająca od ponad dwustu lat arystokratyczna organizacja dobroczynna skupiająca najbogatsze rody. Novem Angelus od pokoleń zna prawdę o Przedwiecznych. Finansuje ekspedycje, skupuje zakazane księgi i roztacza ochronę nad badaczami, używając rodowych fortun i wpływów politycznych.',
      en: 'An exclusive philanthropic fellowship active for over two centuries, founded by wealthy dynasties. Fully aware of cosmic truths, Novem Angelus finances expeditions, acquires forbidden grimoires, and shields scholars using dynastic wealth and political clout.',
    },
    memberProfile: {
      pl: 'Diletanci, arystokraci, mecenasi sztuki, kuratorzy muzealni, archeolodzy i uczeni pod patronatem fundacji.',
      en: 'Dilettantes, patricians, art patrons, museum trustees, archaeologists, and sponsored fellows.',
    },
    resources: {
      pl: {
        funds: 'Wielomilionowy kapitał fundacji, prywatne czeki i nieograniczona płynność finansowa.',
        legal: 'Najlepsze kancelarie adwokackie, immunitety dyplomatyczne, bezpośredni dostęp do ministrów.',
        facilities: 'Luksusowe rezydencje miejskie, prywatne gabinety osobliwości, chronione biblioteki okultystyczne.',
        contacts: 'Rządy, ambasady, domy aukcyjne (Sotheby, Christie), dyrektorzy muzeów narodowych.',
      },
      en: {
        funds: 'Multi-million foundation endowment, unlimited disbursements, and sovereign liquid reserves.',
        legal: 'Preeminent white-shoe law firms, diplomatic connections, and cabinet-level access.',
        facilities: 'Private townhouses, secure curiosity cabinets, and fortified occult libraries.',
        contacts: 'State departments, embassies, premier auction houses, and national museum directors.',
      },
    },
    patronage: {
      pl: 'Finansowanie kosztownych badań i wypraw, prywatne limuzyny i jachty, opłacenie najlepszych adwokatów w kraju oraz wejściówki do zastrzeżonych archiwów (Watykan, British Museum).',
      en: 'Full underwriting of hazardous expeditions, private transit via yachts and aircraft, top-tier legal defense, and VIP credentials to restricted global archives.',
    },
    suggestedOccupations: [
      'dilettante',
      'author',
      'professor',
      'archaeologist',
      'antiquarian',
      'artist',
      'spy',
    ],
    suggestedConnections: {
      pl: [
        'Stypendysta badawczy finansowany ze środków loży Novem Angelus',
        'Zaufany kurator rodzinnej kolekcji starożytności arystokraty',
        'Dalszy krewny wprowadzony do salonu i zaznajomiony z tajemnicą',
      ],
      en: [
        'Research fellow funded by a Novem Angelus endowment grant',
        'Trusted curator of an ancestral antiquities collection',
        'Inducted family relation brought into the inner circle',
      ],
    },
    eraAvailability: ['1890s', '1920s', '1920s-poland', '1940s', 'modern'],
  },
  {
    id: 'ratcheds-children',
    name: {
      pl: 'Dziatwa Ratched',
      en: "Ratched's Children",
    },
    tagline: {
      pl: 'Ocaleni pacjenci i personel azylu psychiatrycznego wspierający ofiary szaleństwa',
      en: 'Survivor network of asylum patients and staff providing psychic sanctuary',
    },
    description: {
      pl: 'Sprzysiężenie zrodzone w murach Azylu w Arkham. Pacjenci uznani za obłąkanych po zetknięciu z Mitami oraz współczujący personel medyczny utworzyli podziemną sieć. Pomagają ofiarom załamań nerwowych, uciekinierom z zakładów i tropią anomalie, które zrujnowały ich psychikę.',
      en: 'A brotherhood conceived behind the gates of Arkham Asylum. Patients branded insane after encountering the Mythos, joined by sympathetic medical staff, formed a covert network. They aid trauma survivors, assist escapees, and confront horrors that broke their minds.',
    },
    memberProfile: {
      pl: 'Byli pacjenci po kontakcie z Mitami, alieniści, pielęgniarki, sanitariusze, artyści i psycholodzy.',
      en: 'Asylum survivors of Mythos trauma, alienists, psychiatric nurses, orderlies, artists, and psychologists.',
    },
    resources: {
      pl: {
        funds: 'Skromne zbiórki pacjentów, dorywcze prace i pomoc życzliwych darczyńców.',
        legal: 'Ochrona przed ubezwłasnowolnieniem, fałszowanie kartotek medycznych i zaświadczeń zdrowia.',
        facilities: 'Prywatne pokoje w bezpiecznych pensjonatach, schronienia w opuszczonych skrzydłach szpitali.',
        contacts: 'Salowi, aptekarze, lekarze z prywatną praktyką, pracownicy opieki społecznej.',
      },
      en: {
        funds: 'Modest survivor tithes, odd jobs, and discrete gifts from sympathetic allies.',
        legal: 'Protection from involuntary commitment, forged sanity discharges, and medical record alteration.',
        facilities: 'Private quiet rooms in trusted boarding houses, abandoned sanatorium quarters.',
        contacts: 'Asylum orderlies, pharmacists, private psychiatrists, and social caseworkers.',
      },
    },
    patronage: {
      pl: 'Natychmiastowe schronienie psychiatryczne w bezpiecznej klinice, łagodzenie ataków szaleństwa, fałszywe zaświadczenia o poczytalności oraz zapobieganie aresztowaniu przez policję.',
      en: 'Emergency psychiatric refuge, reality-testing guidance during bouts of madness, counterfeit sanity papers, and shielding from police containment.',
    },
    suggestedOccupations: [
      'alienist',
      'nurse',
      'doctor',
      'psychologist',
      'drifter',
      'artist',
      'clergy',
    ],
    suggestedConnections: {
      pl: [
        'Towarzysz z tej samej sali Azylu w Arkham leczący traumę po spotkaniu z potworem',
        'Pielęgniarka lub salowy, który umożliwił ucieczkę i fałszował raporty medyczne',
        'Alienista badający przypadki masowej histerii wywołanej przez kulty',
      ],
      en: [
        'Ward mate from Arkham Asylum recovering from cosmic trauma',
        'Nurse or orderly who facilitated escape and falsified charts',
        'Alienist documenting outbreaks of cult-induced psychological contagion',
      ],
    },
    eraAvailability: ['1920s', '1920s-poland', '1940s', 'modern'],
  },
  {
    id: 'the-seekers',
    name: {
      pl: 'Poszukiwacze (Zmartwychwstańcy)',
      en: 'The Seekers (The Resurrected)',
    },
    tagline: {
      pl: 'Akademicy i badacze pradawnych rytuałów ścigający zdradziecką „Trójkę”',
      en: 'Scholars of elder arcana hunting the traitorous Three across decades',
    },
    description: {
      pl: 'Założeni w 1926 r. przez okultystów badających zakazane tomy. Gdy odłam grupy przeprowadził samowolny rytuał przywołania, zginęła większość członków, a trzech ocalałych stało się sługami Przedwiecznych. Pozostali przy życiu założyciele zawarli pakt, użyli zaklęcia Wskrzeszenia i jako nieśmiertelni Zmartwychwstańcy tropią zdrajców.',
      en: 'Formed in 1926 by scholars deciphering forbidden tomes. When a rogue faction enacted an unauthorized summoning, devastation followed; three survivors became emissaries of Outer Gods. The remaining founders used the Resurrection spell, operating across decades to hunt the Three.',
    },
    memberProfile: {
      pl: 'Okultyści, archeolodzy, handlarze antykami, profesorowie, lingwiści, szpiedzy i poszukiwacze wiedzy.',
      en: 'Occultists, archaeologists, antiquarians, professors, linguists, spies, and esoteric researchers.',
    },
    resources: {
      pl: {
        funds: 'Historyczne zasoby rodowe, dochody ze sprzedaży rzadkich artefaktów i prywatne fundusze.',
        legal: 'Dyskretni notariusze prowadzący fundusze powiernicze i depozyty wieczyste.',
        facilities: 'Tajne skarbce biblioteczne, prywatne czytelnie manuskryptów, pracownie alchemiczne.',
        contacts: 'Kolekcjonerzy białych kruków, tłumacze martwych języków, kustosze muzeów archeologicznych.',
      },
      en: {
        funds: 'Centuries-old family assets, rare antiquities liquidation, and discreet trust stipends.',
        legal: 'Discreet solicitors managing century-long trusts and private testaments.',
        facilities: 'Secret vault libraries, private manuscript study rooms, and alchemical ateliers.',
        contacts: 'Rare book bibliophiles, dead language decipherers, and archaeological curators.',
      },
    },
    patronage: {
      pl: 'Tłumaczenie starożytnych hieroglifów i zwojów, wskazówki dotyczące rytuałów odpędzania bytów, ratunek w stanie agonalnym (Wskrzeszenie w ostateczności) oraz dostęp do starych tomów.',
      en: 'Translation of archaic scripts and dead languages, warding ritual knowledge, emergency recovery through esoteric means, and access to rare grimoires.',
    },
    suggestedOccupations: [
      'occultist',
      'antiquarian',
      'archaeologist',
      'author',
      'librarian',
      'professor',
      'private_investigator',
    ],
    suggestedConnections: {
      pl: [
        'Lingwista zatrudniony do przekładu fragmentów zaginionego manuskryptu',
        'Tropiciel antyków poszukujący skradzionych z biblioteki ksiąg',
        'Uczeń jednego ze Zmartwychwstałych wtajemniczony w misję neutralizacji „Trójki”',
      ],
      en: [
        'Linguist commissioned to transcribe passages from a lost manuscript',
        'Antiquities tracker hunting stolen grimoires across Europe and America',
        'Apprentice to one of the Resurrected inducted into the hunt for the Three',
      ],
    },
    eraAvailability: ['1920s', '1920s-poland', 'modern'],
  },
  {
    id: 'society-exploration-unexplained',
    name: {
      pl: 'Stowarzyszenie Eksploracji Niewyjaśnionego',
      en: 'Society for the Exploration of the Unexplained',
    },
    tagline: {
      pl: 'Wiktoriańsko-nowoczesne towarzystwo naukowe z Uniwersytetu Miskatonic w Arkham',
      en: 'Victorian-modern scientific fellowship based at Miskatonic University in Arkham',
    },
    description: {
      pl: 'Założone w 1889 r. przez profesorów Uniwersytetu Miskatonic w Arkham. Grupa spotyka się raz w miesiącu w Prywatnej Czytelni Biblioteki Orne’a. Prowadzą rzetelne badania naukowe, wspierają policję w dziwnych sprawach i delegują interdyscyplinarne zespoły śledcze do zbadania anomalii.',
      en: 'Founded in 1889 by Miskatonic University professors in Arkham. The society convenes monthly in the Orne Library Private Reading Room. They apply scientific rigor to anomalies, assist police with bizarre cases, and dispatch interdisciplinary investigation teams.',
    },
    memberProfile: {
      pl: 'Profesorowie akademiccy, naukowcy, bibliotekarze, lekarze medycyny sądowej, archeolodzy i kustosze.',
      en: 'Academic professors, natural scientists, librarians, forensic physicians, archaeologists, and curators.',
    },
    resources: {
      pl: {
        funds: 'Granty naukowe Uniwersytetu Miskatonic, dotacje mecenasów i fundusze wyprawowe.',
        legal: 'Oficjalne poparcie rektoratu, legitymacje akademickie i autorytet naukowy.',
        facilities: 'Prywatna Czytelnia Biblioteki Orne’a, laboratoria uniwersyteckie, zbiory okazów.',
        contacts: 'Władze uniwersyteckie, policja stanowa Massachusetts, towarzystwa naukowe w Europie i USA.',
      },
      en: {
        funds: 'Miskatonic University research grants, private donor endowments, and expedition funds.',
        legal: 'Official faculty support, university credentials, and scholarly prestige.',
        facilities: 'Orne Library Private Reading Room, university laboratories, and specimen archives.',
        contacts: 'University administration, Massachusetts State Police, and transatlantic scientific academies.',
      },
    },
    patronage: {
      pl: 'Przepustki do Zbiorów Specjalnych Biblioteki Orne’a (w tym Necronomiconu), uniwersyteckie analizy laboratoryjne (toksykologia, chemia), listy polecające od rektora oraz legitymizacja naukowa.',
      en: 'Restricted access passes to Orne Library Special Collections (including the Necronomicon), university laboratory testing, presidential letters of introduction, and academic prestige.',
    },
    suggestedOccupations: [
      'professor',
      'scientist',
      'librarian',
      'archaeologist',
      'doctor',
      'antiquarian',
      'author',
    ],
    suggestedConnections: {
      pl: [
        'Kolega z wydziału lub dawny asystent profesora ze Stowarzyszenia',
        'Konsultant terenowy zapraszany na comiesięczne posiedzenia w Bibliotece Orne’a',
        'Młody pracownik naukowy delegowany do zbadania lokalnego fenomenu',
      ],
      en: [
        'Faculty colleague or former research assistant of a founding chair',
        'Field consultant invited to monthly meetings in the Orne Library',
        'Junior scholar commissioned to examine an anomalous regional occurrence',
      ],
    },
    eraAvailability: ['1890s', '1920s', '1920s-poland', 'modern'],
  },
];

/**
 * Zwraca stowarzyszenie na podstawie identyfikatora lub nazwy (lub undefined gdy brak).
 */
export function getInvestigatorOrganization(
  idOrName: string
): InvestigatorOrganization | undefined {
  const norm = idOrName.toLowerCase().trim();
  if (norm === 'spwip-pfu' || norm === 'spwip' || norm === 'pfu') {
    return INVESTIGATOR_ORGANIZATIONS.find((org) => org.id === 'pfu-research-units');
  }
  return INVESTIGATOR_ORGANIZATIONS.find(
    (org) =>
      org.id === norm ||
      org.name.pl.toLowerCase() === norm ||
      org.name.en.toLowerCase() === norm ||
      org.name.pl.toLowerCase().startsWith(norm) ||
      org.name.en.toLowerCase().startsWith(norm)
  );
}

/**
 * Zwraca stowarzyszenia dostępne dla danej epoki.
 */
export function getOrganizationsForEra(
  era?: string
): InvestigatorOrganization[] {
  if (!era) return INVESTIGATOR_ORGANIZATIONS;
  const norm = era.toLowerCase().trim();
  return INVESTIGATOR_ORGANIZATIONS.filter(
    (org) =>
      org.eraAvailability.includes(norm) ||
      (norm.startsWith('1920') && org.eraAvailability.includes('1920s'))
  );
}

/**
 * Buduje sekcję promptu Mistrza Gry opisującą mecenat i zasoby Stowarzyszenia Badaczy.
 */
export function buildOrganizationPromptSection(
  orgIdOrOrg: string | InvestigatorOrganization,
  locale: 'pl' | 'en' = 'pl'
): string {
  const org =
    typeof orgIdOrOrg === 'string'
      ? getInvestigatorOrganization(orgIdOrOrg)
      : orgIdOrOrg;

  if (!org) return '';

  const isEn = locale === 'en';
  const name = isEn ? org.name.en : org.name.pl;
  const tagline = isEn ? org.tagline.en : org.tagline.pl;
  const desc = isEn ? org.description.en : org.description.pl;
  const res = isEn ? org.resources.en : org.resources.pl;
  const patronage = isEn ? org.patronage.en : org.patronage.pl;

  if (isEn) {
    return (
      `\n## INVESTIGATOR ORGANIZATION & PATRONAGE: ${name.toUpperCase()}\n` +
      `The investigator team operates under the backing of ${name} (${tagline}).\n` +
      `- Background: ${desc}\n` +
      `- Resources: Funds: ${res.funds} | Legal: ${res.legal} | Facilities: ${res.facilities} | Network: ${res.contacts}\n` +
      `- Institutional Patronage: ${patronage}\n` +
      `- Keeper Guideline: Leverage this organization as diegetic support (bail, medical sanctuary, archive credentials, specialist backup). In return, the patron expects regular dispatches, discretion, and loyalty to the mission.`
    );
  }

  return (
    `\n## STOWARZYSZENIE BADACZY I MECENAT: ${name.toUpperCase()}\n` +
    `Drużyna Badaczy działa pod auspicjami organizacji: ${name} (${tagline}).\n` +
    `- Tło organizacji: ${desc}\n` +
    `- Zasoby: Fundusze: ${res.funds} | Pomoc prawna: ${res.legal} | Zaplecze: ${res.facilities} | Kontakty: ${res.contacts}\n` +
    `- Mecenat w kryzysie: ${patronage}\n` +
    `- Wytyczna dla MG: Wykorzystuj organizację jako diegetyczne wsparcie Badaczy (kaucja, pomoc medyczna, wstęp do archiwów, zaplecze analityczne). W zamian mecenas oczekuje regularnych meldunków ze śledztwa, dyskrecji i wierności celom grupy.`
  );
}
