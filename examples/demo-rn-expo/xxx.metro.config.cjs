const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
// import { getDefaultConfig } from "@expo/metro-config";

// console.log("getDefaultConfig", getDefaultConfig);

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [
  projectRoot,
  // Watch the packages directory for symlinked packages
  path.resolve(workspaceRoot, "packages"),
  // Watch the global pnpm location for react-editor
  path.resolve(
    workspaceRoot,
    "../../Library/pnpm/global/5/node_modules/@ecp.eth/",
  ),
  path.resolve(workspaceRoot, "../../.n/usr/local/lib/node_modules/@ecp.eth/"),
];

// Configure resolver to follow symlinks
// config.resolver = {
//   ...config.resolver,
//   // Ensure node_modules resolution works with symlinks
//   nodeModulesPaths: [
//     path.resolve(projectRoot, "node_modules"),
//     path.resolve(workspaceRoot, "node_modules"),
//   ],
// };

module.exports = config;
