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
import { CharacterSheet } from './character-sheet';

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
      <DialogContent size="screen">
        <span className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-brass/55" />

        <DialogHeader className="text-center sm:text-center shrink-0">
          <div className="font-special-elite text-[14px] uppercase tracking-[0.4em] text-primary">
            Szybka Przygoda
          </div>
          <DialogTitle className="mt-1 justify-center text-center font-display-decorative text-3xl font-black uppercase tracking-[0.12em] text-foreground flex items-center gap-2">
            Strefa 11
          </DialogTitle>
          <DialogDescription className="text-center font-serif text-base italic text-muted-foreground">
            Skonfiguruj sesję z programu Strefa 11. Wybierz tryb, scenariusz oraz gotowych badaczy z zespołu telewizyjnego.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 mb-2 flex items-center gap-4 shrink-0">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold" />
          <span className="h-2 w-2 rotate-45 bg-brass" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold" />
        </div>

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
                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(13,148,136,0.15)] text-foreground'
                    : 'bg-[#16130f] border-brass/28 hover:border-brass/55 text-muted-foreground'
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
                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(13,148,136,0.15)] text-foreground'
                    : 'bg-[#16130f] border-brass/28 hover:border-brass/55 text-muted-foreground'
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
                      ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(13,148,136,0.15)] text-foreground'
                      : 'bg-[#16130f] border-brass/28 hover:border-brass/55 text-muted-foreground'
                  }`}
                >
                  <div className="font-display text-xs uppercase tracking-wide text-primary font-medium">
                    {adv.title}
                  </div>
                  <div className="text-[16px] leading-relaxed font-serif mt-1.5 line-clamp-3 text-muted-foreground">
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
                    <div className="flex-1 flex flex-col">
                      <button
                        type="button"
                        disabled={playMode === 'hot-seat' && selectedCharacter2 === c.id}
                        onClick={() => setSelectedCharacter1(c.id)}
                        className="flex-1 text-left w-full relative"
                      >
                        <div className="aspect-[3/4] w-full overflow-hidden border-b border-brass/20 relative">
                          {c.portraitUrl ? (
                            <SafeImage
                              src={c.portraitUrl}
                              alt={c.name}
                              className="w-full h-full object-cover grayscale opacity-80 transition-all hover:grayscale-0 hover:opacity-100"
                              style={{ 
                                filter: selectedCharacter1 === c.id ? 'grayscale(0)' : undefined,
                                opacity: selectedCharacter1 === c.id ? 1 : undefined
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <User className="w-8 h-8 opacity-20" />
                            </div>
                          )}
                          {selectedCharacter1 === c.id && (
                            <span className="absolute left-1.5 top-1.5 flex h-6 w-6 rotate-45 items-center justify-center bg-primary shadow-[0_0_12px_rgba(13,148,136,0.5)] z-10">
                              <span aria-hidden="true" className="-rotate-45 text-sm text-[#04110f]">✓</span>
                            </span>
                          )}
                        </div>
                        <div className="p-2">
                          <div className={`font-display uppercase tracking-wider text-[11px] truncate ${selectedCharacter1 === c.id ? 'text-primary font-bold' : 'text-foreground'}`}>
                            {c.name}
                          </div>
                          <div className="text-[10px] font-special-elite text-muted-foreground truncate mt-0.5">
                            {c.occupation}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingCharacter(c as Character);
                        }}
                        className="w-full py-1.5 border-t border-brass/20 bg-black/40 hover:bg-brass/10 text-brass hover:text-primary text-[10px] font-special-elite uppercase tracking-widest flex justify-center items-center gap-1 transition-colors mt-auto"
                      >
                        <Info className="w-3 h-3" /> Biografia
                      </button>
                    </div>
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
                    <div className="flex-1 flex flex-col">
                      <button
                        type="button"
                        disabled={selectedCharacter1 === c.id}
                        onClick={() => setSelectedCharacter2(c.id)}
                        className="flex-1 text-left w-full relative"
                      >
                        <div className="aspect-[3/4] w-full overflow-hidden border-b border-brass/20 relative">
                          {c.portraitUrl ? (
                            <SafeImage
                              src={c.portraitUrl}
                              alt={c.name}
                              className="w-full h-full object-cover grayscale opacity-80 transition-all hover:grayscale-0 hover:opacity-100"
                              style={{ 
                                filter: selectedCharacter2 === c.id ? 'grayscale(0)' : undefined,
                                opacity: selectedCharacter2 === c.id ? 1 : undefined
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <User className="w-8 h-8 opacity-20" />
                            </div>
                          )}
                          {selectedCharacter2 === c.id && (
                            <span className="absolute left-1.5 top-1.5 flex h-6 w-6 rotate-45 items-center justify-center bg-primary shadow-[0_0_12px_rgba(13,148,136,0.5)] z-10">
                              <span aria-hidden="true" className="-rotate-45 text-sm text-[#04110f]">✓</span>
                            </span>
                          )}
                        </div>
                        <div className="p-2">
                          <div className={`font-display uppercase tracking-wider text-[11px] truncate ${selectedCharacter2 === c.id ? 'text-primary font-bold' : 'text-foreground'}`}>
                            {c.name}
                          </div>
                          <div className="text-[10px] font-special-elite text-muted-foreground truncate mt-0.5">
                            {c.occupation}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingCharacter(c as Character);
                        }}
                        className="w-full py-1.5 border-t border-brass/20 bg-black/40 hover:bg-brass/10 text-brass hover:text-primary text-[10px] font-special-elite uppercase tracking-widest flex justify-center items-center gap-1 transition-colors mt-auto"
                      >
                        <Info className="w-3 h-3" /> Biografia
                      </button>
                    </div>
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
      
      <CharacterSheet
        open={!!viewingCharacter}
        onOpenChange={(open) => !open && setViewingCharacter(null)}
        character={viewingCharacter || undefined}
      />
    </Dialog>
  );
}
