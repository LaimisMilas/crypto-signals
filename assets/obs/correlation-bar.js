const CorrelationBar = (() => {
  let enabled = false;
  let events = [];
  let container, list;

  function init({ enabled: en = true, env } = {}) {
    const params = new URLSearchParams(location.search);
    if (params.get('debug') === '1') en = true;
    enabled = en;
    if (!enabled) return;
    container = document.createElement('div');
    container.className = 'correlation-bar';
    container.innerHTML = '<ul></ul>';
    list = container.querySelector('ul');
    document.body.appendChild(container);
  }

  function push(arr, item, max) {
    arr.push(item);
    if (arr.length > max) arr.shift();
  }

  function render() {
    if (!enabled || !list) return;
    list.innerHTML = events.map(e => {
      const req = e.reqId ? `<span class="id" data-copy="${e.reqId}">req</span>` : '';
      const trace = e.traceId ? `<span class="id" data-copy="${e.traceId}">trace</span>` : '';
      return `<li><span class="type">${e.type}</span>${req}${trace}</li>`;
    }).join('');
    list.querySelectorAll('[data-copy]').forEach(el => {
      el.onclick = () => navigator.clipboard?.writeText(el.dataset.copy);
    });
  }

  function pushEvent(ev) {
    if (!enabled) return;
    push(events, ev, 5);
    render();
  }

  function pushError(err) {
    pushEvent({ type: 'error', ...err });
  }

  return { init, pushEvent, pushError };
})();

window.CorrelationBar = CorrelationBar;
export default CorrelationBar;
