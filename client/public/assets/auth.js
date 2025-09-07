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
  if (!token) {
    // Prompt user for token once if not provided
    const t = window.prompt('Enter API token');
    if (t) {
      token = t;
      try { localStorage.setItem('auth_token', token); } catch {}
    }
  }

  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    init.headers = init.headers || {};
    if (token && !init.headers.Authorization && !init.headers.authorization) {
      init.headers.Authorization = `Bearer ${token}`;
    }
    return origFetch(input, init);
  };

  const OrigEventSource = window.EventSource;
  function EventSourceAuth(url, opts) {
    const u = new URL(url, window.location.origin);
    if (token && !u.searchParams.get('token')) {
      u.searchParams.set('token', token);
    }
    return new OrigEventSource(u, opts);
  }
  EventSourceAuth.prototype = OrigEventSource.prototype;
  EventSourceAuth.CONNECTING = OrigEventSource.CONNECTING;
  EventSourceAuth.OPEN = OrigEventSource.OPEN;
  EventSourceAuth.CLOSED = OrigEventSource.CLOSED;
  window.EventSource = EventSourceAuth;
}

export function getToken() {
  return token;
}
