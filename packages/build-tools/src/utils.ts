import nodeFs from "fs";
import nodePath from "path";
import nodeProcess from "process";
import { glob, Path as GlobPath } from "glob";
import { CJSESMExport, NonPrivatePackageWithExports, Package } from "./types";

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
        const resolvedPath = nodePath.resolve(process.cwd(), packagePath);
        return {
          pkg: await readPackageJson(resolvedPath),
          path: resolvedPath,
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

type CJSESMExportEntry = [string, CJSESMExport];

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
  }) => Promise<RetType>,
  avoidSpread: boolean
): Promise<RetType[]> {
  const allPromisedExports: Promise<CJSESMExportEntry[]>[] = Object.entries(
    pkg.exports
  )
    .filter((entries): entries is CJSESMExportEntry => {
      const [key, exports] = entries;
      // root package.json has its own exports
      if (key === ".") return false;
      if (typeof exports === "string") return false;
      if (!exports.default) return false;
      return true;
    })
    // handle exports with a wildcard
    .reduce(
      (acc, [key, exports]) => {
        if (avoidSpread === true || !key.includes("*")) {
          acc.push(Promise.resolve([[key, exports]]));
        } else {
          acc.push(
            (async (): Promise<CJSESMExportEntry[]> => {
              // Remove the /* from the end of the key to get the base path
              const exportDefParts = exports.default.split("*");
              const exportDefPrefix = exportDefParts[0]
                ? nodePath.normalize(exportDefParts[0])
                : "";
              const exportDefSuffix = exportDefParts[1] ?? "";

              const spreadedModules = await glob(exports.default, {
                // export does not support globstar like `**`
                noglobstar: true,
                nodir: true,
                withFileTypes: true,
              });

              const expandedEntries = spreadedModules
                .filter((path): path is GlobPath => {
                  return !(typeof path === "string");
                })
                .map((defExportPath: GlobPath) => {
                  const defExportRelPath = defExportPath.relative();

                  const wildcardMatches = defExportRelPath
                    .replace(new RegExp(`^${exportDefPrefix}`), "")
                    .replace(new RegExp(`${exportDefSuffix}$`), "");

                  const resolvedKey = key.replace("*", wildcardMatches);
                  const resolvedDefault = exports.default.replace(
                    "*",
                    wildcardMatches
                  );
                  const resolvedTypes = exports.types.replace(
                    "*",
                    wildcardMatches
                  );

                  return [
                    resolvedKey,
                    {
                      default: resolvedDefault,
                      types: resolvedTypes,
                    },
                  ];
                }) as [string, { default: string; types: string }][];

              return expandedEntries;
            })()
          );
        }
        return acc;
      },
      [] as Promise<CJSESMExportEntry[]>[]
    );

  const allExportsArray = await Promise.all(allPromisedExports);

  return Promise.all(
    allExportsArray.flat().map(async ([key, exports]) => {
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
