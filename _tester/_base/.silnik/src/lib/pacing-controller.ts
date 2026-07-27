/**
 * Pacing Controller
 *
 * Generuje dynamiczne dyrektywy długości odpowiedzi per tryb gry.
 * Injektowane do prompta jako dodatkowy kontekst.
 */

import type { GameContext } from './prompt-section-parser';

interface PacingConfig {
  tempo: 'fast' | 'normal' | 'slow';
  wordRange: [number, number];
  directive: string;
}

const PACING_MAP: Record<GameContext['mode'], PacingConfig> = {
  combat: {
    tempo: 'fast',
    wordRange: [30, 70],
    directive: 'TEMPO WALKI: do 30-70 słów. Krótkie, urwane zdania. Czysta akcja.',
  },
  chase: {
    tempo: 'fast',
    wordRange: [30, 70],
    directive: 'TEMPO POŚCIGU: do 30-70 słów. Dynamika, oddech, napięcie.',
  },
  exploration: {
    tempo: 'normal',
    wordRange: [60, 150],
    directive: 'do 60-150 słów. Zwięzłość opisowa i otwarcie na akcję gracza.',
  },
  investigation: {
    tempo: 'normal',
    wordRange: [60, 150],
    directive: 'do 60-150 słów. Wskazówki wplecione w atmosferę, bez zbędnych wypełniaczy.',
  },
  social: {
    tempo: 'normal',
    wordRange: [30, 70],
    directive: 'do 30-70 słów (1-3 zdania). Szybka wymiana zdań i dialog z NPC. Nie rozciągaj wypowiedzi tłem.',
  },
  dream: {
    tempo: 'slow',
    wordRange: [150, 300],
    directive: '150-300 słów. Bogaty, oniryczny, wielozmysłowy opis.',
  },
  ritual: {
    tempo: 'slow',
    wordRange: [150, 300],
    directive: '150-300 słów. Ceremonialna, narastająca narracja.',
  },
};

/**
 * Generuje dyrektywę tempa narracji na podstawie kontekstu gry.
 *
 * Modyfikatory:
 * - recentSANLoss → wymusza wolne tempo (horror reveal)
 * - nightTime → +20% do górnego limitu słów
 */
export function getPacingDirective(context: GameContext): string {
  let config = PACING_MAP[context.mode];

  // Horror reveal po utracie SAN - daj AI przestrzeń na opis
  if (context.recentSANLoss && config.tempo === 'fast') {
    config = PACING_MAP.dream; // przeskocz na wolne tempo
  }

  const min = config.wordRange[0];
  let max = config.wordRange[1];

  // Noc = więcej atmosfery
  if (context.nightTime) {
    max = Math.round(max * 1.2);
  }

  const rangeStr =
    min === config.wordRange[0] && max === config.wordRange[1]
      ? config.directive
      : config.directive.replace(/\d+-\d+ słów/, `${min}-${max} słów`);

  const base = `**Długość odpowiedzi:** ${rangeStr}\n**ZASADA ELASTYCZNOŚCI:** Dostosuj długość do akcji gracza. Przy prostych pytaniach lub dialogu odpowiadaj zwięźle (1-3 zdania). Nie rozciągaj wypowiedzi sztucznym opisem tła na siłę. Wyjątkiem są otwarcia nowych lokacji lub kluczowe zwroty akcji.`;

  // War-room: gracze planują w kółko bez ruchu - MG ma wprowadzić bodziec wymuszający akcję.
  if (context.isStuck) {
    return (
      base +
      `\n**TEMPO - WAR-ROOM (Uchwała III):** Gracze grzęzną w planowaniu bez ruchu. Wprowadź zewnętrzny bodziec. Zależnie od stopnia impasu sformułuj go jako:\n` +
      `- **Silny bodziec**: Bezpośrednie zagrożenie powiązane z motywacją/więzią postaci. Wskaż w tagu: [BODZIEC:SILNY:postać:motywacja]. Rozlicz to w tle jako naturalny wybór fabularny z kosztem straty opanowania (SAN/Stabilność) w przypadku próby uniknięcia konwencji.\n` +
      `- **Słaby bodziec**: Drobne zdarzenie, tajemniczy dźwięk, przeczucie. Wskaż w tagu: [BODZIEC:SŁABY:postać:opis].`
    );
  }

  return base;
}
