import { initNav } from '../../client/public/assets/nav.js';

describe('nav util', () => {
  test('initNav marks current link', async () => {
    const doc = document.implementation.createHTMLDocument('');
    const nav = doc.createElement('nav');
    const a1 = doc.createElement('a'); a1.setAttribute('href','/a.html'); nav.appendChild(a1);
    const a2 = doc.createElement('a'); a2.setAttribute('href','/b.html'); nav.appendChild(a2);
    doc.body.appendChild(nav);
    await initNav(doc, { pathname:'/b.html' });
    expect(a2.classList.contains('active')).toBe(true);
    expect(a2.getAttribute('aria-current')).toBe('page');
  });
});
