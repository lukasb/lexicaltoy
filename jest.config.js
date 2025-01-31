// @ts-check
const fs = require('fs/promises');

/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/playwright-tests/', '/tests-examples/'],
  testEnvironmentOptions: {
    jsdom: {
      url: "http://localhost/"
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  modulePaths: ['<rootDir>'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
};

async function jestConfig() {
  const modules = await fs.readdir("node_modules");
  let esModules = [];

  for (const m of modules) {
    try {
      await import(m);
    } catch (error) {
      esModules.push(m);
    }
  }

  const esModulesPattern = esModules.join("|");
  return {
    ...baseConfig,
    transformIgnorePatterns: [
      `/node_modules/(?!${esModulesPattern}).+.(js|jsx|mjs|cjs|ts|tsx)$/`
    ]
  };
}

module.exports = jestConfig();