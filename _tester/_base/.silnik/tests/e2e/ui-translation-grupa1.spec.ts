import { expect, test, type Route } from '@playwright/test';

/** Seed stanu gry w localStorage - główny interfejs z aktywnym badaczem.
 *  Uwaga: addInitScript nie przenosi domknięć - locale przekazujemy jako arg. */
function seedMainUi() {
  return (locale: string) => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', locale);
    localStorage.setItem('has_started_game', 'true');
    localStorage.setItem('session_zero_completed', 'true');
    localStorage.setItem('characters', JSON.stringify([{
      id: 'e2e-grupa1-character', name: 'E2E Investigator', occupation: 'Detective', age: 35,
      gender: 'male', str: 60, dex: 60, con: 60, app: 50, pow: 50, edu: 60, siz: 60, int: 60,
      luck: 50, hp: 12, maxHp: 12, san: 50, maxSan: 99, mp: 10, maxMp: 10,
      background: 'E2E background.', skills: {}, equipment: [], playerName: '', isActive: true,
      lastUsed: new Date().toISOString(), notes: '', experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 }, developmentHistory: [],
    }]));
    localStorage.setItem('active_character_id', 'e2e-grupa1-character');
    localStorage.setItem('zew-app-api-keys', JSON.stringify({ GEMINI_API_KEY: 'e2e-local-key' }));
    localStorage.setItem('pdf_memory', JSON.stringify({ rulesUrl: '/data/rag/rules.json' }));
  };
}

function mockApi() {
  return (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, recordCount: 1 }),
    });
}

test('main interface renders Group 1 controls in English', async ({ page }) => {
  await page.addInitScript(seedMainUi(), 'en');

  await page.route('**/api/**', mockApi());

  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Guardian of Secrets AI')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Characters', { exact: true })).toBeVisible();
  await expect(page.getByText('Character Sheet', { exact: true })).toBeVisible();
  await expect(page.getByText('Equipment', { exact: true })).toBeVisible();
  await expect(page.getByText('Adventure Journal', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Write a message to the Game Master...')).toBeVisible();
  await expect(page.getByText('Mystery of the Miskatonic Library')).toBeVisible();

  // Grupa 1: nagłówek wydania podręcznika i skróty cech po angielsku
  await expect(page.getByText('Call of Cthulhu 7ed')).toBeVisible();
  await expect(page.getByText(/^HP:/)).toBeVisible();
  await expect(page.getByText(/^SAN:/)).toBeVisible();
  await expect(page.getByText(/^MP:/)).toBeVisible();
  await expect(page.getByText(/^LCK:/)).toBeVisible();

  // Brak polskich ciągów
  await expect(page.getByText('Postacie', { exact: true })).toHaveCount(0);
  await expect(page.getByPlaceholder('Wpisz wiadomość do Mistrza Gry...')).toHaveCount(0);
  await expect(page.getByText('Zew Cthulhu 7ed')).toHaveCount(0);

  await page.screenshot({ path: 'test-results/main-ui-en.png', fullPage: true });
});

test('main interface keeps Polish rendering without regressions', async ({ page }) => {
  await page.addInitScript(seedMainUi(), 'pl');

  await page.route('**/api/**', mockApi());

  await page.goto('/pl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.getByText('Strażnik Tajemnic AI')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Postacie', { exact: true })).toBeVisible();
  await expect(page.getByText('Karta Postaci', { exact: true })).toBeVisible();
  await expect(page.getByText('Ekwipunek', { exact: true })).toBeVisible();
  await expect(page.getByText('Dziennik Przygody', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Wpisz wiadomość do Mistrza Gry...')).toBeVisible();

  // Grupa 1: polskie skróty cech i wydanie podręcznika nadal widoczne
  await expect(page.getByText('Zew Cthulhu 7ed')).toBeVisible();
  await expect(page.getByText(/^PŻ:/)).toBeVisible();
  await expect(page.getByText(/^PR:/)).toBeVisible();
  await expect(page.getByText(/^PM:/)).toBeVisible();
  await expect(page.getByText(/^SZC:/)).toBeVisible();

  // Brak angielskich wycieków
  await expect(page.getByText('Call of Cthulhu 7ed')).toHaveCount(0);
  await expect(page.getByPlaceholder('Write a message to the Game Master...')).toHaveCount(0);

  await page.screenshot({ path: 'test-results/main-ui-pl.png', fullPage: true });
});
