import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // Tunnels / reverse proxies send a different Host than localhost
      allowedOrigins: [
        "localhost:3000",
        "*.trycloudflare.com",
        "*.loca.lt",
      ],
    },
  },
};

export default nextConfig;
