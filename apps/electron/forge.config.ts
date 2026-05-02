import type { ForgeConfig } from "@electron-forge/shared-types";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true, // Package app as asar archive for performance
    name: "ElectronNextApp",
    executableName: "electron-next-app",
    icon: "./resources/icon",
    appCopyright: `Copyright © ${new Date().getFullYear()}`,
    // Include the built renderer
    extraResource: ["../../apps/renderer/out"],
    // Ignore unnecessary files
    ignore: [
      /^\/src/,
      /(.eslintrc.json)/,
      /(tsconfig.json)/,
      /(.github)/,
      /(node_modules\/.cache)/,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "ElectronNextApp",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        format: "ULFO",
      },
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          maintainer: "Your Name",
          homepage: "https://your-app.com",
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,             // Disable ELECTRON_RUN_AS_NODE
      [FuseV1Options.EnableCookieEncryption]: true, // Encrypt cookies
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,    // Only load from asar
    }),
  ],
};

export default config;
