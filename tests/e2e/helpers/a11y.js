import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const allowlist = ['region', 'page-has-heading-one']; // prireikus papildyk

export async function scanA11y(page, { impacts = ['critical','serious'] } = {}) {
  const builder = new AxeBuilder({ page });
  const { violations } = await builder.analyze();

  const filtered = violations
    .filter(v => !impacts || impacts.includes(v.impact || 'minor'))
    .filter(v => !allowlist.includes(v.id));

  if (filtered.length) {
    console.error('[a11y] Violations:',
      filtered.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: (v.nodes || []).flatMap(n => n.target),
      }))
    );
  }
  expect(filtered).toEqual([]);
}
