import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

import "./src/env";

const nextConfig: NextConfig = {
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908#issuecomment-1487801131
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // below is to fixed warning mentioned here: https://github.com/vercel/next.js/discussions/76247
  serverExternalPackages: ["import-in-the-middle", "require-in-the-middle"],
};

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
});
