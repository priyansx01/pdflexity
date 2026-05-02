import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  nativeTheme,
} from "electron";
import * as path from "path";
import { setupAutoUpdater } from "./updater";
import { createMenu } from "./menu";
import { registerIpcHandlers } from "./ipc/index";

// Handle Squirrel events on Windows (installer)
if (require("electron-squirrel-startup")) {
  app.quit();
}

const isDev = process.env.NODE_ENV === "development";
const RENDERER_URL = "http://localhost:3000";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Show after ready-to-show for smooth startup
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,  // Security: isolate renderer from main
      nodeIntegration: false,   // Security: no Node in renderer
      sandbox: true,            // Security: sandboxed renderer
      webSecurity: !isDev,      // Allow local file access in dev
    },
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0f0f" : "#ffffff",
  });

  // Show window when ready to avoid white flash
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(RENDERER_URL);
  } else {
    // Load exported Next.js static files
    mainWindow.loadFile(
      path.join(__dirname, "../../renderer/out/index.html")
    );
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  createMenu(mainWindow);
  registerIpcHandlers();

  if (!isDev) {
    setupAutoUpdater();
  }

  // macOS: re-create window when dock icon is clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

export { mainWindow };
