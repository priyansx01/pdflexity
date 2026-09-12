"use client";

/**
 * Disk persistence for workspace sessions. Loaded PDFs (their bytes) and the
 * per-tool options are copied into the app-data `sessions/` folder on quit and
 * restored on launch, so work survives a full quit + reopen — even if the
 * original files were moved or deleted.
 */

import {
  BaseDirectory,
  exists,
  mkdir,
  readFile,
  remove,
  writeFile,
} from "@tauri-apps/plugin-fs";

import type { LoadedFile } from "@/lib/desktop";
import type { OptionValues } from "@/components/canvas/options-panel";

const DIR = "sessions";
const MANIFEST = `${DIR}/manifest.json`;
const AppData = { baseDir: BaseDirectory.AppData } as const;

interface PersistedFile {
  name: string;
  /** app-data-relative path of the copied bytes */
  file: string;
}
type Manifest = Record<string, { files: PersistedFile[]; options: OptionValues }>;

/** Shape a tool session needs to be persisted / restored. */
export interface PersistSession {
  files: LoadedFile[];
  options: OptionValues;
}
export type RestoredSessions = Record<string, PersistSession>;

/** Keep filenames filesystem-safe and free of path separators. */
function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "file.pdf";
}

/**
 * Overwrite the app-data `sessions/` folder with the current in-memory
 * sessions. Sessions with no files are skipped; the folder is cleared first so
 * removed files don't linger. Never throws (best-effort).
 */
export async function saveWorkspace(sessions: RestoredSessions): Promise<void> {
  try {
    if (await exists(DIR, AppData)) {
      await remove(DIR, { ...AppData, recursive: true });
    }
    await mkdir(DIR, { ...AppData, recursive: true });

    const manifest: Manifest = {};
    for (const [toolId, s] of Object.entries(sessions)) {
      if (!s.files.length) continue;
      await mkdir(`${DIR}/${toolId}`, { ...AppData, recursive: true });
      const files: PersistedFile[] = [];
      for (let i = 0; i < s.files.length; i++) {
        const f = s.files[i];
        const rel = `${DIR}/${toolId}/${i}__${sanitize(f.name)}`;
        await writeFile(rel, new Uint8Array(f.buffer), AppData);
        files.push({ name: f.name, file: rel });
      }
      manifest[toolId] = { files, options: s.options };
    }

    await writeFile(MANIFEST, new TextEncoder().encode(JSON.stringify(manifest)), AppData);
  } catch {
    /* best-effort — never block quit on a save failure */
  }
}

/**
 * Read back the persisted sessions. Returns an empty map when nothing is saved
 * or on any error. Buffers are copied into fresh ArrayBuffers (so pdf.js can't
 * detach the stored bytes), mirroring `readFiles` in lib/desktop.ts.
 */
export async function loadWorkspace(): Promise<RestoredSessions> {
  try {
    if (!(await exists(MANIFEST, AppData))) return {};
    const raw = await readFile(MANIFEST, AppData);
    const manifest = JSON.parse(new TextDecoder().decode(raw)) as Manifest;

    const out: RestoredSessions = {};
    for (const [toolId, entry] of Object.entries(manifest)) {
      const files: LoadedFile[] = [];
      for (const pf of entry.files) {
        try {
          const bytes = await readFile(pf.file, AppData);
          const buffer = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(buffer).set(bytes);
          files.push({ buffer, name: pf.name });
        } catch {
          /* skip a file that couldn't be read */
        }
      }
      if (files.length) out[toolId] = { files, options: entry.options };
    }
    return out;
  } catch {
    return {};
  }
}
