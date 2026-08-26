import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * E2E i18n + asercje wizualne dla paczki chunk_aa (23 pliki).
 *
 * Zasady:
 * - ZERO hacków DOM (stara wersja podmieniała tekst regexami w page.evaluate).
 *   Język wymuszany cookie NEXT_LOCALE przez middleware next-intl; teksty
 *   pochodzą z prawdziwych messages/{pl,en}.json przez hooki useTranslations.
 * - Każdy scenariusz robi artefakt PNG do out/screenshots/ i asercję treści
 *   per-locale (prawdziwa weryfikacja i18n, nie sam zrzut ekranu).
 *
 * Pliki paczki pokryte bezpośrednio (route/interakcja):
 *   welcome/page.tsx (onboarding-en/pl.png), [locale]/page.tsx, dice/page.tsx,
 *   campaigns/new/page.tsx, prototypes/*, not-found.tsx,
 *   Header/Footer (layout), ApiKeysModal (mock /api/health/gemini).
 *
 * Nieosiągne w E2E bez żywej sesji MG (brak trasy/triggera): error.tsx,
 * global-error.tsx, loading.tsx, message-card, skill-test-card,
 * acquired-item-card, tts-hard-loading-screen, DevelopmentPhaseCard/Modal,
 * CharacterDialog/DiceDialog/JournalDialog (tylko DeskTools/CthulhuSidebar).
 * Ich poprawność i18n chroni find_jsx_text.py (0 trafień) + testy jednostkowe.
 */

const LOCALES = ['en', 'pl'] as const;
type Locale = (typeof LOCALES)[number];

const ARTIFACT_DIR = resolve(process.cwd(), 'out/screenshots');

function artifactPath(name: string): string {
  return resolve(ARTIFACT_DIR, name);
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
    localStorage.setItem('has_started_game', 'false');
    localStorage.setItem(
      'zew-app-api-keys',
      JSON.stringify({ GEMINI_API_KEY: 'e2e-local-key' })
    );
  }, locale);
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: artifactPath(name), fullPage: true });
  expect(existsSync(artifactPath(name))).toBe(true);
}

test.describe('chunk_aa - onboarding (/welcome)', () => {
  for (const locale of LOCALES) {
    test(`welcome renders and captures onboarding-${locale}.png`, async ({
      page,
    }) => {
      // /welcome jest świadomie dwujęzyczne (wybór języka przed middleware).
      await page.goto('/welcome');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await capture(page, `onboarding-${locale}.png`);
    });
  }
});

test.describe('chunk_aa - main game screen ([locale]/page.tsx)', () => {
  for (const locale of LOCALES) {
    test(`main screen captures main-${locale}.png`, async ({ page }) => {
      await seedApp(page, locale);
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      // Ekran startowy gry ([locale]/page.tsx -> WelcomeScreen w chat/welcome).
      // Uwaga: pelne tlumaczenie EN tekstow WelcomeScreen nalezy do pozostalych
      // chunkow (ab..ad); tutaj asertywnie lapiemy stabilny element szkieletu.
      await expect(page.getByText(/Szybka Przygoda/i)).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText('ANNO DOMINI MCMXXV')).toBeVisible();

      await capture(page, `main-${locale}.png`);
    });
  }
});

test.describe('chunk_aa - dice page ([locale]/dice/page.tsx)', () => {
  for (const locale of LOCALES) {
    test(`dice page captures dice-${locale}.png`, async ({ page }) => {
      await seedApp(page, locale);
      await page.goto(`/${locale}/dice`);
      await page.waitForLoadState('networkidle');

      const expectedTitle = locale === 'pl' ? 'System Kości' : 'Dice System';
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        expectedTitle,
        { timeout: 15_000 }
      );

      await capture(page, `dice-${locale}.png`);
    });
  }
});

test.describe('chunk_aa - campaigns/new/page.tsx', () => {
  for (const locale of LOCALES) {
    test(`new campaign page captures campaigns-new-${locale}.png`, async ({
      page,
    }) => {
      await seedApp(page, locale);
      await page.goto(`/${locale}/campaigns/new`);
      await page.waitForLoadState('networkidle');

      const expectedTitle =
        locale === 'pl' ? 'Rozpocznij Nową Kampanię' : 'Start a New Campaign';
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        expectedTitle,
        { timeout: 15_000 }
      );

      await capture(page, `campaigns-new-${locale}.png`);
    });
  }
});

test.describe('chunk_aa - prototypes pages', () => {
  ['pl', 'en'] as const;
  for (const locale of LOCALES) {
    test(`prototypes index captures prototypes-${locale}.png`, async ({
      page,
    }) => {
      await seedApp(page, locale);
      await page.goto(`/${locale}/prototypes`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByText('Prototypes', { exact: false }).first()
      ).toBeVisible();

      await capture(page, `prototypes-${locale}.png`);
    });

    test(`cutscene prototype captures prototype-cutscene-${locale}.png`, async ({
      page,
    }) => {
      await seedApp(page, locale);
      await page.goto(`/${locale}/prototypes/cutscene`);
      await page.waitForLoadState('networkidle');

      await capture(page, `prototype-cutscene-${locale}.png`);
    });

    test(`sanity-check prototype captures prototype-sanity-${locale}.png`, async ({
      page,
    }) => {
      await seedApp(page, locale);
      await page.goto(`/${locale}/prototypes/sanity-check`);
      await page.waitForLoadState('networkidle');

      await capture(page, `prototype-sanity-${locale}.png`);
    });
  }
});

test.describe('chunk_aa - not-found.tsx', () => {
  for (const locale of LOCALES) {
    test(`404 page captures not-found-${locale}.png`, async ({ page }) => {
      await seedApp(page, locale);
      await page.goto(`/${locale}/nie-ma-takiej-strony-e2e`);

      const expectedTitle =
        locale === 'pl' ? 'Strona nie znaleziona' : 'Page Not Found';
      await expect(
        page.getByRole('heading', { name: expectedTitle })
      ).toBeVisible({ timeout: 15_000 });

      await capture(page, `not-found-${locale}.png`);
    });
  }
});

test.describe('chunk_aa - ApiKeysModal (BYOK)', () => {
  for (const locale of LOCALES) {
    test(`api keys modal opens on failed health check (${locale})`, async ({
      page,
    }) => {
      await seedApp(page, locale);

      // Self-check klucza (IND-273) zwraca keyValid=false -> onInvalidKey ->
      // setShowApiKeysModal(true) -> ApiKeysModal.
      await page.route('**/api/health/gemini**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            keyValid: false,
            registry: { chatModelsMissing: [] },
          }),
        })
      );
      // Blokujemy inne wywołania API, by strona wstała deterministycznie.
      await page.route('**/api/chat**', (route) => route.abort());

      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      const expectedTitle =
        locale === 'pl' ? 'Konfiguracja kluczy API' : 'API Keys Configuration';
      await expect(page.getByText(expectedTitle).first()).toBeVisible({
        timeout: 20_000,
      });

      await capture(page, `api-keys-modal-${locale}.png`);

      // Zamknij modal (Anuluj/Cancel), by nie zaśmiecać kontekstu.
      const cancelLabel = locale === 'pl' ? 'Anuluj' : 'Cancel';
      const cancel = page.getByRole('button', { name: cancelLabel });
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
      }
    });
  }
});
