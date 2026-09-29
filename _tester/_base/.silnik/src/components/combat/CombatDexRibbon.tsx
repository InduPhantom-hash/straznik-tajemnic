'use client';

/**
 * @file CombatDexRibbon.tsx
 * Diegetyczny pasek inicjatywy DEX dla starć w stylu Dark Art Déco (Issue #555).
 *
 * Prezentuje kolejność działań w rundzie walki według Zręczności (DEX RAW w d100 Weird Fiction):
 * 1. Postacie (Badacze i przeciwnicy) uszeregowani malejąco według wartości DEX.
 * 2. Znaczniki stanów bitewnych: Rana Ciężka (Major Wound), Agonia (Dying), Szaleństwo (Bout of Madness).
 * 3. Wyróżnienie postaci aktualnie wykonującej akcję w rundzie (Active Turn glow).
 * 4. Płynne zwijanie / rozwijanie z pamięcią stanu (kompaktowy nagłówek nie zasłaniający czatu).
 */

import React, { useState, useMemo, type FC } from 'react';
import { useTranslations } from 'next-intl';
import {
  Swords,
  ChevronDown,
  ChevronUp,
  Skull,
  AlertTriangle,
  Zap,
  ShieldAlert,
  User,
} from 'lucide-react';
import type { Character, Message } from '@/lib/types';
import type { PendingMeleeAttack } from '@/lib/combat/combat-resolver';

export interface Combatant {
  id: string;
  name: string;
  dex: number;
  hp?: number;
  maxHp?: number;
  isPlayer: boolean;
  portraitUrl?: string;
  majorWound?: boolean;
  isDying?: boolean;
  isBoutOfMadness?: boolean;
  isActiveTurn?: boolean;
}

export interface CombatDexRibbonProps {
  combatActive?: boolean;
  combatants?: Combatant[];
  messages?: Message[];
  activeCharacter?: Character | null;
  characters?: Character[];
  pendingCombatAttack?: PendingMeleeAttack | null;
  roundNumber?: number;
  className?: string;
}

/**
 * Wyciąga uczestników starcia i stan walki z wiadomości czatu oraz parametrów postaci.
 */
export function extractCombatants(
  messages: Message[] = [],
  activeCharacter?: Character | null,
  characters: Character[] = [],
  pendingCombatAttack?: PendingMeleeAttack | null
): { isCombatActive: boolean; combatants: Combatant[] } {
  // 1. Sprawdzenie czy starcie jest aktywne
  let inCombat = false;
  const opponentsMap = new Map<string, { name: string; dex: number; hp?: number; maxHp?: number }>();

  // Analiza wiadomości w kolejności chronologicznej
  for (const msg of messages) {
    const text = msg.content || '';
    if (/\[WALKA:\s*START\]/i.test(text)) {
      inCombat = true;
    }
    if (/\[WALKA:\s*KONIEC\]/i.test(text)) {
      inCombat = false;
    }

    // Wykrywanie przeciwników z tagów [OBRONA_WALKA: Nazwa | ...] lub [WALKA_ATAK: ... napastnik=Nazwa ...]
    if (inCombat) {
      // Wzorzec 1: [OBRONA_WALKA: Ghul | 55 | ...]
      const meleeMatches = text.matchAll(/\[(?:OBRONA_WALKA|WALKA_ATAK):\s*([^|\]]+)(?:\|\s*(\d+))?/gi);
      for (const m of meleeMatches) {
        const rawName = m[1]?.trim();
        if (rawName && !rawName.startsWith('@')) {
          const rawDex = m[2] ? parseInt(m[2], 10) : 50;
          if (!opponentsMap.has(rawName.toLowerCase())) {
            opponentsMap.set(rawName.toLowerCase(), {
              name: rawName,
              dex: isNaN(rawDex) ? 50 : rawDex,
            });
          }
        }
      }

      // Wzorzec 2: oppMeleeEvents w strukturze wiadomości
      if (msg.opposedMeleeEvents && msg.opposedMeleeEvents.length > 0) {
        for (const ev of msg.opposedMeleeEvents) {
          if (ev.attackerName && !opponentsMap.has(ev.attackerName.toLowerCase())) {
            opponentsMap.set(ev.attackerName.toLowerCase(), {
              name: ev.attackerName,
              dex: ev.attackerSkill || 50,
            });
          }
        }
      }
    }
  }

  // Jeśli trwa oczekujący atak wręcz, walka jest bezwzględnie aktywna
  if (pendingCombatAttack) {
    inCombat = true;
    const att = pendingCombatAttack.attacker;
    if (att && att.name && !opponentsMap.has(att.name.toLowerCase())) {
      opponentsMap.set(att.name.toLowerCase(), {
        name: att.name,
        dex: att.attackSkill || 50,
        hp: att.hp,
        maxHp: att.maxHp,
      });
    }
  }

  if (!inCombat && !pendingCombatAttack) {
    return { isCombatActive: false, combatants: [] };
  }

  const result: Combatant[] = [];

  // Dodaj badaczy (graczy)
  const playersToAdd: Character[] = [];
  if (activeCharacter) {
    playersToAdd.push(activeCharacter);
  }
  for (const c of characters) {
    if (!playersToAdd.some((p) => p.id === c.id)) {
      playersToAdd.push(c);
    }
  }

  for (const p of playersToAdd) {
    const maxHp = p.maxHp ?? Math.floor(((p.con || 50) + (p.siz || 50)) / 10);
    const hp = p.hp ?? maxHp;
    const isMajorWound = hp <= Math.floor(maxHp / 2) && hp > 0;
    const isDying = hp <= 0;
    const isBout = Boolean(p.activeBoutOfMadness);

    result.push({
      id: `player-${p.id}`,
      name: p.name,
      dex: p.dex ?? 50,
      hp,
      maxHp,
      isPlayer: true,
      portraitUrl: p.portraitUrl,
      majorWound: isMajorWound,
      isDying,
      isBoutOfMadness: isBout,
      isActiveTurn: !pendingCombatAttack, // gracz ma turę, gdy nie broni się przed atakiem
    });
  }

  // Dodaj przeciwników
  for (const [key, opp] of opponentsMap.entries()) {
    const isAttackingNow = pendingCombatAttack?.attacker?.name.toLowerCase() === key;
    result.push({
      id: `enemy-${key}`,
      name: opp.name,
      dex: opp.dex,
      hp: opp.hp,
      maxHp: opp.maxHp,
      isPlayer: false,
      majorWound: opp.hp !== undefined && opp.maxHp !== undefined && opp.hp <= Math.floor(opp.maxHp / 2) && opp.hp > 0,
      isDying: opp.hp !== undefined && opp.hp <= 0,
      isActiveTurn: isAttackingNow,
    });
  }

  // Sortowanie malejąco według Zręczności (DEX RAW CoC 7e)
  result.sort((a, b) => b.dex - a.dex);

  return { isCombatActive: inCombat, combatants: result };
}

export const CombatDexRibbon: FC<CombatDexRibbonProps> = ({
  combatActive: propCombatActive,
  combatants: propCombatants,
  messages = [],
  activeCharacter,
  characters = [],
  pendingCombatAttack,
  roundNumber = 1,
  className = '',
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const t = useTranslations('CombatDexRibbon');

  // Bezpieczne translacje z fallbackiem
  const labelTitle = (() => {
    try {
      return t('title');
    } catch {
      return 'STARCIE (INICJATYWA DEX)';
    }
  })();
  const labelRound = (() => {
    try {
      return t('round');
    } catch {
      return 'Runda';
    }
  })();
  const labelMajorWound = (() => {
    try {
      return t('majorWound');
    } catch {
      return 'Rana Ciężka';
    }
  })();
  const labelDying = (() => {
    try {
      return t('dying');
    } catch {
      return 'Agonia (0 HP)';
    }
  })();
  const labelMadness = (() => {
    try {
      return t('madness');
    } catch {
      return 'Atak Szaleństwa';
    }
  })();
  const labelActiveTurn = (() => {
    try {
      return t('activeTurn');
    } catch {
      return 'Aktywna akcja';
    }
  })();

  // Automatyczna kalkulacja, jeśli nie podano wprost przez props
  const { isCombatActive, combatants } = useMemo(() => {
    if (propCombatants && propCombatants.length > 0) {
      return {
        isCombatActive: propCombatActive,
        combatants: [...propCombatants].sort((a, b) => b.dex - a.dex),
      };
    }
    const extracted = extractCombatants(
      messages,
      activeCharacter,
      characters,
      pendingCombatAttack
    );
    return {
      isCombatActive: propCombatActive !== undefined ? propCombatActive : extracted.isCombatActive,
      combatants: extracted.combatants,
    };
  }, [propCombatActive, propCombatants, messages, activeCharacter, characters, pendingCombatAttack]);

  if (!isCombatActive || combatants.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Kolejka inicjatywy walki DEX"
      data-testid="combat-dex-ribbon"
      className={`relative w-full z-15 select-none border-b border-brass/40 bg-[radial-gradient(ellipse_at_top,_#1c1813_0%,_#0f0d09_80%,_#080705_100%)] shadow-[0_4px_20px_rgba(0,0,0,0.7)] backdrop-blur transition-all duration-300 ${className}`}
    >
      {/* Ozdobne narożniki Art Déco */}
      <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-brass/50 pointer-events-none" />
      <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-brass/50 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-brass/50 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-brass/50 pointer-events-none" />

      {/* Górny wąski pasek statusu */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-brass/20 text-[11px] font-special-elite tracking-wider">
        <div className="flex items-center gap-2 text-brass">
          <Swords className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span className="font-bold uppercase tracking-[0.2em]">{labelTitle}</span>
          <span className="text-muted-foreground/60">•</span>
          <span className="text-foreground/90 font-mono">
            {labelRound} {roundNumber}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-brass transition-colors px-1.5 py-0.5 rounded hover:bg-brass/10"
          title={collapsed ? 'Rozwiń pasek' : 'Zwiń pasek'}
          aria-expanded={!collapsed}
        >
          <span>{collapsed ? 'Pokaż uczestników' : 'Zwiń'}</span>
          {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
      </div>

      {/* Rozwijana lista uczestników uszeregowana wg DEX */}
      {!collapsed && (
        <div className="overflow-x-auto py-2 px-3 scrollbar-thin scrollbar-thumb-brass/30">
          <div className="flex items-center gap-2.5 min-w-max">
            {combatants.map((c, index) => {
              const rank = index + 1;
              return (
                <div
                  key={c.id}
                  data-testid={`combatant-card-${c.id}`}
                  className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded border transition-all duration-200 ${
                    c.isActiveTurn
                      ? 'border-brass bg-brass/15 shadow-[0_0_12px_rgba(201,162,39,0.35)] ring-1 ring-brass/60'
                      : c.isPlayer
                        ? 'border-brass/30 bg-black/60 hover:border-brass/50'
                        : 'border-red-900/40 bg-red-950/20 hover:border-red-700/60'
                  } ${c.isDying ? 'opacity-40 grayscale' : ''}`}
                >
                  {/* Ranga Inicjatywy */}
                  <span className="font-mono text-[10px] text-muted-foreground/80 font-bold">
                    #{rank}
                  </span>

                  {/* Awatar / Ikona w diamencie Art Déco */}
                  <div className="relative w-7 h-7 rounded-sm overflow-hidden border border-brass/40 bg-zinc-950 flex items-center justify-center flex-shrink-0">
                    {c.portraitUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.portraitUrl}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    ) : c.isPlayer ? (
                      <User className="w-4 h-4 text-brass" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    )}

                    {/* Aktywny wskaźnik tury */}
                    {c.isActiveTurn && (
                      <span
                        className="absolute inset-0 border-2 border-brass animate-ping pointer-events-none"
                        title={labelActiveTurn}
                      />
                    )}
                  </div>

                  {/* Dane postaci: Imię + Zręczność */}
                  <div className="flex flex-col min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif text-xs font-bold text-foreground truncate max-w-[110px]" title={c.name}>
                        {c.name}
                      </span>
                      {c.isPlayer && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-brass/20 text-brass uppercase font-mono font-semibold">
                          Badacz
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-brass font-bold">
                        DEX {c.dex}
                      </span>
                      {c.hp !== undefined && (
                        <span className="text-muted-foreground text-[9px]">
                          HP {c.hp}{c.maxHp ? `/${c.maxHp}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Znaczniki stanów (Rana Ciężka, Agonia, Szaleństwo) */}
                  <div className="flex items-center gap-1 pl-1 border-l border-brass/20">
                    {c.majorWound && (
                      <span
                        title={labelMajorWound}
                        className="flex items-center justify-center w-4 h-4 rounded-full bg-red-950/80 border border-red-600/80 text-red-300 text-[10px]"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {c.isDying && (
                      <span
                        title={labelDying}
                        className="flex items-center justify-center w-4 h-4 rounded-full bg-black border border-red-500 text-red-500 text-[10px] animate-pulse"
                      >
                        <Skull className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {c.isBoutOfMadness && (
                      <span
                        title={labelMadness}
                        className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-950/80 border border-amber-500/80 text-amber-300 text-[10px]"
                      >
                        <Zap className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
