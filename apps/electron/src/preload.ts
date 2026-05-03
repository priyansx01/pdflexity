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
    unlock: (
      buffer: ArrayBuffer,
      password: string,
      fileName: string
    ): Promise<{ success: true; data: string; fileName: string } | { success: false; error: string }> =>
      ipcRenderer.invoke("pdf:unlock", new Uint8Array(buffer), password, fileName),

    protect: (
      buffer: ArrayBuffer,
      password: string,
      fileName: string
    ): Promise<{ success: true; data: string; fileName: string } | { success: false; error: string }> =>
      ipcRenderer.invoke("pdf:protect", new Uint8Array(buffer), password, fileName),

    compare: (
      bufferA: ArrayBuffer,
      bufferB: ArrayBuffer,
    ): Promise<{ success: true; data: unknown } | { success: false; error: string }> =>
      ipcRenderer.invoke("pdf:compare", bufferA, bufferB),

    merge: (
      files: { buffer: ArrayBuffer; name: string }[],
      fileName: string
    ): Promise<{ success: true; data: string; fileName: string } | { success: false; error: string }> => {
      const buffers = files.map(f => new Uint8Array(f.buffer));
      const names = files.map(f => f.name);
      return ipcRenderer.invoke("pdf:merge", buffers, names, fileName);
    },
  },
});
