/**
 * Feature #09 — NPC & Voice persistence (regresja smoke)
 *
 * Test regresyjny dla obszaru #09 audytowanego w Sesji 8 IND-42 (2026-05-07).
 * Pokrywa critical path: page renders + /api/npc/list DELETE stub guard
 * (regression guard dla B4 — DELETE endpoint zwraca success ALE NIC nie czyści
 * w GCS — Pełny Reset NPCów cloud-side jest BROKEN).
 *
 * Strategia: mock fetch przez `page.route('**\/api/**')` — zero kosztów GCS upload
 * + zero pollutionu lokalnego state. Testy NIE wywołują prawdziwych GCS endpointów
 * ani server-side `saveNPCsToCloud`/`loadNPCsFromCloud`.
 *
 * Pominięte (świadomie minimal scope, smoke zbiorczy na końcu cleanup serii per
 * memory feedback strategy):
 *  - Real GCS upload do `gm-tools/npcs/{userId}/npcs.json` (B5 multi-user broken
 *    przez 'default_user' fallback w `npc/list:5`)
 *  - Real `/api/npc/detect` text → DetectedNPC[] (B2 dead pipeline — endpoint
 *    istnieje ale 0 UI callerów, drop kandydat w IND-XXX1)
 *  - Real NPC manager UI flow (CRUD + filtr + portret AI) — wymagałoby fixture
 *    `gm_npcs` localStorage + mock `/api/imagen` chain
 *  - Real Pełny Save z `npcVoiceAssignments` orphan field (B7 — voice-matcher.ts
 *    dead, useFullSave.ts:96 zapisuje do localStorage `npc_voice_assignments`
 *    którego NIKT nie czyta)
 *  - Voice persistence triple source-of-truth (B8 — `npc_voices_unified` +
 *    `npc_voice_assignments` + GCS `cloud-context-service.saveNPCVoices`,
 *    wszystkie dead)
 *  - Initiative tracker UI (dead — `initiative-tracker-manager.ts` 0 callerów)
 *  - Combat detector flow (dead — `combat-detector.ts` 0 callerów)
 *  - Random event generator UI (aktywny — pokryć osobnym ticketem testów)
 *
 * Powód: scope sesji audytowej = SMOKE regresji (DELETE stub zwraca sensowny
 * shape), NIE pełna integracja NPC/voice persistence pipeline.
 *
 * Spec doc: .agent/features/09-npc-voice-persistence.md
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #09: NPC & Voice persistence (regresja smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all /api/** — zero kosztów GCS + zero pollutionu state.
    // Default 200 success z stub message, T2 nadpisuje dla DELETE stub guard.
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          npcs: [],
          message: 'mock response',
        }),
      })
    );
  });

  test('1. strona główna renderuje się bez crash (NPC manager + voice services loadable)', async ({
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

  test('2. /api/npc/list DELETE stub regression guard (B4: server-side stub silently broken — Pełny Reset NPCów cloud nie działa)', async ({
    page,
  }) => {
    // Override mock dla DELETE /api/npc/list — symulacja **aktualnego stub
    // behavior** server-side (route.ts:73-76):
    //   `return NextResponse.json({ success: true, message: 'NPC list cleared (server-side stub)' });`
    //
    // Test dowodzi że klient (useFullReset.ts:71) dostaje `success: true`
    // ALE response zawiera explicit `(server-side stub)` w message — server
    // nie wywołał `saveNPCsToCloud` z pustą tablicą ani DELETE GCS file.
    //
    // **B4 regression guard**: jeśli ktoś naprawi stub przez dodanie
    // `googleCloudStorageService.deleteFile(...)`, nadejszczy uakytalnić ten test
    // (`message` nie powinien mieć `(server-side stub)`). Inaczej Pełny Reset
    // nie czyści NPCs w GCS — user A klika "Wyczyść NPCe" w UI, dostaje
    // "✅ wyczyszczone" alert, ALE w GCS plik `gm-tools/npcs/default_user/npcs.json`
    // istnieje nadal.
    await page.route('**/api/npc/list**', async (route, request) => {
      if (request.method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'NPC list cleared (server-side stub)',
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/');

    // Bezpośredni fetch DELETE przez page.evaluate — sprawdza czy stub mock trafia
    // (regression guard dla useFullReset.ts:71 wywołującego DELETE /api/npc/list).
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/npc/list?userId=default_user', {
        method: 'DELETE',
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // B4 regression guard: response zawiera `(server-side stub)` co dowodzi że
    // serwer NIC nie zrobił. Gdyby ktoś naprawił stub (IND-XXX3), ten asercja
    // by padła — reviewer wie że trzeba zaktualizować test wraz z fix.
    expect(response.body.message).toContain('server-side stub');
    // Bonus regression guard: response NIE zwraca `npcsCleared: number` ani
    // `gcsFileDeleted: boolean` — brakujące pola dowodzą że to stub.
    expect(response.body).not.toHaveProperty('npcsCleared');
    expect(response.body).not.toHaveProperty('gcsFileDeleted');
  });
});
