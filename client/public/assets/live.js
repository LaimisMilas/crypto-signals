import { mount as lazyMount } from './ui-lazy.js';
import { showToast } from './ui-toast.js';

const modules = {};

function register(name, path){
  window.UILazy.register(name, async () => {
    modules[name] = await import(path);
  });
}

async function mountModule(name, root){
  await lazyMount(name, async () => {
    const mod = modules[name];
    if (!mod) return;
    modules[name].instance = await mod.mount(root);
  });
}

function unmountOthers(active){
  for (const [name, mod] of Object.entries(modules)){
    if (name !== active && mod.instance && typeof mod.instance.unmount === 'function'){
      try { mod.instance.unmount(); } catch {}
      mod.instance = null;
    }
  }
}

async function handleTab(tab, doc=document){
  const name = tab?.dataset?.module;
  const panelId = tab?.getAttribute('aria-controls');
  if (!name || !panelId) return;
  const root = doc.querySelector(`#${panelId} .panel-body`);
  if (!root) return;
  await mountModule(name, root);
  unmountOthers(name);
}

function initTabs(doc=document){
  const tabs = Array.from(doc.querySelectorAll('#live-tabs [role="tab"]'));
  tabs.forEach(t => t.addEventListener('click', () => handleTab(t, doc)));
  const selected = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
  if (selected) handleTab(selected, doc);
}

async function post(url){
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error(`${res.status}`);
    showToast(url.endsWith('start') ? 'Started' : 'Stopped', { type: 'success' });
  } catch (e) {
    showToast(`Error ${e.message}`, { type: 'error' });
  }
}

export function init(doc=document){
  register('liveEquity', './modules/live/equity.js');
  register('liveHistory', './modules/live/history.js');
  register('liveOrders', './modules/live/orders.js');
  register('liveRisk', './modules/live/risk.js');

  initTabs(doc);

  const startBtn = doc.querySelector('[data-live-start]');
  const stopBtn = doc.querySelector('[data-live-stop]');
  if (startBtn) startBtn.addEventListener('click', () => post('/live/start'));
  if (stopBtn) stopBtn.addEventListener('click', () => post('/live/stop'));
}

if (typeof window !== 'undefined' && !window.__DISABLE_AUTO_INIT__){
  window.addEventListener('DOMContentLoaded', () => init());
}

export default { init };
