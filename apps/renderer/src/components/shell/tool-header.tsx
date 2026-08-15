"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Info } from "lucide-react";
import type { Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

const OVERSHOOT = { type: "spring" as const, stiffness: 500, damping: 22 };

/**
 * ToolHeader — icon tile, title + "{subtitle} · Local engine", capability pills.
 * The icon tile re-mounts per tool with an overshoot scale-in.
 */
export function ToolHeader({ tool }: { tool: Tool | null }) {
  if (!tool) {
    return (
      <header className="flex h-[68px] shrink-0 items-center border-b border-hairline bg-background px-6" />
    );
  }
  const Icon = tool.icon;
  return (
    <header className="grid h-[68px] shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-hairline bg-background px-6">
      <div className="flex min-w-0 items-center gap-3">
        <motion.div
          key={tool.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={OVERSHOOT}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald/25 bg-emerald-soft"
        >
          <Icon className="h-5 w-5 text-emerald" />
        </motion.div>
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-bold leading-tight tracking-[-0.015em]">
            {tool.name}
          </h1>
          <p className="truncate text-[13px] text-muted-foreground">
            {tool.subtitle} · Local engine
          </p>
        </div>
      </div>

      {/* Capability pills — progressively hidden on narrow widths */}
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 lg:flex">
          <Pill>100% local</Pill>
          <Pill>Powered by {tool.engine}</Pill>
          <Pill>{tool.capability}</Pill>
        </div>
        <button
          type="button"
          aria-label={`About ${tool.name}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
