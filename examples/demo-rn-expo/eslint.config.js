import { config } from "../../packages/eslint-config/react-internal.js";
import globals from "globals";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: ["metro.config.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
