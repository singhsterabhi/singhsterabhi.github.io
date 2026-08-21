import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/dom/**', 'jsdom']],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
