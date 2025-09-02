module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/client/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupJest.client.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/setup/styleStub.js',
  },
  coverageDirectory: 'coverage-client',
  collectCoverageFrom: [
    'client/assets/**/*.js',
    'client/public/**/*.js',
    '!client/assets/vendor/**',
    '!client/public/assets/modules/**',
    '!client/public/assets/vendor/**',
    '!client/public/assets/analytics.e2e-dataset.js',
    '!client/public/assets/chart-globals.js',
    '!client/public/assets/ui-lazy.js',
    '!client/public/assets/ui-loader.js'
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
