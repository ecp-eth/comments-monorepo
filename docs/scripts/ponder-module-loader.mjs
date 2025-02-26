/**
 * Custom ESM loader for handling `ponder:` scheme
 * 
 * It doesn't actually load the ponder modules, it returns an empty mocks to allow the 
 * `HonoOpenAPI()` to be instantiated so we can call the method to generate the docs.
 * 
 * These ponder modules are not actually used while generating the docs.
 */
import { pathToFileURL, fileURLToPath } from "url";
import { resolve as nodeResolve, dirname } from "node:path";

export function resolve(
  specifier,
  context,
  nextResolve
) {
  if (!specifier.startsWith("ponder:")) {
    return nextResolve(specifier, context);
  }

  const dir = dirname(fileURLToPath(import.meta.url))
  const modulePath = nodeResolve(dir, 'ponder-mock.js');

  return {
    shortCircuit: true,
    url: pathToFileURL(modulePath).href,
  };
}
