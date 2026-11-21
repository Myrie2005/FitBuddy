import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Runs once before all tests: makes sure the test database has the current tables
    globalSetup: ['tests/globalSetup.ts'],
    // Runs before every test file: points the server at the test database
    setupFiles: ['tests/setup.ts'],
    // All test files share one database, so run them one after another
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
