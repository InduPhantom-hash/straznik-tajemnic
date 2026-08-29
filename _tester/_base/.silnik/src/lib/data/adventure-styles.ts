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

type AdventureStyleLabelKey =
  | 'tonePurist'
  | 'tonePulp'
  | 'toneNoir'
  | 'eraClassic'
  | 'eraGaslight'
  | 'eraNoir'
  | 'eraPrl'
  | 'eraModern'
  | 'eraCustom'
  | 'difficultyEasy'
  | 'difficultyNormal'
  | 'difficultyHard';

type AdventureStyleDescriptionKey =
  | 'tonePuristDescription'
  | 'tonePulpDescription'
  | 'toneNoirDescription'
  | 'eraClassicDescription'
  | 'eraGaslightDescription'
  | 'eraNoirDescription'
  | 'eraPrlDescription'
  | 'eraModernDescription'
  | 'eraCustomDescription'
  | 'difficultyEasyDescription'
  | 'difficultyNormalDescription'
  | 'difficultyHardDescription';

export interface AdventureStyleEntry {
  translationKey: AdventureStyleLabelKey;
  descriptionKey: AdventureStyleDescriptionKey;
  color: string;
  bg?: string;
  icon: string;
}

/**
 * Style dla tonu przygody (CoC 7e: purist/pulp/noir).
 */
export const TONE_STYLES: Record<string, AdventureStyleEntry> = {
  purist: {
    translationKey: 'tonePurist',
    descriptionKey: 'tonePuristDescription',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    icon: '💀',
  },
  pulp: {
    translationKey: 'tonePulp',
    descriptionKey: 'tonePulpDescription',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    icon: '⚡',
  },
  noir: {
    translationKey: 'toneNoir',
    descriptionKey: 'toneNoirDescription',
    color: 'text-slate-400',
    bg: 'bg-slate-500/20',
    icon: '🔍',
  },
};

/**
 * Style dla ery (CoC 7e: classic 1920s / gaslight Wiktoria / modern / custom).
 */
export const ERA_STYLES: Record<string, AdventureStyleEntry> = {
  classic: {
    translationKey: 'eraClassic',
    descriptionKey: 'eraClassicDescription',
    color: 'text-amber-400',
    icon: '🎩',
  },
  gaslight: {
    translationKey: 'eraGaslight',
    descriptionKey: 'eraGaslightDescription',
    color: 'text-purple-400',
    icon: '🕯️',
  },
  noir: {
    translationKey: 'eraNoir',
    descriptionKey: 'eraNoirDescription',
    color: 'text-stone-300',
    icon: '📻',
  },
  prl: {
    translationKey: 'eraPrl',
    descriptionKey: 'eraPrlDescription',
    color: 'text-red-300',
    icon: '🏭',
  },
  modern: {
    translationKey: 'eraModern',
    descriptionKey: 'eraModernDescription',
    color: 'text-cyan-400',
    icon: '💻',
  },
  custom: {
    translationKey: 'eraCustom',
    descriptionKey: 'eraCustomDescription',
    color: 'text-gray-400',
    icon: '✏️',
  },
};

/**
 * Style dla poziomu trudności (CoC 7e: easy / normal / hard).
 */
export const DIFFICULTY_STYLES: Record<string, AdventureStyleEntry> = {
  easy: {
    translationKey: 'difficultyEasy',
    descriptionKey: 'difficultyEasyDescription',
    color: 'text-green-400',
    icon: '🌱',
  },
  normal: {
    translationKey: 'difficultyNormal',
    descriptionKey: 'difficultyNormalDescription',
    color: 'text-yellow-400',
    icon: '⚖️',
  },
  hard: {
    translationKey: 'difficultyHard',
    descriptionKey: 'difficultyHardDescription',
    color: 'text-red-400',
    icon: '🔥',
  },
};
