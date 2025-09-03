import { jest } from '@jest/globals';
import { showToast } from '../../client/public/assets/ui-toast.js';

describe('ui-toast defaults', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '<div id="toasts"></div>';
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('uses default type and auto hides', () => {
    showToast('hi');
    const t = document.querySelector('.toast.info');
    expect(t).toBeTruthy();
    jest.advanceTimersByTime(3000);
    expect(document.querySelector('.toast')).toBeNull();
  });
});
