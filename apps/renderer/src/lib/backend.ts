/**
 * Frontend backend adapter.
 *
 * Exposes the SAME `window.electronAPI` shape the React UI already uses, but
 * routes every call through Tauri `invoke()` / `listen()` instead of Electron
 * IPC. Buffers travel as base64 over the bridge; results are decoded back to
 * match the original contract (e.g. split returns ArrayBuffer payloads).
 *
 * This lets the entire UI work unchanged after the Electron -> Tauri port.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// ─── encoding helpers ────────────────────────────────────────────────────────

/** ArrayBuffer -> base64 (chunked to avoid call-stack limits on large PDFs). */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return bytesToBase64(new Uint8Array(buffer));
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Generic envelope returned by every Rust command (camelCase, matches OpResult).
type OpResult = {
  success: boolean;
  data?: unknown;
  fileName?: string;
  error?: string;
  isMultiple?: boolean;
  jobId?: string;
  marksApplied?: number;
  pagesAffected?: number[];
};

async function call(cmd: string, args: Record<string, unknown>): Promise<OpResult> {
  return invoke<OpResult>(cmd, args);
}

// ─── API factory ──────────────────────────────────────────────────────────────

export function createElectronAPI() {
  const pdf = {
    unlock: (buffer: ArrayBuffer, password: string, fileName: string) =>
      call("pdf_unlock", { bufferB64: arrayBufferToBase64(buffer), password, fileName }),

    protect: (buffer: ArrayBuffer, password: string, fileName: string) =>
      call("pdf_protect", { bufferB64: arrayBufferToBase64(buffer), password, fileName }),

    compare: (bufferA: ArrayBuffer, bufferB: ArrayBuffer) =>
      call("pdf_compare", {
        bufferAB64: arrayBufferToBase64(bufferA),
        bufferBB64: arrayBufferToBase64(bufferB),
      }),

    merge: (files: { buffer: ArrayBuffer; name: string }[], fileName: string) =>
      call("pdf_merge", {
        files: files.map((f) => ({ buffer: arrayBufferToBase64(f.buffer), name: f.name })),
        fileName,
      }),

    split: async (
      buffer: ArrayBuffer,
      fileName: string,
      pageRanges: string[],
      mergeOutput: boolean,
    ) => {
      const r = await call("pdf_split", {
        bufferB64: arrayBufferToBase64(buffer),
        fileName,
        pageRanges,
        mergeOutput,
      });
      if (!r.success) return r;
      // Convert base64 payloads back to ArrayBuffer to match the original contract.
      if (r.isMultiple) {
        const files = (r.data as { name: string; data: string }[]).map((f) => ({
          name: f.name,
          buffer: base64ToUint8Array(f.data).buffer,
        }));
        return { success: true as const, isMultiple: true as const, data: files };
      }
      return {
        success: true as const,
        data: base64ToUint8Array(r.data as string).buffer,
        fileName: r.fileName,
      };
    },

    sign: (options: Record<string, unknown>) => {
      const { pdfBytes, ...rest } = options as { pdfBytes: ArrayBuffer } & Record<string, unknown>;
      return call("pdf_sign", {
        options: { pdfBytes: arrayBufferToBase64(pdfBytes), ...rest },
      });
    },

    verify: (buffer: ArrayBuffer) =>
      call("pdf_verify", { bufferB64: arrayBufferToBase64(buffer) }),

    certInfo: (certPath: string, passphrase: string) =>
      call("pdf_cert_info", { certPath, passphrase }),

    redact: {
      info: (buffer: ArrayBuffer) =>
        call("pdf_redact_info", { bufferB64: arrayBufferToBase64(buffer) }),

      search: (buffer: ArrayBuffer, query: string, caseSensitive?: boolean, regex?: boolean) =>
        call("pdf_redact_search", {
          bufferB64: arrayBufferToBase64(buffer),
          query,
          caseSensitive: caseSensitive ?? false,
          regex: regex ?? false,
        }),

      preview: (buffer: ArrayBuffer, page: number, scale?: number, marks?: unknown[]) =>
        call("pdf_redact_preview", {
          bufferB64: arrayBufferToBase64(buffer),
          page,
          scale: scale ?? 1.5,
          marks: marks ?? [],
        }),

      apply: (buffer: ArrayBuffer, fileName: string, marks: unknown[]) =>
        call("pdf_redact_apply", {
          bufferB64: arrayBufferToBase64(buffer),
          fileName,
          marks,
        }),
    },

    ocr: (() => {
      // Track Tauri listener handles so removeListeners() can detach them.
      const handles: UnlistenFn[] = [];
      return {
        start: (buffer: ArrayBuffer, fileName: string, languages: string[], dpi: number) =>
          call("pdf_ocr_start", {
            bufferB64: arrayBufferToBase64(buffer),
            fileName,
            languages,
            dpi,
          }),

        cancel: (jobId: string) => call("pdf_ocr_cancel", { jobId }),

        renderPage: (buffer: ArrayBuffer, page: number, scale: number) =>
          call("pdf_ocr_render_page", {
            bufferB64: arrayBufferToBase64(buffer),
            page,
            scale,
          }),

        export: (
          buffer: ArrayBuffer,
          fileName: string,
          format: string,
          ocrData: unknown,
          edits?: unknown,
        ) =>
          call("pdf_ocr_export", {
            bufferB64: arrayBufferToBase64(buffer),
            fileName,
            format,
            ocrData,
            edits: edits ?? {},
          }),

        onProgress: (callback: (_event: unknown, data: unknown) => void): void => {
          listen("pdf:ocr-progress", (e) => callback(null, e.payload)).then((un) =>
            handles.push(un),
          );
        },

        onPageResult: (callback: (_event: unknown, data: unknown) => void): void => {
          listen("pdf:ocr-page-result", (e) => callback(null, e.payload)).then((un) =>
            handles.push(un),
          );
        },

        removeListeners: (): void => {
          handles.splice(0).forEach((un) => {
            try {
              un();
            } catch {
              /* ignore */
            }
          });
        },
      };
    })(),
  };

  return {
    getPlatform: () => invoke<string>("app_get_platform"),
    getVersion: () => invoke<string>("app_get_version"),
    openExternal: (url: string) => invoke<void>("open_external", { url }),
    pdf,
  };
}

// ─── Self-install on the client ───────────────────────────────────────────────
//
// Done at module load (not in a React effect) so deep child effects that read
// `window.electronAPI` (e.g. the OCR hook) see it on first render.
// `electron-env.d.ts` owns the Window type; we assign loosely to stay compatible.

if (typeof window !== "undefined" && !(window as { electronAPI?: unknown }).electronAPI) {
  (window as { electronAPI: unknown }).electronAPI = createElectronAPI();
}

export {};
