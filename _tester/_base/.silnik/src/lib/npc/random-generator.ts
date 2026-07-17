// Pure function - generuje losowy NPC z jednego z 4 szablonów (NPC_TEMPLATES).
// Optional `seed` param dla deterministycznych testów + sesja replay (wzór z IND-127 B5).

import type { NPC } from '@/lib/types';
import { NPC_TEMPLATES, type NpcTemplateKey } from '@/lib/data/npc';
import { DEFAULT_SKILLS } from '@/lib/data/npc';
import { calculateDerivedStats } from './derived-stats';
import { createSeededRandom } from '@/lib/utils/seedable-random';

export function generateRandomNPC(seed?: number): Partial<NPC> {
  const rng = createSeededRandom(seed);
  const templateKeys = Object.keys(NPC_TEMPLATES) as NpcTemplateKey[];
  const templateKey = templateKeys[Math.floor(rng() * templateKeys.length)];
  const template = NPC_TEMPLATES[templateKey];
  const stats: Record<string, number> = { ...template.stats };
  const skills = { ...template.skills, ...DEFAULT_SKILLS };

  // Losowe modyfikacje ±10 dla każdej statystyki bazowej
  for (const key of Object.keys(stats)) {
    stats[key] = stats[key] + Math.floor(rng() * 20) - 10;
  }

  const derived = calculateDerivedStats(stats as Partial<NPC>);

  return {
    type:
      templateKey === 'monster'
        ? 'monster'
        : rng() > 0.5
          ? 'neutral'
          : 'friendly',
    occupation: template.name,
    ...(stats as Pick<
      NPC,
      'str' | 'dex' | 'con' | 'app' | 'pow' | 'edu' | 'siz' | 'int' | 'luck'
    >),
    ...derived,
    maxHp: derived.hp,
    maxSan: derived.san,
    maxMp: derived.mp,
    skills,
    status: 'alive',
  };
}
