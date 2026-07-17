/**
 * @file Barrel re-export dla ChatWindow (IND-144 Wariant C, sesja 131).
 *
 * Implementacja w `./chat-window/`. Re-export utrzymuje path stability dla
 * `src/app/page.tsx:30-33` (dynamic import `mod.ChatWindow`) - zero zmian
 * w callerze po splicie 438→<20 lin.
 *
 * Pattern analog Wariant A (NarrativeFormatter.tsx → ./narrative/) +
 * B (WelcomeScreen.tsx → ./welcome/).
 */

export { ChatWindow } from './chat-window';
export type { ChatWindowProps } from './chat-window/types';
