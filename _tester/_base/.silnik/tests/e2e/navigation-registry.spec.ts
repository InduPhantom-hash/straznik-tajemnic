import { expect, test } from '@playwright/test';
import registry from '../../navigation/navigation-registry.json';

const routes = registry.nodes.filter((node) => node.kind === 'route' && node.e2e);

for (const locale of registry.locales) {
  test.describe(`Navigation registry ${locale}`, () => {
    for (const route of routes) {
      test(`${route.path} resolves in ${locale}`, async ({ page }) => {
        await page.goto(`/${locale}${route.path === '/' ? '' : route.path}`);
        await expect(page).toHaveURL(new RegExp(`/${locale}(?:/|$)`));
      });
    }
  });
}
