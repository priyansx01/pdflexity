"use client";

import { ShieldCheck, WifiOff } from "lucide-react";
import type { Tool } from "@/lib/tools";
import { useCanvasState } from "@/stores/use-canvas-state";
import { cn } from "@/lib/utils";

const STATE_COLOR: Record<string, string> = {
  IDLE: "text-muted-foreground",
  LOADED: "text-foreground",
  RUNNING: "text-ember",
  COMPLETE: "text-ember",
};

export function StatusStrip({ tool }: { tool: Tool | null }) {
  const state = useCanvasState((s) => s.state);

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-hairline bg-rail px-4 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-ember" />
        <span>File never leaves your device</span>
        {tool && <span className="text-muted-foreground/60">· Engine: {tool.engine}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 sm:flex">
          <WifiOff className="h-3 w-3" />
          Offline capable
        </span>
        <span className="h-3 w-px bg-hairline" aria-hidden />
        <span
          className={cn(
            "font-display text-[11px] font-medium uppercase tracking-[0.14em]",
            STATE_COLOR[state] ?? "text-muted-foreground"
          )}
        >
          {state}
        </span>
      </div>
    </footer>
  );
}
