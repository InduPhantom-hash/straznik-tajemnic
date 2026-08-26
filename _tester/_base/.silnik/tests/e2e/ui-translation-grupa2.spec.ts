import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Etap 6 - Grupa 2: Onboarding + Kreator Postaci (i18n E2E).
 *
 * Locale wymuszony WYŁĄCZNIE cookie `NEXT_LOCALE` (wstrzyknięcie w Playwright).
 * Nawigacja zawsze pod bazowy adres http://localhost:3000/ (baseURL z configu).
 *
 * Scenariusz A (Onboarding): h1 widoczny -> snapshot regresyjny -> artefakt PNG.
 * Scenariusz B (Kreator):    klik getByTestId('open-character-wizard') ->
 *                            getByTestId('character-wizard-modal') widoczny ->
 *                            snapshot regresyjny -> artefakt PNG.
 */

const LOCALES = ['en', 'pl'] as const;
type Locale = (typeof LOCALES)[number];

/** Wstrzyknij cookie NEXT_LOCALE (wymuszenie języka przez middleware next-intl). */
async function injectLocaleCookie(page: Page, locale: Locale) {
  await page.context().addCookies([
    {
      name: 'NEXT_LOCALE',
      value: locale,
      url: 'http://localhost:3000',
    },
  ]);
}

/** Seed stanu "gra rozpoczęta, brak aktywnej postaci" - widoczny sidebar z
 *  przyciskiem otwierającym Kreator Postaci.
 *  Uwaga: addInitScript nie przenosi domknięć - locale przekazujemy jako arg. */
function seedStartedGame() {
  return (locale: Locale) => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', locale);
    localStorage.setItem('has_started_game', 'true');
    localStorage.setItem('characters', '[]');
    localStorage.setItem(
      'zew-app-api-keys',
      JSON.stringify({ GEMINI_API_KEY: 'e2e-local-key' })
    );
    localStorage.setItem(
      'pdf_memory',
      JSON.stringify({ rulesUrl: '/data/rag/rules.json' })
    );
  };
}

for (const locale of LOCALES) {
  test.describe(`locale=${locale}`, () => {
    test(`Scenario A: onboarding renders and captures artifact (${locale})`, async ({
      page,
    }) => {
      await injectLocaleCookie(page, locale);

      // Krok 1: nawigacja pod bazowy adres.
      await page.goto('/');

      // Krok 2: asercja głównego kontenera (h1 modala wyboru języka).
      await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });

      // Krok 3: baseline regresji wizualnej.
      await expect(page).toHaveScreenshot();

      // Krok 4: artefakt pod absolutną ścieżką systemową.
      const artifactPath = resolve(
        process.cwd(),
        `test-results/onboarding-${locale}.png`
      );
      await page.screenshot({ path: artifactPath });
      expect(existsSync(artifactPath)).toBe(true);
    });

    test(`Scenario B: character creator opens and captures artifact (${locale})`, async ({
      page,
    }) => {
      await injectLocaleCookie(page, locale);
      await page.addInitScript(seedStartedGame(), locale);
      await page.route('**/api/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, recordCount: 1 }),
        })
      );

      // Krok 1: nawigacja pod bazowy adres.
      await page.goto('/');

      // Krok 2: otwarcie kreatora postaci dokładnie przez testid.
      await page.getByTestId('open-character-wizard').click();

      // Krok 3: asercja renderowania modala kreatora.
      await expect(page.getByTestId('character-wizard-modal')).toBeVisible({
        timeout: 15_000,
      });

      // Krok 4: baseline regresji wizualnej.
      await expect(page).toHaveScreenshot();

      // Krok 5: artefakt z rozwiązaniem ścieżki względem CWD.
      const artifactPath = resolve(
        process.cwd(),
        `test-results/character-creator-${locale}.png`
      );
      await page.screenshot({ path: artifactPath });
      expect(existsSync(artifactPath)).toBe(true);
    });
  });
}
