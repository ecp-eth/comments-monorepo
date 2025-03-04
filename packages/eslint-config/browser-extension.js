import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config} */
export const config = [
  ...baseConfig,
  js.configs.recommended,
  eslintPluginPrettier,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      "react/react-in-jsx-scope": "off",
      "prettier/prettier": [
        "error",
        {
          plugins: ["@ianvs/prettier-plugin-sort-imports"],
          importOrder: [
            "<BUILTIN_MODULES>", // Node.js built-in modules
            "<THIRD_PARTY_MODULES>", // Imports not matched by other special words or groups.
            "", // Empty line
            "^@plasmo/(.*)$",
            "",
            "^@plasmohq/(.*)$",
            "",
            "^~(.*)$",
            "",
            "^[./]",
          ],
        },
      ],
    },
  },
];
