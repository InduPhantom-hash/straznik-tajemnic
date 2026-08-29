import { expect, test, type Page } from '@playwright/test';

async function openManualSetup(page: Page, locale: 'pl' | 'en') {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.addInitScript((selectedLocale) => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', selectedLocale);
    localStorage.setItem(
      'zew-app-api-keys',
      JSON.stringify({ gemini: 'e2e-local-key', GEMINI_API_KEY: 'e2e-local-key' })
    );
    localStorage.setItem('health_check_last_run', String(Date.now()));
  }, locale);

  await page.goto(`/${locale}`);
  await page.locator('[data-testid="btn-manual-setup"]').click();

  const setup = page.locator('[data-testid="manual-setup-panel"]');
  await expect(setup).toBeVisible();
  return { consoleErrors, setup };
}

test('Manual Setup renders Session Zero in English without Polish text', async ({ page }) => {
  const { setup } = await openManualSetup(page, 'en');
  await page.screenshot({ path: 'test-results/manual-setup-header-en.png' });
  await expect(setup.getByText('Optional step - Session Zero')).toBeVisible();
  await expect(
    setup.getByText('Narrative introduction and agreement on conventions')
  ).toBeVisible();
  await expect(setup.getByText('Krok opcjonalny - Sesja Zero')).toHaveCount(0);
  await expect(
    setup.getByText('Wprowadzenie fabularne i ustalenie konwencji')
  ).toHaveCount(0);

  await setup.getByText('Optional step - Session Zero').scrollIntoViewIfNeeded();
  await setup.screenshot({
    path: 'test-results/manual-setup-i18n-en.png',
  });
});

test('Manual Setup selects a fully English Strefa 11 adventure', async ({ page }) => {
  const { consoleErrors, setup } = await openManualSetup(page, 'en');
  await setup.getByRole('button', { name: 'Select adventure' }).click();

  const selector = page.getByRole('dialog').last();
  await expect(selector.getByText('New Adventure')).toBeVisible();
  await expect(selector.getByText("Shadow over Prabuty: Father Klimuszko's Vision")).toBeVisible();
  await expect(selector.getByText(/Easy/)).toBeVisible();
  await expect(selector.getByRole('link', { name: 'Official Player.pl TVN ↗' })).toHaveCount(4);
  await expect(selector.getByText('Cień nad Prabutami: Widzenie Ojca Klimuszki')).toHaveCount(0);
  await expect(selector.getByText(/Łatwy/)).toHaveCount(0);
  await selector.screenshot({ path: 'out/i18n-full-audit/manual-adventure-selector-en.png' });

  await selector.getByText("Shadow over Prabuty: Father Klimuszko's Vision").click();
  const details = page.getByRole('dialog').last();
  await expect(details.getByText('A dark investigation of intrigue, moral ambiguity and big-city secrets.')).toBeVisible();
  await expect(details.getByText('A gentler challenge for a first game, with fewer deadly traps.')).toBeVisible();
  await details.getByRole('button', { name: /choose this adventure/i }).click();
  await selector.getByRole('button', { name: /choose and continue/i }).click();

  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('adventure_context') ?? '{}').title))
    .toBe("Shadow over Prabuty: Father Klimuszko's Vision");
  expect(consoleErrors.filter((message) => message.includes('MISSING_MESSAGE'))).toEqual([]);
});

test('Manual Setup keeps the Polish Strefa 11 catalogue in Polish', async ({ page }) => {
  const { consoleErrors, setup } = await openManualSetup(page, 'pl');
  await setup.getByRole('button', { name: 'Wybierz przygodę' }).click();

  const selector = page.getByRole('dialog').last();
  await expect(selector.getByText('Nowa Przygoda')).toBeVisible();
  await expect(selector.getByText('Cień nad Prabutami: Widzenie Ojca Klimuszki')).toBeVisible();
  await expect(selector.getByText(/Łatwy/)).toBeVisible();
  await expect(selector.getByText("Shadow over Prabuty: Father Klimuszko's Vision")).toHaveCount(0);
  await selector.screenshot({ path: 'out/i18n-full-audit/manual-adventure-selector-pl.png' });

  await selector.getByText('Cień nad Prabutami: Widzenie Ojca Klimuszki').click();
  const details = page.getByRole('dialog').last();
  await expect(details.getByText('Mroczne śledztwo pełne intryg, moralnej dwuznaczności i tajemnic wielkiego miasta.')).toBeVisible();
  await details.getByRole('button', { name: /wybierz tę przygodę/i }).click();
  await selector.getByRole('button', { name: /wybierz i kontynuuj/i }).click();

  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('adventure_context') ?? '{}').title))
    .toBe('Cień nad Prabutami: Widzenie Ojca Klimuszki');
  expect(consoleErrors.filter((message) => message.includes('MISSING_MESSAGE'))).toEqual([]);
});
