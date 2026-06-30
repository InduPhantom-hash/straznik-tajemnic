/**
 * 🎮 Extended Playtest E2E - 4h Automated Session
 * 
 * Rozszerzony test automatyczny trwający ~4 godziny.
 * Fokus na presety LOW i MID. Testuje wszystkie funkcje aplikacji w kontekście długiej rozgrywki.
 * 
 * Uruchomienie:
 *   npx playwright test extended-playtest.spec.ts --project=chromium
 *   npx playwright test extended-playtest.spec.ts --headed  # z widoczną przeglądarką
 * 
 * Fazy testu:
 *   1. Setup (5 min) - Session Zero, wstrzyknięcie postaci
 *   2. LOW Preset - Phase 1 (60 min) - Eksploracja, dialogi, testy umiejętności
 *   3. LOW Preset - Phase 2 (60 min) - Walka, pościgi, ekwipunek
 *   4. MID Preset - Phase 1 (60 min) - Kompleksowe scenariusze z TTS
 *   5. MID Preset - Phase 2 (60 min) - Długie interakcje, obrazy
 *   6. Verification (10 min) - Sprawdzenie dziennika, eksport, raport
 */

import { test, expect, Page } from '@playwright/test';
import {
    START_GAME_MESSAGE,
    TEST_CHARACTER,
    EXPLORATION_ACTIONS,
    DIALOG_ACTIONS,
    SKILL_TEST_ACTIONS,
    COMBAT_ACTIONS,
    INVENTORY_ACTIONS,
    SANITY_ACTIONS,
    getRandomAction,
    delay,
} from './test-scenarios';

// ============================================
// EXTENDED CONFIGURATION
// ============================================

// Timeout dla 4h+ testu (5 godzin dla bezpieczeństwa)
test.setTimeout(5 * 60 * 60 * 1000);

// Extended Phase Configuration
const EXTENDED_PHASE_CONFIG = {
    low_phase1: {
        name: 'LOW - Eksploracja',
        preset: 'low' as const,
        duration: 60 * 60 * 1000, // 60 minutes
        actionCount: 60, // ~1 akcja/min
        delayBetweenActions: 45000, // 45 sekund między akcjami
        actionMix: { exploration: 0.4, dialog: 0.3, skill: 0.2, inventory: 0.1 },
    },
    low_phase2: {
        name: 'LOW - Walka i Pościgi',
        preset: 'low' as const,
        duration: 60 * 60 * 1000,
        actionCount: 50,
        delayBetweenActions: 50000,
        actionMix: { combat: 0.4, skill: 0.3, exploration: 0.2, sanity: 0.1 },
    },
    mid_phase1: {
        name: 'MID - Kompleksowe Scenariusze',
        preset: 'mid' as const,
        duration: 60 * 60 * 1000,
        actionCount: 45, // mniej akcji bo dłuższe odpowiedzi z TTS
        delayBetweenActions: 60000, // 60 sekund (TTS potrzebuje czasu)
        actionMix: { dialog: 0.4, exploration: 0.3, skill: 0.2, inventory: 0.1 },
    },
    mid_phase2: {
        name: 'MID - Długie Interakcje',
        preset: 'mid' as const,
        duration: 60 * 60 * 1000,
        actionCount: 40,
        delayBetweenActions: 70000,
        actionMix: { dialog: 0.5, skill: 0.25, combat: 0.15, sanity: 0.1 },
    },
};

// Extended test results
interface ExtendedPlaytestResults {
    phase: string;
    preset: string;
    messagesExchanged: number;
    imagesGenerated: number;
    ttsGenerated: number;
    errors: string[];
    durationMs: number;
    actionsCompleted: number;
    actionsTotal: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function waitForAppReady(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
}

async function findChatInput(page: Page): Promise<any> {
    await page.waitForTimeout(2000);

    const selectors = [
        'textarea[placeholder*="Mistrza Gry"]',
        'textarea[placeholder*="wiadomość"]',
        'textarea[placeholder*="Wpisz"]',
        'textarea',
    ];

    for (const selector of selectors) {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
            return input;
        }
    }

    // Zamknij ewentualne modale
    const closeBtn = page.locator('button:has-text("×"), button:has-text("Zamknij")').first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(1000);
    }

    for (const selector of selectors) {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
            return input;
        }
    }

    throw new Error('Chat input not found');
}

async function sendMessage(page: Page, message: string): Promise<boolean> {
    try {
        const input = await findChatInput(page);
        await input.fill(message);
        await input.press('Enter');

        // Czekaj na odpowiedź AI (max 2 minuty dla dłuższych odpowiedzi z TTS)
        await page.waitForTimeout(5000);
        await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => { });
        return true;
    } catch (e) {
        console.log(`   ⚠️ Błąd wysyłania: ${e}`);
        return false;
    }
}

async function countImages(page: Page): Promise<number> {
    const images = page.locator('img[src*="blob:"], img[src*="data:"], img[src*="storage.googleapis"]');
    return await images.count();
}

async function countMessages(page: Page): Promise<number> {
    const messages = page.locator('[class*="message"], [class*="chat-bubble"], [class*="prose"]');
    return await messages.count();
}

async function setQualityPreset(page: Page, preset: 'low' | 'mid'): Promise<void> {
    // Otwórz ustawienia
    const settingsButtons = [
        'button:has-text("Ustawienia")',
        'button[aria-label*="settings"]',
        'button:has(svg.lucide-settings)',
    ];

    for (const selector of settingsButtons) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await btn.click();
            await page.waitForTimeout(1000);
            break;
        }
    }

    // Kliknij preset
    const presetButton = page.locator(`button:has-text("${preset.toUpperCase()}")`).first();
    if (await presetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await presetButton.click();
        await page.waitForTimeout(500);
    }

    // Zamknij modal
    const closeBtn = page.locator('button:has-text("×"), button:has-text("Zamknij")').first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
    }
}

function generateExtendedActionSequence(
    config: { actionCount: number; actionMix: Record<string, number> }
): string[] {
    const actions: string[] = [];
    const mix = config.actionMix;

    for (let i = 0; i < config.actionCount; i++) {
        const rand = Math.random();
        let cumulative = 0;

        if ('exploration' in mix && rand < (cumulative += mix.exploration || 0)) {
            actions.push(getRandomAction(EXPLORATION_ACTIONS));
        } else if ('dialog' in mix && rand < (cumulative += mix.dialog || 0)) {
            actions.push(getRandomAction(DIALOG_ACTIONS));
        } else if ('skill' in mix && rand < (cumulative += mix.skill || 0)) {
            actions.push(getRandomAction(SKILL_TEST_ACTIONS));
        } else if ('combat' in mix && rand < (cumulative += mix.combat || 0)) {
            actions.push(getRandomAction(COMBAT_ACTIONS));
        } else if ('inventory' in mix && rand < (cumulative += mix.inventory || 0)) {
            actions.push(getRandomAction(INVENTORY_ACTIONS));
        } else if ('sanity' in mix) {
            actions.push(getRandomAction(SANITY_ACTIONS));
        } else {
            actions.push(getRandomAction(EXPLORATION_ACTIONS));
        }
    }

    return actions;
}

async function runPhase(
    page: Page,
    config: { name: string; preset: 'low' | 'mid'; duration: number; actionCount: number; delayBetweenActions: number; actionMix: Record<string, number> },
    phaseNumber: number
): Promise<ExtendedPlaytestResults> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 FAZA ${phaseNumber}: ${config.name} (${config.preset.toUpperCase()})`);
    console.log(`   ⏱️  Planowany czas: ${config.duration / 60000} min`);
    console.log(`   📝 Liczba akcji: ${config.actionCount}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();
    const errors: string[] = [];
    let actionsCompleted = 0;

    // Ustaw preset
    await setQualityPreset(page, config.preset);
    console.log(`   ✓ Preset ustawiony: ${config.preset.toUpperCase()}`);

    // Generuj i wykonuj akcje
    const actions = generateExtendedActionSequence(config);

    for (let i = 0; i < actions.length; i++) {
        const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
        console.log(`   [${elapsedMinutes}m] [${i + 1}/${actions.length}] ${actions[i].substring(0, 50)}...`);

        const success = await sendMessage(page, actions[i]);
        if (success) {
            actionsCompleted++;
        } else {
            errors.push(`Action ${i + 1} failed: ${actions[i].substring(0, 30)}`);
        }

        // Poczekaj między akcjami
        if (i < actions.length - 1) {
            await delay(config.delayBetweenActions);
        }

        // Progress log co 10 akcji
        if ((i + 1) % 10 === 0) {
            const imagesNow = await countImages(page);
            const messagesNow = await countMessages(page);
            console.log(`   📊 Postęp: ${i + 1}/${actions.length} akcji | ${messagesNow} wiadomości | ${imagesNow} obrazów`);
        }
    }

    const endTime = Date.now();
    const imagesGenerated = await countImages(page);
    const messagesExchanged = await countMessages(page);

    const result: ExtendedPlaytestResults = {
        phase: config.name,
        preset: config.preset,
        messagesExchanged,
        imagesGenerated,
        ttsGenerated: 0, // TTS liczony przez logowanie w konsoli
        errors,
        durationMs: endTime - startTime,
        actionsCompleted,
        actionsTotal: config.actionCount,
    };

    console.log(`\n📊 Faza "${config.name}" zakończona:`);
    console.log(`   ⏱️ Czas: ${(result.durationMs / 60000).toFixed(1)} min`);
    console.log(`   ✅ Akcje: ${actionsCompleted}/${config.actionCount}`);
    console.log(`   💬 Wiadomości: ${messagesExchanged}`);
    console.log(`   🖼️ Obrazy: ${imagesGenerated}`);
    if (errors.length > 0) {
        console.log(`   ❌ Błędy: ${errors.length}`);
    }

    return result;
}

// ============================================
// MAIN TEST
// ============================================

test.describe('🎮 Extended Playtest - 4h Automated Session (LOW/MID Focus)', () => {
    test('Complete 4-hour automated gameplay session', async ({ page }) => {
        console.log('\n' + '🚀'.repeat(30));
        console.log('   EXTENDED PLAYTEST START');
        console.log('   Estimated duration: ~4 hours');
        console.log('   Focus: LOW and MID presets');
        console.log('🚀'.repeat(30) + '\n');

        const testStartTime = Date.now();
        const allResults: ExtendedPlaytestResults[] = [];
        const consoleErrors: string[] = [];

        // Nasłuchuj na błędy konsoli
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // ========================================
        // SETUP PHASE
        // ========================================
        console.log('\n📋 SETUP: Inicjalizacja aplikacji');
        await page.goto('/');
        await waitForAppReady(page);

        // Reset aplikacji
        console.log('   🔄 Wykonuję pełny reset...');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            if (window.indexedDB) {
                indexedDB.deleteDatabase('MediaCache');
                indexedDB.deleteDatabase('persistent-media-cache');
            }
        });

        // Wstrzyknij postać testową
        console.log('   👤 Wstrzykuję postać testową...');
        await page.evaluate((testChar) => {
            const fullCharacter = {
                id: 'extended-test-' + Date.now(),
                name: testChar.name,
                occupation: testChar.occupation,
                age: testChar.age,
                residence: testChar.residence,
                birthplace: testChar.birthplace,
                background: testChar.backstory,
                stats: { str: 50, con: 60, siz: 65, dex: 55, app: 50, int: 70, pow: 55, edu: 65, luck: 50 },
                derived: { hp: 12, san: 55, mp: 11, damageBonus: '0', build: 0, movement: 8 },
                skills: {
                    'Biblioteka': 60, 'Spostrzegawczość': 55, 'Psychologia': 45,
                    'Broń Palna': 40, 'Ukrywanie': 35, 'Tropienie': 30, 'Perswazja': 50,
                },
                creditRating: 30,
                inventory: [],
                journal: [],
                phobias: [],
            };
            localStorage.setItem('characters', JSON.stringify([fullCharacter]));
        }, TEST_CHARACTER);

        await page.reload();
        await waitForAppReady(page);

        // Rozpocznij grę
        const startGameBtn = page.locator('button:has-text("Rozpocznij"), button:has-text("Start")').first();
        if (await startGameBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await startGameBtn.click();
            await page.waitForTimeout(3000);
        }

        // Wyślij wiadomość startową
        await sendMessage(page, START_GAME_MESSAGE);
        await page.waitForTimeout(15000); // Czekaj na intro AI
        console.log('   ✓ Gra rozpoczęta!\n');

        // ========================================
        // MAIN PHASES
        // ========================================

        // Phase 1: LOW - Eksploracja
        const result1 = await runPhase(page, EXTENDED_PHASE_CONFIG.low_phase1, 1);
        allResults.push(result1);

        // Phase 2: LOW - Walka i Pościgi
        const result2 = await runPhase(page, EXTENDED_PHASE_CONFIG.low_phase2, 2);
        allResults.push(result2);

        // Phase 3: MID - Kompleksowe Scenariusze
        const result3 = await runPhase(page, EXTENDED_PHASE_CONFIG.mid_phase1, 3);
        allResults.push(result3);

        // Phase 4: MID - Długie Interakcje
        const result4 = await runPhase(page, EXTENDED_PHASE_CONFIG.mid_phase2, 4);
        allResults.push(result4);

        // ========================================
        // VERIFICATION PHASE
        // ========================================
        console.log('\n✅ WERYFIKACJA: Sprawdzanie stanu końcowego');

        // Sprawdź dziennik
        const journalBtn = page.locator('button:has-text("Dziennik")').first();
        if (await journalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await journalBtn.click();
            await page.waitForTimeout(2000);
            console.log('   ✓ Dziennik otwarty');

            const closeBtn = page.locator('button:has-text("×")').first();
            if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn.click();
            }
        }

        // ========================================
        // FINAL REPORT
        // ========================================
        const testEndTime = Date.now();
        const totalDuration = (testEndTime - testStartTime) / 1000 / 60;
        const finalImages = await countImages(page);
        const finalMessages = await countMessages(page);

        console.log('\n' + '📊'.repeat(30));
        console.log('   EXTENDED PLAYTEST COMPLETE - FINAL REPORT');
        console.log('📊'.repeat(30));
        console.log(`\n⏱️  Całkowity czas: ${totalDuration.toFixed(1)} minut (${(totalDuration / 60).toFixed(2)} godzin)`);
        console.log(`💬 Wiadomości: ${finalMessages}`);
        console.log(`🖼️  Obrazy wygenerowane: ${finalImages}`);
        console.log(`❌ Błędy konsoli: ${consoleErrors.length}`);

        console.log('\n📋 Podsumowanie faz:');
        console.log('-'.repeat(70));
        for (const result of allResults) {
            const duration = (result.durationMs / 60000).toFixed(1);
            const successRate = ((result.actionsCompleted / result.actionsTotal) * 100).toFixed(0);
            console.log(`   ${result.phase.padEnd(30)} | ${duration.padStart(6)} min | ${successRate}% sukces | ${result.imagesGenerated} img | ${result.errors.length} err`);
        }
        console.log('-'.repeat(70));

        // Podsumowanie presetów
        const lowResults = allResults.filter(r => r.preset === 'low');
        const midResults = allResults.filter(r => r.preset === 'mid');

        console.log('\n📈 Statystyki per preset:');
        console.log(`   LOW: ${lowResults.reduce((s, r) => s + r.actionsCompleted, 0)} akcji, ${lowResults.reduce((s, r) => s + r.imagesGenerated, 0)} obrazów`);
        console.log(`   MID: ${midResults.reduce((s, r) => s + r.actionsCompleted, 0)} akcji, ${midResults.reduce((s, r) => s + r.imagesGenerated, 0)} obrazów`);

        // Zapisz raport JSON do konsoli
        const report = {
            timestamp: new Date().toISOString(),
            duration: { minutes: totalDuration, hours: totalDuration / 60 },
            presets: ['low', 'mid'],
            phases: allResults,
            totals: {
                messages: finalMessages,
                images: finalImages,
                actionsTotal: allResults.reduce((s, r) => s + r.actionsTotal, 0),
                actionsCompleted: allResults.reduce((s, r) => s + r.actionsCompleted, 0),
                errors: consoleErrors.length,
            },
        };

        console.log('\n📄 Full Report JSON:');
        console.log(JSON.stringify(report, null, 2));

        // Asercje końcowe
        expect(finalMessages).toBeGreaterThan(50);
        expect(report.totals.actionsCompleted / report.totals.actionsTotal).toBeGreaterThan(0.8);

        console.log('\n✅ Extended Playtest zakończony pomyślnie!');
        console.log('📊'.repeat(30) + '\n');
    });
});
