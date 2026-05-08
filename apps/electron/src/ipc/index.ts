import { ipcMain, app, shell } from "electron";
import { Channels } from "../constants/channels";
import { registerUnlockHandler }  from "./pdf/unlock";
import { registerProtectHandler } from "./pdf/protect";
import { registerCompareHandler } from "./pdf/compare";
import { registerMergeHandler } from "./pdf/merge";
import { registerSplitHandler } from "./pdf/split";
import { registerSignHandlers } from "./pdf/sign";
import { registerRedactHandlers } from "./pdf/redact";
import { registerOcrHandlers } from "./pdf/ocr";

/**
 * Central IPC router.
 * Import and call this once from main.ts.
 * Add new feature handlers here as the app grows.
 */
export function registerIpcHandlers(): void {
  // ── App info ────────────────────────────────────────────────────────────
  ipcMain.handle(Channels.APP_GET_PLATFORM, () => process.platform);
  ipcMain.handle(Channels.APP_GET_VERSION,  () => app.getVersion());

  // ── Shell ────────────────────────────────────────────────────────────────
  ipcMain.handle(Channels.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      await shell.openExternal(url);
    } else {
      throw new Error("Only http/https URLs are allowed");
    }
  });

  // ── PDF operations ────────────────────────────────────────────────────────
  registerUnlockHandler();
  registerProtectHandler();
  registerCompareHandler();
  registerMergeHandler();
  registerSplitHandler();
  registerSignHandlers();
  registerRedactHandlers();
  registerOcrHandlers();
}
