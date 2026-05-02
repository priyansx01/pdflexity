import { contextBridge, ipcRenderer } from "electron";

// Expose a safe, typed API to the renderer process
// Never expose ipcRenderer directly - use contextBridge
contextBridge.exposeInMainWorld("electronAPI", {
  // App info
  getPlatform: (): Promise<string> =>
    ipcRenderer.invoke("app:get-platform"),

  getVersion: (): Promise<string> =>
    ipcRenderer.invoke("app:get-version"),

  // Shell
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("shell:open-external", url),

  // Add more IPC methods here as your app grows
  // Example:
  // readFile: (filePath: string): Promise<string> =>
  //   ipcRenderer.invoke("fs:read-file", filePath),
});
