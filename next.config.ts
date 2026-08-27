import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: the repo has no lockfile ancestor to infer it from.
  turbopack: { root: import.meta.dirname },
  // Don't generate AGENTS.md / CLAUDE.md at the repo root - agent instructions
  // for this project live outside it.
  agentRules: false,
};

export default nextConfig;
