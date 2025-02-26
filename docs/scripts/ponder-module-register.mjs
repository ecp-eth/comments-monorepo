/**
 * Custom ESM register to register the loader module for handling `ponder:` scheme
 * 
 * Some how `tsx` requires this to use a custom loader module, otherwise `tsx`
 * will throw an warning
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./scripts/ponder-module-loader.mjs", pathToFileURL("./"));
