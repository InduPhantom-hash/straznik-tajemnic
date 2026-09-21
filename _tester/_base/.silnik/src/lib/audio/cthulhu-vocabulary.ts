/**
 * Cthulhu Mythos 7e Canonical Vocabulary & Dynamic Scene Context
 *
 * Słownik pojęć kanonicznych Zew Cthulhu 7e połączony z dynamicznym kontekstem
 * aktywnej sceny gry (badacze, NPC, lokacja) dla modelu transkrypcji mowy.
 */

export const CANONICAL_MYTHOS_TERMS = [
  // Lokacje
  'Arkham',
  'Innsmouth',
  'Dunwich',
  'Kingsport',
  'Miskatonic',
  'Uniwersytet Miskatonic',
  'Boston',
  'Providence',
  'R\'lyeh',
  'Kadath',
  'Płaskowyż Leng',
  'Irem',
  'Hyperborea',
  'Bolton',
  'Aylesbury',
  'Szpital św. Marii w Arkham',
  'Arkham Sanitarium',

  // Bóstwa i Wielcy Przedwieczni
  'Cthulhu',
  'Nyarlathotep',
  'Yog-Sothoth',
  'Shub-Niggurath',
  'Azathoth',
  'Dagon',
  'Matka Hydra',
  'Hastur',
  'Król w Żółci',
  'Ithaqua',
  'Tsathoggua',
  'Nodens',
  'Yig',
  'Chaugnar Faugn',
  'Cthugha',
  'Ogar z Tindalos',

  // Potwory i rasy
  'Głębinowy',
  'Głębinowi',
  'Deep One',
  'Ghul',
  'Ghule',
  'Mi-Go',
  'Byakhee',
  'Shoggoth',
  'Shoggothy',
  'Latający Polip',
  'Latające Polipy',
  'Wielka Rasa Yith',
  'Yithian',
  'Yithianie',
  'Starsze Istoty',
  'Elder Thing',
  'Chtonik',
  'Chtoniki',
  'Nocna Zmora',
  'Nocne Zmory',
  'Nightgaunt',

  // Tomy, artefakty i symbole
  'Necronomicon',
  'Abdul Alhazred',
  'De Vermis Mysteriis',
  'Ludvig Prinn',
  'Cultes des Goules',
  'Comte d\'Erlette',
  'Unaussprechlichen Kulten',
  'von Junzt',
  'Księga Eibona',
  'Złote Lustro',
  'Lśniący Trapezoedr',
  'Znak Starszych Bogów',
  'Elder Sign',

  // Mechanika i pojęcia Zew Cthulhu 7e
  'Strażnik Tajemnic',
  'Badacz Tajemnic',
  'Poczytalność',
  'Sanity',
  'SAN',
  'Punkty Magii',
  'Punkty Wytrzymałości',
  'Szczęście',
  'Fiksacja',
  'Szaleństwo',
  'Mania',
  'Fobia',
  'Forsowanie rzutu',
  'Rzut forsowany',
  'Fumble',
  'Sukces Krytyczny',
  'Sukces Ekstremalny',
  'Sukces Trudny',
  'Sukces Zwykły',
  'Test Poczytalności',
] as const;

export interface BuildVocabularyOptions {
  investigators?: Array<string | { name?: string; characterName?: string; playerName?: string }>;
  sceneNpcs?: string[];
  location?: string;
  extraTerms?: string[];
}

/**
 * Buduje spójną listę słownictwa dla modelu transkrypcji łącząc
 * stałe terminy Mitów Cthulhu 7e z dynamicznymi encjami sceny.
 */
export function buildCustomVocabulary(options: BuildVocabularyOptions = {}): {
  terms: string[];
  promptSnippet: string;
} {
  const dynamicSet = new Set<string>();

  // Dodaj badaczy
  if (options.investigators && Array.isArray(options.investigators)) {
    for (const inv of options.investigators) {
      if (typeof inv === 'string') {
        const trimmed = inv.trim();
        if (trimmed) dynamicSet.add(trimmed);
      } else if (inv && typeof inv === 'object') {
        if (inv.characterName?.trim()) dynamicSet.add(inv.characterName.trim());
        if (inv.name?.trim()) dynamicSet.add(inv.name.trim());
        if (inv.playerName?.trim()) dynamicSet.add(inv.playerName.trim());
      }
    }
  }

  // Dodaj NPC
  if (options.sceneNpcs && Array.isArray(options.sceneNpcs)) {
    for (const npc of options.sceneNpcs) {
      if (typeof npc === 'string' && npc.trim()) {
        dynamicSet.add(npc.trim());
      }
    }
  }

  // Dodaj lokację
  if (options.location && typeof options.location === 'string' && options.location.trim()) {
    dynamicSet.add(options.location.trim());
  }

  // Dodaj dodatkowe terminy
  if (options.extraTerms && Array.isArray(options.extraTerms)) {
    for (const term of options.extraTerms) {
      if (typeof term === 'string' && term.trim()) {
        dynamicSet.add(term.trim());
      }
    }
  }

  // Połącz dynamiczne z kanonem (dynamiczne na początku dla wyższej wagi)
  const combined = Array.from(
    new Set([...Array.from(dynamicSet), ...CANONICAL_MYTHOS_TERMS])
  );

  const promptSnippet = `Słownik kanonicznych nazw własnych, badaczy i terminów Mitów Cthulhu (użyj do poprawnej pisowni):\n${combined.join(', ')}`;

  return {
    terms: combined,
    promptSnippet,
  };
}
