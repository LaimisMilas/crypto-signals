module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/client/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup/jest.setup.dom.cjs'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/setup/styleStub.js',
  },
  coverageDirectory: 'coverage-client',
  collectCoverageFrom: [
    'client/public/assets/**/*.js',
    '!client/public/assets/vendor/**'
  ],
};
