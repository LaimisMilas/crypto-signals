/* eslint-env browser */
let token;

if (typeof window !== 'undefined') {
  token = localStorage.getItem('auth_token');
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    token = urlToken;
    try { localStorage.setItem('auth_token', token); } catch {}
  }
  if (
    !token &&
    typeof window.prompt === 'function' &&
    !window.prompt.toString().includes('notImplemented')
  ) {
    // Prompt user for token once if not provided
    try {
      const t = window.prompt('Enter API token');
      if (t) {
        token = t;
        try { localStorage.setItem('auth_token', token); } catch {}
      }
    } catch {}
  }

  const origFetch = window.fetch;
  if (!origFetch?._isMockFunction) {
    window.fetch = (input, init = {}) => {
      init.headers = init.headers || {};
      if (token && !init.headers.Authorization && !init.headers.authorization) {
        init.headers.Authorization = `Bearer ${token}`;
      }
      return origFetch(input, init);
    };
  }

  class EventSourceAuth {
    constructor(url, opts = {}) {
      this.url = url;
      this.readyState = EventSourceAuth.CONNECTING;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this._controller = new AbortController();
      this._target = new EventTarget();

      const headers = opts.headers ? { ...opts.headers } : {};
      if (token && !headers.Authorization && !headers.authorization) {
        headers.Authorization = `Bearer ${token}`;
      }

      fetch(url, { headers, signal: this._controller.signal })
        .then(async (res) => {
          this.readyState = EventSourceAuth.OPEN;
          this._emit('open');

          const reader = res.body?.getReader();
          if (!reader) return;
          const decoder = new TextDecoder('utf-8');
          let buffer = '';
          let eventName = 'message';
          let data = '';

          while (this.readyState === EventSourceAuth.OPEN) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop();
            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                data += line.slice(5) + '\n';
              } else if (line === '') {
                const evt = new MessageEvent(eventName, {
                  data: data.replace(/\n$/, ''),
                });
                this._emitEvent(evt);
                eventName = 'message';
                data = '';
              }
            }
          }
        })
        .catch(() => {
          this.readyState = EventSourceAuth.CLOSED;
          this._emit('error');
        });
    }

    _emit(type) {
      const evt = new Event(type);
      this._target.dispatchEvent(evt);
      const handler = this['on' + type];
      if (typeof handler === 'function') handler(evt);
    }

    _emitEvent(evt) {
      this._target.dispatchEvent(evt);
      const handler = this['on' + evt.type];
      if (typeof handler === 'function') handler(evt);
    }

    addEventListener(type, cb) { this._target.addEventListener(type, cb); }
    removeEventListener(type, cb) { this._target.removeEventListener(type, cb); }
    dispatchEvent(evt) { return this._target.dispatchEvent(evt); }
    close() {
      this.readyState = EventSourceAuth.CLOSED;
      this._controller.abort();
    }
  }
  EventSourceAuth.CONNECTING = 0;
  EventSourceAuth.OPEN = 1;
  EventSourceAuth.CLOSED = 2;
  const existingES = window.EventSource;
  if (!existingES || existingES.toString().includes('[native code]')) {
    window.EventSource = EventSourceAuth;
  }
}

export function getToken() {
  return token;
}
