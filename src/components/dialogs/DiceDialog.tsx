'use client';

import type { FC } from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dices,
  RotateCcw,
  Send,
  Minus,
  Plus,
  Volume2,
  History,
} from 'lucide-react';
import { Character, getSkillValue } from '@/lib/types';
import {
  DiceRoll,
  RollOutcome,
  rollD100,
  rollD100WithBonus,
  evaluateSkillCheck,
  getOutcomeInfo,
  formatRollForChat,
  formatRollForAI,
  saveRollToHistory,
  getRollHistory,
  clearRollHistory,
  createSkillRoll,
  isSuccess,
  mapDifficultyToRequired,
  REQUIRED_DIFFICULTY_LABELS,
  requiredThreshold,
  meetsDifficulty,
} from '@/lib/dice-utils';
import { Sparkles } from 'lucide-react';

// === INTERFACES ===

interface DiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRollSendToChat?: (message: string, systemContext: string) => void;
  activeCharacter?: Character;
  preselectedSkill?: string;
  preselectedValue?: number;
  /** Wymagana trudność testu z tagu [TEST:] - egzekwuje próg ½/⅕ przy ocenie. */
  preselectedDifficulty?: 'zwykly' | 'trudny' | 'ekstremalny';
  /** Bilans kości premii/kary z modyfikatorów testu (dodatnie = premia). */
  preselectedBonusDice?: number;
  /** Odejmuje wydane punkty Szczęścia od karty postaci (CoC 7e Luck spending). */
  onSpendLuck?: (amount: number) => void;
}

// === CONSTANTS ===

const COMMON_SKILLS = [
  'Antropologia',
  'Archeologia',
  'Broń palna (krótka)',
  'Broń palna (długa)',
  'Charakteryzacja',
  'Cthulhu Mythos',
  'Czytanie z ruchu warg',
  'Elektryka',
  'Jeździectwo',
  'Księgowość',
  'Maskowanie',
  'Mechanika',
  'Medycyna',
  'Nauka (Astronomia)',
  'Nauka (Biologia)',
  'Nauka (Chemia)',
  'Nauka (Fizyka)',
  'Nasłuchiwanie',
  'Nawigacja',
  'Okultyzm',
  'Orientacja',
  'Perswazja',
  'Pierwsza pomoc',
  'Pływanie',
  'Prawo',
  'Prowadzenie samochodu',
  'Psychoanaliza',
  'Psychologia',
  'Skradanie',
  'Spostrzegawczość',
  'Sztuka (Fotografia)',
  'Tropienie',
  'Ukrywanie',
  'Unik',
  'Walka wręcz (bijatyka)',
  'Wspinaczka',
  'Zastraszanie',
  'Zręczność',
  'Zwinność',
];

// FEATURE:#6 - Dźwięk rzutu kością (ulepszona implementacja z noise + clicks)
const playDiceSound = () => {
  try {
    const audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();

    // Create noise for the rolling/rattling effect
    const bufferSize = audioContext.sampleRate * 0.4; // 400ms of noise
    const noiseBuffer = audioContext.createBuffer(
      1,
      bufferSize,
      audioContext.sampleRate
    );
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Combine noise with clicks to simulate dice hitting
      const t = i / audioContext.sampleRate;
      const envelope = Math.exp(-t * 5); // Decay envelope
      // Random clicks + noise
      const click = Math.random() > 0.98 ? (Math.random() * 2 - 1) * 0.8 : 0;
      const noise = (Math.random() * 2 - 1) * 0.15 * envelope;
      output[i] = noise + click * envelope;
    }

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Filter to make it sound more like dice
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.4
    );

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noiseSource.start(audioContext.currentTime);
    noiseSource.stop(audioContext.currentTime + 0.4);
  } catch {
    // Audio not supported
  }
};

// === COMPONENT ===

export const DiceDialog: FC<DiceDialogProps> = ({
  open,
  onOpenChange,
  onRollSendToChat,
  activeCharacter,
  preselectedSkill,
  preselectedValue,
  preselectedDifficulty,
  preselectedBonusDice,
  onSpendLuck,
}) => {
  // State
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const [bonusDice, setBonusDice] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [skillValue, setSkillValue] = useState<string>('');
  // BUG-A fix: wymagana trudność testu (z [TEST:]); 'zwykly' dla samodzielnej Tacki.
  const [difficulty, setDifficulty] = useState<
    'zwykly' | 'trudny' | 'ekstremalny'
  >('zwykly');
  // Faza 5B: dostępne punkty Szczęścia (snapshot z karty; maleje po wydaniu).
  const [availableLuck, setAvailableLuck] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRolls, setHistoryRolls] = useState<DiceRoll[]>([]);

  // Load history on mount
  useEffect(() => {
    if (open) {
      setHistoryRolls(getRollHistory());

      // Apply preselected skill if provided
      if (preselectedSkill) {
        setSelectedSkill(preselectedSkill);
      }
      if (preselectedValue !== undefined) {
        setSkillValue(preselectedValue.toString());
      }
      // BUG-A fix: trudność i kości premii/kary z tagu [TEST:].
      setDifficulty(preselectedDifficulty ?? 'zwykly');
      setBonusDice(preselectedBonusDice ?? 0);
      // Faza 5B: snapshot puli Szczęścia z karty postaci.
      setAvailableLuck(activeCharacter?.luck ?? 0);
    }
  }, [
    open,
    preselectedSkill,
    preselectedValue,
    preselectedDifficulty,
    preselectedBonusDice,
    activeCharacter?.luck,
  ]);

  // Get character skills for dropdown (compatible with both old and new skill format)
  const characterSkills = activeCharacter?.skills
    ? Object.entries(activeCharacter.skills).map(([name, skillValue]) => ({
        name,
        value: getSkillValue(skillValue),
      }))
    : [];

  // Add roll to current session and history
  const addRoll = useCallback(
    (roll: DiceRoll) => {
      if (soundEnabled) playDiceSound();
      setRolls((prev) => [roll, ...prev]);
      saveRollToHistory(roll);
      setHistoryRolls((prev) => [roll, ...prev]);
    },
    [soundEnabled]
  );

  // === HANDLERS ===

  // Quick roll d100
  const handleQuickD100 = () => {
    const result =
      bonusDice !== 0 ? rollD100WithBonus(bonusDice).total : rollD100();

    const roll: DiceRoll = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      diceType: 'd100',
      rawResult: [result],
      total: result,
      bonusDice: bonusDice !== 0 ? bonusDice : undefined,
      isManual: false,
      characterName: activeCharacter?.name,
    };

    addRoll(roll);
    setBonusDice(0);
  };

  // Skill check (virtual)
  const handleSkillCheck = () => {
    const target = parseInt(skillValue);
    if (isNaN(target) || target < 1 || target > 100) return;

    const result =
      bonusDice !== 0 ? rollD100WithBonus(bonusDice).total : rollD100();

    const roll = createSkillRoll(
      selectedSkill || 'Test',
      target,
      result,
      false,
      activeCharacter?.name,
      bonusDice,
      mapDifficultyToRequired(difficulty)
    );

    addRoll(roll);
    setBonusDice(0);
  };

  // Send roll to chat
  const handleSendToChat = (roll: DiceRoll) => {
    if (!onRollSendToChat) return;

    const chatMessage = formatRollForChat(roll);
    const aiContext = formatRollForAI(roll, activeCharacter?.name);

    onRollSendToChat(chatMessage, aiContext);
    // IND-270 #1: auto-zamknięcie Tacki po wysłaniu rzutu - zwalnia ekran na narrację.
    onOpenChange(false);
  };

  // Clear session rolls
  const handleClearSession = () => {
    setRolls([]);
  };

  // Clear all history
  const handleClearHistory = () => {
    clearRollHistory();
    setHistoryRolls([]);
    setRolls([]);
  };

  // === SZCZĘŚCIE (Faza 5B - CoC 7e Luck spending) ===

  /**
   * Ile punktów Szczęścia trzeba wydać, by ten rzut zaliczył wymaganą trudność.
   * null = nie można wydać (już zdany, fumble, test Poczytalności, już użyto Luck,
   * lub to nie test umiejętności).
   */
  const luckNeededFor = (roll: DiceRoll): number | null => {
    if (!roll.skillName || roll.targetValue === undefined || !roll.outcome)
      return null;
    if (roll.luckSpent) return null; // już użyto na tym rzucie
    if (roll.outcome === 'fumble') return null; // RAW: nie na fumble
    if (/poczytaln|sanity|\bsan\b/i.test(roll.skillName)) return null; // RAW: nie na SAN
    const required = roll.requiredDifficulty ?? 'regular';
    const alreadyPassed = roll.requiredDifficulty
      ? roll.passedRequirement === true
      : isSuccess(roll.outcome);
    if (alreadyPassed) return null;
    const needed = roll.total - requiredThreshold(roll.targetValue, required);
    return needed > 0 ? needed : null;
  };

  const handleSpendLuck = (roll: DiceRoll) => {
    const needed = luckNeededFor(roll);
    if (
      needed === null ||
      needed > availableLuck ||
      roll.targetValue === undefined
    )
      return;
    const required = roll.requiredDifficulty ?? 'regular';
    const threshold = requiredThreshold(roll.targetValue, required);
    const newOutcome = evaluateSkillCheck(threshold, roll.targetValue);
    setRolls((prev) =>
      prev.map((r) =>
        r.id === roll.id
          ? {
              ...r,
              total: threshold,
              outcome: newOutcome,
              passedRequirement: r.requiredDifficulty
                ? meetsDifficulty(newOutcome, required)
                : undefined,
              luckSpent: needed,
            }
          : r
      )
    );
    setAvailableLuck((l) => l - needed);
    onSpendLuck?.(needed);
  };

  // === RENDER HELPERS ===

  const renderOutcomeBadge = (outcome: RollOutcome) => {
    const info = getOutcomeInfo(outcome);
    const success = isSuccess(outcome);

    return (
      <Badge
        variant={success ? 'default' : 'destructive'}
        className={`${info.color} ${outcome === 'critical' ? 'animate-pulse' : ''}`}
      >
        {info.emoji} {info.label}
      </Badge>
    );
  };

  const renderRollItem = (roll: DiceRoll, showSendButton: boolean = true) => (
    <div
      key={roll.id}
      className="flex items-center justify-between gap-2 px-3 py-2.5 bg-[#16130f] border border-brass/15 hover:border-brass/35 transition-colors"
    >
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          {roll.skillName && (
            <span className="font-special-elite text-sm text-muted-foreground truncate">
              {roll.skillName}{' '}
              <span className="text-brass/70">({roll.targetValue}%)</span>
            </span>
          )}
          {!roll.skillName && roll.diceFormula && (
            <span className="font-special-elite text-sm text-muted-foreground">
              {roll.diceFormula}
            </span>
          )}
          {!roll.skillName && !roll.diceFormula && (
            <span className="font-special-elite text-sm text-muted-foreground">
              {roll.diceType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display text-lg font-bold text-foreground tracking-wide">
            {roll.total}
          </span>
          {roll.rawResult.length > 1 && (
            <span className="font-special-elite text-xs text-muted-foreground/70">
              [{roll.rawResult.join(', ')}]
            </span>
          )}
          {roll.outcome && renderOutcomeBadge(roll.outcome)}
          {/* BUG-A fix: werdykt względem wymaganej trudności (trudny/ekstremalny) */}
          {roll.requiredDifficulty &&
            roll.requiredDifficulty !== 'regular' &&
            roll.passedRequirement !== undefined && (
              <Badge
                variant={roll.passedRequirement ? 'default' : 'destructive'}
                className={roll.passedRequirement ? 'bg-emerald-600' : ''}
              >
                {roll.passedRequirement ? '✓' : '✗'} test{' '}
                {REQUIRED_DIFFICULTY_LABELS[roll.requiredDifficulty]}
              </Badge>
            )}
          {roll.luckSpent && (
            <Badge
              variant="outline"
              className="border-yellow-500/50 text-yellow-300"
            >
              <Sparkles className="w-3 h-3 mr-1" /> Szczęście -{roll.luckSpent}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Faza 5B: wydaj Szczęście, by obniżyć rzut do progu (tylko aktywna sesja) */}
        {showSendButton &&
          onSpendLuck &&
          (() => {
            const needed = luckNeededFor(roll);
            return needed !== null && needed <= availableLuck ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSpendLuck(roll)}
                className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10"
                title={`Wydaj ${needed} pkt Szczęścia, by zdać (masz ${availableLuck})`}
              >
                <Sparkles className="w-4 h-4 mr-1" /> {needed}
              </Button>
            ) : null;
          })()}
        {showSendButton && onRollSendToChat && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSendToChat(roll)}
            title="Wyślij do czatu"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
        <span className="font-special-elite text-xs text-muted-foreground/70 whitespace-nowrap">
          {roll.timestamp.toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );

  // Najnowszy rzut (do dużej kości wyniku wg makiety) - bez zmiany danych.
  const latestRoll = rolls[0];

  // === MAIN RENDER ===

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="screen">
        {/* Narożniki déco */}
        <span className="pointer-events-none absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-brass/55" />

        <DialogHeader>
          {/* Nagłówek déco wg makiety: micro-label emerald + tytuł Cinzel */}
          <div className="text-center">
            <div className="font-special-elite text-xs uppercase tracking-[0.32em] text-primary">
              Niech zadecyduje los
            </div>
            <DialogTitle className="mt-1.5 justify-center font-display text-2xl font-bold uppercase tracking-[0.1em] text-foreground">
              Tacka na Kości
            </DialogTitle>
          </div>
          <DialogDescription className="text-center font-serif italic text-muted-foreground">
            Rzucaj kośćmi wirtualnie lub wpisuj wyniki z prawdziwych kości
          </DialogDescription>
        </DialogHeader>

        {/* Separator déco */}
        <div className="flex items-center gap-4 mt-1">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/40" />
          <span className="w-2 h-2 bg-brass rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/40" />
        </div>

        <div className="space-y-4 py-4">
          {/* Duża kość wyniku najnowszego rzutu (układ déco wg makiety 19) */}
          {latestRoll && (
            <div className="relative flex flex-col items-center justify-center overflow-hidden border border-brass/28 bg-[radial-gradient(80%_70%_at_50%_40%,#16130f,#0c0a07)] px-6 py-8">
              {/* sunburst + winieta */}
              <div className="deco-sunburst pointer-events-none absolute inset-0 opacity-60" />
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_40px_rgba(0,0,0,0.7)]" />

              {/* podtytuł: umiejętność/formuła + typ kości */}
              <div className="relative font-special-elite text-sm uppercase tracking-[0.16em] text-muted-foreground mb-3">
                {latestRoll.skillName ??
                  latestRoll.diceFormula ??
                  latestRoll.diceType}
                {latestRoll.skillName &&
                  latestRoll.targetValue !== undefined && (
                    <span className="text-brass">
                      {' '}
                      · {latestRoll.targetValue}%
                    </span>
                  )}
              </div>

              {/* romby + wynik */}
              <div className="relative flex items-center justify-center w-[170px] h-[170px] mb-2">
                <div className="absolute inset-0 border border-primary/50 rotate-45 animate-emerald-pulse" />
                <div className="absolute inset-[18px] border border-brass/40 rotate-45" />
                <div className="relative font-display font-bold text-[74px] leading-none text-foreground [text-shadow:0_0_30px_rgba(13,148,136,0.4)]">
                  {latestRoll.total}
                </div>
              </div>

              {/* werdykt outcome (realne dane) */}
              {latestRoll.outcome && (
                <div
                  className={`relative font-display text-xl uppercase tracking-[0.16em] ${getOutcomeInfo(latestRoll.outcome).color}`}
                >
                  {getOutcomeInfo(latestRoll.outcome).emoji}{' '}
                  {getOutcomeInfo(latestRoll.outcome).label}
                </div>
              )}

              {/* werdykt wymaganej trudności */}
              {latestRoll.requiredDifficulty &&
                latestRoll.requiredDifficulty !== 'regular' &&
                latestRoll.passedRequirement !== undefined && (
                  <div
                    className={`relative mt-1.5 font-special-elite text-xs tracking-[0.1em] ${latestRoll.passedRequirement ? 'text-primary' : 'text-destructive'}`}
                  >
                    {latestRoll.passedRequirement ? '✓' : '✗'} test{' '}
                    {REQUIRED_DIFFICULTY_LABELS[latestRoll.requiredDifficulty]}
                  </div>
                )}

              {/* surowe kości gdy więcej niż jedna */}
              {latestRoll.rawResult.length > 1 && (
                <div className="relative mt-1.5 font-special-elite text-xs tracking-[0.1em] text-muted-foreground">
                  [{latestRoll.rawResult.join(', ')}]
                </div>
              )}

              {/* progi sukcesu wg wartości umiejętności (realne dane) */}
              {latestRoll.targetValue !== undefined && (
                <div className="relative mt-5 flex flex-wrap justify-center gap-x-6 gap-y-1.5 font-special-elite text-xs uppercase tracking-[0.06em]">
                  <span className="text-primary">
                    Skrajny ≤ {Math.floor(latestRoll.targetValue / 5)}
                  </span>
                  <span className="text-brass">
                    Znacz. ≤ {Math.floor(latestRoll.targetValue / 2)}
                  </span>
                  <span className="text-foreground">
                    Zwykły ≤ {latestRoll.targetValue}
                  </span>
                  <span className="text-destructive">
                    Porażka &gt; {latestRoll.targetValue}
                  </span>
                </div>
              )}
            </div>
          )}
          {/* Test umiejętności (opcjonalny) - rzut wirtualny przez silnik dice-utils */}
          <Card className="bg-card border-brass/28">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-brass">
                Test Umiejętności (opcjonalny)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {characterSkills.length > 0 ? (
                  <Select
                    value={selectedSkill}
                    onValueChange={(value: string) => {
                      setSelectedSkill(value);
                      const skill = characterSkills.find(
                        (s) => s.name === value
                      );
                      if (skill) setSkillValue(skill.value.toString());
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Wybierz umiejętność..." />
                    </SelectTrigger>
                    <SelectContent>
                      {characterSkills.map((s) => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.name} ({s.value}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Nazwa umiejętności"
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    className="flex-1"
                  />
                )}
                <Input
                  type="number"
                  placeholder="Wartość %"
                  value={skillValue}
                  onChange={(e) => setSkillValue(e.target.value)}
                  className="w-24"
                  min={1}
                  max={100}
                />
              </div>

              {skillValue && parseInt(skillValue) > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-special-elite text-xs text-muted-foreground">
                  <span
                    className={
                      difficulty === 'zwykly'
                        ? 'text-foreground font-semibold'
                        : ''
                    }
                  >
                    Zwykły: ≤{skillValue}
                  </span>
                  <span className="text-brass/30">·</span>
                  <span
                    className={
                      difficulty === 'trudny' ? 'text-brass font-semibold' : ''
                    }
                  >
                    Trudny: ≤{Math.floor(parseInt(skillValue) / 2)}
                  </span>
                  <span className="text-brass/30">·</span>
                  <span
                    className={
                      difficulty === 'ekstremalny'
                        ? 'text-primary font-semibold'
                        : ''
                    }
                  >
                    Ekstremalny: ≤{Math.floor(parseInt(skillValue) / 5)}
                  </span>
                </div>
              )}
              {difficulty !== 'zwykly' && (
                <div className="font-special-elite text-xs text-amber-400">
                  🎯 Wymagany poziom:{' '}
                  <strong>
                    {
                      REQUIRED_DIFFICULTY_LABELS[
                        mapDifficultyToRequired(difficulty)
                      ]
                    }
                  </strong>{' '}
                  - rzut musi zmieścić się w tym progu, by zaliczyć.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kości premii / kary (déco panel wg makiety) */}
          <div className="border border-brass/28 bg-[#16130f] p-4">
            <div className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-brass mb-3">
              Kości premii / kary
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBonusDice(Math.max(-2, bonusDice - 1))}
                disabled={bonusDice <= -2}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span
                className={`font-display font-bold text-xl w-10 text-center ${
                  bonusDice > 0
                    ? 'text-primary'
                    : bonusDice < 0
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                }`}
              >
                {bonusDice > 0 ? `+${bonusDice}` : bonusDice}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBonusDice(Math.min(2, bonusDice + 1))}
                disabled={bonusDice >= 2}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="font-serif italic text-sm text-muted-foreground/80 mt-3 text-center">
              Kość premii: rzucasz dwiema dziesiątkami dziesiątek, bierzesz
              niższy wynik.
            </p>
          </div>

          {/* Rzut: k100 + opcjonalny test umiejętności */}
          <div className="border border-brass/28 bg-[#16130f] p-4">
            <div className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-brass mb-3">
              Rzut
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleQuickD100}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-display uppercase tracking-[0.12em]"
              >
                <Dices className="w-4 h-4 mr-2" />
                k100
              </Button>
              {selectedSkill && skillValue && (
                <Button
                  onClick={handleSkillCheck}
                  variant="secondary"
                  className="font-display uppercase tracking-[0.12em]"
                >
                  <Dices className="w-4 h-4 mr-2" />
                  Test: {selectedSkill}
                </Button>
              )}
            </div>
          </div>

          {/* Separator déco */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/40" />
            <span className="w-2 h-2 bg-brass rotate-45" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/40" />
          </div>

          {/* Session rolls */}
          <Card className="bg-card border-brass/28">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-brass">
                  Ostatnie rzuty
                  <Badge variant="secondary">{rolls.length}</Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowHistory(!showHistory)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <History className="w-4 h-4 mr-1" />
                    Historia
                  </Button>
                  <Button
                    onClick={handleClearSession}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={rolls.length === 0}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Wyczyść
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {rolls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dices className="w-12 h-12 mx-auto mb-4 opacity-40 text-brass" />
                  <p className="font-special-elite uppercase tracking-[0.12em] text-sm">
                    Brak rzutów w tej sesji
                  </p>
                  <p className="font-serif italic text-sm mt-1">
                    Rzuć kośćmi lub wpisz wynik
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {rolls.map((roll) => renderRollItem(roll))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* History modal */}
          {showHistory && (
            <Card className="bg-card border-brass/28">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.16em] text-brass">
                    <History className="w-4 h-4" />
                    Pełna historia
                    <Badge variant="secondary">{historyRolls.length}</Badge>
                  </CardTitle>
                  <Button
                    onClick={handleClearHistory}
                    variant="destructive"
                    size="sm"
                    disabled={historyRolls.length === 0}
                  >
                    Wyczyść wszystko
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {historyRolls.length === 0 ? (
                  <p className="text-center py-4 font-serif italic text-muted-foreground">
                    Brak zapisanej historii
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {historyRolls
                      .slice(0, 50)
                      .map((roll) => renderRollItem(roll, false))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Footer actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-muted-foreground"
              title={soundEnabled ? 'Wycisz kości' : 'Włącz dźwięk kości'}
            >
              <Volume2
                className={`w-4 h-4 ${soundEnabled ? 'text-brass' : 'opacity-50'}`}
              />
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="font-display uppercase tracking-[0.12em]"
            >
              Zamknij
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
