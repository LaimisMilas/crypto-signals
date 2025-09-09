import './auth.js';

async function loadConfig(){
  const strategiesPanel = document.getElementById('panel-strategies');
  const presetsPanel = document.getElementById('panel-presets');
  strategiesPanel.innerHTML = '<p>Loading...</p>';
  presetsPanel.innerHTML = '<p>Loading...</p>';
  try {
    const res = await fetch('/config/strategies');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const strategies = data.active?.strategies || [];
    if (strategies.length === 0){
      strategiesPanel.innerHTML = '<p>No strategies configured.</p>';
    } else {
      const list = document.createElement('ul');
      for (const s of strategies){
        const li = document.createElement('li');
        const symbols = (s.symbols || []).join(', ');
        li.innerHTML = `<strong>${s.id}</strong> - ${symbols} - <code>${JSON.stringify(s.params || {})}</code>`;
        list.appendChild(li);
      }
      strategiesPanel.innerHTML = '';
      strategiesPanel.appendChild(list);
    }
    const presets = data.presets || [];
    if (presets.length === 0){
      presetsPanel.innerHTML = '<p>No presets.</p>';
    } else {
      const list = document.createElement('ul');
      for (const p of presets){
        const li = document.createElement('li');
        li.innerHTML = `<strong>${p.name}</strong> - ${p.strategy_id}`;
        list.appendChild(li);
      }
      presetsPanel.innerHTML = '';
      presetsPanel.appendChild(list);
    }
  } catch (err) {
    console.error('Failed to load config', err);
    strategiesPanel.innerHTML = '<p>Failed to load strategies.</p>';
    presetsPanel.innerHTML = '<p>Failed to load presets.</p>';
  }
}

loadConfig();
