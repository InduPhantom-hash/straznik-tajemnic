'use client';

import { useState, useEffect } from 'react';
import { trackEvent } from '@/lib/posthog';

export interface DiceRoll {
  id: string;
  timestamp: Date;
  diceType: string;
  result: number[];
  total: number;
  target?: number;
  success?: boolean;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
  description: string;
  skillName?: string;
  difficulty?: 'Normal' | 'Hard' | 'Extreme';
  modifiers?: string[];
  testType?: 'Basic' | 'Skill' | 'Combat' | 'Other';
  isPushedRoll?: boolean;
  originalRollId?: string;
  consequences?: string[];
}

export interface SkillTest {
  skillName: string;
  skillValue: number;
  difficulty: 'Normal' | 'Hard' | 'Extreme';
  modifiers?: string[];
}

interface DiceSystemProps {
  onRollComplete: (roll: DiceRoll) => void;
  onClose: () => void;
  character?: {
    skills: { [key: string]: number };
    name: string;
  } | null;
  sessionId?: string;
}

const diceTypes = [
  { name: 'd100', sides: 100, description: 'Kości setne (CoC7)' },
  { name: 'd20', sides: 20, description: 'Kości dwudziestościenne' },
  { name: 'd12', sides: 12, description: 'Kości dwunastościenne' },
  { name: 'd10', sides: 10, description: 'Kości dziesięciościenne' },
  { name: 'd8', sides: 8, description: 'Kości ośmiościenne' },
  { name: 'd6', sides: 6, description: 'Kości sześciościenne' },
  { name: 'd4', sides: 4, description: 'Kości czterościenne' },
  { name: 'd3', sides: 3, description: 'Kości trójścienne' },
];

/**
 * IND-145 C4: stateless PRNG mulberry32 (deterministic per seed).
 * Pojedyncze wywołanie z seed → ten sam wynik (test replay/snapshot).
 */
function mulberry32Single(seed: number): number {
  let a = seed | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Rzuca pojedynczą kością `sides`-ścienną.
 * Z opcjonalnym `seed` deterministyczny (test replay, sesja snapshot).
 * Bez seed: Math.random (zachowanie identyczne jak przed IND-145).
 */
export function rollDie(sides: number, seed?: number): number {
  const r = seed !== undefined ? mulberry32Single(seed) : Math.random();
  return Math.floor(r * sides) + 1;
}

export function DiceSystem({
  onRollComplete,
  onClose,
  character,
  sessionId,
}: DiceSystemProps) {
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedDice, setSelectedDice] = useState('d100');
  const [diceCount, setDiceCount] = useState(1);
  const [skillTest, setSkillTest] = useState<SkillTest | null>(null);
  const [showSkillTest, setShowSkillTest] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillValue, setSkillValue] = useState('');
  const [difficulty, setDifficulty] = useState<'Normal' | 'Hard' | 'Extreme'>(
    'Normal'
  );
  const [modifiers, setModifiers] = useState('');
  const [pushedRolls, setPushedRolls] = useState<{ [key: string]: DiceRoll }>(
    {}
  );
  // M5 sesja 146: dice SFX via ElevenLabs DROPPED per D2.
  // Akceptujemy ciszę dla cube animation (Gemini TTS nie ma SoundEffect API).
  const playDiceSound = async () => {};

  // Load roll history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const historyKey = sessionId
        ? `dice_roll_history_${sessionId}`
        : 'dice_roll_history';
      const savedHistory = localStorage.getItem(historyKey);
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory).map(
            (roll: { timestamp: string }) => ({
              ...roll,
              timestamp: new Date(roll.timestamp),
            })
          );
          setRollHistory(parsedHistory);
        } catch (e) {
          console.error('Error parsing saved roll history:', e);
        }
      }
    }
  }, [sessionId]);

  const saveRollHistory = (history: DiceRoll[]) => {
    if (typeof window !== 'undefined') {
      const historyKey = sessionId
        ? `dice_roll_history_${sessionId}`
        : 'dice_roll_history';
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  };

  const rollDice = (
    diceType: string,
    count: number = 1,
    skillTest: {
      skillName: string;
      skillValue: number;
      difficulty: 'Normal' | 'Hard' | 'Extreme';
      modifiers?: string[];
    } | null = null,
    isPushedRoll: boolean = false,
    originalRollId?: string,
    consequences?: string[]
  ): DiceRoll => {
    const dice = diceTypes.find((d) => d.name === diceType);
    if (!dice) throw new Error(`Nieznany typ kości: ${diceType}`);

    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(rollDie(dice.sides));
    }

    const total = results.reduce((sum, result) => sum + result, 0);

    let target: number | undefined;
    let success: boolean | undefined;
    let criticalSuccess: boolean | undefined;
    let criticalFailure: boolean | undefined;
    let testType: 'Basic' | 'Skill' | 'Combat' | 'Other' = 'Basic';

    if (skillTest) {
      testType = 'Skill';
      target =
        skillTest.difficulty === 'Normal'
          ? skillTest.skillValue
          : skillTest.difficulty === 'Hard'
            ? Math.floor(skillTest.skillValue / 2)
            : Math.floor(skillTest.skillValue / 5);

      if (total <= target) {
        success = true;
        if (total <= Math.floor(target / 5) || total === 1) {
          criticalSuccess = true;
        }
      } else {
        success = false;
        if (total >= 96) {
          criticalFailure = true;
        }
      }
    }

    const roll: DiceRoll = {
      id: Date.now().toString(),
      timestamp: new Date(),
      diceType,
      result: results,
      total,
      target,
      success,
      criticalSuccess,
      criticalFailure,
      description: skillTest
        ? `${skillTest.skillName} (${skillTest.difficulty})${isPushedRoll ? ' - Pushed Roll' : ''}`
        : `${count}x${diceType}`,
      skillName: skillTest?.skillName,
      difficulty: skillTest?.difficulty,
      modifiers: skillTest?.modifiers,
      testType,
      isPushedRoll,
      originalRollId,
      consequences,
    };

    saveRollHistory([roll, ...rollHistory.slice(0, 9)]); // Zachowaj ostatnie 10 rzutów
    return roll;
  };

  const handleRoll = async () => {
    setIsRolling(true);
    playDiceSound(); // Play dice rolling sound effect
    try {
      const roll = rollDice(selectedDice, diceCount, skillTest || null);
      setRollHistory((prev) => [roll, ...prev.slice(0, 9)]);
      onRollComplete(roll);

      trackEvent('dice_rolled', {
        diceType: roll.diceType,
        total: roll.total,
        skill: roll.skillName ?? 'none',
        difficulty: roll.difficulty ?? 'none',
        success: roll.success ?? null,
        criticalSuccess: roll.criticalSuccess ?? false,
        criticalFailure: roll.criticalFailure ?? false,
        pushed: false,
        testType: roll.testType ?? 'Other',
      });

      // If it's a skill test and failed, offer Pushed Roll
      if (skillTest && !roll.success && !roll.isPushedRoll) {
        setPushedRolls((prev) => ({
          ...prev,
          [roll.id]: roll,
        }));
      }
    } catch (error) {
      console.error('Error rolling dice:', error);
    } finally {
      setIsRolling(false);
    }
  };

  const handlePushedRoll = (originalRoll: DiceRoll) => {
    if (!skillTest) return;

    // Ask user for consequences
    const consequences = prompt(
      'Opisz konsekwencje Pushed Roll (co się stanie jeśli ponownie się nie uda):'
    );

    if (consequences) {
      const pushedRoll = rollDice(
        selectedDice,
        diceCount,
        skillTest,
        true,
        originalRoll.id,
        [consequences]
      );

      setRollHistory((prev) => [pushedRoll, ...prev.slice(0, 9)]);
      onRollComplete(pushedRoll);

      trackEvent('dice_rolled', {
        diceType: pushedRoll.diceType,
        total: pushedRoll.total,
        skill: pushedRoll.skillName ?? 'none',
        difficulty: pushedRoll.difficulty ?? 'none',
        success: pushedRoll.success ?? null,
        criticalSuccess: pushedRoll.criticalSuccess ?? false,
        criticalFailure: pushedRoll.criticalFailure ?? false,
        pushed: true,
        testType: pushedRoll.testType ?? 'Other',
      });

      // Remove from available pushed rolls
      setPushedRolls((prev) => {
        const newPushedRolls = { ...prev };
        delete newPushedRolls[originalRoll.id];
        return newPushedRolls;
      });
    }
  };

  const handleSkillTest = () => {
    if (!skillName || !skillValue) return;

    const skillValueNum = parseInt(skillValue);
    if (isNaN(skillValueNum) || skillValueNum < 1 || skillValueNum > 100) {
      alert('Wartość umiejętności musi być liczbą od 1 do 100');
      return;
    }

    setSkillTest({
      skillName,
      skillValue: skillValueNum,
      difficulty,
      modifiers: modifiers ? [modifiers] : undefined,
    });
    setShowSkillTest(false);
  };

  const clearSkillTest = () => {
    setSkillTest(null);
    setSkillName('');
    setSkillValue('');
    setDifficulty('Normal');
    setModifiers('');
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Normal':
        return 'text-green-400';
      case 'Hard':
        return 'text-yellow-400';
      case 'Extreme':
        return 'text-red-400';
      default:
        return 'text-foreground';
    }
  };

  const getSuccessIcon = (roll: DiceRoll) => {
    if (roll.criticalSuccess) return '🎯';
    if (roll.success) return '✅';
    if (roll.criticalFailure) return '💥';
    return '❌';
  };

  const getSuccessText = (roll: DiceRoll) => {
    if (roll.criticalSuccess) return 'Critical Success!';
    if (roll.success) return 'Success';
    if (roll.criticalFailure) return 'Critical Failure!';
    return 'Failure';
  };

  const getSuccessColor = (roll: DiceRoll) => {
    if (roll.criticalSuccess) return 'text-green-400';
    if (roll.success) return 'text-blue-400';
    if (roll.criticalFailure) return 'text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/20">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-purple-300">
              🎲 System Kości
            </h2>
          </div>
          <p className="text-muted-foreground mt-2">
            Rzucaj kośćmi i testuj umiejętności zgodnie z zasadami CoC7
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Dice Rolling */}
            <div className="space-y-6">
              {/* Basic Dice Rolling */}
              <div className="bg-muted/50 rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-semibold text-purple-300 mb-4">
                  🎲 Podstawowe Rzuty
                </h3>

                <div className="space-y-4">
                  {/* Dice Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Typ kości:
                    </label>
                    <select
                      value={selectedDice}
                      onChange={(e) => setSelectedDice(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                    >
                      {diceTypes.map((dice) => (
                        <option key={dice.name} value={dice.name}>
                          {dice.name} - {dice.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dice Count */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Liczba kości:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={diceCount}
                      onChange={(e) =>
                        setDiceCount(parseInt(e.target.value) || 1)
                      }
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Roll Button */}
                  <button
                    onClick={handleRoll}
                    disabled={isRolling}
                    className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-muted disabled:cursor-not-allowed rounded-lg transition-colors text-foreground font-semibold"
                  >
                    {isRolling
                      ? '🎲 Rzucam...'
                      : `🎲 Rzuć ${diceCount}x${selectedDice}`}
                  </button>
                </div>
              </div>

              {/* Skill Test Setup */}
              <div className="bg-muted/50 rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-semibold text-purple-300 mb-4">
                  🎯 Test Umiejętności
                </h3>

                {character && (
                  <div className="mb-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm font-medium mb-2">
                      🎭 Postać: {character.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(character.skills)
                        .slice(0, 6)
                        .map(([skill, value]) => (
                          <button
                            key={skill}
                            onClick={() => {
                              setSkillName(skill);
                              setSkillValue(value.toString());
                              setDifficulty('Normal');
                            }}
                            className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 rounded text-blue-200 transition-colors"
                            title={`Kliknij aby ustawić ${skill} (${value}%)`}
                          >
                            {skill}: {value}%
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {!showSkillTest ? (
                  <div className="space-y-4">
                    {skillTest ? (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-foreground font-medium">
                          {skillTest.skillName}
                        </p>
                        <p
                          className={`text-sm ${getDifficultyColor(skillTest.difficulty)}`}
                        >
                          {skillTest.difficulty} (
                          {skillTest.difficulty === 'Normal'
                            ? skillTest.skillValue
                            : skillTest.difficulty === 'Hard'
                              ? Math.floor(skillTest.skillValue / 2)
                              : Math.floor(skillTest.skillValue / 5)}
                          )
                        </p>
                        {skillTest.modifiers && (
                          <p className="text-sm text-muted-foreground">
                            Modyfikatory: {skillTest.modifiers.join(', ')}
                          </p>
                        )}
                        <button
                          onClick={clearSkillTest}
                          className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                        >
                          Wyczyść
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowSkillTest(true)}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-foreground"
                      >
                        + Ustaw Test Umiejętności
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nazwa umiejętności"
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                    />

                    <input
                      type="number"
                      placeholder="Wartość umiejętności (1-100)"
                      value={skillValue}
                      onChange={(e) => setSkillValue(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                    />

                    <select
                      value={difficulty}
                      onChange={(e) =>
                        setDifficulty(
                          e.target.value as 'Normal' | 'Hard' | 'Extreme'
                        )
                      }
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                    >
                      <option value="Normal">Normalna (100%)</option>
                      <option value="Hard">Trudna (50%)</option>
                      <option value="Extreme">Ekstremalna (20%)</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Modyfikatory (opcjonalnie)"
                      value={modifiers}
                      onChange={(e) => setModifiers(e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-purple-500 focus:outline-none"
                    />

                    <div className="flex space-x-2">
                      <button
                        onClick={handleSkillTest}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-foreground"
                      >
                        Ustaw
                      </button>
                      <button
                        onClick={() => setShowSkillTest(false)}
                        className="flex-1 px-4 py-2 bg-muted hover:bg-muted rounded-lg transition-colors text-foreground"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pushed Roll Section */}
              {Object.keys(pushedRolls).length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 border border-yellow-500/30">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-4">
                    ⚠️ Dostępne Pushed Rolls
                  </h3>
                  <div className="space-y-3">
                    {Object.values(pushedRolls).map((roll) => (
                      <div
                        key={roll.id}
                        className="bg-muted/50 rounded-lg p-3 border border-yellow-500/20"
                      >
                        <p className="text-foreground text-sm">
                          <strong>{roll.skillName}</strong> - {roll.description}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Wynik: {roll.total} vs {roll.target} (
                          {getSuccessText(roll)})
                        </p>
                        <button
                          onClick={() => handlePushedRoll(roll)}
                          className="mt-2 w-full px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition-colors text-foreground"
                        >
                          🎯 Pushed Roll
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-yellow-400 text-xs mt-2">
                    ⚠️ Pushed Roll daje drugą szansę, ale z większymi
                    konsekwencjami porażki
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Roll History */}
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-semibold text-purple-300 mb-4">
                  📜 Historia Rzutów
                </h3>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {rollHistory.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Brak historii rzutów
                    </p>
                  ) : (
                    rollHistory.map((roll) => (
                      <div
                        key={roll.id}
                        className={`bg-muted/50 rounded-lg p-3 border ${
                          roll.isPushedRoll
                            ? 'border-yellow-500/30'
                            : 'border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg">
                            {getSuccessIcon(roll)}
                          </span>
                          <span
                            className={`text-sm font-medium ${getSuccessColor(roll)}`}
                          >
                            {getSuccessText(roll)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-foreground font-medium">
                            {roll.description}
                          </p>

                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-muted-foreground">
                              {roll.diceType}: {roll.result.join(', ')}
                            </span>
                            <span className="text-purple-300 font-semibold">
                              = {roll.total}
                            </span>
                          </div>

                          {roll.target && (
                            <p className="text-sm text-muted-foreground">
                              Cel: {roll.target} ({roll.difficulty})
                            </p>
                          )}

                          {roll.isPushedRoll && (
                            <div className="mt-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                              <p className="text-yellow-300 text-xs font-medium">
                                🔄 Pushed Roll
                              </p>
                              {roll.consequences &&
                                roll.consequences.length > 0 && (
                                  <p className="text-yellow-200 text-xs mt-1">
                                    Konsekwencje: {roll.consequences.join(', ')}
                                  </p>
                                )}
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground mt-2">
                            {roll.timestamp.toLocaleTimeString('pl-PL')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
