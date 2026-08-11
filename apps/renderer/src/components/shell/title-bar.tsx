"use client";

// Stub — Step 5 (TitleBar) fills this in: drag region, workspace name,
// ⌘K search pill, window controls (minimize/maximize/close).
export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex h-10 shrink-0 items-center bg-rail px-3 text-muted-foreground"
    >
      <span className="label-caps">PDFLEXITY</span>
    </div>
  );
}
