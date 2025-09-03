import 'whatwg-fetch';
import { jest } from '@jest/globals';

let Overlays;

beforeEach(async () => {
  jest.resetModules();
  Overlays = await import('../../client/public/assets/modules/analytics/overlays.js');
});

describe('overlays extra branches', () => {
  test('addOverlayFromApi error path rejects', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('', { status: 500 }));
    await expect(Overlays.addOverlayFromApi('bad')).rejects.toBeTruthy();
  });

  test('updateOverlaysCsvLink with missing element is noop', () => {
    document.body.innerHTML = '';
    expect(() => Overlays.updateOverlaysCsvLink(document)).not.toThrow();
  });
});
