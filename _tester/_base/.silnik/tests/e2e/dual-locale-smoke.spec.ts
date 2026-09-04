import { expect, test, type Page } from '@playwright/test';

/**
 * Dual-Locale Smoke Test dla Strażnika Tajemnic AI.
 *
 * Cel:
 * Błyskawiczna weryfikacja stabilności runtime po czystym starcie (clean state):
 * 1. Otwarcie gry w języku angielskim (/en) i polskim (/pl).
 * 2. Przejście do Manual Setup i wybór gotowej postaci (predefined character).
 * 3. Nasłuch na błędy konsoli przeglądarki - wyłapanie awarii typu:
 *    - "equipment.map is not a function"
 *    - "TypeError"
 *    - Niezłapane wyjątki renderowania (Uncaught Error).
 */

async function setupPageLocale(page: Page, locale: 'pl' | 'en') {
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  await page.addInitScript((selectedLocale) => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', selectedLocale);
    localStorage.setItem(
      'zew-app-api-keys',
      JSON.stringify({ gemini: 'mock-key', GEMINI_API_KEY: 'mock-key' })
    );
    localStorage.setItem('health_check_last_run', String(Date.now()));
  }, locale);

  return { consoleErrors };
}

test.describe('Dual-Locale Smoke Test - Runtime & i18n Error Detection', () => {
  test('EN: Manual Setup opens and selects predefined character without runtime errors', async ({ page }) => {
    const { consoleErrors } = await setupPageLocale(page, 'en');

    await page.goto('/en');
    const manualSetupBtn = page.locator('[data-testid="btn-manual-setup"]');
    await expect(manualSetupBtn).toBeVisible({ timeout: 15000 });
    await manualSetupBtn.click();

    const setupPanel = page.locator('[data-testid="manual-setup-panel"]');
    await expect(setupPanel).toBeVisible({ timeout: 10000 });

    // Przycisk "Select ready character" w panelu Manual Setup
    const selectPremadeBtn = setupPanel.getByRole('button', { name: /Select ready|selectPremade/i }).first();
    await expect(selectPremadeBtn).toBeVisible();
    await selectPremadeBtn.click();

    // Dialog wyboru gotowej postaci
    const dialog = page.getByRole('dialog').last();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Wybór pierwszej karty postaci w modalnym selektorze
    const charOption = dialog.locator('button, [role="button"], .cursor-pointer').first();
    await expect(charOption).toBeVisible();
    await charOption.click();

    // Weryfikacja: zero fatalnych wyjątków runtime w konsoli przeglądarki
    const fatalErrors = consoleErrors.filter((err) =>
      err.includes('.map is not a function') ||
      err.includes('TypeError') ||
      err.includes('Uncaught')
    );
    expect(fatalErrors).toEqual([]);
  });

  test('PL: Manual Setup otwiera się i wybiera postać bez błędów runtime', async ({ page }) => {
    const { consoleErrors } = await setupPageLocale(page, 'pl');

    await page.goto('/pl');
    const manualSetupBtn = page.locator('[data-testid="btn-manual-setup"]');
    await expect(manualSetupBtn).toBeVisible({ timeout: 15000 });
    await manualSetupBtn.click();

    const setupPanel = page.locator('[data-testid="manual-setup-panel"]');
    await expect(setupPanel).toBeVisible({ timeout: 10000 });

    // Przycisk "Wybierz gotową postać"
    const selectPremadeBtn = setupPanel.getByRole('button', { name: /Wybierz gotową|Wybierz gotowa/i }).first();
    await expect(selectPremadeBtn).toBeVisible();
    await selectPremadeBtn.click();

    // Dialog wyboru gotowej postaci
    const dialog = page.getByRole('dialog').last();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Wybór pierwszej karty postaci
    const charOption = dialog.locator('button, [role="button"], .cursor-pointer').first();
    await expect(charOption).toBeVisible();
    await charOption.click();

    // Weryfikacja: zero fatalnych wyjątków runtime w konsoli przeglądarki
    const fatalErrors = consoleErrors.filter((err) =>
      err.includes('.map is not a function') ||
      err.includes('TypeError') ||
      err.includes('Uncaught')
    );
    expect(fatalErrors).toEqual([]);
  });
});
