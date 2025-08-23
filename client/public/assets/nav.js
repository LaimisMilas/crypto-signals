(async function() {
  async function inject(selector, url) {
    const host = document.querySelector(selector);
    if (!host) return;
    const res = await fetch(url, { cache: 'no-cache' });
    host.innerHTML = await res.text();
  }
  await inject('#app-nav', '/partials/nav.html');
  await inject('#app-footer', '/partials/footer.html');

  const path = location.pathname.replace(/^\//,'').toLowerCase();
  const map = {
    'index.html': null,
    'live.html': 'live',
    'analytics.html': 'analytics',
    'portfolio.html': 'portfolio',
    'settings.html': 'settings'
  };
  const key = map[path] ?? (path ? path.split('.')[0] : null);
  document.querySelectorAll('.nav__links a').forEach(a => {
    if (a.dataset.link === key) a.classList.add('active');
  });

  const burger = document.querySelector('.nav__burger');
  const links  = document.querySelector('.nav__links');
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
  }

  try {
    const v = await fetch('/version', { cache:'no-cache' }).then(r=>r.json());
    const el = document.getElementById('app-version');
    if (el && v?.version) el.textContent = v.version + (v.commit ? ` (${v.commit.slice(0,7)})` : '');
  } catch {}
})();
