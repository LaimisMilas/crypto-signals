let container;

function ensureContainer() {
  if (container) return;
  container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '10px';
  container.style.right = '10px';
  container.style.zIndex = '10000';
  document.body.appendChild(container);
}

export function showErrorToast(meta = {}) {
  ensureContainer();
  const code = meta.reqId || `corr-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const toast = document.createElement('div');
  toast.style.background = 'rgba(0,0,0,0.8)';
  toast.style.color = '#fff';
  toast.style.padding = '8px';
  toast.style.marginTop = '4px';
  toast.style.fontSize = '12px';
  toast.innerHTML = `<div>${meta.message || 'Error'}<br/>Incident: <span class="code">${code}</span></div>
<button class="copy">Copy incident code</button>
${meta.reqId ? '<button class="details">View details</button>' : ''}`;
  toast.querySelector('.copy').onclick = () => navigator.clipboard?.writeText(code);
  const details = toast.querySelector('.details');
  if (details) details.onclick = () => alert(JSON.stringify(meta, null, 2));
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
