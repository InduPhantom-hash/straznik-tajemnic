// Enhanced Character Templates based on CoC7 Keeper's Rulebook
// Rozbudowane szablony postaci z szczegółowymi informacjami historycznymi

export interface EnhancedCharacterTemplate {
  name: string;
  description: string;
  era: '1920s' | '1930s' | 'modern';
  socialClass: 'working' | 'middle' | 'upper';
  
  // Statystyki sugerowane
  suggestedStats: {
    str: number; dex: number; con: number; app: number;
    pow: number; edu: number; siz: number; int: number; luck: number;
  };
  
  // Punkty umiejętności zawodowych (EDU × 4)
  occupationalSkillPoints: string; // Formula like "EDU × 4"
  
  // Umiejętności zawodowe (obowiązkowe)
  occupationalSkills: string[];
  
  // Sugerowane wartości umiejętności
  suggestedSkills: { [key: string]: number };
  
  // Majętność (status ekonomiczny)
  creditRating: { min: number; max: number };
  
  // Tło historyczne i motywacje
  backgroundPrompts: string[];
  personalityTraits: string[];
  motivations: string[];
  connections: string[];
  
  // Typowy ekwipunek dla epoki
  equipmentSuggestions: string[];
  
  // Kontekst historyczny
  historicalContext: {
    socialStatus: string;
    typicalIncome: string;
    workingConditions: string;
    socialExpectations: string;
  };
  
  // Przykładowe imiona dla epoki
  suggestedNames: {
    male: string[];
    female: string[];
    surnames: string[];
  };
}

export const enhancedCharacterTemplates: { [key: string]: EnhancedCharacterTemplate } = {
  'Antykwariusz': {
    name: 'Antykwariusz',
    description: 'Znawca i handlarz starych przedmiotów, książek i dzieł sztuki',
    era: '1920s',
    socialClass: 'middle',
    
    suggestedStats: {
      str: 50, dex: 60, con: 50, app: 60, pow: 65, edu: 75, siz: 50, int: 75, luck: 55
    },
    
    occupationalSkillPoints: "EDU × 4",
    
    occupationalSkills: [
      'Korzystanie z Bibliotek',
      'Historia', 
      'Język Obcy',
      'Spostrzegawczość',
      'Sztuka/Rzemiosło',
      'Wycena',
      'Jedna umiejętność interpersonalna (Gadanina, Perswazja, Urok Osobisty, Zastraszanie)',
      'Jedna umiejętność wybrana przez gracza'
    ],
    
    suggestedSkills: {
      'Korzystanie z Bibliotek': 65,
      'Historia': 60,
      'Język Obcy': 45,
      'Spostrzegawczość': 55,
      'Sztuka/Rzemiosło': 50,
      'Wycena': 55,
      'Perswazja': 45,
      'Archeologia': 40,
      'Mity Cthulhu': 25,
      'Okultyzm': 35
    },
    
    creditRating: { min: 30, max: 70 },
    
    backgroundPrompts: [
      'Jak zacząłeś swoją karierę jako antykwariusz?',
      'Jaki najcenniejszy przedmiot kiedykolwiek znalazłeś?',
      'Czy kiedykolwiek natrafiłeś na coś... niepokojącego?',
      'Skąd czerpiesz swoją wiedzę o starożytnościach?',
      'Kto są twoi najważniejsi klienci lub dostawcy?'
    ],
    
    personalityTraits: [
      'Dociekliwy i analityczny',
      'Ostrożny w ocenie wartości',
      'Fascynuje się historią',
      'Ma oko do detali',
      'Ceni autentyczność ponad wszystko'
    ],
    
    motivations: [
      'Odkrywanie zaginionych skarbów przeszłości',
      'Zachowanie dziedzictwa kulturowego',
      'Zysk z handlu antykami',
      'Zaspokojenie ciekawości historycznej',
      'Budowanie reputacji eksperta'
    ],
    
    connections: [
      'Muzealnicy i kuratorzy',
      'Bogaci kolekcjonerzy',
      'Profesorowie uniwersyteccy',
      'Podróżnicy i poszukiwacze przygód',
      'Właściciele domów aukcyjnych'
    ],
    
    equipmentSuggestions: [
      'Lupa jewellera',
      'Zestaw narzędzi do czyszczenia',
      'Katalogi aukcyjne',
      'Książki referencyjne',
      'Elegancki garnitur',
      'Wizytówki',
      'Notatnik i pióro',
      'Mała suma gotówki na zakupy'
    ],
    
    historicalContext: {
      socialStatus: 'Klasa średnia, szanowany w kręgach intelektualnych',
      typicalIncome: '$2000-4000 rocznie (lata 20.)',
      workingConditions: 'Praca w sklepie, podróże za antykami, kontakt z klientami',
      socialExpectations: 'Oczekiwano znajomości historii, kultury i dobrych manier'
    },
    
    suggestedNames: {
      male: ['Edmund', 'Reginald', 'Archibald', 'Percival', 'Mortimer', 'Algernon'],
      female: ['Millicent', 'Cordelia', 'Beatrice', 'Eugenia', 'Constance', 'Prudence'],
      surnames: ['Ashworth', 'Blackwood', 'Fairfax', 'Pemberton', 'Whitmore', 'Thornfield']
    }
  },

  'Detektyw': {
    name: 'Detektyw Policyjny',
    description: 'Doświadczony śledczy policyjny specjalizujący się w skomplikowanych sprawach',
    era: '1920s',
    socialClass: 'working',
    
    suggestedStats: {
      str: 65, dex: 65, con: 60, app: 55, pow: 70, edu: 65, siz: 60, int: 75, luck: 50
    },
    
    occupationalSkillPoints: "EDU × 4",
    
    occupationalSkills: [
      'Sztuka/Rzemiosło (Fotografia)',
      'Broń Palna',
      'Prawo',
      'Korzystanie z Bibliotek',
      'Nasłuchiwanie',
      'Spostrzegawczość',
      'Psychologia',
      'Jedna umiejętność interpersonalna (Gadanina, Perswazja, Urok Osobisty, Zastraszanie)'
    ],
    
    suggestedSkills: {
      'Spostrzegawczość': 70,
      'Psychologia': 55,
      'Broń Palna': 60,
      'Broń Palna (Krótka)': 65,
      'Perswazja': 50,
      'Zastraszanie': 45,
      'Prawo': 40,
      'Nasłuchiwanie': 60,
      'Tropienie': 45,
      'Prowadzenie Samochodu': 50,
      'Walka Wręcz': 55
    },
    
    creditRating: { min: 20, max: 50 },
    
    backgroundPrompts: [
      'Co skłoniło cię do zostania detektywem?',
      'Jaka była twoja najważniejsza sprawa?',
      'Czy masz jakichś wrogów w półświatku?',
      'Jak radzisz sobie z brutalnością swojej pracy?',
      'Kto jest twoim najbardziej zaufanym informatorem?'
    ],
    
    personalityTraits: [
      'Wytrwały i metodyczny',
      'Sceptyczny wobec łatwych odpowiedzi',
      'Lojalny wobec sprawiedliwości',
      'Doświadczony w czytaniu ludzi',
      'Twardy, ale sprawiedliwy'
    ],
    
    motivations: [
      'Ściganie przestępców',
      'Ochrona niewinnych',
      'Odkrywanie prawdy',
      'Utrzymanie porządku publicznego',
      'Zdobycie awansu w policji'
    ],
    
    connections: [
      'Inni policjanci i detektywi',
      'Informatorzy z półświatka',
      'Prokuratorzy i sędziowie',
      'Dziennikarze kryminalni',
      'Właściciele barów i hoteli'
    ],
    
    equipmentSuggestions: [
      'Rewolwer służbowy .38',
      'Odznaka policyjna',
      'Kajdanki',
      'Notatnik detektywistyczny',
      'Lupa',
      'Aparat fotograficzny',
      'Latarka',
      'Płaszcz przeciwdeszczowy'
    ],
    
    historicalContext: {
      socialStatus: 'Klasa robotnicza/średnia, szanowany ale nie zawsze lubiany',
      typicalIncome: '$1200-2500 rocznie',
      workingConditions: 'Długie godziny, niebezpieczna praca, kontakt z przestępczością',
      socialExpectations: 'Oczekiwano uczciwości, odwagi i lojalności wobec prawa'
    },
    
    suggestedNames: {
      male: ['Patrick', 'Michael', 'Thomas', 'James', 'William', 'Robert'],
      female: ['Margaret', 'Helen', 'Dorothy', 'Ruth', 'Catherine', 'Mary'],
      surnames: ['O\'Brien', 'Sullivan', 'Murphy', 'Kelly', 'McCarthy', 'Flynn']
    }
  },

  'Lekarz': {
    name: 'Lekarz',
    description: 'Wykwalifikowany lekarz z wiedzą medyczną i naukową',
    era: '1920s',
    socialClass: 'upper',
    
    suggestedStats: {
      str: 50, dex: 60, con: 60, app: 60, pow: 65, edu: 85, siz: 55, int: 80, luck: 55
    },
    
    occupationalSkillPoints: "EDU × 4",
    
    occupationalSkills: [
      'Pierwsza Pomoc',
      'Język Obcy (Łacina)',
      'Medycyna',
      'Psychologia',
      'Nauka (Biologia)',
      'Nauka (Farmacja)',
      'Spostrzegawczość',
      'Jedna umiejętność interpersonalna (Gadanina, Perswazja, Urok Osobisty, Zastraszanie)'
    ],
    
    suggestedSkills: {
      'Medycyna': 75,
      'Pierwsza Pomoc': 70,
      'Nauka (Biologia)': 60,
      'Nauka (Farmacja)': 50,
      'Psychologia': 55,
      'Spostrzegawczość': 60,
      'Język Obcy (Łacina)': 45,
      'Perswazja': 50,
      'Psychoanaliza': 40,
      'Korzystanie z Bibliotek': 45
    },
    
    creditRating: { min: 50, max: 90 },
    
    backgroundPrompts: [
      'Dlaczego zostałeś lekarzem?',
      'Jaki był twój najtrudniejszy przypadek medyczny?',
      'Czy specjalizujesz się w jakiejś dziedzinie medycyny?',
      'Gdzie studiowałeś medycynę?',
      'Czy kiedykolwiek widziałeś coś, czego nauka nie potrafi wyjaśnić?'
    ],
    
    personalityTraits: [
      'Współczujący i troskliwy',
      'Analityczny i metodyczny',
      'Spokojny pod presją',
      'Szanuje życie ludzkie',
      'Wierzy w naukę i logikę'
    ],
    
    motivations: [
      'Leczenie chorych i cierpiących',
      'Rozwój wiedzy medycznej',
      'Budowanie praktyki lekarskiej',
      'Pomaganie społeczności',
      'Odkrywanie nowych metod leczenia'
    ],
    
    connections: [
      'Inni lekarze i specjaliści',
      'Pielęgniarki i personel medyczny',
      'Pacjenci i ich rodziny',
      'Przedstawiciele firm farmaceutycznych',
      'Członkowie towarzystw medycznych'
    ],
    
    equipmentSuggestions: [
      'Torba lekarska z narzędziami',
      'Stetoskop',
      'Termometr',
      'Strzykawki i igły',
      'Morfina i inne leki',
      'Bandaże i gaza',
      'Elegancki garnitur',
      'Samochód lub dostęp do transportu'
    ],
    
    historicalContext: {
      socialStatus: 'Klasa wyższa, bardzo szanowany w społeczności',
      typicalIncome: '$3000-8000+ rocznie',
      workingConditions: 'Prywatna praktyka, wizyty domowe, szpital',
      socialExpectations: 'Najwyższe standardy etyczne, dostępność 24/7, elegancja'
    },
    
    suggestedNames: {
      male: ['Henry', 'Charles', 'Edward', 'Arthur', 'Frederick', 'Albert'],
      female: ['Elizabeth', 'Victoria', 'Charlotte', 'Evelyn', 'Florence', 'Grace'],
      surnames: ['Whitman', 'Sterling', 'Hawthorne', 'Pembroke', 'Ashford', 'Blackwell']
    }
  },

  'Dziennikarz': {
    name: 'Dziennikarz',
    description: 'Reporter poszukujący prawdy i sensacyjnych historii',
    era: '1920s',
    socialClass: 'middle',

    suggestedStats: {
      str: 55, dex: 60, con: 55, app: 65, pow: 70, edu: 70, siz: 55, int: 75, luck: 60
    },

    occupationalSkillPoints: "EDU × 4",

    occupationalSkills: [
      'Sztuka/Rzemiosło (Pisanie)',
      'Historia',
      'Korzystanie z Bibliotek',
      'Język Ojczysty',
      'Psychologia',
      'Jedna umiejętność interpersonalna (Gadanina, Perswazja, Urok Osobisty, Zastraszanie)',
      'Dwie umiejętności wybrane przez gracza'
    ],

    suggestedSkills: {
      'Perswazja': 65,
      'Urok Osobisty': 60,
      'Gadanina': 55,
      'Sztuka/Rzemiosło (Pisanie)': 65,
      'Spostrzegawczość': 60,
      'Nasłuchiwanie': 55,
      'Historia': 50,
      'Korzystanie z Bibliotek': 55,
      'Psychologia': 50,
      'Prowadzenie Samochodu': 45
    },

    creditRating: { min: 20, max: 60 },

    backgroundPrompts: [
      'Dlaczego zostałeś dziennikarzem?',
      'Jaka była twoja najważniejsza publikacja?',
      'Czy masz jakichś wrogów z powodu swoich artykułów?',
      'Dla jakiej gazety lub czasopisma pracujesz?',
      'Jaki rodzaj historii najbardziej cię interesuje?'
    ],

    personalityTraits: [
      'Ciekawy i dociekliwy',
      'Charyzmatyczny w rozmowach',
      'Wytrwały w poszukiwaniu prawdy',
      'Sceptyczny wobec oficjalnych wersji',
      'Ambitny i konkurencyjny'
    ],

    motivations: [
      'Odkrywanie i publikowanie prawdy',
      'Zdobycie sławy jako reporter',
      'Ochrona interesu publicznego',
      'Rozwój kariery dziennikarskiej',
      'Zdemaskowanie korupcji i nadużyć'
    ],

    connections: [
      'Redaktorzy i inni dziennikarze',
      'Informatorzy z różnych środowisk',
      'Politycy i urzędnicy',
      'Policjanci i detektywi',
      'Właściciele gazet i wydawnictw'
    ],

    equipmentSuggestions: [
      'Notatnik i ołówki',
      'Maszyna do pisania',
      'Aparat fotograficzny',
      'Dyktafon (nowość lat 20.)',
      'Wizytówki prasowe',
      'Mapa miasta',
      'Zegarek kieszonkowy',
      'Płaszcz i kapelusz'
    ],

    historicalContext: {
      socialStatus: 'Klasa średnia, wpływowy ale nie zawsze lubiany',
      typicalIncome: '$1500-3500 rocznie',
      workingConditions: 'Nieregularne godziny, podróże, presja terminów',
      socialExpectations: 'Oczekiwano obiektywności, szybkości i dokładności'
    },

    suggestedNames: {
      male: ['Walter', 'Harold', 'Ernest', 'Frank', 'George', 'Howard'],
      female: ['Vivian', 'Lorraine', 'Pauline', 'Josephine', 'Maxine', 'Irene'],
      surnames: ['Mitchell', 'Parker', 'Bennett', 'Cooper', 'Hayes', 'Morgan']
    }
  },

  'Profesor': {
    name: 'Profesor',
    description: 'Akademik i badacz z głęboką wiedzą w swojej dziedzinie',
    era: '1920s',
    socialClass: 'upper',
    suggestedStats: {
      str: 45, dex: 50, con: 50, app: 55, pow: 70, edu: 90, siz: 50, int: 85, luck: 50
    },
    occupationalSkillPoints: "EDU × 4",
    occupationalSkills: ['Korzystanie z Bibliotek', 'Język Obcy', 'Język Ojczysty', 'Psychologia', 'Cztery umiejętności wybrane jako specjalizacja akademicka'],
    suggestedSkills: {
      'Korzystanie z Bibliotek': 75, 'Historia': 65, 'Język Obcy': 55, 'Język Ojczysty': 80,
      'Psychologia': 50, 'Nauka (Specjalizacja)': 70, 'Archeologia': 45, 'Spostrzegawczość': 50
    },
    creditRating: { min: 20, max: 70 },
    backgroundPrompts: ['Na jakim uniwersytecie wykładasz?', 'Jaka jest twoja specjalizacja akademicka?', 'Czy twoje badania kiedykolwiek zaprowadziły cię w niebezpieczne miejsca?', 'Kto jest twoim rywalem w środowisku naukowym?'],
    personalityTraits: ['Intelektualnie ciekawy', 'Metodyczny i dokładny', 'Czasem oderwany od rzeczywistości', 'Pasjonujący się swoją dziedziną', 'Cierpliwy wobec studentów'],
    motivations: ['Poszerzanie wiedzy ludzkiej', 'Uznanie w środowisku akademickim', 'Odkrycie czegoś przełomowego', 'Kształcenie następnego pokolenia'],
    connections: ['Koledzy profesorowie', 'Studenci i doktoranci', 'Bibliotekarze i archiwiści', 'Sponsorzy ekspedycji', 'Muzealnicy'],
    equipmentSuggestions: ['Teczka z notatkami wykładowymi', 'Okulary do czytania', 'Pióro wieczne', 'Książki specjalistyczne', 'Fajka lub cygaro', 'Elegancki garnitur z tweedu'],
    historicalContext: {
      socialStatus: 'Klasa wyższa intelektualna, szanowany autorytet',
      typicalIncome: '$3000-6000 rocznie',
      workingConditions: 'Wykłady, badania w gabinecie i terenie, publikacje',
      socialExpectations: 'Wzór moralny, autorytet naukowy, zaangażowanie w badania'
    },
    suggestedNames: {
      male: ['Albert', 'Herbert', 'Nathaniel', 'Theodore', 'Leonard', 'Clarence'],
      female: ['Adelaide', 'Margaret', 'Eleanor', 'Harriet', 'Lillian', 'Mabel'],
      surnames: ['Armitage', 'Peaslee', 'Dyer', 'Wilmarth', 'Rice', 'Angell']
    }
  },

  'Prawnik': {
    name: 'Prawnik',
    description: 'Adwokat lub radca prawny z dostępem do informacji i wpływowych kontaktów',
    era: '1920s',
    socialClass: 'upper',
    suggestedStats: {
      str: 50, dex: 50, con: 55, app: 65, pow: 70, edu: 80, siz: 55, int: 80, luck: 55
    },
    occupationalSkillPoints: "EDU × 4",
    occupationalSkills: ['Księgowość', 'Korzystanie z Bibliotek', 'Perswazja', 'Prawo', 'Psychologia', 'Trzy umiejętności wybrane przez gracza'],
    suggestedSkills: {
      'Prawo': 70, 'Perswazja': 65, 'Korzystanie z Bibliotek': 60, 'Psychologia': 55,
      'Księgowość': 45, 'Język Ojczysty': 70, 'Historia': 40, 'Urok Osobisty': 50
    },
    creditRating: { min: 30, max: 80 },
    backgroundPrompts: ['Jaka jest twoja specjalizacja prawna?', 'Czy kiedykolwiek broniłeś klienta, o którego winie byłeś przekonany?', 'Kto jest twoim najważniejszym klientem?', 'Czy prawo jest dla ciebie powołaniem czy sposobem na życie?'],
    personalityTraits: ['Elokwentny i przekonujący', 'Precyzyjny w słowach', 'Ostrożny i przezorny', 'Zna wartość informacji', 'Racjonalny i opanowany'],
    motivations: ['Sprawiedliwość — w teorii', 'Prestiż i pozycja społeczna', 'Ochrona klientów', 'Wpływ na lokalne sprawy'],
    connections: ['Sędziowie i prokuratorzy', 'Wpływowi klienci', 'Policjanci i detektywi', 'Politycy lokalni', 'Notariusze i urzędnicy'],
    equipmentSuggestions: ['Teczka z dokumentami prawnymi', 'Elegancki garnitur trzyczęściowy', 'Zegarek kieszonkowy', 'Pióro wieczne', 'Wizytówki kancelarii', 'Samochód lub taksówka na wezwanie'],
    historicalContext: {
      socialStatus: 'Klasa wyższa, wpływowy członek społeczności',
      typicalIncome: '$4000-10000+ rocznie',
      workingConditions: 'Kancelaria, sąd, spotkania z klientami',
      socialExpectations: 'Dyskrecja, profesjonalizm, znajomość etykiety'
    },
    suggestedNames: {
      male: ['Reginald', 'Clifford', 'Warren', 'Chester', 'Horace', 'Irving'],
      female: ['Virginia', 'Marguerite', 'Clarice', 'Winifred', 'Blanche', 'Estelle'],
      surnames: ['Hartwell', 'Prescott', 'Davenport', 'Langley', 'Wainwright', 'Aldrich']
    }
  },

  'Przestępca': {
    name: 'Przestępca',
    description: 'Człowiek żyjący na marginesie prawa — złodziej, szuler lub gangster',
    era: '1920s',
    socialClass: 'working',
    suggestedStats: {
      str: 65, dex: 70, con: 60, app: 55, pow: 55, edu: 45, siz: 60, int: 65, luck: 65
    },
    occupationalSkillPoints: "EDU × 2 + (ZR × 2 lub S × 2)",
    occupationalSkills: ['Ukrywanie', 'Skradanie', 'Zastraszanie', 'Psychologia', 'Spostrzegawczość', 'Walka Wręcz', 'Ślusarstwo', 'Broń Palna'],
    suggestedSkills: {
      'Ślusarstwo': 55, 'Skradanie': 60, 'Walka Wręcz': 55, 'Broń Palna': 50,
      'Zastraszanie': 55, 'Ukrywanie': 50, 'Spostrzegawczość': 45, 'Psychologia': 40, 'Gadanina': 50
    },
    creditRating: { min: 5, max: 65 },
    backgroundPrompts: ['Co pchnęło cię na przestępczą ścieżkę?', 'Czy masz powiązania z zorganizowaną przestępczością?', 'Czy jest granica, której nie przekroczysz?', 'Kto jest twoim najgroźniejszym wrogiem?'],
    personalityTraits: ['Cwany i przebiegły', 'Czujny na zagrożenia', 'Lojalny wobec swoich', 'Pragmatyczny — cel uświęca środki', 'Nieufny wobec obcych'],
    motivations: ['Przetrwanie', 'Bogactwo i komfort', 'Wolność od reguł społecznych', 'Ochrona bliskich', 'Zemsta na systemie'],
    connections: ['Gang i kumple z ulicy', 'Paserzy i handlarze', 'Skorumpowani policjanci', 'Właściciele speakeasy', 'Informatorzy'],
    equipmentSuggestions: ['Nóż sprężynowy', 'Wytrych', 'Rewolwer schowany pod marynarką', 'Kastet', 'Zapalniczka', 'Kapelusz i płaszcz', 'Fałszywe dokumenty'],
    historicalContext: {
      socialStatus: 'Margines społeczny, ale z kontaktami we wszystkich sferach',
      typicalIncome: 'Nieregularne, $500-5000 rocznie',
      workingConditions: 'Nocna zmiana, niebezpieczne okoliczności, stały stres',
      socialExpectations: 'W półświatku: honor wśród złodziei, lojalność, milczenie'
    },
    suggestedNames: {
      male: ['Vincent', 'Anthony', 'Salvatore', 'Luca', 'Tommy', 'Mickey'],
      female: ['Rosalie', 'Carmela', 'Dolores', 'Bonnie', 'Pearl', 'Ruby'],
      surnames: ['Moretti', 'Costello', 'O\'Malley', 'Luciano', 'Capone', 'Diamond']
    }
  },

  'Parapsycholog': {
    name: 'Parapsycholog',
    description: 'Badacz zjawisk nadprzyrodzonych — na granicy nauki i okultyzmu',
    era: '1920s',
    socialClass: 'middle',
    suggestedStats: {
      str: 45, dex: 55, con: 55, app: 55, pow: 80, edu: 75, siz: 50, int: 80, luck: 60
    },
    occupationalSkillPoints: "EDU × 4",
    occupationalSkills: ['Antropologia', 'Historia', 'Korzystanie z Bibliotek', 'Occultyzm', 'Język Obcy', 'Psychologia', 'Dwie umiejętności wybrane przez gracza'],
    suggestedSkills: {
      'Occultyzm': 65, 'Psychologia': 55, 'Historia': 55, 'Korzystanie z Bibliotek': 60,
      'Antropologia': 45, 'Język Obcy': 40, 'Spostrzegawczość': 55, 'Nasłuchiwanie': 50
    },
    creditRating: { min: 9, max: 30 },
    backgroundPrompts: ['Co skłoniło cię do badania zjawisk paranormalnych?', 'Czy kiedykolwiek doświadczyłeś czegoś, czego nie potrafisz wyjaśnić?', 'Jak środowisko akademickie traktuje twoje badania?', 'Jakie narzędzia używasz do badań?'],
    personalityTraits: ['Otwarty na niezwykłe', 'Metodyczny pomimo tematyki', 'Odważny w obliczu nieznanego', 'Wrażliwy na atmosferę miejsc', 'Zdeterminowany, by udowodnić swoją rację'],
    motivations: ['Udowodnienie istnienia zjawisk nadprzyrodzonych', 'Zrozumienie natury rzeczywistości', 'Rehabilitacja w środowisku naukowym', 'Ochrona ludzi przed nieznanym'],
    connections: ['Media i spirytyści', 'Bibliotekarze i archiwiści', 'Osoby twierdzące, że doświadczyły paranormalnego', 'Sceptyczni naukowcy', 'Towarzystwa okultystyczne'],
    equipmentSuggestions: ['Notatnik z obserwacjami', 'Termometr (do wykrywania zimnych stref)', 'Aparat fotograficzny', 'Magnetofon', 'Księgi o okultyzmie', 'Krucyfiks i woda święcona (na wszelki wypadek)'],
    historicalContext: {
      socialStatus: 'Klasa średnia, kontrowersyjny — szanowany przez jednych, wyśmiewany przez drugich',
      typicalIncome: '$1000-2500 rocznie (głównie z wykładów i publikacji)',
      workingConditions: 'Badania terenowe, seanse, archiwa, ciemne stare domy',
      socialExpectations: 'Wielu oczekuje, że udowodni lub obali zjawiska paranormalne'
    },
    suggestedNames: {
      male: ['Ambrose', 'Alistair', 'Rupert', 'Edgar', 'Oswald', 'Victor'],
      female: ['Cassandra', 'Isadora', 'Genevieve', 'Seraphina', 'Rowena', 'Tabitha'],
      surnames: ['Blackwood', 'Ravencroft', 'Crowley', 'Marsh', 'Whateley', 'Dunwich']
    }
  },

  'Prywatny Detektyw': {
    name: 'Prywatny Detektyw',
    description: 'Niezależny śledczy pracujący na zlecenie — dyskretn i skuteczny',
    era: '1920s',
    socialClass: 'middle',
    suggestedStats: {
      str: 60, dex: 65, con: 60, app: 55, pow: 65, edu: 60, siz: 60, int: 75, luck: 55
    },
    occupationalSkillPoints: "EDU × 2 + (ZR × 2 lub S × 2)",
    occupationalSkills: ['Korzystanie z Bibliotek', 'Prawo', 'Ukrywanie', 'Psychologia', 'Perswazja', 'Spostrzegawczość', 'Dwie umiejętności wybrane przez gracza'],
    suggestedSkills: {
      'Spostrzegawczość': 65, 'Psychologia': 60, 'Ukrywanie': 50, 'Skradanie': 50,
      'Perswazja': 55, 'Prawo': 40, 'Broń Palna': 55, 'Prowadzenie Samochodu': 50,
      'Korzystanie z Bibliotek': 45, 'Nasłuchiwanie': 55
    },
    creditRating: { min: 9, max: 50 },
    backgroundPrompts: ['Dlaczego odszedłeś z policji (lub nigdy tam nie pracowałeś)?', 'Jaka sprawa nie daje ci spokoju?', 'Kto jest twoim stałym klientem?', 'Jak daleko jesteś gotów się posunąć dla prawdy?'],
    personalityTraits: ['Niezależny i uparty', 'Cyniczny ale nie bez serca', 'Wytrwały tropiciel', 'Dyskretny — umie dochować tajemnicy', 'Bystry obserwator ludzi'],
    motivations: ['Rozwiązywanie zagadek', 'Zarabianie na życie', 'Sprawiedliwość — na własnych warunkach', 'Ochrona klientów'],
    connections: ['Byli koledzy z policji', 'Barmani i recepcjoniści', 'Prawicy i adwokaci', 'Informatorzy z półświatka', 'Sekreterki i urzędnicy'],
    equipmentSuggestions: ['Rewolwer .38 w kaburze', 'Aparat fotograficzny', 'Lornetka', 'Latarka', 'Notatnik', 'Flaszka whisky', 'Samochód do obserwacji', 'Wytrych'],
    historicalContext: {
      socialStatus: 'Klasa średnia-niższa, na granicy prawa i podziemia',
      typicalIncome: '$1500-3000 rocznie (nieregularne)',
      workingConditions: 'Własne biuro, obserwacje, przesłuchania, nocne wyjścia',
      socialExpectations: 'Dyskrecja, skuteczność, moralna elastyczność'
    },
    suggestedNames: {
      male: ['Philip', 'Samuel', 'Raymond', 'Dashiell', 'Miles', 'Conrad'],
      female: ['Nora', 'Vera', 'Lila', 'Cleo', 'Myrtle', 'Harriet'],
      surnames: ['Marlowe', 'Spade', 'Archer', 'Goodwin', 'Wolfe', 'Continental']
    }
  },

  'Duchowny': {
    name: 'Duchowny',
    description: 'Kapłan, pastor lub rabin — strażnik dusz i moralności',
    era: '1920s',
    socialClass: 'middle',
    suggestedStats: {
      str: 50, dex: 45, con: 55, app: 60, pow: 80, edu: 75, siz: 55, int: 70, luck: 60
    },
    occupationalSkillPoints: "EDU × 4",
    occupationalSkills: ['Księgowość', 'Historia', 'Korzystanie z Bibliotek', 'Nasłuchiwanie', 'Język Obcy', 'Psychologia', 'Dwie umiejętności wybrane przez gracza'],
    suggestedSkills: {
      'Psychologia': 60, 'Historia': 55, 'Korzystanie z Bibliotek': 55, 'Nasłuchiwanie': 50,
      'Perswazja': 60, 'Urok Osobisty': 50, 'Język Obcy (Łacina)': 45, 'Pierwsza Pomoc': 40
    },
    creditRating: { min: 9, max: 60 },
    backgroundPrompts: ['Co skłoniło cię do powołania duchownego?', 'Czy twoja wiara kiedykolwiek została wystawiona na próbę?', 'Jak reagujesz na cierpienie i zło w świecie?', 'Jaka jest twoja parafia/gmina?'],
    personalityTraits: ['Empatyczny i wyrozumiały', 'Silna wiara — ale może chwiejna', 'Autorytet moralny', 'Cierpliwy słuchacz', 'Odważny w obliczu zła duchowego'],
    motivations: ['Ochrona dusz parafian', 'Walka ze złem — duchowym i doczesnym', 'Niesienie pociechy', 'Zrozumienie boskiego planu'],
    connections: ['Wierni i parafianie', 'Inni duchowni', 'Lokalna społeczność', 'Organizacje charytatywne', 'Biskupi i hierarchia kościelna'],
    equipmentSuggestions: ['Biblia', 'Krucyfiks', 'Różaniec', 'Woda święcona', 'Stuła', 'Czarny garnitur z koloratką', 'Notatnik z kazaniami'],
    historicalContext: {
      socialStatus: 'Szanowany autorytet moralny w społeczności',
      typicalIncome: '$1000-3000 rocznie (zależne od parafii)',
      workingConditions: 'Kościół, wizyty duszpasterskie, kazania, spowiedzi',
      socialExpectations: 'Nieskazitelna moralność, dostępność, mądrość'
    },
    suggestedNames: {
      male: ['Jonathan', 'Ezekiel', 'Solomon', 'Nathaniel', 'Isaiah', 'Josiah'],
      female: ['Ruth', 'Esther', 'Hannah', 'Miriam', 'Deborah', 'Naomi'],
      surnames: ['Whitfield', 'Goodman', 'Shepherd', 'Cross', 'Bishop', 'Church']
    }
  },

  'Diletant': {
    name: 'Diletant',
    description: 'Bogaty dżentelmen lub dama z nadmiarem czasu i pieniędzy',
    era: '1920s',
    socialClass: 'upper',
    suggestedStats: {
      str: 50, dex: 55, con: 50, app: 70, pow: 60, edu: 65, siz: 55, int: 65, luck: 70
    },
    occupationalSkillPoints: "EDU × 2 + WYG × 2",
    occupationalSkills: ['Urok Osobisty', 'Sztuka/Rzemiosło', 'Historia', 'Język Obcy', 'Jeździectwo', 'Trzy umiejętności wybrane przez gracza'],
    suggestedSkills: {
      'Urok Osobisty': 65, 'Historia': 50, 'Język Obcy': 50, 'Jeździectwo': 45,
      'Sztuka/Rzemiosło': 45, 'Prowadzenie Samochodu': 55, 'Perswazja': 50, 'Psychologia': 40
    },
    creditRating: { min: 50, max: 99 },
    backgroundPrompts: ['Skąd pochodzi majątek twojej rodziny?', 'Czym się zajmujesz, skoro nie musisz pracować?', 'Co sprawia, że angażujesz się w niebezpieczne przygody?', 'Jakie skandale wiążą się z twoją rodziną?'],
    personalityTraits: ['Pewny siebie do granic arogancji', 'Znudzony codziennością', 'Hojny i impulsywny', 'Przyzwyczajony do luksusu', 'Szukający emocji'],
    motivations: ['Przygoda i emocje', 'Ucieczka od nudy klasy wyższej', 'Udowodnienie swojej wartości', 'Odkrywanie egzotycznych miejsc'],
    connections: ['Arystokracja i elita społeczna', 'Kluby dżentelmenów', 'Bankierzy i prawnicy rodzinni', 'Służba domowa', 'Międzynarodowe towarzystwo'],
    equipmentSuggestions: ['Drogi garnitur lub suknia', 'Samochód luksusowy', 'Biżuteria i zegarek', 'Paszport z wieloma wizami', 'Karta klubu dżentelmenów', 'Srebrna papierośnica', 'Portfel pełen banknotów'],
    historicalContext: {
      socialStatus: 'Klasa wyższa, stary lub nowy pieniądz',
      typicalIncome: '$10000-50000+ rocznie (z inwestycji i spadków)',
      workingConditions: 'Nie pracuje — podróże, hobby, wydarzenia towarzyskie',
      socialExpectations: 'Filantropia, elegancja, utrzymanie pozycji rodziny'
    },
    suggestedNames: {
      male: ['Reginald', 'Bartholomew', 'Cornelius', 'Worthington', 'Aldous', 'Montgomery'],
      female: ['Genevieve', 'Theodora', 'Constance', 'Rosalind', 'Penelope', 'Araminta'],
      surnames: ['Van Der Berg', 'Worthington', 'Ashton-Wentworth', 'Cavendish', 'Beaumont', 'Sinclair']
    }
  },

  'Wojskowy': {
    name: 'Wojskowy',
    description: 'Oficer lub podoficerdoświadczony w boju — weteran Wielkiej Wojny',
    era: '1920s',
    socialClass: 'working',
    suggestedStats: {
      str: 70, dex: 65, con: 70, app: 50, pow: 60, edu: 55, siz: 65, int: 60, luck: 45
    },
    occupationalSkillPoints: "EDU × 2 + (ZR × 2 lub S × 2)",
    occupationalSkills: ['Wspinaczka', 'Walka Wręcz', 'Broń Palna', 'Pierwsza Pomoc', 'Mechanika', 'Skradanie', 'Pływanie', 'Przetrwanie'],
    suggestedSkills: {
      'Broń Palna': 65, 'Walka Wręcz': 60, 'Przetrwanie': 55, 'Pierwsza Pomoc': 50,
      'Skradanie': 50, 'Wspinaczka': 45, 'Orientacja': 50, 'Mechanika': 40
    },
    creditRating: { min: 9, max: 30 },
    backgroundPrompts: ['W jakim korpusie/pułku służyłeś?', 'Co widziałeś w okopach Wielkiej Wojny?', 'Jak radzisz sobie z powrotem do cywilnego życia?', 'Czy masz blizny — fizyczne lub psychiczne — z frontu?'],
    personalityTraits: ['Zdyscyplinowany i zorganizowany', 'Odporny na stres — ale koszmary nocne', 'Lojalny wobec towarzyszy', 'Praktyczny i bezpośredni', 'Podejrzliwy wobec autorytetów cywilnych'],
    motivations: ['Ochrona bliskich', 'Znalezienie celu po wojnie', 'Wypełnienie obowiązku', 'Zwalczanie zagrożeń'],
    connections: ['Towarzysze broni', 'Organizacje weteranów', 'Wojskowi lekarze', 'Oficerowie wywiadu', 'Handlarze bronią'],
    equipmentSuggestions: ['Pistolet służbowy', 'Nóż okopowy', 'Lornetka', 'Kompas', 'Apteczka polowa', 'Kurtka wojskowa', 'Nieśmiertelnik', 'Manierka'],
    historicalContext: {
      socialStatus: 'Klasa robotnicza-średnia, szanowany jako weteran',
      typicalIncome: '$800-2000 rocznie (emerytura wojskowa lub praca fizyczna)',
      workingConditions: 'Po wojnie — problemy z adaptacją, PTSD (shell shock)',
      socialExpectations: 'Oczekiwano milczenia o wojnie i powrotu do normalności'
    },
    suggestedNames: {
      male: ['Gerald', 'Douglas', 'Kenneth', 'Lawrence', 'Clarence', 'Harvey'],
      female: ['Agnes', 'Edith', 'Bertha', 'Mildred', 'Gladys', 'Ethel'],
      surnames: ['Mason', 'Crawford', 'Armstrong', 'Barrett', 'Chambers', 'Grant']
    }
  },

  'Naukowiec': {
    name: 'Naukowiec',
    description: 'Badacz w laboratorium lub terenie — chemik, biolog, geolog, fizyk',
    era: '1920s',
    socialClass: 'middle',
    suggestedStats: {
      str: 45, dex: 55, con: 55, app: 50, pow: 60, edu: 85, siz: 50, int: 85, luck: 50
    },
    occupationalSkillPoints: "EDU × 4",
    occupationalSkills: ['Komputery', 'Korzystanie z Bibliotek', 'Język Obcy', 'Język Ojczysty', 'Nauka (Specjalizacja)', 'Nauka (Druga)', 'Spostrzegawczość', 'Jedna umiejętność wybrana przez gracza'],
    suggestedSkills: {
      'Nauka (Specjalizacja)': 75, 'Nauka (Druga)': 50, 'Korzystanie z Bibliotek': 60,
      'Spostrzegawczość': 55, 'Język Obcy': 45, 'Język Ojczysty': 70, 'Elektryka': 40, 'Mechanika': 35
    },
    creditRating: { min: 9, max: 50 },
    backgroundPrompts: ['Co badasz i dlaczego to ważne?', 'Czy twoje eksperymenty kiedykolwiek wymknęły się spod kontroli?', 'Kto finansuje twoje badania?', 'Jakie odkrycie zmieniłoby twoje życie?'],
    personalityTraits: ['Analityczny do bólu', 'Zafascynowany danymi', 'Sceptyczny wobec nienaukowych wyjaśnień', 'Drobiazgowy w dokumentacji', 'Podekscytowany każdym odkryciem'],
    motivations: ['Przełomowe odkrycie', 'Uznanie naukowe', 'Zrozumienie natury', 'Pokonanie rywali w dziedzinie'],
    connections: ['Koledzy naukowcy', 'Asystenci laboratoryjni', 'Sponsorzy badań', 'Wydawcy naukowi', 'Producenci sprzętu'],
    equipmentSuggestions: ['Zestaw laboratoryjny przenośny', 'Lupa i mikroskop', 'Notatnik z wynikami', 'Próbówki i odczynniki', 'Okulary ochronne', 'Fartuch laboratoryjny'],
    historicalContext: {
      socialStatus: 'Klasa średnia, szanowany w kręgach akademickich',
      typicalIncome: '$2000-5000 rocznie',
      workingConditions: 'Laboratorium, ekspedycje terenowe, konferencje',
      socialExpectations: 'Publikuj albo giń — presja na wyniki i odkrycia'
    },
    suggestedNames: {
      male: ['Nikola', 'Werner', 'Hugo', 'Friedrich', 'Oswald', 'Gunther'],
      female: ['Marie', 'Lise', 'Irene', 'Augusta', 'Helene', 'Clara'],
      surnames: ['Crawford', 'Hartmann', 'Lindquist', 'Weiss', 'Novak', 'Brennan']
    }
  },

  'Artysta': {
    name: 'Artysta',
    description: 'Malarz, rzeźbiarz, muzyk lub pisarz — dusza wrażliwa na piękno i grozę',
    era: '1920s',
    socialClass: 'middle',
    suggestedStats: {
      str: 45, dex: 65, con: 50, app: 65, pow: 75, edu: 60, siz: 50, int: 75, luck: 60
    },
    occupationalSkillPoints: "EDU × 2 + (MOC × 2 lub ZR × 2)",
    occupationalSkills: ['Sztuka/Rzemiosło', 'Historia', 'Język Obcy', 'Psychologia', 'Spostrzegawczość', 'Trzy umiejętności wybrane przez gracza'],
    suggestedSkills: {
      'Sztuka/Rzemiosło': 70, 'Spostrzegawczość': 55, 'Psychologia': 50, 'Historia': 45,
      'Język Obcy': 40, 'Urok Osobisty': 50, 'Perswazja': 45, 'Nasłuchiwanie': 40
    },
    creditRating: { min: 9, max: 50 },
    backgroundPrompts: ['Jaki jest twój medium artystyczny?', 'Czy twoja sztuka kiedykolwiek odzwierciedlała rzeczy, których nie rozumiesz?', 'Kto jest twoim mecenasem lub galerystą?', 'Co inspiruje twoją twórczość?'],
    personalityTraits: ['Wrażliwy i emocjonalny', 'Niekonwencjonalny', 'Obserwator ludzkiej natury', 'Pochłonięty wizjami', 'Bohemowski styl życia'],
    motivations: ['Tworzenie arcydzieła', 'Wyrażenie czegoś niewyrażalnego', 'Sława artystyczna', 'Zrozumienie piękna i grozy'],
    connections: ['Inni artyści i poeci', 'Galeryści i kolekcjonerzy', 'Bohema i kawiarnie', 'Modelki i muzy', 'Krytycy sztuki'],
    equipmentSuggestions: ['Szkicownik i ołówki', 'Farby i pędzle (lub instrument)', 'Portfolio z pracami', 'Beret i szal', 'Butelka absyntu', 'Bilet na galerię'],
    historicalContext: {
      socialStatus: 'Klasa średnia (lub biedna — zależnie od sukcesu)',
      typicalIncome: '$500-5000 rocznie (ekstremalnie zmienna)',
      workingConditions: 'Pracownia, plener, kawiarnie, salony',
      socialExpectations: 'Ekscentryczność tolerowana, oczekiwano talentu i wizji'
    },
    suggestedNames: {
      male: ['Augustus', 'Marcel', 'Lucian', 'Sebastian', 'Claude', 'Dorian'],
      female: ['Vivienne', 'Celeste', 'Olympia', 'Margaux', 'Camille', 'Isolde'],
      surnames: ['Duval', 'Moreau', 'Sinclair', 'Wilde', 'Chambers', 'Sargent']
    }
  }
};

// Helper function to get template by occupation name
export function getEnhancedTemplate(occupationName: string): EnhancedCharacterTemplate | null {
  return enhancedCharacterTemplates[occupationName] || null;
}

// Helper function to get all available templates
export function getAllEnhancedTemplates(): EnhancedCharacterTemplate[] {
  return Object.values(enhancedCharacterTemplates);
}

// Helper function to calculate occupation skill points
export function calculateOccupationSkillPoints(education: number, formula: string): number {
  switch (formula) {
    case "EDU × 4":
      return education * 4;
    case "EDU × 2 + INT × 2":
      // This would need intelligence value as well
      return education * 2; // Simplified for now
    case "EDU × 2 + (APP lub POW) × 2":
      return education * 2; // Simplified for now
    default:
      return education * 4; // Default fallback
  }
}
