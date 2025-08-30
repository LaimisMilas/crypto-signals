export function initTabs(root = document, { storage = window.localStorage, loc = window.location, hash = loc.hash } = {}) {
  const tablist = root.querySelector('[role="tablist"]');
  if (!tablist) return;
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(t => root.querySelector(`#${t.getAttribute('aria-controls')}`)).filter(Boolean);

  function select(id) {
    tabs.forEach((t, i) => {
      const selected = t.id === id;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
      t.tabIndex = selected ? 0 : -1;
      if (panels[i]) panels[i].hidden = !selected;
    });
    if (loc && 'hash' in loc) loc.hash = `#${id}`;
    if (storage) storage.setItem('ui-tabs:last', id);
  }

  const fromHash = (hash || '').replace('#', '');
  const fromStorage = storage && storage.getItem('ui-tabs:last');
  const defaultId = fromHash || fromStorage || (tabs[0] && tabs[0].id);
  if (defaultId) select(defaultId);

  tabs.forEach(t => t.addEventListener('click', () => select(t.id)));
}

if (typeof window !== 'undefined' && !window.__DISABLE_AUTO_INIT__) {
  window.addEventListener('DOMContentLoaded', () => initTabs());
}
