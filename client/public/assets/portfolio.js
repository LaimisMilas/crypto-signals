import { mount as lazyMount } from './ui-lazy.js';

const modules = {};
const vendors = new Map();

function loadScript(src) {
  if (!vendors.has(src)) {
    vendors.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    }));
  }
  return vendors.get(src);
}

function register(doc = document) {
  const panels = Array.from(doc.querySelectorAll('[data-tab-panel][data-lazy-module]'));
  panels.forEach(p => {
    const name = p.dataset.tabPanel;
    const modPath = p.dataset.lazyModule;
    const vendorPath = p.dataset.lazyVendor;
    window.UILazy.register(name, async () => {
      if (vendorPath) await loadScript(vendorPath);
      modules[name] = await import(modPath);
    });
  });
}

async function mountModule(name, root) {
  await lazyMount(name, async () => {
    const mod = modules[name];
    if (!mod) return;
    modules[name].instance = await mod.mount(root);
  });
}

function unmountOthers(active) {
  for (const [n, mod] of Object.entries(modules)) {
    if (n !== active && mod.instance && typeof mod.instance.unmount === 'function') {
      try { mod.instance.unmount(); } catch {}
      mod.instance = null;
    }
  }
}

async function handleTab(tab, doc = document) {
  const name = tab?.dataset?.tab;
  const panelId = tab?.getAttribute('aria-controls');
  if (!name || !panelId) return;
  const panel = doc.getElementById(panelId);
  if (!panel) return;
  await mountModule(name, panel);
  unmountOthers(name);
}

export function init(doc = document) {
  register(doc);
  const tabs = Array.from(doc.querySelectorAll('[role="tab"][data-tab]'));
  tabs.forEach(t => t.addEventListener('click', () => handleTab(t, doc)));
  const selected = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
  if (selected) handleTab(selected, doc);
}

if (typeof window !== 'undefined' && !window.__DISABLE_AUTO_INIT__) {
  window.addEventListener('DOMContentLoaded', () => init());
}

export default { init };

