import { ipcMain, app, shell } from "electron";

export function registerIpcHandlers(): void {
  // App information
  ipcMain.handle("app:get-platform", () => process.platform);
  ipcMain.handle("app:get-version", () => app.getVersion());

  // Shell operations
  ipcMain.handle("shell:open-external", async (_event, url: string) => {
    // Validate URL before opening
    if (url.startsWith("https://") || url.startsWith("http://")) {
      await shell.openExternal(url);
    } else {
      throw new Error("Only http/https URLs are allowed");
    }
  });

  // Add more handlers as your app grows
}
