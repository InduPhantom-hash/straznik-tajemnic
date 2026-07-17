import { expect, test } from '@playwright/test';

const baseCharacter = {
  str: 55,
  dex: 60,
  con: 55,
  app: 50,
  pow: 65,
  edu: 75,
  siz: 60,
  int: 70,
  luck: 55,
  hp: 11,
  maxHp: 11,
  san: 65,
  maxSan: 99,
  mp: 13,
  maxMp: 13,
  age: 36,
  occupation: 'Badacz',
  background: 'Badacz gotowy do wspólnego śledztwa w Arkham.',
  isActive: false,
  lastUsed: '2026-07-17T18:00:00.000Z',
  notes: '',
  experience: {
    totalXP: 0,
    availableXP: 0,
    earnedThisSession: 0,
    maxEarnedThisSession: 0,
  },
  developmentHistory: [],
  skills: { Spostrzegawczość: 60, Psychologia: 50 },
};

const equipment = Array.from({ length: 6 }, (_, index) => ({
  id: `equipment-${index + 1}`,
  name: `Przedmiot ${index + 1}`,
  category: index === 0 ? 'document' : 'tool',
  description: 'Lokalny element wyposażenia testowego.',
  imageUrl:
    index === 0
      ? '/equipment/predefined/document.svg'
      : '/equipment/predefined/tool.svg',
  source: 'starting',
  condition: 'used',
}));

const sharedEntry = {
  id: 'shared-entry',
  timestamp: '2026-07-17T18:00:00.000Z',
  type: 'note',
  title: 'Wspólny trop',
  content: 'Ten sam wpis istnieje w obu starszych kartach.',
  tags: [],
  isBookmarked: false,
};

const characters = [
  {
    ...baseCharacter,
    id: 'arthur-duet',
    name: 'Arthur Pendleton',
    playerName: 'Aga',
    portraitUrl: '/portraits/predefined/arthur-pendleton.webp',
    equipment,
    journal: [
      {
        ...sharedEntry,
      },
      {
        ...sharedEntry,
        id: 'aga-entry',
        title: 'Notatka Agi',
        timestamp: '2026-07-17T17:00:00.000Z',
      },
    ],
  },
  {
    ...baseCharacter,
    id: 'beatrice-duet',
    name: 'Beatrice Vance',
    playerName: 'Jakub',
    portraitUrl: '/portraits/predefined/beatrice-vance.webp',
    equipment: equipment.map((item) => ({
      ...item,
      id: `beatrice-${item.id}`,
    })),
    journal: [
      {
        ...sharedEntry,
      },
      {
        ...sharedEntry,
        id: 'jakub-entry',
        title: 'Notatka Jakuba',
        timestamp: '2026-07-17T19:00:00.000Z',
      },
    ],
  },
];

const hotSeatConfig = {
  enabled: true,
  players: [
    {
      id: 'player-aga',
      name: 'Aga',
      color: '#4ade80',
      characterId: 'arthur-duet',
      isActive: true,
      turnCount: 0,
    },
    {
      id: 'player-jakub',
      name: 'Jakub',
      color: '#f472b6',
      characterId: 'beatrice-duet',
      isActive: false,
      turnCount: 0,
    },
  ],
  activePlayerIndex: 0,
  allowInterruptions: true,
  showPlayerIndicator: true,
};

test.describe('Etap 2 - pełny playtest Hot Seat', () => {
  test('obsługuje turę duetu, wspólny dziennik i lokalny ekwipunek', async ({
    page,
  }) => {
    const chatRequests: Array<Record<string, unknown>> = [];
    const consoleErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );
    await page.route('**/api/pdf/index-to-pinecone?type=rules*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ recordCount: 24 }),
      })
    );
    await page.route('**/api/chat', async (route) => {
      chatRequests.push(
        route.request().postDataJSON() as Record<string, unknown>
      );
      const text =
        'Wspólna odpowiedź MG. ' +
        '[DZIENNIK:notatka:Wspólna decyzja]Oboje wchodzą do biblioteki.[/DZIENNIK]';
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body:
          `data: ${JSON.stringify({ type: 'text', content: text })}\n\n` +
          `data: ${JSON.stringify({ type: 'metadata' })}\n\n`,
      });
    });

    await page.addInitScript(
      ({ seededCharacters, seededHotSeat }) => {
        localStorage.clear();
        localStorage.setItem('characters', JSON.stringify(seededCharacters));
        localStorage.setItem('hotSeatConfig', JSON.stringify(seededHotSeat));
        localStorage.setItem('has_started_game', 'true');
        localStorage.setItem('session_zero_completed', 'true');
        localStorage.setItem(
          'zew-app-api-keys',
          JSON.stringify({ GEMINI_API_KEY: 'e2e-local-key' })
        );
        localStorage.setItem(
          'pdf_memory',
          JSON.stringify({ rulesUrl: '/data/rag/rules.json' })
        );
      },
      { seededCharacters: characters, seededHotSeat: hotSeatConfig }
    );

    await page.goto('/');
    const firstRunDialog = page.getByRole('dialog', {
      name: 'Pierwsze uruchomienie',
    });
    const firstRunAppeared = await firstRunDialog
      .waitFor({ state: 'visible', timeout: 2500 })
      .then(() => true)
      .catch(() => false);
    if (firstRunAppeared) {
      await firstRunDialog.getByRole('button', { name: 'Zamknij' }).click();
    }
    await expect(page.getByText('Aga', { exact: true })).toBeVisible();
    await expect(page.getByText('(Arthur Pendleton)')).toBeVisible();

    await page
      .getByRole('button', { name: /Jakub \(Beatrice Vance\)/ })
      .click();
    await expect(page.getByText('Jakub', { exact: true })).toBeVisible();
    await expect(page.getByText('(Beatrice Vance)')).toBeVisible();
    await page
      .getByRole('button', { name: /Aga \(Arthur Pendleton\)/ })
      .click();

    const declaration = page.getByPlaceholder(/wpisz deklarację/i);
    await expect(declaration).toHaveAttribute('placeholder', /Aga:/);
    await declaration.fill('Aga bada zamknięte drzwi.');
    await declaration.press('Enter');
    await expect(declaration).toHaveAttribute('placeholder', /Jakub:/);
    await expect(page.getByText('Aga bada zamknięte drzwi.')).toBeVisible();

    await declaration.fill('Jakub sprawdza ślady przy oknie.');
    await declaration.press('Enter');
    const sendTurn = page.getByRole('button', { name: 'Wyślij turę' });
    await expect(sendTurn).toBeEnabled();
    await sendTurn.click();

    await expect.poll(() => chatRequests.length).toBe(1);
    const requestBody = JSON.stringify(chatRequests[0]);
    expect(requestBody).toContain('Aga bada zamknięte drzwi.');
    expect(requestBody).toContain('Jakub sprawdza ślady przy oknie.');
    await expect(page.getByText('Wspólna odpowiedź MG.')).toBeVisible();

    await page.getByRole('button', { name: /Dziennik Przygody/ }).click();
    await expect(
      page.getByRole('heading', { name: 'DZIENNIK PRZYGODY' })
    ).toBeVisible();
    await expect(page.getByText('Wspólny dla: Aga i Jakub')).toBeVisible();
    await page.getByRole('button', { name: 'Notatki' }).click();
    await expect(page.getByText('Notatka Agi')).toBeVisible();
    await expect(page.getByText('Notatka Jakuba')).toBeVisible();
    await expect(page.getByText('Wspólna decyzja')).toBeVisible();
    await expect(page.getByText('Wspólny trop')).toHaveCount(1);
    await page.getByTitle('Zamknij dziennik').click();

    await page.getByRole('button', { name: /Ekwipunek/ }).click();
    await expect(page.getByText('Przedmiotów', { exact: true })).toBeVisible();
    await expect(
      page.locator('img[src^="/equipment/predefined/"]')
    ).toHaveCount(6);

    expect(
      consoleErrors.filter(
        (message) =>
          !message.includes('Failed to load resource') &&
          !message.includes('Sentry')
      )
    ).toEqual([]);
  });
});
