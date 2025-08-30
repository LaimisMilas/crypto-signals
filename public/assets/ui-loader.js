window.UILoader = (function () {
  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function renderSkeleton(container, spec) {
    // spec: { type: 'text'|'title'|'rect'|'circle'|'row'|'table', count?:number, rows?:number }
    container.classList.add('ui-loader');
    const wrapper = el('div', 'ui-loader-stack');

    switch (spec.type) {
      case 'text': {
        const n = spec.count || 3;
        for (let i = 0; i < n; i++) wrapper.appendChild(el('div', 'ui-skeleton text'));
        break;
      }
      case 'title': {
        wrapper.appendChild(el('div', 'ui-skeleton title'));
        break;
      }
      case 'rect': {
        const n = spec.count || 2;
        for (let i = 0; i < n; i++) wrapper.appendChild(el('div', 'ui-skeleton rect'));
        break;
      }
      case 'circle': {
        wrapper.appendChild(el('div', 'ui-skeleton circle'));
        break;
      }
      case 'row': {
        const n = spec.count || 3;
        for (let i = 0; i < n; i++) wrapper.appendChild(el('div', 'ui-skeleton row'));
        break;
      }
      case 'table': {
        const rows = spec.rows || 5;
        const table = el('div', 'ui-skeleton-table');
        for (let r = 0; r < rows; r++) {
          const tr = el('div', 'ui-skeleton-tr');
          for (let c = 0; c < 4; c++) tr.appendChild(el('div', 'ui-skeleton td ui-skeleton-td'));
          table.appendChild(tr);
        }
        wrapper.appendChild(table);
        break;
      }
      default: {
        const n = spec.count || 3;
        for (let i = 0; i < n; i++) wrapper.appendChild(el('div', 'ui-skeleton text'));
      }
    }

    container.innerHTML = '';
    container.appendChild(wrapper);
  }

  function show(container, spec) {
    if (!container) return;
    renderSkeleton(container, spec || { type: 'text', count: 3 });
  }

  function hide(container) {
    if (!container) return;
    container.innerHTML = '';
    container.classList.remove('ui-loader');
  }

  async function withLoader(container, loadFn, spec) {
    try {
      show(container, spec);
      const res = await loadFn();
      hide(container);
      return res;
    } catch (e) {
      hide(container);
      throw e;
    }
  }

  return { show, hide, renderSkeleton, withLoader };
})();
