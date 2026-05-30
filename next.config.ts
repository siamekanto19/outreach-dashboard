import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    "better-auth",
    "drizzle-orm",
    "pg",
  ],
};

export default nextConfig;
