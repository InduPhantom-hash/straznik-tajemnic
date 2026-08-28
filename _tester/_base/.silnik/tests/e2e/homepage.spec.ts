import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Health-check klucza (IND-273): bez mocka realny endpoint zwraca blad ->
    // onInvalidKey otwiera ApiKeysModal, ktory (Radix modal) ustawia aria-hidden
    // na calym tle i ukrywa naglowek glowny przed asercjami.
    await page.route('**/api/health/gemini**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ keyValid: true, registry: { chatModelsMissing: [] } }),
      })
    );
    // Mock local storage to pass onboarding api key check
    await page.addInitScript(() => {
      localStorage.setItem('zew-app-api-keys', JSON.stringify({ GEMINI_API_KEY: 'mock' }));
      localStorage.setItem('onboarding_completed', 'true');
      // Bramka językowa (next-intl) - bez tego LanguageSelectionModal zasłania ekran.
      localStorage.setItem('language_selected', 'pl');
    });
  });

  test('should display main navigation and action cards', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/pl');

    // Dev-mode potrafi kompilowac trase przy pierwszym hicie - czekamy na siec.
    await page.waitForLoadState('networkidle');

    // Check the restored welcome design directly.
    await expect(page.getByRole('heading', { name: /Strażnik/i })).toBeVisible();
    await expect(page.getByText('Pierwsze uruchomienie')).toHaveCount(0);
    
    // Check if new start mode cards are displayed
    await expect(page.getByText('Szybka Przygoda')).toBeVisible();
    await expect(page.getByText('Ustawienia Ręczne')).toBeVisible();
  });
});
