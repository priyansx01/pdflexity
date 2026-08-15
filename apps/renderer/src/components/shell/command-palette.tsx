"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { TOOLS, TOOL_GROUPS } from "@/lib/tools";
import { cn } from "@/lib/utils";

/**
 * ⌘K / Ctrl+K command palette listing every tool grouped like the rail.
 * Selecting navigates and resets the canvas (the route change resets WorkCanvas).
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      onKeyDown={(e) => {
        if (e.key === "Escape") onOpenChange(false);
      }}
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      <Command
        loop
        label="Find a tool"
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-xl border border-hairline bg-surface shadow-(--shadow-float)",
          "flex flex-col"
        )}
      >
        <Command.Input
          autoFocus
          placeholder="Find a tool…"
          className="border-b border-hairline bg-transparent px-4 py-3 text-[14px] outline-none placeholder:text-muted-foreground/60"
        />
        <Command.List className="max-h-[50vh] overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-[13px] text-muted-foreground">
            No tools found.
          </Command.Empty>

          {TOOL_GROUPS.map((group) => {
            const items = TOOLS.filter((t) => t.group === group);
            if (!items.length) return null;
            return (
              <Command.Group key={group} heading={group} className="mb-1">
                {items.map((t) => {
                  const Icon = t.icon;
                  return (
                    <Command.Item
                      key={t.id}
                      value={`${t.name} ${t.subtitle}`}
                      onSelect={() => go(t.href)}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground data-[selected=true]:bg-emerald/12 data-[selected=true]:text-foreground"
                    >
                      <Icon className="h-4 w-4 text-emerald" />
                      <span className="flex-1 truncate text-foreground">{t.name}</span>
                      <span className="truncate text-[11px] text-muted-foreground/70">{t.subtitle}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            );
          })}
        </Command.List>
      </Command>
    </div>
  );
}
