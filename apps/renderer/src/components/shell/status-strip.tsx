"use client";

import { ShieldCheck } from "lucide-react";
import type { ShellTool } from "./app-shell";

// Stub — Step 8 (StatusStrip) adds Offline capable + canvas state readout.
export function StatusStrip({ tool }: { tool: ShellTool | null }) {
  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-hairline bg-rail px-4 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-ember" />
        <span>File never leaves your device</span>
        {tool && <span className="text-muted-foreground/60">· Engine: {tool.engine}</span>}
      </div>
      <span className="label-caps">Offline capable</span>
    </footer>
  );
}
