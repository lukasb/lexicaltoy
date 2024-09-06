/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testEnvironmentOptions: {
    // JSDOM options for tests that use JSDOM
    jsdom: {
      url: "http://localhost/"
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  modulePaths: ['<rootDir>']
};