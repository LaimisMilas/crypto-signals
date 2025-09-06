import { jest } from '@jest/globals';

const mockRequest = jest.fn();
const mockGet = jest.fn().mockResolvedValue({ data: { serverTime: Date.now() } });

await jest.unstable_mockModule('axios', () => ({
  default: { create: () => ({ request: mockRequest, get: mockGet }) }
}));

const client = (await import('../../src/integrations/binance/client.js')).default;

describe('Binance client', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  test('retries on rate limit and succeeds', async () => {
    mockRequest
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValueOnce({ data: { ok: true } });

    const res = await client.send('GET', '/api/test');
    expect(res).toEqual({ ok: true });
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});
