"use client";

import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

/** Decode a base64 string to bytes. */
export function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Prompt the user for a save location and write the bytes there. Returns the
 * chosen path, or null if cancelled. Never auto-writes next to the source.
 */
export async function saveBytes(
  defaultName: string,
  dataB64: string,
): Promise<string | null> {
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!path) return null;
  await writeFile(path, b64ToBytes(dataB64));
  return path;
}

/** Reveal a saved file in the OS file manager. */
export async function revealSaved(path: string): Promise<void> {
  await revealItemInDir(path);
}
