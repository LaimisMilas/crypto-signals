import { test, expect } from '@playwright/test';
import { scanA11y } from './helpers/a11y';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__E2E__ = true; });
});

test('tabs deep-link and persistence', async ({ page }) => {
  await page.goto('/analytics.html#tab-trades');
  await page.waitForSelector('#analytics-tabs [role="tab"][aria-selected]');
  const tradesTab = page.locator('#analytics-tabs [role="tab"]', { hasText: 'Trades' });
  await expect(tradesTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-trades[role="tabpanel"]')).toBeVisible();
  await scanA11y(page);

  const equityTab = page.locator('#analytics-tabs [role="tab"]', { hasText: 'Equity' });
  await equityTab.click();
  await expect(equityTab).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/#tab-equity/);
  await expect(page.locator('#tab-equity[role="tabpanel"]')).toBeVisible();
  await expect(page.locator('#tab-trades[role="tabpanel"]')).toBeHidden();
  await scanA11y(page);

  await page.reload();
  const active = page.locator('#analytics-tabs [role="tab"][aria-selected="true"]');
  await expect(active).toHaveText('Equity');
  await expect(page).toHaveURL(/#tab-equity/);
  await expect(page.locator('#tab-equity[role="tabpanel"]')).toBeVisible();
  await expect(page.locator('#tab-trades[role="tabpanel"]')).toBeHidden();
  await scanA11y(page);
});
