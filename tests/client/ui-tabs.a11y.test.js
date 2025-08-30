import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { initTabs } from '../../client/public/assets/ui-tabs.js';

function setup() {
  const html = readFileSync('tests/fixtures/tabs.html','utf8');
  const dom = new JSDOM(html, { url: 'http://localhost/index.html' });
  const { window } = dom;
  window.localStorage.clear();
  initTabs(window.document, { storage: window.localStorage, loc: window.location, hash: '' });
  return window;
}

test('initializes first tab selected & panels hidden correctly', () => {
  const w = setup();
  const tablist = w.document.querySelector('[role="tablist"]');
  const tabs = within(tablist).getAllByRole('tab');
  const panels = tabs.map(t => w.document.getElementById(t.getAttribute('aria-controls')));

  expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  expect(tabs[0].tabIndex).toBe(0);
  expect(panels[0].hidden).toBe(false);

  for (let i=1;i<tabs.length;i++){
    expect(tabs[i].getAttribute('aria-selected')).toBe('false');
    expect(tabs[i].tabIndex).toBe(-1);
    expect(panels[i].hidden).toBe(true);
  }
});

test('click changes selection, updates hash and localStorage', async () => {
  const w = setup();
  const user = userEvent.setup();
  const tablist = w.document.querySelector('[role="tablist"]');
  const tabs = within(tablist).getAllByRole('tab');
  await user.click(tabs[1]);

  expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  expect(w.location.hash).toBe(`#${tabs[1].id}`);
  expect(w.localStorage.getItem('ui-tabs:last')).toBe(tabs[1].id);
});
