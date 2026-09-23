/**
 * World Engine - Typy danych dla 5 niezależnych silników światotwórstwa
 * Zasilających narrację i adjudykację MG w locie.
 */

export interface NPCEntity {
  id: string;
  name: string;
  facade: string; // Jak postać prezentuje się publicznie
  flaw: string; // Skaza fizyczna lub tik behawioralny
  hiddenAgenda: string; // Rzeczywisty ukryty cel w scenie
  resistanceLevel: 'open' | 'guarded' | 'suspicious' | 'hostile' | 'fanatical';
  fearOrLeverage: string; // Co może złamać jej milczenie lub skłonić do ustępstw
}

export interface SensoryContext {
  primarySense: 'olfactory' | 'auditory' | 'tactile' | 'gustatory';
  secondarySense?: 'auditory' | 'tactile' | 'olfactory' | 'gustatory';
  voidVariable?: string; // Czego w scenie brakuje (Zmienna Próżni)
  gritDetails: string[]; // Materialne zużycie, retro-ziarno epoki
  temperatureOrWeather?: string;
}

export interface ClueNode {
  id: string;
  summary: string;
  targetRevelationId: string;
  sources: Array<'observation' | 'testimony' | 'deduction' | 'handout'>;
  failForwardCost: 'time' | 'equipment' | 'danger' | 'social';
  isLocationExhausted?: boolean; // Czy lokacja została wyczerpana z poszlak (bramkowanie)
  locationName?: string;
}

export interface SceneFramingContext {
  knownAnchors: string[]; // Minimum 2 twarde punkty odniesienia
  investigativeQuestion?: string; // Precyzyjne pytanie śledcze na ten etap
}

export interface SettingFriction {
  tensionType: 'class' | 'belief' | 'institutional';
  description: string;
  activeRumor: string; // 70% prawdy, 30% zabobonu
  ambientDetail: string; // Wydarzenie w tle (strajk, kłótnia, gazeciarz)
}

export interface GeographyContext {
  terrainOrChokepoint: string; // Przełęcz, bród, brama miejska, cieśnina
  economicConstraint: string; // Kto kontroluje sól/żelazo/węgiel, co jedzą mieszkańcy
  undergroundOrigin?: 'cellars' | 'sewers' | 'catacombs' | 'mines'; // Geneza podziemi
  waterwayLogic?: string; // Spływ rzeki ku morzu, brak nienaturalnych rozszczepień
}

export interface OccultContext {
  magicType: 'hard' | 'soft_weird'; // Zrozumiałe reguły dedukcji vs nieprzenikniony kosmiczny horror
  somaticCost: string; // Krwawienie z nosa, drżenie mięśni, migrena, chłód kości
  cultTier?: 'outer_sympathizers' | 'inner_initiated' | 'core_zealots'; // Stopień wtajemniczenia kultu
  cosmicTaboo?: string; // Prawo wyższego wymiaru, którego naruszenie grozi anomalną reakcją
}

export interface WorldEngineDirectives {
  npcDirective?: string;
  sensoryDirective?: string;
  graphDirective?: string;
  frictionDirective?: string;
  mysteryDirective?: string;
  geographyDirective?: string;
  occultDirective?: string;
  anchorFramingDirective?: string;
}

