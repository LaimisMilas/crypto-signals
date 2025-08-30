export function initBreadcrumbs(doc = document, titleBase = 'Crypto Signals') {
  const trail = doc.querySelector('[data-breadcrumbs]');
  if (!trail) return;
  const page = doc.querySelector('[data-page]')?.getAttribute('data-page') || '';
  const activeTab = doc.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim();
  const parts = ['Home'];
  if (page) parts.push(page);
  if (activeTab) parts.push(activeTab);
  trail.textContent = parts.join(' → ');
  const activeTitle = activeTab || page;
  doc.title = activeTitle ? `${titleBase} – ${activeTitle}` : titleBase;
}

if (typeof window !== 'undefined' && !window.__DISABLE_AUTO_INIT__) {
  window.addEventListener('DOMContentLoaded', () => initBreadcrumbs());
}
