import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshotPath = resolve(
  process.cwd(),
  'test-results/locale-character-sheet-en.png'
);

test('English character sheet renders equipment and no Polish equipment labels', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', 'en');
    localStorage.setItem('has_started_game', 'true');
    localStorage.setItem('session_zero_completed', 'true');
    localStorage.setItem(
      'characters',
      JSON.stringify([
        {
          id: 'e2e-system-preset',
          sourcePresetId: 'strefa11_tomasz_nowicki',
          name: 'Tomasz Nowicki',
          occupation: 'Dziennikarz Śledczy / Prowadzący',
          age: 42,
          gender: 'male',
          str: 60, dex: 60, con: 60, app: 50, pow: 50, edu: 60, siz: 60, int: 60,
          luck: 50, hp: 12, maxHp: 12, san: 50, maxSan: 99, mp: 10, maxMp: 10,
          background: 'Gospodarz programu "Sygnały Nieznanego", znany z posępnego głosu i chłodnej analizy nadprzyrodzonych zjawisk na antenie telewizyjnej. Dawniej pracował w dziale kryminalnym dużego dziennika.',
          birthplace: 'Warszawa, Polska',
          characterConcept: 'Sceptyczny dziennikarz, który widział już zbyt wiele zjawisk niewyjaśnionych, by całkowicie zaprzeczać istnieniu nieznanego.',
          traits: ['Opanowany', 'Sceptyczny', 'Dociekliwy'],
          description: 'Nosi charakterystyczną, czarną skórzaną kurtkę, z ciemnymi okularami zawieszonymi na kołnierzyku.',
          backstory: 'Tomasz dorastał w cieniu betonowych blokowisk szarej Warszawy, co wcześnie wykształciło w nim instynkt dociekliwości i chłodny, niemal cyniczny dystans do rzeczywistości.',
          skills: { 'Spostrzegawczość': 70, 'Korzystanie z Bibliotek': 50 },
          equipment: [
            { id: 'e2e-revolver', name: '.38 Revolver', category: 'weapon', modifiers: { damage: '1d10', range: '15 m' } },
            { id: 'eq_tom_dyktafon', name: 'Dyktafon na mikrokasety', category: 'tool' },
            { id: 'eq_tom_latarka', name: 'Mocna latarka policyjna', category: 'tool' },
          ],
        },
      ])
    );
    localStorage.setItem('active_character_id', 'e2e-system-preset');
    localStorage.setItem('zew-app-api-keys', JSON.stringify({ GEMINI_API_KEY: 'e2e-local-key' }));
    localStorage.setItem('pdf_memory', JSON.stringify({ rulesUrl: '/data/rag/rules.json' }));
  });

  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, recordCount: 1 }) })
  );

  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const sheetButton = page.getByRole('button', { name: 'Character Sheet' }).first();
  await expect(sheetButton).toBeVisible({ timeout: 15_000 });
  await sheetButton.click();

  const sheet = page.getByRole('dialog').last();
  await expect(sheet.getByText(/Character sheet/i)).toBeVisible();
  await expect(sheet.getByText(/Equipment/i)).toBeVisible();
  await expect(sheet.getByText(/Weapons/i)).toBeVisible();
  await expect(sheet.getByText(/Damage:/i)).toBeVisible();
  await expect(sheet.getByText(/Range:/i)).toBeVisible();
  await expect(sheet.getByText('Investigative Journalist / Host')).toBeVisible();
  await expect(sheet.getByText('Microcassette recorder')).toBeVisible();
  await expect(sheet.getByText('Heavy-duty police flashlight')).toBeVisible();
  await expect(sheet.getByText('Ekwipunek', { exact: true })).toHaveCount(0);
  await expect(sheet.getByText('Obrażenia', { exact: true })).toHaveCount(0);
  await expect(sheet.getByText('Broń Palna', { exact: true })).toHaveCount(0);
  await expect(sheet.getByText('Dyktafon na mikrokasety', { exact: true })).toHaveCount(0);

  const biography = sheet.getByText(/Tomasz grew up in the shadow of the concrete blocks/i);
  await biography.scrollIntoViewIfNeeded();
  await expect(biography).toBeVisible();
  await expect(sheet.getByText('Warsaw, Poland').first()).toBeVisible();
  await expect(sheet.getByText('Composed')).toBeVisible();
  await expect(sheet.getByText('Gospodarz programu', { exact: false })).toHaveCount(0);

  await sheet.getByText(/Equipment/i).scrollIntoViewIfNeeded();
  await sheet.screenshot({ path: screenshotPath });
  expect(existsSync(screenshotPath)).toBe(true);
});
