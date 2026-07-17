'use client';

/**
 * CharacterSheet - SheetSkills komponent (re-skin Dark Art Déco, makieta 04).
 *
 * Sekcja 5 UMIEJĘTNOŚCI: grid 2-kolumnowy, nazwa (Cormorant) + procent
 * (Special Elite złoto) + cienki pasek postępu (5px). Zawodowe oznaczone ★.
 * Umiejętności Mitów (czerwień + poświata) wg makiety 04. Sort alfabetyczny PL.
 */

import { getSkillValue, type Character } from '@/lib/types';
import { HelpIcon } from '../../tooltip';
import { SECTION_HELP } from '../types';

export interface SheetSkillsProps {
  character: Character;
}

/** Rozpoznaje umiejętność Mitów (czerwień + poświata, niebezpieczna wiedza). */
function isMythosSkill(skill: string): boolean {
  return /mit|mythos|cthulhu/i.test(skill);
}

/**
 * Renderuje umiejętności postaci jako grid 2-kolumnowy déco. Zawodowe (★),
 * Mity na czerwono. Sortowanie alfabetyczne (locale 'pl').
 */
export function SheetSkills({ character }: SheetSkillsProps) {
  const skills = Object.entries(character.skills || {}).sort(([a], [b]) =>
    a.localeCompare(b, 'pl')
  );

  return (
    <div>
      <h3 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold mb-4 flex items-center gap-1.5">
        Umiejętności
        <HelpIcon content={SECTION_HELP.skills} position="right" />
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-2.5">
        {skills.map(([skill, value]) => {
          const isOccupational = character.occupationalSkills?.includes(skill);
          const mythos = isMythosSkill(skill);
          // value bywa obiektem SkillData ({value, markedForImprovement, ...}) po
          // Fazie Rozwoju - getSkillValue odpakowuje oba formaty (inaczej React #31).
          const pct = Math.max(0, Math.min(100, getSkillValue(value)));
          const accent = mythos ? 'text-[#d9685f]' : 'text-brass';
          return (
            <div key={skill}>
              <div className="flex justify-between items-baseline mb-1">
                <span
                  className={`font-serif text-base truncate pr-2 ${
                    mythos ? 'text-[#d9685f]' : 'text-foreground'
                  }`}
                >
                  {isOccupational && <span className="text-brass mr-1">★</span>}
                  {skill}
                </span>
                <span
                  className={`font-special-elite text-xs flex-none ${accent}`}
                >
                  {getSkillValue(value)}%
                </span>
              </div>
              <div className="h-[5px] bg-[#1f1a14]">
                <div
                  className="h-full"
                  style={
                    mythos
                      ? {
                          width: `${pct}%`,
                          background: '#b3322c',
                          boxShadow: '0 0 8px rgba(179,50,44,.5)',
                        }
                      : { width: `${pct}%`, background: '#c9a227' }
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
