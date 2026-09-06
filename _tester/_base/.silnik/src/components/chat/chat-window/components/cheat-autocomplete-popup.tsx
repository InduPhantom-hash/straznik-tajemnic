'use client';

/**
 * @file cheat-autocomplete-popup.tsx
 * Stylizowany popup podpowiedzi retro kodów (Autocomplete) w stylu mosiężnego terminala Dark Art Déco.
 *
 * Wyświetla się nad polem tekstowym wiadomości, gdy użytkownik wpisze znak `[` lub wyszukuje kod.
 */

import React, { useEffect, useRef } from 'react';
import { Terminal, Sparkles, ShieldAlert, Footprints, Package, Dices, Skull } from 'lucide-react';
import type { CheatSuggestion } from '@/lib/cheats/cheat-engine';

interface CheatAutocompletePopupProps {
  suggestions: CheatSuggestion[];
  selectedIndex: number;
  onSelectSuggestion: (suggestion: CheatSuggestion) => void;
  locale?: 'pl' | 'en';
}

const CATEGORY_ICONS: Record<CheatSuggestion['category'], React.ReactNode> = {
  dice: <Dices className="w-3.5 h-3.5 text-primary" />,
  stats: <Sparkles className="w-3.5 h-3.5 text-emerald-400" />,
  combat: <ShieldAlert className="w-3.5 h-3.5 text-destructive" />,
  chase: <Footprints className="w-3.5 h-3.5 text-brass" />,
  items: <Package className="w-3.5 h-3.5 text-brass" />,
  world: <Sparkles className="w-3.5 h-3.5 text-gold" />,
  retro: <Skull className="w-3.5 h-3.5 text-gold" />,
};

export const CheatAutocompletePopup: React.FC<CheatAutocompletePopupProps> = ({
  suggestions,
  selectedIndex,
  onSelectSuggestion,
  locale = 'pl',
}) => {
  const isPl = locale === 'pl';
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!suggestions.length) return null;

  return (
    <div
      role="listbox"
      aria-label={isPl ? 'Podpowiedzi kodów' : 'Cheat suggestions'}
      className="absolute bottom-full left-0 mb-2 w-full max-w-lg z-50 overflow-hidden rounded-md border border-brass/50 bg-card/95 backdrop-blur shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
      style={{
        boxShadow: '0 -8px 24px -4px rgba(0,0,0,0.6), 0 0 12px rgba(197, 160, 89, 0.15)',
      }}
    >
      {/* Pasek nagłówka - mosiężny retro terminal */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-brass/20 via-background to-brass/10 border-b border-brass/30 text-[11px] font-mono tracking-wider text-brass">
        <div className="flex items-center gap-1.5 font-bold">
          <Terminal className="w-3.5 h-3.5 text-brass animate-pulse" />
          <span>{isPl ? 'TERMINAL KODÓW DEWELOPERSKICH (CoC 7e)' : 'DEVELOPER CHEAT CONSOLE (CoC 7e)'}</span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          ↑↓ {isPl ? 'Nawigacja' : 'Navigate'} · [Tab/Enter] {isPl ? 'Wybierz' : 'Select'} · [Esc] {isPl ? 'Zamknij' : 'Close'}
        </div>
      </div>

      {/* Lista podpowiedzi */}
      <div
        ref={listRef}
        className="max-h-56 overflow-y-auto divide-y divide-border/40 p-1 font-mono text-xs"
      >
        {suggestions.map((suggestion, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={suggestion.command + suggestion.template}
              onClick={() => onSelectSuggestion(suggestion)}
              className={`group flex items-start gap-2.5 px-2.5 py-2 cursor-pointer transition-colors rounded ${
                isSelected
                  ? 'bg-brass/20 text-foreground border-l-2 border-primary'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {CATEGORY_ICONS[suggestion.category]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary tracking-wide">
                    {suggestion.template}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded border border-border bg-background/50 text-muted-foreground uppercase font-sans">
                    {isPl ? suggestion.labelPl : suggestion.labelEn}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-sans">
                  {isPl ? suggestion.descriptionPl : suggestion.descriptionEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
