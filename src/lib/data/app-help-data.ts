export interface HelpSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  bulletPoints?: string[];
  tips?: string[];
  iconName?: string;
}

export interface HelpCategory {
  id: 'ui' | 'ai-gm' | 'player-guide';
  title: string;
  description: string;
  icon: string;
  items: HelpSectionItem[];
}

export const APP_HELP_DATA: HelpCategory[] = [
  {
    id: 'ui',
    title: 'Elementy Interfejsu',
    description: 'Przewodnik po komponentach i funkcjach interfejsu Strażnika Tajemnic.',
    icon: 'Layout',
    items: [
      {
        id: 'character-sheet',
        title: 'Karta Badacza (Postaci)',
        subtitle: 'Atrybuty, Umiejętności i Stan Psychiczny',
        description: 'Twój główny dowód tożsamości w świecie gry. Karta zawiera wartości cech głównych (Siła, Kondycja, Poczytalność itp.) oraz procentowe umiejętności.',
        bulletPoints: [
          'Śledź bieżący poziom Poczytalności (SAN) i Punkty Magii/Zdrowia.',
          'Po pomyślnych rzutach umiejętności zostają oznaczone – wykorzystasz je w Fazie Rozwoju po sesji!',
          'Możesz w każdej chwili przejrzeć historię fabularną postaci oraz jej ekwipunek.'
        ],
        iconName: 'User'
      },
      {
        id: 'corkboard-journal',
        title: 'Dziennik & Korkowa Tablica Poszlak',
        subtitle: 'Prywatny detektywistyczny boczny panel',
        description: 'Płótno śledztwa w stylu retro. Pozwala przypinać poszlaki, łączyć je czerwonymi nitkami i nadawać im statusy hipotez.',
        bulletPoints: [
          'Przeciągaj karty poszlak na tablicę 2400x1600px.',
          'Łącz karty zakrzywionymi nitkami SVG z własnymi etykietami relacji.',
          'Nadawaj poszlakom statusy: Potwierdzona, Hipoteza, Obalona.',
          'Otwieraj skany dowodów w pełnoekranowym Lightboxie Art Déco.'
        ],
        iconName: 'BookOpen'
      },
      {
        id: 'dice-tray',
        title: 'Kostki & Tacka Rzutów',
        subtitle: 'System sprawdzianów mechanicznych',
        description: 'Aplikacja opiera się na mechanice Call of Cthulhu 7E (k100). Strażnik sam prosi o rzuty gdy sytuacja wymaga weryfikacji.',
        bulletPoints: [
          'Rzuty automatyczne (wykonywane w czacie przez AI) vs rzuty manualne na 3D tacce.',
          'Poziomy sukcesu: Krytyk (01), Ekstremalny (1/5), Trudny (1/2), Zwykły (<= umiejętność), Porażka, Farsa/Fumble (96-100).',
          'Obsługa Kości Premiowych (Bonus Dice) i Kości Kary (Penalty Dice).'
        ],
        iconName: 'Dices'
      },
      {
        id: 'equipment-wealth',
        title: 'Ekwipunek & Majątek',
        subtitle: 'Przedmioty i stan posiadania',
        description: 'Zarządzaj przedmiotami noszonymi przy sobie oraz majątkiem dostosowanym do epoki i zamożności badacza.',
        bulletPoints: [
          'Dodawaj przedmioty zdobyte w trakcie śledztwa.',
          'Sprawdzaj broń, pancerz, ekwipunek osobisty i kluczowe rekwizyty.'
        ],
        iconName: 'Package'
      }
    ]
  },
  {
    id: 'ai-gm',
    title: 'Strażnik Tajemnic AI',
    description: 'Czym różni się wirtualny Strażnik od tradycyjnego spotkania i jak dba o grę.',
    icon: 'Bot',
    items: [
      {
        id: 'rules-enforcement',
        title: 'Automatyzacja Zasad CoC 7E',
        subtitle: 'Mechanika zawsze pod kontrolą',
        description: 'Wirtualny Strażnik Tajemnic zna pełne zasady zewu Cthulhu 7. edycji. Sam pilnuje progów trudności rzutów, utraty Poczytalności oraz konsekwencji Porażki.',
        bulletPoints: [
          'Nie musisz kartkować podręcznika ani liczyć ułamków – AI wylicza progi pomyślności automatycznie.',
          'Poczytalność i poczytalność tymczasowa (Mitomania/Bunt) są rozliczane bezbłędnie na podstawie zadanych obrażeń psychicznych.'
        ],
        iconName: 'ShieldCheck'
      },
      {
        id: 'lore-consistency',
        title: 'Spójność Fabuły & Mitów',
        subtitle: 'Ciągłość historyczna i horror kosmiczny',
        description: 'Strażnik Tajemnic dba o zachowanie autentyczności epoki (lata 1920 / lata 90.) oraz spójność wątków śledztwa.',
        bulletPoints: [
          'AI pamięta odkryte przez Ciebie poszlaki i wykorzystuje je w dialogach z NPC-ami.',
          'Świat reaguje racjonalnie i mrocznie na decyzje gracza.'
        ],
        iconName: 'Sparkles'
      }
    ]
  },
  {
    id: 'player-guide',
    title: 'Poradnik Gracza & Protipy',
    description: 'Jak być dobrym graczem RPG i wycisnąć maksimum klimatu z interakcji z AI.',
    icon: 'Sparkles',
    items: [
      {
        id: 'vibe-disclaimer',
        title: 'Zasada Numer Jeden: Graj po swojemu!',
        subtitle: 'Bezstresowa przestrzeń przy stole',
        description: 'Pamiętaj: to jest Twój prywatny teatr wyobraźni! Poniższe poradniki to tylko niezobowiązujące inspiracje i protipy, które mogą podnieść imersję. Graj dokładnie tak, jak sprawia Ci to najwięcej radości i satysfakcji.',
        iconName: 'Heart'
      },
      {
        id: 'chat-prompting',
        title: 'Jak rozmawiać z AI, by budować klimat',
        subtitle: 'Sztuka opisowych promptów i deklaracji',
        description: 'Wirtualny Strażnik Tajemnic reaguje plastycznie na to, jak formujesz swoje wiadomości. Im bardziej obrazowa deklaracja, tym głębsza i mroczniejsza odpowiedź.',
        bulletPoints: [
          'Zamiast krótko: "Atakuję go" ➔ Opisz emocje: "Wyciągam rewolwer z drżącymi dłońmi, wycofuję się w cień i krzyczę: Kto tam jest?!"',
          'Włącz zmysły: Opisuj co Twoja postać dotyka, czuje (zapach ozonu, zimny pot) i jakie myśli przebiegają jej przez głowę.',
          'Używaj mowy zależnej lub bezpośredniego dialogu w cudzysłowach.'
        ],
        iconName: 'MessageSquare'
      },
      {
        id: 'world-co-creation',
        title: 'Współtworzenie Świata',
        subtitle: 'Miej wpływ na otoczenie',
        description: 'Nie bój się dopowiadać drobnych detali otoczenia, które pasują do sceny!',
        bulletPoints: [
          'Przykłady: "Chwytam za ciężki mosiężny świecznik leżący na biurku...", "Sięgam do wewnętrznej kieszeni płaszcza po zapalniczkę..."',
          'Podrzucaj AI wątki z tła postaci – zaciągnięte długi, lęki z dzieciństwa, dawnych znajomych. Strażnik z chęcią wplecie je do przygody!'
        ],
        iconName: 'Compass'
      },
      {
        id: 'useful-links',
        title: 'Katalogi & Przydatne Linki',
        subtitle: 'Pogłębiaj wiedzę o Zewie Cthulhu',
        description: 'Wyselekcjonowane zbiory poradników, zasad i materiałów dla graczy RPG:',
        bulletPoints: [
          'Zasady Call of Cthulhu 7E Starter – darmowy skrót zasad Chaosium.',
          'Poradniki Prowadzenia i Odgrywania RPG – techniki imersji i bezpieczeństwa przy stole.',
          'Historia i Realia Epoki – źródła wiedzy o świecie lat 20. XX wieku.'
        ],
        iconName: 'ExternalLink'
      }
    ]
  }
];
