// Shared types between main and renderer processes
// These are compile-time only — not bundled into the app

export interface AppConfig {
  version: string;
  platform: NodeJS.Platform;
}

export interface IpcChannels {
  GET_PLATFORM: "app:get-platform";
  GET_VERSION: "app:get-version";
  OPEN_EXTERNAL: "shell:open-external";
}

export const IPC: IpcChannels = {
  GET_PLATFORM: "app:get-platform",
  GET_VERSION: "app:get-version",
  OPEN_EXTERNAL: "shell:open-external",
};
