/**
 * This script is used to fix the opentelemetry package to be CJS so @sentry can be used in indexer.
 *
 * This is because the opentelemetry package is not a valid ESM module and is not
 * compatible with the ESM module system.
 *
 * This script will force the opentelemetry package to be CJS.
 *
 * This is a temporary solution until the opentelemetry package is fixed.
 *
 * @see https://github.com/open-telemetry/opentelemetry-js/issues/4898
 */
const fs = require("fs");
const path = require("path");

const pnpmNodeModulesPath = path.join(__dirname, "../node_modules/.pnpm");

const pathsToVisit = [pnpmNodeModulesPath];

do {
  const directoryContents = fs.readdirSync(pathsToVisit.pop(), {
    withFileTypes: true,
  });

  for (const entry of directoryContents) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === "@opentelemetry") {
      const openTelemetryPackagePath = path.join(entry.parentPath, entry.name);

      const packages = fs.readdirSync(openTelemetryPackagePath, {
        withFileTypes: true,
      });

      for (const package of packages) {
        if (!package.isDirectory()) {
          continue;
        }

        markOpentelemetryPackageAsCJS(
          path.join(package.parentPath, package.name)
        );
      }
    } else {
      const packageDirectory = path.join(entry.parentPath, entry.name);
      pathsToVisit.push(packageDirectory);
    }
  }
} while (pathsToVisit.length > 0);

function markOpentelemetryPackageAsCJS(packagePath) {
  const packageJsonPath = path.join(packagePath, "package.json");

  console.log("Checking", packageJsonPath);

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  if (!packageJson.name.match(/^@opentelemetry\//)) {
    console.log("\tPackage is not @opentelemetry package");
    return;
  }

  if ("module" in packageJson || "exports" in packageJson) {
    delete packageJson.module;
    delete packageJson.exports;

    packageJson.type = "commonjs";

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    console.log("\tForced CJS on", packageJsonPath);
    return;
  }

  console.log("\tPackage is already marked as CJS");
}
