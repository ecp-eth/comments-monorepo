import globals from "globals";
import { config as baseConfig } from "@ecp.eth/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enforce consistent use of type imports
      // This helps distinguish between type-only and value imports
      // Required for node --experimental-strip-types compatibility
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],

      // Force using void/await for functions that return promises
      // This prevents floating promises and ensures proper error handling
      "@typescript-eslint/no-floating-promises": "error",
    },
    // ideally we should add this file to tsconfig.json but atm eslint-config is using deps that
    // are not typed correctly
    ignores: ["eslint.config.js"],
  },
];

export default config;
