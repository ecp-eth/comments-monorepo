#!/usr/bin/env npx --yes tsx

import fs from "fs";
import path from "path";
import { Command } from "commander";
import chalk from "chalk";

const program = new Command();

program
  .name("replace-workspace-version")
  .description(
    'Replace "workspace:*" in a package.json file with actual versions from local workspace packages',
  )
  .argument("<package-json-path>", "Path to the target package.json file")
  .option(
    "-r, --root <workspace-root>",
    "Path to the monorepo root (default: current working directory)",
    process.cwd(),
  )
  .option(
    "-d, --packages-dir <dir>",
    'Relative path to workspace packages directory (default: "packages")',
    "packages",
  )
  .parse(process.argv);

const [packageJsonPathInput] = program.args;
const options = program.opts();

if (!packageJsonPathInput) {
  throw new Error("package-json-path is required");
}

const packageJsonPath = path.resolve(packageJsonPathInput);
const workspaceRoot = path.resolve(options.root);
const packagesDir = path.join(workspaceRoot, options.packagesDir);

if (!fs.existsSync(packageJsonPath)) {
  console.error(chalk.red(`❌ File not found: ${packageJsonPath}`));
  process.exit(1);
}

if (!fs.existsSync(packagesDir)) {
  console.error(chalk.red(`❌ Packages directory not found: ${packagesDir}`));
  process.exit(1);
}

console.log(
  chalk.cyan(
    `📦 Replacing workspace:* versions in ${chalk.bold(packageJsonPath)}`,
  ),
);
console.log(chalk.gray(`🔍 Scanning workspace packages in: ${packagesDir}\n`));

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

function getPackageVersion(pkgName: string): string {
  const pkgDirs = fs.readdirSync(packagesDir);
  for (const dir of pkgDirs) {
    const pkgPath = path.join(packagesDir, dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.name === pkgName) return pkg.version;
    }
  }
  throw new Error(`Package ${pkgName} not found in workspace`);
}

function updateDeps(
  deps: Record<string, string> | undefined,
  type: string,
): void {
  if (!deps) return;
  for (const [key, val] of Object.entries(deps)) {
    if (val === "workspace:*") {
      try {
        const actualVersion = getPackageVersion(key);
        deps[key] = `^${actualVersion}`;
        console.log(
          chalk.green(`✔ Updated ${type}: ${key} → ^${actualVersion}`),
        );
      } catch (err: any) {
        console.warn(
          chalk.yellow(`⚠ Skipped ${type}: ${key} — ${err.message}`),
        );
      }
    }
  }
}

updateDeps(packageJson.dependencies, "dependencies");
updateDeps(packageJson.devDependencies, "devDependencies");
updateDeps(packageJson.peerDependencies, "peerDependencies");

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

console.log(
  chalk.blueBright("\n✅ workspace:* versions replaced successfully."),
);
