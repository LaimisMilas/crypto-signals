import { test, expect } from '@playwright/test';
import { scanA11y } from './helpers/a11y';

const links = [
  '/download/backtest.csv',
  '/download/optimize.csv',
  '/download/walkforward-agg.csv',
  '/download/walkforward-summary.json',
  '/download/metrics.json',
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__E2E__ = true; });
});

test('download links issue requests', async ({ page }) => {
  await page.route(/\/download\/.*\.(csv|json)/, async route => {
    const url = route.request().url();
    const isJson = url.endsWith('.json');
    const body = isJson ? '{"ok":true}\n' : 'a,b\n1,2\n';
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': isJson ? 'application/json' : 'text/csv',
        'Content-Length': String(body.length),
      },
      body,
    });
  });
  await page.goto('/health.html');
  for (const href of links) {
    await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
    const [request] = await Promise.all([
      page.waitForRequest(href),
      page.evaluate(url => fetch(url), href),
    ]);
    expect(request.method()).toBe('GET');
  }
  await scanA11y(page);
});
