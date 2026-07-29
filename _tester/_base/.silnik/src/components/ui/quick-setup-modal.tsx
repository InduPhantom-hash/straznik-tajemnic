'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { Compass, Sparkles, User, BookOpen, ArrowRight, Users } from 'lucide-react';
import { BUILT_IN_ADVENTURES } from '@/lib/adventures-data';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

interface QuickSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickStart: (adventureId: string, characterId: string, mode: 'solo' | 'hot-seat') => void;
}

export function QuickSetupModal({ open, onOpenChange, onQuickStart }: QuickSetupModalProps) {
  const [selectedAdventureId, setSelectedAdventureId] = useState<string>(
    BUILT_IN_ADVENTURES[0]?.id || 'cien-nad-prabutami'
  );
  
  const defaultMaleChar = PREDEFINED_CHARACTERS.find((c) => c.gender === 'male') || PREDEFINED_CHARACTERS[0];
  const defaultFemaleChar = PREDEFINED_CHARACTERS.find((c) => c.gender === 'female') || PREDEFINED_CHARACTERS[1];

  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(
    defaultMaleChar?.id || ''
  );
  const [playMode, setPlayMode] = useState<'solo' | 'hot-seat'>('solo');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0c0d0a] border border-brass/40 shadow-[0_0_30px_rgba(0,0,0,0.55)] deco-corners max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-[0.12em] text-foreground text-xl">
            <Sparkles className="w-5 h-5 text-brass" />
            Szybka Przygoda
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Skonfiguruj sesję wybierając z gotowych szablonów. Wirtualny Mistrz Gry automatycznie przygotuje grę.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Wybór trybu */}
          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-brass mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              1. Wybierz tryb gry
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlayMode('solo')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                  playMode === 'solo'
                    ? 'bg-brass/15 border-brass text-foreground shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                    : 'bg-card/40 border-border text-muted-foreground hover:border-brass/40'
                }`}
              >
                <User className="w-5 h-5 text-brass shrink-0" />
                <div>
                  <div className="font-display text-xs uppercase tracking-wider font-medium">Tryb Solo</div>
                  <div className="text-[10px] mt-0.5 opacity-80">Jeden gracz, jedna postać</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlayMode('hot-seat')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                  playMode === 'hot-seat'
                    ? 'bg-brass/15 border-brass text-foreground shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                    : 'bg-card/40 border-border text-muted-foreground hover:border-brass/40'
                }`}
              >
                <Users className="w-5 h-5 text-brass shrink-0" />
                <div>
                  <div className="font-display text-xs uppercase tracking-wider font-medium">Hot Seat (Duet)</div>
                  <div className="text-[10px] mt-0.5 opacity-80">Dwóch graczy na jednym urządzeniu</div>
                </div>
              </button>
            </div>
          </div>

          {/* Wybór scenariusza */}
          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-brass mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              2. Wybierz scenariusz
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
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
              {playMode === 'hot-seat' ? '3. Wybierz główną postać (druga zostanie wygenerowana automatycznie)' : '3. Wybierz postać Badacza'}
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
              onClick={() => {
                onQuickStart(selectedAdventureId, selectedCharacterId, playMode);
                onOpenChange(false);
              }}
            >
              Rozpocznij przygodę
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
