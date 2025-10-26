import type { NextConfig } from "next";
import { env } from "@/lib/env";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: env.NODE_ENV !== "production",
  },
  typescript: {
    ignoreBuildErrors: env.NODE_ENV !== "production",
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: env.ACCESS_CONTROL_ALLOW_ORIGIN,
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
