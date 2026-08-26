import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * E2E i18n + walidacja renderowania dla paczki chunk_ac (23 pliki: ui/*
 * character-wizard, chase/combat/dice-system, equipment-modal, save/reset
 * modals, settings/tts/*, sidebar/CthulhuSidebar i in.).
 *
 * Zasady:
 * - Język wymuszany cookie NEXT_LOCALE przez middleware next-intl; teksty
 *   pochodzą z prawdziwych messages/{pl,en}.json przez useTranslations.
 * - Każdy scenariusz robi artefakty PNG w out/screenshots/ oraz dopisuje
 *   fizyczny dowód wykonania do out/logs.txt (wzorzec chunk-ab.spec.ts).
 * - Asertywny zrzek regresyjny toHaveScreenshot() bindowany per scenariusz.
 *
 * Pokrycie (kontrakt transzy chunk_ac pkt 7):
 *   1) CthulhuSidebar (zawiły panel boczny) po polsku i po angielsku,
 *   2) Character Wizard - krok Koncepcja + nawigacja do kroku Cechy,
 *   3) smoke: System Kości (DiceSystem) renderuje nagłówki i18n.
 */

const LOCALES = ['en', 'pl'] as const;
type Locale = (typeof LOCALES)[number];

const ARTIFACT_DIR = resolve(process.cwd(), 'out/screenshots');
const LOG_FILE = resolve(process.cwd(), 'out/logs.txt');

function artifactPath(name: string): string {
  return resolve(ARTIFACT_DIR, name);
}

/** Fizyczny ślad wykonania testu - dopisywany do out/logs.txt. */
function logLine(testInfo: string, message: string): void {
  mkdirSync(resolve(process.cwd(), 'out'), { recursive: true });
  const stamp = new Date().toISOString();
  appendFileSync(
    LOG_FILE,
    `[${stamp}] [chunk-ac.spec.ts] ${testInfo} :: ${message}\n`,
    'utf8'
  );
}

/** Wstrzyknij cookie NEXT_LOCALE + ziarno stanu onboardingowego. */
async function seedApp(page: Page, locale: Locale) {
  await page.context().addCookies([
    { name: 'NEXT_LOCALE', value: locale, url: 'http://localhost:3000' },
  ]);
  await page.addInitScript((loc) => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', loc);
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
  }, locale);
}

async function capture(page: Page, testInfo: string, name: string) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: artifactPath(name), fullPage: true });
  expect(existsSync(artifactPath(name))).toBe(true);
  logLine(testInfo, `screenshot saved -> out/screenshots/${name}`);
}

for (const locale of LOCALES) {
  const T = {
    appName: locale === 'pl' ? 'Strażnik Tajemnic AI' : 'Guardian of Secrets AI',
    wizardTitle: locale === 'pl' ? 'Kreator Badacza' : 'Investigator Creator',
    stepConcept: locale === 'pl' ? /Krok 1 · Koncepcja/ : /Step 1 · Concept/,
    stepConceptHint: locale === 'pl'
      ? /Wybierz archetyp aby kontynuować/
      : /Choose an archetype to continue/,
    stepStats: locale === 'pl' ? /Krok 2 · Cechy/ : /Step 2 · Characteristics/,
    statsIntro: locale === 'pl'
      ? /Cechy to dziewięć liczb opisujących ciało/
      : /Characteristics are nine numbers describing body/,
    rollDice: locale === 'pl' ? 'Rzuć kośćmi' : 'Roll dice',
    back: locale === 'pl' ? /Wstecz/ : /Back/,
    next: locale === 'pl' ? /Dalej/ : /Next/,
  };

  test.describe(`chunk_ac locale=${locale}`, () => {
    test(`CthulhuSidebar renders core i18n (${locale})`, async ({ page }) => {
      await seedApp(page, locale);
      await page.route('**/api/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, recordCount: 1 }),
        })
      );

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Nagłówek aplikacji w sidebarze pochodzi z namespace Sidebar.
      await expect(page.getByText(T.appName).first()).toBeVisible({
        timeout: 20_000,
      });

      // Baseline regresji wizualnej (toHaveScreenshot).
      await expect(page).toHaveScreenshot();

      await capture(
        page,
        `CthulhuSidebar renders core i18n (${locale})`,
        `chunk-ac-sidebar-${locale}.png`
      );
      logLine(`CthulhuSidebar renders core i18n (${locale})`, 'PASS');
    });

    test(`Character Wizard: concept + stats steps (${locale})`, async ({
      page,
    }) => {
      await seedApp(page, locale);
      await page.route('**/api/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      );

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Otwarcie kreatora postaci przez dedykowany testid w sidebarze.
      await page.getByTestId('open-character-wizard').click();
      const modal = page.getByTestId('character-wizard-modal');
      await expect(modal).toBeVisible({ timeout: 15_000 });

      // Krok 1: Koncepcja - tytuł + hint onboardingowy.
      await expect(page.getByText(T.stepConcept)).toBeVisible();
      await expect(page.getByText(T.wizardTitle)).toBeVisible();
      await expect(page.getByText(T.stepConceptHint)).toBeVisible();

      // Baseline regresji wizualnej kreatora.
      await expect(page).toHaveScreenshot();

      await capture(
        page,
        `Character Wizard concept (${locale})`,
        `chunk-ac-wizard-concept-${locale}.png`
      );

      // Nawigacja Dalej wymaga wybranego archetypu (walidacja nextStep).
      // Wybieramy pierwszy dostępny archetyp z siatki.
      await modal.locator('button').first().click();

      // Klik "Dalej" -> krok 2 Cechy.
      await page.getByRole('button', { name: T.next }).click();
      await expect(page.getByText(T.stepStats)).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(T.statsIntro)).toBeVisible();
      await expect(page.getByText(T.rollDice)).toBeVisible();

      await capture(
        page,
        `Character Wizard stats (${locale})`,
        `chunk-ac-wizard-stats-${locale}.png`
      );
      logLine(`Character Wizard: concept + stats steps (${locale})`, 'PASS');
    });

    test(`DiceSystem dialog renders i18n headers (${locale})`, async ({
      page,
    }) => {
      await seedApp(page, locale);
      await page.route('**/api/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, rolls: [] }),
        })
      );

      // DiceSystem jest montowany bezposrednio pod /dice.
      await page.goto('/dice');
      await page.waitForLoadState('networkidle');

      const diceTitle = locale === 'pl' ? /System Kości/ : /Dice System/;
      const basicTitle = locale === 'pl'
        ? /Podstawowe Rzuty/
        : /Basic Rolls/;
      const skillTestTitle = locale === 'pl'
        ? /Test Umiejętności/
        : /Skill Test/;
      const historyTitle = locale === 'pl'
        ? /Historia Rzutów/
        : /Roll History/;

      await expect(page.getByText(diceTitle)).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(basicTitle)).toBeVisible();
      await expect(page.getByText(skillTestTitle)).toBeVisible();
      await expect(page.getByText(historyTitle)).toBeVisible();

      await capture(
        page,
        `DiceSystem dialog renders i18n headers (${locale})`,
        `chunk-ac-dice-${locale}.png`
      );
      logLine(`DiceSystem dialog renders i18n headers (${locale})`, 'PASS');
    });
  });
}
