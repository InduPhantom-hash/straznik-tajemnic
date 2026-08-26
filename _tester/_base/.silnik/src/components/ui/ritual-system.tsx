"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Progress } from './progress';

// === TYPY ===

export interface Ritual {
  id: string;
  name: string;
  source: string;
  type: 'summon' | 'banish' | 'contact' | 'enchant' | 'gate' | 'other';

  // Koszty
  mpCost: number;
  sanCost: number;
  hpCost?: number;
  lifespanCost?: number;

  // Czas
  castingTimeHours: number;
  studyTimeDays: number;

  // Efekty
  description: string;
  effect: string;
  sideEffects: RitualSideEffect[];
  difficulty: number;
}

export interface RitualSideEffect {
  id: string;
  name: string;
  description: string;
  probability: number;
  severity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
}

export interface MythosBook {
  id: string;
  name: string;
  language: string;
  author?: string;

  // Statystyki
  cthulhuMythos: number;
  sanLoss: string;
  studyTimeWeeks: number;

  // Zawartość
  spells: string[];
  rituals: string[];

  // Status
  isStudied: boolean;
  studyProgress: number;
}

// Klucze pól tekstowych tabel (namespace RitualSystem) - zawężone do literałów.
type RitualFieldKey =
  | 'ritualBanishDeepOnesDescription' | 'ritualBanishDeepOnesEffect' | 'ritualBanishDeepOnesName' | 'ritualBanishDeepOnesSource' | 'ritualBodyWarpingDescription' | 'ritualBodyWarpingEffect' | 'ritualBodyWarpingName' | 'ritualBodyWarpingSource' | 'ritualCommandGhostDescription' | 'ritualCommandGhostEffect' | 'ritualCommandGhostName' | 'ritualCommandGhostSource' | 'ritualContactDeepOnesDescription' | 'ritualContactDeepOnesEffect' | 'ritualContactDeepOnesName' | 'ritualContactDeepOnesSource' | 'ritualContactGhoulDescription' | 'ritualContactGhoulEffect' | 'ritualContactGhoulName' | 'ritualContactGhoulSource' | 'ritualContactMiGoDescription' | 'ritualContactMiGoEffect' | 'ritualContactMiGoName' | 'ritualContactMiGoSource' | 'ritualContactNyarlathotepDescription' | 'ritualContactNyarlathotepEffect' | 'ritualContactNyarlathotepName' | 'ritualContactNyarlathotepSource' | 'ritualCreateGateBoxDescription' | 'ritualCreateGateBoxEffect' | 'ritualCreateGateBoxName' | 'ritualCreateGateBoxSource' | 'ritualCreateZombieDescription' | 'ritualCreateZombieEffect' | 'ritualCreateZombieName' | 'ritualCreateZombieSource' | 'ritualDismissEntityDescription' | 'ritualDismissEntityEffect' | 'ritualDismissEntityName' | 'ritualDismissEntitySource' | 'ritualDominateDescription' | 'ritualDominateEffect' | 'ritualDominateName' | 'ritualDominateSource' | 'ritualDreadCurseOfAzathothDescription' | 'ritualDreadCurseOfAzathothEffect' | 'ritualDreadCurseOfAzathothName' | 'ritualDreadCurseOfAzathothSource' | 'ritualElderSignDescription' | 'ritualElderSignEffect' | 'ritualElderSignName' | 'ritualElderSignSource' | 'ritualFailure' | 'ritualFleshWardDescription' | 'ritualFleshWardEffect' | 'ritualFleshWardName' | 'ritualFleshWardSource' | 'ritualGateDescription' | 'ritualGateEffect' | 'ritualGateName' | 'ritualGateSource' | 'ritualPowderOfIbnGhaziDescription' | 'ritualPowderOfIbnGhaziEffect' | 'ritualPowderOfIbnGhaziName' | 'ritualPowderOfIbnGhaziSource' | 'ritualResurrectionDescription' | 'ritualResurrectionEffect' | 'ritualResurrectionName' | 'ritualResurrectionSource' | 'ritualSuccess' | 'ritualSummonByakheeDescription' | 'ritualSummonByakheeEffect' | 'ritualSummonByakheeName' | 'ritualSummonByakheeSource' | 'ritualSummonDarkYoungDescription' | 'ritualSummonDarkYoungEffect' | 'ritualSummonDarkYoungName' | 'ritualSummonDarkYoungSource' | 'ritualSummonDimensionalShamblerDescription' | 'ritualSummonDimensionalShamblerEffect' | 'ritualSummonDimensionalShamblerName' | 'ritualSummonDimensionalShamblerSource' | 'ritualSummonHuntingHorrorDescription' | 'ritualSummonHuntingHorrorEffect' | 'ritualSummonHuntingHorrorName' | 'ritualSummonHuntingHorrorSource' | 'ritualVoorishSignDescription' | 'ritualVoorishSignEffect' | 'ritualVoorishSignName' | 'ritualVoorishSignSource';

type SideEffectFieldKey =
  | 'sideEffect1Description' | 'sideEffect1Name' | 'sideEffect2Description' | 'sideEffect2Name' | 'sideEffect3Description' | 'sideEffect3Name' | 'sideEffect4Description' | 'sideEffect4Name' | 'sideEffect5Description' | 'sideEffect5Name' | 'sideEffect6Description' | 'sideEffect6Name' | 'sideEffect7Description' | 'sideEffect7Name' | 'sideEffect8Description' | 'sideEffect8Name' | 'sideEffect9Description' | 'sideEffect9Name' | 'sideEffect10Description' | 'sideEffect10Name';

// === TABELA EFEKTÓW UBOCZNYCH ===
// Pola tekstowe przechowują płaskie klucze tłumaczeń (namespace RitualSystem)

const SIDE_EFFECTS: RitualSideEffect[] = [
  { id: '1', name: 'sideEffect1Name', description: 'sideEffect1Description', probability: 30, severity: 'minor' },
  { id: '2', name: 'sideEffect2Name', description: 'sideEffect2Description', probability: 25, severity: 'minor' },
  { id: '3', name: 'sideEffect3Name', description: 'sideEffect3Description', probability: 20, severity: 'moderate' },
  { id: '4', name: 'sideEffect4Name', description: 'sideEffect4Description', probability: 15, severity: 'moderate' },
  { id: '5', name: 'sideEffect5Name', description: 'sideEffect5Description', probability: 20, severity: 'moderate' },
  { id: '6', name: 'sideEffect6Name', description: 'sideEffect6Description', probability: 10, severity: 'severe' },
  { id: '7', name: 'sideEffect7Name', description: 'sideEffect7Description', probability: 10, severity: 'severe' },
  { id: '8', name: 'sideEffect8Name', description: 'sideEffect8Description', probability: 5, severity: 'severe' },
  { id: '9', name: 'sideEffect9Name', description: 'sideEffect9Description', probability: 5, severity: 'moderate' },
  { id: '10', name: 'sideEffect10Name', description: 'sideEffect10Description', probability: 2, severity: 'catastrophic' },
];

// Pełna lista rytuałów i zaklęć z podręcznika CoC 7e
// Pola tekstowe przechowują płaskie klucze tłumaczeń (namespace RitualSystem)

const SAMPLE_RITUALS: Ritual[] = [
  // === ZAKLĘCIA OCHRONNE ===
  {
    id: 'elder-sign',
    name: 'ritualElderSignName',
    source: 'ritualElderSignSource',
    type: 'enchant',
    mpCost: 10,
    sanCost: 2,
    castingTimeHours: 1,
    studyTimeDays: 14,
    description: 'ritualElderSignDescription',
    effect: 'ritualElderSignEffect',
    sideEffects: SIDE_EFFECTS.slice(0, 3),
    difficulty: 50
  },
  {
    id: 'powder-of-ibn-ghazi',
    name: 'ritualPowderOfIbnGhaziName',
    source: 'ritualPowderOfIbnGhaziSource',
    type: 'enchant',
    mpCost: 4,
    sanCost: 1,
    castingTimeHours: 0.5,
    studyTimeDays: 7,
    description: 'ritualPowderOfIbnGhaziDescription',
    effect: 'ritualPowderOfIbnGhaziEffect',
    sideEffects: SIDE_EFFECTS.slice(0, 2),
    difficulty: 30
  },
  {
    id: 'voorish-sign',
    name: 'ritualVoorishSignName',
    source: 'ritualVoorishSignSource',
    type: 'enchant',
    mpCost: 2,
    sanCost: 0,
    castingTimeHours: 0.1,
    studyTimeDays: 3,
    description: 'ritualVoorishSignDescription',
    effect: 'ritualVoorishSignEffect',
    sideEffects: [],
    difficulty: 20
  },

  // === ZAKLĘCIA KONTAKTU ===
  {
    id: 'contact-deep-ones',
    name: 'ritualContactDeepOnesName',
    source: 'ritualContactDeepOnesSource',
    type: 'contact',
    mpCost: 8,
    sanCost: 3,
    castingTimeHours: 2,
    studyTimeDays: 7,
    description: 'ritualContactDeepOnesDescription',
    effect: 'ritualContactDeepOnesEffect',
    sideEffects: SIDE_EFFECTS.slice(2, 6),
    difficulty: 40
  },
  {
    id: 'contact-ghoul',
    name: 'ritualContactGhoulName',
    source: 'ritualContactGhoulSource',
    type: 'contact',
    mpCost: 6,
    sanCost: 2,
    castingTimeHours: 1,
    studyTimeDays: 5,
    description: 'ritualContactGhoulDescription',
    effect: 'ritualContactGhoulEffect',
    sideEffects: SIDE_EFFECTS.slice(0, 4),
    difficulty: 35
  },
  {
    id: 'contact-mi-go',
    name: 'ritualContactMiGoName',
    source: 'ritualContactMiGoSource',
    type: 'contact',
    mpCost: 10,
    sanCost: 4,
    castingTimeHours: 3,
    studyTimeDays: 14,
    description: 'ritualContactMiGoDescription',
    effect: 'ritualContactMiGoEffect',
    sideEffects: SIDE_EFFECTS.slice(2, 7),
    difficulty: 55
  },
  {
    id: 'contact-nyarlathotep',
    name: 'ritualContactNyarlathotepName',
    source: 'ritualContactNyarlathotepSource',
    type: 'contact',
    mpCost: 20,
    sanCost: 8,
    hpCost: 3,
    castingTimeHours: 6,
    studyTimeDays: 42,
    description: 'ritualContactNyarlathotepDescription',
    effect: 'ritualContactNyarlathotepEffect',
    sideEffects: SIDE_EFFECTS.slice(4, 10),
    difficulty: 75
  },

  // === ZAKLĘCIA PRZYZWANIA ===
  {
    id: 'summon-byakhee',
    name: 'ritualSummonByakheeName',
    source: 'ritualSummonByakheeSource',
    type: 'summon',
    mpCost: 15,
    sanCost: 5,
    hpCost: 2,
    castingTimeHours: 4,
    studyTimeDays: 21,
    description: 'ritualSummonByakheeDescription',
    effect: 'ritualSummonByakheeEffect',
    sideEffects: SIDE_EFFECTS.slice(3, 8),
    difficulty: 60
  },
  {
    id: 'summon-hunting-horror',
    name: 'ritualSummonHuntingHorrorName',
    source: 'ritualSummonHuntingHorrorSource',
    type: 'summon',
    mpCost: 18,
    sanCost: 6,
    hpCost: 3,
    castingTimeHours: 5,
    studyTimeDays: 28,
    description: 'ritualSummonHuntingHorrorDescription',
    effect: 'ritualSummonHuntingHorrorEffect',
    sideEffects: SIDE_EFFECTS.slice(4, 10),
    difficulty: 70
  },
  {
    id: 'summon-dark-young',
    name: 'ritualSummonDarkYoungName',
    source: 'ritualSummonDarkYoungSource',
    type: 'summon',
    mpCost: 25,
    sanCost: 8,
    hpCost: 5,
    castingTimeHours: 6,
    studyTimeDays: 35,
    description: 'ritualSummonDarkYoungDescription',
    effect: 'ritualSummonDarkYoungEffect',
    sideEffects: SIDE_EFFECTS.slice(5, 10),
    difficulty: 75
  },
  {
    id: 'summon-dimensional-shambler',
    name: 'ritualSummonDimensionalShamblerName',
    source: 'ritualSummonDimensionalShamblerSource',
    type: 'summon',
    mpCost: 12,
    sanCost: 4,
    castingTimeHours: 1,
    studyTimeDays: 14,
    description: 'ritualSummonDimensionalShamblerDescription',
    effect: 'ritualSummonDimensionalShamblerEffect',
    sideEffects: SIDE_EFFECTS.slice(3, 9),
    difficulty: 55
  },

  // === ZAKLĘCIA ODPĘDZANIA ===
  {
    id: 'banish-deep-ones',
    name: 'ritualBanishDeepOnesName',
    source: 'ritualBanishDeepOnesSource',
    type: 'banish',
    mpCost: 12,
    sanCost: 2,
    castingTimeHours: 0.5,
    studyTimeDays: 7,
    description: 'ritualBanishDeepOnesDescription',
    effect: 'ritualBanishDeepOnesEffect',
    sideEffects: SIDE_EFFECTS.slice(0, 3),
    difficulty: 45
  },
  {
    id: 'dismiss-entity',
    name: 'ritualDismissEntityName',
    source: 'ritualDismissEntitySource',
    type: 'banish',
    mpCost: 15,
    sanCost: 4,
    castingTimeHours: 1,
    studyTimeDays: 21,
    description: 'ritualDismissEntityDescription',
    effect: 'ritualDismissEntityEffect',
    sideEffects: SIDE_EFFECTS.slice(1, 5),
    difficulty: 55
  },

  // === ZAKLĘCIA BRAMY ===
  {
    id: 'gate',
    name: 'ritualGateName',
    source: 'ritualGateSource',
    type: 'gate',
    mpCost: 20,
    sanCost: 10,
    lifespanCost: 2,
    castingTimeHours: 8,
    studyTimeDays: 60,
    description: 'ritualGateDescription',
    effect: 'ritualGateEffect',
    sideEffects: SIDE_EFFECTS.slice(5, 10),
    difficulty: 80
  },
  {
    id: 'create-gate-box',
    name: 'ritualCreateGateBoxName',
    source: 'ritualCreateGateBoxSource',
    type: 'gate',
    mpCost: 30,
    sanCost: 15,
    lifespanCost: 5,
    hpCost: 5,
    castingTimeHours: 24,
    studyTimeDays: 90,
    description: 'ritualCreateGateBoxDescription',
    effect: 'ritualCreateGateBoxEffect',
    sideEffects: SIDE_EFFECTS.slice(6, 10),
    difficulty: 90
  },

  // === INNE ZAKLĘCIA ===
  {
    id: 'body-warping',
    name: 'ritualBodyWarpingName',
    source: 'ritualBodyWarpingSource',
    type: 'other',
    mpCost: 8,
    sanCost: 3,
    castingTimeHours: 1,
    studyTimeDays: 14,
    description: 'ritualBodyWarpingDescription',
    effect: 'ritualBodyWarpingEffect',
    sideEffects: SIDE_EFFECTS.slice(2, 6),
    difficulty: 50
  },
  {
    id: 'flesh-ward',
    name: 'ritualFleshWardName',
    source: 'ritualFleshWardSource',
    type: 'enchant',
    mpCost: 6,
    sanCost: 1,
    castingTimeHours: 0.5,
    studyTimeDays: 7,
    description: 'ritualFleshWardDescription',
    effect: 'ritualFleshWardEffect',
    sideEffects: SIDE_EFFECTS.slice(0, 2),
    difficulty: 35
  },
  {
    id: 'dominate',
    name: 'ritualDominateName',
    source: 'ritualDominateSource',
    type: 'enchant',
    mpCost: 10,
    sanCost: 4,
    castingTimeHours: 0.1,
    studyTimeDays: 21,
    description: 'ritualDominateDescription',
    effect: 'ritualDominateEffect',
    sideEffects: SIDE_EFFECTS.slice(3, 7),
    difficulty: 60
  },
  {
    id: 'create-zombie',
    name: 'ritualCreateZombieName',
    source: 'ritualCreateZombieSource',
    type: 'enchant',
    mpCost: 14,
    sanCost: 6,
    hpCost: 4,
    castingTimeHours: 12,
    studyTimeDays: 28,
    description: 'ritualCreateZombieDescription',
    effect: 'ritualCreateZombieEffect',
    sideEffects: SIDE_EFFECTS.slice(4, 9),
    difficulty: 65
  },
  {
    id: 'dread-curse-of-azathoth',
    name: 'ritualDreadCurseOfAzathothName',
    source: 'ritualDreadCurseOfAzathothSource',
    type: 'other',
    mpCost: 16,
    sanCost: 8,
    hpCost: 6,
    castingTimeHours: 3,
    studyTimeDays: 42,
    description: 'ritualDreadCurseOfAzathothDescription',
    effect: 'ritualDreadCurseOfAzathothEffect',
    sideEffects: SIDE_EFFECTS.slice(5, 10),
    difficulty: 85
  },
  {
    id: 'command-ghost',
    name: 'ritualCommandGhostName',
    source: 'ritualCommandGhostSource',
    type: 'enchant',
    mpCost: 6,
    sanCost: 3,
    castingTimeHours: 1,
    studyTimeDays: 10,
    description: 'ritualCommandGhostDescription',
    effect: 'ritualCommandGhostEffect',
    sideEffects: SIDE_EFFECTS.slice(1, 5),
    difficulty: 45
  },
  {
    id: 'resurrection',
    name: 'ritualResurrectionName',
    source: 'ritualResurrectionSource',
    type: 'other',
    mpCost: 30,
    sanCost: 20,
    hpCost: 10,
    lifespanCost: 5,
    castingTimeHours: 24,
    studyTimeDays: 120,
    description: 'ritualResurrectionDescription',
    effect: 'ritualResurrectionEffect',
    sideEffects: SIDE_EFFECTS.slice(5, 10),
    difficulty: 95
  }
];

// === KOMPONENTY ===

interface RitualInterfaceProps {
  open: boolean;
  onClose: () => void;
  playerMP: number;
  playerSAN: number;
  playerHP: number;
  playerPOW: number;
  onRitualComplete: (ritual: Ritual, success: boolean, sideEffects: RitualSideEffect[]) => void;
  availableRituals?: Ritual[];
}

export function RitualInterface({
  open,
  onClose,
  playerMP,
  playerSAN,
  playerHP,
  playerPOW,
  onRitualComplete,
  availableRituals = SAMPLE_RITUALS
}: RitualInterfaceProps) {
  const t = useTranslations('RitualSystem');
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [castingProgress, setCastingProgress] = useState(0);
  const [castingTimer, setCastingTimer] = useState<NodeJS.Timeout | null>(null);
  const [result, setResult] = useState<{ success: boolean; roll: number; sideEffects: RitualSideEffect[] } | null>(null);

  // Czyszczenie timera
  useEffect(() => {
    return () => {
      if (castingTimer) {
        clearInterval(castingTimer);
      }
    };
  }, [castingTimer]);

  const canCast = useCallback((ritual: Ritual) => {
    return playerMP >= ritual.mpCost &&
           playerSAN >= ritual.sanCost &&
           (!ritual.hpCost || playerHP > ritual.hpCost);
  }, [playerMP, playerSAN, playerHP]);

  const startCasting = useCallback((ritual: Ritual) => {
    if (!canCast(ritual)) return;

    setIsCasting(true);
    setCastingProgress(0);
    setResult(null);

    // Symulacja czasu rzucania (przyspieszona dla UI)
    const totalTime = Math.min(ritual.castingTimeHours * 2, 30); // Max 30 sekund w UI
    const interval = setInterval(() => {
      setCastingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          finishCasting(ritual);
          return 100;
        }
        return prev + (100 / totalTime);
      });
    }, 1000);

    setCastingTimer(interval);
  }, [canCast]);

  const finishCasting = useCallback((ritual: Ritual) => {
    setIsCasting(false);

    // Rzut na POW
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= ritual.difficulty;

    // Sprawdzenie efektów ubocznych
    const triggeredEffects: RitualSideEffect[] = [];
    for (const effect of ritual.sideEffects) {
      if (Math.random() * 100 < effect.probability) {
        triggeredEffects.push(effect);
      }
    }

    // Przy fumble zawsze aktywuje się jeden efekt uboczny
    if (roll >= 96 && triggeredEffects.length === 0) {
      triggeredEffects.push(SIDE_EFFECTS[Math.floor(Math.random() * SIDE_EFFECTS.length)]);
    }

    setResult({ success, roll, sideEffects: triggeredEffects });
    onRitualComplete(ritual, success, triggeredEffects);
  }, [onRitualComplete]);

  const cancelCasting = useCallback(() => {
    if (castingTimer) {
      clearInterval(castingTimer);
      setCastingTimer(null);
    }
    setIsCasting(false);
    setCastingProgress(0);
  }, [castingTimer]);

  const getCostColor = (current: number, cost: number) => {
    if (current < cost) return 'text-red-500';
    if (current < cost * 1.5) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getTypeIcon = (type: Ritual['type']) => {
    switch (type) {
      case 'summon':
        return '👹';
      case 'banish':
        return '🚫';
      case 'contact':
        return '📡';
      case 'enchant':
        return '✨';
      case 'gate':
        return '🌀';
      default:
        return '🔮';
    }
  };

  const getSeverityColor = (severity: RitualSideEffect['severity']) => {
    switch (severity) {
      case 'minor':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'moderate':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'severe':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'catastrophic':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-950 to-indigo-950 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2 text-purple-300">
              {t('title')}
            </CardTitle>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>

          {/* Statusy gracza */}
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-purple-400">{t('pmShort')}</span>
              <span className={getCostColor(playerMP, selectedRitual?.mpCost || 0)}>{playerMP}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">{t('prShort')}</span>
              <span className={getCostColor(playerSAN, selectedRitual?.sanCost || 0)}>{playerSAN}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">{t('hpShort')}</span>
              <span className={getCostColor(playerHP, selectedRitual?.hpCost || 0)}>{playerHP}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">{t('powShort')}</span>
              <span>{playerPOW}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Ekran rzucania */}
          {isCasting && selectedRitual && (
            <Card className="border-purple-500/50 bg-purple-900/30">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4 animate-pulse">🔮</div>
                <h3 className="text-xl font-semibold text-purple-300 mb-2">
                  {t('castingTitle', { name: t(selectedRitual.name as RitualFieldKey) })}
                </h3>
                <Progress value={castingProgress} className="h-3 mb-4" />
                <p className="text-sm text-purple-400 mb-4">
                  {castingProgress < 30 && t('castStagePrepare')}
                  {castingProgress >= 30 && castingProgress < 60 && t('castStageRecite')}
                  {castingProgress >= 60 && castingProgress < 90 && t('castStageSurge')}
                  {castingProgress >= 90 && t('castStagePeak')}
                </p>
                <Button onClick={cancelCasting} variant="destructive">
                  {t('interruptRitual')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Wynik rytuału */}
          {result && selectedRitual && (
            <Card className={`border-2 ${result.success ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{result.success ? '✨' : '💥'}</div>
                  <h3 className={`text-xl font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                    {result.success ? t('ritualSuccess') : t('ritualFailure')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('rollResult', { roll: result.roll, difficulty: selectedRitual.difficulty })}
                  </p>
                </div>

                {result.sideEffects.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-orange-400 mb-2">{t('triggeredSideEffectsHeader')}</h4>
                    <div className="space-y-2">
                      {result.sideEffects.map(effect => (
                        <div key={effect.id} className={`p-2 rounded border ${getSeverityColor(effect.severity)}`}>
                          <div className="font-semibold">{t(effect.name as SideEffectFieldKey)}</div>
                          <div className="text-sm opacity-80">{t(effect.description as SideEffectFieldKey)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={() => { setResult(null); setSelectedRitual(null); }} className="w-full mt-4">
                  {t('continueButton')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Lista rytuałów */}
          {!isCasting && !result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableRituals.map(ritual => (
                <Card
                  key={ritual.id}
                  className={`cursor-pointer transition-all border ${
                    selectedRitual?.id === ritual.id
                      ? 'border-purple-400 bg-purple-900/30'
                      : 'border-purple-800/50 hover:border-purple-600/50'
                  } ${!canCast(ritual) ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedRitual(ritual)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-purple-300 flex items-center gap-2">
                          {getTypeIcon(ritual.type)} {t(ritual.name as RitualFieldKey)}
                        </h4>
                        <p className="text-xs text-muted-foreground">{t('sourceLabel', { source: t(ritual.source as RitualFieldKey) })}</p>
                      </div>
                      <Badge className="bg-purple-500/30 text-purple-300">
                        {ritual.difficulty}%
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{t(ritual.description as RitualFieldKey)}</p>

                    {/* Koszty */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge className={`${playerMP >= ritual.mpCost ? 'bg-purple-500/30' : 'bg-red-500/30'}`}>
                        {t('mpBadge', { cost: ritual.mpCost })}
                      </Badge>
                      <Badge className={`${playerSAN >= ritual.sanCost ? 'bg-blue-500/30' : 'bg-red-500/30'}`}>
                        {t('prBadge', { cost: ritual.sanCost })}
                      </Badge>
                      {ritual.hpCost && (
                        <Badge className={`${playerHP > ritual.hpCost ? 'bg-red-500/30' : 'bg-orange-500/30'}`}>
                          {t('hpBadge', { cost: ritual.hpCost })}
                        </Badge>
                      )}
                      {ritual.lifespanCost && (
                        <Badge className="bg-yellow-500/30">
                          {t('lifespanBadge', { cost: ritual.lifespanCost })}
                        </Badge>
                      )}
                      <Badge className="bg-gray-500/30">
                        ⏱️ {ritual.castingTimeHours}h
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Szczegoly wybranego rytualu */}
          {selectedRitual && !isCasting && !result && (
            <Card className="border-purple-500/30 bg-purple-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-purple-300">
                  {getTypeIcon(selectedRitual.type)} {t(selectedRitual.name as RitualFieldKey)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-foreground">{t(selectedRitual.effect as RitualFieldKey)}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('castingTimeLabel')}</span>
                    <span className="text-purple-300 ml-2">{t('castingHoursValue', { hours: selectedRitual.castingTimeHours })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('studyTimeLabel')}</span>
                    <span className="text-purple-300 ml-2">{t('studyDaysValue', { days: selectedRitual.studyTimeDays })}</span>
                  </div>
                </div>

                {/* Ostrzezenie o efektach ubocznych */}
                {selectedRitual.sideEffects.length > 0 && (
                  <div className="p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                    <h5 className="text-sm font-semibold text-orange-400 mb-1">{t('possibleSideEffectsHeader')}</h5>
                    <p className="text-xs text-orange-300">
                      {t('knownComplications', {
                        count: selectedRitual.sideEffects.length,
                        names: selectedRitual.sideEffects.slice(0, 2).map(e => t(e.name as SideEffectFieldKey)).join(', ')
                      })}
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => startCasting(selectedRitual)}
                  disabled={!canCast(selectedRitual)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {canCast(selectedRitual) ? t('startRitualButton') : t('insufficientResources')}
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// === KSIEGI MITOW ===

interface MythosBookStudyProps {
  book: MythosBook;
  playerSAN: number;
  onStudyComplete: (cthulhuMythosGain: number, sanLoss: number, learnedSpells: string[]) => void;
  onStudyProgress: (progress: number) => void;
}

export function MythosBookStudy({ book, playerSAN, onStudyComplete, onStudyProgress }: MythosBookStudyProps) {
  const t = useTranslations('RitualSystem');
  const [isStudying, setIsStudying] = useState(false);
  const [progress, setProgress] = useState(book.studyProgress);

  const studySession = useCallback(() => {
    setIsStudying(true);

    // Jedna sesja studiowania to 10% postepu
    setTimeout(() => {
      const newProgress = Math.min(100, progress + 10);
      setProgress(newProgress);
      onStudyProgress(newProgress);
      setIsStudying(false);

      if (newProgress >= 100) {
        // Zakonczono studiowanie
        const sanDice = book.sanLoss.split('/');
        const sanLoss = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
        const spellsLearned = book.spells.slice(0, Math.floor(Math.random() * book.spells.length) + 1);

        onStudyComplete(book.cthulhuMythos, sanLoss, spellsLearned);
      }
    }, 2000);
  }, [progress, book, onStudyComplete, onStudyProgress]);

  return (
    <Card className="border-amber-900/50 bg-amber-950/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">📜</span>
          <div>
            <h4 className="font-semibold text-amber-300">{book.name}</h4>
            <p className="text-xs text-amber-500">{book.language} • {book.author || t('unknownAuthor')}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm mb-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('mythosKnowledgeLabel')}</span>
            <span className="text-purple-400">+{book.cthulhuMythos}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('sanLossLabel')}</span>
            <span className="text-red-400">{book.sanLoss}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('studyTimeBookLabel')}</span>
            <span className="text-foreground">{t('studyWeeksValue', { weeks: book.studyTimeWeeks })}</span>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>{t('progressLabel')}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Button
          onClick={studySession}
          disabled={isStudying || progress >= 100}
          className="w-full bg-amber-700 hover:bg-amber-600"
        >
          {isStudying ? t('studyingButton') : progress >= 100 ? t('readComplete') : t('studyButton')}
        </Button>
      </CardContent>
    </Card>
  );
}

export { SAMPLE_RITUALS, SIDE_EFFECTS };
export default RitualInterface;
