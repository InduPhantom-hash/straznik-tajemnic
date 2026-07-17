/**
 * Feature #14 — AI GM chat orkiestracja (regresja smoke)
 *
 * Test regresyjny dla obszaru #14 audytowanego w Sesji 3 IND-42 (2026-05-07).
 * Pokrywa critical path: page renders → /api/chat error path mock guard.
 *
 * Strategia: mock fetch przez `page.route('** /api/**')` — zero kosztów Gemini/Pinecone.
 * Testy NIE wywołują prawdziwego /api/chat (tokeny + SSE streaming).
 *
 * Pominięte (świadomie minimal scope per W4 patch z plan-review):
 *  - Pełen happy path SSE streaming (Content-Type: text/event-stream + chunks data:...\n\n,
 *    forcefit przez page.route trudny — osobny ticket follow-up dla pełnego e2e SSE)
 *  - Real Gemini/Pinecone integration (wymaga API keys + rate limits)
 *  - Save turn fire-and-forget (Pinecone upsert, race condition w CI)
 * Powód: scope sesji audytowej = SMOKE regresji (czy UI nie wisi, czy mock /api/chat trafia),
 * NIE pełna integracja chat flow.
 *
 * Spec doc: .agent/features/14-ai-gm-chat.md
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #14: AI GM chat orkiestracja (regresja smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all /api/** — zero kosztów Gemini + zero flakiness.
    // Default 200 success, T2 nadpisuje dla error path.
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );
  });

  test('1. strona główna renderuje się bez crash (chat UI fundament)', async ({
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

  test('2. /api/chat error path mock działa (regression guard dla mock route)', async ({
    page,
  }) => {
    // Override mock dla /api/chat → 500 (error path)
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Mock server error', details: 'test' }),
      })
    );

    await page.goto('/');

    // Bezpośredni fetch przez page.evaluate — sprawdza czy mock /api/chat trafia
    // (W4 patch z plan-review — regression guard dla page.route mechaniki,
    //  bez forcefit SSE happy path).
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test message',
          character: null,
          messages: [],
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Mock server error');
  });
});
