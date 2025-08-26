import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: null,
  timestamp: () => `,"ts":"${new Date().toISOString()}"`
});

export default logger;
