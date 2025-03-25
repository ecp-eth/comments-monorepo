import nodeFs from "fs";
import nodePath from "path";
import nodeProcess from "process";
import { glob } from "glob";
import { NonPrivatePackageWithExports, Package } from "./types";

/**
 * Reads the package.json file at the given path and returns the parsed JSON object.
 *
 * @param packageJsonPath The path to the package.json file
 * @returns The parsed package.json object
 */
export async function readPackageJson(
  packageJsonPath: string
): Promise<Package> {
  const packageJsonString = nodeFs.readFileSync(packageJsonPath, "utf-8");
  return JSON.parse(packageJsonString);
}

/**
 * Iterates over all packages matching the glob pattern, make sure they are not
 * private and have exports, and applies the given function to each package.
 *
 * @param globPattern The glob pattern to search for the package
 * @param onEachPackage The function to apply to each package
 * @returns An array of results from the function applied to each package
 */
export async function everyPackage<RetType>(
  globPattern: string,
  onEachPackage: ({
    pkg,
    path,
  }: {
    pkg: NonPrivatePackageWithExports;
    path: string;
  }) => Promise<RetType>
): Promise<RetType[]> {
  const packagePaths = await glob(globPattern);
  const packages = (
    await Promise.all(
      packagePaths.map<
        Promise<{
          pkg: Package;
          path: string;
        }>
      >(async (packagePath) => {
        return {
          pkg: await readPackageJson(packagePath),
          path: packagePath,
        };
      })
    )
  ).filter<{ pkg: NonPrivatePackageWithExports; path: string }>(
    (ctx): ctx is { pkg: NonPrivatePackageWithExports; path: string } => {
      const { pkg } = ctx;
      if (pkg.private === true) return false;
      if (!pkg.exports) return false;
      return true;
    }
  );
  return await Promise.all(packages.map(onEachPackage));
}

/**
 * Iterates over all exports of the given package and applies the given function to each export.
 *
 * @param pkg The package to iterate over the exports of
 * @param onEachExport The function to apply to each export
 */
export async function everyExportWithCJSModule<RetType>(
  pkg: NonPrivatePackageWithExports,
  onEachExport: ({
    key,
    cjsPath,
    typePath,
  }: {
    key: string;
    cjsPath: string;
    typePath: string;
  }) => Promise<RetType>
): Promise<RetType[]> {
  return await Promise.all(
    Object.entries(pkg.exports)
      .filter(
        (entries): entries is [string, { default: string; types: string }] => {
          const [key, exports] = entries;
          // root package.json has its own exports
          if (key === ".") return false;
          if (typeof exports === "string") return false;
          if (!exports.default) return false;
          return true;
        }
      )
      .map(async ([key, exports]) => {
        return await onEachExport({
          key,
          cjsPath: exports.default,
          typePath: exports.types,
        });
      })
  );
}

/**
 * Finds the project root directory by looking up the directory tree for a pnpm-lock.yaml file.
 *
 * @returns The absolute path to the project root directory
 * @throws Error if pnpm-lock.yaml cannot be found
 */
export function findProjectRoot(): string | undefined {
  const startPath: string = nodeProcess.cwd();
  let currentPath = nodePath.resolve(startPath);

  while (currentPath !== "/") {
    if (nodeFs.existsSync(nodePath.join(currentPath, "pnpm-lock.yaml"))) {
      return currentPath;
    }
    currentPath = nodePath.dirname(currentPath);
  }

  return undefined;
}
