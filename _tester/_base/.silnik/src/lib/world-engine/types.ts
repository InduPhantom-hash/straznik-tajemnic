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
  primarySense: 'olfactory' | 'auditory' | 'tactile' | 'gustatory' | 'visual';
  secondarySense?: 'auditory' | 'tactile' | 'olfactory' | 'gustatory' | 'visual';
  voidVariable?: string; // Czego w scenie brakuje (Zmienna Próżni)
  gritDetails: string[]; // Materialne zużycie, retro-ziarno epoki
  temperatureOrWeather?: string;
  cadenceGear?: 1 | 2 | 3 | 4; // Biegi Kadencji: 1 = Dialog/Akcja, 2 = Szeroki Kadr, 3 = Cios/Zagrożenie, 4 = Szok/Pustka
  lovecraftTheme?: string; // Wybrany motyw sensoryczny z korpusu Lovecrafta
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

/** Poziom rozgłosu / hałasu w pamięci sesji (0 = dyskrecja, 1-2 = podejrzenia, 3+ = alarm wroga) */
export type HeatLevel = 0 | 1 | 2 | 3;

/** Klasyfikacja akcji gracza pod kątem hałasu */
export type HeatActionClassification = 'loud' | 'quiet' | 'neutral';

export interface WorldEngineDirectives {
  npcDirective?: string;
  sensoryDirective?: string;
  graphDirective?: string;
  frictionDirective?: string;
  mysteryDirective?: string;
  geographyDirective?: string;
  occultDirective?: string;
  anchorFramingDirective?: string;
  heatDirective?: string;
  secretsDirective?: string;
  closedCircleDirective?: string;
  deadlockDirective?: string;
  valueChargeDirective?: string;
}

