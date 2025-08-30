import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { initToast, showToast } from '../../client/public/assets/ui-toast.js';

jest.useFakeTimers();

test('toast shows and auto-hides', () => {
  const { window } = new JSDOM(`<div id="toasts"></div>`);
  initToast(window.document);
  showToast('Saved', { type: 'success', timeout: 1000, doc: window.document });

  const el = window.document.querySelector('#toasts [role="status"]');
  expect(el).toBeTruthy();
  expect(el.textContent).toContain('Saved');

  jest.advanceTimersByTime(1100);
  expect(window.document.querySelector('#toasts [role="status"]')).toBeNull();
});
