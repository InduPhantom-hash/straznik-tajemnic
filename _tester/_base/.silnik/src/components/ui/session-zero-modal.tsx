'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { Label } from './label';
import { Input } from './input';
import { HelpIcon } from './tooltip';
import { saveAISettings, loadAISettings, AISettings } from '@/lib/ai-settings';
import { AdventureContext } from '@/lib/adventures-data';

interface SessionZeroSettings {
  era: 'classic' | 'gaslight' | 'modern' | 'custom';
  eraCustom?: string;
  tone: 'purist' | 'pulp' | 'noir' | 'neutral';
  narrativeMode: 'full_rpg' | 'story_priority' | 'pure_narrative';
  difficulty: 'easy' | 'normal' | 'hard' | 'deadly';
  lines: string[]; // Tematy absolutnie zakazane
  veils: string[]; // Tematy do "fade to black"
  safetyWord: string;
  playerName: string;
  completed: boolean;
}

interface SessionZeroModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (settings: SessionZeroSettings) => void;
  adventureContext?: AdventureContext; // Opcjonalny kontekst przygody
}

const DEFAULT_LINES = ['Przemoc wobec dzieci', 'Przemoc seksualna'];

const DEFAULT_VEILS = [
  'Tortury (fade to black)',
  'Szczegółowe obrażenia ciała',
];

const DIFFICULTIES = [
  {
    id: 'easy',
    name: 'Łatwy',
    description:
      'Więcej podpowiedzi mechanicznych, łatwiejsze testy, AI naprowadza na rozwiązania',
    icon: '🌱',
  },
  {
    id: 'normal',
    name: 'Normalny',
    description:
      'Standardowe zasady CoC 7e, AI jest neutralny, porażki mają konsekwencje',
    icon: '⚖️',
  },
  {
    id: 'hard',
    name: 'Trudny',
    description:
      'Brak podpowiedzi, surowe konsekwencje, częstsze testy ze zwiększonymi progami',
    icon: '🔥',
  },
  {
    id: 'deadly',
    name: 'Morderczy',
    description:
      'Każdy błąd fatalny, minimalna narracyjna osłona, strata PŻ/PR bez ostrzeżenia',
    icon: '💀',
  },
];

// FEATURE:#18 - Tryb narracji: pełne RPG, priorytet fabuły, czysta narracja
const NARRATIVE_MODES = [
  {
    id: 'full_rpg',
    name: 'Pełne RPG',
    description:
      'Klasyczne mechaniki CoC 7e. Widoczne testy umiejętności, rzuty kośćmi, statystyki PŻ/PR/PM.',
    icon: '🎲',
    color: 'text-blue-400',
  },
  {
    id: 'story_priority',
    name: 'Priorytet Fabuły',
    description:
      'Gra paragrafowa. Mechaniki działają w tle - gracz nie widzi testów, AI decyduje przez narrację.',
    icon: '📖',
    color: 'text-purple-400',
  },
  {
    id: 'pure_narrative',
    name: 'Czysta Narracja',
    description:
      'Interaktywna fikcja BEZ mechanik. Brak rzutów, brak statystyk - tylko wybory i historia.',
    icon: '✨',
    color: 'text-emerald-400',
  },
];

export function SessionZeroModal({
  open,
  onClose,
  onComplete,
  adventureContext,
}: SessionZeroModalProps) {
  const [step, setStep] = useState(1);

  // Era sugerowana z przygody (ale gracz może ją zmienić)
  const suggestedEra = adventureContext?.era || 'classic';
  const suggestedTone = adventureContext?.tone || 'purist';

  const [settings, setSettings] = useState<SessionZeroSettings>({
    era: suggestedEra,
    tone: suggestedTone,
    narrativeMode: 'full_rpg',
    difficulty: adventureContext?.difficulty || 'normal',
    lines: [...DEFAULT_LINES],
    veils: [...DEFAULT_VEILS],
    // Krok "słowo bezpieczeństwa" usunięty z UI (decyzja produktowa).
    // Pusty string wyłącza instrukcję pauzy w prompcie (guard w
    // session-zero-instructions.ts: `if (sessionZero.safetyWord)`).
    safetyWord: '',
    playerName: '',
    completed: false,
  });
  const [newLine, setNewLine] = useState('');
  const [newVeil, setNewVeil] = useState('');

  // Załaduj wcześniej zapisane ustawienia. Gdy wybrano przygodę, jej
  // era/tone/difficulty mają PRIORYTET nad cache z poprzedniej gry - inaczej
  // gracz dostaje stary classic/purist mimo wyboru np. modern/pulp i musi
  // przestawiać ręcznie. Z cache zostają tylko user-specific: lines, veils,
  // safetyWord, playerName, narrativeMode.
  useEffect(() => {
    if (open) {
      // Zawsze zaczynamy od kroku 1. Wartości z poprzedniej sesji (lines, veils,
      // playerName, narrativeMode) są wstępnie wczytane jako domyślne, ale gracz
      // przechodzi kreator od początku i sam je potwierdza. Wcześniej modal po
      // ukończeniu skakał na krok 3 (podsumowanie) i NIE resetował kroku przy
      // ponownym otwarciu - przez co przy nowym wyborze przygody gracz lądował
      // od razu na kroku 3 z „wybranymi za niego" pierwszymi krokami.
      setStep(1);

      const aiSettings = loadAISettings();
      if (aiSettings.sessionZero) {
        // Fallback dla starszych zapisów bez narrativeMode
        const loaded = aiSettings.sessionZero as SessionZeroSettings & {
          playstyle?: string;
        };
        setSettings({
          ...loaded,
          // Nowa sesja: `completed` zaczyna od false, gracz musi domknąć kreator.
          completed: false,
          narrativeMode:
            loaded.narrativeMode ||
            (loaded.playstyle === 'storytelling'
              ? 'story_priority'
              : 'full_rpg'),
          ...(adventureContext
            ? {
                era: adventureContext.era,
                tone: adventureContext.tone ?? loaded.tone,
                difficulty: adventureContext.difficulty ?? loaded.difficulty,
              }
            : {}),
        });
      }
    }
  }, [open, adventureContext]);

  const handleComplete = () => {
    const completedSettings = { ...settings, completed: true };

    // Zapisz do AI Settings
    const aiSettings = loadAISettings();
    const updatedSettings: AISettings = {
      ...aiSettings,
      sessionZero: completedSettings,
    };
    saveAISettings(updatedSettings);

    onComplete(completedSettings);
    onClose();
  };

  const totalSteps = 2;

  const STEP_LABELS = ['Tryb i trudność', 'Linie i zasłony', 'Podsumowanie'];

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-8">
            {/* Nagłówek kroku */}
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                🎲 Krok 1 · Tryb narracji i trudność
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                Jak chcesz grać i jak wymagająca ma być przygoda? Ton i era
                wynikają z wybranej przygody.
              </p>
            </div>

            {/* Tryb narracji */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                Tryb narracji
                <HelpIcon content="Pełne RPG = widoczne mechaniki. Priorytet Fabuły = mechaniki w tle. Czysta Narracja = bez mechanik." />
              </Label>
              <div className="grid grid-cols-3 gap-4">
                {NARRATIVE_MODES.map((mode) => {
                  const isSelected = settings.narrativeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          narrativeMode:
                            mode.id as SessionZeroSettings['narrativeMode'],
                        })
                      }
                      className={`relative p-4 text-left transition-all ${
                        isSelected
                          ? 'border border-primary bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
                          : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-primary/60" />
                      )}
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-2xl">{mode.icon}</span>
                        <span className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-foreground">
                          {mode.name}
                        </span>
                      </div>
                      <p className="font-serif text-base italic text-muted-foreground">
                        {mode.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trudność */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                Poziom trudności
                <HelpIcon content="Wpływa na ilość wsparcia narracyjnego, surowość konsekwencji i częstość podpowiedzi." />
              </Label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {DIFFICULTIES.map((diff) => {
                  const isSelected = settings.difficulty === diff.id;
                  return (
                    <button
                      key={diff.id}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          difficulty:
                            diff.id as SessionZeroSettings['difficulty'],
                        })
                      }
                      className={`relative p-3 text-center transition-all ${
                        isSelected
                          ? 'border border-primary bg-[#0e1413] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
                          : 'border border-brass/28 bg-[#16130f] hover:border-brass/55'
                      }`}
                      title={diff.description}
                    >
                      <span className="mb-1 block text-xl">{diff.icon}</span>
                      <span className="block font-special-elite text-xs uppercase tracking-[0.1em] text-foreground">
                        {diff.name}
                      </span>
                      <span className="mt-1 block font-serif text-sm italic leading-snug text-muted-foreground">
                        {diff.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            {/* Nagłówek kroku */}
            <div>
              <div className="font-display text-xl font-semibold uppercase tracking-[0.1em] text-brass">
                🚫 Krok 2 · Linie i zasłony
              </div>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                Określ granice treści, których chcesz unikać przy stole. Te
                wybory stają się świętą umową ze Strażnikiem.
              </p>
            </div>

            {/* Wyjaśnienie */}
            <div className="relative border border-brass/30 bg-card p-5">
              <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
              <p className="mb-2 font-serif text-base italic text-muted-foreground">
                <strong className="font-special-elite text-xs uppercase tracking-[0.12em] not-italic text-destructive">
                  Linie
                </strong>{' '}
                - tematy absolutnie zakazane. Nigdy nie pojawią się w grze.
              </p>
              <p className="font-serif text-base italic text-muted-foreground">
                <strong className="font-special-elite text-xs uppercase tracking-[0.12em] not-italic text-brass">
                  Zasłony
                </strong>{' '}
                - tematy do „fade to black&rdquo;. Mogą wystąpić, ale bez
                szczegółów.
              </p>
            </div>

            {/* Linie */}
            <div className="relative space-y-3 border border-destructive/30 bg-card p-5">
              <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-destructive/45" />
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-destructive">
                🚫 Linie (tematy zakazane)
              </Label>
              <div className="flex flex-wrap gap-2">
                {settings.lines.map((line, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-2 border border-destructive/40 bg-destructive/10 px-3 py-1 font-special-elite text-xs uppercase tracking-[0.08em] text-destructive"
                  >
                    {line}
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          lines: settings.lines.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-base leading-none hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newLine}
                  onChange={(e) => setNewLine(e.target.value)}
                  placeholder="Dodaj temat zakazany..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newLine.trim()) {
                      setSettings({
                        ...settings,
                        lines: [...settings.lines, newLine.trim()],
                      });
                      setNewLine('');
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newLine.trim()) {
                      setSettings({
                        ...settings,
                        lines: [...settings.lines, newLine.trim()],
                      });
                      setNewLine('');
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  Dodaj
                </Button>
              </div>
            </div>

            {/* Zasłony */}
            <div className="relative space-y-3 border border-brass/30 bg-card p-5">
              <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
              <Label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                🌫️ Zasłony (fade to black)
              </Label>
              <div className="flex flex-wrap gap-2">
                {settings.veils.map((veil, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-2 border border-brass/40 bg-brass/10 px-3 py-1 font-special-elite text-xs uppercase tracking-[0.08em] text-brass"
                  >
                    {veil}
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          veils: settings.veils.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-base leading-none hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newVeil}
                  onChange={(e) => setNewVeil(e.target.value)}
                  placeholder="Dodaj temat do fade to black..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newVeil.trim()) {
                      setSettings({
                        ...settings,
                        veils: [...settings.veils, newVeil.trim()],
                      });
                      setNewVeil('');
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newVeil.trim()) {
                      setSettings({
                        ...settings,
                        veils: [...settings.veils, newVeil.trim()],
                      });
                      setNewVeil('');
                    }
                  }}
                  variant="outline"
                  size="sm"
                >
                  Dodaj
                </Button>
              </div>
            </div>

            {/* Wskazówka Strażnika */}
            <div className="flex items-center gap-3 border-l-2 border-primary/50 bg-primary/[0.06] px-4 py-3">
              <span className="text-primary">𓂀</span>
              <div className="font-serif text-base italic text-muted-foreground">
                Wskazówka Strażnika: granice ustalone teraz pozwalają opowieści
                sięgać głębiej, bez ryzyka, że ktoś przy stole poczuje się
                osaczony.
              </div>
            </div>
          </div>
        );

      case 3:
        // Podsumowanie
        return (
          <div className="space-y-8">
            {/* Nagłówek kroku */}
            <div className="text-center">
              <div className="font-special-elite text-xs uppercase tracking-[0.3em] text-primary">
                Pieczęć przyłożona
              </div>
              <h3 className="mt-1 font-display-decorative text-2xl font-black uppercase tracking-[0.12em] text-foreground">
                Sesja Zero ukończona
              </h3>
              <p className="mt-1 font-serif text-lg italic text-muted-foreground">
                Twoje ustawienia zostały zapisane - opowieść może się zacząć.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative border border-brass/30 bg-card p-5">
                <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
                <div className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                  Trudność
                </div>
                <p className="mt-2 font-display text-lg font-semibold uppercase tracking-[0.06em] text-foreground">
                  {DIFFICULTIES.find((d) => d.id === settings.difficulty)?.name}
                </p>
              </div>

              <div className="relative border border-brass/30 bg-card p-5">
                <span className="absolute left-2 top-2 h-3 w-3 border-l-[1.5px] border-t-[1.5px] border-brass/50" />
                <div className="font-special-elite text-xs uppercase tracking-[0.16em] text-brass">
                  Tryb narracji
                </div>
                <p className="mt-2 font-display text-lg font-semibold uppercase tracking-[0.06em] text-foreground">
                  {
                    NARRATIVE_MODES.find((m) => m.id === settings.narrativeMode)
                      ?.name
                  }
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-serif text-base italic text-muted-foreground">
                <strong className="font-special-elite text-xs uppercase tracking-[0.12em] not-italic text-destructive">
                  Linie:
                </strong>{' '}
                {settings.lines.length > 0 ? settings.lines.join(', ') : 'Brak'}
              </p>
              <p className="font-serif text-base italic text-muted-foreground">
                <strong className="font-special-elite text-xs uppercase tracking-[0.12em] not-italic text-brass">
                  Zasłony:
                </strong>{' '}
                {settings.veils.length > 0 ? settings.veils.join(', ') : 'Brak'}
              </p>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                Edytuj ustawienia
              </Button>
              <Button onClick={onClose}>Zamknij</Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="screen">
        <DialogHeader className="text-center sm:text-center">
          <div className="font-special-elite text-xs uppercase tracking-[0.3em] text-primary">
            Zanim opadnie pierwsza mgła
          </div>
          <DialogTitle className="mt-1 justify-center text-center font-display-decorative text-3xl font-black uppercase tracking-[0.12em] text-foreground">
            Sesja Zero
          </DialogTitle>
          <DialogDescription className="text-center font-serif text-base italic text-muted-foreground">
            Kalibracja gry przed rozpoczęciem przygody
          </DialogDescription>
        </DialogHeader>

        {/* Separator déco */}
        <div className="mt-3 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
          <span className="h-2 w-2 rotate-45 bg-brass" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
        </div>

        {/* Wskaźnik kroków déco */}
        <div className="mb-2 mt-5 flex items-center justify-between px-2">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={label} className="contents">
                {idx > 0 && (
                  <div
                    className={`mb-5 -mx-2 h-px flex-1 transition-colors ${
                      step > idx ? 'bg-primary' : 'bg-brass/25'
                    }`}
                  />
                )}
                <div className="flex w-36 flex-col items-center gap-2">
                  <div
                    className={`flex items-center justify-center font-display text-base transition-all ${
                      isActive
                        ? 'h-11 w-11 border border-primary bg-primary font-bold text-[#04110f] shadow-[0_0_18px_rgba(13,148,136,0.5)]'
                        : isDone
                          ? 'h-10 w-10 border border-primary bg-primary/12 text-primary'
                          : 'h-10 w-10 border border-brass/40 text-muted-foreground'
                    }`}
                  >
                    {isDone ? '✓' : stepNum}
                  </div>
                  <div
                    className={`text-center font-special-elite text-xs uppercase tracking-[0.08em] ${
                      isActive
                        ? 'text-primary'
                        : isDone
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/60'
                    }`}
                  >
                    {label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {renderStep()}

        {/* Navigation */}
        {step <= totalSteps && (
          <div className="mt-8 flex items-center justify-between border-t border-brass/20 pt-6">
            <Button
              variant="outline"
              onClick={() => (step > 1 ? setStep(step - 1) : onClose())}
            >
              {step === 1 ? '‹ Anuluj' : '‹ Wstecz'}
            </Button>

            <div className="font-special-elite text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Krok {step} z {totalSteps}
            </div>

            <Button
              onClick={() => {
                if (step < totalSteps) {
                  setStep(step + 1);
                } else {
                  handleComplete();
                }
              }}
            >
              {step === totalSteps ? 'Zakończ i zapisz ›' : 'Dalej ›'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { SessionZeroSettings };
