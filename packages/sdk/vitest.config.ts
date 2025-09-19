import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Global setup file - runs once before all tests
    globalSetup: "./scripts/vitest-global-setup.ts",

    // Environment configuration
    environment: "node",

    // Globals configuration
    globals: true,

    // Test timeouts
    testTimeout: 30000,
    hookTimeout: 30000,

    // Pool configuration for test execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  define: {
    __DEV__: JSON.stringify(true), // Set to true for tests
  },
});
