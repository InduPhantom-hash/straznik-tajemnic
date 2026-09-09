import { expect, test, type Route } from '@playwright/test';

function seedChaseUi() {
  return (locale: string) => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', locale);
    localStorage.setItem('rules_onboarding_completed', 'true');
    localStorage.setItem('has_started_game', 'true');
    localStorage.setItem('session_zero_completed', 'true');
    localStorage.setItem('characters', JSON.stringify([{
      id: 'chase-e2e-character', name: 'Edward', occupation: 'Private Eye', age: 38,
      gender: 'male', str: 60, dex: 70, con: 60, app: 50, pow: 50, edu: 60,
      siz: 65, int: 65, luck: 55, hp: 12, maxHp: 12, san: 50, maxSan: 99,
      mp: 10, maxMp: 10, background: '', skills: { Skakanie: 50, Jump: 50, Nawigacja: 60, Navigation: 60 },
      equipment: [], playerName: '', isActive: true, lastUsed: new Date().toISOString(),
      notes: '', experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0,
        maxEarnedThisSession: 0 }, developmentHistory: [],
    }]));
    localStorage.setItem('active_character_id', 'chase-e2e-character');
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
  test(`chase cheat triggers in-chat ChaseCard and resolves maneuver in ${locale}`, async ({ page }) => {
    await page.addInitScript(seedChaseUi(), locale);
    await page.route('**/api/**', mockApi);
    await page.goto(`/${locale}`);

    const input = page.getByPlaceholder(
      locale === 'pl' ? 'Wpisz wiadomość do Mistrza Gry...' : 'Write a message to the Game Master...'
    );
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill('[CHASE]');
    await input.press('Enter');

    const cardTitle = locale === 'pl' ? 'Pościg CoC 7e RAW' : 'CoC 7e Chase (RAW)';
    await expect(page.getByText(cardTitle)).toBeVisible({ timeout: 10_000 });

    const sprintBtn = locale === 'pl'
      ? page.getByRole('button', { name: /Sprint naprzód/i })
      : page.getByRole('button', { name: /Sprint forward/i });
    await expect(sprintBtn).toBeVisible();
    await sprintBtn.click();

    // Po kliknięciu manewru w czacie nie powinno być modala, a deklaracja ląduje w czacie
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.screenshot({ path: `test-results/chase-raw-${locale}.png`, fullPage: true });
  });
}
