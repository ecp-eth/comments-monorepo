import type { NextConfig } from "next";
import { envForConfig } from "./env.config";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: envForConfig.NODE_ENV !== "production",
  },
  typescript: {
    ignoreBuildErrors: envForConfig.NODE_ENV !== "production",
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: envForConfig.ACCESS_CONTROL_ALLOW_ORIGIN,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
