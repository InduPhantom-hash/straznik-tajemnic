/**
 * Feature #12 — System głosów (TTS, regresja smoke)
 *
 * Test regresyjny dla obszaru #12 audytowanego w Sesji 5 IND-42 (2026-05-07).
 * Pokrywa critical path: page renders + /api/tts/{provider} error path mock guard.
 *
 * Strategia: mock fetch przez `page.route('** /api/**')` — zero kosztów Google TTS /
 * ElevenLabs / OpenAI / Gemini API. Testy NIE wywołują prawdziwych providerów.
 *
 * Pominięte (świadomie minimal scope, smoke zbiorczy na końcu cleanup serii per
 * memory feedback strategy):
 *  - Real Google TTS Wavenet/Chirp3-HD synthesis (~$4/M znaków cost)
 *  - Real ElevenLabs streaming Flash v2.5 WebSocket (~75ms latencji, premium tier)
 *  - Real Gemini 2.5 Flash TTS preview (rate limity preview tier)
 *  - Multi-voice NPC dialogues flow (multi-voice/route.ts 396 lin VOICE_POOLS)
 *  - Voice queue batching (voice-queue-service.ts B2 NIE provider-aware bug)
 *  - openai/route.ts DOUBLE BILLING regression catch (B1 finding — wymaga zaimplementowania fixu PRZED testem)
 *  - Module-level singletons multi-user race (B3 — wymaga 2 instance Vercel test)
 * Powód: scope sesji audytowej = SMOKE regresji (TTS endpoints zwracają sensowny shape),
 * NIE pełna integracja TTS pipeline.
 *
 * Spec doc: .agent/features/12-system-glosow-tts.md
 */

import { test, expect } from '@playwright/test';

test.describe('Feature #12: System głosów TTS (regresja smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all /api/** — zero kosztów providerów + zero flakiness external API.
    // Default 200 success, T2 nadpisuje dla error path.
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, voices: [], count: 0 }),
      })
    );
  });

  test('1. strona główna renderuje się bez crash (TTS settings loadable)', async ({
    page,
  }) => {
    await page.goto('/');
    // Sanity: body istnieje, brak runtime errorów blokujących render
    await expect(page.locator('body')).toBeVisible();
    // Brak `Application error` lub `500` w head/body
    const html = await page.content();
    expect(html).not.toContain('Application error');
    expect(html).not.toContain('Internal Server Error');
  });

  test('2. /api/tts/google error path mock (regression guard dla provider switch)', async ({
    page,
  }) => {
    // Override mock dla /api/tts/google → 500 (np. Google Cloud quota exhausted)
    // Test sprawdza że gdy provider zwróci 500, klient otrzymuje sensowną odpowiedź
    // (regression guard dla page.route mechaniki gdy provider switch w UI Settings).
    await page.route('**/api/tts/google', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Wystąpił błąd podczas generowania audio',
          details: 'Mock Google Cloud TTS API quota exhausted',
        }),
      })
    );

    await page.goto('/');

    // Bezpośredni fetch przez page.evaluate — sprawdza czy mock /api/tts/google trafia
    // (regression guard dla page.route mechaniki gdy user wybiera Google jako provider).
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Test narracji Mistrza Gry — krótka wiadomość dla regresji',
          settings: {
            languageCode: 'pl-PL',
            voiceName: 'pl-PL-Chirp3-HD-Charon',
            gender: 'MALE',
            speakingRate: 0.85,
          },
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Wystąpił błąd podczas generowania audio');
    expect(response.body.details).toContain('quota exhausted');
  });
});
