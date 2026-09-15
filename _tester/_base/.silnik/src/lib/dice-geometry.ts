import type { PhysicalDieType } from '@/lib/dice-roll-trace';

/** Real-world solid represented for every die the player can roll. */
export const PHYSICAL_DIE_GEOMETRY: Record<PhysicalDieType, { solid: string; faces: number }> = {
  d3: { solid: 'triangular-prism', faces: 5 },
  d4: { solid: 'tetrahedron', faces: 4 },
  d6: { solid: 'cube', faces: 6 },
  d8: { solid: 'octahedron', faces: 8 },
  d10: { solid: 'pentagonal-trapezohedron', faces: 10 },
  d12: { solid: 'dodecahedron', faces: 12 },
  d20: { solid: 'icosahedron', faces: 20 },
};
