import { test, expect } from '@playwright/test';

const ROUTES = [
  '/',
  '/pl',
  '/en',
  '/pl/prototypes',
  '/en/prototypes',
  '/pl/prototypes/sanity-check',
  '/en/prototypes/sanity-check',
  '/pl/prototypes/cutscene',
  '/en/prototypes/cutscene',
  '/pl/brak-takiej-podstrony-404',
  '/en/no-such-page-404',
];

test('brak bledow MISSING_MESSAGE na przebadanych trasach', async ({ page }) => {
  const missing: string[] = [];

  page.on('console', (msg) => {
    if (msg.text().includes('MISSING_MESSAGE')) missing.push(msg.text());
  });
  page.on('pageerror', (err) => {
    if (err.message.includes('MISSING_MESSAGE')) missing.push(err.message);
  });

  for (const route of ROUTES) {
    const before = missing.length;
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toBeVisible();
    if (missing.length > before) {
      console.error(`[MISSING_MESSAGE] ${route}:`);
      for (const line of missing.slice(before)) console.error('  ' + line);
    }
  }

  expect(missing, `Znaleziono ${missing.length} bledow MISSING_MESSAGE`).toEqual([]);
});
