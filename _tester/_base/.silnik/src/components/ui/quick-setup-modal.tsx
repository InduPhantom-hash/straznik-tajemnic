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
import { Sparkles, User, BookOpen, ArrowRight, Users } from 'lucide-react';
import { STREFA_11_ADVENTURES } from '@/lib/adventures-data';
import { STREFA_11_CHARACTERS } from '@/lib/immersion/strefa-11-characters';

interface QuickSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickStart: (adventureId: string, characterId: string, mode: 'solo' | 'hot-seat', player2CharacterId?: string) => void;
}

export function QuickSetupModal({ open, onOpenChange, onQuickStart }: QuickSetupModalProps) {
  const [selectedAdventureId, setSelectedAdventureId] = useState<string>(
    STREFA_11_ADVENTURES[0]?.id || 'cien-nad-prabutami'
  );
  
  const [playMode, setPlayMode] = useState<'solo' | 'hot-seat'>('solo');
  const [selectedCharacter1, setSelectedCharacter1] = useState<string>('');
  const [selectedCharacter2, setSelectedCharacter2] = useState<string>('');

  const canStart = playMode === 'solo' 
    ? selectedCharacter1 !== ''
    : selectedCharacter1 !== '' && selectedCharacter2 !== '' && selectedCharacter1 !== selectedCharacter2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0c0d0a] border border-primary/40 shadow-[0_0_40px_rgba(16,185,129,0.15)] deco-corners w-[95vw] max-w-4xl h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-[0.12em] text-foreground text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Szybka Przygoda (Strefa 11)
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Skonfiguruj sesję z programu Strefa 11. Wybierz tryb, scenariusz oraz gotowych badaczy z zespołu telewizyjnego.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-2">
          {/* Wybór trybu */}
          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              1. Wybierz tryb gry
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setPlayMode('solo'); setSelectedCharacter2(''); }}
                className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                  playMode === 'solo'
                    ? 'bg-primary/15 border-primary text-foreground shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                <User className={`w-5 h-5 shrink-0 ${playMode === 'solo' ? 'text-primary' : ''}`} />
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
                    ? 'bg-primary/15 border-primary text-foreground shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-card/40 border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                <Users className={`w-5 h-5 shrink-0 ${playMode === 'hot-seat' ? 'text-primary' : ''}`} />
                <div>
                  <div className="font-display text-xs uppercase tracking-wider font-medium">Hot Seat (Duet)</div>
                  <div className="text-[10px] mt-0.5 opacity-80">Dwóch graczy na jednym urządzeniu</div>
                </div>
              </button>
            </div>
          </div>

          {/* Wybór scenariusza */}
          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              2. Wybierz scenariusz ze Strefy 11
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {STREFA_11_ADVENTURES.map((adv) => (
                <div
                  key={adv.id}
                  onClick={() => setSelectedAdventureId(adv.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-all flex flex-col justify-between min-h-[5rem] ${
                    selectedAdventureId === adv.id
                      ? 'bg-primary/10 border-primary text-foreground'
                      : 'bg-card/20 border-border/60 hover:border-primary/30 text-muted-foreground'
                  }`}
                >
                  <div className="font-display text-xs uppercase tracking-wide text-primary font-medium">
                    {adv.title}
                  </div>
                  <div className="text-[11px] mt-1 line-clamp-3">
                    {adv.description}
                  </div>
                  <div className="text-[10px] uppercase font-mono mt-2 self-start rounded bg-black/40 border border-primary/20 text-primary px-1">
                    {adv.eraLabel} | {adv.location}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wybór postaci */}
          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              3. Wybierz postacie
            </label>
            
            {/* Gracz 1 */}
            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-2">{playMode === 'hot-seat' ? 'Gracz 1 (Główna Postać):' : 'Twoja Postać:'}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {STREFA_11_CHARACTERS.map(c => (
                  <button
                    key={'p1-'+c.id}
                    type="button"
                    disabled={playMode === 'hot-seat' && selectedCharacter2 === c.id}
                    onClick={() => setSelectedCharacter1(c.id)}
                    className={`p-2 rounded border text-xs font-medium text-left transition-all ${
                      selectedCharacter1 === c.id
                        ? 'bg-primary/20 border-primary text-primary shadow-sm'
                        : playMode === 'hot-seat' && selectedCharacter2 === c.id 
                          ? 'opacity-30 border-border bg-black cursor-not-allowed'
                          : 'bg-card/20 border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    <div className="font-bold">{c.name}</div>
                    <div className="text-[10px] opacity-80 truncate">{c.occupation}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Gracz 2 */}
            {playMode === 'hot-seat' && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Gracz 2 (Druga Postać):</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {STREFA_11_CHARACTERS.map(c => (
                    <button
                      key={'p2-'+c.id}
                      type="button"
                      disabled={selectedCharacter1 === c.id}
                      onClick={() => setSelectedCharacter2(c.id)}
                      className={`p-2 rounded border text-xs font-medium text-left transition-all ${
                        selectedCharacter2 === c.id
                          ? 'bg-primary/20 border-primary text-primary shadow-sm'
                          : selectedCharacter1 === c.id 
                            ? 'opacity-30 border-border bg-black cursor-not-allowed'
                            : 'bg-card/20 border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      <div className="font-bold">{c.name}</div>
                      <div className="text-[10px] opacity-80 truncate">{c.occupation}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="shrink-0 flex justify-end pt-4 mt-auto border-t border-border/50">
          <Button
            className="bg-primary text-black hover:bg-primary/90 font-display uppercase tracking-wider text-xs px-6"
            disabled={!canStart}
            onClick={() => {
              if (canStart) {
                onQuickStart(selectedAdventureId, selectedCharacter1, playMode, playMode === 'hot-seat' ? selectedCharacter2 : undefined);
                onOpenChange(false);
              }
            }}
          >
            Rozpocznij przygodę
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
