import CorrelationBar from './obs/correlation-bar.js';
import { showErrorToast } from './obs/error-toasts.js';

let es;
let reconnects = 0;
let connectedAt = 0;

function pickMeta(d) {
  return { reqId: d.reqId, traceId: d.traceId, jobId: d.jobId, jobType: d.jobType };
}

function sendSseStats(disconnectTs) {
  const connectedSec = connectedAt ? Math.round((disconnectTs - connectedAt) / 1000) : 0;
  const payload = { connectedSeconds: connectedSec, reconnectAttempts: reconnects };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  if (!(navigator.sendBeacon && navigator.sendBeacon('/rum/sse', blob))) {
    fetch('/rum/sse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  }
}

function connect() {
  es = new EventSource('/events');
  es.onopen = () => {
    connectedAt = Date.now();
    reconnects = 0;
    CorrelationBar?.pushEvent({ type: 'sse-open', ts: connectedAt });
  };
  es.onerror = () => {
    const now = Date.now();
    es.close();
    sendSseStats(now);
    reconnects++;
    CorrelationBar?.pushError({ message: 'SSE disconnected', code: 'SSE_DISCONNECT' });
    showErrorToast({ message: 'SSE disconnected', code: 'SSE_DISCONNECT' });
    const delay = Math.min(30000, Math.random() * (1000 * (2 ** reconnects)));
    if (document.hidden && reconnects > 5) return; // stop if tab hidden and too many
    setTimeout(connect, delay);
  };
  es.addEventListener('overlay', (ev) => {
    const data = JSON.parse(ev.data);
    CorrelationBar?.pushEvent({ type: 'overlay', ...pickMeta(data), ts: Date.now() });
    window.dispatchEvent(new CustomEvent('overlay', { detail: data }));
  });
  es.addEventListener('trade', (ev) => {
    const data = JSON.parse(ev.data);
    CorrelationBar?.pushEvent({ type: 'trade', ...pickMeta(data), ts: Date.now() });
    window.dispatchEvent(new CustomEvent('trade', { detail: data }));
  });
  es.addEventListener('ping', (ev) => {
    const data = JSON.parse(ev.data);
    CorrelationBar?.pushEvent({ type: 'ping', ...pickMeta(data), ts: Date.now() });
  });
}

connect();
