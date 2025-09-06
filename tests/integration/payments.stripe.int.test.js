import { jest } from '@jest/globals';

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.STRIPE_PRICE_ID = 'price_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
process.env.PUBLIC_URL = 'https://example.com';

const mockCreate = jest.fn().mockResolvedValue({ id: 'sess_123', url: 'https://checkout/' });
const mockRetrieve = jest.fn();
const mockConstructEvent = jest.fn();

const mockDb = { query: jest.fn().mockResolvedValue({}) };
await jest.unstable_mockModule('../../src/storage/db.js', () => ({
  db: mockDb,
  getDbPool: () => mockDb,
  isDbReady: () => true,
  listen: async () => () => {},
  endPool: async () => {}
}));

await jest.unstable_mockModule('stripe', () => ({
  default: jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCreate, retrieve: mockRetrieve } },
    webhooks: { constructEvent: mockConstructEvent }
  }))
}));

const { createCheckoutSession, stripeWebhook } = await import('../../src/payments/stripe.js');
const { db } = await import('../../src/storage/db.js');

describe('Stripe payments', () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockRetrieve.mockClear();
    mockConstructEvent.mockClear();
    db.query.mockClear();
  });

  test('createCheckoutSession forwards session info', async () => {
    const res = { json: jest.fn() };
    await createCheckoutSession({}, res);
    expect(mockCreate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 'sess_123', url: 'https://checkout/' });
  });

  test('stripeWebhook stores subscriber', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'sess_123' } }
    });
    mockRetrieve.mockResolvedValue({
      subscription: 'sub_123',
      customer_details: { email: 'user@example.com' }
    });
    const req = { headers: { 'stripe-signature': 'sig' }, body: 'raw-body' };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await stripeWebhook(req, res);
    expect(mockConstructEvent).toHaveBeenCalled();
    expect(mockRetrieve).toHaveBeenCalledWith('sess_123', { expand: ['subscription', 'customer'] });
    expect(db.query).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
