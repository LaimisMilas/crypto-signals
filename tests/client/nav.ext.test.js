import { initNav } from '../../client/public/assets/nav.js';

describe('nav initNav', () => {
  beforeEach(() => { document.body.innerHTML=''; });

  test('activates current link and removes previous', async () => {
    document.body.innerHTML = `<nav><a href="home.html">Home</a><a href="about.html">About</a></nav>`;
    await initNav(document, { pathname:'/home.html' });
    let active = document.querySelector('a[aria-current]');
    expect(active.textContent).toBe('Home');
    await initNav(document, { pathname:'/about.html' });
    active = document.querySelector('a[aria-current]');
    expect(active.textContent).toBe('About');
    expect(document.querySelector('a[href="home.html"]').hasAttribute('aria-current')).toBe(false);
  });

  test('no match leaves nav untouched', async () => {
    document.body.innerHTML = `<nav><a href="home.html">Home</a></nav>`;
    await initNav(document, { pathname:'/elsewhere.html' });
    expect(document.querySelector('a[aria-current]')).toBeNull();
  });

  test('missing nav is noop', async () => {
    document.body.innerHTML = `<div></div>`;
    await expect(initNav(document, { pathname:'/a.html' })).resolves.toBeUndefined();
  });
});
