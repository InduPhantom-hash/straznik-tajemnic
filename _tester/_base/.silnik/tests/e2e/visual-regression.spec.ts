import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

/**
 * Visual Regression & Layout Suite (Dark Art Déco CoC 7e RAW)
 *
 * Weryfikuje kluczowe widoki aplikacji w wariantach Desktop (1920x1080) i Tablet (1024x768):
 * 1. Strona główna z pulpitem Dark Art Déco (/pl i /en)
 * 2. Ekran wyboru języka (/welcome)
 * 3. Kreator nowej kampanii (/pl/campaigns/new)
 * 4. Pulpit rzutów kośćmi (/pl/dice)
 * 5. Ekran prototypów i testów poczytalności (/pl/prototypes)
 *
 * Generuje zrzuty ekranu do `out/visual-regression/` do porównań wizualnych i wyłapywania regresji layoutu.
 */

const LOCALES = ['pl', 'en'] as const;
type Locale = (typeof LOCALES)[number];

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 1024, height: 768 },
] as const;

const OUTPUT_DIR = resolve(process.cwd(), 'out/visual-regression');

function getScreenshotPath(filename: string): string {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  return resolve(OUTPUT_DIR, filename);
}

async function seedGameEnvironment(page: Page, locale: Locale) {
  await page.context().addCookies([
    { name: 'NEXT_LOCALE', value: locale, url: 'http://localhost:3000' },
  ]);
  await page.addInitScript((loc) => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', loc);
    localStorage.setItem('has_started_game', 'false');
    localStorage.setItem(
      'zew-app-api-keys',
      JSON.stringify({ GEMINI_API_KEY: 'test-e2e-visual-key' })
    );
  }, locale);
}

async function captureView(page: Page, testInfo: TestInfo, filename: string) {
  const projectSlug = testInfo.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const targetPath = getScreenshotPath(`${projectSlug}-${filename}`);
  await page.screenshot({ path: targetPath, fullPage: true });
  expect(existsSync(targetPath)).toBe(true);
}

test.describe('Visual Regression - Dark Art Déco Suite', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('Wybór języka (/welcome)', async ({ page }, testInfo) => {
        await page.goto('/welcome');
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
        await captureView(page, testInfo, `welcome-${vp.name}.png`);
      });

      for (const locale of LOCALES) {
        test(`Strona główna (${locale}) - szkielet i złote ornamenty Art Déco`, async ({ page }, testInfo) => {
          await seedGameEnvironment(page, locale);
          await page.goto(`/${locale}`);
          await page.waitForLoadState('networkidle');

          await expect(page.getByText('ANNO DOMINI MCMXXV')).toBeVisible({ timeout: 20_000 });
          await captureView(page, testInfo, `home-${locale}-${vp.name}.png`);
        });

        test(`Nowa kampania (${locale})`, async ({ page }, testInfo) => {
          await seedGameEnvironment(page, locale);
          await page.goto(`/${locale}/campaigns/new`);
          await page.waitForLoadState('networkidle');

          await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
          await captureView(page, testInfo, `campaign-new-${locale}-${vp.name}.png`);
        });

        test(`Tacka na kości (${locale})`, async ({ page }, testInfo) => {
          await seedGameEnvironment(page, locale);
          await page.goto(`/${locale}/dice`);
          await page.waitForLoadState('networkidle');

          await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
          await captureView(page, testInfo, `dice-${locale}-${vp.name}.png`);
        });
      }
    });
  }
});
