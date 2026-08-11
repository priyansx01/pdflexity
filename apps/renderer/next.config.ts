import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Export as static files for Electron in production
  output: isProd ? "export" : undefined,

  // Required for Electron file:// protocol in production
  assetPrefix: isProd ? "./" : undefined,

  // Disable image optimization for Electron static export
  images: {
    unoptimized: isProd,
  },

  // Disable server-based features not needed in Electron
  trailingSlash: isProd,

  // Environment variables accessible in renderer
  env: {
    IS_ELECTRON: "true",
  },
};

export default nextConfig;
