// Type definitions for Electron APIs exposed via preload contextBridge
// Keep in sync with apps/electron/src/preload.ts

type PdfUnlockResult =
  | { success: true;  data: string; fileName: string }
  | { success: false; error: string }

interface ElectronAPI {
  // App info
  getPlatform:  () => Promise<string>
  getVersion:   () => Promise<string>
  // Shell
  openExternal: (url: string) => Promise<void>
  // PDF operations
  pdf: {
    unlock: (
      buffer: ArrayBuffer,
      password: string,
      fileName: string
    ) => Promise<PdfUnlockResult>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
