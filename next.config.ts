import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable in development — Turbopack + service workers don't mix in dev.
  // This is standard practice, not a workaround.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
};

export default withSerwist(nextConfig);
