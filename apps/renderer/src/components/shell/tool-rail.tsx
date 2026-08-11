"use client";

import * as React from "react";
import Link from "next/link";
import type { ShellTool, ToolGroup } from "./app-shell";
import { cn } from "@/lib/utils";

// Stub — Step 6 (ToolRail) adds group headers, collapse, the shared-layoutId
// ember active marker, Recent list, theme toggle.
const GROUP_ORDER: ToolGroup[] = ["Organize", "Security", "Optimize"];

export function ToolRail({ tools, activeId }: { tools: ShellTool[]; activeId: string | null }) {
  return (
    <aside className="flex w-[256px] shrink-0 flex-col border-r border-hairline bg-rail">
      <nav className="flex-1 overflow-y-auto p-2" aria-label="Tools">
        {GROUP_ORDER.map((group) => (
          <div key={group} className="mb-3">
            <div className="label-caps px-2 py-1.5">{group}</div>
            <ul className="space-y-px">
              {tools
                .filter((t) => t.group === group)
                .map((t) => {
                  const Icon = t.icon;
                  const active = t.id === activeId;
                  return (
                    <li key={t.id}>
                      <Link
                        href={t.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13px] transition-colors",
                          active
                            ? "bg-ember/12 text-foreground"
                            : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("h-[15px] w-[15px]", active ? "text-ember" : "")} />
                        <span className="truncate">{t.name}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
