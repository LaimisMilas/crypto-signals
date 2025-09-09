import './auth.js';

async function loadStrategies() {
  const strategiesPanel = document.getElementById('panel-strategies');
  strategiesPanel.innerHTML = '<p>Loading...</p>';
  try {
    const res = await fetch('/config/strategies');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const strategies = data.active?.strategies || [];
    if (strategies.length === 0) {
      strategiesPanel.innerHTML = '<p>No strategies configured.</p>';
    } else {
      const list = document.createElement('ul');
      for (const s of strategies) {
        const li = document.createElement('li');
        const symbols = (s.symbols || []).join(', ');
        li.innerHTML = `<strong>${s.id}</strong> - ${symbols} - <code>${JSON.stringify(s.params || {})}</code>`;
        list.appendChild(li);
      }
      strategiesPanel.innerHTML = '';
      strategiesPanel.appendChild(list);
    }
  } catch (err) {
    console.error('Failed to load strategies', err);
    strategiesPanel.innerHTML = '<p>Failed to load strategies.</p>';
  }
}

async function loadPresets() {
  const presetsPanel = document.getElementById('panel-presets');
  presetsPanel.innerHTML = '<p>Loading...</p>';
  try {
    const res = await fetch('/config/presets');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const presets = await res.json();
    if (presets.length === 0) {
      presetsPanel.innerHTML = '<p>No presets.</p>';
    } else {
      const list = document.createElement('ul');
      for (const p of presets) {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${p.name}</strong> - ${p.strategy_id}`;
        list.appendChild(li);
      }
      presetsPanel.innerHTML = '';
      presetsPanel.appendChild(list);
    }
  } catch (err) {
    console.error('Failed to load presets', err);
    presetsPanel.innerHTML = '<p>Failed to load presets.</p>';
  }
}
loadStrategies();
loadPresets();
