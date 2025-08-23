export default {
  ema: {
    type: 'object',
    required: ['fast', 'slow', 'atrMult'],
    properties: {
      fast: { type: 'integer', minimum: 2, maximum: 200 },
      slow: { type: 'integer', minimum: 3, maximum: 500 },
      atrMult: { type: 'number', minimum: 0.1, maximum: 10 }
    },
    additionalProperties: false
  },
  rsi: {
    type: 'object',
    required: ['period', 'buyBelow', 'sellAbove'],
    properties: {
      period: { type: 'integer', minimum: 2, maximum: 200 },
      buyBelow: { type: 'number', minimum: 0, maximum: 100 },
      sellAbove: { type: 'number', minimum: 0, maximum: 100 }
    },
    additionalProperties: false
  },
  adx: {
    type: 'object',
    required: ['period', 'threshold'],
    properties: {
      period: { type: 'integer', minimum: 2, maximum: 200 },
      threshold: { type: 'number', minimum: 5, maximum: 50 }
    },
    additionalProperties: false
  }
};
