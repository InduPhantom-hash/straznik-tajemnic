import { Character } from '../types';

export type WealthLevel = 'Biedny' | 'Przeciętny' | 'Zamożny';

export interface CharacterFinances {
  creditRating: number;
  wealthLevel: WealthLevel;
  cash: number;
  assets: number;
  description: string;
  spendingLevel: number;
  assetsDescription: string;
}

/**
 * Uproszczony system finansowy wyliczający szacunkową gotówkę i majątek 
 * w oparciu o poziom Credit Rating dla lat 20. XX wieku w CoC 7e.
 */
export function deriveFinances(character: Character): CharacterFinances {
  const cr = character.characteristics?.creditRating || 30; // Domyślnie 30 (Przeciętny)
  
  let wealthLevel: WealthLevel;
  let cashMultiplier: number;
  let assetsMultiplier: number;
  let description: string;

  if (cr < 10) {
    wealthLevel = 'Biedny';
    cashMultiplier = 0.5; // CR x $0.5
    assetsMultiplier = 0; // brak
    description = 'Biedny (CR 1-9): Minimalny standard życia. Mieszkasz w tanich czynszówkach lub noclegowniach.';
  } else if (cr < 50) {
    wealthLevel = 'Przeciętny';
    cashMultiplier = 2; // CR x $2
    assetsMultiplier = 50; // CR x $50
    description = 'Przeciętny (CR 10-49): Standardowy poziom życia. Możesz wynajmować przyzwoity apartament lub mały dom.';
  } else {
    wealthLevel = 'Zamożny';
    cashMultiplier = 5; // CR x $5
    assetsMultiplier = 500; // CR x $500
    description = 'Zamożny (CR 50-89): Wysoki standard życia. Posiadasz dom, luksusowy samochód i możesz zatrudniać służbę.';
  }

  // Obliczenia na lata 1920 (uproszczone z dolarem lat 20.)
  let cash = Math.floor(cr * cashMultiplier);
  let assets = Math.floor(cr * assetsMultiplier);

  // Zabezpieczenie przed biedą - biedny dostaje tylko 1 dolara na dzień na jedzenie.
  if (cr === 0) {
    cash = 0;
    assets = 0;
  }

  // Opcjonalne nadpisanie (override) z karty postaci
  if (character.cash !== undefined) cash = character.cash;
  
  return {
    creditRating: cr,
    wealthLevel,
    cash,
    assets,
    description,
    spendingLevel: cr >= 50 ? 50 : cr >= 10 ? 10 : 2,
    assetsDescription: description,
  };
}
