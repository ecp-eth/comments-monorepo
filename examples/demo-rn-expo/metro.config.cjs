const { getDefaultConfig } = require("expo/metro-config");
const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, "css"],
};

module.exports = config;
