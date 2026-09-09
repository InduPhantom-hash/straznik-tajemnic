import { expect, test, type Route } from '@playwright/test';

function seedHazardUi() {
  return (locale: string) => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', locale);
    localStorage.setItem('rules_onboarding_completed', 'true');
    localStorage.setItem('has_started_game', 'true');
    localStorage.setItem('session_zero_completed', 'true');
    localStorage.setItem('characters', JSON.stringify([{
      id: 'hazard-e2e-character', name: 'Anna', occupation: 'Detective', age: 35,
      gender: 'female', str: 50, dex: 60, con: 60, app: 50, pow: 50, edu: 60,
      siz: 60, int: 60, luck: 50, hp: 12, maxHp: 12, san: 50, maxSan: 99,
      mp: 10, maxMp: 10, background: '', skills: { Skakanie: 40, Jump: 40 },
      equipment: [], playerName: '', isActive: true, lastUsed: new Date().toISOString(),
      notes: '', experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0,
        maxEarnedThisSession: 0 }, developmentHistory: [],
    }]));
    localStorage.setItem('active_character_id', 'hazard-e2e-character');
    localStorage.setItem('zew-app-api-keys', JSON.stringify({ GEMINI_API_KEY: 'e2e-local-key' }));
    localStorage.setItem('pdf_memory', JSON.stringify({ rulesUrl: '/data/rag/rules.json' }));
    localStorage.setItem('zew_chat_messages', '[]');
  };
}

function mockApi(route: Route) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, recordCount: 1 }),
  });
}

for (const locale of ['pl', 'en'] as const) {
  test(`hazard command renders a localized RAW card in chat and resolves with 1-click in ${locale}`, async ({ page }) => {
    await page.addInitScript(seedHazardUi(), locale);
    await page.route('**/api/**', mockApi);
    await page.goto(`/${locale}`);

    const input = page.getByPlaceholder(
      locale === 'pl' ? 'Wpisz wiadomość do Mistrza Gry...' : 'Write a message to the Game Master...'
    );
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill('[HAZARD]');
    await input.press('Enter');

    const cardTitle = locale === 'pl' ? 'Upadek z wysokości' : 'Falling from height';
    await expect(page.getByText(cardTitle)).toBeVisible({ timeout: 10_000 });

    const resolveBtn = locale === 'pl'
      ? page.getByRole('button', { name: /Test Skakania/i })
      : page.getByRole('button', { name: /Jump Check/i });
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    const resolvedBadge = locale === 'pl' ? 'Rozstrzygnięto' : 'Resolved';
    await expect(page.getByText(resolvedBadge)).toBeVisible();
    await page.screenshot({ path: `test-results/hazard-raw-${locale}.png`, fullPage: true });
  });
}
