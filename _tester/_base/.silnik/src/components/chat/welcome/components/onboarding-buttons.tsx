'use client';

/**
 * OnboardingButtons - kroki onboardingu w stylu Dark Art Déco (makieta karta 02/05).
 * Pionowy stos przycisków Cinzel: ② Wybierz przygodę → ③ Sesja Zero (opcjonalnie) →
 * ④ Stwórz postać → ⑤ Rozpocznij (disabled bez hasCharacter).
 *
 * Logika sekwencji/numeracji bez zmian - tylko warstwa wizualna (re-skin).
 * Pojedynczy "primary" (emerald + emeraldPulse) wskazuje następny krok do wykonania.
 */

import type { FC } from 'react';

/**
 * Beta (tryb testerów): krok "Wgraj zasady" ukryty. Zasady CoC 7e są już
 * w Pinecone (RAG), więc wgrywanie podręcznika przez testera jest zbędne
 * i mylące. Przełącz na `true`, by przywrócić krok wgrywania zasad.
 */
const SHOW_UPLOAD_RULES = false;

/** Numery kroków przydzielane dynamicznie tylko widocznym przyciskom. */
const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤'] as const;

interface OnboardingButtonsProps {
  onUploadRules: () => void;
  onSelectAdventure: () => void;
  onSessionZero?: () => void;
  onCreateCharacter: () => void;
  /**
   * C1 (Hot Seat): otwiera katalog dotychczasowych postaci ("Wybierz z katalogu").
   * Krok renderuje się tylko gdy podany ORAZ istnieją zapisane postacie.
   */
  onPickCharacter?: () => void;
  onStartGame: () => void;
  /** #7: otwiera setup Hot Seat (Solo / 2 osoby). Krok renderuje się tylko gdy podany. */
  onChoosePlayMode?: () => void;
  hasRules: boolean;
  hasAdventure: boolean;
  hasSessionZero: boolean;
  hasCharacter: boolean;
  /** C1: czy w katalogu są jakieś postacie do wyboru. */
  hasSavedCharacters?: boolean;
  /** #7: czy aktywny tryb duetu (Hot Seat 2 graczy). */
  isDuet?: boolean;
}

type StepState = 'primary' | 'todo' | 'done' | 'locked';

const BASE_BTN =
  'w-full font-display font-semibold uppercase tracking-[0.16em] text-sm py-3.5 px-5 transition-all flex items-center justify-center gap-2';

/** Klasy déco wg stanu kroku (makieta: emerald filled / złoty outline / muted). */
const STATE_CLASS: Record<StepState, string> = {
  primary:
    'text-[#04110f] bg-primary border border-primary animate-emerald-pulse hover:brightness-110 cursor-pointer',
  todo: 'text-brass bg-brass/[0.04] border border-brass/45 hover:bg-brass/10 cursor-pointer',
  done: 'text-brass/90 bg-brass/[0.04] border border-brass/30 hover:bg-brass/10 cursor-pointer',
  locked:
    'text-muted-foreground bg-transparent border border-border opacity-50 cursor-not-allowed',
};

/** Pojedynczy przycisk-krok w stylu makiety. */
const StepButton: FC<{
  num: string;
  label: string;
  state: StepState;
  onClick: () => void;
}> = ({ num, label, state, onClick }) => (
  <button
    onClick={onClick}
    disabled={state === 'locked'}
    className={`${BASE_BTN} ${STATE_CLASS[state]}`}
  >
    {num && (
      <span className="text-xs opacity-70 font-special-elite">{num}</span>
    )}
    <span>{label}</span>
    {state === 'done' && <span className="text-primary text-xs">✓</span>}
  </button>
);

export const OnboardingButtons: FC<OnboardingButtonsProps> = ({
  onUploadRules,
  onSelectAdventure,
  onSessionZero,
  onCreateCharacter,
  onPickCharacter,
  onStartGame,
  onChoosePlayMode,
  hasRules,
  hasAdventure,
  hasSessionZero,
  hasCharacter,
  hasSavedCharacters = false,
  isDuet = false,
}) => {
  // C1: krok "Wybierz postać" pokazujemy tylko gdy jest co wybierać.
  const showPickCharacter = !!onPickCharacter && hasSavedCharacters;

  // Numeracja dynamiczna: tylko widoczne kroki dostają kolejny numer, więc
  // ukrycie "Wgraj zasady" / brak kroku trybu gry nie zostawia dziury w sekwencji.
  let stepIndex = 0;
  const rulesNum = SHOW_UPLOAD_RULES ? CIRCLED_NUMBERS[stepIndex++] : '';
  // #7: krok "Tryb gry" (Solo / 2 osoby) jako pierwszy - appka pyta jak grasz.
  const playModeNum = onChoosePlayMode ? CIRCLED_NUMBERS[stepIndex++] : '';
  const adventureNum = CIRCLED_NUMBERS[stepIndex++];
  const sessionZeroNum = onSessionZero ? CIRCLED_NUMBERS[stepIndex++] : '';
  const characterNum = CIRCLED_NUMBERS[stepIndex++];
  // C1: "Wybierz postać" dzieli numer z "Stwórz postać" (alternatywa, nie kolejny krok).
  const startNum = CIRCLED_NUMBERS[stepIndex++];

  // Stany kroków: dokładnie jeden "primary" wskazuje następną akcję.
  const adventureState: StepState = hasAdventure ? 'done' : 'primary';
  const sessionZeroState: StepState = hasSessionZero ? 'done' : 'todo';
  const characterState: StepState = hasCharacter
    ? 'done'
    : hasAdventure
      ? 'primary'
      : 'todo';
  // "Rozpocznij" jako pojedynczy primary dopiero gdy komplet (przygoda + postać);
  // gdy jest postać ale brak przygody - pozostaje klikalny (todo), bez 2. pulsu.
  const startState: StepState = !hasCharacter
    ? 'locked'
    : hasAdventure
      ? 'primary'
      : 'todo';

  return (
    <div className="flex flex-col gap-3 w-[min(340px,90vw)] z-20">
      {SHOW_UPLOAD_RULES && (
        <StepButton
          num={rulesNum}
          label="Wgraj zasady"
          state={hasRules ? 'done' : 'todo'}
          onClick={onUploadRules}
        />
      )}

      {onChoosePlayMode && (
        <StepButton
          num={playModeNum}
          label={isDuet ? 'Tryb gry: 2 osoby' : 'Tryb gry: Solo'}
          state={isDuet ? 'done' : 'todo'}
          onClick={onChoosePlayMode}
        />
      )}

      <StepButton
        num={adventureNum}
        label="Wybierz przygodę"
        state={adventureState}
        onClick={onSelectAdventure}
      />

      {onSessionZero && (
        <StepButton
          num={sessionZeroNum}
          label="Sesja Zero"
          state={sessionZeroState}
          onClick={onSessionZero}
        />
      )}

      <StepButton
        num={characterNum}
        label="Stwórz nową postać"
        state={characterState}
        onClick={onCreateCharacter}
      />

      {showPickCharacter && (
        <StepButton
          num=""
          label="lub wybierz z katalogu"
          state={hasCharacter ? 'done' : 'todo'}
          onClick={onPickCharacter!}
        />
      )}

      <StepButton
        num={startNum}
        label="Rozpocznij"
        state={startState}
        onClick={onStartGame}
      />
    </div>
  );
};
