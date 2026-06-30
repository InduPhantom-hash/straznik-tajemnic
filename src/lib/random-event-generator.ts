// Random Event Generator - losowe wydarzenia według zasad CoC7

export type EventType = 'encounter' | 'atmospheric' | 'cosmic' | 'urban' | 'research' | 'travel';
export type ThreatLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface RandomEvent {
  id: string;
  type: EventType;
  threatLevel: ThreatLevel;
  title: string;
  description: string;
  location?: string;
  consequences?: string[];
  npcs?: string[];
  items?: string[];
  timestamp: Date;
}

// Tabele losowych wydarzeń
const encounterEvents = {
  low: [
    { title: 'Spotkanie z Mieszkańcem', description: 'Napotykasz lokalnego mieszkańca, który wydaje się przyjazny, ale coś w jego oczach wygląda nieprawidłowo. Czy zdecydujesz się z nim porozmawiać?' },
    { title: 'Zwykły Przechodzień', description: 'Widzisz przechodnia, który spieszy się do swoich spraw. Nie wydaje się być niczym szczególnym, ale w tej okolicy nic nie jest takie, jak się wydaje.' },
    { title: 'Handlarz', description: 'Spotykasz handlarza, który oferuje swoje towary. Coś w jego zapasach przyciąga twoją uwagę - może znajdziesz coś użytecznego?' }
  ],
  medium: [
    { title: 'Podejrzana Postać', description: 'Zauważasz podejrzaną postać, która obserwuje cię z ukrycia. Kiedy próbujesz podejść bliżej, szybko znika w ciemnych uliczkach.' },
    { title: 'Grupa Kultystów', description: 'Napotykasz grupę ludzi w dziwnych szatach, którzy szepczą niezrozumiałe słowa. Wydają się być w transie lub pod wpływem czegoś.' },
    { title: 'Ranny Nieznajomy', description: 'Znajdujesz rannego nieznajomego, który potrzebuje pomocy. Czy zdecydujesz się pomóc, czy lepiej się oddalić?' }
  ],
  high: [
    { title: 'Spotkanie z Potworem', description: 'Przed tobą pojawia się coś, czego nie możesz w pełni zrozumieć. Twój umysł buntuje się przed świadomością tego, co widzisz.' },
    { title: 'Uciekający Świadek', description: 'Ktoś pędzi w twoją stronę, krzycząc o czymś strasznym. Próbuje cię ostrzec, ale coś go dopada zanim zdąży wyjaśnić.' },
    { title: 'Obłędny Mieszkaniec', description: 'Spotykasz kogoś, kto całkowicie stracił kontakt z rzeczywistością. Jego słowa są bezsensowne, ale czasami przemawia przez nie coś... obcego.' }
  ],
  extreme: [
    { title: 'Konfrontacja z Kosmicznym Horrorem', description: 'Stajesz twarzą w twarz z czymś, co nie powinno istnieć. Twoja poczytalność jest wystawiona na najcięższą próbę.' },
    { title: 'Rytuał Kultu', description: 'Przypadkowo natrafiasz na rytuał kultu, który jest w trakcie wykonywania. Czujesz, że coś kosmicznego próbuje przedostać się do tego świata.' },
    { title: 'Portal do Innego Wymiaru', description: 'Widzisz coś, co wygląda jak portal do innego wymiaru. Z jego wnętrza wydostają się rzeczy, które nie powinny istnieć.' }
  ]
};

const atmosphericEvents = {
  low: [
    { title: 'Lekka Mgła', description: 'Wieczorna mgła spowija okolicę, tworząc atmosferę tajemnicy i niepokoju.' },
    { title: 'Ciche Ulica', description: 'Ulica jest dziwnie cicha, jakby całe życie z niej uciekło. Słyszysz tylko swoje kroki.' },
    { title: 'Dziwny Zapach', description: 'Czujesz dziwny, nieokreślony zapach w powietrzu. Czymkolwiek jest, wywołuje lekkie uczucie niepokoju.' }
  ],
  medium: [
    { title: 'Gęsta Mgła', description: 'Gęsta, nieprzenikniona mgła otacza cię ze wszystkich stron. Możesz ledwo widzieć przed sobą, a dźwięki wydają się być zniekształcone.' },
    { title: 'Nagły Wiatr', description: 'Nagły, nienaturalny wiatr podnosi się znikąd. Niesie ze sobą szepty i jęki, które nie powinny istnieć.' },
    { title: 'Cienie Ruchają się', description: 'Zauważasz, że cienie wydają się poruszać niezależnie od swoich źródeł światła. To nie jest złudzenie optyczne.' }
  ],
  high: [
    { title: 'Atmosfera Grozy', description: 'Powietrze staje się gęste i ciężkie, jakby sama rzeczywistość zaczynała się rozpadać. Czujesz, że coś obserwuje cię z niewidzialnego miejsca.' },
    { title: 'Widmowe Echo', description: 'Słyszysz echa wydarzeń, które jeszcze się nie wydarzyły - lub już się wydarzyły, ale w innej rzeczywistości.' },
    { title: 'Zniekształcenie Czasu', description: 'Czas wydaje się płynąć nierówno. Chwile rozciągają się jak guma, a godziny mijają w sekundach.' }
  ],
  extreme: [
    { title: 'Rzeczywistość Pęka', description: 'Rzeczywistość wokół ciebie zaczyna pękać jak szkło. Widzisz przez szczeliny coś, czego ludzkie oko nie powinno widzieć.' },
    { title: 'Kosmiczny Wiatr', description: 'Wiatr z kosmosu wieje przez ulice, niosąc ze sobą świadomość istot, które nie powinny istnieć w tym wymiarze.' },
    { title: 'Atmosfera Obcego Wymiaru', description: 'Czujesz, że nie jesteś już na Ziemi - lub Ziemia nie jest już tym, czym była. Otaczający cię świat nie należy do tego wymiaru.' }
  ]
};

const cosmicEvents = {
  low: [
    { title: 'Dziwne Sny', description: 'W nocy miewasz dziwne sny, które wydają się być czymś więcej niż tylko snami. Czy to wizje przyszłości, czy przeszłości?' },
    { title: 'Deja Vu', description: 'Masz silne poczucie deja vu - jakbyś już kiedyś był w tej sytuacji, ale w innej rzeczywistości.' },
    { title: 'Gwiezdne Znaki', description: 'Gwiazdy na niebie wydają się być w niewłaściwych miejscach, jakby ktoś je przestawił.' }
  ],
  medium: [
    { title: 'Wizja z Przyszłości', description: 'Masz nagłą wizję przyszłości - widzisz coś, co ma się wydarzyć. Ale czy to jest nieuniknione?' },
    { title: 'Szepty z Kosmosu', description: 'Słyszysz szepty w swojej głowie, które wydają się pochodzić z kosmosu. Próbują ci coś powiedzieć, ale ich język jest niezrozumiały.' },
    { title: 'Kosmiczne Wyznanie', description: 'Dostajesz kosmiczne wyznanie - wiedzę, która nie powinna istnieć. Twoja poczytalność zostaje wystawiona na próbę.' }
  ],
  high: [
    { title: 'Wizja Kosmicznego Horroru', description: 'Masz wizję kosmicznego horroru, który czai się za rzeczywistością. Twój umysł próbuje to odrzucić, ale wizja jest zbyt silna.' },
    { title: 'Komunikacja z Obcymi', description: 'Coś z kosmosu próbuje się z tobą skomunikować. Ich myśli wdzierają się do twojego umysłu, powodując ból i obłęd.' },
    { title: 'Przebudzenie Świadomości', description: 'Twoja świadomość rozszerza się poza granice ludzkiego zrozumienia. Widzisz prawdę o kosmosie, która nie powinna być widziana.' }
  ],
  extreme: [
    { title: 'Spotkanie z Wielkim Starym', description: 'Twoja świadomość zostaje przeniesiona do obecności Wielkiego Starego. Jego istota jest zbyt potężna, by ją zrozumieć, a sama obecność grozi obłędem.' },
    { title: 'Wrota do Kosmosu', description: 'Wrota do kosmosu otwierają się przed tobą. Widzisz istoty, które nie powinny istnieć, i prawdę, która niszczy umysł.' },
    { title: 'Przebudzenie Cthulhu', description: 'Czujesz, że gdzieś daleko, na dnie oceanu, coś się budzi. Jego świadomość dociera do ciebie, grożąc całkowitym obłędem.' }
  ]
};

const urbanEvents = {
  low: [
    { title: 'Plotka', description: 'Słyszysz interesującą plotkę w mieście - coś o dziwnych wydarzeniach w okolicy.' },
    { title: 'Gazeta', description: 'Widzisz dziwny artykuł w gazecie, który opisuje coś, co wydaje się być związane z twoją sprawą.' },
    { title: 'Policja', description: 'Policja pyta cię o coś, co wydarzyło się w okolicy. Możliwe, że to związane z twoją sprawą.' }
  ],
  medium: [
    { title: 'Dziwna Gazeta', description: 'Znajdujesz gazetę z dziwnym artykułem o zniknięciach i niewyjaśnionych zdarzeniach. Wydaje się być związana z twoją sprawą.' },
    { title: 'Podejrzana Policja', description: 'Policja wydaje się być zaangażowana w coś większego. Możliwe, że nie są tym, kim się wydają.' },
    { title: 'Miejski Kult', description: 'Dowiadujesz się o tajnym kulcie działającym w mieście. Wydaje się być powiązany z twoją sprawą.' }
  ],
  high: [
    { title: 'Spisek w Mieście', description: 'Odkrywasz, że całe miasto jest uwikłane w spisek, który wykracza poza ludzkie zrozumienie.' },
    { title: 'Kontrola Miejscowej Władzy', description: 'Miejscowa władza wydaje się być kontrolowana przez coś obcego. Nikt nie może im ufać.' },
    { title: 'Miasteczko Kultu', description: 'Odkrywasz, że całe miasto jest w rzeczywistości świątynią dla czegoś kosmicznego i przerażającego.' }
  ],
  extreme: [
    { title: 'Miasto jako Wrota', description: 'Odkrywasz, że miasto zostało zbudowane jako wrota do innego wymiaru. Każda ulica, każdy budynek, ma swoje ukryte znaczenie.' },
    { title: 'Mieszkańcy jako Kult', description: 'Wszyscy mieszkańcy miasta są członkami kosmicznego kultu. Nie ma nikogo, komu możesz ufać.' },
    { title: 'Rytuał Miejski', description: 'Całe miasto uczestniczy w masowym rytuale, który ma przebudzić coś kosmicznego. Jesteś w samym środku tego.' }
  ]
};

const researchEvents = {
  low: [
    { title: 'Interesujący Dokument', description: 'Znajdujesz interesujący dokument, który może zawierać wskazówki do twojej sprawy.' },
    { title: 'Biblioteka', description: 'Odkrywasz cenną książkę w bibliotece, która może pomóc w twoich badaniach.' },
    { title: 'Stara Notatka', description: 'Znajdujesz starą notatkę, która wydaje się być związana z twoją sprawą.' }
  ],
  medium: [
    { title: 'Zakazana Księga', description: 'Znajdujesz zakazaną księgę, która zawiera informacje o kosmicznych horrorach. Czytanie jej grozi utratą poczytalności.' },
    { title: 'Tajemniczy Dokument', description: 'Odkrywasz tajemniczy dokument, który opisuje rzeczy, które nie powinny istnieć.' },
    { title: 'Stara Legenda', description: 'Znajdujesz starą legendę, która wydaje się być związana z twoją sprawą. Ale czy to tylko legenda?' }
  ],
  high: [
    { title: 'Necronomicon', description: 'Natrafiasz na kopię Necronomiconu - księgi, która nie powinna istnieć. Każda strona grozi obłędem.' },
    { title: 'Kosmiczna Wiedza', description: 'Odkrywasz wiedzę, która wykracza poza ludzkie zrozumienie. Samo poznanie tej wiedzy grozi utratą poczytalności.' },
    { title: 'Przeklęty Tekst', description: 'Znajdujesz tekst, który został przeklęty przez kosmiczne istoty. Czytanie go grozi nie tylko obłędem, ale i śmiercią.' }
  ],
  extreme: [
    { title: 'Przebudzenie Wiedzy', description: 'Odkrywasz wiedzę, która przebudza coś w kosmosie. Ta wiedza nie powinna być znana żadnemu człowiekowi.' },
    { title: 'Wrota Wiedzy', description: 'Księga otwiera przed tobą wrota do wiedzy, która wykracza poza granice rzeczywistości. Ale każde otwarcie grozi kosmicznym horrorom.' },
    { title: 'Przekazanie Kosmicznej Świadomości', description: 'Tekst przekazuje ci kosmiczną świadomość, która niszczy twoje ludzkie zrozumienie świata.' }
  ]
};

const travelEvents = {
  low: [
    { title: 'Spokojna Podróż', description: 'Podróż przebiega spokojnie, bez żadnych przeszkód.' },
    { title: 'Lekkie Opóźnienie', description: 'Twoja podróż jest lekko opóźniona, ale nic poważnego się nie dzieje.' },
    { title: 'Ciekawy Współpasażer', description: 'Spotykasz ciekawego współpasażera, który opowiada interesujące historie.' }
  ],
  medium: [
    { title: 'Dziwny Współpasażer', description: 'Twój współpasażer wydaje się być dziwny. Coś w jego zachowaniu wywołuje niepokój.' },
    { title: 'Opóźnienie z Powodu Dziwnych Wydarzeń', description: 'Twoja podróż jest opóźniona z powodu dziwnych wydarzeń, o których nikt nie chce rozmawiać.' },
    { title: 'Podejrzana Trasa', description: 'Twoja trasa prowadzi przez podejrzaną okolicę, gdzie słychać dziwne dźwięki.' }
  ],
  high: [
    { title: 'Atak w Podróży', description: 'Twoja podróż zostaje przerwana przez atak czegoś nie-ludzkiego. Musisz walczyć o swoje życie.' },
    { title: 'Zagubienie w Kosmicznej Przestrzeni', description: 'Twoja podróż prowadzi cię przez przestrzeń, która nie należy do tego wymiaru.' },
    { title: 'Przewoźnik jako Kultysta', description: 'Odkrywasz, że twój przewoźnik jest członkiem kosmicznego kultu. Podróż może być pułapką.' }
  ],
  extreme: [
    { title: 'Podróż do Innego Wymiaru', description: 'Twoja podróż prowadzi cię do innego wymiaru, gdzie rzeczywistość nie działa tak, jak powinna.' },
    { title: 'Pojazd jako Wrota', description: 'Odkrywasz, że pojazd, którym podróżujesz, jest w rzeczywistości wrotami do kosmicznego horroru.' },
    { title: 'Podróż z Kosmicznym Horrorzem', description: 'Podróżujesz z kosmicznym horrorem, który nie powinien istnieć w tym wymiarze.' }
  ]
};

const eventTables: Record<EventType, Record<ThreatLevel, Array<{ title: string; description: string }>>> = {
  encounter: encounterEvents,
  atmospheric: atmosphericEvents,
  cosmic: cosmicEvents,
  urban: urbanEvents,
  research: researchEvents,
  travel: travelEvents
};

/**
 * Generuje losowe wydarzenie
 */
export function generateRandomEvent(
  type?: EventType,
  threatLevel?: ThreatLevel,
  location?: string,
  context?: string
): RandomEvent {
  // Jeśli typ nie jest określony, losuj go
  const eventType: EventType = type || (
    ['encounter', 'atmospheric', 'cosmic', 'urban', 'research', 'travel'][
      Math.floor(Math.random() * 6)
    ] as EventType
  );

  // Jeśli poziom zagrożenia nie jest określony, losuj go
  const level: ThreatLevel = threatLevel || (
    Math.random() < 0.4 ? 'low' :
    Math.random() < 0.7 ? 'medium' :
    Math.random() < 0.9 ? 'high' : 'extreme'
  );

  const table = eventTables[eventType][level];
  const randomEvent = table[Math.floor(Math.random() * table.length)];

  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
    type: eventType,
    threatLevel: level,
    title: randomEvent.title,
    description: context ? `${randomEvent.description}\n\nKontekst: ${context}` : randomEvent.description,
    location,
    timestamp: new Date()
  };
}

/**
 * Generuje wiele wydarzeń
 */
export function generateMultipleEvents(
  count: number,
  type?: EventType,
  threatLevel?: ThreatLevel,
  location?: string
): RandomEvent[] {
  const events: RandomEvent[] = [];
  for (let i = 0; i < count; i++) {
    events.push(generateRandomEvent(type, threatLevel, location));
  }
  return events;
}

