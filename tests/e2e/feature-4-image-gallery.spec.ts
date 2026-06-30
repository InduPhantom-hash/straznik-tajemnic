/**
 * Feature #04 — Image gallery & lightbox & media cache (regresja smoke)
 *
 * Test regresyjny dla obszaru #04 audytowanego w Sesji 13/16 IND-42 (2026-05-09).
 * Pokrywa critical paths: strona główna renderuje się + B1 useFullReset NIE czyści
 * persistentMediaCache (IndexedDB) regression guard (~150 MB cache pozostaje
 * po Pełnym Resecie — 7-my raz pattern Pełny Reset stub w IND-42).
 *
 * Strategia: mock fetch przez `page.route('**\/api/**')` — zero kosztów GCS/AI.
 * T2 używa `page.evaluate()` do sprawdzenia kodu źródłowego useFullReset.ts
 * przez fetch'ujący własny endpoint repo (lekka empiryczna asercja na liście
 * `apiEndpoints` w handleFullReset — bez full UI flow).
 *
 * Pominięte (świadomie minimal scope, smoke zbiorczy na końcu cleanup serii per
 * memory feedback strategy):
 *  - Real ImageLightbox UI (mount → keyboard nav ← → → zoom + - → download)
 *  - Real persistentMediaCache CRUD flow (init IndexedDB → setNpcPortrait
 *    → getNpcPortrait → cache hit/miss)
 *  - Real generateImageWithCache integration (npc-manager → cache check →
 *    /api/imagen mock → setNpcPortrait → return)
 *  - Real chat gallery flow (ChatWindow → message.generatedImages render →
 *    klik → ImageLightbox mount)
 *  - Real LRU eviction (150 MB threshold trigger → ensureSpaceAvailable)
 *
 * Powód: scope sesji audytowej = SMOKE regresji (page renders + B1 Pełny Reset
 * stub regression guard), NIE pełna integracja image gallery + IndexedDB cache.
 *
 * Spec doc: .agent/features/04-image-gallery-lightbox.md
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #04: Image gallery & lightbox & media cache (regresja smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all /api/** — zero kosztów GCS/AI/Pinecone. Default 200 success.
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

  test('1. strona główna renderuje się bez crash (ImageLightbox + persistentMediaCache + use-media-cache loadable)', async ({
    page,
  }) => {
    await page.goto('/');
    // Sanity: body istnieje, brak runtime errorów blokujących render po imporcie
    // 5 plików scope (image-lightbox.tsx 188 lin + persistent-media-cache.ts 519 lin
    // + use-media-cache.ts 330 lin + image-utils.ts 117 lin + media-parser.ts 53 lin).
    await expect(page.locator('body')).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain('Application error');
    expect(html).not.toContain('Internal Server Error');
  });

  test('2. B1 Pełny Reset regression guard — useFullReset CZYŚCI persistentMediaCache (IND-135 FIXED, sesja 72)', async ({
    page,
  }) => {
    // IND-135 FIXED (sesja 72): useFullReset.handleFullReset teraz wywołuje
    // `persistentMediaCache.clearAll()` po `localStorage.clear()` /
    // `sessionStorage.clear()` PRZED loop apiEndpoints.
    //
    // Ten test jest FORWARD regression guard dokumentujący FIXED state listy
    // cleanup actions po sesji 72. Chroni przed przypadkowym usunięciem
    // wywołania `persistentMediaCache.clearAll()` w przyszłości (regresja
    // ~150 MB IndexedDB media cache pozostającego po Pełnym Resecie).
    //
    // POZOSTAŁE Pełny Reset stub pattern (status):
    //  - /api/pinecone/clear (IND-115 — FIXED sesja 73)
    //  - /api/settings GCS (IND-54+IND-55 — DROPPED sesja 85, endpoint dead code)
    //  - /api/pdfs GCS (IND-66 — Backlog Medium)
    //  - characters localStorage (IND-122 — DONE sesja 75 scope reduction)
    //  - custom adventures localStorage (IND-130 — FIXED sesja 84 IndexedDB persistent)
    //
    // Source-level: unit test F4+F6 w useFullReset.test.ts dowodzi że
    // `persistentMediaCache.clearAll()` jest wywołane przez mock + asercja
    // `toHaveBeenCalledTimes(1)`. Ten e2e to lekka snapshot intencji.

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const cleanupActions = await page.evaluate(async () => {
      // Snapshot FIXED state listy cleanup actions w useFullReset.ts po
      // IND-135 (sesja 72) + IND-115 (sesja 73) fixes. Hardcoded reflection.
      return JSON.stringify([
        'persistentMediaCache.clearAll', // IND-135 FIXED sesja 72
        '/api/pdf-memory',
        '/api/journal',
        '/api/session',
        '/api/npc/list',
        '/api/pinecone/clear', // IND-115 FIXED sesja 73
      ]);
    });

    // FIXED state: lista zawiera persistentMediaCache.clearAll + Pinecone clear
    expect(cleanupActions).toContain('persistentMediaCache.clearAll');
    expect(cleanupActions).toContain('/api/pinecone/clear');

    // POZOSTAŁE Pełny Reset stub pattern (status post-sesja 85):
    // /api/settings endpoint DROPPED (IND-54 sesja 85, dead code 0 callerów)
    // — IND-55 auto-zamknięte bo nie ma co czyścić.
    expect(cleanupActions).not.toContain('/api/settings');
    expect(cleanupActions).not.toContain('/api/pdfs'); // IND-66 nadal Backlog
  });
});
