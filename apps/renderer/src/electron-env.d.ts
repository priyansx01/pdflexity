// Type definitions for Electron APIs exposed via preload script
interface ElectronAPI {
  getPlatform: () => Promise<string>;
  getVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  // Add more IPC methods as needed
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
