'use client';

import type { FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { Button } from './button';
import { isAIFeatureAvailable } from '@/lib/ai-settings';
import { useSettingsSubscription } from '@/hooks/use-settings-subscription';
import {
  rollD100,
  evaluateSkillCheck,
  isSuccess,
  rollDiceFormula,
} from '@/lib/dice-utils';

export interface Combatant {
  id: string;
  name: string;
  type: 'player' | 'npc' | 'monster';
  dex: number;
  hp: number;
  maxHp: number;
  san: number;
  maxSan: number;
  mp: number;
  maxMp: number;
  armor: number;
  weapons: Weapon[];
  statusEffects: StatusEffect[];
  initiative: number;
  isActive: boolean;
  isDead: boolean;
  isUnconscious: boolean;
}

export interface Weapon {
  id: string;
  name: string;
  damage: string;
  range: string;
  attacks: number;
  skill: string;
  skillValue: number;
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'condition';
  duration: number;
  description: string;
  effects: {
    hp?: number;
    san?: number;
    mp?: number;
    dex?: number;
    armor?: number;
  };
}

export interface CombatRound {
  id: string;
  roundNumber: number;
  actions: CombatAction[];
  timestamp: Date;
}

export interface CombatAction {
  id: string;
  attackerId: string;
  targetId?: string;
  actionType:
    | 'attack'
    | 'dodge'
    | 'parry'
    | 'move'
    | 'grapple'
    | 'disarm'
    | 'knockback'
    | 'other';
  weapon?: Weapon;
  roll: number;
  target: number;
  success: boolean;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
  damage?: number;
  damageRoll?: string;
  majorWound?: boolean;
  description: string;
  timestamp: Date;
}

// === MANEWRY WALKI (CoC 7e Fighting Maneuvers) ===

export interface CombatManeuver {
  id: string;
  name: string;
  type: 'grapple' | 'disarm' | 'knockback';
  description: string;
  skillUsed: string;
  opposedBy: string;
  effectOnSuccess: string;
  effectOnFailure: string;
}

export const COMBAT_MANEUVERS: CombatManeuver[] = [
  {
    id: 'grapple',
    name: 'Chwyt (Grapple)',
    type: 'grapple',
    description:
      'Chwytasz przeciwnika i unieruchamiasz go. W kolejnych rundach możesz zadawać obrażenia automatycznie.',
    skillUsed: 'Walka Wręcz',
    opposedBy: 'Walka Wręcz lub Unik',
    effectOnSuccess:
      'Cel jest unieruchomiony. Atakujący może: (1) zadać 1d6+DB obrażeń, (2) odebrać przedmiot, (3) utrzymać chwyt. Cel może próbować wyrwać się (test STR vs STR lub Walka Wręcz vs Walka Wręcz).',
    effectOnFailure: 'Chwyt nieudany - atakujący traci akcję w tej rundzie.',
  },
  {
    id: 'disarm',
    name: 'Rozbrojenie (Disarm)',
    type: 'disarm',
    description:
      'Wyrywasz broń z rąk przeciwnika. Wymaga Trudnego sukcesu Walki Wręcz.',
    skillUsed: 'Walka Wręcz (Trudny)',
    opposedBy: 'STR lub ZR (wyższe)',
    effectOnSuccess:
      'Broń przeciwnika upada na ziemię w odległości 1d4 metrów. Przeciwnik jest bezbronny do momentu podniesienia broni.',
    effectOnFailure:
      'Próba nieudana - atakujący traci akcję i jest narażony na kontratak.',
  },
  {
    id: 'knockback',
    name: 'Odepchnięcie (Knockback)',
    type: 'knockback',
    description:
      'Odpychasz przeciwnika siłą. Wymaga testu STR vs STR (lub SIZ).',
    skillUsed: 'Walka Wręcz',
    opposedBy: 'STR lub SIZ (wyższe)',
    effectOnSuccess:
      'Cel jest odrzucony o 1d4 metrów i musi zdać test ZR lub upada (traci następną akcję). Jeśli przy krawędzi/przepaści - test ZR lub spada.',
    effectOnFailure:
      'Przeciwnik się nie rusza. Atakujący traci równowagę - następna akcja z karą -20%.',
  },
];

// === MAJOR WOUNDS (CoC 7e) ===

/**
 * Sprawdza, czy obrażenia powodują Major Wound (Ranę Ciężką)
 * CoC 7e: jeśli obrażenia z jednego ataku ≥ połowy max HP → test CON
 * Porażka: natychmiastowa utrata przytomności + skutki
 */
export function checkMajorWound(
  damage: number,
  maxHp: number,
  con: number
): {
  isMajorWound: boolean;
  conTestRequired: boolean;
  conRoll?: number;
  conTestPassed?: boolean;
  effect: string;
} {
  const threshold = Math.floor(maxHp / 2);
  if (damage < threshold) {
    return { isMajorWound: false, conTestRequired: false, effect: '' };
  }

  const conRoll = rollD100();
  const conTestPassed = conRoll <= con; // zwykły test CON (RAW: rzut ≤ wartość)

  return {
    isMajorWound: true,
    conTestRequired: true,
    conRoll,
    conTestPassed,
    effect: conTestPassed
      ? `RANA CIĘŻKA! Test CON (${conRoll} ≤ ${con}) - ZDANY. Postać walczy dalej, ale jest poważnie ranna.`
      : `RANA CIĘŻKA! Test CON (${conRoll} > ${con}) - NIEZDANY. Postać traci przytomność i zaczyna umierać (wymaga Pierwszej Pomocy/Medycyny w ciągu 1 godziny).`,
  };
}

interface CombatSystemProps {
  onClose: () => void;
  characters: Combatant[];
  onCombatantsChange: (combatants: Combatant[]) => void;
  autoStart?: boolean; // Automatyczne uruchomienie walki
  combatData?: {
    combatants: Array<{
      name: string;
      type: 'player' | 'npc' | 'monster';
      dex?: number;
      hp?: number;
      maxHp?: number;
      san?: number;
      maxSan?: number;
    }>;
    location?: string;
    description?: string;
  };
  autoAdvanceTurn?: boolean; // Automatyczne przejście do następnej tury
  turnTimeLimit?: number; // Czas na turę w sekundach (0 = ręczne)
  onCombatStateChange?: (state: {
    isActive: boolean;
    currentRound: number;
    currentTurn: number;
  }) => void;
}

export function CombatSystem({
  onClose,
  characters,
  onCombatantsChange,
  autoStart = false,
  combatData,
  autoAdvanceTurn = false,
  turnTimeLimit = 0,
  onCombatStateChange,
}: CombatSystemProps) {
  const [combatants, setCombatants] = useState<Combatant[]>(characters);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isCombatActive, setIsCombatActive] = useState(false);
  const [combatHistory, setCombatHistory] = useState<CombatRound[]>([]);
  const [showAddCombatant, setShowAddCombatant] = useState(false);
  const [editingCombatant, setEditingCombatant] = useState<Combatant | null>(
    null
  );
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(false);
  // === REACTIVE SETTINGS: Automatycznie aktualizowane gdy użytkownik zmieni ustawienia ===
  const aiSettings = useSettingsSubscription();
  const [turnTimer, setTurnTimer] = useState<NodeJS.Timeout | null>(null);

  // Automatyczne uruchomienie walki
  useEffect(() => {
    if (
      autoStart &&
      combatData &&
      combatData.combatants.length > 0 &&
      !isCombatActive
    ) {
      // Dodaj uczestników z combatData
      const newCombatants: Combatant[] = combatData.combatants.map((c) => ({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        name: c.name,
        type: c.type,
        dex: c.dex || 50,
        hp: c.hp || 10,
        maxHp: c.maxHp || 10,
        san: c.san || 50,
        maxSan: c.maxSan || 50,
        mp: 10,
        maxMp: 10,
        armor: 0,
        weapons: [],
        statusEffects: [],
        initiative: 0,
        isActive: false,
        isDead: false,
        isUnconscious: false,
      }));

      setCombatants(newCombatants);
      setTimeout(() => {
        startCombat();
      }, 500);
    }
  }, [autoStart, combatData]);

  // Initialize combat if not already done
  useEffect(() => {
    if (combatants.length > 0 && !isCombatActive && !autoStart) {
      rollInitiative();
    }
  }, [combatants]);

  // Timer dla auto-advance tury
  useEffect(() => {
    if (isCombatActive && autoAdvanceTurn && turnTimeLimit > 0) {
      if (turnTimer) clearTimeout(turnTimer);

      const timer = setTimeout(() => {
        nextTurn();
      }, turnTimeLimit * 1000);

      setTurnTimer(timer);

      return () => {
        if (turnTimer) clearTimeout(turnTimer);
      };
    }
  }, [currentTurn, isCombatActive, autoAdvanceTurn, turnTimeLimit]);

  // Powiadom o zmianie stanu walki
  useEffect(() => {
    if (onCombatStateChange) {
      onCombatStateChange({
        isActive: isCombatActive,
        currentRound,
        currentTurn,
      });
    }
  }, [isCombatActive, currentRound, currentTurn]);

  // REMOVED: aiSettings is now reactive via useSettingsSubscription hook
  // Ustawienia są automatycznie synchronizowane
  useEffect(() => {
    setSoundEffectsEnabled(isAIFeatureAvailable('voiceSettings'));
  }, [aiSettings]);

  const playCombatSound = async (
    soundType: 'attack' | 'hit' | 'miss' | 'damage' | 'death' | 'victory'
  ) => {
    if (!soundEffectsEnabled) {
      return;
    }

    try {
      let soundEffectId = '';

      switch (soundType) {
        case 'attack':
          soundEffectId = 'combat-gunshot';
          break;
        case 'hit':
          soundEffectId = 'combat-punch';
          break;
        case 'miss':
          soundEffectId = 'ambient-wind';
          break;
        case 'damage':
          soundEffectId = 'horror-screech';
          break;
        case 'death':
          soundEffectId = 'horror-whisper';
          break;
        case 'victory':
          soundEffectId = 'ambient-thunder';
          break;
        default:
          return;
      }

      // Sound effects disabled - ElevenLabs removed
      console.log('Sound effect would play:', soundEffectId);
    } catch (error) {
      console.error('Failed to play combat sound:', error);
    }
  };

  const rollInitiative = () => {
    const updatedCombatants = combatants
      .map((combatant) => ({
        ...combatant,
        initiative: rollD100() + combatant.dex,
      }))
      .sort((a, b) => b.initiative - a.initiative);

    setCombatants(updatedCombatants);
    onCombatantsChange(updatedCombatants);
  };

  const startCombat = () => {
    setIsCombatActive(true);
    setCurrentTurn(0);
    setCurrentRound(1);
    rollInitiative();

    // Zapisz do localStorage dla integracji z AI
    if (typeof window !== 'undefined') {
      localStorage.setItem('combat_active', 'true');
      localStorage.setItem(
        'combat_data',
        JSON.stringify({
          combatants,
          round: 1,
          turn: 0,
          started: new Date().toISOString(),
        })
      );
    }
  };

  const endCombat = () => {
    setIsCombatActive(false);
    setCurrentTurn(0);
    setCurrentRound(1);

    // Wyczyść timer
    if (turnTimer) {
      clearTimeout(turnTimer);
      setTurnTimer(null);
    }

    // Wyczyść localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('combat_active');
      localStorage.removeItem('combat_data');
    }
  };

  const nextTurn = () => {
    if (currentTurn < combatants.length - 1) {
      setCurrentTurn(currentTurn + 1);
    } else {
      setCurrentRound(currentRound + 1);
      setCurrentTurn(0);
      // Roll new initiative for next round
      rollInitiative();
    }
  };

  const performAttack = (
    attacker: Combatant,
    target: Combatant,
    weapon: Weapon
  ) => {
    const attackRoll = rollD100();
    const targetNumber = weapon.skillValue;

    // Ujednolicone z silnikiem kanonicznym (dice-utils) - wcześniej walka miała
    // własną, błędną ocenę: krytyk mylony z sukcesem ekstremalnym (≤⅕),
    // fumble zawsze przy ≥96 (RAW: dla skill ≥50 fumble tylko przy 100).
    const outcome = evaluateSkillCheck(attackRoll, targetNumber);
    const success = isSuccess(outcome);
    const criticalSuccess = outcome === 'critical';
    const criticalFailure = outcome === 'fumble';

    let damage = 0;
    let damageRoll = '';

    let majorWound = false;

    if (success) {
      // Obrażenia przez wspólny parser formuły (rollDiceFormula); fallback 1d6.
      const dmgFormula = weapon.damage || '1d6';
      const dmgResult = rollDiceFormula(dmgFormula) ?? rollDiceFormula('1d6')!;
      damage = dmgResult.total;
      damageRoll = `${dmgFormula} [${dmgResult.results.join('+')}] = ${damage}`;

      // Critical doubles damage
      if (criticalSuccess) {
        damage = damage * 2;
        damageRoll += ` × 2 (krytyk!) = ${damage}`;
      }

      // Apply armor
      const effectiveDamage = Math.max(0, damage - target.armor);

      // Check Major Wound (CoC 7e: damage ≥ ½ maxHP in single hit)
      const majorWoundResult = checkMajorWound(
        effectiveDamage,
        target.maxHp,
        target.dex
      ); // CON approximated by DEX for NPCs
      majorWound = majorWoundResult.isMajorWound;

      // Apply damage
      const newHp = Math.max(0, target.hp - effectiveDamage);
      const updatedTarget = {
        ...target,
        hp: newHp,
        isDead: newHp <= 0,
        isUnconscious:
          newHp <= 0 || (majorWound && !majorWoundResult.conTestPassed),
      };

      const updatedCombatants = combatants.map((c) =>
        c.id === target.id ? updatedTarget : c
      );
      setCombatants(updatedCombatants);
      onCombatantsChange(updatedCombatants);

      if (target.armor > 0) {
        damageRoll += ` (pancerz ${target.armor} → ${effectiveDamage} obrażeń)`;
      }
    }

    const action: CombatAction = {
      id: Date.now().toString(),
      attackerId: attacker.id,
      targetId: target.id,
      actionType: 'attack',
      weapon,
      roll: attackRoll,
      target: targetNumber,
      success,
      criticalSuccess,
      criticalFailure,
      damage,
      damageRoll,
      majorWound,
      description: `${attacker.name} atakuje ${target.name} używając ${weapon.name}`,
      timestamp: new Date(),
    };

    // Add to combat history
    const currentRoundData = combatHistory.find(
      (r) => r.roundNumber === currentRound
    );
    if (currentRoundData) {
      const updatedRound = {
        ...currentRoundData,
        actions: [...currentRoundData.actions, action],
      };
      setCombatHistory(
        combatHistory.map((r) =>
          r.roundNumber === currentRound ? updatedRound : r
        )
      );
    } else {
      const newRound: CombatRound = {
        id: Date.now().toString(),
        roundNumber: currentRound,
        actions: [action],
        timestamp: new Date(),
      };
      setCombatHistory([...combatHistory, newRound]);
    }

    // Play sound effects
    if (success) {
      if (criticalSuccess) {
        playCombatSound('hit');
      } else if (criticalFailure) {
        playCombatSound('miss');
      } else {
        playCombatSound('attack');
      }

      if (damage > 0) {
        setTimeout(() => playCombatSound('damage'), 200);
      }

      // Check for death
      if (target.hp - damage <= 0) {
        setTimeout(() => playCombatSound('death'), 500);
      }
    } else {
      playCombatSound('miss');
    }

    // Auto-advance turn if attack was successful
    if (success) {
      setTimeout(nextTurn, 1000);
    }
  };

  const addCombatant = (combatant: Omit<Combatant, 'id'>) => {
    const newCombatant: Combatant = {
      ...combatant,
      id: Date.now().toString(),
    };
    const updatedCombatants = [...combatants, newCombatant];
    setCombatants(updatedCombatants);
    onCombatantsChange(updatedCombatants);
    setShowAddCombatant(false);
  };

  const removeCombatant = (id: string) => {
    const updatedCombatants = combatants.filter((c) => c.id !== id);
    setCombatants(updatedCombatants);
    onCombatantsChange(updatedCombatants);
  };

  const getCurrentCombatant = () => {
    return combatants[currentTurn] || null;
  };

  const getStatusColor = (combatant: Combatant) => {
    if (combatant.isDead) return 'text-red-500';
    if (combatant.isUnconscious) return 'text-yellow-500';
    if (combatant.hp < combatant.maxHp / 2) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusIcon = (combatant: Combatant) => {
    if (combatant.isDead) return '💀';
    if (combatant.isUnconscious) return '😵';
    if (combatant.hp < combatant.maxHp / 2) return '🩸';
    return '✅';
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-white/20 max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/20">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-purple-300">
              ⚔️ System Walki
            </h2>
          </div>
          <p className="text-muted-foreground mt-2">
            Zarządzaj walką zgodnie z zasadami CoC7
          </p>
        </div>

        <div className="p-6">
          {/* Combat Controls */}
          <div className="flex gap-4 mb-6">
            <Button
              onClick={startCombat}
              disabled={isCombatActive}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-foreground rounded-lg transition-colors"
            >
              🚀 Rozpocznij Walkę
            </Button>
            <Button
              onClick={endCombat}
              disabled={!isCombatActive}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-foreground rounded-lg transition-colors"
            >
              🛑 Zakończ Walkę
            </Button>
            <Button
              onClick={rollInitiative}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-foreground rounded-lg transition-colors"
            >
              🎲 Rzuć Inicjatywę
            </Button>
            <Button
              onClick={() => setShowAddCombatant(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-foreground rounded-lg transition-colors"
            >
              + Dodaj Uczestnika
            </Button>
          </div>

          {/* Combat Status */}
          {isCombatActive && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-300">
                    🎯 Runda {currentRound} - Tura {currentTurn + 1}
                  </h3>
                  <p className="text-blue-200 text-sm">
                    Aktualny gracz: {getCurrentCombatant()?.name || 'Brak'}
                  </p>
                </div>
                <Button
                  onClick={nextTurn}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-foreground rounded-lg transition-colors"
                >
                  ⏭️ Następna Tura
                </Button>
              </div>
            </div>
          )}

          {/* Combatants Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {combatants.map((combatant, index) => (
              <div
                key={combatant.id}
                className={`bg-muted/50 rounded-lg p-4 border ${
                  currentTurn === index && isCombatActive
                    ? 'border-yellow-500/50 bg-yellow-500/10'
                    : 'border-white/10'
                }`}
              >
                {/* Combatant Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStatusIcon(combatant)}</span>
                    <h3
                      className={`font-semibold ${getStatusColor(combatant)}`}
                    >
                      {combatant.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Inicjatywa: {combatant.initiative}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pozycja: {index + 1}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">HP:</span>
                    <span className={`ml-1 ${getStatusColor(combatant)}`}>
                      {combatant.hp}/{combatant.maxHp}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SAN:</span>
                    <span className="ml-1 text-blue-300">
                      {combatant.san}/{combatant.maxSan}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MP:</span>
                    <span className="ml-1 text-purple-300">
                      {combatant.mp}/{combatant.maxMp}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ZR:</span>
                    <span className="ml-1 text-green-300">{combatant.dex}</span>
                  </div>
                </div>

                {/* Weapons */}
                {combatant.weapons.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      Broń:
                    </h4>
                    <div className="space-y-1">
                      {combatant.weapons.map((weapon) => (
                        <div
                          key={weapon.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-foreground">{weapon.name}</span>
                          <Button
                            onClick={() => {
                              const target = combatants.find(
                                (c) => c.id !== combatant.id && !c.isDead
                              );
                              if (target) {
                                performAttack(combatant, target, weapon);
                              }
                            }}
                            disabled={
                              !isCombatActive ||
                              currentTurn !== index ||
                              combatant.isDead
                            }
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-muted text-foreground rounded text-xs transition-colors"
                          >
                            ⚔️ Atak
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditingCombatant(combatant)}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-foreground rounded text-xs transition-colors"
                  >
                    ✏️ Edytuj
                  </Button>
                  <Button
                    onClick={() => removeCombatant(combatant.id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-foreground rounded text-xs transition-colors"
                  >
                    🗑️ Usuń
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Combat History */}
          {combatHistory.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-purple-300 mb-4">
                📜 Historia Walki
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {combatHistory.map((round) => (
                  <div key={round.id} className="bg-muted/30 rounded-lg p-3">
                    <h4 className="font-medium text-blue-300 mb-2">
                      Runda {round.roundNumber}
                    </h4>
                    <div className="space-y-2">
                      {round.actions.map((action) => (
                        <div
                          key={action.id}
                          className="text-sm bg-muted/30 rounded p-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground">
                              {action.description}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                action.criticalSuccess
                                  ? 'bg-green-600'
                                  : action.success
                                    ? 'bg-blue-600'
                                    : action.criticalFailure
                                      ? 'bg-red-600'
                                      : 'bg-muted'
                              }`}
                            >
                              {action.roll} vs {action.target}
                            </span>
                          </div>
                          {action.damage !== undefined && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Obrażenia: {action.damage} ({action.damageRoll})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Combatant Modal */}
        {showAddCombatant && (
          <AddCombatantForm
            onAdd={addCombatant}
            onCancel={() => setShowAddCombatant(false)}
          />
        )}

        {/* Edit Combatant Modal */}
        {editingCombatant && (
          <EditCombatantForm
            combatant={editingCombatant}
            onUpdate={(updated) => {
              const updatedCombatants = combatants.map((c) =>
                c.id === updated.id ? updated : c
              );
              setCombatants(updatedCombatants);
              onCombatantsChange(updatedCombatants);
              setEditingCombatant(null);
            }}
            onCancel={() => setEditingCombatant(null)}
          />
        )}
      </div>
    </div>
  );
}

interface AddCombatantFormProps {
  onAdd: (combatant: Omit<Combatant, 'id'>) => void;
  onCancel: () => void;
}

function AddCombatantForm({ onAdd, onCancel }: AddCombatantFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'player' as Combatant['type'],
    dex: 50,
    hp: 10,
    maxHp: 10,
    san: 50,
    maxSan: 50,
    mp: 10,
    maxMp: 10,
    armor: 0,
    weapons: [] as Weapon[],
    statusEffects: [] as StatusEffect[],
    initiative: 0,
    isActive: true,
    isDead: false,
    isUnconscious: false,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onAdd(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-purple-300 mb-4">
            ⚔️ Dodaj Uczestnika Walki
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nazwa *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                  placeholder="Nazwa postaci/NPC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Typ
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as Combatant['type'],
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                >
                  <option value="player">Gracz</option>
                  <option value="npc">NPC</option>
                  <option value="monster">Potwór</option>
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Zręczność
                </label>
                <input
                  type="number"
                  value={formData.dex}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dex: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  HP
                </label>
                <input
                  type="number"
                  value={formData.hp}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hp: parseInt(e.target.value) || 0,
                      maxHp: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  SAN
                </label>
                <input
                  type="number"
                  value={formData.san}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      san: parseInt(e.target.value) || 0,
                      maxSan: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                  min="1"
                  max="100"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-foreground rounded-lg transition-colors"
              >
                ➕ Dodaj Uczestnika
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2 bg-muted hover:bg-muted text-foreground rounded-lg transition-colors"
              >
                ❌ Anuluj
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface EditCombatantFormProps {
  combatant: Combatant;
  onUpdate: (combatant: Combatant) => void;
  onCancel: () => void;
}

function EditCombatantForm({
  combatant,
  onUpdate,
  onCancel,
}: EditCombatantFormProps) {
  const [formData, setFormData] = useState(combatant);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-purple-300 mb-4">
            ✏️ Edytuj Uczestnika Walki
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nazwa *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Typ
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as Combatant['type'],
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                >
                  <option value="player">Gracz</option>
                  <option value="npc">NPC</option>
                  <option value="monster">Potwór</option>
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Zręczność
                </label>
                <input
                  type="number"
                  value={formData.dex}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dex: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  HP
                </label>
                <input
                  type="number"
                  value={formData.hp}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hp: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                  min="0"
                  max={formData.maxHp}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  SAN
                </label>
                <input
                  type="number"
                  value={formData.san}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      san: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                  min="0"
                  max={formData.maxSan}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-foreground rounded-lg transition-colors"
              >
                💾 Zapisz Zmiany
              </Button>
              <Button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2 bg-muted hover:bg-muted text-foreground rounded-lg transition-colors"
              >
                ❌ Anuluj
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
