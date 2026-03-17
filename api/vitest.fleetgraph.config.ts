import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globals: true,
    hookTimeout: 120_000,
    include: [
      'src/config/ssm.test.ts',
      'src/routes/fleetgraph.test.ts',
      'src/services/fleetgraph/**/*.test.ts',
    ],
    testTimeout: 120_000,
  },
});
