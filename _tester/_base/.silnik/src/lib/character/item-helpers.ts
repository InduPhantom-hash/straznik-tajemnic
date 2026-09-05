/**
 * Helpery do generowania opisów wizualnych, lore, kategorii i wagi przedmiotów
 * na podstawie samej nazwy (heurystyka tekstowa).
 *
 * IND-123 (sesja 90) — wyodrębnione z character-wizard.tsx Faza 2.
 *
 * UWAGA: hardcoded dictionaries (~190 lin) to świadomy dług IND-126 (CoC items DRY).
 */

export type ItemCategory =
  | 'weapon'
  | 'tool'
  | 'document'
  | 'artifact'
  | 'consumable'
  | 'other';

/** Generuje opis wyglądu fizycznego (visualDescription) na podstawie nazwy przedmiotu. */
export function generateVisualDescription(itemName: string, locale: string = 'pl'): string {
  const nameLower = itemName.toLowerCase();
  const isEn = locale === 'en';

  if (nameLower.includes('zegarek') || nameLower.includes('watch')) {
    return isEn
      ? 'silver case with engraved ornaments, roman numeral dial, chain made of patinated silver'
      : 'srebrna koperta z grawerowanymi ornamentami, tarcza z rzymskimi cyframi, łańcuszek z patynowanego srebra';
  } else if (
    nameLower.includes('pierścień') ||
    nameLower.includes('ring') ||
    nameLower.includes('obrączka')
  ) {
    return isEn
      ? 'gold band with subtle pattern, signs of wear, warm metallic gleam'
      : 'złoty band z subtelnym wzorem, ślady noszenia, ciepły blask metalu';
  } else if (
    nameLower.includes('naszyjnik') ||
    nameLower.includes('wisiorek') ||
    nameLower.includes('medalion') ||
    nameLower.includes('necklace') ||
    nameLower.includes('locket')
  ) {
    return isEn
      ? 'ornate pendant on a chain, ancient style, enigmatic symbols'
      : 'ozdobny wisiorek na łańcuszku, starożytny styl, tajemnicze symbole';
  } else if (
    nameLower.includes('zdjęcie') ||
    nameLower.includes('foto') ||
    nameLower.includes('portret') ||
    nameLower.includes('photo') ||
    nameLower.includes('portrait')
  ) {
    return isEn
      ? 'yellowed photograph in a modest frame, sepia tones, creased corners'
      : 'pożółkła fotografia w ramce, sepia tones, wymięte rogi';
  } else if (nameLower.includes('list') || nameLower.includes('letter')) {
    return isEn
      ? 'folded sheet of paper with faded ink, wax seal remnants'
      : 'złożona kartka papieru z wyblakłym atramentem, pieczęć z wosku';
  } else if (
    nameLower.includes('książka') ||
    nameLower.includes('dziennik') ||
    nameLower.includes('notatnik') ||
    nameLower.includes('book') ||
    nameLower.includes('journal') ||
    nameLower.includes('diary') ||
    nameLower.includes('notebook')
  ) {
    return isEn
      ? 'leather binding with gilt lettering, yellowed pages, distinct signs of frequent use'
      : 'skórzana oprawa ze złoceniami, pożółkłe strony, ślady użytkowania';
  } else {
    return isEn
      ? 'antique personal item, patina of time, brass and aged leather details'
      : 'antyczny przedmiot osobisty, patyna czasu, detale z mosiądzu i skóry';
  }
}

/** Generuje opis fabularny (lore) na podstawie nazwy przedmiotu. */
export function generateItemLore(itemName: string, locale: string = 'pl'): string {
  const nameLower = itemName.toLowerCase();
  const isEn = locale === 'en';

  // Broń
  if (
    nameLower.includes('rewolwer') ||
    nameLower.includes('pistolet') ||
    nameLower.includes('broń') ||
    nameLower.includes('revolver') ||
    nameLower.includes('pistol') ||
    nameLower.includes('gun') ||
    nameLower.includes('derringer') ||
    nameLower.includes('automatic') ||
    nameLower.includes('colt')
  ) {
    return isEn
      ? 'Carefully maintained firearm, regularly cleaned and oiled. The weight of cold metal in hand brings a reassuring sense of safety in dark alleys.'
      : 'Starannie utrzymana broń, regularnie czyszczona i oliwiona. Ciężar metalu w dłoni daje poczucie bezpieczeństwa w mrocznych zaułkach.';
  }
  if (
    nameLower.includes('strzelb') ||
    nameLower.includes('dubeltów') ||
    nameLower.includes('karabin') ||
    nameLower.includes('shotgun') ||
    nameLower.includes('rifle')
  ) {
    return isEn
      ? 'Sturdy hunting firearm built for stopping power. The wooden stock carries scratches from previous wilderness expeditions.'
      : 'Solidna broń długa o dużej sile rażenia. Drewniana kolba nosi rysy po poprzednich wyprawach w teren.';
  }
  if (
    nameLower.includes('nóż') ||
    nameLower.includes('sztylet') ||
    nameLower.includes('maczeta') ||
    nameLower.includes('pałka') ||
    nameLower.includes('knife') ||
    nameLower.includes('dagger') ||
    nameLower.includes('machete') ||
    nameLower.includes('club') ||
    nameLower.includes('baton')
  ) {
    return isEn
      ? 'A well-balanced weapon with a firm grip. Dependable both for practical wilderness tasks and sudden desperate encounters.'
      : 'Ostrze o dobrze wyważonej rękojeści. Przydatne zarówno do codziennych zadań jak i w sytuacjach awaryjnych.';
  }

  // Oświetlenie
  if (nameLower.includes('latarka') || nameLower.includes('lamp') || nameLower.includes('lantern') || nameLower.includes('flashlight')) {
    return isEn
      ? 'A steady beam of light against the oppressive darkness, revealing clues that preferred to remain hidden.'
      : 'Niezawodne źródło światła w ciemnościach. Snop światła przecina mrok, odsłaniając to, co chciałoby pozostać ukryte.';
  }
  if (
    nameLower.includes('świeca') ||
    nameLower.includes('zapałki') ||
    nameLower.includes('zapalniczka') ||
    nameLower.includes('candle') ||
    nameLower.includes('match') ||
    nameLower.includes('lighter')
  ) {
    return isEn
      ? 'A simple way to dispel shadows. The small flame offers not only visibility, but a spark of reassuring warmth.'
      : 'Prosty sposób na rozproszenie ciemności. Płomień daje nie tylko światło, ale i odrobinę ciepła w chłodne noce.';
  }

  // Dokumenty i notatki
  if (
    nameLower.includes('notes') ||
    nameLower.includes('notatnik') ||
    nameLower.includes('dziennik') ||
    nameLower.includes('szkicownik') ||
    nameLower.includes('notebook') ||
    nameLower.includes('diary') ||
    nameLower.includes('journal')
  ) {
    return isEn
      ? 'A worn notebook filled with field observations, dates, and hurried sketches. Some pages are dog-eared and stained with ink.'
      : 'Podniszczony zeszyt pełen notatek i obserwacji. Niektóre strony są wyrwane, inne zapisane nerwowym pismem.';
  }
  if (nameLower.includes('mapa') || nameLower.includes('map') || nameLower.includes('plan')) {
    return isEn
      ? 'A creased, repeatedly folded map. Key routes and remote buildings are marked with discreet penciled circles.'
      : 'Sfatygowana mapa ze śladami wielokrotnego składania. Niektóre miejsca są zakreślone, inne przekreślone z nieznanych powodów.';
  }
  if (
    nameLower.includes('książka') ||
    nameLower.includes('ksiąg') ||
    nameLower.includes('book') ||
    nameLower.includes('tome') ||
    nameLower.includes('biblia') ||
    nameLower.includes('modlitewnik')
  ) {
    return isEn
      ? 'A thick, bound volume smelling of aged paper and dry dust. Its passages hold knowledge forgotten by modern scholars.'
      : 'Gruba księga pachnąca starym papierem i kurzem. Jej stronice kryją wiedzę zapomnianą przez współczesnych badaczy.';
  }

  // Narzędzia
  if (nameLower.includes('lina') || nameLower.includes('sznur') || nameLower.includes('rope')) {
    return isEn
      ? 'Dependable coiled rope with reinforced fibers. A vital lifeline when navigating steep descents or securing treacherous paths.'
      : 'Solidna lina o odpowiedniej długości. Może uratować życie przy wspinaczce lub przeprawie przez niebezpieczny teren.';
  }
  if (
    nameLower.includes('lom') ||
    nameLower.includes('łom') ||
    nameLower.includes('wytrych') ||
    nameLower.includes('crowbar') ||
    nameLower.includes('lockpick') ||
    nameLower.includes('lock pick')
  ) {
    return isEn
      ? 'A versatile mechanical tool designed for forced entry and stubborn locks. Far better to carry it along than to face a barred door empty-handed.'
      : 'Narzędzie o wielu zastosowaniach - od otwierania zamków po wejście przez zablokowane drzwi. Lepiej mieć je i nie potrzebować.';
  }
  if (
    nameLower.includes('apteczka') ||
    nameLower.includes('bandaż') ||
    nameLower.includes('medycz') ||
    nameLower.includes('first aid') ||
    nameLower.includes('bandage') ||
    nameLower.includes('medicine') ||
    nameLower.includes('morfin') ||
    nameLower.includes('morphine')
  ) {
    return isEn
      ? 'Essential emergency medical supplies: sterile dressings, disinfectant, and pain relievers indispensable during remote investigations.'
      : 'Podstawowe zaopatrzenie medyczne. Bandaże, środki odkażające i kilka tabletek przeciwbólowych - w terenie to skarb.';
  }

  // Elektronika i przyrządy badawcze
  if (
    nameLower.includes('telefon') ||
    nameLower.includes('komórka') ||
    nameLower.includes('smartfon') ||
    nameLower.includes('phone')
  ) {
    return isEn
      ? 'An indispensable tool for modern research: instant communication, navigation, and access to archives in one handheld device.'
      : 'Nieodłączny towarzysz współczesnego badacza. Dostęp do informacji, nawigacja, komunikacja - wszystko w jednym urządzeniu.';
  }
  if (nameLower.includes('laptop') || nameLower.includes('komputer') || nameLower.includes('computer')) {
    return isEn
      ? 'A portable digital station storing encrypted case files, research records, and investigative databases.'
      : 'Przenośne centrum dowodzenia do badań i analizy zebranych danych. Zabezpieczone hasłem, zawiera ważne pliki.';
  }
  if (
    nameLower.includes('kamera') ||
    nameLower.includes('aparat') ||
    nameLower.includes('foto') ||
    nameLower.includes('camera')
  ) {
    return isEn
      ? 'An optical instrument for documenting physical evidence. Developed plates occasionally capture subtle phenomena imperceptible to the naked eye.'
      : 'Urządzenie do dokumentowania odkryć. Niektóre zdjęcia pokazują więcej niż widziało ludzkie oko.';
  }
  if (nameLower.includes('dyktafon') || nameLower.includes('rejestrator') || nameLower.includes('recorder')) {
    return isEn
      ? 'A compact audio recorder for witness interviews. Listening back to recordings sometimes reveals faint whispers unheard during the session.'
      : 'Nagrywanie wywiadów i własnych obserwacji. Czasem odsłuchując nagrania słychać rzeczy, których nie było słychać na żywo.';
  }
  if (nameLower.includes('emf') || nameLower.includes('elektroma') || nameLower.includes('detektor') || nameLower.includes('detector')) {
    return isEn
      ? 'A sensitive instrument measuring electromagnetic fluctuations. Its needle twitches erratically near unnatural phenomena.'
      : 'Urządzenie do wykrywania anomalii elektromagnetycznych. Detektor piszczy w obecności nietypowych pól energetycznych.';
  }

  // Plecaki i torby
  if (
    nameLower.includes('plecak') ||
    nameLower.includes('torba') ||
    nameLower.includes('worek') ||
    nameLower.includes('aktówk') ||
    nameLower.includes('backpack') ||
    nameLower.includes('bag') ||
    nameLower.includes('briefcase')
  ) {
    return isEn
      ? 'A roomy, durable travel satchel with signs of constant wear. Multiple compartments keep gear organized during long treks.'
      : 'Pojemny plecak ze śladami intensywnego użytkowania. Wiele kieszeni pozwala uporządkować ekwipunek na wyprawy.';
  }
  if (
    nameLower.includes('manierka') ||
    nameLower.includes('piersiówka') ||
    nameLower.includes('flask') ||
    nameLower.includes('butelka') ||
    nameLower.includes('bottle')
  ) {
    return isEn
      ? 'A rugged metal container for water or comforting liquor, proven indispensable during grueling vigils.'
      : 'Solidne naczynie na wodę lub mocniejszy trunek. Niezbędne podczas długich wędrówek z dala od cywilizacji.';
  }

  // Okultystyczne
  if (nameLower.includes('ouija') || nameLower.includes('ouja')) {
    return isEn
      ? 'A spirit board etched with weathered letters and numbers. Local rumor claims its previous owner died under mysterious circumstances.'
      : 'Plansza do wywoływania duchów z wyblakłymi literami. Poprzedni właściciel podobno zmarł w niewyjaśnionych okolicznościach.';
  }
  if (nameLower.includes('tarot') || nameLower.includes('karty') || nameLower.includes('cards')) {
    return isEn
      ? 'An antique deck of cards of mysterious origin. The painted figures seem subtly alter their expressions depending on the ambient candlelight.'
      : 'Stara talia kart o nieznanym pochodzeniu. Obrazy na kartach zdają się zmieniać w zależności od kąta patrzenia.';
  }
  if (
    nameLower.includes('krzyż') ||
    nameLower.includes('różaniec') ||
    nameLower.includes('amulet') ||
    nameLower.includes('cross') ||
    nameLower.includes('rosary') ||
    nameLower.includes('talisman')
  ) {
    return isEn
      ? 'An item of spiritual reverence carried as a safeguard against malevolence. Whether its warding power is tangible remains a matter of conviction.'
      : 'Przedmiot o znaczeniu duchowym, noszony dla ochrony przed złem. Czy rzeczywiście chroni, pozostaje kwestią wiary.';
  }

  // Specjalistyczne przyrządy badawcze z 30 zawodów CoC 7e
  if (nameLower.includes('termometr') || nameLower.includes('thermometer')) {
    return isEn
      ? 'Precision mercury gauge. Abrupt temperature plunges in closed rooms are often the foremost harbinger of extradimensional intrusion.'
      : 'Precyzyjny przyrząd pomiarowy. Nagłe spadki temperatury w pomieszczeniu to często pierwszy zwiastun obecności spoza naszego wymiaru.';
  }
  if (nameLower.includes('statyw') || nameLower.includes('tripod')) {
    return isEn
      ? 'Solid brass tripod ensuring photographic stability during lengthy exposures in dimly lit corridors.'
      : 'Solidny statyw gwarantujący stabilność aparatu przy długich ekspozycjach w ciemnościach.';
  }
  if (nameLower.includes('klisz') || nameLower.includes('film') || nameLower.includes('plate')) {
    return isEn
      ? 'Sensitive light-recording medium. Upon chemical development, hidden silhouettes may appear where human eyesight detected nothing.'
      : 'Czułe materiały światłoczułe. Na naświetlonych klatkach może pojawić się to, co umyka ludzkiemu wzrokowi.';
  }
  if (nameLower.includes('pędzel') || nameLower.includes('kielni') || nameLower.includes('paleta') || nameLower.includes('brush') || nameLower.includes('trowel')) {
    return isEn
      ? 'Delicate excavation and preservation utensils essential for gently uncovering relics without damaging ancient engravings.'
      : 'Niezbędne przybory rzemieślnicze pozwalające na ostrożne odkrywanie lub utrwalanie detali.';
  }
  if (nameLower.includes('odznak') || nameLower.includes('badge') || nameLower.includes('legitymacj') || nameLower.includes('id card') || nameLower.includes('press pass')) {
    return isEn
      ? 'Official credentials in a leather wallet. It opens restricted doors and commands immediate respect from onlookers and local authorities.'
      : 'Oficjalna odznaka służbowa. Otwiera wiele drzwi i budzi respekt wśród gapiów oraz lokalnych służb.';
  }
  if (nameLower.includes('nuty') || nameLower.includes('scenariusz') || nameLower.includes('sheet music') || nameLower.includes('script')) {
    return isEn
      ? 'Stave lines and handwritten stage directions. Occasionally, subtle harmonic cadence conceals encoded cipher messages.'
      : 'Zapisane na papierze linie i wskazówki. Czasem kryją w sobie ukrytą rytmikę lub zakodowane wiadomości.';
  }
  if (nameLower.includes('instrument') || nameLower.includes('skrzypce') || nameLower.includes('trąbka') || nameLower.includes('violin') || nameLower.includes('trumpet')) {
    return isEn
      ? 'A meticulously crafted acoustic instrument. Music can soothe frayed nerves, yet certain melodies awaken ancient nightmares.'
      : 'Precyzyjnie wykonany instrument muzyczny. Muzyka bywa ukojeniem dla zszarganych nerwów, ale niektóre melodie przywołują koszmary.';
  }
  if (nameLower.includes('maszyna do pisania') || nameLower.includes('typewriter')) {
    return isEn
      ? 'A heavy mechanical typewriter. Each sharp strike of typeface against ribbon permanently imprints uncovered truths.'
      : 'Ciężka, mechaniczna maszyna do pisania. Każde uderzenie czcionki w taśmę trwale dokumentuje zebrane fakty.';
  }
  if (
    nameLower.includes('kombinezon') ||
    nameLower.includes('strój') ||
    nameLower.includes('ręcznik') ||
    nameLower.includes('koc') ||
    nameLower.includes('suit') ||
    nameLower.includes('towel') ||
    nameLower.includes('blanket')
  ) {
    return isEn
      ? 'Pragmatic personal apparel and textiles suited for harsh field conditions and protracted cold watches.'
      : 'Praktyczny ekwipunek osobisty przydatny w trudnych warunkach polowych i podczas długiego czuwania.';
  }
  if (nameLower.includes('lupa') || nameLower.includes('magnif')) {
    return isEn
      ? 'A magnifying lens set in a polished brass rim. Essential for scrutinizing hair-line fractures, blurred signatures, and tiny inscriptions.'
      : 'Szkło powiększające w mosiężnej oprawie. Niezbędne do analizy drobnych śladów, podpisów i tajemniczych mikro-rytów.';
  }
  if (nameLower.includes('kompas') || nameLower.includes('compass')) {
    return isEn
      ? 'A brass pocket compass with a jewel bearing. In distorted ruins, its needle may veer toward forces stranger than magnetic north.'
      : 'Mosiężny kompas kieszonkowy. W prastarych ruinach igła magnetyczna potrafi gwałtownie drżeć, reagując na nieznane energie.';
  }

  // Domyślny opis
  return isEn
    ? 'A dependable item from an investigator\'s kit. Proven useful across multiple field assignments, it holds a dedicated place in the gear.'
    : 'Przydatny przedmiot z ekwipunku badacza. Wielokrotnie sprawdzony w terenie, ma swoje szczególne miejsce w plecaku.';
}

/** Kategoryzuje przedmiot do jednej z 6 kategorii. */
export function categorizeItem(itemName: string): ItemCategory {
  const nameLower = itemName.toLowerCase();

  if (
    nameLower.includes('rewolwer') ||
    nameLower.includes('pistolet') ||
    nameLower.includes('nóż') ||
    nameLower.includes('sztylet') ||
    nameLower.includes('broń') ||
    nameLower.includes('karabin') ||
    nameLower.includes('dubeltów') ||
    nameLower.includes('strzelb') ||
    nameLower.includes('pałka') ||
    nameLower.includes('baton') ||
    nameLower.includes('maczeta')
  ) {
    return 'weapon';
  }
  if (
    nameLower.includes('notes') ||
    nameLower.includes('mapa') ||
    nameLower.includes('dokument') ||
    nameLower.includes('dziennik') ||
    nameLower.includes('list') ||
    nameLower.includes('książka') ||
    nameLower.includes('ksiąg') ||
    nameLower.includes('karta biblioteczna') ||
    nameLower.includes('biblia') ||
    nameLower.includes('modlitewnik') ||
    nameLower.includes('nuty') ||
    nameLower.includes('scenariusz') ||
    nameLower.includes('zwój')
  ) {
    return 'document';
  }
  if (
    nameLower.includes('ouija') ||
    nameLower.includes('tarot') ||
    nameLower.includes('amulet') ||
    nameLower.includes('talizman') ||
    nameLower.includes('okult') ||
    nameLower.includes('kadzidł') ||
    nameLower.includes('kreda') ||
    nameLower.includes('świec')
  ) {
    return 'artifact';
  }
  if (
    nameLower.includes('apteczka') ||
    nameLower.includes('bandaż') ||
    nameLower.includes('lekarstw') ||
    nameLower.includes('tabletk') ||
    nameLower.includes('jedzeni') ||
    nameLower.includes('morfin')
  ) {
    return 'consumable';
  }
  if (
    nameLower.includes('latarka') ||
    nameLower.includes('lina') ||
    nameLower.includes('łom') ||
    nameLower.includes('wytrych') ||
    nameLower.includes('emf') ||
    nameLower.includes('kamera') ||
    nameLower.includes('laptop') ||
    nameLower.includes('telefon') ||
    nameLower.includes('dyktafon') ||
    nameLower.includes('aparat') ||
    nameLower.includes('termometr') ||
    nameLower.includes('miernik') ||
    nameLower.includes('detektor') ||
    nameLower.includes('statyw') ||
    nameLower.includes('klisz') ||
    nameLower.includes('pędzel') ||
    nameLower.includes('kielni') ||
    nameLower.includes('narzędzi') ||
    nameLower.includes('maszyna do pisania') ||
    nameLower.includes('laborator') ||
    nameLower.includes('kompas') ||
    nameLower.includes('lornetka') ||
    nameLower.includes('lupa')
  ) {
    return 'tool';
  }
  return 'other';
}

/** Szacuje wagę przedmiotu w kilogramach na podstawie nazwy. */
export function estimateWeight(itemName: string): number {
  const nameLower = itemName.toLowerCase();

  if (nameLower.includes('laptop') || nameLower.includes('karabin')) return 2.5;
  if (nameLower.includes('plecak') || nameLower.includes('apteczka'))
    return 1.5;
  if (
    nameLower.includes('rewolwer') ||
    nameLower.includes('pistolet') ||
    nameLower.includes('lina')
  )
    return 1.0;
  if (
    nameLower.includes('latarka') ||
    nameLower.includes('nóż') ||
    nameLower.includes('kamera')
  )
    return 0.5;
  if (
    nameLower.includes('telefon') ||
    nameLower.includes('notes') ||
    nameLower.includes('klucz')
  )
    return 0.2;
  if (nameLower.includes('zapałki') || nameLower.includes('długopis'))
    return 0.1;
  return 0.5;
}
