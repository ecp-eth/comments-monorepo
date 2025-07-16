import globals from "globals";
import { config as baseConfig } from "@ecp.eth/eslint-config/base";

const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];

/** @type {import("eslint").Linter.Config} */
export default config;
