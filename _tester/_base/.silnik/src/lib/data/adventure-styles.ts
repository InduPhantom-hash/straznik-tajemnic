/**
 * Adventure Styles - presety wizualne dla AdventureSelector + ekran przygody.
 *
 * IND-134 (sesja 148): wyciągnięte z `adventure-selector.tsx` lin 28-47 do `lib/data/`
 * jako 6-ty pattern hardcoded data dictionaries do osobnego pliku (analog
 * IND-79 CoC glossary, IND-85 multi-voice POOLS, IND-126 character data,
 * IND-145 chat-ui handout-types, welcome/data/quotes.ts z IND-144 sesja 130).
 *
 * Eksportowane jako Record/typed map - reuse w przyszłych komponentach które
 * potrzebują wyświetlić ton/era/difficulty (np. adventure-detail-modal,
 * adventure-list-row, custom-adventure-form-preview).
 */

export interface AdventureStyleEntry {
  label: string;
  color: string;
  bg?: string;
  icon: string;
  /** Krótkie wyjaśnienie dla gracza - jaki klimat niesie ten znacznik. */
  description?: string;
}

/**
 * Style dla tonu przygody (CoC 7e: purist/pulp/noir).
 */
export const TONE_STYLES: Record<string, AdventureStyleEntry> = {
  purist: {
    label: 'Purist',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    icon: '💀',
    description:
      'Klasyczny, mroczny horror. Powolne budowanie grozy, realne zagrożenie i niewielkie szanse na heroizm - bohaterowie są krusi wobec kosmicznego zła.',
  },
  pulp: {
    label: 'Pulp',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    icon: '⚡',
    description:
      'Heroiczna akcja. Odważniejsi badacze, więcej walki i przygody, mniej beznadziei - bliżej kina przygodowego niż czystej grozy.',
  },
  noir: {
    label: 'Noir',
    color: 'text-slate-400',
    bg: 'bg-slate-500/20',
    icon: '🔍',
    description:
      'Mroczne śledztwo. Intrygi, moralna dwuznaczność i tajemnice wielkiego miasta - więcej rozmów, tropów i podejrzeń niż otwartej walki.',
  },
};

/**
 * Style dla ery (CoC 7e: classic 1920s / gaslight Wiktoria / modern / custom).
 */
export const ERA_STYLES: Record<string, AdventureStyleEntry> = {
  classic: {
    label: 'Lata 20.',
    color: 'text-amber-400',
    icon: '🎩',
    description:
      'Klasyczne lata 20. XX wieku - prohibicja, automobile i złota era Mitów Cthulhu.',
  },
  gaslight: {
    label: 'Wiktoria',
    color: 'text-purple-400',
    icon: '🕯️',
    description:
      'Epoka wiktoriańska (XIX w.) - gazowe latarnie, spirytyzm i gotycka groza.',
  },
  noir: {
    label: 'Lata 40.',
    color: 'text-stone-300',
    icon: '📻',
    description:
      'Lata czterdzieste - wojna, odbudowa, radio i śledztwa w cieniu wielkiej historii.',
  },
  prl: {
    label: 'PRL - lata 70.',
    color: 'text-red-300',
    icon: '🏭',
    description:
      'Polska lat siedemdziesiątych - kolejki, państwowe instytucje, analogowa technika i nieufność.',
  },
  modern: {
    label: 'Współczesność',
    color: 'text-cyan-400',
    icon: '💻',
    description:
      'Czasy współczesne - smartfony, internet i kosmiczny horror w cyfrowym świecie.',
  },
  custom: {
    label: 'Własna',
    color: 'text-gray-400',
    icon: '✏️',
    description: 'Era zdefiniowana przez gracza.',
  },
};

/**
 * Style dla poziomu trudności (CoC 7e: easy / normal / hard).
 */
export const DIFFICULTY_STYLES: Record<string, AdventureStyleEntry> = {
  easy: {
    label: 'Łatwy',
    color: 'text-green-400',
    icon: '🌱',
    description:
      'Łagodne wyzwanie - dobre na początek, mniej śmiertelne pułapki.',
  },
  normal: {
    label: 'Normalny',
    color: 'text-yellow-400',
    icon: '⚖️',
    description: 'Standardowe wyzwanie - wymaga rozwagi i ostrożnych decyzji.',
  },
  hard: {
    label: 'Trudny',
    color: 'text-red-400',
    icon: '🔥',
    description:
      'Wymagające - wysoka śmiertelność, nie wybacza błędów. Dla doświadczonych.',
  },
};
