/**
 * Proxy Packages (as termed by the wagmi team) are package.json files stored in
 * directories named after exported modules. They redirect import requests
 * to modules built in different locations.
 *
 * These package.json files are necessary because some platforms and libraries
 * still have difficulties handling the `exports` field in package.json.
 *
 * This particularly affects metro-based projects like Expo and React Native.
 * While metro does support exports via the `unstable_enablePackageExports` flag,
 * enabling it can lead to two issues:
 *
 * 1. It requires creating a metro.config file, which Expo Snack doesn't support
 * 2. Some libraries incorrectly assume they can use Node.js APIs (like `stream`/`net`)
 *    when exports are registered by the platform, causing React Native builds to fail
 */
import nodeFs from "fs";
import nodePath from "path";
import { glob } from "glob";

type Package = Record<string, unknown> & {
  name?: string;
  private?: boolean;
  exports?: Record<string, { types: string; default: string } | string>;
};

type NonPrivatePackageWithExports = Omit<Package, "private" | "exports"> & {
  private?: false;
  exports: Record<string, { types: string; default: string } | string>;
};

console.log("Generating proxy packages...");

async function main() {
  const packagePaths = await glob("packages/{sdk,shared}/package.json");

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

  await Promise.all(
    packages.map(async ({ pkg, path }) => {
      const dir = nodePath.resolve(nodePath.dirname(path));

      console.log(`Start processing ${pkg.name} at (${dir})`);

      await Promise.all(
        Object.entries(pkg.exports).map(async ([key, exports]) => {
          // root package.json has been handled manually already
          if (key === ".") return;
          if (typeof exports === "string") return;
          if (!exports.default) return;

          const proxyDir = nodePath.resolve(dir, key);
          nodeFs.mkdirSync(proxyDir, { recursive: true });

          const types = nodePath.relative(key, exports.types);
          const main = nodePath.relative(key, exports.default);

          nodeFs.writeFileSync(
            `${proxyDir}/package.json`,
            `${JSON.stringify({ type: "module", types, main }, undefined, 2)}\n`
          );

          console.log(`created ${key} at (${proxyDir})`);
        })
      );

      console.log(`Done processing ${pkg.name}`);
    })
  );

  console.log(`Done. Total generated proxy packages: ${packages.length}.`);
}

async function readPackageJson(packageJsonPath: string): Promise<Package> {
  const packageJsonString = nodeFs.readFileSync(packageJsonPath, "utf-8");
  return JSON.parse(packageJsonString);
}

main();
