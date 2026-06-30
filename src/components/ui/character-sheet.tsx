'use client';

/**
 * CharacterSheet - barrel re-export (IND-185 M12, sesja 132).
 *
 * Zachowuje path stability dla 3 callerów: CthulhuSidebar.tsx,
 * character-manager.tsx, DeskTools.tsx (zero import updates). Logika
 * orchestrator w `character-sheet/index.tsx` (~145 lin) + 9 sub-modułów
 * w `character-sheet/` (każdy ≤226 lin).
 *
 * Pattern micro split client-side (sesje 129-131 IND-144) + (sesja 132
 * IND-185) - barrel jako re-export dla zero changes w callerach.
 */

export { CharacterSheet } from './character-sheet/index';
export type { CharacterSheetProps } from './character-sheet/types';
export { CharacterSheet as default } from './character-sheet/index';
