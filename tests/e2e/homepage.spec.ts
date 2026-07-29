import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
  test('should display main navigation and action cards', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Check if main title is visible
    await expect(page.getByRole('heading', { name: 'Witaj, Badaczu Tajemnic' })).toBeVisible();
    
    // Check if sidebar navigation is present
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByText('Pulpit')).toBeVisible();
    await expect(page.getByText('Postacie')).toBeVisible();
    await expect(page.getByText('Kampanie')).toBeVisible();
    await expect(page.getByText('Bestiariusz')).toBeVisible();
    
    // Check if new start mode cards are displayed
    await expect(page.getByText('Szybka Przygoda')).toBeVisible();
    await expect(page.getByText('Ustawienia Ręczne')).toBeVisible();
  });
});
