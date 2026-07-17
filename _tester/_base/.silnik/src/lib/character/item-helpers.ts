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
export function generateVisualDescription(itemName: string): string {
  const nameLower = itemName.toLowerCase();

  if (nameLower.includes('zegarek') || nameLower.includes('watch')) {
    return 'srebrna koperta z grawerowanymi ornamentami, tarcza z rzymskimi cyframi, łańcuszek z patynowanego srebra';
  } else if (
    nameLower.includes('pierścień') ||
    nameLower.includes('ring') ||
    nameLower.includes('obrączka')
  ) {
    return 'złoty band z subtelnym wzorem, ślady noszenia, ciepły blask metalu';
  } else if (
    nameLower.includes('naszyjnik') ||
    nameLower.includes('wisiorek') ||
    nameLower.includes('medalion')
  ) {
    return 'ozdobny wisiorek na łańcuszku, starożytny styl, tajemnicze symbole';
  } else if (
    nameLower.includes('zdjęcie') ||
    nameLower.includes('foto') ||
    nameLower.includes('portret')
  ) {
    return 'pożółkła fotografia w ramce, sepia tones, wymięte rogi';
  } else if (nameLower.includes('list') || nameLower.includes('letter')) {
    return 'złożona kartka papieru z wyblakłym atramentem, pieczęć z wosku';
  } else if (
    nameLower.includes('książka') ||
    nameLower.includes('dziennik') ||
    nameLower.includes('notatnik')
  ) {
    return 'skórzana oprawa ze złoceniami, pożółkłe strony, ślady użytkowania';
  } else {
    return 'antyczny przedmiot osobisty, patyna czasu, detale z mosiądzu i skóry';
  }
}

/** Generuje opis fabularny (lore) na podstawie nazwy przedmiotu. */
export function generateItemLore(itemName: string): string {
  const nameLower = itemName.toLowerCase();

  // Broń
  if (
    nameLower.includes('rewolwer') ||
    nameLower.includes('pistolet') ||
    nameLower.includes('broń')
  ) {
    return 'Starannie utrzymana broń, regularnie czyszczona i oliwiona. Ciężar metalu w dłoni daje poczucie bezpieczeństwa w mrocznych zaułkach.';
  }
  if (nameLower.includes('nóż') || nameLower.includes('sztylet')) {
    return 'Ostrze o dobrze wyważonej rękojeści. Przydatny zarówno do codziennych zadań jak i w sytuacjach awaryjnych.';
  }

  // Oświetlenie
  if (nameLower.includes('latarka') || nameLower.includes('lamp')) {
    return 'Niezawodne źródło światła w ciemnościach. Snop światła przecina mrok, odsłaniając to, co chciałoby pozostać ukryte.';
  }
  if (
    nameLower.includes('świeca') ||
    nameLower.includes('zapałki') ||
    nameLower.includes('zapalniczka')
  ) {
    return 'Prosty sposób na rozproszenie ciemności. Płomień daje nie tylko światło, ale i odrobinę ciepła w chłodne noce.';
  }

  // Dokumenty i notatki
  if (
    nameLower.includes('notes') ||
    nameLower.includes('notatnik') ||
    nameLower.includes('dziennik')
  ) {
    return 'Podniszczony zeszyt pełen notatek i obserwacji. Niektóre strony są wyrwane, inne zapisane nerwowym pismem.';
  }
  if (nameLower.includes('mapa') || nameLower.includes('map')) {
    return 'Sfatygowana mapa ze śladami wielokrotnego składania. Niektóre miejsca są zakreślone, inne przekreślone z nieznanych powodów.';
  }

  // Narzędzia
  if (nameLower.includes('lina') || nameLower.includes('sznur')) {
    return 'Solidna lina o odpowiedniej długości. Może uratować życie przy wspinaczce lub przeprawie przez niebezpieczny teren.';
  }
  if (
    nameLower.includes('lom') ||
    nameLower.includes('łom') ||
    nameLower.includes('wytrych')
  ) {
    return 'Narzędzie o wielu zastosowaniach - od otwierania zamków po wejście przez zablokowane drzwi. Lepiej mieć je i nie potrzebować.';
  }
  if (
    nameLower.includes('apteczka') ||
    nameLower.includes('bandaż') ||
    nameLower.includes('medycz')
  ) {
    return 'Podstawowe zaopatrzenie medyczne. Bandaże, środki odkażające i kilka tabletek przeciwbólowych - w terenie to skarb.';
  }

  // Elektronika (współczesność)
  if (
    nameLower.includes('telefon') ||
    nameLower.includes('komórka') ||
    nameLower.includes('smartfon')
  ) {
    return 'Nieodłączny towarzysz współczesnego badacza. Dostęp do informacji, nawigacja, komunikacja - wszystko w jednym urządzeniu.';
  }
  if (nameLower.includes('laptop') || nameLower.includes('komputer')) {
    return 'Przenośne centrum dowodzenia do badań i analizy zebranych danych. Zabezpieczone hasłem, zawiera ważne pliki.';
  }
  if (
    nameLower.includes('kamera') ||
    nameLower.includes('aparat') ||
    nameLower.includes('foto')
  ) {
    return 'Urządzenie do dokumentowania odkryć. Niektóre zdjęcia pokazują więcej niż widziało ludzkie oko.';
  }
  if (nameLower.includes('dyktafon') || nameLower.includes('rejestrator')) {
    return 'Nagrywanie wywiadów i własnych obserwacji. Czasem odsłuchując nagrania słychać rzeczy, których nie było słychać na żywo.';
  }
  if (nameLower.includes('emf') || nameLower.includes('elektroma')) {
    return 'Urządzenie do wykrywania anomalii elektromagnetycznych. Detektor piszczy w obecności nietypowych pól energetycznych.';
  }

  // Plecaki i torby
  if (
    nameLower.includes('plecak') ||
    nameLower.includes('torba') ||
    nameLower.includes('worek')
  ) {
    return 'Pojemny plecak ze śladami intensywnego użytkowania. Wiele kieszeni pozwala uporządkować ekwipunek na wyprawy.';
  }

  // Okultystyczne
  if (nameLower.includes('ouija') || nameLower.includes('ouja')) {
    return 'Plansza do wywoływania duchów z wyblakłymi literami. Poprzedni właściciel podobno zmarł w niewyjaśnionych okolicznościach.';
  }
  if (nameLower.includes('tarot') || nameLower.includes('karty')) {
    return 'Stara talia kart o nieznanym pochodzeniu. Obrazy na kartach zdają się zmieniać w zależności od kąta patrzenia.';
  }
  if (
    nameLower.includes('krzyż') ||
    nameLower.includes('różaniec') ||
    nameLower.includes('amulet')
  ) {
    return 'Przedmiot o znaczeniu duchowym, noszony dla ochrony przed złem. Czy rzeczywiście chroni, pozostaje kwestią wiary.';
  }

  // Domyślny opis
  return `Przydatny przedmiot z ekwipunku badacza. Wielokrotnie sprawdzony w terenie, ma swoje szczególne miejsce w plecaku.`;
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
    nameLower.includes('karabin')
  ) {
    return 'weapon';
  }
  if (
    nameLower.includes('notes') ||
    nameLower.includes('mapa') ||
    nameLower.includes('dokument') ||
    nameLower.includes('dziennik') ||
    nameLower.includes('list') ||
    nameLower.includes('książka')
  ) {
    return 'document';
  }
  if (
    nameLower.includes('ouija') ||
    nameLower.includes('tarot') ||
    nameLower.includes('amulet') ||
    nameLower.includes('talizman') ||
    nameLower.includes('okult')
  ) {
    return 'artifact';
  }
  if (
    nameLower.includes('apteczka') ||
    nameLower.includes('bandaż') ||
    nameLower.includes('lekarstw') ||
    nameLower.includes('tabletk') ||
    nameLower.includes('jedzeni')
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
    nameLower.includes('dyktafon')
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
