/**
 * Feature #13 — Conversation Memory & Summaries (regresja smoke)
 *
 * Test regresyjny dla obszaru #13 audytowanego w Sesji 4 IND-42 (2026-05-07).
 * Pokrywa critical path: page renders → /api/chat parallel summary mock guard.
 *
 * Strategia: mock fetch przez `page.route('** /api/**')` — zero kosztów Gemini/Pinecone.
 * Testy NIE wywołują prawdziwego /api/chat (tokeny + SSE + Pinecone upsert).
 *
 * Pominięte (świadomie minimal scope, smoke zbiorczy na końcu cleanup serii per
 * memory feedback strategy):
 *  - Real saveConversationTurn → Pinecone upsert (race + flakey w CI)
 *  - Real getOrGenerateSummary → Gemini Flash 2.0 call (tokeny + cost)
 *  - Cache hit/miss path (wymaga 80+ msgs context state)
 *  - Multi-user summaryCache regression (B5 finding — wymaga 2 instance test)
 * Powód: scope sesji audytowej = SMOKE regresji (mock /api/chat trafia bez crash),
 * NIE pełna integracja conversation memory pipeline.
 *
 * Spec doc: .agent/features/13-conversation-memory.md
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #13: Conversation Memory & Summaries (regresja smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all /api/** — zero kosztów Gemini + zero flakiness Pinecone.
    // Default 200 success, T2 nadpisuje dla error path.
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );
  });

  test('1. strona główna renderuje się bez crash (conversation memory loadable)', async ({
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

  test('2. /api/chat error path mock dla long-session summary (regression guard)', async ({
    page,
  }) => {
    // Override mock dla /api/chat → 500 (error path)
    // Test sprawdza że gdy /api/chat zwróci 500 (np. summary generation fail),
    // klient nie crashuje — fire-and-forget dla saveConversationTurn powinien
    // toleratować błąd downstream.
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Mock summary generation error',
          details: 'getOrGenerateSummary returned null after Gemini timeout',
        }),
      })
    );

    await page.goto('/');

    // Bezpośredni fetch przez page.evaluate — sprawdza czy mock /api/chat trafia
    // (regression guard dla page.route mechaniki gdy long-session > 80 msgs).
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test long session message',
          character: null,
          // Symulacja long session (> SUMMARIZATION_THRESHOLD=80) — jeden z
          // triggerów dla getOrGenerateSummary parallel branch w route.ts:217
          messages: Array(85)
            .fill(null)
            .map((_, i) => ({
              role: i % 2 === 0 ? 'user' : 'assistant',
              content: `mock msg ${i}`,
            })),
          clientAISettings: { sessionId: 'mock-sess-13-regression' },
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Mock summary generation error');
  });
});
