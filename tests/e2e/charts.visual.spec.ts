import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const screenshotName = 'analytics-equity.png';

async function ensureBaseline(page, testInfo) {
  const file = testInfo.snapshotPath(screenshotName);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.locator('#equity-card').screenshot({
      path: file,
      mask: [page.locator('[data-ts]'), page.locator('.live-badge')],
    });
  }
}

test('analytics overview equity chart stable', async ({ page }, testInfo) => {
  await page.goto('/analytics.html?e2e=1#tab-overview');
  await page.waitForSelector('[data-equity-canvas]', { state: 'attached' });
  await ensureBaseline(page, testInfo);
  await expect(page.locator('#equity-card')).toHaveScreenshot(screenshotName, {
    mask: [page.locator('[data-ts]'), page.locator('.live-badge')],
  });
});
