export function initToast(doc = document) {
  const host = doc.getElementById('toasts');
  if (host) {
    host.setAttribute('aria-live', 'polite');
  }
}

export function showToast(message, { type = 'info', timeout = 3000, doc = document } = {}) {
  const host = doc.getElementById('toasts');
  if (!host) return;
  const toast = doc.createElement('div');
  toast.setAttribute('role', 'status');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  host.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, timeout);
}

if (typeof window !== 'undefined' && !window.__DISABLE_AUTO_INIT__) {
  window.addEventListener('DOMContentLoaded', () => initToast());
}
