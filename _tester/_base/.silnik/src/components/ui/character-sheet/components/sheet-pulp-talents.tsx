'use client';

/**
 * CharacterSheet - SheetPulpTalents komponent.
 * Prezentuje archetyp pulpowy, wybrane talenty pulpowy oraz reguły odporności i szczęścia RAW.
 */

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Character } from '@/lib/types';
import { getPulpTalent } from '@/lib/data/character/pulp-talents';
import { getPulpArchetype } from '@/lib/data/character/pulp-archetypes';
import { Sparkles, Shield, Zap, Skull } from 'lucide-react';

export interface SheetPulpTalentsProps {
  character: Character;
}

export function SheetPulpTalents({ character }: SheetPulpTalentsProps) {
  const t = useTranslations('CharacterSheet');
  const locale = useLocale() as 'pl' | 'en';
  const isEn = locale === 'en';

  if (character.rulesetVariant !== 'pulp' && (!character.pulpTalents || character.pulpTalents.length === 0)) {
    return null;
  }

  const archetypeDef = character.archetype ? getPulpArchetype(character.archetype) : undefined;
  const talents = character.pulpTalents ?? [];
  const insaneTalents = character.insaneTalents ?? [];

  return (
    <div className="space-y-4 border border-primary/30 bg-[#121614] p-5 shadow-[0_0_15px_rgba(13,148,136,0.12)]">
      <div className="flex items-center justify-between border-b border-primary/20 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-display-decorative text-lg font-bold uppercase tracking-[0.1em] text-foreground">
            {isEn ? 'Pulp Archetype & Talents' : 'Archetyp i Talenty Pulpowe'}
          </h3>
        </div>
        <span className="border border-primary/40 bg-primary/20 px-2.5 py-0.5 font-special-elite text-xs uppercase tracking-wider text-primary">
          Pulp Cthulhu RAW
        </span>
      </div>

      {/* Archetyp pulpowy */}
      {character.archetype && (
        <div className="border border-brass/25 bg-[#181a17] p-3">
          <div className="flex items-center justify-between">
            <span className="font-special-elite text-xs uppercase tracking-widest text-brass">
              {isEn ? 'Pulp Archetype' : 'Archetyp Bohatera'}
            </span>
            <span className="font-display font-semibold text-primary text-sm">
              {archetypeDef ? (isEn ? archetypeDef.name.en : archetypeDef.name.pl) : character.archetype}
            </span>
          </div>
          {archetypeDef && (
            <p className="mt-1 font-serif text-xs italic text-muted-foreground">
              {isEn ? archetypeDef.description.en : archetypeDef.description.pl}
            </p>
          )}
        </div>
      )}

      {/* Wybrane talenty */}
      <div className="space-y-2.5">
        <span className="font-special-elite text-xs uppercase tracking-widest text-brass/90 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          {isEn ? 'Pulp Talents' : 'Pulpowe Talenty'} ({talents.length})
        </span>
        {talents.length === 0 ? (
          <p className="font-serif text-xs italic text-muted-foreground">
            {isEn ? 'No pulp talents assigned.' : 'Brak przypisanych talentów pulpowych.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {talents.map((talentIdOrName) => {
              const talentDef = getPulpTalent(talentIdOrName);
              const title = talentDef
                ? (isEn ? talentDef.name.en : talentDef.name.pl)
                : talentIdOrName;
              const summary = talentDef?.benefitSummary
                ? (isEn ? talentDef.benefitSummary.en : talentDef.benefitSummary.pl)
                : (talentDef ? (isEn ? talentDef.description.en : talentDef.description.pl) : '');
              const categoryLabel = talentDef
                ? (talentDef.category === 'physical'
                    ? (isEn ? 'Physical' : 'Fizyczny')
                    : talentDef.category === 'mental'
                    ? (isEn ? 'Mental' : 'Umysłowy')
                    : talentDef.category === 'combat'
                    ? (isEn ? 'Combat' : 'Bojowy')
                    : (isEn ? 'Misc' : 'Użytkowy'))
                : '';

              return (
                <div
                  key={talentIdOrName}
                  className="border border-primary/20 bg-[#161a18] p-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-foreground">
                      {title}
                    </span>
                    {categoryLabel && (
                      <span className="border border-brass/30 bg-brass/10 px-1.5 py-0.2 font-special-elite text-[10px] uppercase text-brass">
                        {categoryLabel}
                      </span>
                    )}
                  </div>
                  {summary && (
                    <p className="mt-1 font-serif text-xs text-muted-foreground/90 leading-relaxed">
                      {summary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Szalone talenty (Insane Talents) */}
      {insaneTalents.length > 0 && (
        <div className="space-y-2 border-t border-destructive/30 pt-3">
          <span className="font-special-elite text-xs uppercase tracking-widest text-destructive flex items-center gap-1.5">
            <Skull className="h-3.5 w-3.5" />
            {isEn ? 'Insane Talents (Bouts of Madness)' : 'Szalone Talenty (Ataki Szaleństwa)'}
          </span>
          <div className="grid grid-cols-1 gap-2">
            {insaneTalents.map((insaneT, idx) => (
              <div key={idx} className="border border-destructive/30 bg-[#201314] p-2.5 text-xs text-destructive-foreground">
                {insaneT}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zestawienie cech odporności Pulp RAW */}
      <div className="border-t border-brass/20 pt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-special-elite text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 text-primary/90">
          <Shield className="h-3 w-3" />
          {isEn ? 'Double HP: (CON+SIZ)/5' : 'PŻ Pulp: (KON+BUD)/5'}
        </span>
        <span className="text-brass/80">
          {isEn ? 'Major Wound: >= max HP' : 'Ciężka Rana: cios >= maxPŻ'}
        </span>
        <span className="text-primary/90">
          {isEn ? 'Natural Healing: +2 HP/day' : 'Regeneracja: +2 PŻ/dzień'}
        </span>
        <span className="text-brass/80">
          {isEn ? 'Luck Sanity Save: 2:1' : 'Szczęście vs SAN: 2:1'}
        </span>
      </div>
    </div>
  );
}
