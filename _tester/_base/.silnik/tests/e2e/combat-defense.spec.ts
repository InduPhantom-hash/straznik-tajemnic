import { expect, test, type Route } from '@playwright/test';

function seedCombatUi() {
  return (language: 'pl' | 'en') => {
    localStorage.clear();
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('language_selected', language);
    localStorage.setItem('rules_onboarding_completed', 'true');
    localStorage.setItem('has_started_game', 'true');
    localStorage.setItem('session_zero_completed', 'true');
    localStorage.setItem('ai_settings', JSON.stringify({
      voiceSettings: { enabled: false },
      imageGenerationEnabled: false,
      sessionZero: {
        narrativeMode: 'full_rpg',
        mechanics: { schemaVersion: 1, enabled: true },
      },
    }));
    localStorage.setItem('characters', JSON.stringify([{
      id: 'combat-character', name: 'Anna', occupation: 'Detective', age: 35,
      gender: 'female', str: 50, dex: 60, con: 60, app: 50, pow: 50, edu: 60,
      siz: 60, int: 60, luck: 50, hp: 12, maxHp: 12, san: 50, maxSan: 99,
      mp: 10, maxMp: 10, background: '', skills: { Unik: 45, 'Walka Wręcz': 50 },
      equipment: [], damageBonus: '0', playerName: '', isActive: true,
      lastUsed: new Date().toISOString(), notes: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
      developmentHistory: [],
    }]));
    localStorage.setItem('active_character_id', 'combat-character');
    localStorage.setItem('gm_npcs', JSON.stringify([{
      id: 'npc-cultist', name: 'Kultysta', type: 'hostile', occupation: '',
      str: 55, dex: 50, con: 50, app: 40, pow: 50, edu: 40, siz: 55, int: 45,
      luck: 40, hp: 11, maxHp: 11, san: 30, maxSan: 30, mp: 10, maxMp: 10,
      skills: { 'Walka Wręcz': 55 }, description: '', appearance: '', personality: '',
      motivations: '', relationshipWithPlayer: '', location: '', status: 'alive',
      statusEffects: [], tags: [], gmNotes: '', changeHistory: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      combatProfile: {
        schemaVersion: 1, attacksPerRound: 1,
        attackOptions: [{ kind: 'natural', attackOptionId: 'fist', name: 'Pięść',
          combatSkillId: 'Walka Wręcz', skillValue: 55,
          damageFormula: '1d3', damageClass: 'non_impaling' }],
      },
    }]));
    localStorage.setItem('zew-app-api-keys', JSON.stringify({ GEMINI_API_KEY: 'e2e-local-key' }));
    localStorage.setItem('pdf_memory', JSON.stringify({ rulesUrl: '/data/rag/rules.json' }));
    localStorage.setItem('zew_chat_messages', '[]');
  };
}

function sse(route: Route, body: string) {
  return route.fulfill({ status: 200, contentType: 'text/event-stream', body });
}

for (const locale of ['pl', 'en'] as const) {
  test(`melee defense is a blocking localized narrative decision in ${locale}`, async ({ page }) => {
    await page.addInitScript(seedCombatUi(), locale);
    let chatCalls = 0;
    await page.route('**/api/chat', async (route) => {
      chatCalls += 1;
      if (chatCalls === 1) {
        const attack = {
          schemaVersion: 1, eventId: 'assistant-e2e:melee:0', roundId: 'assistant-e2e', ordinal: 0,
          intent: locale === 'pl' ? 'Pięść leci w stronę szczęki.' : 'A fist arcs toward the jaw.',
          attacker: { id: 'npc-cultist', name: 'Kultysta', build: 0, hp: 11, maxHp: 11,
            armor: 0, attackSkill: 55, damageBonus: '0' },
          target: { characterId: 'combat-character', name: 'Anna' },
          weapon: { attackOptionId: 'fist', name: locale === 'pl' ? 'Pięść' : 'Fist',
            damageFormula: '1d3', damageClass: 'non_impaling' },
        };
        return sse(route,
          `data: ${JSON.stringify({ type: 'text', content: `${attack.intent}\n[ATAK_WRĘCZ: napastnik=npc-cultist` })}\n\n` +
          `data: ${JSON.stringify({ type: 'metadata', pendingMeleeAttacks: [attack], finishReason: 'STOP' })}\n\n`
        );
      }
      return sse(route,
        `data: ${JSON.stringify({ type: 'text', content: locale === 'pl' ? 'Anna odskakuje, a walka płynie dalej.' : 'Anna slips aside and the fight flows on.' })}\n\n` +
        `data: ${JSON.stringify({ type: 'metadata', finishReason: 'STOP' })}\n\n`
      );
    });
    await page.route('**/api/pdf/ingest-local**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, recordCount: 1 }),
    }));
    await page.route('**/api/health/gemini', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, valid: true }),
    }));

    await page.goto(`/${locale}`);
    await page.waitForTimeout(500);
    const apiKeyDialog = page.getByRole('dialog').filter({
      hasText: locale === 'pl' ? 'Konfiguracja kluczy API' : 'API Keys Configuration',
    });
    if (await apiKeyDialog.isVisible()) {
      await apiKeyDialog.getByRole('button', { name: 'Zamknij' }).click();
    }
    const rulebookDialog = page.getByRole('dialog').filter({
      hasText: locale === 'pl' ? 'Podręcznik Zasad CoC 7e' : 'CoC 7e Rulebook',
    });
    if (await rulebookDialog.isVisible()) {
      await rulebookDialog.getByRole('button', { name: 'Zamknij' }).click();
    }
    const input = page.getByPlaceholder(
      locale === 'pl' ? 'Wpisz wiadomość do Mistrza Gry...' : 'Write a message to the Game Master...'
    );
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(locale === 'pl' ? 'Czekam na ruch kultysty.' : 'I wait for the cultist.');
    await input.press('Enter');

    const dialog = page.getByRole('dialog').filter({
      hasText: locale === 'pl' ? 'Obrona w walce wręcz' : 'Melee Combat Defense',
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(locale === 'pl' ? 'Obrona w walce wręcz' : 'Melee Combat Defense');
    await expect(page.getByText('[ATAK_WRĘCZ:', { exact: false })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: locale === 'pl' ? 'Unik' : 'Dodge' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: locale === 'pl' ? 'Wykonaj kontratak' : 'Fight Back' })).toBeVisible();
    await page.screenshot({ path: `test-results/combat-defense-${locale}.png`, fullPage: true });

    await dialog.getByRole('button', { name: locale === 'pl' ? 'Unik' : 'Dodge' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(locale === 'pl'
      ? 'Anna odskakuje, a walka płynie dalej.'
      : 'Anna slips aside and the fight flows on.')).toBeVisible();
    expect(chatCalls).toBe(2);
    expect(await page.evaluate(() => localStorage.getItem('combat_round_journal_v1'))).toBeNull();
  });
}
