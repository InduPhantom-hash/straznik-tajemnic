'use client';

import { useState } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

// === KOŚCI PREMIOWE/KARNE (CoC7) ===

export interface DiceResult {
  units: number; // Cyfra jedności (0-9)
  tens: number; // Cyfra dziesiątek (0-9, gdzie 0 = 00)
  bonusTens: number[]; // Dodatkowe dziesiątki (kości premiowe)
  penaltyTens: number[]; // Dodatkowe dziesiątki (kości karne)
  finalResult: number;
  usedTens: number;
  type: 'normal' | 'bonus' | 'penalty';
}

/**
 * Rzuć kośćmi z uwzględnieniem kości premiowych/karnych
 * @param bonusDice Liczba kości premiowych (0-2)
 * @param penaltyDice Liczba kości karnych (0-2)
 * @returns Wynik rzutu z wszystkimi szczegółami
 */
export function rollWithBonusPenalty(
  bonusDice: number = 0,
  penaltyDice: number = 0
): DiceResult {
  // Rzuć podstawową dziesiątkę i jedności
  const units = Math.floor(Math.random() * 10); // 0-9
  const tens = Math.floor(Math.random() * 10) * 10; // 00, 10, 20, ..., 90

  // Rzuć dodatkowe dziesiątki
  const bonusTens: number[] = [];
  const penaltyTens: number[] = [];

  const netDice = bonusDice - penaltyDice;

  if (netDice > 0) {
    // Kości premiowe - wybierz najniższą dziesiątkę
    for (let i = 0; i < netDice; i++) {
      bonusTens.push(Math.floor(Math.random() * 10) * 10);
    }

    const allTens = [tens, ...bonusTens];
    const usedTens = Math.min(...allTens);
    const finalResult = usedTens + units;

    return {
      units,
      tens,
      bonusTens,
      penaltyTens,
      finalResult: finalResult === 0 ? 100 : finalResult, // 00 + 0 = 100
      usedTens,
      type: 'bonus',
    };
  } else if (netDice < 0) {
    // Kości karne - wybierz najwyższą dziesiątkę
    for (let i = 0; i < Math.abs(netDice); i++) {
      penaltyTens.push(Math.floor(Math.random() * 10) * 10);
    }

    const allTens = [tens, ...penaltyTens];
    const usedTens = Math.max(...allTens);
    const finalResult = usedTens + units;

    return {
      units,
      tens,
      bonusTens,
      penaltyTens,
      finalResult: finalResult === 0 ? 100 : finalResult,
      usedTens,
      type: 'penalty',
    };
  } else {
    // Normalny rzut
    const finalResult = tens + units;
    return {
      units,
      tens,
      bonusTens: [],
      penaltyTens: [],
      finalResult: finalResult === 0 ? 100 : finalResult,
      usedTens: tens,
      type: 'normal',
    };
  }
}

// === GŁĘBOKA RANA (Major Wound) ===

export interface MajorWoundResult {
  isMajorWound: boolean;
  damageDealt: number;
  halfMaxHP: number;
  conTestRequired: boolean;
  conTestResult?: {
    roll: number;
    target: number;
    success: boolean;
    consequence: 'conscious' | 'unconscious' | 'dying';
  };
}

/**
 * Sprawdź czy obrażenia powodują głęboką ranę i wykonaj test KON
 */
export function checkMajorWound(
  damage: number,
  maxHP: number,
  currentHP: number,
  conValue: number
): MajorWoundResult {
  const halfMaxHP = Math.floor(maxHP / 2);
  const isMajorWound = damage >= halfMaxHP;

  const result: MajorWoundResult = {
    isMajorWound,
    damageDealt: damage,
    halfMaxHP,
    conTestRequired: isMajorWound,
  };

  if (isMajorWound) {
    // Automatyczny test KON
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= conValue;

    result.conTestResult = {
      roll,
      target: conValue,
      success,
      consequence: success
        ? 'conscious'
        : currentHP - damage <= 0
          ? 'dying'
          : 'unconscious',
    };
  }

  return result;
}

// === PANEL DECYZJI TAKTYCZNYCH ===

export type TacticalAction =
  | 'dodge'
  | 'counterattack'
  | 'flee'
  | 'parry'
  | 'fight_back';

export interface TacticalDecision {
  action: TacticalAction;
  bonusDice: number;
  penaltyDice: number;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

const TACTICAL_OPTIONS: TacticalDecision[] = [
  {
    action: 'dodge',
    bonusDice: 0,
    penaltyDice: 0,
    description:
      'Unikaj ataku (test Uniku). Możesz unikać wielu ataków, ale każdy kolejny z karą.',
    risk: 'low',
  },
  {
    action: 'counterattack',
    bonusDice: 0,
    penaltyDice: 0,
    description:
      'Kontratakuj! Porównanie umiejętności walki. Wygrana oznacza zadanie obrażeń.',
    risk: 'high',
  },
  {
    action: 'flee',
    bonusDice: 0,
    penaltyDice: 1,
    description:
      'Próba ucieczki. Ryzykujesz jeden atak z okazji od każdego przeciwnika.',
    risk: 'medium',
  },
  {
    action: 'parry',
    bonusDice: 0,
    penaltyDice: 0,
    description: 'Sparuj bronią lub tarczą. Wymaga odpowiedniego przedmiotu.',
    risk: 'low',
  },
  {
    action: 'fight_back',
    bonusDice: 0,
    penaltyDice: 0,
    description:
      'Walcz w defensywie - zmniejszone szanse na trafienie, ale też na bycie trafionym.',
    risk: 'medium',
  },
];

interface TacticalDecisionPanelProps {
  isPlayerTurn: boolean;
  isDefending: boolean; // Czy gracz jest atakowany i musi wybrać reakcję
  onDecision: (decision: TacticalDecision) => void;
  dodgesUsed: number; // Ile razy gracz już unikał w tej rundzie
  hasWeapon: boolean;
  hasShield: boolean;
  canFlee: boolean;
}

export function TacticalDecisionPanel({
  isPlayerTurn,
  isDefending,
  onDecision,
  dodgesUsed,
  hasWeapon,
  hasShield,
  canFlee,
}: TacticalDecisionPanelProps) {
  const [selectedAction, setSelectedAction] = useState<TacticalAction | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);

  // Filtruj opcje na podstawie kontekstu
  const availableOptions = TACTICAL_OPTIONS.filter((opt) => {
    if (opt.action === 'parry' && !hasWeapon && !hasShield) return false;
    if (opt.action === 'flee' && !canFlee) return false;
    if (
      !isDefending &&
      (opt.action === 'dodge' ||
        opt.action === 'parry' ||
        opt.action === 'counterattack')
    )
      return false;
    return true;
  }).map((opt) => {
    // Dodaj karę za wielokrotne uniki
    if (opt.action === 'dodge' && dodgesUsed > 0) {
      return {
        ...opt,
        penaltyDice: dodgesUsed,
        description: `${opt.description} (Kość Karna x${dodgesUsed} za poprzednie uniki)`,
      };
    }
    return opt;
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-muted-foreground border-border/50';
    }
  };

  const getActionIcon = (action: TacticalAction) => {
    switch (action) {
      case 'dodge':
        return '🏃';
      case 'counterattack':
        return '⚔️';
      case 'flee':
        return '🚪';
      case 'parry':
        return '🛡️';
      case 'fight_back':
        return '🥊';
      default:
        return '❓';
    }
  };

  const getActionName = (action: TacticalAction) => {
    switch (action) {
      case 'dodge':
        return 'Unik';
      case 'counterattack':
        return 'Kontratak';
      case 'flee':
        return 'Ucieczka';
      case 'parry':
        return 'Parowanie';
      case 'fight_back':
        return 'Walka defensywna';
      default:
        return action;
    }
  };

  if (!isDefending && !isPlayerTurn) return null;

  return (
    <Card className="bg-gradient-to-br from-amber-900/30 to-red-900/30 border-amber-500/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-300">
          {isDefending ? '🛡️ Reakcja na Atak' : '⚔️ Twoja Tura'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-amber-200/80">
          {isDefending
            ? 'Wróg cię atakuje! Wybierz swoją reakcję:'
            : 'Wybierz swoją akcję w tej turze:'}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {availableOptions.map((option) => (
            <button
              key={option.action}
              onClick={() => {
                setSelectedAction(option.action);
                onDecision(option);
              }}
              className={`p-3 rounded-lg border transition-all text-left ${
                selectedAction === option.action
                  ? 'border-amber-400 bg-amber-500/20'
                  : 'border-white/10 bg-white/5 hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{getActionIcon(option.action)}</span>
                <span className="font-semibold text-foreground">
                  {getActionName(option.action)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-[14px] ${getRiskColor(option.risk)}`}>
                  Ryzyko:{' '}
                  {option.risk === 'low'
                    ? 'niskie'
                    : option.risk === 'medium'
                      ? 'średnie'
                      : 'wysokie'}
                </Badge>
                {option.bonusDice > 0 && (
                  <Badge className="text-[14px] bg-green-500/20 text-green-400">
                    +{option.bonusDice} 🎲
                  </Badge>
                )}
                {option.penaltyDice > 0 && (
                  <Badge className="text-[14px] bg-red-500/20 text-red-400">
                    -{option.penaltyDice} 🎲
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {option.description}
              </p>
            </button>
          ))}
        </div>

        {/* Podpowiedź */}
        <div className="text-xs text-muted-foreground mt-2 p-2 bg-black/20 rounded">
          💡 <strong>Wskazówka:</strong> Unik jest bezpieczny, ale każdy kolejny
          w rundzie otrzymuje Kość Karną. Kontratak jest ryzykowny, ale może
          zadać obrażenia.
        </div>
      </CardContent>
    </Card>
  );
}

// === KOMPONENT WYNIKU RZUTU Z KOŚĆMI PREMIOWYMI ===

interface BonusPenaltyRollDisplayProps {
  result: DiceResult;
  skillName?: string;
  targetValue?: number;
}

export function BonusPenaltyRollDisplay({
  result,
  skillName,
  targetValue,
}: BonusPenaltyRollDisplayProps) {
  const isSuccess = targetValue ? result.finalResult <= targetValue : false;
  const isCritical =
    result.finalResult === 1 ||
    (targetValue && result.finalResult <= Math.floor(targetValue / 5));
  const isFumble = result.finalResult >= 96;

  return (
    <Card
      className={`border ${
        isFumble
          ? 'border-red-500 bg-red-500/10'
          : isCritical
            ? 'border-green-500 bg-green-500/10'
            : isSuccess
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-border bg-gray-500/10'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            {skillName && (
              <div className="text-sm text-muted-foreground mb-1">
                {skillName}
              </div>
            )}
            <div className="text-3xl font-bold">{result.finalResult}</div>
            {targetValue && (
              <div className="text-sm text-muted-foreground">
                Cel: {targetValue}
              </div>
            )}
          </div>

          <div className="text-right">
            {/* Pokazuj wszystkie rzucone dziesiątki */}
            <div className="flex gap-1 justify-end mb-1">
              <Badge
                className={`${result.usedTens === result.tens ? 'bg-amber-500' : 'bg-muted'}`}
              >
                {result.tens.toString().padStart(2, '0')}
              </Badge>
              {result.bonusTens.map((t, i) => (
                <Badge
                  key={i}
                  className={`${result.usedTens === t ? 'bg-green-500' : 'bg-muted'}`}
                >
                  {t.toString().padStart(2, '0')}
                </Badge>
              ))}
              {result.penaltyTens.map((t, i) => (
                <Badge
                  key={i}
                  className={`${result.usedTens === t ? 'bg-red-500' : 'bg-muted'}`}
                >
                  {t.toString().padStart(2, '0')}
                </Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Jedności: {result.units}
            </div>
            <Badge
              className={`mt-1 ${
                result.type === 'bonus'
                  ? 'bg-green-500/30 text-green-400'
                  : result.type === 'penalty'
                    ? 'bg-red-500/30 text-red-400'
                    : 'bg-gray-500/30 text-muted-foreground'
              }`}
            >
              {result.type === 'bonus'
                ? '🍀 Premia'
                : result.type === 'penalty'
                  ? '⚡ Kara'
                  : 'Normalny'}
            </Badge>
          </div>
        </div>

        {/* Wynik */}
        <div className="mt-3 pt-3 border-t border-white/10">
          {isFumble ? (
            <Badge className="bg-red-600 text-foreground">💀 FUMBLE!</Badge>
          ) : isCritical ? (
            <Badge className="bg-green-600 text-foreground">⭐ KRYTYK!</Badge>
          ) : isSuccess ? (
            <Badge className="bg-blue-600 text-foreground">✓ Sukces</Badge>
          ) : (
            <Badge className="bg-muted text-foreground">✗ Porażka</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// === KOMPONENT GŁĘBOKIEJ RANY ===

interface MajorWoundAlertProps {
  result: MajorWoundResult;
  characterName: string;
}

export function MajorWoundAlert({
  result,
  characterName,
}: MajorWoundAlertProps) {
  if (!result.isMajorWound) return null;

  return (
    <Card className="border-red-500 bg-red-900/30 animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🩸</span>
          <div>
            <h4 className="text-lg font-bold text-red-400">GŁĘBOKA RANA!</h4>
            <p className="text-sm text-red-300">
              {characterName} otrzymuje {result.damageDealt} obrażeń (≥{' '}
              {result.halfMaxHP} = połowa max HP)
            </p>
          </div>
        </div>

        {result.conTestResult && (
          <div className="mt-3 p-3 bg-black/30 rounded-lg">
            <div className="text-sm font-semibold text-foreground mb-2">
              Test Kondycji (KON):
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  result.conTestResult.success ? 'bg-green-600' : 'bg-red-600'
                }
              >
                {result.conTestResult.roll} / {result.conTestResult.target}
              </Badge>
              <span className="text-sm">
                {result.conTestResult.consequence === 'conscious' && (
                  <span className="text-green-400">✓ Pozostaje przytomny!</span>
                )}
                {result.conTestResult.consequence === 'unconscious' && (
                  <span className="text-yellow-400">😵 Traci przytomność!</span>
                )}
                {result.conTestResult.consequence === 'dying' && (
                  <span className="text-red-400">
                    💀 KONAJĄCY! Wymaga natychmiastowej pomocy!
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default {
  rollWithBonusPenalty,
  checkMajorWound,
  TacticalDecisionPanel,
  BonusPenaltyRollDisplay,
  MajorWoundAlert,
};
