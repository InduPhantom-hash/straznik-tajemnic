import { expect, test } from '@playwright/test';

test.describe('Physical dice tray', () => {
  test('renders every player die, a ten-die pool and the d100 pair without changing the roll flow', async ({ page }, testInfo) => {
    await page.goto('/dice');
    await expect(page.getByTestId('dice-system')).toBeVisible();

    const dieSelector = page.locator('select').first();
    const count = page.locator('input[type="number"]').first();
    const roll = page.getByTestId('btn-roll-dice');
    const tray = page.getByTestId('physical-dice-scene');

    for (const type of ['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20']) {
      await dieSelector.selectOption(type);
      await count.fill(type === 'd6' ? '10' : '1');
      await roll.click();
      await expect(roll).toBeDisabled();
      await expect(tray).toBeVisible();
      await expect(roll).toBeEnabled({ timeout: 2_000 });
    }

    await dieSelector.selectOption('d100');
    await count.fill('1');
    await roll.click();
    await expect(tray).toBeVisible();
    await expect(roll).toBeEnabled({ timeout: 2_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: testInfo.outputPath('physical-dice-d100-desktop.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('physical-dice-d100-mobile.png'), fullPage: true });
  });
});
