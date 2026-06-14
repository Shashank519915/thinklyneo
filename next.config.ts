/**
 * @fileoverview Next.js build/runtime config: permissive remote image patterns and larger server action bodies.
 */

import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Prevent Turbopack from treating the parent Thinkly folder as the monorepo root (OOM on Windows).
  turbopack: {
    root: appRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
    return {
      // Run before filesystem routing so proxied API paths never hit the app 404 page.
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

/** Default export consumed by `next build`; relaxes `next/image` HTTPS hosts and raises server action payload cap. */
export default nextConfig;
