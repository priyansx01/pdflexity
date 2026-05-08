import { contextBridge, ipcRenderer } from "electron";

// ─── Typed API exposed to renderer via contextBridge ─────────────────────────
// Never expose ipcRenderer directly — always proxy through here.

// Redaction types
interface RedactionMark {
  page: number
  x: number
  y: number
  width: number
  height: number
  fillColor?: string
  label?: string
  labelColor?: string
}

interface RedactionInfo {
  pageCount: number
  pages: { page: number; width: number; height: number }[]
}

interface SearchMatch {
  page: number
  text: string
  x: number
  y: number
  width: number
  height: number
}

interface SearchResult {
  matches: SearchMatch[]
  total: number
}

interface PreviewResult {
  imageBase64: string
  width: number
  height: number
}

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

    split: (
      buffer: ArrayBuffer,
      fileName: string,
      pageRanges: string[],
      mergeOutput: boolean
    ): Promise<
      | { success: true; data: ArrayBuffer; fileName: string; isMultiple?: false }
      | { success: true; data: { name: string; buffer: ArrayBuffer }[]; isMultiple: true }
      | { success: false; error: string }
    > =>
      ipcRenderer.invoke("pdf:split", new Uint8Array(buffer), fileName, pageRanges, mergeOutput),

    sign: (options: any): Promise<{ success: true; data: string; fileName: string } | { success: false; error: string }> =>
      ipcRenderer.invoke("pdf:sign", options),

    verify: (buffer: ArrayBuffer): Promise<{ success: true; data: any } | { success: false; error: string }> =>
      ipcRenderer.invoke("pdf:verify", new Uint8Array(buffer)),

    certInfo: (certPath: string, passphrase: string): Promise<{ success: true; data: any } | { success: false; error: string }> =>
      ipcRenderer.invoke("pdf:cert-info", certPath, passphrase),

    // Redaction operations
    redact: {
      info: (
        buffer: ArrayBuffer
      ): Promise<{ success: true; data: RedactionInfo } | { success: false; error: string }> =>
        ipcRenderer.invoke("pdf:redact-info", new Uint8Array(buffer)),

      search: (
        buffer: ArrayBuffer,
        query: string,
        caseSensitive?: boolean,
        regex?: boolean
      ): Promise<{ success: true; data: SearchResult } | { success: false; error: string }> =>
        ipcRenderer.invoke("pdf:redact-search", new Uint8Array(buffer), query, caseSensitive ?? false, regex ?? false),

      preview: (
        buffer: ArrayBuffer,
        page: number,
        scale?: number,
        marks?: RedactionMark[]
      ): Promise<{ success: true; data: PreviewResult } | { success: false; error: string }> =>
        ipcRenderer.invoke("pdf:redact-preview", new Uint8Array(buffer), page, scale ?? 1.5, marks ?? []),

      apply: (
        buffer: ArrayBuffer,
        fileName: string,
        marks: RedactionMark[]
      ): Promise<{ success: true; data: string; fileName: string; marksApplied: number; pagesAffected: number[] } | { success: false; error: string }> =>
        ipcRenderer.invoke("pdf:redact", new Uint8Array(buffer), fileName, marks),
    },

    // OCR operations
    ocr: {
      start: (
        buffer: ArrayBuffer,
        fileName: string,
        languages: string[],
        dpi: number
      ): Promise<{ success: true; jobId: string; data: any } | { success: false; error: string }> =>
        ipcRenderer.invoke("pdf:ocr-start", new Uint8Array(buffer), fileName, languages, dpi),

      cancel: (
        jobId: string
      ): Promise<{ success: boolean; error?: string }> =>
        ipcRenderer.invoke("pdf:ocr-cancel", jobId),

      renderPage: (
        buffer: ArrayBuffer,
        page: number,
        scale: number
      ): Promise<{ success: true; data: any } | { success: false; error: string }> =>
        ipcRenderer.invoke("pdf:ocr-render-page", new Uint8Array(buffer), page, scale),

      export: (
        buffer: ArrayBuffer,
        fileName: string,
        format: string,
        ocrData: any,
        edits?: any
      ): Promise<{ success: true; data: string; fileName: string } | { success: false; error: string }> =>
        ipcRenderer.invoke("pdf:ocr-export", new Uint8Array(buffer), fileName, format, ocrData, edits),

      onProgress: (callback: (_event: any, data: any) => void): void => {
        ipcRenderer.on("pdf:ocr-progress", callback);
      },

      onPageResult: (callback: (_event: any, data: any) => void): void => {
        ipcRenderer.on("pdf:ocr-page-result", callback);
      },

      removeListeners: (): void => {
        ipcRenderer.removeAllListeners("pdf:ocr-progress");
        ipcRenderer.removeAllListeners("pdf:ocr-page-result");
      },
    },
  },
});
