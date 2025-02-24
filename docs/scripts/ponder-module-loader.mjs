import { pathToFileURL, fileURLToPath } from "url";
import { resolve as nodeResolve, dirname } from "node:path";
// Custom ESM loader for handling `ponder:` scheme
// it doesn't actually load the module, just returns an empty mock
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
