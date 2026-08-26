import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * E2E i18n + walidacja renderowania zakładek Settings dla paczki chunk_ab
 * (23 pliki: dialogs/roll-test-result, help-modal/*, settings/*).
 *
 * Zasady:
 * - Język wymuszany cookie NEXT_LOCALE przez middleware next-intl; teksty
 *   pochodzą z prawdziwych messages/{pl,en}.json przez hooki useTranslations.
 * - Każdy scenariusz robi artefakty PNG w out/screenshots/ oraz dopisuje
 *   fizyczny dowód wykonania do out/logs.txt.
 *
 * Zakładki/sekcje Ustawień weryfikowane bezpośrednio:
 *   QualityPresets ("Profil Jakości"), GeminiSettingsPanel ("Gemini ·
 *   zaawansowane") + sekcje accordion (Cache/Thinking/Tools),
 *   TTSSettings ("Lektor narracji"), HealthStatusPanel ("Zdrowie Strażnika").
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
  appendFileSync(LOG_FILE, `[${stamp}] [chunk-ab.spec.ts] ${testInfo} :: ${message}\n`, 'utf8');
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
  }, locale);
}

async function capture(page: Page, testInfo: string, name: string) {
  await page.screenshot({ path: artifactPath(name), fullPage: true });
  expect(existsSync(artifactPath(name))).toBe(true);
  logLine(testInfo, `screenshot saved -> out/screenshots/${name}`);
}

test.describe('chunk_ab - zakładka Settings (/settings)', () => {
  for (const locale of LOCALES) {
    const T = {
      qualityTitle: locale === 'pl' ? 'Profil Jakości' : 'Quality Profile',
      qualityEyebrow: locale === 'pl' ? 'Wydajność vs. głębia' : 'Performance vs. depth',
      geminiTitle: locale === 'pl' ? 'Gemini · zaawansowane' : 'Gemini · advanced',
      geminiWarning: locale === 'pl'
        ? /Te ustawienia wpływają bezpośrednio na zachowanie modeli/
        : /These settings directly affect model behavior/,
      ttsTitle: locale === 'pl' ? 'Lektor narracji' : 'Narration Voice-over',
      healthTitle: locale === 'pl' ? 'Zdrowie Strażnika' : 'Keeper Health',
      cacheTrigger: locale === 'pl' ? /💾 Cache/ : /💾 Cache/,
      cacheWarningStrong: locale === 'pl'
        ? 'Pełna integracja w IND-13.'
        : 'Full integration in IND-13.',
      thinkingTrigger: locale === 'pl'
        ? /Thinking & Vision/
        : /Thinking & Vision/,
      thinkingNote: locale === 'pl'
        ? /Multimodalność \(wejście obrazów\) jest aktywna automatycznie/
        : /Multimodality \(image input\) is automatically active/,
      toolsTrigger: locale === 'pl'
        ? /Eksperymentalne \(Tools\)/
        : /Experimental \(Tools\)/,
      toolsWarningStrong: locale === 'pl'
        ? 'Function Calling - feature eksperymentalny.'
        : 'Function Calling - experimental feature.',
    };

    test(`settings renders core panels (${locale})`, async ({ page }) => {
      await seedApp(page, locale);
      await page.goto(`/${locale}/settings`);
      await page.waitForLoadState('networkidle');

      // QualityPresets
      await expect(page.getByText(T.qualityEyebrow)).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(T.qualityTitle, { exact: true })).toBeVisible();

      // GeminiSettingsPanel (nagłówek + ostrzeżenie bordo)
      await expect(page.getByText(T.geminiTitle)).toBeVisible();
      await expect(page.getByText(T.geminiWarning)).toBeVisible();

      // TTSSettings (Głos Strażnika)
      await expect(page.getByText(T.ttsTitle)).toBeVisible();

      // HealthStatusPanel
      await expect(page.getByText(T.healthTitle)).toBeVisible();

      await capture(page, `settings renders core panels (${locale})`, `settings-${locale}.png`);
      logLine(`settings renders core panels (${locale})`, 'PASS');
    });

    test(`gemini advanced sections expand (${locale})`, async ({ page }) => {
      await seedApp(page, locale);
      await page.goto(`/${locale}/settings`);
      await page.waitForLoadState('networkidle');

      // Sekcje accordion są domyślnie zwinięte (defaultValue=[]); rozwijamy 3.
      const cache = page.getByRole('button', { name: T.cacheTrigger });
      await expect(cache).toBeVisible({ timeout: 20_000 });
      await cache.click();
      await expect(page.getByText(T.cacheWarningStrong)).toBeVisible();

      const thinking = page.getByRole('button', { name: T.thinkingTrigger });
      await thinking.click();
      await expect(page.getByText(T.thinkingNote)).toBeVisible();

      const tools = page.getByRole('button', { name: T.toolsTrigger });
      await tools.click();
      await expect(page.getByText(T.toolsWarningStrong)).toBeVisible();

      await capture(page, `gemini advanced sections expand (${locale})`, `gemini-sections-${locale}.png`);
      logLine(`gemini advanced sections expand (${locale})`, 'PASS');
    });
  }
});
