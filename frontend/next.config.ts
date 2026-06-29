import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Emit a self-contained server bundle for slim Docker images.
  output: "standalone",
};

export default nextConfig;
