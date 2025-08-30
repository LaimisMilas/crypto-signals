import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { initTabs } from '../../client/public/assets/ui-tabs.js';
import { initBreadcrumbs } from '../../client/public/assets/ui-breadcrumbs.js';

test('breadcrumbs reflect active tab and update title', () => {
  const html = readFileSync('tests/fixtures/breadcrumbs.html','utf8');
  const { window } = new JSDOM(html, { url: 'http://localhost/analytics.html' });
  initTabs(window.document, { storage: window.localStorage, loc: window.location, hash: '' });
  initBreadcrumbs(window.document, 'Crypto Signals');

  const trail = window.document.querySelector('[data-breadcrumbs]');
  expect(trail.textContent).toMatch(/Home\s*→\s*Analytics\s*→\s*Overview/);
  expect(window.document.title).toBe('Crypto Signals – Overview');
});
