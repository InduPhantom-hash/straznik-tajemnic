"use client";

import { useState, useEffect, useCallback } from 'react';
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

// Tabela komplikacji z promptu
const CHASE_COMPLICATIONS: ChaseComplication[] = [
  { id: '1', name: 'Mokra nawierzchnia', description: 'Śliska podłoga/ulica - test ZRE lub upadek', effect: 'slow', severity: 1 },
  { id: '2', name: 'Tłum przechodniów', description: 'Gęsty tłum blokuje drogę', effect: 'obstacle', severity: 1 },
  { id: '3', name: 'Samochód wyjeżdża', description: 'Nagły samochód wymusza unik', effect: 'obstacle', severity: 2 },
  { id: '4', name: 'Zamknięta brama', description: 'Trzeba przeskoczyć lub obejść', effect: 'slow', severity: 2 },
  { id: '5', name: 'Sterta skrzynek', description: 'Można zrzucić za sobą jako przeszkodę', effect: 'advantage', severity: 1 },
  { id: '6', name: 'Ciemna alejka', description: 'Możliwość ukrycia się lub zasadzki', effect: 'advantage', severity: 2 },
  { id: '7', name: 'Budowa', description: 'Rusztowania - ryzykowny skrót lub okrążenie', effect: 'obstacle', severity: 3 },
  { id: '8', name: 'Psy stróżujące', description: 'Agresywne psy atakują spóźnionego', effect: 'damage', severity: 2 },
  { id: '9', name: 'Stromy dach', description: 'Niebezpieczna przeprawa nad ulicą', effect: 'obstacle', severity: 3 },
  { id: '10', name: 'Zawalenie się', description: 'Konstrukcja się wali - szybka reakcja!', effect: 'damage', severity: 4 },
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
      addLog(`⚠️ Komplikacja: ${comp.name}`);
      return comp;
    }
    return null;
  }, [addLog]);

  // Punkt decyzji
  const generateDecisionPoint = useCallback(() => {
    const types: ChaseDecisionPoint['type'][] = ['obstacle', 'hazard', 'choice', 'shortcut', 'hideout'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let description = '';
    let options: ChaseOption[] = [];
    
    switch (type) {
      case 'obstacle':
        description = 'Przed tobą wysoki mur!';
        options = [
          { id: '1', name: 'Przeskocz', skillRequired: 'Skok', difficulty: 50, successBonus: 2, failurePenalty: 1 },
          { id: '2', name: 'Obejdź', difficulty: 0, successBonus: 0, failurePenalty: 0 },
        ];
        break;
      case 'hazard':
        description = 'Nadjeżdża rozpędzony samochód!';
        options = [
          { id: '1', name: 'Przebiegaj!', skillRequired: 'Zręczność', difficulty: 60, successBonus: 1, failurePenalty: 3, riskDescription: 'Ryzyko obrażeń!' },
          { id: '2', name: 'Poczekaj', difficulty: 0, successBonus: -1, failurePenalty: 0 },
        ];
        break;
      case 'shortcut':
        description = 'Widzisz wąską alejkę - skrót?';
        options = [
          { id: '1', name: 'Skrót przez alejkę', skillRequired: 'Orientacja', difficulty: 40, successBonus: 3, failurePenalty: 2 },
          { id: '2', name: 'Trzymaj się głównej drogi', difficulty: 0, successBonus: 1, failurePenalty: 0 },
        ];
        break;
      case 'hideout':
        description = 'Otwarte drzwi do piwnicy!';
        options = [
          { id: '1', name: 'Ukryj się', skillRequired: 'Ukrywanie', difficulty: 55, successBonus: 5, failurePenalty: 0, riskDescription: 'Możesz zgubić pościg!' },
          { id: '2', name: 'Biegnij dalej', difficulty: 0, successBonus: 1, failurePenalty: 0 },
        ];
        break;
      default:
        description = 'Rozdroże - którą drogą?';
        options = [
          { id: '1', name: 'Lewo (wąska uliczka)', skillRequired: 'Szczęście', difficulty: 50, successBonus: 2, failurePenalty: 1 },
          { id: '2', name: 'Prosto (główna droga)', difficulty: 0, successBonus: 1, failurePenalty: 0 },
          { id: '3', name: 'Prawo (przez park)', skillRequired: 'Bieganie', difficulty: 45, successBonus: 2, failurePenalty: 1 },
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
  }, [player.position, addLog]);

  // Wykonaj test i przesuń
  const performChaseAction = useCallback((option: ChaseOption) => {
    let positionChange = option.successBonus;
    let message = '';
    
    if (option.difficulty > 0) {
      const roll = Math.floor(Math.random() * 100) + 1;
      const success = roll <= option.difficulty;
      
      if (success) {
        positionChange = option.successBonus;
        message = `✓ ${option.name}: Sukces! (${roll}/${option.difficulty}) +${option.successBonus} pól`;
      } else {
        positionChange = -option.failurePenalty;
        message = `✗ ${option.name}: Porażka! (${roll}/${option.difficulty}) -${option.failurePenalty} pól`;
      }
    } else {
      message = `→ ${option.name}: +${option.successBonus} pól`;
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
  }, [addLog]);

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
    
    addLog(`🔴 ${enemy.name} ${success ? 'przyspiesza' : 'zwalnia'} (+${move} pól)`);
    
    // Nowa runda
    setCurrentRound(prev => prev + 1);
    setIsPlayerTurn(true);
    
    // Szansa na punkt decyzji lub komplikację
    if (Math.random() < 0.5) {
      generateDecisionPoint();
    } else {
      generateComplication();
    }
  }, [enemy, addLog, generateDecisionPoint, generateComplication]);

  // Podstawowe akcje gracza
  const sprintAction = useCallback(() => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= player.con;
    
    if (success) {
      setPlayer(prev => ({ ...prev, position: prev.position + player.speed + 1 }));
      addLog(`🏃 Sprint: Sukces! (${roll}/${player.con}) +${player.speed + 1} pól`);
    } else {
      setPlayer(prev => ({ ...prev, position: prev.position + player.speed - 1, isExhausted: true }));
      addLog(`🏃 Sprint: Porażka! (${roll}/${player.con}) +${player.speed - 1} pól, WYCZERPANY`);
    }
    
    setTimeout(() => enemyTurn(), 500);
  }, [player, addLog, enemyTurn]);

  const normalRun = useCallback(() => {
    setPlayer(prev => ({ ...prev, position: prev.position + player.speed }));
    addLog(`🏃 Bieg: +${player.speed} pól`);
    setTimeout(() => enemyTurn(), 500);
  }, [player.speed, addLog, enemyTurn]);

  const tryToHide = useCallback(() => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= 40; // Bazowa szansa na ukrycie
    
    if (success) {
      setShowResult('escaped');
      addLog(`🙈 Ukrycie: Sukces! (${roll}/40) Uciekłeś!`);
    } else {
      addLog(`🙈 Ukrycie: Porażka! (${roll}/40) Zostałeś zauważony!`);
      setTimeout(() => enemyTurn(), 500);
    }
  }, [addLog, enemyTurn]);

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
              {showResult === 'escaped' ? 'UDAŁO SIĘ UCIEC!' : 'ZOSTAŁEŚ ZŁAPANY!'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {showResult === 'escaped' 
                ? 'Udało ci się zgubić pościg i znaleźć bezpieczne miejsce.'
                : 'Pościg dogonił cię. Musisz stawić czoła konsekwencjom.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => onChaseEnd(showResult)}>
                Kontynuuj
              </Button>
              {showResult === 'caught' && (
                <Button variant="destructive" onClick={() => onChaseEnd('fight')}>
                  ⚔️ Walcz!
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
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto border-amber-500/50 bg-gradient-to-br from-card to-amber-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              🏃 Pościg! 
              <Badge className="bg-amber-500">{currentRound} runda</Badge>
            </CardTitle>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          
          {/* Pasek napięcia */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-amber-400">⚡ Napięcie</span>
              <span className={tension < 30 ? 'text-red-400' : 'text-amber-400'}>{tension}%</span>
            </div>
            <Progress value={tension} className="h-2" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tor pościgu */}
          <div className="bg-black/30 p-4 rounded-lg">
            <div className="text-center mb-2 text-sm text-muted-foreground">
              Dystans: <span className={player.position - enemy.position > 2 ? 'text-green-400' : 'text-red-400'}>
                {player.position - enemy.position} pól
              </span>
              {player.position - enemy.position >= ESCAPE_DISTANCE - 1 && (
                <Badge className="ml-2 bg-green-500">Blisko ucieczki!</Badge>
              )}
              {player.position - enemy.position <= 1 && (
                <Badge className="ml-2 bg-red-500">Zaraz cię dogoni!</Badge>
              )}
            </div>
            {renderTrack()}
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>🏁 Start</span>
              <span>🚪 Ucieczka</span>
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
                  ⚠️ {complication.name}
                </h4>
                <p className="text-sm text-yellow-200 mt-1">{complication.description}</p>
                <Button 
                  onClick={() => {
                    setComplication(null);
                    // Zastosuj efekt komplikacji
                    if (complication.effect === 'slow') {
                      setPlayer(prev => ({ ...prev, position: prev.position - 1 }));
                      addLog(`Komplikacja spowolniła cię o 1 pole`);
                    }
                  }}
                  className="mt-2"
                >
                  Kontynuuj
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
                🏃 Biegnij (+{player.speed})
              </Button>
              <Button 
                onClick={sprintAction}
                className="bg-orange-600 hover:bg-orange-700"
                disabled={player.isExhausted}
              >
                💨 Sprint (KON)
              </Button>
              <Button 
                onClick={tryToHide}
                className="bg-purple-600 hover:bg-purple-700"
              >
                🙈 Ukryj się
              </Button>
            </div>
          )}

          {/* Log */}
          <div className="bg-black/30 rounded-lg p-3 max-h-32 overflow-y-auto">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">📜 Historia</h4>
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
