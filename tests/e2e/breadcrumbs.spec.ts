import { test, expect } from '@playwright/test';
import { scanA11y } from './helpers/a11y';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__E2E__ = true; });
});

test.skip('breadcrumbs and title reflect active tab', async ({ page }) => {
  await scanA11y(page, { impacts: ['critical', 'serious'] });
  // TODO: Breadcrumb injection pending.
});
