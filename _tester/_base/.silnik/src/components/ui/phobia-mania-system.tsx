"use client";

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

// === TYPY FOBII I MANII ===

export interface Phobia {
  id: string;
  name: string;
  trigger: string; // Co wywołuje reakcję
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  mechanicalEffect: PhobiaEffect;
  acquiredFrom?: string; // Wydarzenie, które spowodowało fobię
  acquiredDate?: Date;
}

export interface PhobiaEffect {
  sanPenalty?: number; // Kara do testów SAN w obecności triggera
  skillPenalty?: number; // Kara do wszystkich testów
  fleeChance?: number; // Szansa na automatyczną ucieczkę (0-100)
  panicDuration?: number; // Czas paniki w rundach
}

export interface Mania {
  id: string;
  name: string;
  compulsion: string; // Przymus do działania
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  mechanicalEffect: ManiaEffect;
  acquiredFrom?: string;
  acquiredDate?: Date;
}

export interface ManiaEffect {
  resistDifficulty?: number; // Trudność testu POW aby się powstrzymać
  duration?: number; // Czas trwania epizodu w minutach
  socialPenalty?: number; // Kara do interakcji społecznych
}

// === TABELE FOBII I MANII (z CZĘŚĆ VI promptu) ===

// Teksty (name/trigger/description) są resolwowane w komponentach przez
// t(`phobia_${id}_name`) itd. Pola zostają puste jako placeholdery kształtu.
export const SAMPLE_PHOBIAS: Phobia[] = [
  {
    id: 'claustrophobia',
    name: '',
    trigger: '',
    description: '',
    severity: 'moderate',
    mechanicalEffect: { skillPenalty: 20, fleeChance: 40, panicDuration: 3 }
  },
  {
    id: 'arachnophobia',
    name: '',
    trigger: '',
    description: '',
    severity: 'mild',
    mechanicalEffect: { skillPenalty: 10, fleeChance: 30 }
  },
  {
    id: 'nyctophobia',
    name: '',
    trigger: '',
    description: '',
    severity: 'severe',
    mechanicalEffect: { skillPenalty: 30, sanPenalty: 1, fleeChance: 50, panicDuration: 5 }
  },
  {
    id: 'thalassophobia',
    name: '',
    trigger: '',
    description: '',
    severity: 'moderate',
    mechanicalEffect: { skillPenalty: 25, sanPenalty: 1, fleeChance: 35 }
  },
  {
    id: 'necrophobia',
    name: '',
    trigger: '',
    description: '',
    severity: 'moderate',
    mechanicalEffect: { skillPenalty: 20, fleeChance: 45, panicDuration: 2 }
  },
  {
    id: 'xenophobia',
    name: '',
    trigger: '',
    description: '',
    severity: 'severe',
    mechanicalEffect: { skillPenalty: 25, sanPenalty: 2, fleeChance: 60, panicDuration: 4 }
  },
  {
    id: 'hemophobia',
    name: '',
    trigger: '',
    description: '',
    severity: 'mild',
    mechanicalEffect: { skillPenalty: 15, fleeChance: 20, panicDuration: 1 }
  },
  {
    id: 'acrophobia',
    name: '',
    trigger: '',
    description: '',
    severity: 'moderate',
    mechanicalEffect: { skillPenalty: 20, fleeChance: 30, panicDuration: 2 }
  }
];

// Teksty (name/compulsion/description) są resolwowane przez t(`mania_${id}_...`).
export const SAMPLE_MANIAS: Mania[] = [
  {
    id: 'pyromania',
    name: '',
    compulsion: '',
    description: '',
    severity: 'severe',
    mechanicalEffect: { resistDifficulty: 40, duration: 30, socialPenalty: 20 }
  },
  {
    id: 'kleptomania',
    name: '',
    compulsion: '',
    description: '',
    severity: 'moderate',
    mechanicalEffect: { resistDifficulty: 50, socialPenalty: 15 }
  },
  {
    id: 'megalomania',
    name: '',
    compulsion: '',
    description: '',
    severity: 'moderate',
    mechanicalEffect: { resistDifficulty: 30, socialPenalty: 25 }
  },
  {
    id: 'dipsomania',
    name: '',
    compulsion: '',
    description: '',
    severity: 'severe',
    mechanicalEffect: { resistDifficulty: 35, duration: 480, socialPenalty: 30 }
  },
  {
    id: 'bibliomania',
    name: '',
    compulsion: '',
    description: '',
    severity: 'mild',
    mechanicalEffect: { resistDifficulty: 60, socialPenalty: 5 }
  },
  {
    id: 'mythomania',
    name: '',
    compulsion: '',
    description: '',
    severity: 'moderate',
    mechanicalEffect: { resistDifficulty: 45, socialPenalty: 20 }
  }
];

// === KOMPONENTY ===

interface PhobiaCheckProps {
  phobia: Phobia;
  playerPOW: number;
  onCheckResult: (result: { 
    triggered: boolean; 
    fled: boolean; 
    panicRounds: number; 
    skillPenalty: number 
  }) => void;
}

export function PhobiaCheck({ phobia, playerPOW, onCheckResult }: PhobiaCheckProps) {
  const t = useTranslations('PhobiaManiaSystem');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{
    roll: number;
    resisted: boolean;
    fled: boolean;
    panicRounds: number;
  } | null>(null);

  const triggerPhobia = useCallback(() => {
    // Test POW aby oprzeć się fobii
    const roll = Math.floor(Math.random() * 100) + 1;
    const resisted = roll <= playerPOW;
    
    // Sprawdź czy postać ucieka
    const fleeRoll = Math.random() * 100;
    const fled = !resisted && fleeRoll < (phobia.mechanicalEffect.fleeChance || 0);
    
    const panicRounds = !resisted ? (phobia.mechanicalEffect.panicDuration || 0) : 0;
    
    const resultData = {
      roll,
      resisted,
      fled,
      panicRounds
    };
    
    setResult(resultData);
    setShowResult(true);
    
    onCheckResult({
      triggered: !resisted,
      fled,
      panicRounds,
      skillPenalty: resisted ? 0 : (phobia.mechanicalEffect.skillPenalty || 0)
    });
  }, [phobia, playerPOW, onCheckResult]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'moderate': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'severe': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20';
    }
  };

  return (
    <Card className="border-red-500/30 bg-red-950/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-red-300 flex items-center gap-2">
            😱 {t(`phobia_${phobia.id as KnownPhobiaId}_name`)}
          </CardTitle>
          <Badge className={getSeverityColor(phobia.severity)}>
            {phobia.severity === 'mild' ? t('severityMild') :
             phobia.severity === 'moderate' ? t('severityModerate') : t('severitySevere')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t(`phobia_${phobia.id as KnownPhobiaId}_description`)}</p>
        
        <div className="p-2 bg-red-900/20 rounded border border-red-500/30">
          <p className="text-xs text-red-300">
            <strong>{t('triggerLabel')}</strong> {t(`phobia_${phobia.id as KnownPhobiaId}_trigger`)}
          </p>
        </div>
        
        {/* Efekty mechaniczne */}
        <div className="flex flex-wrap gap-2 text-xs">
          {phobia.mechanicalEffect.skillPenalty && (
            <Badge variant="outline" className="border-red-500/50 text-red-400">
              {t('skillPenaltyBadge', { value: phobia.mechanicalEffect.skillPenalty })}
            </Badge>
          )}
          {phobia.mechanicalEffect.fleeChance && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
              {t('fleeChanceBadge', { value: phobia.mechanicalEffect.fleeChance })}
            </Badge>
          )}
          {phobia.mechanicalEffect.panicDuration && (
            <Badge variant="outline" className="border-orange-500/50 text-orange-400">
              {t('panicDurationBadge', { value: phobia.mechanicalEffect.panicDuration })}
            </Badge>
          )}
        </div>
        
        {!showResult ? (
          <Button 
            onClick={triggerPhobia}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            🎲 {t('phobiaCheckButton')}
          </Button>
        ) : result && (
          <div className={`p-3 rounded-lg ${result.resisted ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50'} border`}>
            <div className="flex items-center justify-between mb-2">
              <span className={result.resisted ? 'text-green-400' : 'text-red-400'}>
                {result.resisted ? t('resistedFear') : t('phobiaTakesOver')}
              </span>
              <Badge>{result.roll} / {playerPOW}</Badge>
            </div>
            {!result.resisted && (
              <div className="text-sm text-red-300 space-y-1">
                {result.fled && <p>🏃 {t('autoFleeMessage')}</p>}
                {result.panicRounds > 0 && <p>😰 {t('panicRoundsMessage', { value: result.panicRounds })}</p>}
              </div>
            )}
            <Button 
              onClick={() => setShowResult(false)}
              variant="outline"
              className="w-full mt-2"
            >
              {t('continueButton')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === MANIA CHECK ===

interface ManiaCheckProps {
  mania: Mania;
  playerPOW: number;
  onCheckResult: (result: { resisted: boolean; duration: number }) => void;
}

export function ManiaCheck({ mania, playerPOW, onCheckResult }: ManiaCheckProps) {
  const t = useTranslations('PhobiaManiaSystem');
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ roll: number; resisted: boolean } | null>(null);

  const triggerMania = useCallback(() => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const resisted = roll <= (mania.mechanicalEffect.resistDifficulty || 50);
    
    setResult({ roll, resisted });
    setShowResult(true);
    
    onCheckResult({
      resisted,
      duration: resisted ? 0 : (mania.mechanicalEffect.duration || 60)
    });
  }, [mania, onCheckResult]);

  return (
    <Card className="border-orange-500/30 bg-orange-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-orange-300 flex items-center gap-2">
          🔥 {t(`mania_${mania.id as KnownManiaId}_name`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t(`mania_${mania.id as KnownManiaId}_description`)}</p>
        
        <div className="p-2 bg-orange-900/20 rounded border border-orange-500/30">
          <p className="text-xs text-orange-300">
            <strong>{t('compulsionLabel')}</strong> {t(`mania_${mania.id as KnownManiaId}_compulsion`)}
          </p>
        </div>
        
        {!showResult ? (
          <Button 
            onClick={triggerMania}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            🎲 {t('maniaCheckButton')}
          </Button>
        ) : result && (
          <div className={`p-3 rounded-lg ${result.resisted ? 'bg-green-900/30 border-green-500/50' : 'bg-orange-900/30 border-orange-500/50'} border`}>
            <span className={result.resisted ? 'text-green-400' : 'text-orange-400'}>
              {result.resisted ? t('resistedCompulsion') : t('compulsionStronger')}
            </span>
            {!result.resisted && mania.mechanicalEffect.duration && (
              <p className="text-sm text-orange-300 mt-1">
                ⏱️ {t('episodeDuration', { value: mania.mechanicalEffect.duration })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === GENERATOR NOWYCH FOBII (po Szaleństwie Nieokreślonym) ===

export function generateRandomPhobia(triggerEvent?: string): Phobia {
  const basePhobia = SAMPLE_PHOBIAS[Math.floor(Math.random() * SAMPLE_PHOBIAS.length)];
  
  return {
    ...basePhobia,
    id: Date.now().toString(),
    acquiredFrom: triggerEvent || 'Szale\u0144stwo Nieokre\u015blone',
    acquiredDate: new Date()
  };
}

export function generateRandomMania(triggerEvent?: string): Mania {
  const baseMania = SAMPLE_MANIAS[Math.floor(Math.random() * SAMPLE_MANIAS.length)];
  
  return {
    ...baseMania,
    id: Date.now().toString(),
    acquiredFrom: triggerEvent || 'Szale\u0144stwo Nieokre\u015blone',
    acquiredDate: new Date()
  };
}

// === PUSH ROLL (Forsowanie) ===

export interface PushRollResult {
  originalRoll: number;
  pushedRoll: number;
  skill: string;
  targetValue: number;
  originalSuccess: boolean;
  pushedSuccess: boolean;
  consequence?: PushConsequence;
}

type PushConsequenceDescriptionKey =
  | 'pushClimbingFall' | 'pushClimbingToolLoss' | 'pushPersuasionEnemy' | 'pushPersuasionUnmasked' | 'pushHidingSpotted' | 'pushListeningHorror' | 'pushAwarenessHorror' | 'pushMechanicsExplosion' | 'pushMechanicsToolsDestroyed' | 'pushDefaultWorse' | 'pushDefaultDamage';

type KnownPhobiaId =
  | 'claustrophobia' | 'arachnophobia' | 'nyctophobia' | 'thalassophobia' | 'necrophobia' | 'xenophobia' | 'hemophobia' | 'acrophobia';

type KnownManiaId =
  | 'pyromania' | 'kleptomania' | 'megalomania' | 'dipsomania' | 'bibliomania' | 'mythomania';

export interface PushConsequence {
  type: 'damage' | 'san_loss' | 'equipment_loss' | 'social' | 'other';
  description: PushConsequenceDescriptionKey;
  severity: number;
}

// Tabela konsekwencji forsowania per umiejętność.
// description trzyma płaski klucz i18n - tekst resolwuje t() w komponencie.
const PUSH_CONSEQUENCES: Record<string, PushConsequence[]> = {
  'climbing': [
    { type: 'damage', description: 'pushClimbingFall', severity: 3 },
    { type: 'equipment_loss', description: 'pushClimbingToolLoss', severity: 2 }
  ],
  'persuasion': [
    { type: 'social', description: 'pushPersuasionEnemy', severity: 2 },
    { type: 'social', description: 'pushPersuasionUnmasked', severity: 3 }
  ],
  'hiding': [
    { type: 'other', description: 'pushHidingSpotted', severity: 3 }
  ],
  'listening': [
    { type: 'san_loss', description: 'pushListeningHorror', severity: 2 }
  ],
  'awareness': [
    { type: 'san_loss', description: 'pushAwarenessHorror', severity: 2 }
  ],
  'mechanics': [
    { type: 'damage', description: 'pushMechanicsExplosion', severity: 2 },
    { type: 'equipment_loss', description: 'pushMechanicsToolsDestroyed', severity: 2 }
  ],
  'default': [
    { type: 'other', description: 'pushDefaultWorse', severity: 2 },
    { type: 'damage', description: 'pushDefaultDamage', severity: 2 }
  ]
};

// Mapuje nazwę umiejętności (klucze danych) na grupę konsekwencji
function getConsequenceGroup(skill: string): string {
  switch (skill) {
    case 'Wspinaczka':
      return 'climbing';
    case 'Perswazja':
      return 'persuasion';
    case 'Ukrywanie':
      return 'hiding';
    case 'Nas\u0142uchiwanie':
      return 'listening';
    case 'Spostrzegawczo\u015b\u0107':
      return 'awareness';
    case 'Mechanika':
      return 'mechanics';
    default:
      return 'default';
  }
}

interface PushRollDialogProps {
  skill: string;
  targetValue: number;
  originalRoll: number;
  isInCombat: boolean;
  isSanityRoll: boolean;
  playerNarration?: string;
  onPushDecision: (pushed: boolean, result?: PushRollResult) => void;
}

export function PushRollDialog({
  skill,
  targetValue,
  originalRoll,
  isInCombat,
  isSanityRoll,
  playerNarration,
  onPushDecision
}: PushRollDialogProps) {
  const t = useTranslations('PhobiaManiaSystem');
  const [step, setStep] = useState<'question' | 'narration' | 'warning' | 'result'>('question');
  const [narration, setNarration] = useState(playerNarration || '');
  const [pushResult, setPushResult] = useState<PushRollResult | null>(null);

  // Zablokuj forsowanie w walce i przy SAN
  const canPush = !isInCombat && !isSanityRoll;

  const executePush = useCallback(() => {
    const pushedRoll = Math.floor(Math.random() * 100) + 1;
    const pushedSuccess = pushedRoll <= targetValue;
    
    let consequence: PushConsequence | undefined;
    
    if (!pushedSuccess) {
      // Fumble lub porażka - konsekwencje
      const skillConsequences = PUSH_CONSEQUENCES[getConsequenceGroup(skill)];
      consequence = skillConsequences[Math.floor(Math.random() * skillConsequences.length)];
    }
    
    const result: PushRollResult = {
      originalRoll,
      pushedRoll,
      skill,
      targetValue,
      originalSuccess: originalRoll <= targetValue,
      pushedSuccess,
      consequence
    };
    
    setPushResult(result);
    setStep('result');
    onPushDecision(true, result);
  }, [skill, targetValue, originalRoll, onPushDecision]);

  if (!canPush) {
    return (
      <Card className="border-red-500/30 bg-red-950/30">
        <CardContent className="p-4 text-center">
          <p className="text-red-400">
            ❌ {isInCombat ? t('pushBlockedCombat') : t('pushBlockedSanity')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-amber-300 flex items-center gap-2">
          {t('pushTitle', { skill })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Krok 1: Pytanie */}
        {step === 'question' && (
          <>
            <p className="text-foreground">
              {t('pushYourRollLabel')} <Badge>{originalRoll}</Badge> vs <Badge>{targetValue}</Badge> {t('pushFailedSuffix')}
            </p>
            <p className="text-amber-300 text-sm">
              {t('pushOfferText')}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setStep('narration')} className="flex-1 bg-amber-600 hover:bg-amber-700">
                🔄 {t('pushAcceptButton')}
              </Button>
              <Button onClick={() => onPushDecision(false)} variant="outline" className="flex-1">
                ❌ {t('declineButton')}
              </Button>
            </div>
          </>
        )}

        {/* Krok 2: Narracja */}
        {step === 'narration' && (
          <>
            <p className="text-foreground">
              {t('narrationPrompt')}
            </p>
            <textarea
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full p-2 bg-muted border border-border rounded text-foreground"
              placeholder={t('narrationPlaceholder')}
              rows={3}
            />
            <Button onClick={() => setStep('warning')} className="w-full bg-amber-600">
              {t('continueArrow')}
            </Button>
          </>
        )}

        {/* Krok 3: Ostrzeżenie */}
        {step === 'warning' && (
          <>
            <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
              <p className="text-red-300 font-semibold mb-2">{t('warningTitle')}</p>
              <p className="text-red-200 text-sm">
                {t('failureMayMean', { skill })}
              </p>
              <ul className="text-red-200 text-sm mt-2 list-disc list-inside">
                {(PUSH_CONSEQUENCES[getConsequenceGroup(skill)]).map((c, i) => (
                  <li key={i}>{t(c.description)}</li>
                ))}
              </ul>
            </div>
            <p className="text-amber-300 text-sm">
              {t('confirmPush')}
            </p>
            <div className="flex gap-2">
              <Button onClick={executePush} className="flex-1 bg-red-600 hover:bg-red-700">
                🎲 {t('pushExecuteButton')}
              </Button>
              <Button onClick={() => onPushDecision(false)} variant="outline" className="flex-1">
                {t('declineButton')}
              </Button>
            </div>
          </>
        )}

        {/* Krok 4: Wynik */}
        {step === 'result' && pushResult && (
          <>
            <div className={`p-4 rounded-lg ${pushResult.pushedSuccess ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50'} border text-center`}>
              <div className="text-4xl mb-2">
                {pushResult.pushedSuccess ? '🎉' : '💥'}
              </div>
              <p className={`text-xl font-bold ${pushResult.pushedSuccess ? 'text-green-400' : 'text-red-400'}`}>
                {pushResult.pushedSuccess ? t('successExclaim') : t('failureExclaim')}
              </p>
              <p className="text-muted-foreground mt-1">
                {t('rollScoreLabel', {
                  roll: pushResult.pushedRoll,
                  target: pushResult.targetValue,
                })}
              </p>
            </div>
            
            {pushResult.consequence && (
              <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                <p className="text-red-300 font-semibold">{t('consequenceHeading')}</p>
                <p className="text-red-200">{t(pushResult.consequence.description)}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default {
  PhobiaCheck,
  ManiaCheck,
  PushRollDialog,
  generateRandomPhobia,
  generateRandomMania,
  SAMPLE_PHOBIAS,
  SAMPLE_MANIAS
};
