import { expect, test } from '@playwright/test';

test('cold start in English follows language selection, API key, then welcome', async ({ page }) => {
  await page.route('**/api/health/gemini**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ keyValid: true, registry: { chatModelsMissing: [] } }),
    })
  );
  await page.addInitScript(() => localStorage.clear());

  await page.goto('/en');
  const languageDialog = page.getByRole('dialog', { name: /choose language/i });
  await expect(languageDialog).toBeVisible();
  await languageDialog.getByRole('button', { name: 'English' }).click();

  const apiDialog = page.getByRole('dialog', { name: 'API Keys Configuration' });
  await expect(apiDialog).toBeVisible();
  await expect(page.getByText('Welcome to the game', { exact: true })).toHaveCount(0);

  await apiDialog.locator('#GEMINI_API_KEY').fill('e2e-local-key');
  await apiDialog.getByRole('button', { name: 'Save keys' }).click();
  await expect(apiDialog).toBeHidden({ timeout: 3_000 });
  await expect(page.getByText('Quick Adventure', { exact: true })).toBeVisible();
  await expect(page.getByText('Manual Setup', { exact: true })).toBeVisible();
});
