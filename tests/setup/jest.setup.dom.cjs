require('whatwg-fetch');

if (!global.crypto) global.crypto = {};
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => '00000000-0000-4000-8000-000000000000';
}

class IO { observe(){} unobserve(){} disconnect(){} }
if (!global.IntersectionObserver) global.IntersectionObserver = IO;

if (typeof window !== 'undefined') {
  window.__DISABLE_AUTO_INIT__ = true;
}

const { TextEncoder, TextDecoder } = require('util');
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;
