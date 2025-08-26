window.UILazy = (function (api = window.UILazy || {}) {
  const _modules = api._modules || new Map();
  const _cache = api._cache || new Map();

  api.register = function (name, loaderFn) {
    _modules.set(name, { loaded: false, loader: loaderFn });
  };

  api.mount = async function (name, mountFn) {
    const m = _modules.get(name);
    if (!m) throw new Error(`UILazy: module "${name}" not registered`);
    if (!m.loaded) {
      await m.loader();
      m.loaded = true;
    }
    if (typeof mountFn === 'function') await mountFn();
  };

  api.prefetch = async function (name, opts = {}) {
    const m = _modules.get(name);
    if (m && !m.loaded) {
      try {
        await m.loader();
        m.loaded = true;
      } catch (e) {
        console.debug('UILazy.prefetch module error:', e);
      }
    }
    if (opts.resource && !_cache.has(opts.resource)) {
      try {
        const res = await fetch(opts.resource, { credentials: 'same-origin' });
        _cache.set(opts.resource, { ts: Date.now(), data: res.clone() });
      } catch (e) {
        console.debug('UILazy.prefetch resource error:', e);
      }
    }
  };

  api._modules = _modules;
  api._cache = _cache;
  return api;
})();
