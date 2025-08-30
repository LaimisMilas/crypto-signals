import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { initNav } from '../../client/public/assets/nav.js';

function dom(html){ return new JSDOM(html, { url: 'http://localhost/analytics.html' }); }

test('nav highlights current page and sets aria-current', () => {
  const html = readFileSync('tests/fixtures/nav.html','utf8');
  const { window } = dom(html);
  initNav(window.document, window.location);

  const links = [...window.document.querySelectorAll('nav a')];
  const active = links.find(a => a.classList.contains('active'));
  expect(active).toBeTruthy();
  expect(active.getAttribute('href')).toMatch(/analytics\.html$/);
  expect(active.getAttribute('aria-current')).toBe('page');

  const others = links.filter(a => a !== active);
  for (const a of others) expect(a.hasAttribute('aria-current')).toBe(false);
});
