import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Visual Player Simulation E2E Test (Obowiązkowy Test Gracza)
 *
 * Zgodnie z nową regułą skilla aios-vibe-coder:
 * 1. Playwright uruchamia aplikację, wchodzi w rolę gracza (symulacja sesji z mockiem AI).
 * 2. Przeklikuje kluczowe panele (Szybki Start, wybór postaci, czat z MG, ekwipunek).
 * 3. Żelazne warunki wejścia:
 *    - Zero błędów w konsoli (brak console.error, TypeError, Unhandled, ReferenceError).
 *    - Screenshot Evidence zapisany do test-results/player-simulation.png potwierdzający
 *      renderowanie elementów i przeliczeń.
 */

test.describe('Visual Player Simulation - Obowiązkowy Test Gracza E2E', () => {
  test.setTimeout(90000);

  test('Symulacja gracza: Szybki Start -> Rozmowa z MG -> Ekwipunek -> Screenshot', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Nasłuch na błędy konsoli i nieobsłużone wyjątki
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[console.error] ${msg.text()}`);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(`[pageerror] ${err.name || 'Error'}: ${err.message || String(err)}`);
    });

    // Inicjalizacja localStorage (PL, pominięcie onboardingów, odblokowanie zasad i kluczy API)
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('language_selected', 'pl');
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('rules_onboarding_completed', 'true');
      localStorage.setItem('straznik_beta_welcome_dismissed', 'true');
      localStorage.setItem('coc7_rulebook_profile', 'starter-d100');
      localStorage.setItem('coc7_rulebook_title', 'Starter CoC 7e');
      localStorage.setItem(
        'zew-app-api-keys',
        JSON.stringify({ gemini: 'mock-key', GEMINI_API_KEY: 'mock-key' })
      );
      localStorage.setItem('health_check_last_run', String(Date.now()));
    });

    const gmNarration = 'Rozglądasz się po gabinecie. Na biurku leży stary list. [Co robisz?]';

    // Mock tras sieciowych Playwright (żelazny warunek: bramka zasad BYOB i strumień czatu MG)
    await page.route('**/api/desktop/update/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'none', state: 'idle', updatedAt: '1970-01-01T00:00:00.000Z' }),
      });
    });

    await page.route('**/api/desktop/update/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: false, currentVersion: '0.9.5' }),
      });
    });

    await page.route('**/api/pdf/ingest-local*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recordCount: 150,
          rulebookProfile: { profile: 'starter-d100', title: 'Starter CoC 7e' },
        }),
      });
    });

    await page.route('**/api/chat**', async (route) => {
      if (route.request().url().includes('/api/chat-test')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, tier: 'free' }),
        });
        return;
      }

      const sseBody = [
        `data: ${JSON.stringify({ text: gmNarration })}\n\n`,
        `data: ${JSON.stringify({
          type: 'metadata',
          illustrations: [],
          dialogues: [],
          costData: { totalTokens: 50 },
        })}\n\n`,
      ].join('');

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseBody,
      });
    });

    // 1. Otwarcie strony głównej
    await page.goto('/pl');
    await page.waitForLoadState('domcontentloaded');

    // Zamknięcie ewentualnych modalów wstępnych (np. podręcznik lub beta)
    const modalCloseButtons = page.locator(
      'button:has-text("Przejdź do gry"), button:has-text("Rozumiem"), button[aria-label="Close"]'
    );
    if (await modalCloseButtons.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await modalCloseButtons.first().click();
    }

    // 2. Kliknięcie w Szybki Start (Quick Setup)
    const quickSetupBtn = page.locator('[data-testid="btn-quick-setup"]');
    await expect(quickSetupBtn).toBeVisible({ timeout: 15000 });
    await quickSetupBtn.click();

    // 3. Wybór postaci w QuickSetupModal
    const quickModal = page.locator('[data-testid="quick-setup-modal"]');
    await expect(quickModal).toBeVisible({ timeout: 10000 });

    const firstCharCard = quickModal.locator('.aspect-\\[3\\/4\\]').first();
    await expect(firstCharCard).toBeVisible({ timeout: 5000 });
    await firstCharCard.click();

    const startAdventureBtn = quickModal.getByRole('button', { name: /Rozpocznij przygodę|Start/i });
    await expect(startAdventureBtn).toBeEnabled({ timeout: 5000 });
    await startAdventureBtn.click();

    // Upewnij się, że QuickSetupModal zniknął
    await expect(quickModal).toBeHidden({ timeout: 5000 });

    // 4. Obsługa ekranu wejścia do gry (TTSHardLoadingScreen / Enter CTA)
    const enterCta = page.locator('[data-testid="loading-screen-enter-cta"]');
    await expect(enterCta).toBeVisible({ timeout: 30000 });
    await enterCta.click();
    await expect(enterCta).toBeHidden({ timeout: 5000 });

    // 5. Weryfikacja wejścia do okna czatu i interakcja gracza
    const chatInput = page.locator('textarea[placeholder*="Mistrza Gry"], textarea[placeholder*="wiadomość"], textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 20000 });

    await chatInput.fill('Rozglądam się uważnie po pokoju i badam biurko.');
    await chatInput.press('Enter');

    // Odebranie narracji MG
    await expect(page.locator('body')).toContainText('Rozglądasz się po gabinecie', { timeout: 15000 });

    // 6. Otwarcie panelu bocznego (Ekwipunek)
    const eqBtn = page.locator('[data-testid="btn-open-equipment"]');
    await expect(eqBtn).toBeVisible({ timeout: 10000 });
    await eqBtn.click();

    const eqModal = page.locator('[data-testid="equipment-modal"]');
    await expect(eqModal).toBeVisible({ timeout: 10000 });

    // Przełączenie na zakładkę Wyposażenie (żeby pokazać listę przedmiotów badacza)
    const gearTab = eqModal.getByRole('button', { name: /WYPOSAŻENIE/i });
    if (await gearTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await gearTab.click();
    }

    // Asercja na widoczność kluczowych elementów przed zrzutem ekranu
    const financeBar = page.locator('[data-testid="equipment-finance-bar"]');
    await expect(financeBar).toBeVisible({ timeout: 5000 });
    await expect(eqModal.locator('.font-serif').first()).toBeVisible({ timeout: 5000 });

    // 7. Zapisanie zrzutu ekranu jako dowodu (Screenshot Evidence)
    const resultsDir = path.resolve(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    const screenshotPath = path.join(resultsDir, 'player-simulation.png');
    await page.screenshot({ path: screenshotPath });

    expect(fs.existsSync(screenshotPath)).toBe(true);

    // 8. Żelazny warunek wejścia: zero błędów w konsoli przeglądarki i unhandled exceptions
    const fatalErrors = consoleErrors.filter((err) => {
      // Ignoruj komunikaty systemowe/przeglądarkowe Chromium (np. brak polityki compute-pressure)
      if (err.includes('Permissions policy violation') || err.includes('compute-pressure')) {
        return false;
      }
      return true;
    });

    expect(fatalErrors).toEqual([]);
  });
});
