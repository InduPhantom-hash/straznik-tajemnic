/**
 * Korpus Motywów i Leksykonu Sensorycznego H.P. Lovecrafta
 * Zapewnia dynamiczną rotację i bogactwo bodźców zmysłowych (anty-habituacja).
 * Zgodny z zasadami Plain Polish, zero em/en-dashes.
 */

export interface LovecraftianSensoryTheme {
  id: string;
  category: 'decay_and_tide' | 'acoustic_creep' | 'tactile_chill' | 'visual_shadow' | 'void_absence';
  senses: {
    primary: 'olfactory' | 'auditory' | 'tactile' | 'visual' | 'gustatory';
    secondary?: 'olfactory' | 'auditory' | 'tactile' | 'visual' | 'gustatory';
  };
  promptFragmentPl: string;
  promptFragmentEn: string;
  voidVariablePl?: string;
  voidVariableEn?: string;
}

export const LOVECRAFTIAN_SENSORY_CORPUS: LovecraftianSensoryTheme[] = [
  // 1. Gnicie, wilgoć, morze i rybi odór (Decay & Tide)
  {
    id: 'innsmouth_brine',
    category: 'decay_and_tide',
    senses: { primary: 'olfactory', secondary: 'tactile' },
    promptFragmentPl: 'Słony, rybi fetor gnijącego morszczynu połączony z lepkim, solnym nalotem na drewnianych powierzchniach',
    promptFragmentEn: 'Fishy brine of rotting kelp coupled with a sticky salt coating on weathered timber',
    voidVariablePl: 'Brak świeżego, morskiego powiewu wiatru - powietrze stoi w martwym bezruchu',
    voidVariableEn: 'Absence of clean sea breeze - the air hangs entirely still',
  },
  {
    id: 'damp_mould',
    category: 'decay_and_tide',
    senses: { primary: 'olfactory', secondary: 'visual' },
    promptFragmentPl: 'Zatęchły odór pleśni i butwiejącego papieru starodruków; wilgoć wykwitająca sinym kożuchem w kątach',
    promptFragmentEn: 'Musty reek of black mould and rotting tome parchment; livid damp spreading across corners',
  },
  {
    id: 'corbitt_stagnation',
    category: 'decay_and_tide',
    senses: { primary: 'olfactory', secondary: 'tactile' },
    promptFragmentPl: 'Słodkawy, mdły zapach wapna gaszonego zmieszanego z gnijącą organiczną substancją pod podłogą',
    promptFragmentEn: 'Sickly sweet stench of slaked lime mixed with decaying organic matter beneath the floorboards',
    voidVariablePl: 'Całkowity brak zapachu kurzu typowego dla starych domostw - tylko chemiczna martwota',
    voidVariableEn: 'Complete absence of normal domestic dust smell - only chemical stagnation',
  },

  // 2. Akustyka grozy i niesamowite dźwięki (Acoustic Creep)
  {
    id: 'subterranean_drip',
    category: 'acoustic_creep',
    senses: { primary: 'auditory', secondary: 'tactile' },
    promptFragmentPl: 'Nieregularny, powolny dźwięk kapania lepkiej cieczy o spękany kamień posadzki i wibracja pod stopami',
    promptFragmentEn: 'Irregular slow drip of viscous liquid striking cracked flagstones and faint tremor beneath the soles',
    voidVariablePl: 'Złowrogie urwanie zwykłych odgłosów ulicy Arkham za oknami',
    voidVariableEn: 'Abrupt absence of normal Arkham street noises outside',
  },
  {
    id: 'wood_straining',
    category: 'acoustic_creep',
    senses: { primary: 'auditory', secondary: 'visual' },
    promptFragmentPl: 'Suche, głuche trzaski naprężonych belek stropowych i szelest drobnego tynku osypującego się za boazerią',
    promptFragmentEn: 'Hollow snapping of stressed ceiling joists and rustle of crumbling plaster behind the wainscot',
  },
  {
    id: 'wind_flute',
    category: 'acoustic_creep',
    senses: { primary: 'auditory', secondary: 'tactile' },
    promptFragmentPl: 'Świst przeciągu brzmiący niczym monotonna gra na prymitywnym piszczałkowym instrumencie',
    promptFragmentEn: 'Whistling draft resembling a monotonous drone from a crude primitive pipe',
  },

  // 3. Dotyk, zimno i somatyka (Tactile Chill)
  {
    id: 'vault_chill',
    category: 'tactile_chill',
    senses: { primary: 'tactile', secondary: 'olfactory' },
    promptFragmentPl: 'Lodowate, grobowe powietrze osiadające natychmiastową gęsią skórką na karku i parujący z ust oddech',
    promptFragmentEn: 'Tomb-like chill prickling the back of the neck into gooseflesh and breath misting in the cold',
  },
  {
    id: 'greasy_residue',
    category: 'tactile_chill',
    senses: { primary: 'tactile', secondary: 'visual' },
    promptFragmentPl: 'Śliska, nienaturalnie tłusta powłoka na metalowych klamkach i poręczach, trudna do zatarcia chustką',
    promptFragmentEn: 'Slick unwholesome oily film on brass latches and banisters that smears against cloth',
  },

  // 4. Światłocień, ziarno i zniekształcenia geometrii (Visual Shadow)
  {
    id: 'non_euclidean_angles',
    category: 'visual_shadow',
    senses: { primary: 'visual', secondary: 'tactile' },
    promptFragmentPl: 'Kąty ścian sprawiające złudzenie rozszerzania się lub zwężania pod różnymi kątami padania światła latarni',
    promptFragmentEn: 'Wall corners appearing deceptively obtuse or acute depending on lantern orientation',
  },
  {
    id: 'yellowish_tallow',
    category: 'visual_shadow',
    senses: { primary: 'visual', secondary: 'olfactory' },
    promptFragmentPl: 'Mdła, żółtawa poświata gazowych lamp rzucająca wydłużone, groteskowo zgarbione cienie na odrapaną tapetę',
    promptFragmentEn: 'Sickly yellowish flicker of gas jets casting grotesquely stooped shadows on peeling wallpaper',
  },

  // 5. Zmienna Próżni (Void Absence)
  {
    id: 'hollow_vacuum',
    category: 'void_absence',
    senses: { primary: 'auditory', secondary: 'tactile' },
    promptFragmentPl: 'Cisza tak bezwzględna, że własne uderzenia serca i szum krwi w skroniach stają się natarczywym dudnieniem',
    promptFragmentEn: 'Silence so absolute that the investigator heartbeat and rush of blood in ears becomes deafening',
    voidVariablePl: 'Całkowity brak owadów, pajęczyn czy śladów gryzoni w opuszczonym pokoju',
    voidVariableEn: 'Complete absence of insects, cobwebs, or rodent tracks in the abandoned room',
  },
];

/**
 * Wybiera spójny motyw Lovecraftowski na podstawie kontekstu i unika powtórzeń.
 */
export function pickLovecraftianSensoryTheme(params: {
  turnCount?: number;
  locationName?: string;
  isSpooky?: boolean;
}): LovecraftianSensoryTheme {
  const loc = (params.locationName || '').toLowerCase();
  const turn = params.turnCount || 0;

  if (/morze|dok|port|ryb|innsmouth|wybrze|sea|dock|pier/.test(loc)) {
    return LOVECRAFTIAN_SENSORY_CORPUS[0]; // innsmouth_brine
  }

  if (/piwnic|loch|krypt|podzi|cellar|crypt|dungeon/.test(loc)) {
    const underground = [LOVECRAFTIAN_SENSORY_CORPUS[2], LOVECRAFTIAN_SENSORY_CORPUS[3], LOVECRAFTIAN_SENSORY_CORPUS[6]];
    return underground[turn % underground.length];
  }

  if (/strych|antyk|księg|biblio|archi|attic|archive|library/.test(loc)) {
    return LOVECRAFTIAN_SENSORY_CORPUS[1]; // damp_mould
  }

  // Rotacja po korpusie w oparciu o numer tury
  return LOVECRAFTIAN_SENSORY_CORPUS[turn % LOVECRAFTIAN_SENSORY_CORPUS.length];
}
