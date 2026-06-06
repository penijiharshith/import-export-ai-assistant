import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig(process.cwd(), true);

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
