import { test, expect } from '@playwright/test';
import { scanA11y } from './helpers/a11y';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__E2E__ = true; });
});

test('UILazy mount and unmount', async ({ page }) => {
  await page.goto('/analytics.html');
  await page.waitForFunction(() => window.UILazy);
  await page.evaluate(() => {
    window.UILazy.register('demo', async () => {});
  });
  await page.evaluate(() => window.UILazy.mount('demo', () => {
    const div = document.createElement('div');
    div.id = 'lazy-demo';
    document.body.appendChild(div);
  }));
  await expect(page.locator('#lazy-demo')).toHaveCount(1);
  await scanA11y(page);
  await page.evaluate(() => window.UILazy.unmount('demo'));
  const has = await page.evaluate(() => window.UILazy._modules.has('demo'));
  expect(has).toBeFalsy();
});
