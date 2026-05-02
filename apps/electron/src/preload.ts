import { contextBridge, ipcRenderer } from "electron";

// ─── Typed API exposed to renderer via contextBridge ─────────────────────────
// Never expose ipcRenderer directly — always proxy through here.

contextBridge.exposeInMainWorld("electronAPI", {
  // ── App info ──────────────────────────────────────────────────────────────
  getPlatform: (): Promise<string> =>
    ipcRenderer.invoke("app:get-platform"),

  getVersion: (): Promise<string> =>
    ipcRenderer.invoke("app:get-version"),

  // ── Shell ─────────────────────────────────────────────────────────────────
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("shell:open-external", url),

  // ── PDF operations ────────────────────────────────────────────────────────
  pdf: {
    /**
     * Unlock a password-protected PDF.
     * @param buffer  - ArrayBuffer of the input PDF
     * @param password - The PDF password
     * @param fileName - Original filename for the download
     * @returns base64-encoded decrypted PDF or an error
     */
    unlock: (
      buffer: ArrayBuffer,
      password: string,
      fileName: string
    ): Promise<{ success: true; data: string; fileName: string } | { success: false; error: string }> =>
      ipcRenderer.invoke("pdf:unlock", new Uint8Array(buffer), password, fileName),
  },
});
