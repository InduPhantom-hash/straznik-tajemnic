/**
 * Feature #06 - Postać/Kreator (regresja smoke)
 *
 * Test regresyjny dla obszaru #06 audytowanego w Sesji 11/16 IND-42 (2026-05-08).
 * Pokrywa critical paths: strona /characters/new renderuje się + /api/characters
 * DROPPED regression guard (endpoint usunięty w IND-121 sesja 75 - wszystkie
 * persistence idzie przez localStorage, single-instance accepted per sesja 74).
 *
 * Strategia: mock fetch przez `page.route('**\/api/**')` - zero kosztów GCS.
 * Testy NIE wywołują prawdziwego GCS API ani /api/chat (AI gen).
 *
 * Pominięte (świadomie minimal scope, smoke zbiorczy na końcu cleanup serii per
 * memory feedback strategy):
 *  - Real `character-wizard.tsx` 8-step flow (B1 - 2358 lin = NEW WORST UI w IND-42)
 *  - Real AI gen calls (`/api/chat` × 4 + `/api/imagen` × 1 w wizard)
 *  - Real localStorage 'characters' persistence flow (write → reload → restore)
 *  - Real Pełny Reset → cleanup characters w GCS (gdyby /api/characters było aktywne)
 *  - Real random generator deterministic seed (Math.random non-seedable in
 *    random-character-generator.ts × 14 wystąpień + character-development.ts × 2)
 *
 * Powód: scope sesji audytowej = SMOKE regresji (page renders + /api/characters
 * DEAD CODE confirmation), NIE pełna integracja character lifecycle.
 *
 * Spec doc: .agent/features/06-postac-kreator.md
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #06: Postać/Kreator (regresja smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all /api/** - zero kosztów GCS/AI. Default 200 success.
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

  test('1. strona /characters/new renderuje się bez crash (character-wizard + useCharacterManagement loadable)', async ({
    page,
  }) => {
    await page.goto('/characters/new');
    // Sanity: body istnieje, brak runtime errorów blokujących render po imporcie
    // Scope po IND-180 (sesja 100): character-wizard.tsx 2358 lin canonical;
    // character-creator/profile/state dropped (~2760 lin dead code, 0 callerów).
    await expect(page.locator('body')).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain('Application error');
    expect(html).not.toContain('Internal Server Error');
  });

  test('2. /api/characters DROPPED regression guard (IND-121 sesja 75 - endpoint usunięty, localStorage jedyny SoT, single-instance accepted)', async ({
    page,
  }) => {
    // **IND-121 ZAMKNIĘTE w sesji 75**: endpoint `src/app/api/characters/route.ts` (224 lin)
    // został usunięty (`git rm`). Decyzja architektoniczna single-instance per sesja 74 -
    // localStorage 'characters' jest jedyny source of truth, backup path = useFullSave
    // (Pełny Save → GCS via `useFullSave.ts:87`).
    //
    // **Regression guard**: ten test dokumentuje że po dropie UI dalej NIE woła
    // `/api/characters` (endpoint nie istnieje, każdy fetch zwróci 404 z Next.js
    // default handler). Asercja `endpointCalled === false` zostaje aktualna -
    // chroni przed przypadkowym re-introducem fetch do nieistniejącego endpointu.

    // Track czy endpoint został wywołany przez UI podczas page load + 2s wait
    let endpointCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/characters') && !endpointCalled) {
        endpointCalled = true;
      }
    });

    await page.goto('/characters/new');
    // Wait dla potencjalnych delayed effects (useEffect mount).
    await page.waitForTimeout(2000);

    // Smoke regression guard: endpoint NIE został wywołany przez UI = post-IND-121 state.
    // Endpoint /api/characters nie istnieje fizycznie w `src/app/api/`, więc każdy
    // fetch zwróci 404 Next.js. Test chroni przed przypadkowym re-introducem fetch
    // call w UI hookach (np. ktoś by dodał `fetch('/api/characters')` w useCharacterManagement).
    expect(endpointCalled).toBe(false);

    // Bonus: page nadal renderuje się - body widoczny mimo drop endpointu.
    await expect(page.locator('body')).toBeVisible();
  });
});
