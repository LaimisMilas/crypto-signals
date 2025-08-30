export async function initNav(doc = document, loc = window.location) {
  const nav = doc.querySelector('nav');
  if (!nav) return;
  const current = loc.pathname.split('/').pop() || 'index.html';
  for (const a of nav.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') || '';
    const isActive = href.endsWith(current);
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

async function autoInit() {
  async function inject(selector, url, replace = false) {
    const host = document.querySelector(selector);
    if (!host) return;
    const res = await fetch(url, { cache: 'no-cache' });
    const html = await res.text();
    if (replace) host.outerHTML = html; else host.innerHTML = html;
  }

  await inject('#app-nav', '/partials/nav.html');
  await inject('#app-breadcrumbs', '/partials/breadcrumbs.html', true);
  await inject('#app-footer', '/partials/footer.html');

  initNav();

  const burger = document.querySelector('.nav__burger');
  const links = document.querySelector('.nav__links');
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
  }

  try {
    const v = await fetch('/version', { cache: 'no-cache' }).then(r => r.json());
    const el = document.getElementById('app-version');
    if (el && v?.version) {
      el.textContent = v.version + (v.commit ? ` (${v.commit.slice(0,7)})` : '');
    }
  } catch {}
}

if (typeof window !== 'undefined' && !window.__DISABLE_AUTO_INIT__) {
  window.addEventListener('DOMContentLoaded', () => { autoInit(); });
}
