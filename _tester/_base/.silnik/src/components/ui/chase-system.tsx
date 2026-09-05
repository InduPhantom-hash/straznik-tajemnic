"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Progress } from './progress';

// === TYPY ===

export interface ChaseParticipant {
  id: string;
  name: string;
  type: 'pursuer' | 'prey';
  speed: number; // MOV w CoC7
  con: number;
  dex: number;
  position: number; // Pozycja na torze pościgu
  statusEffects: ChaseStatusEffect[];
  isExhausted: boolean;
  actions: number; // Dostępne akcje w tej rundzie
}

export interface ChaseStatusEffect {
  id: string;
  name: string;
  penalty: number;
  duration: number;
}

export interface ChaseDecisionPoint {
  id: string;
  type: 'obstacle' | 'hazard' | 'choice' | 'shortcut' | 'hideout';
  description: string;
  options: ChaseOption[];
  position: number;
}

export interface ChaseOption {
  id: string;
  name: string;
  skillRequired?: string;
  difficulty: number; // Wartość docelowa testu
  successBonus: number; // Ile pól zyskujesz przy sukcesie
  failurePenalty: number; // Ile pól tracisz przy porażce
  riskDescription?: string;
}

export interface ChaseComplication {
  id: string;
  name: string;
  description: string;
  effect: 'slow' | 'damage' | 'obstacle' | 'advantage';
  severity: number;
}

/**
 * Tabela komplikacji z promptu. name/description przechowują stabilne
 * identyfikatory kluczy (namespace ChaseSystem: comp<N>Name/comp<N>Desc) -
 * tłumaczenie następuje w miejscu użycia przez t().
 */
const CHASE_COMPLICATIONS: ChaseComplication[] = [
  { id: '1', name: 'comp1Name', description: 'comp1Desc', effect: 'slow', severity: 1 },
  { id: '2', name: 'comp2Name', description: 'comp2Desc', effect: 'obstacle', severity: 1 },
  { id: '3', name: 'comp3Name', description: 'comp3Desc', effect: 'obstacle', severity: 2 },
  { id: '4', name: 'comp4Name', description: 'comp4Desc', effect: 'slow', severity: 2 },
  { id: '5', name: 'comp5Name', description: 'comp5Desc', effect: 'advantage', severity: 1 },
  { id: '6', name: 'comp6Name', description: 'comp6Desc', effect: 'advantage', severity: 2 },
  { id: '7', name: 'comp7Name', description: 'comp7Desc', effect: 'obstacle', severity: 3 },
  { id: '8', name: 'comp8Name', description: 'comp8Desc', effect: 'damage', severity: 2 },
  { id: '9', name: 'comp9Name', description: 'comp9Desc', effect: 'obstacle', severity: 3 },
  { id: '10', name: 'comp10Name', description: 'comp10Desc', effect: 'damage', severity: 4 },
];

// === GŁÓWNY KOMPONENT ===

interface ChaseSystemProps {
  open: boolean;
  onClose: () => void;
  playerCharacter: ChaseParticipant;
  pursuer: ChaseParticipant;
  onChaseEnd: (result: 'escaped' | 'caught' | 'fight') => void;
}

export function ChaseSystem({
  open,
  onClose,
  playerCharacter,
  pursuer,
  onChaseEnd
}: ChaseSystemProps) {
  const t = useTranslations('ChaseSystem');
  const [player, setPlayer] = useState<ChaseParticipant>(playerCharacter);
  const [enemy, setEnemy] = useState<ChaseParticipant>(pursuer);
  const [currentRound, setCurrentRound] = useState(1);
  const [tension, setTension] = useState(100); // 0-100, maleje z czasem
  const [tensionInterval, setTensionInterval] = useState<NodeJS.Timeout | null>(null);
  const [decisionPoint, setDecisionPoint] = useState<ChaseDecisionPoint | null>(null);
  const [complication, setComplication] = useState<ChaseComplication | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [showResult, setShowResult] = useState<'escaped' | 'caught' | null>(null);

  const TRACK_LENGTH = 20; // Długość toru pościgu
  const ESCAPE_DISTANCE = 5; // Dystans potrzebny do ucieczki
  const CATCH_DISTANCE = 0; // Dystans przy którym zostajemy złapani

  // Timer napięcia
  useEffect(() => {
    if (open && !tensionInterval) {
      const interval = setInterval(() => {
        setTension(prev => Math.max(0, prev - 2));
      }, 1000);
      setTensionInterval(interval);
    }
    
    return () => {
      if (tensionInterval) {
        clearInterval(tensionInterval);
        setTensionInterval(null);
      }
    };
  }, [open]);

  // Sprawdź warunki końca pościgu
  useEffect(() => {
    const distance = player.position - enemy.position;
    
    if (distance >= ESCAPE_DISTANCE) {
      setShowResult('escaped');
    } else if (distance <= CATCH_DISTANCE) {
      setShowResult('caught');
    }
  }, [player.position, enemy.position]);

  // Dodaj wpis do logu
  const addLog = useCallback((message: string) => {
    setLog(prev => [...prev, `[R${currentRound}] ${message}`]);
  }, [currentRound]);

  // Losowa komplikacja
  const generateComplication = useCallback(() => {
    if (Math.random() < 0.3) { // 30% szans na komplikację
      const comp = CHASE_COMPLICATIONS[Math.floor(Math.random() * CHASE_COMPLICATIONS.length)];
      setComplication(comp);
      addLog(t('complicationLog', { name: t(comp.name as never) }));
      return comp;
    }
    return null;
  }, [addLog, t]);

  // Punkt decyzji
  const generateDecisionPoint = useCallback(() => {
    const types: ChaseDecisionPoint['type'][] = ['obstacle', 'hazard', 'choice', 'shortcut', 'hideout'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let description = '';
    let options: ChaseOption[] = [];
    
    switch (type) {
      case 'obstacle':
        description = t('dpObstacleDesc');
        options = [
          { id: '1', name: t('optJumpOver'), skillRequired: t('skillJump'), difficulty: 50, successBonus: 2, failurePenalty: 1 },
          { id: '2', name: t('optGoAround'), difficulty: 0, successBonus: 0, failurePenalty: 0 },
        ];
        break;
      case 'hazard':
        description = t('dpHazardDesc');
        options = [
          { id: '1', name: t('optRunThrough'), skillRequired: t('skillDex'), difficulty: 60, successBonus: 1, failurePenalty: 3, riskDescription: t('riskInjury') },
          { id: '2', name: t('optWait'), difficulty: 0, successBonus: -1, failurePenalty: 0 },
        ];
        break;
      case 'shortcut':
        description = t('dpShortcutDesc');
        options = [
          { id: '1', name: t('optAlleyShortcut'), skillRequired: t('skillOrientation'), difficulty: 40, successBonus: 3, failurePenalty: 2 },
          { id: '2', name: t('optStayMainRoad'), difficulty: 0, successBonus: 1, failurePenalty: 0 },
        ];
        break;
      case 'hideout':
        description = t('dpHideoutDesc');
        options = [
          { id: '1', name: t('optHide'), skillRequired: t('skillHiding'), difficulty: 55, successBonus: 5, failurePenalty: 0, riskDescription: t('riskLoseChase') },
          { id: '2', name: t('optKeepRunning'), difficulty: 0, successBonus: 1, failurePenalty: 0 },
        ];
        break;
      default:
        description = t('dpCrossroadsDesc');
        options = [
          { id: '1', name: t('optLeftAlley'), skillRequired: t('skillLuck'), difficulty: 50, successBonus: 2, failurePenalty: 1 },
          { id: '2', name: t('optStraightMainRoad'), difficulty: 0, successBonus: 1, failurePenalty: 0 },
          { id: '3', name: t('optRightPark'), skillRequired: t('skillRunning'), difficulty: 45, successBonus: 2, failurePenalty: 1 },
        ];
    }
    
    const point: ChaseDecisionPoint = {
      id: Date.now().toString(),
      type,
      description,
      options,
      position: player.position
    };
    
    setDecisionPoint(point);
    addLog(`📍 ${description}`);
  }, [player.position, addLog, t]);

  // Wykonaj test i przesuń
  const performChaseAction = useCallback((option: ChaseOption) => {
    let positionChange = option.successBonus;
    let message = '';
    
    if (option.difficulty > 0) {
      const roll = Math.floor(Math.random() * 100) + 1;
      const success = roll <= option.difficulty;
      
      if (success) {
        positionChange = option.successBonus;
        message = t('successMsg', {
          name: option.name,
          roll,
          difficulty: option.difficulty,
          bonus: option.successBonus,
        });
      } else {
        positionChange = -option.failurePenalty;
        message = t('failureMsg', {
          name: option.name,
          roll,
          difficulty: option.difficulty,
          penalty: option.failurePenalty,
        });
      }
    } else {
      message = t('freeMoveMsg', { name: option.name, bonus: option.successBonus });
    }
    
    addLog(message);
    
    setPlayer(prev => ({
      ...prev,
      position: Math.max(0, prev.position + positionChange)
    }));
    
    setDecisionPoint(null);
    setComplication(null);
    
    // Tura przeciwnika
    setTimeout(() => {
      enemyTurn();
    }, 500);
  }, [addLog, t]);

  // Tura przeciwnika (AI)
  const enemyTurn = useCallback(() => {
    setIsPlayerTurn(false);
    
    // Proste AI - próbuje dogonić
    const baseMove = enemy.speed;
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= enemy.dex;
    
    const move = success ? baseMove + 1 : baseMove - 1;
    
    setEnemy(prev => ({
      ...prev,
      position: prev.position + Math.max(0, move)
    }));
    
    addLog(
      t('enemyMoveLog', {
        name: enemy.name,
        action: success ? t('enemyAccelerates') : t('enemySlowsDown'),
        move,
      })
    );
    
    // Nowa runda
    setCurrentRound(prev => prev + 1);
    setIsPlayerTurn(true);
    
    // Szansa na punkt decyzji lub komplikację
    if (Math.random() < 0.5) {
      generateDecisionPoint();
    } else {
      generateComplication();
    }
  }, [enemy, addLog, generateDecisionPoint, generateComplication, t]);

  // Podstawowe akcje gracza
  const sprintAction = useCallback(() => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= player.con;
    
    if (success) {
      setPlayer(prev => ({ ...prev, position: prev.position + player.speed + 1 }));
      addLog(t('sprintSuccess', { roll, con: player.con, gain: player.speed + 1 }));
    } else {
      setPlayer(prev => ({ ...prev, position: prev.position + player.speed - 1, isExhausted: true }));
      addLog(t('sprintFailure', { roll, con: player.con, loss: player.speed - 1 }));
    }
    
    setTimeout(() => enemyTurn(), 500);
  }, [player, addLog, enemyTurn, t]);

  const normalRun = useCallback(() => {
    setPlayer(prev => ({ ...prev, position: prev.position + player.speed }));
    addLog(t('runLog', { speed: player.speed }));
    setTimeout(() => enemyTurn(), 500);
  }, [player.speed, addLog, enemyTurn, t]);

  const tryToHide = useCallback(() => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= 40; // Bazowa szansa na ukrycie
    
    if (success) {
      setShowResult('escaped');
      addLog(t('hideSuccess', { roll }));
    } else {
      addLog(t('hideFailure', { roll }));
      setTimeout(() => enemyTurn(), 500);
    }
  }, [addLog, enemyTurn, t]);

  // Renderowanie toru pościgu
  const renderTrack = () => {
    const distance = player.position - enemy.position;
    const segments = [];
    
    for (let i = 0; i < TRACK_LENGTH; i++) {
      const isPlayer = i === Math.min(TRACK_LENGTH - 1, player.position);
      const isEnemy = i === Math.min(TRACK_LENGTH - 1, enemy.position);
      
      segments.push(
        <div
          key={i}
          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
            isPlayer && isEnemy ? 'bg-purple-500' :
            isPlayer ? 'bg-green-500' :
            isEnemy ? 'bg-red-500' :
            i < player.position ? 'bg-green-900/30' :
            'bg-muted'
          }`}
        >
          {isPlayer && isEnemy ? '⚔️' :
           isPlayer ? '🏃' :
           isEnemy ? '👹' :
           i + 1}
        </div>
      );
    }
    
    return (
      <div className="flex gap-1 flex-wrap justify-center">
        {segments}
      </div>
    );
  };

  if (!open) return null;

  // Ekran wyniku
  if (showResult) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className={`max-w-md w-full ${showResult === 'escaped' ? 'border-green-500' : 'border-red-500'}`}>
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">
              {showResult === 'escaped' ? '🏆' : '😱'}
            </div>
            <h2 className={`text-2xl font-bold mb-4 ${showResult === 'escaped' ? 'text-green-400' : 'text-red-400'}`}>
              {showResult === 'escaped' ? t('escapedTitle') : t('caughtTitle')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {showResult === 'escaped'
                ? t('escapedText')
                : t('caughtText')}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => onChaseEnd(showResult)}>
                {t('continueButton')}
              </Button>
              {showResult === 'caught' && (
                <Button variant="destructive" onClick={() => onChaseEnd('fight')}>
                  {t('fightButton')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-[80vw] h-[78vh] max-h-[85vh] overflow-y-auto border-amber-500/50 bg-gradient-to-br from-card to-amber-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              {t('title')}
              <Badge className="bg-amber-500">{t('roundBadge', { round: currentRound })}</Badge>
            </CardTitle>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          
          {/* Pasek napięcia */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-amber-400">{t('tensionLabel')}</span>
              <span className={tension < 30 ? 'text-red-400' : 'text-amber-400'}>{tension}%</span>
            </div>
            <Progress value={tension} className="h-2" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tor pościgu */}
          <div className="bg-black/30 p-4 rounded-lg">
            <div className="text-center mb-2 text-sm text-muted-foreground">
              {t('distanceLabel')}{' '}
              <span className={player.position - enemy.position > 2 ? 'text-green-400' : 'text-red-400'}>
                {t('fieldsUnit', { count: player.position - enemy.position })}
              </span>
              {player.position - enemy.position >= ESCAPE_DISTANCE - 1 && (
                <Badge className="ml-2 bg-green-500">{t('nearEscape')}</Badge>
              )}
              {player.position - enemy.position <= 1 && (
                <Badge className="ml-2 bg-red-500">{t('aboutToBeCaught')}</Badge>
              )}
            </div>
            {renderTrack()}
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{t('startLabel')}</span>
              <span>{t('escapeLabel')}</span>
            </div>
          </div>

          {/* Punkt decyzji */}
          {decisionPoint && isPlayerTurn && (
            <Card className="border-amber-500/50 bg-amber-900/20">
              <CardContent className="p-4">
                <h4 className="text-lg font-semibold text-amber-300 mb-2">
                  📍 {decisionPoint.description}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {decisionPoint.options.map(option => (
                    <Button
                      key={option.id}
                      onClick={() => performChaseAction(option)}
                      variant="outline"
                      className="text-left h-auto py-3 flex flex-col items-start"
                    >
                      <span className="font-semibold">{option.name}</span>
                      {option.skillRequired && (
                        <span className="text-xs text-muted-foreground">
                          Test: {option.skillRequired} ({option.difficulty}%)
                        </span>
                      )}
                      {option.riskDescription && (
                        <span className="text-xs text-red-400">{option.riskDescription}</span>
                      )}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Komplikacja */}
          {complication && isPlayerTurn && !decisionPoint && (
            <Card className="border-yellow-500/50 bg-yellow-900/20">
              <CardContent className="p-4">
                <h4 className="text-lg font-semibold text-yellow-300 flex items-center gap-2">
                  ⚠️ {t(complication.name as never)}
                </h4>
                <p className="text-sm text-yellow-200 mt-1">{t(complication.description as never)}</p>
                <Button 
                  onClick={() => {
                    setComplication(null);
                    // Zastosuj efekt komplikacji
                    if (complication.effect === 'slow') {
                      setPlayer(prev => ({ ...prev, position: prev.position - 1 }));
                      addLog(t('complicationSlowLog'));
                    }
                  }}
                  className="mt-2"
                >
                  {t('continueButton')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Akcje gracza */}
          {isPlayerTurn && !decisionPoint && !complication && (
            <div className="grid grid-cols-3 gap-2">
              <Button 
                onClick={normalRun}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {t('runButton', { speed: player.speed })}
              </Button>
              <Button 
                onClick={sprintAction}
                className="bg-orange-600 hover:bg-orange-700"
                disabled={player.isExhausted}
              >
                {t('sprintButton')}
              </Button>
              <Button 
                onClick={tryToHide}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {t('hideButton')}
              </Button>
            </div>
          )}

          {/* Log */}
          <div className="bg-black/30 rounded-lg p-3 max-h-32 overflow-y-auto">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">{t('historyTitle')}</h4>
            <div className="space-y-1 text-xs">
              {log.slice(-5).map((entry, i) => (
                <div key={i} className="text-foreground">{entry}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChaseSystem;
