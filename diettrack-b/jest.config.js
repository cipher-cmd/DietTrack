/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^module-alias/register$':
      '<rootDir>/tests/__mocks__/module-alias-register.js',
  },
  clearMocks: true,
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // If you want XML in CI via config instead of CLI flags:
  // reporters: [
  //   'default',
  //   ['jest-junit', { outputDirectory: 'reports', outputName: 'junit.xml' }]
  // ],
};
