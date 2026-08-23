import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Static export: Tauri serves the built files from `out/` in production.
  output: isProd ? "export" : undefined,

  // Relative asset paths so the Tauri asset protocol resolves them in production.
  assetPrefix: isProd ? "./" : undefined,

  // No Next image optimization server in a static export.
  images: {
    unoptimized: isProd,
  },

  // Emit directory-style routes (index.html) for the static export.
  trailingSlash: isProd,

  // Marks the renderer as running inside the desktop shell.
  env: {
    IS_DESKTOP: "true",
  },
};

export default nextConfig;
