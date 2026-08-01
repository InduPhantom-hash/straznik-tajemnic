'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { SafeImage } from './safe-image';
import { Sparkles, User, BookOpen, ArrowRight, Users, Info, X } from 'lucide-react';
import { STREFA_11_ADVENTURES } from '@/lib/adventures-data';
import { STREFA_11_CHARACTERS } from '@/lib/immersion/strefa-11-characters';
import { Character } from '@/lib/types';

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
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);

  const availableCharacters = useMemo(() => {
    return STREFA_11_CHARACTERS.filter(c => {
      if (selectedAdventureId === 'cien-nad-prabutami') return c.id.startsWith('strefa11_');
      if (selectedAdventureId === 'tajemnica-pendnika-lagiewki') return c.id.startsWith('pednik_');
      if (selectedAdventureId === 'tajemnica-dzieci-z-traszyna') return c.id.startsWith('traszyn_');
      if (selectedAdventureId === 'przybysz-z-matriksa-glogow') return c.id.startsWith('glogow_');
      return true;
    }).slice(0, 4);
  }, [selectedAdventureId]);

  useEffect(() => {
    setSelectedCharacter1('');
    setSelectedCharacter2('');
  }, [selectedAdventureId]);

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

        <div className="flex-1 overflow-y-auto journal-scroll space-y-6 pt-4 pr-2">
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
                {availableCharacters.map(c => (
                  <div
                    key={'p1-'+c.id}
                    className={`relative rounded border transition-all flex flex-col overflow-hidden ${
                      selectedCharacter1 === c.id
                        ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : playMode === 'hot-seat' && selectedCharacter2 === c.id 
                          ? 'opacity-30 border-border bg-black grayscale'
                          : 'bg-card/20 border-border hover:border-primary/30 grayscale hover:grayscale-0'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={playMode === 'hot-seat' && selectedCharacter2 === c.id}
                      onClick={() => setSelectedCharacter1(c.id)}
                      className="flex-1 text-left"
                    >
                      <div className="aspect-[3/4] w-full overflow-hidden border-b border-border/50 relative">
                        {c.portraitUrl ? (
                          <SafeImage
                            src={c.portraitUrl}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <User className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingCharacter(c as Character);
                          }}
                          className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-primary/80 text-white rounded backdrop-blur transition-colors z-10 cursor-pointer"
                        >
                          <Info className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="p-2">
                        <div className={`font-bold text-xs truncate ${selectedCharacter1 === c.id ? 'text-primary' : 'text-foreground'}`}>
                          {c.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {c.occupation}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Gracz 2 */}
            {playMode === 'hot-seat' && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">Gracz 2 (Druga Postać):</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {availableCharacters.map(c => (
                    <div
                      key={'p2-'+c.id}
                      className={`relative rounded border transition-all flex flex-col overflow-hidden ${
                        selectedCharacter2 === c.id
                          ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : selectedCharacter1 === c.id 
                            ? 'opacity-30 border-border bg-black grayscale'
                            : 'bg-card/20 border-border hover:border-primary/30 grayscale hover:grayscale-0'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={selectedCharacter1 === c.id}
                        onClick={() => setSelectedCharacter2(c.id)}
                        className="flex-1 text-left"
                      >
                        <div className="aspect-[3/4] w-full overflow-hidden border-b border-border/50 relative">
                          {c.portraitUrl ? (
                            <SafeImage
                              src={c.portraitUrl}
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <User className="w-8 h-8 opacity-20" />
                            </div>
                          )}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingCharacter(c as Character);
                            }}
                            className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-primary/80 text-white rounded backdrop-blur transition-colors z-10 cursor-pointer"
                          >
                            <Info className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="p-2">
                          <div className={`font-bold text-xs truncate ${selectedCharacter2 === c.id ? 'text-primary' : 'text-foreground'}`}>
                            {c.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {c.occupation}
                          </div>
                        </div>
                      </button>
                    </div>
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
      
      {viewingCharacter && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="deco-corners relative w-full max-w-3xl bg-[#120f0c] border border-brass/50 p-6 md:p-8 my-8">
            <div className="flex justify-between items-start mb-4 border-b border-brass/20 pb-3">
              <div>
                <div className="font-special-elite text-xs uppercase tracking-[0.2em] text-primary">
                  Opis badacza
                </div>
                <h3 className="font-display font-bold text-2xl text-foreground mt-1 uppercase tracking-[0.06em]">
                  {viewingCharacter.name}
                </h3>
              </div>
              <button
                onClick={() => setViewingCharacter(null)}
                className="p-1 text-muted-foreground hover:text-brass transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
              <div className="space-y-4">
                <div className="relative aspect-[3/4] border border-brass/45 bg-gradient-to-b from-[#1a160f] to-[#0c0d0a] overflow-hidden">
                  {viewingCharacter.portraitUrl ? (
                    <SafeImage
                      src={viewingCharacter.portraitUrl}
                      alt={viewingCharacter.name}
                      className="w-full h-full object-cover grayscale"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground/40">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="text-center font-special-elite text-xs text-brass uppercase tracking-[0.1em]">
                  {viewingCharacter.occupation}
                  {viewingCharacter.age ? ` · lat ${viewingCharacter.age}` : ''}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-2">
                    Biografia
                  </h4>
                  <p className="font-serif text-foreground text-sm leading-relaxed whitespace-pre-line">
                    {viewingCharacter.background || viewingCharacter.backstory}
                  </p>
                </div>
                {viewingCharacter.traits && viewingCharacter.traits.length > 0 && (
                  <div>
                    <h4 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-2">
                      Cechy charakteru
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingCharacter.traits.map((trait: string, i: number) => (
                        <span key={i} className="text-xs border border-brass/35 text-foreground bg-[#1a160f] px-2 py-1 rounded">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {viewingCharacter.tacticalNotes && (
                  <div>
                    <h4 className="font-display uppercase tracking-[0.24em] text-primary text-xs font-semibold mb-2">
                      Wskazówki
                    </h4>
                    <p className="font-serif text-primary/90 text-sm italic leading-relaxed">
                      {viewingCharacter.tacticalNotes}
                    </p>
                  </div>
                )}
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => setViewingCharacter(null)}
                    variant="outline"
                    className="font-display text-xs uppercase tracking-[0.16em] border-brass/20 text-muted-foreground hover:border-brass/50 hover:text-brass"
                  >
                    Zamknij
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
