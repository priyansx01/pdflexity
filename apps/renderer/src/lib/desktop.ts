"use client";

/**
 * The single OS-capability adapter. Every Tauri interaction in the renderer
 * goes through this module — components never import the plugins directly.
 */

import { open, save } from "@tauri-apps/plugin-dialog";
import { exists, readFile as fsReadFile, writeFile as fsWriteFile } from "@tauri-apps/plugin-fs";
import { basename } from "@tauri-apps/api/path";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";

export type LoadedFile = { buffer: ArrayBuffer; name: string };

const PDF_FILTER = { name: "PDF", extensions: ["pdf"] };

// ─── File pickers ─────────────────────────────────────────────────────────────

/** Open a native PDF picker. Returns null on cancel; throws readable errors. */
export async function openPdf(multiple = false): Promise<LoadedFile[] | null> {
  let selected: string | string[] | null;
  try {
    selected = await open({ multiple, filters: [PDF_FILTER] });
  } catch (e) {
    throw new Error(`Couldn't open the file picker: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!selected) return null;
  const paths = (Array.isArray(selected) ? selected : [selected])
    .map((p) => (typeof p === "string" ? p : (p as { path?: string }).path))
    .filter((p): p is string => !!p);
  return readFiles(paths);
}

/** Pick a directory (for the default save location). Returns null on cancel. */
export async function pickDirectory(): Promise<string | null> {
  try {
    const dir = await open({ directory: true, multiple: false });
    if (!dir) return null;
    return typeof dir === "string" ? dir : (dir as { path?: string }).path ?? null;
  } catch (e) {
    throw new Error(`Couldn't open the folder picker: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Read OS paths into LoadedFile[] (copies buffers so pdf.js can't detach them). */
export async function readFiles(paths: string[]): Promise<LoadedFile[]> {
  const out: LoadedFile[] = [];
  for (const p of paths) {
    try {
      const bytes = await fsReadFile(p);
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      out.push({ buffer, name: await basename(p) });
    } catch (e) {
      // Skip unreadable entries rather than failing the whole batch, but make
      // the skip diagnosable instead of silent.
      console.warn(`[desktop] skipped unreadable file: ${p}`, e);
    }
  }
  if (!out.length) throw new Error("Couldn't read the selected file(s).");
  return out;
}

// ─── Saving / revealing ───────────────────────────────────────────────────────

/** Decode base64 to bytes. */
export function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encode bytes to base64 (chunked to avoid call-stack limits on large files). */
export function bytesToB64(bytes: Uint8Array | ArrayBuffer): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCharCode(...u8.subarray(i, Math.min(i + CHUNK, u8.length)));
  }
  return btoa(binary);
}

/**
 * Prompt for a save location and write the bytes. Returns the chosen path, or
 * null on cancel. Never auto-writes next to the source file. When a default
 * save directory is configured (settings), the dialog opens there preselected.
 */
export async function savePdfAs(defaultName: string, dataB64: string): Promise<string | null> {
  const { useSettings } = await import("@/lib/settings");
  const dir = useSettings.getState().defaultSaveDir;
  const defaultPath = dir ? joinPath(dir, defaultName) : defaultName;
  const path = await save({ defaultPath, filters: [PDF_FILTER] });
  if (!path) return null;
  await fsWriteFile(path, b64ToBytes(dataB64));
  return path;
}

/**
 * One-click save: when a default save folder is configured, write straight to
 * it (suffixing "(1)", "(2)"… on name collisions) — no dialog. Falls back to
 * the interactive dialog when no folder is set or the direct write fails
 * (folder moved/removed, permissions). Returns the saved path, or null if the
 * fallback dialog was cancelled.
 */
export async function savePdfAuto(fileName: string, dataB64: string): Promise<string | null> {
  const { useSettings } = await import("@/lib/settings");
  const dir = useSettings.getState().defaultSaveDir;
  if (!dir) return savePdfAs(fileName, dataB64);

  try {
    let target = joinPath(dir, fileName);
    const dot = fileName.lastIndexOf(".");
    const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
    const ext = dot > 0 ? fileName.slice(dot) : "";
    for (let n = 1; await exists(target); n++) {
      target = joinPath(dir, `${stem} (${n})${ext}`);
    }
    await fsWriteFile(target, b64ToBytes(dataB64));
    return target;
  } catch {
    // Direct write failed — never lose the result over a stale folder.
    return savePdfAs(fileName, dataB64);
  }
}

/** Join a directory and filename across platform separators. */
function joinPath(dir: string, name: string): string {
  const sep = dir.includes("\\") ? "\\" : "/";
  return dir.endsWith(sep) ? `${dir}${name}` : `${dir}${sep}${name}`;
}

/** Reveal a saved file in the OS file manager. */
export async function revealInFolder(path: string): Promise<void> {
  await revealItemInDirSafe(path);
}

async function revealItemInDirSafe(path: string) {
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  await revealItemInDir(path);
}

// ─── Drag & drop ──────────────────────────────────────────────────────────────

export type FileDropHandlers = {
  onOver?: () => void;
  onLeave?: () => void;
  onDrop?: (files: LoadedFile[]) => void;
};

/**
 * Subscribe to OS-level drag/drop. Hover state is driven from
 * payload.type "enter"|"over" (Windows fires enter first); drops are read
 * through the fs plugin. Handlers are captured in a ref so callers can pass
 * fresh closures without resubscribing.
 */
export function onFileDrop(handlers: FileDropHandlers): () => void {
  const ref: { current: FileDropHandlers } = { current: handlers };
  let unlisten: (() => void) | undefined;
  let cancelled = false;
  let over = false;

  getCurrentWebview()
    .onDragDropEvent(async (event) => {
      const type = event.payload.type;
      if (type === "enter" || type === "over") {
        if (!over) {
          over = true;
          ref.current.onOver?.();
        }
      } else if (type === "leave") {
        if (over) {
          over = false;
          ref.current.onLeave?.();
        }
      } else if (type === "drop") {
        over = false;
        const paths = (event.payload as { paths?: string[] }).paths ?? [];
        const files = await readFiles(paths).catch(() => [] as LoadedFile[]);
        if (files.length) ref.current.onDrop?.(files);
      }
    })
    .then((u) => {
      // If the caller already cleaned up before the listener finished
      // registering, unsubscribe immediately so it can't leak.
      if (cancelled) u();
      else unlisten = u;
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    unlisten?.();
  };
}

// ─── Progress events (Rust `app.emit("job:progress", pct)`) ────────────────────

/** Subscribe to engine job progress. Returns an unsubscribe fn. */
export function onJobProgress(onProgress: (pct: number) => void): Promise<() => void> {
  return listen<number>("job:progress", (e) => {
    const pct = typeof e.payload === "number" ? e.payload : (e.payload as { pct?: number })?.pct;
    if (typeof pct === "number") onProgress(pct);
  });
}

// ─── Window controls & theme ──────────────────────────────────────────────────

/** Current window helpers (frameless shell). */
export const windowControls = {
  minimize(): void {
    if (typeof window !== "undefined") getCurrentWindow().minimize().catch(() => {});
  },
  toggleMaximize(): void {
    if (typeof window !== "undefined") getCurrentWindow().toggleMaximize().catch(() => {});
  },
  close(): void {
    if (typeof window !== "undefined") getCurrentWindow().close().catch(() => {});
  },
  async isMaximized(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      return await getCurrentWindow().isMaximized();
    } catch {
      return false;
    }
  },
  /** Subscribe to resize (to refresh maximize state). Returns unsubscribe. */
  onResized(cb: () => void): Promise<() => void> {
    if (typeof window === "undefined") return Promise.resolve(() => {});
    return getCurrentWindow()
      .onResized(cb)
      .then((u) => () => u())
      .catch(() => () => {});
  },
};

/** True when the main window is currently visible (false when hidden to tray). */
export async function isWindowVisible(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  try {
    return await getCurrentWindow().isVisible();
  } catch {
    return true;
  }
}

// ─── Native OS notifications ───────────────────────────────────────────────────

/** Ask once for OS notification permission (no-op if already granted). */
export async function requestNotifyPermission(): Promise<void> {
  try {
    const { isPermissionGranted, requestPermission } = await import(
      "@tauri-apps/plugin-notification"
    );
    if (!(await isPermissionGranted())) await requestPermission();
  } catch {
    /* plugin unavailable — silently skip */
  }
}

/** Send a native OS notification (requests permission if needed). Never throws. */
export async function notify(title: string, body: string): Promise<void> {
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      "@tauri-apps/plugin-notification"
    );
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === "granted";
    if (granted) sendNotification({ title, body });
  } catch {
    /* plugin unavailable — silently skip */
  }
}

/** The OS window theme ("dark" | "light" | null when unknown). */
export async function windowTheme(): Promise<"dark" | "light" | null> {
  if (typeof window === "undefined") return null;
  try {
    const t = await getCurrentWindow().theme();
    return t ?? null;
  } catch {
    return null;
  }
}
