"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";

import { TitleBar } from "./title-bar";
import { ToolRail } from "./tool-rail";
import { ToolHeader } from "./tool-header";
import { StatusStrip } from "./status-strip";
import { CommandPalette } from "./command-palette";
import { TOOLS, getToolByPath, type Tool } from "@/lib/tools";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tool = getToolByPath(pathname);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  // ⌘K / Ctrl+K toggles the palette (preventDefault so it never reaches the
  // webview find bar).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar onOpenPalette={() => setPaletteOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <ToolRail tools={TOOLS} activeId={tool?.id ?? null} />
        <div className="flex min-w-0 flex-1 flex-col">
          <ToolHeader tool={tool} />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          <StatusStrip tool={tool} />
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
    </MotionConfig>
  );
}

export type { Tool };
