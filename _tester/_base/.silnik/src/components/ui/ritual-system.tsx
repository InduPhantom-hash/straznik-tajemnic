"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Progress } from './progress';

// === TYPY ===

export interface Ritual {
  id: string;
  name: string;
  source: string; // Księga, z której pochodzi
  type: 'summon' | 'banish' | 'contact' | 'enchant' | 'gate' | 'other';
  
  // Koszty
  mpCost: number;
  sanCost: number;
  hpCost?: number;
  lifespanCost?: number; // Lata życia (np. dla Gate)
  
  // Czas
  castingTimeHours: number;
  studyTimeDays: number; // Czas nauki z księgi
  
  // Efekty
  description: string;
  effect: string;
  sideEffects: RitualSideEffect[];
  difficulty: number; // Wartość docelowa testu POW
}

export interface RitualSideEffect {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-100
  severity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
}

export interface MythosBook {
  id: string;
  name: string;
  language: string;
  author?: string;
  
  // Statystyki
  cthulhuMythos: number; // Ile dodaje do umiejętności
  sanLoss: string; // np. "1d6/2d6"
  studyTimeWeeks: number;
  
  // Zawartość
  spells: string[];
  rituals: string[];
  
  // Status
  isStudied: boolean;
  studyProgress: number; // 0-100
}

// === TABELA EFEKTÓW UBOCZNYCH ===

const SIDE_EFFECTS: RitualSideEffect[] = [
  { id: '1', name: 'Mroczna wizja', description: 'Widzisz rzeczy, których nie powinno się oglądać', probability: 30, severity: 'minor' },
  { id: '2', name: 'Echo z otchłani', description: 'Słyszysz głosy przez kolejne 1d6 godzin', probability: 25, severity: 'minor' },
  { id: '3', name: 'Magiczne piętno', description: 'Na twoim ciele pojawia się dziwny znak', probability: 20, severity: 'moderate' },
  { id: '4', name: 'Przyciągnięcie uwagi', description: 'Coś z zewnątrz zaczyna cię obserwować', probability: 15, severity: 'moderate' },
  { id: '5', name: 'Tymczasowe szaleństwo', description: 'Epizod fobii powiązanej z rytuałem', probability: 20, severity: 'moderate' },
  { id: '6', name: 'Niechciany gość', description: 'Rytuał przyciąga coś niepożądanego', probability: 10, severity: 'severe' },
  { id: '7', name: 'Utrata wspomnień', description: 'Tracisz 1d6 godzin wspomnień', probability: 10, severity: 'severe' },
  { id: '8', name: 'Fizyczna deformacja', description: 'Drobna, ale permanentna zmiana wyglądu', probability: 5, severity: 'severe' },
  { id: '9', name: 'Przeklęty przedmiot', description: 'Najbliższy przedmiot staje się nawiedzony', probability: 5, severity: 'moderate' },
  { id: '10', name: 'Katastrofalne niepowodzenie', description: 'Rytuał przyzywa coś znacznie gorszego', probability: 2, severity: 'catastrophic' },
];

// Pełna lista rytuałów i zaklęć z podręcznika CoC 7e
const SAMPLE_RITUALS: Ritual[] = [
  // === ZAKLĘCIA OCHRONNE ===
  {
    id: 'elder-sign',
    name: 'Znak Starszych',
    source: 'Necronomicon',
    type: 'enchant',
    mpCost: 10,
    sanCost: 2,
    castingTimeHours: 1,
    studyTimeDays: 14,
    description: 'Tworzy ochronny symbol odpychający istoty Mitów',
    effect: 'Stworzony znak odpycha byty Mitów i uniemożliwia im przejście przez chroniony próg',
    sideEffects: SIDE_EFFECTS.slice(0, 3),
    difficulty: 50
  },
  {
    id: 'powder-of-ibn-ghazi',
    name: 'Proszek Ibn-Ghazi',
    source: 'Necronomicon',
    type: 'enchant',
    mpCost: 4,
    sanCost: 1,
    castingTimeHours: 0.5,
    studyTimeDays: 7,
    description: 'Uwidacznia niewidzialne istoty Mitów na 1d6 rund',
    effect: 'Posypany proszkiem niewidzialny byt staje się widoczny. Działa na Gwiezdne Wampiry, Latające Polipy i inne',
    sideEffects: SIDE_EFFECTS.slice(0, 2),
    difficulty: 30
  },
  {
    id: 'voorish-sign',
    name: 'Voorski Znak',
    source: 'Unaussprechlichen Kulten',
    type: 'enchant',
    mpCost: 2,
    sanCost: 0,
    castingTimeHours: 0.1,
    studyTimeDays: 3,
    description: 'Gest rękami wzmacniający inne zaklęcia i odpychający słabsze byty',
    effect: 'Daje +5% do testu następnego zaklęcia. Słabsze istoty (POW < 30) muszą zdać test POW lub uciec',
    sideEffects: [],
    difficulty: 20
  },

  // === ZAKLĘCIA KONTAKTU ===
  {
    id: 'contact-deep-ones',
    name: 'Kontakt z Głębinowymi',
    source: 'Kultyckie zapiski z Innsmouth',
    type: 'contact',
    mpCost: 8,
    sanCost: 3,
    castingTimeHours: 2,
    studyTimeDays: 7,
    description: 'Ustanawia mentalny kontakt z Głębinowymi',
    effect: 'Pozwala na komunikację telepatyczną z pobliskimi Głębinowymi w promieniu 1 km',
    sideEffects: SIDE_EFFECTS.slice(2, 6),
    difficulty: 40
  },
  {
    id: 'contact-ghoul',
    name: 'Kontakt z Ghulem',
    source: 'Cultes des Goules',
    type: 'contact',
    mpCost: 6,
    sanCost: 2,
    castingTimeHours: 1,
    studyTimeDays: 5,
    description: 'Przyzywa najbliższego ghula do negocjacji',
    effect: 'Ghul pojawia się w ciągu 1d6 godzin i jest skłonny do rozmowy (nie do posłuszeństwa)',
    sideEffects: SIDE_EFFECTS.slice(0, 4),
    difficulty: 35
  },
  {
    id: 'contact-mi-go',
    name: 'Kontakt z Mi-Go',
    source: 'Pnakotyckie Manuskrypty',
    type: 'contact',
    mpCost: 10,
    sanCost: 4,
    castingTimeHours: 3,
    studyTimeDays: 14,
    description: 'Wysyła sygnał do najbliższych Mi-Go',
    effect: 'Mi-Go przybędzie w ciągu 1d3 dni, jeśli są w pobliżu. Skłonne do wymiany — ale za jaką cenę?',
    sideEffects: SIDE_EFFECTS.slice(2, 7),
    difficulty: 55
  },
  {
    id: 'contact-nyarlathotep',
    name: 'Kontakt z Nyarlathotepem',
    source: 'Necronomicon',
    type: 'contact',
    mpCost: 20,
    sanCost: 8,
    hpCost: 3,
    castingTimeHours: 6,
    studyTimeDays: 42,
    description: 'Przyzywa awatar Pełzającego Chaosu',
    effect: 'Nyarlathotep pojawia się w jednym ze swoich awatarów. Może udzielić wiedzy — ale zawsze za cenę',
    sideEffects: SIDE_EFFECTS.slice(4, 10),
    difficulty: 75
  },

  // === ZAKLĘCIA PRZYZWANIA ===
  {
    id: 'summon-byakhee',
    name: 'Przyzwanie Byakhee',
    source: 'Unaussprechlichen Kulten',
    type: 'summon',
    mpCost: 15,
    sanCost: 5,
    hpCost: 2,
    castingTimeHours: 4,
    studyTimeDays: 21,
    description: 'Przyzywa międzywymiarową bestię służącą jako wierzchowiec',
    effect: 'Sprowadza Byakhee, które może przenosić przez kosmiczną pustkę. Wymaga Hali\'s Wine do kontroli',
    sideEffects: SIDE_EFFECTS.slice(3, 8),
    difficulty: 60
  },
  {
    id: 'summon-hunting-horror',
    name: 'Przyzwanie Łowczego Horroru',
    source: 'De Vermis Mysteriis',
    type: 'summon',
    mpCost: 18,
    sanCost: 6,
    hpCost: 3,
    castingTimeHours: 5,
    studyTimeDays: 28,
    description: 'Przyzywa wężowate stworzenie Nyarlathotepa — niebezpieczne do kontrolowania',
    effect: 'Łowczy Horror pojawia się i wykonuje jedno zadanie. Test POW vs POW istoty — porażka = obraca się przeciw przyzywającemu',
    sideEffects: SIDE_EFFECTS.slice(4, 10),
    difficulty: 70
  },
  {
    id: 'summon-dark-young',
    name: 'Przyzwanie Ciemnych Młodych',
    source: 'Necronomicon',
    type: 'summon',
    mpCost: 25,
    sanCost: 8,
    hpCost: 5,
    castingTimeHours: 6,
    studyTimeDays: 35,
    description: 'Przyzywa potomstwo Shub-Niggurath. Wymaga lasu i ofiary krwi',
    effect: 'Ciemne Młode pojawia się w lesie. Wymaga ofiary (zwierzę lub człowiek) do utrzymania kontroli',
    sideEffects: SIDE_EFFECTS.slice(5, 10),
    difficulty: 75
  },
  {
    id: 'summon-dimensional-shambler',
    name: 'Shambler z Gwiazd',
    source: 'De Vermis Mysteriis',
    type: 'summon',
    mpCost: 12,
    sanCost: 4,
    castingTimeHours: 1,
    studyTimeDays: 14,
    description: 'Przyzywa Wymiarowego Włóczęgę — niebezpieczne, istota jest nieprzewidywalna',
    effect: 'Wymiarowy Włóczęga pojawia się i może porwać wskazany cel do innego wymiaru. Kontrola wymaga testu POW',
    sideEffects: SIDE_EFFECTS.slice(3, 9),
    difficulty: 55
  },

  // === ZAKLĘCIA ODPĘDZANIA ===
  {
    id: 'banish-deep-ones',
    name: 'Odpędzenie Głębinowych',
    source: 'Spis Rytuałów Morskich',
    type: 'banish',
    mpCost: 12,
    sanCost: 2,
    castingTimeHours: 0.5,
    studyTimeDays: 7,
    description: 'Odpędza Głębinowych z powrotem do morza',
    effect: 'Głębinowe w promieniu 30m muszą zdać test POW lub uciec do wody. Działa na 1d6 godzin',
    sideEffects: SIDE_EFFECTS.slice(0, 3),
    difficulty: 45
  },
  {
    id: 'dismiss-entity',
    name: 'Odprawienie Bytu',
    source: 'Necronomicon',
    type: 'banish',
    mpCost: 15,
    sanCost: 4,
    castingTimeHours: 1,
    studyTimeDays: 21,
    description: 'Uniwersalne zaklęcie odprawienia — działa na większość przyzwanych istot',
    effect: 'Przyzwana istota musi zdać test POW vs POW rzucającego + wydane MP. Porażka = odesłanie',
    sideEffects: SIDE_EFFECTS.slice(1, 5),
    difficulty: 55
  },

  // === ZAKLĘCIA BRAMY ===
  {
    id: 'gate',
    name: 'Brama',
    source: 'Necronomicon',
    type: 'gate',
    mpCost: 20,
    sanCost: 10,
    lifespanCost: 2,
    castingTimeHours: 8,
    studyTimeDays: 60,
    description: 'Otwiera przejście do innego miejsca lub wymiaru',
    effect: 'Tworzy portal prowadzący do określonego miejsca. Brama jest dwukierunkowa i trwa 1d6 rund',
    sideEffects: SIDE_EFFECTS.slice(5, 10),
    difficulty: 80
  },
  {
    id: 'create-gate-box',
    name: 'Srebrna Brama (Gate Box)',
    source: 'De Vermis Mysteriis',
    type: 'gate',
    mpCost: 30,
    sanCost: 15,
    lifespanCost: 5,
    hpCost: 5,
    castingTimeHours: 24,
    studyTimeDays: 90,
    description: 'Tworzy permanentny artefakt bramowy — srebrną szkatułkę otwierającą bramy',
    effect: 'Szkatułka pozwala otwierać bramy bez dalszych kosztów SAN. Koszt MP = 5 za użycie',
    sideEffects: SIDE_EFFECTS.slice(6, 10),
    difficulty: 90
  },

  // === INNE ZAKLĘCIA ===
  {
    id: 'body-warping',
    name: 'Zniekształcenie Ciała (Body Warping of Gorgoroth)',
    source: 'Revelations of Glaaki',
    type: 'other',
    mpCost: 8,
    sanCost: 3,
    castingTimeHours: 1,
    studyTimeDays: 14,
    description: 'Deformuje ciało ofiary — ból i utrata sprawności',
    effect: 'Ofiara traci 1d6 STR, 1d6 CON i 1d6 APP. Leczenie wymaga zaklęcia odwrotnego lub miesiąca rekonwalescencji',
    sideEffects: SIDE_EFFECTS.slice(2, 6),
    difficulty: 50
  },
  {
    id: 'flesh-ward',
    name: 'Ochrona Ciała (Flesh Ward)',
    source: 'Liber Ivonis',
    type: 'enchant',
    mpCost: 6,
    sanCost: 1,
    castingTimeHours: 0.5,
    studyTimeDays: 7,
    description: 'Wzmacnia ciało rzucającego — chwilowa odporność na obrażenia',
    effect: 'Daje 6 punktów pancerza na 1d6+1 rund. Nie kumuluje się z naturalnym pancerzem',
    sideEffects: SIDE_EFFECTS.slice(0, 2),
    difficulty: 35
  },
  {
    id: 'dominate',
    name: 'Dominacja',
    source: 'De Vermis Mysteriis',
    type: 'enchant',
    mpCost: 10,
    sanCost: 4,
    castingTimeHours: 0.1,
    studyTimeDays: 21,
    description: 'Przejmuje kontrolę nad umysłem jednej osoby',
    effect: 'Test POW vs POW ofiary. Sukces = ofiara wykonuje jedno polecenie, potem jest zdezorientowana na 1d6 rund',
    sideEffects: SIDE_EFFECTS.slice(3, 7),
    difficulty: 60
  },
  {
    id: 'create-zombie',
    name: 'Stworzenie Zombie',
    source: 'Cultes des Goules',
    type: 'enchant',
    mpCost: 14,
    sanCost: 6,
    hpCost: 4,
    castingTimeHours: 12,
    studyTimeDays: 28,
    description: 'Reanimuje świeże zwłoki jako posłusznego zombie',
    effect: 'Zwłoki powstają jako zombie: STR+50, CON+50, INT 10, brak własnej woli. Trwa do zniszczenia lub odwołania',
    sideEffects: SIDE_EFFECTS.slice(4, 9),
    difficulty: 65
  },
  {
    id: 'dread-curse-of-azathoth',
    name: 'Straszliwe Przekleństwo Azathotha',
    source: 'Necronomicon',
    type: 'other',
    mpCost: 16,
    sanCost: 8,
    hpCost: 6,
    castingTimeHours: 3,
    studyTimeDays: 42,
    description: 'Najpotężniejsze znane zaklęcie destrukcyjne — sprowadza kosmiczną energię na cel',
    effect: 'Zadaje 1d100 obrażeń celowi (test POW). Trafiony cel jest także spalony kosmicznym ogniem',
    sideEffects: SIDE_EFFECTS.slice(5, 10),
    difficulty: 85
  },
  {
    id: 'command-ghost',
    name: 'Rozkaz Duchowi',
    source: 'Liber Ivonis',
    type: 'enchant',
    mpCost: 6,
    sanCost: 3,
    castingTimeHours: 1,
    studyTimeDays: 10,
    description: 'Pozwala komunikować się z duchem i wydać mu jedno polecenie',
    effect: 'Duch musi zdać test POW vs POW rzucającego. Porażka = wykonuje jedno polecenie. Sukces = duch atakuje rzucającego',
    sideEffects: SIDE_EFFECTS.slice(1, 5),
    difficulty: 45
  },
  {
    id: 'resurrection',
    name: 'Wskrzeszenie',
    source: 'Necronomicon / De Vermis Mysteriis',
    type: 'other',
    mpCost: 30,
    sanCost: 20,
    hpCost: 10,
    lifespanCost: 5,
    castingTimeHours: 24,
    studyTimeDays: 120,
    description: 'Przywraca życie zmarłemu — ciało musi być w miarę kompletne',
    effect: 'Wskrzeszony traci 1d20 SAN permanentnie i zyskuje 1d10 Cthulhu Mythos. Osobowość może być zmieniona',
    sideEffects: SIDE_EFFECTS.slice(5, 10),
    difficulty: 95
  },
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
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [castingProgress, setCastingProgress] = useState(0);
  const [castingTimer, setCastingTimer] = useState<NodeJS.Timeout | null>(null);
  const [result, setResult] = useState<{ success: boolean; roll: number; sideEffects: RitualSideEffect[] } | null>(null);

  // Czyszczenie timera
  useEffect(() => {
    return () => {
      if (castingTimer) clearInterval(castingTimer);
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
    
    // Symulacja czasu rzucania (przyspieszony dla UI)
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
    
    // Sprawdź efekty uboczne
    const triggeredEffects: RitualSideEffect[] = [];
    for (const effect of ritual.sideEffects) {
      if (Math.random() * 100 < effect.probability) {
        triggeredEffects.push(effect);
      }
    }
    
    // Przy fumble - zawsze efekt uboczny
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
      case 'summon': return '👹';
      case 'banish': return '🚫';
      case 'contact': return '📡';
      case 'enchant': return '✨';
      case 'gate': return '🌀';
      default: return '🔮';
    }
  };

  const getSeverityColor = (severity: RitualSideEffect['severity']) => {
    switch (severity) {
      case 'minor': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'moderate': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'severe': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'catastrophic': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-950 to-indigo-950 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2 text-purple-300">
              🔮 Odprawianie Rytuałów
            </CardTitle>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          
          {/* Statusy gracza */}
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-purple-400">PM:</span>
              <span className={getCostColor(playerMP, selectedRitual?.mpCost || 0)}>{playerMP}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">PR:</span>
              <span className={getCostColor(playerSAN, selectedRitual?.sanCost || 0)}>{playerSAN}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">PŻ:</span>
              <span className={getCostColor(playerHP, selectedRitual?.hpCost || 0)}>{playerHP}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">MOC:</span>
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
                  Odprawianie: {selectedRitual.name}
                </h3>
                <Progress value={castingProgress} className="h-3 mb-4" />
                <p className="text-sm text-purple-400 mb-4">
                  {castingProgress < 30 && "Przygotowujesz składniki rytuału..."}
                  {castingProgress >= 30 && castingProgress < 60 && "Recytujesz starożytne formuły..."}
                  {castingProgress >= 60 && castingProgress < 90 && "Energia magiczna narasta..."}
                  {castingProgress >= 90 && "Rytuał osiąga punkt kulminacyjny!"}
                </p>
                <Button onClick={cancelCasting} variant="destructive">
                  ✕ Przerwij rytuał
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
                    {result.success ? 'RYTUAŁ UDANY!' : 'RYTUAŁ NIE POWIÓDŁ SIĘ'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Rzut: {result.roll} / {selectedRitual.difficulty}
                  </p>
                </div>
                
                {result.sideEffects.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-orange-400 mb-2">⚠️ Efekty uboczne:</h4>
                    <div className="space-y-2">
                      {result.sideEffects.map(effect => (
                        <div key={effect.id} className={`p-2 rounded border ${getSeverityColor(effect.severity)}`}>
                          <div className="font-semibold">{effect.name}</div>
                          <div className="text-sm opacity-80">{effect.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button onClick={() => { setResult(null); setSelectedRitual(null); }} className="w-full mt-4">
                  Kontynuuj
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
                          {getTypeIcon(ritual.type)} {ritual.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">Źródło: {ritual.source}</p>
                      </div>
                      <Badge className="bg-purple-500/30 text-purple-300">
                        {ritual.difficulty}%
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ritual.description}</p>
                    
                    {/* Koszty */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge className={`${playerMP >= ritual.mpCost ? 'bg-purple-500/30' : 'bg-red-500/30'}`}>
                        PM: {ritual.mpCost}
                      </Badge>
                      <Badge className={`${playerSAN >= ritual.sanCost ? 'bg-blue-500/30' : 'bg-red-500/30'}`}>
                        PR: {ritual.sanCost}
                      </Badge>
                      {ritual.hpCost && (
                        <Badge className={`${playerHP > ritual.hpCost ? 'bg-red-500/30' : 'bg-orange-500/30'}`}>
                          PŻ: {ritual.hpCost}
                        </Badge>
                      )}
                      {ritual.lifespanCost && (
                        <Badge className="bg-yellow-500/30">
                          Lata życia: {ritual.lifespanCost}
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

          {/* Szczegóły wybranego rytuału */}
          {selectedRitual && !isCasting && !result && (
            <Card className="border-purple-500/30 bg-purple-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-purple-300">
                  {getTypeIcon(selectedRitual.type)} {selectedRitual.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-foreground">{selectedRitual.effect}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Czas rzucania:</span>
                    <span className="text-purple-300 ml-2">{selectedRitual.castingTimeHours} godzin</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Czas nauki:</span>
                    <span className="text-purple-300 ml-2">{selectedRitual.studyTimeDays} dni</span>
                  </div>
                </div>
                
                {/* Ostrzeżenie o efektach ubocznych */}
                {selectedRitual.sideEffects.length > 0 && (
                  <div className="p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                    <h5 className="text-sm font-semibold text-orange-400 mb-1">⚠️ Możliwe efekty uboczne:</h5>
                    <p className="text-xs text-orange-300">
                      {selectedRitual.sideEffects.length} znanych komplikacji, w tym: &nbsp;
                      {selectedRitual.sideEffects.slice(0, 2).map(e => e.name).join(', ')}...
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={() => startCasting(selectedRitual)}
                  disabled={!canCast(selectedRitual)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {canCast(selectedRitual) ? '🔮 Rozpocznij rytuał' : '❌ Niewystarczające zasoby'}
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// === KSIĘGI MITÓW ===

interface MythosBookStudyProps {
  book: MythosBook;
  playerSAN: number;
  onStudyComplete: (cthulhuMythosGain: number, sanLoss: number, learnedSpells: string[]) => void;
  onStudyProgress: (progress: number) => void;
}

export function MythosBookStudy({ book, playerSAN, onStudyComplete, onStudyProgress }: MythosBookStudyProps) {
  const [isStudying, setIsStudying] = useState(false);
  const [progress, setProgress] = useState(book.studyProgress);
  
  const studySession = useCallback(() => {
    setIsStudying(true);
    
    // Jedna "sesja" studiowania = 10% postępu
    setTimeout(() => {
      const newProgress = Math.min(100, progress + 10);
      setProgress(newProgress);
      onStudyProgress(newProgress);
      setIsStudying(false);
      
      if (newProgress >= 100) {
        // Zakończono studiowanie
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
            <p className="text-xs text-amber-500">{book.language} • {book.author || 'Autor nieznany'}</p>
          </div>
        </div>
        
        <div className="space-y-2 text-sm mb-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wiedza Tajemna:</span>
            <span className="text-purple-400">+{book.cthulhuMythos}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Strata PR:</span>
            <span className="text-red-400">{book.sanLoss}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Czas studiowania:</span>
            <span className="text-foreground">{book.studyTimeWeeks} tygodni</span>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Postęp</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <Button 
          onClick={studySession}
          disabled={isStudying || progress >= 100}
          className="w-full bg-amber-700 hover:bg-amber-600"
        >
          {isStudying ? '📖 Studiujesz...' : progress >= 100 ? '✓ Przeczytano' : '📖 Studiuj (+10%)'}
        </Button>
      </CardContent>
    </Card>
  );
}

export { SAMPLE_RITUALS, SIDE_EFFECTS };
export default RitualInterface;
