export function freezeCanvasEnv(win = window, doc = document) {
  // 1) Disable animations
  win.__E2E__ && (win.Chart && (win.Chart.defaults.animation = false));
  // 2) Fix time
  if (win.__E2E__) {
    const fixed = new Date('2024-01-02T03:04:05.000Z');
    const _Date = Date;
    class FixedDate extends _Date {
      constructor(...a) {
        return a.length ? new _Date(...a) : new _Date(fixed);
      }
      static now() {
        return fixed.getTime();
      }
    }
    win.Date = FixedDate;
  }
  // 3) CSS: disable caret/animations, scrolling
  const style = doc.createElement('style');
  style.textContent = `
    *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
    html, body { scroll-behavior: auto !important; }
    canvas { image-rendering: pixelated; }
  `;
  doc.head.appendChild(style);
}
