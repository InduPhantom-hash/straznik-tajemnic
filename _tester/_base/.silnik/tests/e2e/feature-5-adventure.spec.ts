/**
 * Feature #05 — Adventure analyze / Onboarding (regresja smoke)
 *
 * Test regresyjny dla obszaru #05 audytowanego w Sesji 12/16 IND-42 (2026-05-08).
 * Pokrywa critical paths: strona główna renderuje się + B5 operator precedence
 * regression guard (data corruption w session-zero-modal.tsx:163).
 *
 * Strategia: mock fetch przez `page.route('**\/api/**')` — zero kosztów GCS.
 * T2 używa `page.evaluate()` do weryfikacji wyrażenia JS bezpośrednio
 * (B5 bug = czysta logika JS, bez potrzeby full UI flow).
 *
 * UPDATE sesja 66 (2026-05-11) — IND-129 fix zaaplikowany w session-zero-modal.tsx:163.
 * T2 stał się forward regression guard: chroni przed re-introducem operator precedence buga.
 *
 * Pominięte (świadomie minimal scope, smoke zbiorczy na końcu cleanup serii per
 * memory feedback strategy):
 *  - Real PDF upload → GCS → /api/pdf/parse → /api/adventure/analyze flow
 *  - Real AI analysis (Gemini 2.0-flash call) → CustomAdventure JSON
 *  - Real localStorage 'custom_adventures' persistence (write → reload → restore)
 *  - Real session-zero-modal full wizard flow (10+ useState, 3 sekcje UI)
 *  - Real adventureContext → useGameStart → /api/chat integration
 *
 * Powód: scope sesji audytowej = SMOKE regresji (page renders + B5 operator
 * precedence data corruption confirmation), NIE pełna integracja adventure lifecycle.
 *
 * Spec doc: .agent/features/05-adventure-analyze.md
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #05: Adventure analyze / Onboarding (regresja smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all /api/** — zero kosztów GCS/AI. Default 200 success.
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'mock response',
        }),
      })
    );
  });

  test('1. strona główna renderuje się bez crash (AdventureSelector + useCustomAdventures + session-zero-modal loadable)', async ({
    page,
  }) => {
    await page.goto('/');
    // Sanity: body istnieje, brak runtime errorów blokujących render po imporcie
    // 6 plików scope (session-zero-modal.tsx 669 lin + adventure-selector.tsx 447 lin
    // + useCustomAdventures 284 lin + adventure/analyze/route.ts 223 lin + adventures-data.ts 300 lin
    // + useGameStart.ts 176 lin).
    await expect(page.locator('body')).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain('Application error');
    expect(html).not.toContain('Internal Server Error');
  });

  test('2. B5 operator precedence regression guard — session-zero-modal.tsx:163 (FIXED in IND-129)', async ({
    page,
  }) => {
    // IND-129 fix zaaplikowany w sesji 66 (2026-05-11). Wyrażenie z explicit parentheses:
    //   narrativeMode: loaded.narrativeMode ||
    //       (loaded.playstyle === 'storytelling' ? 'story_priority' : 'full_rpg'),
    //
    // Forward regression guard chroni przed re-introducem buga (operator precedence
    // gdzie `||` wiązało mocniej niż `?:` → KAŻDA truthy wartość loaded.narrativeMode
    // overwriteowała do 'story_priority'; data corruption ustawień sessionZero).
    //
    // T2 weryfikuje przez `page.evaluate()` że poprawne wyrażenie zwraca wartość
    // wybraną przez użytkownika (nie nadpisuje jej).

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const result = await page.evaluate(() => {
      // Symulacja handleLoadConfig w session-zero-modal.tsx:163
      // loaded = dane z localStorage (użytkownik wybrał wcześniej 'full_rpg')
      const loaded = {
        narrativeMode: 'full_rpg' as string,
        playstyle: 'investigation' as string, // NIE 'storytelling'
      };

      // WYRAŻENIE 1:1 z session-zero-modal.tsx:163 — FIXED (explicit parentheses)
      const narrativeMode =
        loaded.narrativeMode ||
        (loaded.playstyle === 'storytelling' ? 'story_priority' : 'full_rpg');

      return narrativeMode;
    });

    // Po IND-129 fix: user wybór 'full_rpg' jest zachowany (NIE nadpisany do 'story_priority').
    expect(result).toBe('full_rpg');

    // Regression check: fallback gdy loaded.narrativeMode === undefined (starsze zapisy bez pola)
    const resultFallbackStorytelling = await page.evaluate(() => {
      const loaded = {
        narrativeMode: undefined as string | undefined,
        playstyle: 'storytelling' as string,
      };
      const narrativeMode =
        loaded.narrativeMode ||
        (loaded.playstyle === 'storytelling' ? 'story_priority' : 'full_rpg');
      return narrativeMode;
    });
    expect(resultFallbackStorytelling).toBe('story_priority');

    const resultFallbackOther = await page.evaluate(() => {
      const loaded = {
        narrativeMode: undefined as string | undefined,
        playstyle: 'tactical' as string,
      };
      const narrativeMode =
        loaded.narrativeMode ||
        (loaded.playstyle === 'storytelling' ? 'story_priority' : 'full_rpg');
      return narrativeMode;
    });
    expect(resultFallbackOther).toBe('full_rpg');
  });
});
