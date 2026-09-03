'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Button } from './button';
import { SafeImage } from './safe-image';
import { Sparkles, User, BookOpen, ArrowRight, Users, Info, X, Loader2 } from 'lucide-react';
import { STREFA_11_ADVENTURES } from '@/lib/adventures-data';
import { getStrefa11CharactersForAdventure } from '@/lib/immersion/strefa-11-characters';
import {
  localizeStrefa11Adventure,
  localizeStrefa11Character,
} from '@/lib/immersion/strefa-11-localization';
import { Character } from '@/lib/types';
import { CharacterSheet } from './character-sheet';

interface QuickSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickStart: (adventureId: string, characterId: string, mode: 'solo' | 'hot-seat', player2CharacterId?: string) => void;
  isStarting?: boolean;
  startProgress?: number;
  startStatus?: string;
}

export function QuickSetupModal({
  open,
  onOpenChange,
  onQuickStart,
  isStarting = false,
  startProgress = 0,
  startStatus = '',
}: QuickSetupModalProps) {
  const t = useTranslations('QuickSetupModal');
  const locale = useLocale() as 'pl' | 'en';
  const [selectedAdventureId, setSelectedAdventureId] = useState<string>(
    STREFA_11_ADVENTURES[0]?.id || 'cien-nad-prabutami'
  );
  
  const [playMode, setPlayMode] = useState<'solo' | 'hot-seat'>('solo');
  const [selectedCharacter1, setSelectedCharacter1] = useState<string>('');
  const [selectedCharacter2, setSelectedCharacter2] = useState<string>('');
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);

  const adventures = useMemo(
    () => STREFA_11_ADVENTURES.map((adventure) => localizeStrefa11Adventure(adventure, locale)),
    [locale]
  );

  const availableCharacters = useMemo(() => {
    return getStrefa11CharactersForAdventure(selectedAdventureId)
      .slice(0, 4)
      .map((character) => localizeStrefa11Character(character, locale));
  }, [locale, selectedAdventureId]);

  useEffect(() => {
    setSelectedCharacter1('');
    setSelectedCharacter2('');
  }, [selectedAdventureId]);

  const canStart = playMode === 'solo' 
    ? selectedCharacter1 !== ''
    : selectedCharacter1 !== '' && selectedCharacter2 !== '' && selectedCharacter1 !== selectedCharacter2;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (isStarting && !nextOpen) return;
      onOpenChange(nextOpen);
    }}>
      <DialogContent data-testid="quick-setup-modal" size="screen">
        <span className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-brass/55" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-brass/55" />

        <DialogHeader className="text-center sm:text-center shrink-0">
          <div className="font-special-elite text-[14px] uppercase tracking-[0.4em] text-primary">
            {t('kicker')}
          </div>
          <DialogTitle className="mt-1 justify-center text-center font-display-decorative text-3xl font-black uppercase tracking-[0.12em] text-foreground flex items-center gap-2">
            Strefa 11
          </DialogTitle>
          <DialogDescription className="text-center font-serif text-base italic text-muted-foreground">
            {t('description')}
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
              {t('stepMode')}
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
                  <div className="font-display text-xs uppercase tracking-wider font-medium">{t('solo')}</div>
                  <div className="text-[10px] mt-0.5 opacity-80">{t('soloDescription')}</div>
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
                  <div className="font-display text-xs uppercase tracking-wider font-medium">{t('hotSeat')}</div>
                  <div className="text-[10px] mt-0.5 opacity-80">{t('hotSeatDescription')}</div>
                </div>
              </button>
            </div>
          </div>

          {/* Wybór scenariusza */}
          <div>
            <label className="block text-xs font-display uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {t('stepAdventure')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {adventures.map((adv) => (
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
              {t('stepCharacters')}
            </label>
            
            {/* Gracz 1 */}
            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-2">{playMode === 'hot-seat' ? t('playerOne') : t('yourCharacter')}</div>
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
                              className="w-full h-full object-cover object-top grayscale opacity-80 transition-all hover:grayscale-0 hover:opacity-100"
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
                        <Info className="w-3 h-3" /> {t('biography')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gracz 2 */}
            {playMode === 'hot-seat' && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">{t('playerTwo')}</div>
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
                              className="w-full h-full object-cover object-top grayscale opacity-80 transition-all hover:grayscale-0 hover:opacity-100"
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
                        <Info className="w-3 h-3" /> {t('biography')}
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
        <div className="shrink-0 flex flex-col items-end gap-3 pt-4 mt-auto border-t border-border/50">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            {isStarting ? (
              <div
                data-testid="quick-setup-progress-container"
                className="w-full max-w-md flex flex-col gap-1.5 animate-in fade-in-50 duration-300"
              >
                <div className="w-full h-2 bg-black/70 rounded-full border border-brass/40 overflow-hidden relative shadow-[inset_0_1px_4px_rgba(0,0,0,0.8)]">
                  <div
                    data-testid="quick-setup-progress-bar"
                    className="h-full bg-gradient-to-r from-brass via-primary to-emerald-400 rounded-full transition-all duration-500 ease-out relative"
                    style={{ width: `${Math.min(100, Math.max(5, startProgress))}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
                <div className="w-full flex items-center justify-between text-xs font-special-elite text-brass/90 tracking-[0.08em] px-1">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="truncate">{startStatus || t('statusSettingUp')}</span>
                  </span>
                  <span className="font-mono text-brass/80 ml-2 shrink-0">{startProgress}%</span>
                </div>
              </div>
            ) : (
              <div className="hidden sm:block text-xs font-serif italic text-muted-foreground">
                {playMode === 'hot-seat' ? t('hotSeatDescription') : t('soloDescription')}
              </div>
            )}

            <Button
              className={`font-display uppercase tracking-wider text-xs px-6 ${
                isStarting
                  ? 'bg-primary/80 text-black cursor-wait'
                  : 'bg-primary text-black hover:bg-primary/90'
              }`}
              disabled={!canStart || isStarting}
              onClick={() => {
                if (canStart && !isStarting) {
                  onQuickStart(
                    selectedAdventureId,
                    selectedCharacter1,
                    playMode,
                    playMode === 'hot-seat' ? selectedCharacter2 : undefined
                  );
                }
              }}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-black" />
                  <span>{t('startingGame')}</span>
                </>
              ) : (
                <>
                  <span>{t('start')}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
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
