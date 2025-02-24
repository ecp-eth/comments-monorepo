import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./scripts/ponder-module-loader.mjs", pathToFileURL("./"));
