import { autoUpdater } from "electron";
import { dialog } from "electron";

const FEED_URL = process.env.UPDATE_FEED_URL ?? "";

export function setupAutoUpdater(): void {
  if (!FEED_URL) {
    console.warn("UPDATE_FEED_URL not set — auto-update disabled");
    return;
  }

  autoUpdater.setFeedURL({ url: FEED_URL });

  autoUpdater.on("update-available", () => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Update Available",
        message: "A new version is available. It will be installed on restart.",
        buttons: ["OK"],
      })
      .catch(console.error);
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-updater error:", err);
  });

  // Check for updates every hour
  setInterval(() => autoUpdater.checkForUpdates(), 60 * 60 * 1000);
  autoUpdater.checkForUpdates();
}
