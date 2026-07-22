'use client';

import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Compass, Sparkles, User, BookOpen, ArrowRight } from 'lucide-react';
import { BUILT_IN_ADVENTURES } from '@/lib/adventures-data';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

interface StepWelcomeGMProps {
  onQuickStart: (adventureId: string, characterId: string) => void;
  onManualStart: () => void;
}

export function StepWelcomeGM({ onQuickStart, onManualStart }: StepWelcomeGMProps) {
  const [selectedAdventureId, setSelectedAdventureId] = useState<string>(
    BUILT_IN_ADVENTURES[0]?.id || 'cien-nad-prabutami'
  );
  
  // Domyślna postać męska / żeńska z predefinowanych
  const defaultMaleChar = PREDEFINED_CHARACTERS.find((c) => c.gender === 'male') || PREDEFINED_CHARACTERS[0];
  const defaultFemaleChar = PREDEFINED_CHARACTERS.find((c) => c.gender === 'female') || PREDEFINED_CHARACTERS[1];

  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(
    defaultMaleChar?.id || ''
  );
  const [mode, setMode] = useState<'quick' | 'manual'>('quick');

  return (
    <div className="space-y-5">
      {/* Intro MG */}
      <div className="p-4 rounded-lg bg-[#14100c] border border-brass/40 shadow-inner">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-full bg-brass/10 border border-brass/30 shrink-0 text-brass">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display uppercase tracking-[0.1em] text-brass text-base font-semibold">
              Witaj w Strażniku Tajemnic
            </h3>
            <p className="text-xs text-muted-foreground mt-1 italic">
              &bdquo;Nie jest umarłym ten, który spoczywa wiekami, nawet śmierć może umrzeć z dziwnymi eonami.&rdquo;
            </p>
            <p className="text-xs text-foreground/90 mt-2 leading-relaxed">
              Jestem Twoim Wirtualnym Mistrzem Gry. Poprowadzę Cię przez mroczne zakamarki Lovecraftowskiego horroru, rozliczę rzuty kośćmi Call of Cthulhu 7e i wymaluję przed Tobą świat obłędu i tajemnic.
            </p>
          </div>
        </div>
      </div>

      {/* Wybór trybu startu */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            mode === 'quick'
              ? 'bg-brass/15 border-brass text-foreground shadow-[0_0_15px_rgba(212,175,55,0.2)]'
              : 'bg-card/40 border-border text-muted-foreground hover:border-brass/40'
          }`}
        >
          <div className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-brass mb-1">
            <Sparkles className="w-4 h-4" />
            Szybki Start (Quick Setup)
          </div>
          <p className="text-xs">
            Wybierz predefiniowaną polską przygodę i gotową postać Badacza.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`p-3.5 rounded-lg border text-left transition-all ${
            mode === 'manual'
              ? 'bg-brass/15 border-brass text-foreground shadow-[0_0_15px_rgba(212,175,55,0.2)]'
              : 'bg-card/40 border-border text-muted-foreground hover:border-brass/40'
          }`}
        >
          <div className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-brass mb-1">
            <Compass className="w-4 h-4" />
            Pełne Menu (Manual Setup)
          </div>
          <p className="text-xs">
            Przejdź do głównego menu, aby szczegółowo wygenerować nową postać i scenariusz.
          </p>
        </button>
      </div>

      {mode === 'quick' ? (
        <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
          {/* Wybór scenariusza */}
          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-brass mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              1. Wybierz scenariusz
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {BUILT_IN_ADVENTURES.map((adv) => (
                <div
                  key={adv.id}
                  onClick={() => setSelectedAdventureId(adv.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-all flex items-start justify-between ${
                    selectedAdventureId === adv.id
                      ? 'bg-brass/10 border-brass text-foreground'
                      : 'bg-card/20 border-border/60 hover:border-brass/30 text-muted-foreground'
                  }`}
                >
                  <div>
                    <div className="font-display text-xs uppercase tracking-wide text-brass font-medium">
                      {adv.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {adv.description}
                    </div>
                  </div>
                  <div className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/40 border border-brass/20 text-brass shrink-0 ml-2">
                    {adv.eraLabel || adv.era}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wybór postaci */}
          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-brass mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              2. Wybierz postać Badacza
            </label>
            <div className="grid grid-cols-2 gap-2">
              {defaultMaleChar && (
                <button
                  type="button"
                  onClick={() => setSelectedCharacterId(defaultMaleChar.id)}
                  className={`p-2.5 rounded border text-xs font-medium text-left transition-all ${
                    selectedCharacterId === defaultMaleChar.id
                      ? 'bg-brass/20 border-brass text-brass'
                      : 'bg-card/20 border-border text-muted-foreground hover:border-brass/30'
                  }`}
                >
                  👨 {defaultMaleChar.name} ({defaultMaleChar.occupation})
                </button>
              )}
              {defaultFemaleChar && (
                <button
                  type="button"
                  onClick={() => setSelectedCharacterId(defaultFemaleChar.id)}
                  className={`p-2.5 rounded border text-xs font-medium text-left transition-all ${
                    selectedCharacterId === defaultFemaleChar.id
                      ? 'bg-brass/20 border-brass text-brass'
                      : 'bg-card/20 border-border text-muted-foreground hover:border-brass/30'
                  }`}
                >
                  👩 {defaultFemaleChar.name} ({defaultFemaleChar.occupation})
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button
              className="bg-brass text-black hover:bg-brass/90 font-display uppercase tracking-wider text-xs px-6"
              onClick={() => onQuickStart(selectedAdventureId, selectedCharacterId)}
            >
              Rozpocznij przygodę
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
          <Card className="bg-[#14100c] border border-brass/30">
            <CardContent className="py-4 px-4 text-xs text-muted-foreground space-y-2">
              <p>
                Wybierając Pełne Menu uzyskasz pełny dostęp do podglądu postaci, wgrywania własnych scenariuszy PDF oraz edycji parametrów silnika.
              </p>
            </CardContent>
          </Card>
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              className="border-brass/50 text-brass hover:bg-brass/10 font-display uppercase tracking-wider text-xs px-6"
              onClick={onManualStart}
            >
              Przejdź do aplikacji
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
