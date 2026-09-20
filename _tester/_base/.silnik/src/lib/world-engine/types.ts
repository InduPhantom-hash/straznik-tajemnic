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
}

export interface SettingFriction {
  tensionType: 'class' | 'belief' | 'institutional';
  description: string;
  activeRumor: string; // 70% prawdy, 30% zabobonu
  ambientDetail: string; // Wydarzenie w tle (strajk, kłótnia, gazeciarz)
}

export interface WorldEngineDirectives {
  npcDirective?: string;
  sensoryDirective?: string;
  graphDirective?: string;
  frictionDirective?: string;
  mysteryDirective?: string;
}
