"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { TitleBar } from "./title-bar";
import { ToolRail } from "./tool-rail";
import { ToolHeader } from "./tool-header";
import { StatusStrip } from "./status-strip";
import { TOOLS, getToolByPath, type Tool } from "@/lib/tools";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tool = getToolByPath(pathname);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <ToolRail tools={TOOLS} activeId={tool?.id ?? null} />
        <div className="flex min-w-0 flex-1 flex-col">
          <ToolHeader tool={tool} />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          <StatusStrip tool={tool} />
        </div>
      </div>
    </div>
  );
}

export type { Tool };
