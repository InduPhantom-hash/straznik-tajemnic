import { test, expect } from '@playwright/test';

for (const locale of ['pl', 'en'] as const) {
  test(`desktop update settings and available release - ${locale}`, async ({ page }) => {
    let startRequests = 0;
    await page.route('**/api/desktop/update/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          configured: true,
          currentVersion: '0.9.3',
          canSelfUpdate: true,
          manifest: { version: '0.9.4', releaseNotes: 'https://example.com/releases/0.9.4' },
        }),
      });
    });
    await page.route('**/api/desktop/update/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'none', state: 'idle', updatedAt: '1970-01-01T00:00:00.000Z' }) });
    });
    await page.route('**/api/desktop/update/start', async (route) => {
      startRequests += 1;
      await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ started: true, pid: 123 }) });
    });
    await page.goto(`/${locale}/settings`);
    const panel = page.getByTestId('update-settings');
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: locale === 'pl' ? 'Sprawdź teraz' : 'Check now' }).click();
    await expect(panel).toContainText('0.9.4');
    const updateButton = panel.getByRole('button', { name: locale === 'pl' ? 'Aktualizuj i uruchom ponownie' : 'Update and restart' });
    await expect(updateButton).toBeVisible();
    await updateButton.click();
    await expect.poll(() => startRequests).toBe(1);
    await panel.screenshot({ path: `test-results/desktop-update-${locale}.png` });
  });

  test(`shows updater result only once after restart - ${locale}`, async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('update-result-test-initialized')) {
        localStorage.removeItem('zew-update-result-seen');
        sessionStorage.setItem('update-result-test-initialized', '1');
      }
    });
    await page.route('**/api/desktop/update/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'op-0.9.4-1', state: 'succeeded', version: '0.9.4', message: 'update installed', updatedAt: '2026-09-12T12:00:00.000Z' }),
      });
    });
    await page.goto(`/${locale}/settings`);
    const notification = page.getByTestId('desktop-update-notification');
    await expect(notification).toContainText(locale === 'pl' ? 'Aktualizacja zakończona pomyślnie' : 'Update completed successfully');
    await page.keyboard.press('Escape');
    await notification.getByRole('button', { name: locale === 'pl' ? 'Zamknij' : 'Close' }).click();
    await page.reload();
    await expect(notification).toHaveCount(0);
  });
}
