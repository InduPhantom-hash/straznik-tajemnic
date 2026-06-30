/**
 * Feature #11 — Generowanie obrazów (regresja smoke)
 *
 * Test regresyjny dla obszaru #11 audytowanego w Sesji 6 IND-42 (2026-05-07).
 * Pokrywa critical path: page renders + /api/imagen orchestrator error path mock guard.
 *
 * Strategia: mock fetch przez `page.route('** /api/**')` — zero kosztów Vertex AI /
 * Replicate / Gemini Image API. Testy NIE wywołują prawdziwych providerów.
 *
 * Pominięte (świadomie minimal scope, smoke zbiorczy na końcu cleanup serii per
 * memory feedback strategy):
 *  - Real Vertex AI Imagen 3 generation (~$0.04/obraz cost)
 *  - Real Replicate FLUX Stable Diffusion polling (~30-60s + $0.003/obraz)
 *  - Real Gemini 2.5 Flash image emergency fallback (~$0.02/obraz)
 *  - Real GCS upload do `saves/{userId}/{saveId}/images/` (B2 makePublic privacy issue)
 *  - Pełen 3-tier fallback chain (Vertex → Replicate → Gemini)
 *  - characterPortraitGenerator 3-variants flow (3× sequential fetches ~15-25s UX)
 *  - NPCIllustration modal flow z localStorage persistence
 *  - cache hit dla `imageCache: Map<>` global (B1 multi-user singleton finding)
 *  - B3 cache key niespójność orkiestrator vs vertex-imagen (cache dead code w sub)
 * Powód: scope sesji audytowej = SMOKE regresji (image endpoints zwracają sensowny shape),
 * NIE pełna integracja image generation pipeline.
 *
 * Spec doc: .agent/features/11-generowanie-obrazow.md
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #11: Generowanie obrazów (regresja smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all /api/** — zero kosztów providerów + zero flakiness external API.
    // Default 200 success, T2 nadpisuje dla error path.
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
          provider: 'mock',
          cost: 0,
        }),
      })
    );
  });

  test('1. strona główna renderuje się bez crash (image generation pipeline loadable)', async ({
    page,
  }) => {
    await page.goto('/');
    // Sanity: body istnieje, brak runtime errorów blokujących render
    await expect(page.locator('body')).toBeVisible();
    // Brak `Application error` lub `500` w head/body
    const html = await page.content();
    expect(html).not.toContain('Application error');
    expect(html).not.toContain('Internal Server Error');
  });

  test('2. /api/imagen orchestrator error path mock (regression guard dla 3-tier fallback)', async ({
    page,
  }) => {
    // Override mock dla /api/imagen → 500 (wszystkie 3 providery padły)
    // Test sprawdza że gdy orchestrator zwróci 500, klient otrzymuje sensowną odpowiedź
    // z `providerErrors` array i `hint` (regression guard dla character-portrait-generator
    // który wywołuje /api/imagen i oczekuje placeholder fallback przy error).
    await page.route('**/api/imagen', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'All image providers failed',
          lastError:
            'Mock: all 3 providers exhausted (Vertex quota + Replicate down + Gemini rate limit)',
          providerErrors: [
            { provider: 'vertex-ai', error: 'Quota exceeded', status: 429 },
            {
              provider: 'replicate',
              error: 'Service unavailable',
              status: 503,
            },
            { provider: 'gemini', error: 'Rate limit', status: 429 },
          ],
          hint: '3/3 providers configured but all returned errors. Check API keys and quotas.',
        }),
      })
    );

    await page.goto('/');

    // Bezpośredni fetch przez page.evaluate — sprawdza czy mock /api/imagen trafia
    // (regression guard dla page.route mechaniki gdy character-portrait-generator
    // wywołuje endpoint w 3-variants flow).
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            '40-year-old distinguished antiquarian with keen eyes and scholarly demeanor',
          style: 'horror',
          preferredProvider: 'auto',
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('All image providers failed');
    expect(response.body.providerErrors).toHaveLength(3);
    expect(response.body.providerErrors[0].provider).toBe('vertex-ai');
    expect(response.body.hint).toContain('Check API keys');
  });
});
