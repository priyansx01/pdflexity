"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";

export type LoadedFile = { buffer: ArrayBuffer; name: string };

const PDF_FILTER = { name: "PDF", extensions: ["pdf"] };

/** Open a native file picker (single or multiple PDFs). */
export async function pickPdf(multiple = false): Promise<LoadedFile[] | null> {
  const selected = await open({
    multiple,
    filters: [PDF_FILTER],
  });
  if (!selected) return null;
  const paths = Array.isArray(selected) ? selected : [selected];
  return readFiles(paths.map((p) => (typeof p === "string" ? p : p.path)));
}

/** Read an array of OS file paths into ArrayBuffer + name via the fs plugin. */
import { readFile as fsReadFile } from "@tauri-apps/plugin-fs";
import { basename } from "@tauri-apps/api/path";

async function readFiles(paths: string[]): Promise<LoadedFile[]> {
  const out: LoadedFile[] = [];
  for (const p of paths) {
    const bytes = await fsReadFile(p);
    // readFile returns Uint8Array; copy into a fresh ArrayBuffer.
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    out.push({ buffer, name: await basename(p) });
  }
  return out;
}

/**
 * Subscribe to OS-level drag/drop on the webview. Returns an unsubscribe and
 * calls handlers for hover/leave/drop. `paths` on drop are read into LoadedFile[].
 */
export function onPdfDragDrop(handlers: {
  onOver?: () => void;
  onLeave?: () => void;
  onDrop: (files: LoadedFile[]) => void;
}): () => void {
  let unlisten: (() => void) | undefined;
  let active = false;
  getCurrentWebview()
    .onDragDropEvent(async (event) => {
      const type = event.payload.type;
      if (type === "over") {
        active = true;
        handlers.onOver?.();
      } else if (type === "leave") {
        active = false;
        handlers.onLeave?.();
      } else if (type === "drop") {
        active = false;
        const paths = (event.payload as { paths: string[] }).paths ?? [];
        try {
          const files = await readFiles(paths);
          if (files.length) handlers.onDrop(files);
        } catch {
          /* ignore read errors */
        }
      }
    })
    .then((u) => (unlisten = u))
    .catch(() => {});
  return () => {
    unlisten?.();
    void active;
  };
}
