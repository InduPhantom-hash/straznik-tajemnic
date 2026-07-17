/**
 * Bazowe umiejętności CoC 7e, opisy dla tooltipów + limity podczas tworzenia.
 *
 * IND-123 (sesja 90) — wyodrębnione z character-wizard.tsx Faza 1.
 */

export const SKILL_DESCRIPTIONS: Record<string, string> = {
  Antropologia:
    'Wiedza o kulturach i społeczeństwach ludzkich. Używaj do rozumienia obcych zwyczajów i rytuałów.',
  Archeologia:
    'Znajomość starożytnych cywilizacji i artefaktów. Identyfikacja historycznych przedmiotów.',
  Biblioteka:
    'Zdolność znajdowania informacji w archiwach, bibliotekach i dokumentach pisanych.',
  'Broń Palna': 'Umiejętność strzelania z pistoletów i rewolwerów. Baza: 20%',
  'Broń Palna (Karabin)':
    'Umiejętność strzelania z karabinów i strzelb. Baza: 25%',
  Elektryka:
    'Naprawa i obsługa urządzeń elektrycznych. Praca z okablowaniem i systemami.',
  Gadanina:
    'Umiejętność przekonywania i oszukiwania. Skuteczna przy krótkich interakcjach.',
  Historia:
    'Wiedza o wydarzeniach historycznych. Rozpoznawanie kontekstu i znaczenia.',
  Jeździectwo:
    'Umiejętność jazdy konnej. Kontrola wierzchowca w trudnych sytuacjach.',
  'Język Obcy': 'Znajomość obcego języka. Wartość = % opanowania języka.',
  'Język Ojczysty': 'Biegłość w języku ojczystym. Automatycznie = WYK.',
  Komputery:
    'Obsługa systemów komputerowych (era współczesna). Programowanie i hacking.',
  Księgowość:
    'Analiza finansowa i dokumentacji księgowej. Wykrywanie malwersacji.',
  Mechanika:
    'Naprawa maszyn i urządzeń mechanicznych. Silniki, zamki, mechanizmy.',
  Medycyna: 'Profesjonalna wiedza medyczna. Diagnozowanie i leczenie chorób.',
  Nauka:
    'Wiedza naukowa w konkretnej specjalizacji (biologia, chemia, fizyka itp.).',
  Nasłuchiwanie:
    'Zdolność słyszenia ukrytych dźwięków. Podsłuchiwanie rozmów. Baza: 20%',
  Occultyzm:
    'Wiedza o okultyzmie, magii i nadprzyrodzoności. NIE dotyczy Mitów Cthulhu.',
  Orientacja: 'Zdolność nawigacji i odnajdywania drogi. Mapy, gwiazdy, teren.',
  'Pierwsza Pomoc':
    'Podstawowa pomoc medyczna. Opatrywanie ran i stabilizacja. Baza: 30%',
  Pilotowanie:
    'Prowadzenie pojazdów powietrznych lub wodnych. Wymaga specjalizacji.',
  Pływanie: 'Umiejętność pływania i nurkowania. Baza: 20%',
  Prawo:
    'Znajomość prawa i procedur prawnych. Używane przez prawników i detektywów.',
  'Prowadzenie Samochodu':
    'Umiejętność prowadzenia samochodów. Pościgi i manewry. Baza: 20%',
  Przebranie: 'Maskowanie tożsamości. Zmienianie wyglądu, głosu, postawy.',
  Przetrwanie:
    'Umiejętność przeżycia w dziczy. Znajdowanie wody, jedzenia, schronienia.',
  Perswazja: 'Przekonywanie poprzez argumenty i logikę. Baza: 10%',
  Psychologia:
    'Rozumienie ludzkich motywacji i emocji. Wykrywanie kłamstw. Baza: 10%',
  Rzucanie: 'Celne rzucanie przedmiotami. Granaty, noże, kamienie. Baza: 20%',
  Skok: 'Zdolność skakania na odległość lub wysokość. Baza: 20%',
  Skradanie: 'Ciche poruszanie się bez zwracania uwagi. Baza: 20%',
  Spostrzegawczość: 'Dostrzeganie szczegółów i ukrytych rzeczy. Baza: 25%',
  'Sztuka/Rzemiosło':
    'Umiejętność artystyczna lub rzemieślnicza. Wymaga specjalizacji.',
  Ślusarstwo: 'Otwieranie zamków i sejfów bez klucza. Narzędzia włamywacza.',
  Tropienie: 'Śledzenie śladów ludzi i zwierząt. Baza: 10%',
  Unik: 'Unikanie ataków w walce. Automatycznie = ZR/2',
  Ukrywanie: 'Chowanie przedmiotów lub siebie. Baza: 20%',
  'Urok Osobisty': 'Charyzma i osobisty magnetyzm. Baza: 15%',
  'Walka Wręcz':
    'Walka bez broni lub bronią białą. Bijatyka, miecze, noże. Baza: 25%',
  Wspinaczka: 'Wspinanie się po budynkach, klifach, drzewach. Baza: 20%',
  Wycena: 'Określanie wartości przedmiotów. Antyki, biżuteria, dzieła sztuki.',
  Zastraszanie: 'Zastraszanie i groźby. Wymuszanie posłuszeństwa. Baza: 15%',
  Majętność:
    'Status materialny postaci. Określa styl życia i dostęp do pieniędzy.',
};

// Bazowe umiejętności (Unik i Język Ojczysty są obliczane dynamicznie)
export const BASE_SKILLS: Record<string, number> = {
  Antropologia: 1,
  Archeologia: 1,
  Biblioteka: 20,
  'Broń Palna': 20,
  'Broń Palna (Karabin)': 25,
  Elektryka: 10,
  Gadanina: 5,
  Historia: 5,
  Jeździectwo: 5,
  'Język Obcy': 1,
  'Język Ojczysty': 0, // Ustawiane dynamicznie = WYK
  Komputery: 5,
  Księgowość: 5,
  Mechanika: 10,
  Medycyna: 1,
  Nauka: 1,
  Nasłuchiwanie: 20,
  Occultyzm: 5,
  Orientacja: 10,
  'Pierwsza Pomoc': 30,
  Pilotowanie: 1,
  Pływanie: 20,
  Prawo: 5,
  'Prowadzenie Samochodu': 20,
  Przebranie: 5,
  Przetrwanie: 10,
  Perswazja: 10,
  Psychologia: 10,
  Rzucanie: 20,
  Skok: 20,
  Skradanie: 20,
  Spostrzegawczość: 25,
  'Sztuka/Rzemiosło': 5,
  Ślusarstwo: 1,
  Tropienie: 10,
  Unik: 0, // Ustawiane dynamicznie = ZR/2
  Ukrywanie: 20,
  'Urok Osobisty': 15,
  'Walka Wręcz': 25,
  Wspinaczka: 20,
  Wycena: 5,
  Zastraszanie: 15,
  Majętność: 0,
};

// Maksymalny poziom umiejętności podczas tworzenia postaci (wyjątki: Język Ojczysty, Majętność)
export const SKILL_CREATION_LIMIT = 75;
export const SKILL_LIMIT_EXCEPTIONS = ['Język Ojczysty', 'Majętność'];
