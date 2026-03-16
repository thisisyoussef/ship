export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',
  checkers: ['typescript'],
  mutate: [],
  thresholds: {
    high: 85,
    low: 70,
    break: 70,
  },
  coverageAnalysis: 'off',
  tempDirName: '.stryker-tmp',
  vitest: {
    configFile: 'vitest.config.ts',
  },
};
