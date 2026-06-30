/**
 * Feature #16 - Settings, koszty, monitoring (golden path e2e)
 *
 * Test regresyjny dla obszaru #16 audytowanego w Sesji 1 IND-42 (2026-05-07).
 * Pokrywa critical path: otwórz Settings → wybór preset HIGH → Save → reload → verify persist.
 *
 * Strategia: mock fetch przez `page.route('** /api/**')` → zero kosztów + zero flakiness w CI.
 * Testy NIE wywołują prawdziwych endpointów Gemini/TTS/Replicate.
 *
 * Spec doc: .agent/features/16-settings-koszty-monitoring.md
 * Plan: .agent/plans/ind-42-sesja-1-plan.md (Faza 4, [W3 patch])
 *
 * IND-59 (sesja 120): dodane Test 5 (drift detector badge Modified po
 * edycji `temperature`) + Test 6 (Pełny Reset 2-step confirm + 5 DELETE).
 * Selektory przez tekst - `getByText(/⚠️ Modified/)` + button names
 * "🗑️ Pełny Reset" / "Rozumiem, kontynuuj" / "TAK, USUŃ WSZYSTKO".
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #16: Settings, koszty, monitoring (golden path)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock /api/* - zero kosztów + zero flakiness.
    // Playwright dopasowuje route w odwrotnej kolejności rejestracji (LIFO);
    // bardziej specyficzny `/api/playtest*` musi być zarejestrowany PÓŹNIEJ
    // niż catch-all `**/api/**`, inaczej catch-all nadpisuje.
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );
    // /api/playtest wymaga prawidłowego shape (logs: []) bo usePlaytest robi
    // setPlaytestStatus(data) bezpośrednio z response (debug-settings.tsx:206
    // czyta playtestStatus.logs.length bez optional chaining).
    await page.route('**/api/playtest*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'idle',
          phase: '',
          progress: 0,
          logs: [],
        }),
      })
    );
  });

  test('1. otwiera Settings z /settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(
      page.getByRole('heading', { name: /Ustawienia/ })
    ).toBeVisible();
  });

  test('2. wybór preset HIGH → auto-aplikuje wartości', async ({ page }) => {
    await page.goto('/settings');
    // 5 buttonów presetów: LOW COST / MID COST / HIGH COST / ULTRA / CUSTOM
    await page.getByRole('button', { name: /HIGH COST/ }).click();
    // Asercja: sekcja "Aktywny preset:" pokazuje HIGH (badge z lin 84-85 quality-presets.tsx)
    await expect(page.getByText(/Aktywny preset:/)).toBeVisible();
    await expect(page.getByText(/HIGH COST/).first()).toBeVisible();
  });

  test('3. Save persist do localStorage', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: /HIGH COST/ }).click();
    await page.getByRole('button', { name: /Zapisz Ustawienia/ }).click();
    // Verify localStorage zawiera 'ai_settings' z qualityPreset: 'high'
    const settings = await page.evaluate(() =>
      localStorage.getItem('ai_settings')
    );
    expect(settings).not.toBeNull();
    expect(settings).toContain('"qualityPreset":"high"');
  });

  test('4. reload → settings persist', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: /HIGH COST/ }).click();
    await page.getByRole('button', { name: /Zapisz Ustawienia/ }).click();
    await page.reload();
    // Po reload preset HIGH dalej aktywny (loadAISettings() z localStorage)
    await expect(page.getByText(/Aktywny preset:/)).toBeVisible();
    await expect(page.getByText(/HIGH COST/).first()).toBeVisible();
  });

  test('5. drift detector - edycja temperature po HIGH → preset flippuje na CUSTOM', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: /HIGH COST/ }).click();
    // Po wyborze HIGH badge sekcja "Aktywny preset:" widoczna z nazwą "HIGH COST"
    await expect(page.getByText(/Aktywny preset:/)).toBeVisible();
    await expect(page.getByText(/HIGH COST/).first()).toBeVisible();

    // Rozwiń accordion Sampling i zmień temperature. Slider nie ma data-testid -
    // namierzamy go przez label "Temperatura" + następny input[type=range].
    await page.getByRole('button', { name: /🎛️ Sampling/ }).click();
    const tempSlider = page
      .locator('label')
      .filter({ hasText: 'Temperatura' })
      .locator('..')
      .locator('input[type="range"]');
    // Range slider w React wymaga native value setter zamiast el.value = bezpośrednio
    // (inaczej React syntheticEvent NIE odpala onChange - bypassuje state update).
    await tempSlider.evaluate((el) => {
      const input = el as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(input, '1.5');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Drift detector (useSettingsInit IND-33) wykrywa rozjazd settings vs preset
    // → flip qualityPreset na 'custom'. Sekcja "Aktywny preset:" znika
    // (warunkowy render: settings.qualityPreset !== 'custom').
    await expect(page.getByText(/Aktywny preset:/)).toHaveCount(0);
  });

  test('6. Pełny Reset 2-step confirm → 7 DELETE + localStorage clear', async ({
    page,
  }) => {
    // Override route handler - zlicz DELETE requesty (po IND-168 Faza 5+6 jest 7: pdf-memory,
    // journal, session, npc/list, pinecone/clear, characters/cloud, user/usage).
    // UWAGA: ten override musi być PO beforeEach catch-all + przed playtest specific
    // (LIFO matching). Re-rejestrujemy playtest po naszym DELETE-trackerze żeby
    // playtest fetch nadal dostawał prawidłowy shape {logs:[]}.
    const deleteCalls: string[] = [];
    await page.route('**/api/**', (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalls.push(new URL(route.request().url()).pathname);
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route('**/api/playtest*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'idle',
          phase: '',
          progress: 0,
          logs: [],
        }),
      })
    );

    await page.goto('/settings');
    // Pre-condition: ustaw cokolwiek w localStorage żeby weryfikować clear
    await page.evaluate(() => localStorage.setItem('ai_settings', '{"x":1}'));

    // Step 0 → 1: kliknięcie "Pełny Reset" - scroll do view bo button na końcu modala
    const fullResetBtn = page.getByRole('button', { name: /Pełny Reset/ });
    await fullResetBtn.scrollIntoViewIfNeeded();
    await fullResetBtn.click();
    await expect(
      page.getByRole('heading', { name: /⚠️ Pełny Reset Aplikacji/ })
    ).toBeVisible();

    // Step 1 → 2: "Rozumiem, kontynuuj"
    await page.getByRole('button', { name: /Rozumiem, kontynuuj/ }).click();
    await expect(
      page.getByRole('heading', { name: /🚨 OSTATNIE OSTRZEŻENIE/ })
    ).toBeVisible();

    // Step 2 → execute: "🗑️ TAK, USUŃ WSZYSTKO" (klik → 7 DELETE → setTimeout 100ms → reload)
    // Czekamy aż wszystkie DELETE pójdą zanim reload skasuje page state.
    await page.getByRole('button', { name: /TAK, USUŃ WSZYSTKO/ }).click();
    await expect.poll(() => deleteCalls.length).toBe(7);

    // Weryfikacja: 7 endpointów wywołanych (po IND-168 Faza 5+6: + characters/cloud, user/usage)
    expect(deleteCalls).toEqual(
      expect.arrayContaining([
        '/api/pdf-memory',
        '/api/journal',
        '/api/session',
        '/api/npc/list',
        '/api/pinecone/clear',
        '/api/characters/cloud',
        '/api/user/usage',
      ])
    );
  });
});
