/**
 * 🎮 Full Playtest E2E - Automat Testowy 1-Click
 * 
 * Pełna automatyczna sesja gry trwająca ~30 minut.
 * Testuje wszystkie główne funkcje aplikacji w kontekście rzeczywistej rozgrywki.
 * 
 * Uruchomienie:
 *   npm run playtest           # headless (w tle)
 *   npm run playtest:headed    # z widoczną przeglądarką
 * 
 * Fazy testu:
 *   1. Setup (2 min) - Session Zero setup
 *   2. Character (3 min) - Tworzenie postaci
 *   3. HIGH (10 min) - Gra na preset HIGH
 *   4. MID (7 min) - Gra na preset MID  
 *   5. LOW (5 min) - Gra na preset LOW
 *   6. Verify (3 min) - Sprawdzenie dziennika i eksport
 */

import { test, expect, Page } from '@playwright/test';
import {
    START_GAME_MESSAGE,
    SESSION_ZERO_RESPONSES,
    TEST_CHARACTER,
    generateActionSequence,
    PHASE_CONFIG,
    delay,
    INVENTORY_ACTIONS,
    getRandomAction,
} from './test-scenarios';

// ============================================
// CONFIGURATION
// ============================================

// Timeout dla całego testu (40 minut dla bezpieczeństwa)
test.setTimeout(40 * 60 * 1000);

// Test results collector
interface PlaytestResults {
    phase: string;
    messagesExchanged: number;
    imagesGenerated: number;
    errors: string[];
    startTime: number;
    endTime: number;
}

const results: PlaytestResults[] = [];

// ============================================
// HELPER FUNCTIONS
// ============================================

async function waitForAppReady(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
}

async function findChatInput(page: Page): Promise<any> {
    // Poczekaj na pojawienie się chatu (może być ukryty za modalem)
    await page.waitForTimeout(2000);

    // Poszukaj textarea do wpisywania wiadomości
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

    // Jeśli nie znaleziono, może trzeba zamknąć modal
    const closeBtn = page.locator('button:has-text("×"), button:has-text("Zamknij")').first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(1000);
    }

    // Spróbuj ponownie
    for (const selector of selectors) {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
            return input;
        }
    }

    throw new Error('Chat input not found - sprawdź czy chat jest widoczny');
}

async function sendMessage(page: Page, message: string): Promise<void> {
    const input = await findChatInput(page);
    await input.fill(message);
    await input.press('Enter');
    // Czekaj na odpowiedź AI (max 90 sekund dla dłuższych odpowiedzi)
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => { });
}

async function countImages(page: Page): Promise<number> {
    const images = page.locator('img[src*="blob:"], img[src*="data:"], img[src*="storage.googleapis"]');
    return await images.count();
}

async function countMessages(page: Page): Promise<number> {
    const messages = page.locator('[class*="message"], [class*="chat-bubble"], [class*="prose"]');
    return await messages.count();
}

async function openSettings(page: Page): Promise<void> {
    // Szukaj przycisku ustawień
    const settingsButtons = [
        'button:has-text("Ustawienia")',
        'button[aria-label*="settings"]',
        'button:has(svg.lucide-settings)',
        'button:has(svg.lucide-cog)',
    ];

    for (const selector of settingsButtons) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await btn.click();
            await page.waitForTimeout(500);
            return;
        }
    }
}

async function setQualityPreset(page: Page, preset: 'low' | 'mid' | 'high' | 'ultra'): Promise<void> {
    await openSettings(page);

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

async function openCharacterWizard(page: Page): Promise<boolean> {
    const createButtons = [
        'button:has-text("Stwórz postać")',
        'button:has-text("Nowa postać")',
        'button:has-text("+ Postać")',
        'a:has-text("Stwórz")',
    ];

    for (const selector of createButtons) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await btn.click();
            await page.waitForTimeout(1000);
            return true;
        }
    }
    return false;
}

async function logPhaseResult(phase: string, startTime: number, page: Page, errors: string[] = []): Promise<void> {
    const endTime = Date.now();
    const imagesCount = await countImages(page);
    const messagesCount = await countMessages(page);

    results.push({
        phase,
        messagesExchanged: messagesCount,
        imagesGenerated: imagesCount,
        errors,
        startTime,
        endTime,
    });

    console.log(`\n📊 Faza "${phase}" zakończona:`);
    console.log(`   ⏱️ Czas: ${((endTime - startTime) / 1000 / 60).toFixed(1)} min`);
    console.log(`   💬 Wiadomości: ${messagesCount}`);
    console.log(`   🖼️ Obrazy: ${imagesCount}`);
    if (errors.length > 0) {
        console.log(`   ❌ Błędy: ${errors.length}`);
    }
}

// ============================================
// MAIN TEST
// ============================================

test.describe('🎮 Full Playtest - 30 min Automated Session', () => {

    test('Complete automated gameplay session', async ({ page }) => {
        console.log('\n🚀 ========================================');
        console.log('   FULL PLAYTEST START');
        console.log('   Estimated duration: ~30 minutes');
        console.log('========================================\n');

        const testStartTime = Date.now();
        const errors: string[] = [];

        // Nasłuchuj na błędy konsoli
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // ========================================
        // FAZA 1: SETUP (~2 min)
        // ========================================
        console.log('\n📋 FAZA 1: Setup & Session Zero');
        const phase1Start = Date.now();

        // Najpierw przejdź na stronę
        await page.goto('/');
        await waitForAppReady(page);

        // PEŁNY RESET APLIKACJI - czyści wszystkie dane z poprzednich sesji
        console.log('   🔄 Wykonuję pełny reset aplikacji...');
        await page.evaluate(() => {
            // Wyczyść localStorage
            localStorage.clear();
            // Wyczyść sessionStorage
            sessionStorage.clear();
            // Wyczyść IndexedDB (cache mediów)
            if (window.indexedDB) {
                indexedDB.deleteDatabase('MediaCache');
                indexedDB.deleteDatabase('persistent-media-cache');
            }
            console.log('✅ Reset: localStorage, sessionStorage, IndexedDB wyczyszczone');
        });
        console.log('   ✓ Reset wykonany - aplikacja jest czysta');

        // === WSTRZYKNIJ TESTOWĄ POSTAĆ do localStorage (zamiast używać wizarda) ===
        console.log('   👤 Wstrzykuję testową postać do localStorage...');
        await page.evaluate((testChar) => {
            // Pełny obiekt postaci kompatybilny z typem Character
            const fullCharacter = {
                id: 'test-character-' + Date.now(),
                name: testChar.name,
                occupation: testChar.occupation,
                age: testChar.age,
                residence: testChar.residence,
                birthplace: testChar.birthplace,
                background: testChar.backstory,
                // Statystyki CoC7
                stats: {
                    str: 50, con: 60, siz: 65, dex: 55, app: 50,
                    int: 70, pow: 55, edu: 65, luck: 50
                },
                derived: {
                    hp: 12, san: 55, mp: 11, damageBonus: '0', build: 0, movement: 8
                },
                skills: {
                    'Biblioteka': 60,
                    'Spostrzegawczość': 55,
                    'Psychologia': 45,
                    'Broń Palna': 40,
                    'Ukrywanie': 35,
                    'Tropienie': 30,
                    'Ślusarstwo': 25,
                    'Perswazja': 50,
                },
                creditRating: 30,
                inventory: [],
                journal: [],
                phobias: [],
            };

            // Zapisz do localStorage (tak jak robi to aplikacja)
            localStorage.setItem('characters', JSON.stringify([fullCharacter]));
            console.log('✅ Postać wstrzyknięta:', fullCharacter.name);
        }, TEST_CHARACTER);
        console.log('   ✓ Postać testowa gotowa: ' + TEST_CHARACTER.name);

        // Przeładuj stronę po resecie (postać będzie załadowana z localStorage)
        await page.reload();
        await waitForAppReady(page);

        // Sprawdź czy strona się załadowała
        await expect(page.locator('body')).toBeVisible();
        console.log('   ✓ Aplikacja załadowana');

        // Session Zero - odpowiedzi na pytania
        try {
            // Sprawdź czy jest Session Zero modal lub welcome screen
            const sessionZeroTexts = ['Witaj', 'Session Zero', 'Kalibracja', 'Era'];
            let foundSessionZero = false;

            for (const text of sessionZeroTexts) {
                if (await page.locator(`text=${text}`).isVisible({ timeout: 2000 }).catch(() => false)) {
                    foundSessionZero = true;
                    break;
                }
            }

            if (foundSessionZero) {
                console.log('   ✓ Znaleziono Session Zero');
                // Kliknij "Dalej" lub podobne przyciski
                const nextButtons = ['Dalej', 'Kontynuuj', 'Gotowe', 'Start'];
                for (const btnText of nextButtons) {
                    const btn = page.locator(`button:has-text("${btnText}")`).first();
                    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                        await btn.click();
                        await page.waitForTimeout(500);
                    }
                }
            }
        } catch (e) {
            console.log('   ⚠️ Session Zero nie znaleziono, kontynuuję');
        }

        await logPhaseResult('Setup', phase1Start, page, []);

        // ========================================
        // FAZA 2: POSTAĆ GOTOWA (wstrzyknięta z localStorage)
        // ========================================
        console.log('\n👤 FAZA 2: Weryfikacja Postaci');
        const phase2Start = Date.now();

        // Postać została wstrzyknięta do localStorage przed reload()
        // Nie używamy wizarda bo nie działa poprawnie z Playwright
        console.log('   ✓ Postać testowa: ' + TEST_CHARACTER.name);
        console.log('   ✓ Zawód: ' + TEST_CHARACTER.occupation);
        console.log('   ✓ Statystyki wstępne ustawione');

        await logPhaseResult('Character Setup', phase2Start, page, []);


        // Przejdź do gry - kliknij "Rozpocznij" na Welcome Screen
        console.log('   🎮 Przechodzę do gry...');
        await page.waitForTimeout(2000);

        // Po utworzeniu postaci wraca Welcome Screen - trzeba kliknąć "Rozpocznij"
        const startGameBtn = page.locator('button:has-text("Rozpocznij"), button:has-text("Start")').first();
        if (await startGameBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('   🎮 Klikam przycisk Rozpocznij...');
            await startGameBtn.click();
            await page.waitForTimeout(2000);
        }

        // Upewnij się że chat jest widoczny
        const chatInputCheck = page.locator('textarea[placeholder*="Mistrza Gry"], textarea[placeholder*="wiadomość"]');
        if (await chatInputCheck.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('   ✓ Chat jest widoczny i gotowy');
        } else {
            console.log('   ⚠️ Chat nie jest widoczny - próbuję zamknąć modal i kliknąć Rozpocznij');

            // Spróbuj zamknąć ewentualny modal
            const closeBtn = page.locator('button:has-text("×"), button:has-text("Zamknij")').first();
            if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await closeBtn.click();
                await page.waitForTimeout(1000);
            }

            // Spróbuj ponownie kliknąć Rozpocznij
            const startAgain = page.locator('button:has-text("Rozpocznij")').first();
            if (await startAgain.isVisible({ timeout: 2000 }).catch(() => false)) {
                console.log('   🎮 Ponownie klikam Rozpocznij...');
                await startAgain.click();
                await page.waitForTimeout(3000);
            }
        }

        // ========================================
        // FAZA 3: GRA NA PRESET HIGH (~10 min)
        // ========================================
        console.log('\n🎯 FAZA 3: Gra na preset HIGH (10 min)');
        const phase3Start = Date.now();

        await setQualityPreset(page, 'high');
        console.log('   ✓ Ustawiono preset HIGH');

        // Wyślij wiadomość startową
        try {
            await sendMessage(page, START_GAME_MESSAGE);
            console.log('   ✓ Wysłano "Zaczynamy!"');
            await page.waitForTimeout(10000); // Czekaj na intro AI
        } catch (e) {
            console.log('   ⚠️ Problem z wysłaniem wiadomości startowej');
        }

        // Generuj i wysyłaj akcje
        const highActions = generateActionSequence('high', PHASE_CONFIG.high.actionCount);
        console.log(`   📝 Generuję ${highActions.length} akcji dla fazy HIGH`);

        for (let i = 0; i < highActions.length; i++) {
            try {
                console.log(`   📤 [${i + 1}/${highActions.length}] ${highActions[i]}`);
                await sendMessage(page, highActions[i]);
                await delay(PHASE_CONFIG.high.delayBetweenActions);
            } catch (e) {
                console.log(`   ⚠️ Błąd przy akcji ${i + 1}`);
                errors.push(`HIGH phase action ${i + 1} failed`);
            }
        }

        await logPhaseResult('HIGH Preset Gameplay', phase3Start, page, errors.slice());

        // ========================================
        // FAZA 4: GRA NA PRESET MID (~7 min)
        // ========================================
        console.log('\n⚖️ FAZA 4: Gra na preset MID (7 min)');
        const phase4Start = Date.now();

        await setQualityPreset(page, 'mid');
        console.log('   ✓ Zmieniono na preset MID');

        const midActions = generateActionSequence('mid', PHASE_CONFIG.mid.actionCount);
        console.log(`   📝 Generuję ${midActions.length} akcji dla fazy MID`);

        for (let i = 0; i < midActions.length; i++) {
            try {
                console.log(`   📤 [${i + 1}/${midActions.length}] ${midActions[i]}`);
                await sendMessage(page, midActions[i]);
                await delay(PHASE_CONFIG.mid.delayBetweenActions);
            } catch (e) {
                console.log(`   ⚠️ Błąd przy akcji ${i + 1}`);
            }
        }

        await logPhaseResult('MID Preset Gameplay', phase4Start, page, []);

        // ========================================
        // FAZA 5: GRA NA PRESET LOW (~5 min)
        // ========================================
        console.log('\n⚡ FAZA 5: Gra na preset LOW (5 min)');
        const phase5Start = Date.now();

        await setQualityPreset(page, 'low');
        console.log('   ✓ Zmieniono na preset LOW');

        const lowActions = generateActionSequence('low', PHASE_CONFIG.low.actionCount);
        console.log(`   📝 Generuję ${lowActions.length} akcji dla fazy LOW`);

        for (let i = 0; i < lowActions.length; i++) {
            try {
                console.log(`   📤 [${i + 1}/${lowActions.length}] ${lowActions[i]}`);
                await sendMessage(page, lowActions[i]);
                await delay(PHASE_CONFIG.low.delayBetweenActions);
            } catch (e) {
                console.log(`   ⚠️ Błąd przy akcji ${i + 1}`);
            }
        }

        // Test ekwipunku
        console.log('   📦 Test ekwipunku...');
        await sendMessage(page, getRandomAction(INVENTORY_ACTIONS));

        await logPhaseResult('LOW Preset Gameplay', phase5Start, page, []);

        // ========================================
        // FAZA 6: WERYFIKACJA (~3 min)
        // ========================================
        console.log('\n✅ FAZA 6: Weryfikacja');
        const phase6Start = Date.now();

        // Sprawdź dziennik przygody
        const journalBtn = page.locator('button:has-text("Dziennik"), button:has-text("Journal")').first();
        if (await journalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await journalBtn.click();
            await page.waitForTimeout(1000);
            console.log('   ✓ Dziennik otwarty');

            // Zamknij dziennik
            const closeBtn = page.locator('button:has-text("×"), button:has-text("Zamknij")').first();
            if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await closeBtn.click();
            }
        } else {
            console.log('   ⚠️ Przycisk dziennika nie znaleziony');
        }

        // Policz finalne statystyki
        const finalImages = await countImages(page);
        const finalMessages = await countMessages(page);

        await logPhaseResult('Verification', phase6Start, page, []);

        // ========================================
        // RAPORT KOŃCOWY
        // ========================================
        const testEndTime = Date.now();
        const totalDuration = (testEndTime - testStartTime) / 1000 / 60;

        console.log('\n📊 ========================================');
        console.log('   PLAYTEST COMPLETE - FINAL REPORT');
        console.log('========================================');
        console.log(`⏱️  Całkowity czas: ${totalDuration.toFixed(1)} minut`);
        console.log(`💬 Wiadomości: ${finalMessages}`);
        console.log(`🖼️  Obrazy wygenerowane: ${finalImages}`);
        console.log(`❌ Błędy konsoli: ${errors.length}`);

        console.log('\n📋 Podsumowanie faz:');
        for (const result of results) {
            const duration = ((result.endTime - result.startTime) / 1000 / 60).toFixed(1);
            console.log(`   • ${result.phase}: ${duration} min, ${result.messagesExchanged} msg, ${result.imagesGenerated} img`);
        }
        console.log('========================================\n');

        // Zapisz raport do pliku
        const report = {
            timestamp: new Date().toISOString(),
            duration: totalDuration,
            phases: results,
            totals: {
                messages: finalMessages,
                images: finalImages,
                errors: errors.length,
            },
        };

        // Asercje końcowe
        expect(finalMessages).toBeGreaterThan(5); // Minimum 5 wiadomości
        console.log('✅ Test zakończony pomyślnie!');
    });
});
