import { initToast, showToast } from '../../client/public/assets/ui-toast.js';
import { jest } from '@jest/globals';

jest.useFakeTimers();

describe('ui-toast branches', () => {
  beforeEach(() => { document.body.innerHTML=''; jest.clearAllMocks(); });

  test('error toast without delay', () => {
    document.body.innerHTML = '<div id="toasts"></div>';
    initToast(document);
    showToast('err', { type:'error', timeout:0, doc:document });
    expect(document.querySelector('.toast.error')).toBeTruthy();
    jest.advanceTimersByTime(1);
    expect(document.querySelector('.toast.error')).toBeNull();
  });

  test('info toast auto hides with default', () => {
    document.body.innerHTML = '<div id="toasts"></div>';
    initToast(document);
    showToast('info', { type:'info', doc:document });
    expect(document.querySelector('.toast.info')).toBeTruthy();
    jest.advanceTimersByTime(3100);
    expect(document.querySelector('.toast.info')).toBeNull();
  });

  test('no host is noop', () => {
    showToast('msg');
    expect(document.body.innerHTML).toBe('');
  });
});
