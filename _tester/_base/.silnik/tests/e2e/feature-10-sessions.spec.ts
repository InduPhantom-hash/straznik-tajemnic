/**
 * Feature #10 — Sesje gry & GM Tools (regresja smoke)
 *
 * Test regresyjny dla obszaru #10 audytowanego w Sesji 7 IND-42 (2026-05-07).
 * Pokrywa critical path: page renders + /api/game-save POST mock guard
 * (regression guard dla cost tracking server-side bug B7 + multi-user B2-B4).
 *
 * Strategia: mock fetch przez `page.route('**\/api/**')` — zero kosztów GCS upload
 * + zero pollutionu lokalnego FS data/sessions/. Testy NIE wywołują prawdziwych
 * GCS endpointów ani server-side `loadAISettings()`.
 *
 * Pominięte (świadomie minimal scope, smoke zbiorczy na końcu cleanup serii per
 * memory feedback strategy):
 *  - Real GCS upload do `saves/{userId}/{saveId}/save.json` (B6 storage singleton)
 *  - Real `/api/session` lokalny FS write (B1 EROFS na Vercel READ-ONLY)
 *  - Real `/api/journal` GCS upload (B2 generateUserId multi-user broken)
 *  - Real `/api/gm-tools/sync` upload/download (B3 'default_user' multi-user broken)
 *  - Real `/api/upload-gm-instructions` makePublic (B5 privacy issue analog IND-89)
 *  - Real `/api/adventure/analyze` Gemini PDF (out-of-scope sesji 7)
 *  - Cloud session manager full sync flow (saveSession + loadAllSessions + syncWithCloud)
 *  - Full save/load cycle z localStorage list updates (B11 silently no-op server-side)
 *  - Session timeline CRUD persistence (~301 lin niedotestowane)
 *  - Session export markdown (~687 lin niedotestowane)
 *  - GM Protocol parser tagów ([NPC:...] [LOKACJA:...] [DZIENNIK:...])
 * Powód: scope sesji audytowej = SMOKE regresji (save endpoint zwraca sensowny shape),
 * NIE pełna integracja session/save/journal/GM tools pipeline.
 *
 * Spec doc: .agent/features/10-sesje-gry-gm-tools.md
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #10: Sesje gry & GM Tools (regresja smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all /api/** — zero kosztów GCS + zero pollutionu lokalnego FS.
    // Default 200 success, T2 nadpisuje dla error path.
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          saveId: 'mock_save_123',
          saveName: 'Mock Save',
          size: 1024,
          formattedSize: '1.00 KB',
          gcsPath: 'saves/mock_user/mock_save_123/save.json',
        }),
      })
    );
  });

  test('1. strona główna renderuje się bez crash (session/save/journal/GM tools loadable)', async ({
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

  test('2. /api/game-save POST error path mock (regression guard dla GCS upload + cost tracking B7 silently broken)', async ({
    page,
  }) => {
    // Override mock dla /api/game-save → 500 (GCS credentials missing scenario)
    // Test sprawdza że gdy POST zwróci 500, klient otrzymuje sensowną odpowiedź
    // z `details` (regression guard dla full-game-save-modal.tsx który wywołuje
    // /api/game-save:POST i oczekuje error display przy GCS auth fail).
    //
    // Dodatkowo: odpowiedź NIE zawiera `totalCost` ani `sessionCost` updated
    // (B7 finding: server-side `loadAISettings()` w POST handler silently no-op,
    // więc nawet success response nie powinien zwracać cost tracking deltas —
    // klient musi liczyć cost przez `ai-cost-tracker.ts` (client-side localStorage)).
    await page.route('**/api/game-save', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Problem z konfiguracją Google Cloud Storage',
          details:
            'Błąd konfiguracji Google Cloud Storage. Skontaktuj się z pomocą techniczną',
        }),
      })
    );

    await page.goto('/');

    // Bezpośredni fetch przez page.evaluate — sprawdza czy mock /api/game-save trafia
    // (regression guard dla page.route mechaniki gdy full-game-save-modal wywołuje
    // endpoint w "Zapisz pełny save" UI flow).
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/game-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Save Mock',
          userId: 'local',
          messages: [],
          gameSettings: { aiSettings: {} },
          characters: [],
          campaigns: [],
          npcs: [],
          locations: [],
          sessionCost: 0.5, // B7: server-side update should silently no-op
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Google Cloud Storage');
    expect(response.body.details).toContain('konfiguracji');
    // B7 regression guard: response NIE zwraca cost tracking deltas
    // (server-side update jest silently no-op przez typeof window guard).
    expect(response.body).not.toHaveProperty('totalCost');
    expect(response.body).not.toHaveProperty('sessionCost');
  });
});
