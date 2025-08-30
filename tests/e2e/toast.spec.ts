import { test, expect } from '@playwright/test';
import { scanA11y } from './helpers/a11y';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__E2E__ = true; });
});

test('toast shows and auto hides', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(async () => {
    const mod = await import('/assets/ui-toast.js');
    const host = document.createElement('div');
    host.id = 'toasts';
    document.body.appendChild(host);
    mod.initToast();
    mod.showToast('Hello');
  });
  const toast = page.locator('#toasts [role="status"]');
  await expect(toast).toBeVisible();
  await scanA11y(page);
  await toast.waitFor({ state: 'detached' });
});
