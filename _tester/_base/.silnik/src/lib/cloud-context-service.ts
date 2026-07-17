/**
 * Cloud Context Service — re-export
 *
 * Sesja 93 (IND-175): refactor 835 lin → `src/lib/cloud-context/` (4 sub-moduły).
 * Ten plik zachowany jako re-export dla backward compat z istniejącymi callerami:
 * - `src/app/api/context/chunk/route.ts` (runtime)
 * - `src/lib/auto-summary-service.ts` (type imports)
 */

export * from './cloud-context';
export type {
  Message,
  CloudContextChunk,
  CloudContextMetadata,
} from './cloud-context';
export { cloudContextService } from './cloud-context';
