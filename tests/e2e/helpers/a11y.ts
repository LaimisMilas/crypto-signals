import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const allowlist = ['region', 'page-has-heading-one'];

export async function scanA11y(page: Page, { impacts = ['critical', 'serious'] } = {}) {
  const builder = new AxeBuilder({ page });
  if (impacts) builder.includeImpacts(impacts as any);
  const { violations } = await builder.analyze();
  const filtered = violations.filter(v => !allowlist.includes(v.id));
  expect(filtered).toEqual([]);
}
