import { expect, test } from '@playwright/test';

test('ręcznie kontynuuje MAX_TOKENS bez technicznego dymku gracza', async ({
  page,
}) => {
  const chatRequests: Array<Record<string, unknown>> = [];

  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const isRulesStatus =
      url.pathname === '/api/pdf/ingest-local' &&
      url.searchParams.get('type') === 'rules';

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isRulesStatus ? { recordCount: 1 } : { success: true }),
    });
  });
  await page.route('**/api/chat', async (route) => {
    chatRequests.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body:
        `data: ${JSON.stringify({ type: 'text', content: ' Dokończenie sceny.' })}\n\n` +
        `data: ${JSON.stringify({ type: 'metadata', finishReason: 'STOP' })}\n\n`,
    });
  });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('has_started_game', 'true');
    localStorage.setItem('session_zero_completed', 'true');
    localStorage.setItem(
      'zew_chat_messages',
      JSON.stringify([
        {
          id: 'assistant-partial',
          role: 'assistant',
          content: 'Urwany fragment',
          timestamp: '2026-08-23T12:00:00.000Z',
          finishReason: 'MAX_TOKENS',
        },
      ])
    );
    localStorage.setItem(
      'zew-app-api-keys',
      JSON.stringify({ GEMINI_API_KEY: 'e2e-local-key' })
    );
    localStorage.setItem(
      'pdf_memory',
      JSON.stringify({ rulesUrl: '/data/rag/rules.json' })
    );
  });

  await page.goto('/');
  await expect(page.getByText('Urwany fragment')).toBeVisible();
  const firstRunDialog = page.getByRole('dialog', {
    name: 'Pierwsze uruchomienie',
  });
  await expect(firstRunDialog).toBeVisible({ timeout: 15_000 });
  await firstRunDialog.getByRole('button', { name: 'Zamknij' }).click();
  await expect(firstRunDialog).toBeHidden();
  await page.getByRole('button', { name: 'Kontynuuj narrację' }).click();
  await expect(page.getByText('Dokończenie sceny.')).toBeVisible();
  await expect.poll(() => chatRequests.length).toBe(1);

  const request = chatRequests[0] as {
    message: string;
    messages: Array<Record<string, unknown>>;
  };
  expect(request.message).toContain('Dokończ poprzednią, urwaną wypowiedź');
  expect(request.messages).toHaveLength(1);
  expect(request.messages[0]).toMatchObject({
    id: 'assistant-partial',
    role: 'assistant',
    content: 'Urwany fragment',
    continuationRequested: true,
  });
  expect(request.messages[0].content).not.toContain(
    'Dokończ poprzednią, urwaną wypowiedź'
  );
});
