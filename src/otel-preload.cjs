(async () => {
  try {
    const { startOtel } = await import('./otel.js');
    await startOtel();
  } catch (err) {
    console.error('OTel preload failed', err);
  }
})();
