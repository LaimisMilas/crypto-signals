const es = new EventSource('/events');

es.onmessage = evt => {
  try {
    const data = JSON.parse(evt.data);
    console.log('event', evt.type, data);
    window.debugLastEvent = data;
  } catch (e) {
    console.error('bad event', e);
  }
};

es.onerror = err => console.error('sse error', err);
