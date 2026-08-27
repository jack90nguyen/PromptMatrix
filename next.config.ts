import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: the repo has no lockfile ancestor to infer it from.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
