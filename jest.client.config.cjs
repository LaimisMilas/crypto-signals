module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/client/**/*.test.js', '<rootDir>/tests/unit/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupJest.client.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/setup/styleStub.js',
  },
  coverageDirectory: 'coverage-client',
  coverageReporters: ['text', 'text-summary', 'json-summary', 'lcov'],
  collectCoverageFrom: [
    'client/assets/**/*.js',
    'client/public/**/*.js',
    '!client/assets/vendor/**',
    '!client/public/assets/vendor/**',
    '!client/public/assets/analytics.e2e-dataset.js',
    '!client/public/assets/modules/live/**',
    '!client/public/assets/modules/portfolio/**'
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
