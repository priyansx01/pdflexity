"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { readFile as fsReadFile } from "@tauri-apps/plugin-fs";
import { basename } from "@tauri-apps/api/path";
import { getCurrentWebview } from "@tauri-apps/api/webview";

export type LoadedFile = { buffer: ArrayBuffer; name: string };

const PDF_FILTER = { name: "PDF", extensions: ["pdf"] };

/**
 * Open a native file picker (single or multiple PDFs). Returns null when the
 * user cancels; throws with a readable message on failure.
 */
export async function pickPdf(multiple = false): Promise<LoadedFile[] | null> {
  let selected: string | string[] | null;
  try {
    selected = await open({ multiple, filters: [PDF_FILTER] });
  } catch (e) {
    throw new Error(`Couldn't open the file picker: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!selected) return null;
  const paths = (Array.isArray(selected) ? selected : [selected]).filter(
    (p): p is string => typeof p === "string" || typeof (p as { path?: string }).path === "string",
  ).map((p) => (typeof p === "string" ? p : (p as { path: string }).path));
  return readFiles(paths);
}

/** Read OS file paths into ArrayBuffer + name via the fs plugin. */
export async function readFiles(paths: string[]): Promise<LoadedFile[]> {
  const out: LoadedFile[] = [];
  for (const p of paths) {
    try {
      const bytes = await fsReadFile(p);
      // Copy into a fresh ArrayBuffer (pdf.js detaches what it renders).
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      out.push({ buffer, name: await basename(p) });
    } catch {
      // Skip unreadable entries rather than failing the whole batch.
    }
  }
  if (!out.length) throw new Error("Couldn't read the selected file(s).");
  return out;
}

type DragDropHandlers = {
  onOver?: () => void;
  onLeave?: () => void;
  onDrop?: (files: LoadedFile[]) => void;
};

/**
 * Subscribe to OS-level drag/drop on the webview. Returns an unsubscribe fn.
 * Hover state is driven from payload.type "enter"|"over" (Windows fires enter
 * first); a drop reads the carried paths through the fs plugin.
 *
 * Handlers are captured in a ref so callers can pass fresh closures without
 * resubscribing (avoids losing events mid-render churn).
 */
export function onPdfDragDrop(handlers: DragDropHandlers): () => void {
  const ref: { current: DragDropHandlers } = { current: handlers };
  let unlisten: (() => void) | undefined;
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
    .then((u) => (unlisten = u))
    .catch(() => {});

  return () => {
    unlisten?.();
  };
}
