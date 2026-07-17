'use client';

/**
 * WelcomeScreen barrel - re-export z welcome/index (IND-144 Wariant B sesja 130).
 *
 * Sub-moduły:
 *   - welcome/types.ts (WelcomeScreenProps + Quote)
 *   - welcome/data/quotes.ts (WELCOME_QUOTES - 20 cytatów Lovecrafta)
 *   - welcome/hooks/use-typewriter-sound.ts (Audio + animation + IND-149 cleanup)
 *   - welcome/components/onboarding-buttons.tsx (5 buttonów onboarding ①-⑤)
 *   - welcome/components/bottom-links.tsx (load save + API keys)
 *   - welcome/index.tsx (orchestrator)
 *
 * Split 493 → 13 lin (-97%). Pattern: bottom-up extraction + barrel re-export
 * (analog Wariant A sesja 129 NarrativeFormatter 627→13 lin).
 */

export { WelcomeScreen } from './welcome';
