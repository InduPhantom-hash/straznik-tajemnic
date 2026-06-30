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
    
    // Check if action cards are displayed
    await expect(page.getByText('Stwórz Postać')).toBeVisible();
    await expect(page.getByText('Rozpocznij Kampanię')).toBeVisible();
    await expect(page.getByText('Przeglądaj Bestiariusz')).toBeVisible();
    await expect(page.getByText('System Kości')).toBeVisible();
    await expect(page.getByText('Dziennik Gracza')).toBeVisible();
    await expect(page.getByText('Wiedza Tajemna')).toBeVisible();
  });

  test('should navigate to character creation page', async ({ page }) => {
    await page.goto('/');
    
    // Click on character creation card
    await page.getByRole('link', { name: /Stwórz Postać/ }).click();
    
    // Verify navigation to character creation page
    await expect(page).toHaveURL('/characters/new');
    await expect(page.getByRole('heading', { name: 'Stwórz Nową Postać' })).toBeVisible();
  });

  test('should navigate to dice system page', async ({ page }) => {
    await page.goto('/');
    
    // Click on dice system card
    await page.getByRole('link', { name: /System Kości/ }).click();
    
    // Verify navigation to dice system page
    await expect(page).toHaveURL('/dice');
    await expect(page.getByRole('heading', { name: 'System Kości' })).toBeVisible();
  });
});
