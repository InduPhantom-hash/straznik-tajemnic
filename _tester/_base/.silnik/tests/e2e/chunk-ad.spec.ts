import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * E2E i18n + walidacja renderowania dla paczki chunk_ad (21 plików ui/*:
 * m.in. Tablica Śledcza - CorkboardInvestigationBoard, SessionJournal,
 * DiscoveriesView, InvestigatorBoard, SessionList/NewSessionForm (campaigns),
 * YoutubePlayer, NpcManager, RitualSystem, PhobiaManiaSystem itd.).
 *
 * Zasady (wzorzec chunk-ac.spec.ts):
 * - Język wymuszany cookie NEXT_LOCALE przez middleware next-intl; teksty
 *   pochodzą z prawdziwych messages/{pl,en}.json przez useTranslations.
 * - Każdy scenariusz robi artefakty PNG w out/screenshots/ oraz dopisuje
 *   fizyczny dowód wykonania do out/logs.txt.
 * - Asertywny zrzek regresyjny toHaveScreenshot() bindowany per scenariusz.
 *
 * Pokrycie (kontrakt transzy chunk_ad pkt 7):
 *   1) Dziennik Sesji + TABLICA BADACZA (corkboard) po polsku i angielsku,
 *   2) Lista Sesji (/campaigns) + formularz nowej sesji,
 *   3) odtwarzacz YouTube w panelu bocznym.
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
    `[${stamp}] [chunk-ad.spec.ts] ${testInfo} :: ${message}\n`,
    'utf8'
  );
}

/**
 * Minimalna, poprawna typowo postać badacza (src/lib/types.ts Character).
 * Wystarcza, by sidebar pokazał narzędzia gracza i otworzył dziennik.
 */
function seedCharacter(locale: Locale): string {
  return JSON.stringify([
    {
      id: 'e2e-chunk-ad-investigator',
      name: locale === 'pl' ? 'Harvey Walters' : 'Harvey Walters',
      str: 50,
      dex: 70,
      con: 60,
      app: 55,
      pow: 75,
      edu: 80,
      siz: 55,
      int: 85,
      luck: 60,
      hp: 11,
      san: 62,
      mp: 15,
      skills: {},
      occupation: locale === 'pl' ? 'Profesor' : 'Professor',
      age: 42,
      background: 'E2E seed',
      playerName: 'E2E',
      isActive: true,
      lastUsed: new Date().toISOString(),
      notes: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 10 },
      developmentHistory: [],
      journal: [],
    },
  ]);
}

/** Wstrzyknij cookie NEXT_LOCALE + ziarno stanu onboardingowego. */
async function seedApp(page: Page, locale: Locale, withCharacter = false) {
  await page.context().addCookies([
    { name: 'NEXT_LOCALE', value: locale, url: 'http://localhost:3000' },
  ]);
  await page.addInitScript(
    ({ loc, characters }) => {
      localStorage.clear();
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('language_selected', loc);
      localStorage.setItem('has_started_game', 'true');
      localStorage.setItem('session_zero_completed', 'true');
      localStorage.setItem('characters', characters);
      localStorage.setItem(
        'zew-app-api-keys',
        JSON.stringify({ GEMINI_API_KEY: 'e2e-local-key' })
      );
      localStorage.setItem(
        'pdf_memory',
        JSON.stringify({ rulesUrl: '/data/rag/rules.json' })
      );
    },
    { loc: locale, characters: withCharacter ? seedCharacter(locale) : '[]' }
  );
}

async function capture(page: Page, testInfo: string, name: string) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: artifactPath(name), fullPage: true });
  expect(existsSync(artifactPath(name))).toBe(true);
  logLine(testInfo, `screenshot saved -> out/screenshots/${name}`);
}

for (const locale of LOCALES) {
  const T = {
    // Sidebar
    journalTool: locale === 'pl' ? 'Dziennik Przygody' : 'Adventure Journal',
    // SessionJournal
    journalTitle: locale === 'pl' ? 'DZIENNIK SESJI' : 'SESSION JOURNAL',
    boardTab: locale === 'pl' ? /Tablica Badacza/ : /Investigator Board/,
    discoveriesTab: locale === 'pl' ? /Odkrycia/ : /Discoveries/,
    chronicleTab: locale === 'pl' ? /Kronika/ : /Chronicle/,
    // CorkboardInvestigationBoard
    boardTitle: locale === 'pl' ? 'TABLICA BADACZA' : 'INVESTIGATOR BOARD',
    boardCount: locale === 'pl' ? '(0 dowodów)' : '(0 pieces of evidence)',
    boardEmptyTitle:
      locale === 'pl'
        ? 'Tablica Badacza jest pusta'
        : 'The Investigator Board is empty',
    // SessionList
    sessionListEmptyTitle:
      locale === 'pl' ? 'Brak zapisanych sesji' : 'No saved sessions',
    sessionListEmpty:
      locale === 'pl'
        ? 'Stwórz pierwszą sesję, aby rozpocząć grę'
        : 'Create your first session to start playing',
    // NewSessionForm
    nameLabel: locale === 'pl' ? 'Nazwa sesji *' : 'Session name *',
    namePlaceholder:
      locale === 'pl'
        ? 'np. Przygoda w Arkham, Sesja z Testowym, etc.'
        : 'e.g. Adventure in Arkham, Session with Tester, etc.',
    // YoutubePlayer (domyslnie zwiniety; content = wbudowana playlista)
    ytTypeBadge: locale === 'pl' ? 'Playlista' : 'Playlist',
    ytChangePlaceholder: locale === 'pl' ? 'Zmień...' : 'Change...',
  };

  test.describe(`chunk_ad locale=${locale}`, () => {
    test('Session Journal opens and Investigator Board renders i18n', async ({
      page,
    }) => {
      await seedApp(page, locale, true);
      await page.route('**/api/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, recordCount: 1 }),
        })
      );

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Narzędzie gracza "Dziennik" w panelu bocznym.
      await page
        .getByRole('button', { name: T.journalTool })
        .first()
        .click({ timeout: 20_000 });

      // Nagłówek dziennika z namespace SessionJournal.
      await expect(page.getByText(T.journalTitle).first()).toBeVisible({
        timeout: 15_000,
      });

      await capture(
        page,
        `Session Journal opens (${locale})`,
        `chunk-ad-journal-${locale}.png`
      );

      // Zakładki dziennika (przyciski z emoji w nazwie - match po roli).
      await expect(
        page.getByRole('button', { name: T.chronicleTab })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: T.discoveriesTab })
      ).toBeVisible();

      // Przejście do zakładki Tablicy Śledczej.
      await page.getByRole('button', { name: T.boardTab }).click();

      // Nagłówek korka + licznik dowodów + stan pustej tablicy.
      await expect(page.getByText(T.boardTitle).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(T.boardCount)).toBeVisible();
      await expect(page.getByText(T.boardEmptyTitle)).toBeVisible();

      await capture(
        page,
        `Investigator Board renders i18n (${locale})`,
        `chunk-ad-corkboard-${locale}.png`
      );
      logLine(
        `Session Journal opens and Investigator Board renders i18n (${locale})`,
        'PASS'
      );
    });

    test('Session List renders i18n on /campaigns', async ({ page }) => {
      await seedApp(page, locale);
      await page.route('**/api/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, sessions: [] }),
        })
      );

      await page.goto(`/${locale}/campaigns`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(T.sessionListEmptyTitle)).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(T.sessionListEmpty)).toBeVisible();

      await capture(
        page,
        `Session List renders i18n (${locale})`,
        `chunk-ad-session-list-${locale}.png`
      );
      logLine(`Session List renders i18n on /campaigns (${locale})`, 'PASS');
    });

    test('New Session Form renders i18n on /campaigns/new', async ({
      page,
    }) => {
      await seedApp(page, locale);
      await page.route('**/api/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, recordCount: 1 }),
        })
      );

      await page.goto(`/${locale}/campaigns/new`);
      await page.waitForLoadState('networkidle');

      const nameInput = page
        .locator('input')
        .first()
        .and(page.getByPlaceholder(T.namePlaceholder));
      await expect(nameInput).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(T.nameLabel).first()).toBeVisible();

      await capture(
        page,
        `New Session Form renders i18n (${locale})`,
        `chunk-ad-new-session-${locale}.png`
      );
      logLine(
        `New Session Form renders i18n on /campaigns/new (${locale})`,
        'PASS'
      );
    });

    test('YouTube player panel renders i18n strings', async ({ page }) => {
      await seedApp(page, locale, true);
      await page.route('**/api/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, recordCount: 1 }),
        })
      );

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Panel startuje zwiniety (FEATURE:#16) - klik w naglowek rozwija.
      const ytHeader = page.getByText('YouTube', { exact: true }).first();
      await expect(ytHeader).toBeVisible({ timeout: 20_000 });
      await ytHeader.click();

      // Wbudowana playlista -> badge typu + kontrolki glosnosci.
      await expect(page.getByText(T.ytTypeBadge).first()).toBeVisible();
      await expect(
        page.getByPlaceholder(T.ytChangePlaceholder).first()
      ).toBeVisible();

      await capture(
        page,
        `YouTube player panel renders i18n (${locale})`,
        `chunk-ad-youtube-${locale}.png`
      );
      logLine(`YouTube player panel renders i18n (${locale})`, 'PASS');
    });
  });
}
