import { config } from "@ecp.eth/eslint-config/react-internal";
import globals from "globals";

/** @type {import("eslint").Linter.Config} */
export default [...config, {
  files: ["metro.config.cjs"],
  languageOptions: {
    globals: {
      ...globals.node
    }
  }
}];
