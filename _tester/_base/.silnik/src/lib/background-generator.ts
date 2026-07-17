// Interactive Character Background Generator with Historical Context
// Generates detailed character backgrounds based on occupation, era, and choices

interface BackgroundQuestion {
  id: string;
  question: string;
  context?: string; // Historical context explanation
  options: BackgroundOption[];
  category: 'childhood' | 'education' | 'career' | 'relationships' | 'trauma' | 'motivation';
}

interface BackgroundOption {
  id: string;
  text: string;
  description: string;
  consequences: string[];
  skillModifiers: { [skill: string]: number };
  equipmentGained?: string[];
  connectionGained?: string[];
  personalityImpact?: string[];
}

interface BackgroundGenerationResult {
  backgroundStory: string;
  skillModifiers: { [skill: string]: number };
  equipment: string[];
  connections: string[];
  personalityTraits: string[];
  traumaEvents: string[];
  motivations: string[];
}

interface BackgroundChoice {
  questionId: string;
  optionId: string;
  option: BackgroundOption;
}

class BackgroundGenerator {
  // Questions for different occupations and eras
  private questions: { [occupation: string]: BackgroundQuestion[] } = {
    'Antykwariusz': [
      {
        id: 'childhood_antique',
        question: 'Jak po raz pierwszy zetknąłeś się ze starożytnościami?',
        context: 'W latach 20. XX wieku antyki były symbolem statusu i kultury dla klasy średniej.',
        category: 'childhood',
        options: [
          {
            id: 'family_collection',
            text: 'Rodzinna kolekcja',
            description: 'Dorastałeś w domu pełnym starych przedmiotów i książek',
            consequences: ['Wczesne zainteresowanie historią', 'Naturalne oko do autentyczności'],
            skillModifiers: { 'Historia': 10, 'Spostrzegawczość': 5, 'Wycena': 10 },
            personalityImpact: ['Doceniasz tradycję', 'Masz szacunek dla przeszłości']
          },
          {
            id: 'museum_visit',
            text: 'Wizyta w muzeum',
            description: 'Podczas szkolnej wycieczki do muzeum poczułeś fascynację starożytnościami',
            consequences: ['Rozwinięta ciekawość akademicka', 'Kontakty w świecie muzealnictwa'],
            skillModifiers: { 'Korzystanie z Bibliotek': 10, 'Archeologia': 5 },
            connectionGained: ['Kurator muzeum', 'Przewodnik muzealny']
          },
          {
            id: 'inheritance',
            text: 'Dziedzictwo',
            description: 'Odziedziczyłeś tajemniczy przedmiot po dalekim krewnym',
            consequences: ['Zagadkowa przeszłość rodzinna', 'Pierwszy kontakt z nieznanym'],
            skillModifiers: { 'Okultyzm': 10, 'Mity Cthulhu': 5 },
            equipmentGained: ['Tajemniczy amulet', 'Stary dziennik'],
            personalityImpact: ['Skłonność do tajemniczości', 'Ciekawość niebezpiecznej wiedzy']
          }
        ]
      },
      {
        id: 'education_antique',
        question: 'Jakie było twoje wykształcenie?',
        context: 'Edukacja w latach 20. była przywilejem klasy średniej i wyższej.',
        category: 'education',
        options: [
          {
            id: 'university_history',
            text: 'Uniwersytet - Historia',
            description: 'Ukończyłeś studia historyczne na renomowanej uczelni',
            consequences: ['Solidne podstawy akademickie', 'Kontakty w środowisku naukowym'],
            skillModifiers: { 'Historia': 15, 'Korzystanie z Bibliotek': 10, 'Język Obcy': 10 },
            connectionGained: ['Profesorowie uniwersyteccy', 'Koledzy historycy'],
            personalityImpact: ['Metodyczne podejście', 'Szacunek dla wiedzy']
          },
          {
            id: 'apprenticeship',
            text: 'Praktyka u mistrza',
            description: 'Uczyłeś się zawodu jako praktykant doświadczonego antykwariusza',
            consequences: ['Praktyczna wiedza handlowa', 'Znajomość rynku antyków'],
            skillModifiers: { 'Wycena': 20, 'Perswazja': 10, 'Sztuka/Rzemiosło': 5 },
            connectionGained: ['Doświadczony antykwariusz', 'Sieć handlarzy'],
            personalityImpact: ['Praktyczne podejście', 'Umiejętności negocjacyjne']
          },
          {
            id: 'self_taught',
            text: 'Samouk',
            description: 'Wszystkiego nauczyłeś się sam, czytając książki i obserwując',
            consequences: ['Niezależne myślenie', 'Unikalne spojrzenie na antyki'],
            skillModifiers: { 'Spostrzegawczość': 15, 'Korzystanie z Bibliotek': 15 },
            personalityImpact: ['Niezależność', 'Pewność siebie', 'Skłonność do samotności']
          }
        ]
      },
      {
        id: 'first_discovery',
        question: 'Jaki był twój pierwszy znaczący znalezisk?',
        context: 'W latach 20. handel antykami przeżywał boom po I wojnie światowej.',
        category: 'career',
        options: [
          {
            id: 'valuable_painting',
            text: 'Cenny obraz',
            description: 'Odkryłeś autentyczne dzieło znanego malarza w starym domu',
            consequences: ['Uznanie w branży', 'Kapitał na rozpoczęcie działalności'],
            skillModifiers: { 'Sztuka/Rzemiosło': 15, 'Wycena': 10 },
            equipmentGained: ['Kontakty z kolekcjonerami sztuki', 'Kapitał startowy'],
            personalityImpact: ['Pewność swoich umiejętności', 'Ambicja']
          },
          {
            id: 'ancient_book',
            text: 'Starożytna księga',
            description: 'Znalazłeś rzadką księgę w nieznanym języku',
            consequences: ['Kontakt z tajemniczą wiedzą', 'Zainteresowanie okultystów'],
            skillModifiers: { 'Język Obcy': 10, 'Okultyzm': 15, 'Mity Cthulhu': 10 },
            equipmentGained: ['Tajemnicza księga', 'Notatki tłumaczeniowe'],
            connectionGained: ['Okultystyczni badacze', 'Tłumacze starożytnych tekstów'],
            personalityImpact: ['Fascynacja tajemnicą', 'Ostrożność wobec nieznanego']
          }
        ]
      }
    ],

    'Detektyw': [
      {
        id: 'childhood_detective',
        question: 'Co skłoniło cię do zostania detektywem?',
        context: 'Policja w latach 20. była często skorumpowana, ale niektórzy funkcjonariusze walczyli o sprawiedliwość.',
        category: 'childhood',
        options: [
          {
            id: 'family_victim',
            text: 'Tragedia rodzinna',
            description: 'Twoja rodzina padła ofiarą przestępstwa, które nie zostało rozwiązane',
            consequences: ['Silna motywacja do walki ze złem', 'Osobiste zaangażowanie w sprawiedliwość'],
            skillModifiers: { 'Psychologia': 15, 'Zastraszanie': 10, 'Tropienie': 10 },
            personalityImpact: ['Determinacja', 'Czasami obsesyjna potrzeba sprawiedliwości', 'Empatia dla ofiar']
          },
          {
            id: 'admiration_police',
            text: 'Podziw dla policji',
            description: 'Jako dziecko podziwiałeś lokalnego policjanta, który był wzorem uczciwości',
            consequences: ['Idealistyczne podejście do prawa', 'Szacunek dla munduru'],
            skillModifiers: { 'Prawo': 10, 'Perswazja': 10, 'Urok Osobisty': 5 },
            connectionGained: ['Mentor w policji', 'Szacunek starszych funkcjonariuszy'],
            personalityImpact: ['Idealista', 'Wierzy w system', 'Honorowy']
          },
          {
            id: 'natural_talent',
            text: 'Naturalny talent',
            description: 'Zawsze miałeś talent do rozwiązywania zagadek i obserwowania szczegółów',
            consequences: ['Wrodzone umiejętności śledcze', 'Reputacja bystrości'],
            skillModifiers: { 'Spostrzegawczość': 20, 'Nasłuchiwanie': 10, 'Psychologia': 5 },
            personalityImpact: ['Analityczny umysł', 'Pewność siebie', 'Ciekawość']
          }
        ]
      },
      {
        id: 'first_case',
        question: 'Jaka była twoja pierwsza ważna sprawa?',
        context: 'Lata 20. to czas prohibicji, gangsterów i korupcji w wielkich miastach.',
        category: 'career',
        options: [
          {
            id: 'corruption_case',
            text: 'Sprawa korupcji',
            description: 'Odkryłeś korupcję w swojej jednostce i zdecydowałeś się ją zgłosić',
            consequences: ['Wrogowie w policji', 'Reputacja nieustraszonego', 'Problemy z karierą'],
            skillModifiers: { 'Prawo': 15, 'Zastraszanie': -5, 'Psychologia': 10 },
            personalityImpact: ['Nieprzejednany', 'Samotnik', 'Wierny zasadom'],
            connectionGained: ['Dziennikarze śledczy', 'Prokuratorzy', 'Informatorzy']
          },
          {
            id: 'murder_mystery',
            text: 'Zagadka morderstwa',
            description: 'Rozwiązałeś skomplikowaną sprawę morderstwa, gdy inni się poddali',
            consequences: ['Uznanie przełożonych', 'Reputacja dobrego detektywa'],
            skillModifiers: { 'Tropienie': 15, 'Spostrzegawczość': 10, 'Medycyna': 5 },
            personalityImpact: ['Wytrwały', 'Metodyczny', 'Dumny ze swoich umiejętności'],
            connectionGained: ['Lekarze sądowi', 'Inni detektywi', 'Świadkowie']
          }
        ]
      }
    ],

    'Lekarz': [
      {
        id: 'medical_calling',
        question: 'Dlaczego zostałeś lekarzem?',
        context: 'Medycyna w latach 20. przechodziła rewolucję - odkrycie antybiotyków zmieniało wszystko.',
        category: 'motivation',
        options: [
          {
            id: 'family_tradition',
            text: 'Tradycja rodzinna',
            description: 'Pochodzisz z rodziny lekarzy i naturalnie poszedłeś w ich ślady',
            consequences: ['Prestiż rodzinny', 'Wysokie oczekiwania', 'Gotowa praktyka'],
            skillModifiers: { 'Medycyna': 10, 'Majętność': 20, 'Urok Osobisty': 10 },
            equipmentGained: ['Dziedziczona praktyka', 'Rodzinne instrumenty medyczne'],
            connectionGained: ['Koledzy lekarze', 'Pacjenci rodziny', 'Społeczność medyczna'],
            personalityImpact: ['Pewność siebie', 'Czasami arogancja', 'Poczucie obowiązku']
          },
          {
            id: 'war_experience',
            text: 'Doświadczenie wojenne',
            description: 'Służyłeś jako sanitariusz w Wielkiej Wojnie i widziałeś cierpienie',
            consequences: ['Traumatyczne wspomnienia', 'Praktyczne doświadczenie', 'Szacunek dla życia'],
            skillModifiers: { 'Pierwsza Pomoc': 25, 'Medycyna': 15, 'Psychologia': 10 },
            personalityImpact: ['Twardy', 'Empatyczny', 'Czasami haunted przeszłością'],
            connectionGained: ['Weterani wojenni', 'Pielęgniarki wojenne', 'Inni lekarze polowi']
          },
          {
            id: 'scientific_curiosity',
            text: 'Ciekawość naukowa',
            description: 'Fascynuje cię ludzkie ciało i chcesz poznać jego tajemnice',
            consequences: ['Skłonność do eksperymentowania', 'Zainteresowanie nowymi metodami'],
            skillModifiers: { 'Nauka (Biologia)': 20, 'Korzystanie z Bibliotek': 15, 'Medycyna': 10 },
            personalityImpact: ['Ciekawski', 'Metodyczny', 'Czasami zbyt odważny w eksperymentach']
          }
        ]
      }
    ],

    'Dziennikarz': [
      {
        id: 'journalism_start',
        question: 'Jak zacząłeś karierę dziennikarską?',
        context: 'Lata 20. to złoty wiek prasy - gazety miały ogromny wpływ na opinię publiczną.',
        category: 'career',
        options: [
          {
            id: 'local_scandal',
            text: 'Lokalny skandal',
            description: 'Odkryłeś i nagłośniłeś lokalny skandal, co przyniosło ci rozgłos',
            consequences: ['Reputacja nieustraszony reporter', 'Wrogowie wśród lokalnych elit'],
            skillModifiers: { 'Perswazja': 15, 'Spostrzegawczość': 10, 'Zastraszanie': 5 },
            personalityImpact: ['Odważny', 'Nieustępliwy', 'Czasami bezkompromisowy'],
            connectionGained: ['Informatorzy', 'Inni dziennikarze śledczy', 'Aktywiści społeczni']
          },
          {
            id: 'war_correspondent',
            text: 'Korespondent wojenny',
            description: 'Relacjonowałeś wydarzenia Wielkiej Wojny z pierwszej linii',
            consequences: ['Doświadczenie w trudnych warunkach', 'Traumatyczne wspomnienia'],
            skillModifiers: { 'Psychologia': 10, 'Sztuka Przetrwania': 15, 'Historia': 10 },
            personalityImpact: ['Twardy', 'Realista', 'Szacunek dla prawdy'],
            equipmentGained: ['Aparat polowy', 'Notatki wojenne', 'Kontakty wojskowe']
          }
        ]
      }
    ]
  };

  // Generate background based on occupation and user choices
  async generateBackground(
    occupation: string,
    choices: BackgroundChoice[]
  ): Promise<BackgroundGenerationResult> {
    let backgroundStory = '';
    const skillModifiers: { [skill: string]: number } = {};
    const equipment: string[] = [];
    const connections: string[] = [];
    const personalityTraits: string[] = [];
    const traumaEvents: string[] = [];
    const motivations: string[] = [];

    // Process each choice
    for (const choice of choices) {
      const option = choice.option;
      
      // Build story
      backgroundStory += this.generateStorySegment(choice);
      
      // Apply skill modifiers
      Object.entries(option.skillModifiers).forEach(([skill, modifier]) => {
        skillModifiers[skill] = (skillModifiers[skill] || 0) + modifier;
      });
      
      // Add equipment
      if (option.equipmentGained) {
        equipment.push(...option.equipmentGained);
      }
      
      // Add connections
      if (option.connectionGained) {
        connections.push(...option.connectionGained);
      }
      
      // Add personality impacts
      if (option.personalityImpact) {
        personalityTraits.push(...option.personalityImpact);
      }
    }

    // Generate cohesive narrative
    backgroundStory = this.weaveStoryTogether(backgroundStory, occupation, choices);

    return {
      backgroundStory,
      skillModifiers,
      equipment,
      connections,
      personalityTraits,
      traumaEvents,
      motivations
    };
  }

  // Get questions for specific occupation
  getQuestionsForOccupation(occupation: string): BackgroundQuestion[] {
    return this.questions[occupation] || [];
  }

  // Generate story segment for a choice
  private generateStorySegment(choice: BackgroundChoice): string {
    const option = choice.option;
    
    let segment = `${option.description}. `;
    
    if (option.consequences.length > 0) {
      segment += `To doświadczenie ${option.consequences.join(', i ')}. `;
    }
    
    return segment;
  }

  // Weave individual story segments into cohesive narrative
  private weaveStoryTogether(
    storySegments: string,
    occupation: string,
    choices: BackgroundChoice[]
  ): string {
    const occupationIntro = this.getOccupationIntro(occupation);
    const historicalContext = this.getHistoricalContext();
    
    return `${historicalContext}\n\n${occupationIntro}\n\n${storySegments}\n\nTe doświadczenia ukształtowały cię jako ${occupation.toLowerCase()}, przygotowując do konfrontacji z tym, co wykracza poza normalne granice rzeczywistości.`;
  }

  private getOccupationIntro(occupation: string): string {
    const intros: { [key: string]: string } = {
      'Antykwariusz': 'Jako antykwariusz w latach dwudziestych XX wieku, żyjesz w fascynującym świecie starożytności i zaginionych skarbów przeszłości.',
      'Detektyw': 'Pracujesz jako detektyw w czasach, gdy miasta tętnią życiem, ale kryją też mroczne sekrety prohibicji i przestępczości.',
      'Lekarz': 'Jako lekarz w erze wielkich odkryć medycznych, jesteś świadkiem zarówno triumfów nauki, jak i jej ograniczeń.',
      'Dziennikarz': 'W złotym wieku prasy, jako dziennikarz masz dostęp do informacji i wpływ na opinię publiczną.'
    };
    
    return intros[occupation] || `Jako ${occupation}, masz unikalne doświadczenia zawodowe.`;
  }

  private getHistoricalContext(): string {
    return 'Żyjesz w fascynujących latach dwudziestych XX wieku - erze jazzu, prohibicji i wielkiej zmiany społecznej. Świat dopiero co wyszedł z Wielkiej Wojny, a technologia i społeczeństwo szybko się zmieniają. To czas wielkich możliwości, ale też ukrytych zagrożeń.';
  }

  // Get all available occupations with questions
  getAvailableOccupations(): string[] {
    return Object.keys(this.questions);
  }
}

export const backgroundGenerator = new BackgroundGenerator();
export type { BackgroundQuestion, BackgroundOption, BackgroundChoice, BackgroundGenerationResult };
