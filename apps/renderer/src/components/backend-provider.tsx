"use client";

/**
 * Ensures the Tauri backend adapter (`lib/backend.ts`) is loaded on the client,
 * installing `window.electronAPI` before any feature component reads it. The
 * adapter self-installs at module-load, so importing it here is enough.
 */

import "@/lib/backend";

export function BackendProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
