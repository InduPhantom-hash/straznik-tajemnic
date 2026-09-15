import type { DiceRollTraceDie } from '@/lib/dice-roll-trace';

export function PhysicalDiceScene({
  dice,
  label = 'Tacka kości',
}: {
  dice: DiceRollTraceDie[];
  rolling?: boolean;
  label?: string;
}) {
  return <div data-testid="physical-dice-scene" role="img" aria-label={label}>{dice.map((die) => <span key={die.id}>{die.value}</span>)}</div>;
}
