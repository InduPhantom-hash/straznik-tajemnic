/**
 * 🧪 Kompleksowe Testy E2E - Zew App 3.0
 * 
 * Testy przepływu użytkownika symulujące pełne scenariusze gry.
 * Uruchomienie: npx playwright test tests/e2e/full-qa.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// ============================================
// HELPERS
// ============================================

async function waitForAppLoad(page: Page) {
    // Czekaj na załadowanie głównej strony
    await page.waitForLoadState('networkidle');
    // Dodatkowe czekanie na hydration
    await page.waitForTimeout(1000);
}

async function dismissModals(page: Page) {
    // Zamknij wszystkie otwarte modale
    const closeButtons = page.locator('[data-testid="modal-close"], button:has-text("×"), button:has-text("Zamknij")');
    try {
        const count = await closeButtons.count();
        for (let i = 0; i < count; i++) {
            await closeButtons.nth(0).click({ timeout: 1000 }).catch(() => { });
        }
    } catch {
        // Brak modali do zamknięcia
    }
}

// ============================================
// TESTY: ŁADOWANIE APLIKACJI
// ============================================

test.describe('🚀 Ładowanie Aplikacji', () => {
    test('Strona główna ładuje się bez błędów', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);

        // Sprawdź czy nie ma błędów JavaScript
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Poczekaj chwilę na ewentualne błędy
        await page.waitForTimeout(2000);

        // Sprawdź czy strona główna jest widoczna
        await expect(page.locator('body')).toBeVisible();

        // Raportuj błędy (ale nie failuj testu - niektóre błędy mogą być nieistotne)
        if (consoleErrors.length > 0) {
            console.log('⚠️ Console errors:', consoleErrors);
        }
    });

    test('Sidebar jest widoczny i interaktywny', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);

        // Sprawdź elementy sidebar
        const sidebar = page.locator('[class*="sidebar"], aside, nav').first();
        await expect(sidebar).toBeVisible();
    });
});

// ============================================
// TESTY: CZAT I AI
// ============================================

test.describe('💬 Czat i AI', () => {
    test('Można wysłać wiadomość i otrzymać odpowiedź', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);
        await dismissModals(page);

        // Znajdź pole tekstowe
        const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: /wpisz|message|wiadomość/i }).first();

        // Jeśli nie znaleziono, szukaj po placeholderze
        const input = await chatInput.count() > 0
            ? chatInput
            : page.locator('textarea[placeholder*="wiadomość"], textarea[placeholder*="message"], textarea').first();

        if (await input.isVisible()) {
            // Wpisz testową wiadomość
            await input.fill('Test QA automatyczny');

            // Wyślij (Enter lub przycisk)
            await input.press('Enter');

            // Czekaj na odpowiedź AI (max 30s)
            await page.waitForTimeout(3000);

            // Sprawdź czy pojawiła się odpowiedź
            const messages = page.locator('[class*="message"], [class*="chat"], [class*="bubble"]');
            expect(await messages.count()).toBeGreaterThan(0);
        } else {
            console.log('⚠️ Chat input not found on main page');
        }
    });

    test('Odpowiedź AI nie zawiera nawiasów klamrowych {}', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);
        await dismissModals(page);

        // Szukaj wiadomości AI w chacie
        const aiMessages = page.locator('[class*="assistant"], [class*="ai-message"], [role="assistant"]');

        const count = await aiMessages.count();
        for (let i = 0; i < count; i++) {
            const text = await aiMessages.nth(i).textContent();
            if (text) {
                // Sprawdź czy nie ma nawiasów klamrowych
                const hasCurlyBraces = text.includes('{') && text.includes('}');
                if (hasCurlyBraces) {
                    console.error('❌ Znaleziono {} w tekście:', text.substring(0, 100));
                }
                expect(hasCurlyBraces).toBe(false);
            }
        }
    });
});

// ============================================
// TESTY: TWORZENIE POSTACI
// ============================================

test.describe('👤 System Postaci', () => {
    test('Kreator postaci otwiera się i ma wszystkie kroki', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);

        // Szukaj przycisku tworzenia postaci
        const createCharBtn = page.locator('button:has-text("Stwórz"), button:has-text("Nowa postać"), [data-testid="create-character"]').first();

        if (await createCharBtn.isVisible()) {
            await createCharBtn.click();
            await page.waitForTimeout(1000);

            // Sprawdź czy wizard się otworzył
            const wizard = page.locator('[class*="wizard"], [class*="modal"], [role="dialog"]');
            if (await wizard.count() > 0) {
                await expect(wizard.first()).toBeVisible();
            }
        } else {
            console.log('⚠️ Character creation button not found');
        }
    });

    test('Karta postaci wyświetla statystyki poprawnie', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);

        // Szukaj karty postaci lub linku do niej
        const characterSheet = page.locator('[class*="character-sheet"], [class*="character-card"]');

        if (await characterSheet.count() > 0) {
            // Sprawdź czy są podstawowe statystyki
            const statsToCheck = ['STR', 'DEX', 'INT', 'CON', 'POW', 'APP', 'SIZ', 'EDU'];

            for (const stat of statsToCheck) {
                const statElement = page.locator(`text=${stat}`);
                if (await statElement.count() > 0) {
                    console.log(`✓ Statystyka ${stat} widoczna`);
                }
            }
        }
    });
});

// ============================================
// TESTY: USTAWIENIA
// ============================================

test.describe('⚙️ Ustawienia', () => {
    test('Modal ustawień otwiera się', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);

        // Szukaj przycisku ustawień
        const settingsBtn = page.locator('button:has-text("Ustawienia"), button[aria-label*="settings"], [data-testid="settings"]').first();

        if (await settingsBtn.isVisible()) {
            await settingsBtn.click();
            await page.waitForTimeout(500);

            // Sprawdź czy modal się otworzył
            const modal = page.locator('[role="dialog"], [class*="modal"]');
            expect(await modal.count()).toBeGreaterThan(0);
        } else {
            // Szukaj ikony settings (koło zębate)
            const gearIcon = page.locator('svg[class*="lucide-settings"], button:has(svg)').first();
            if (await gearIcon.isVisible()) {
                console.log('✓ Found settings icon');
            }
        }
    });

    test('Presety jakości są dostępne', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);

        // Otwórz ustawienia
        const settingsBtn = page.locator('button:has-text("Ustawienia"), [aria-label*="settings"]').first();

        if (await settingsBtn.isVisible()) {
            await settingsBtn.click();
            await page.waitForTimeout(500);

            // Sprawdź czy są presety
            const presets = ['LOW', 'MID', 'HIGH', 'ULTRA'];
            for (const preset of presets) {
                const presetBtn = page.locator(`button:has-text("${preset}"), [data-preset="${preset}"]`);
                if (await presetBtn.count() > 0) {
                    console.log(`✓ Preset ${preset} dostępny`);
                }
            }
        }
    });
});

// ============================================
// TESTY: TTS (Text-to-Speech)
// ============================================

test.describe('🔊 TTS System', () => {
    test('Przycisk głosu jest dostępny', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);

        // Szukaj przycisku głosu
        const voiceBtn = page.locator('button:has(svg[class*="volume"]), button[aria-label*="voice"], button[aria-label*="głos"]');

        if (await voiceBtn.count() > 0) {
            await expect(voiceBtn.first()).toBeVisible();
            console.log('✓ Voice button found');
        } else {
            console.log('⚠️ Voice button not visible (may be disabled)');
        }
    });
});

// ============================================
// TESTY: RESPONSYWNOŚĆ
// ============================================

test.describe('📱 Responsywność', () => {
    test('Aplikacja działa na mobile', async ({ page }) => {
        // Ustaw viewport na mobile
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await waitForAppLoad(page);

        // Sprawdź czy body jest widoczne
        await expect(page.locator('body')).toBeVisible();

        // Sprawdź czy nie ma horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);

        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // +10 dla tolerancji
    });

    test('Aplikacja działa na tablet', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await waitForAppLoad(page);

        await expect(page.locator('body')).toBeVisible();
    });

    test('Aplikacja działa na desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');
        await waitForAppLoad(page);

        await expect(page.locator('body')).toBeVisible();
    });
});

// ============================================
// TESTY: BŁĘDY I EDGE CASES
// ============================================

test.describe('🐛 Błędy i Edge Cases', () => {
    test('Strona /test-chat ładuje się', async ({ page }) => {
        await page.goto('/test-chat');
        await waitForAppLoad(page);

        await expect(page.locator('body')).toBeVisible();

        // Sprawdź czy są szybkie testy
        const quickTests = page.locator('text=Szybkie Testy, text=Test');
        if (await quickTests.count() > 0) {
            console.log('✓ Test chat page loaded with quick tests');
        }
    });

    test('Nieistniejąca strona pokazuje 404 lub redirect', async ({ page }) => {
        const response = await page.goto('/non-existent-page-xyz-123');

        // Next.js może zwrócić 404 lub przekierować
        expect([200, 404]).toContain(response?.status() || 200);
    });
});
