import type { NextConfig } from "next";

// Backend is only reachable via its internal Docker hostname; the browser never calls it directly
const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
