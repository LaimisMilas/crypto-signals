export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/server.js',
    '!src/**/observability/**'
  ],
  coverageThreshold: {
    global: { lines: 0.7, statements: 0.7, branches: 0.5, functions: 0.6 }
  },
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  verbose: true
};
