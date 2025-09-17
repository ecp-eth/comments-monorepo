import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Global setup file - runs once before all tests
    globalSetup: "./scripts/vitest-global-setup.ts",

    // Setup files - run before each test file
    setupFiles: ["./scripts/vitest-setup.ts"],

    // Environment configuration
    environment: "node",

    // Globals configuration
    globals: true,

    // Test timeout
    testTimeout: 30000,

    // Pool configuration for test execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
