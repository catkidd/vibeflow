/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.tsx', '**/__tests__/**/*.test.ts'],
  transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|scss|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterFramework: [],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
};

module.exports = config;
