import { jest } from '@jest/globals';

function json(obj){ return new Response(JSON.stringify(obj), { status:200, headers:{'Content-Type':'application/json'} }); }
function text(str){ return new Response(str, { status:200, headers:{'Content-Type':'text/html'} }); }
function flush(){ return new Promise(r=>setTimeout(r,0)); }

describe('nav auto init', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <div id="app-nav"></div>
      <div id="app-breadcrumbs"></div>
      <div id="app-footer"></div>
      <div class="nav__burger"></div>
      <div class="nav__links"></div>
      <div id="app-version"></div>
    `;
    window.__DISABLE_AUTO_INIT__ = false;
    global.fetch = jest.fn(url => {
      if (url === '/partials/nav.html') return Promise.resolve(text('<nav><a href="home.html">Home</a></nav>'));
      if (url === '/partials/breadcrumbs.html') return Promise.resolve(text('<span>bc</span>'));
      if (url === '/partials/footer.html') return Promise.resolve(text('<footer>f</footer>'));
      if (url === '/version') return Promise.resolve(json({ version:'1.2.3', commit:'abcdef0' }));
      return Promise.resolve(text(''));
    });
  });

  test('injects fragments and toggles burger', async () => {
    await import('../../client/public/assets/nav.js');
    window.dispatchEvent(new Event('DOMContentLoaded'));
    await flush();
    expect(document.querySelector('#app-nav nav')).toBeTruthy();
    expect(document.body.innerHTML).toContain('<span>bc</span>');
    expect(document.querySelector('#app-footer footer')).toBeTruthy();
    // burger
    const burger = document.querySelector('.nav__burger');
    const links = document.querySelector('.nav__links');
    burger.click();
    expect(links.classList.contains('open')).toBe(true);
    expect(burger.getAttribute('aria-expanded')).toBe('true');
    burger.click();
    expect(links.classList.contains('open')).toBe(false);
    expect(burger.getAttribute('aria-expanded')).toBe('false');
    // version
    expect(document.getElementById('app-version').textContent).toMatch('1.2.3');
  });
});
