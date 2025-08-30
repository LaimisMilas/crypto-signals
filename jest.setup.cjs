process.env.TZ = 'UTC';
jest.mock('./src/observability/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));
