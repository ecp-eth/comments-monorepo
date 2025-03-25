#!/usr/bin/env node

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
import chalk from "chalk";
import nodeFs from "fs";
import nodePath from "path";
import { Command } from "commander";
import {
  everyExportWithCJSModule,
  everyPackage,
  findProjectRoot,
} from "./utils";
import buildToolsPkg from "../package.json";

const program = new Command();
program.description("Proxy packages utility").version(buildToolsPkg.version);

program
  .command("generate")
  .description("Generate proxy packages")
  .argument("<string>", "The pattern to search for the package")
  .action(async (pattern) => {
    console.log("Generating proxy packages...");

    const results = await everyPackage(pattern, async ({ pkg, path }) => {
      const dir = nodePath.resolve(nodePath.dirname(path));

      console.log(`Start processing ${pkg.name} at (${dir})`);

      await everyExportWithCJSModule(
        pkg,
        async ({ key, cjsPath, typePath }) => {
          const proxyDir = nodePath.resolve(dir, key);
          nodeFs.mkdirSync(proxyDir, { recursive: true });

          const types = nodePath.relative(key, typePath);
          const main = nodePath.relative(key, cjsPath);

          nodeFs.writeFileSync(
            `${proxyDir}/package.json`,
            `${JSON.stringify({ type: "module", types, main }, undefined, 2)}\n`
          );

          console.log(`created ${key} at (${proxyDir})`);
        }
      );

      console.log(`Done processing ${pkg.name}`);
    });

    console.log(
      `${chalk.green.bold("Done!")} Total generated proxy packages: ${results.length}.`
    );
  });

program
  .command("hide")
  .description("Hide generated proxy packages in the project")
  .argument("<string>", "The pattern to search for the package")
  .action(async (pattern) => {
    console.log("Hiding proxy packages...");

    const projectRoot = findProjectRoot();

    if (!projectRoot) {
      console.error("Project root not found");
      process.exit(1);
    }

    const results = await everyPackage(pattern, async ({ pkg, path }) => {
      const dir = nodePath.resolve(nodePath.dirname(path));

      console.log(`Start processing ${pkg.name} at (${dir})`);

      await everyExportWithCJSModule(pkg, async ({ key }) => {
        const proxyDir = nodePath.resolve(dir, key);
        const relativePath = nodePath.relative(projectRoot, proxyDir);

        // Check and update .gitignore
        const gitignorePath = nodePath.join(projectRoot, ".gitignore");
        if (!nodeFs.existsSync(gitignorePath)) {
          nodeFs.writeFileSync(gitignorePath, "");
        }

        const gitignoreContent = nodeFs.readFileSync(gitignorePath, "utf-8");

        if (!gitignoreContent.includes(relativePath)) {
          nodeFs.appendFileSync(gitignorePath, `\n${relativePath}`);
          console.log(`Added ${relativePath} to .gitignore`);
        }

        // Check and update VS Code settings
        const vscodeSettingsPath = nodePath.join(
          projectRoot,
          ".vscode/settings.json"
        );
        let settings: { "files.exclude"?: Record<string, unknown> } = {};

        if (nodeFs.existsSync(vscodeSettingsPath)) {
          settings = JSON.parse(
            nodeFs.readFileSync(vscodeSettingsPath, "utf-8")
          );
        } else {
          nodeFs.mkdirSync(nodePath.dirname(vscodeSettingsPath), {
            recursive: true,
          });
        }

        settings["files.exclude"] ??= {};

        if (!settings["files.exclude"][relativePath]) {
          settings["files.exclude"][relativePath] = true;
          nodeFs.writeFileSync(
            vscodeSettingsPath,
            JSON.stringify(settings, null, 2)
          );
          console.log(`Added ${relativePath} to VS Code files.exclude`);
        }
      });

      console.log(`Done processing ${pkg.name}`);
    });

    console.log(
      `${chalk.green.bold("Done!")} Total hidden proxy packages: ${results.length}.`
    );
  });

program.parse(process.argv);
