"use client";

import * as React from "react";
import type { ShellTool } from "./app-shell";

// Stub — Step 7 (ToolHeader) adds the ember icon tile, spring scale-in on tool
// change, capability pills, responsive layout.
export function ToolHeader({ tool }: { tool: ShellTool | null }) {
  if (!tool) {
    return <div className="flex h-[68px] shrink-0 items-center border-b border-hairline bg-background px-6" />;
  }
  const Icon = tool.icon;
  return (
    <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-hairline bg-background px-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-ember/25 bg-ember-soft">
        <Icon className="h-5 w-5 text-ember" />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-[18px] font-bold leading-tight">{tool.name}</h1>
        <p className="truncate text-[13px] text-muted-foreground">
          {tool.subtitle} · Local engine
        </p>
      </div>
    </header>
  );
}
