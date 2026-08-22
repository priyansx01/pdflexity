"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRecent } from "@/stores/use-recent-store";
import { relativeTime } from "@/lib/relative-time";
import { getTool, type Tool, type ToolGroup } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GROUP_ORDER: ToolGroup[] = ["Organize", "Security", "Optimize"];

export function ToolRail({
  tools,
  activeId,
  onOpenSettings,
}: {
  tools: Tool[];
  activeId: string | null;
  onOpenSettings?: () => void;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <TooltipProvider delay={300}>
      <aside
        className={cn(
          "relative flex shrink-0 flex-col border-r border-hairline bg-rail transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-[256px]"
        )}
      >
        {/* Header: collapse toggle */}
        <div className="flex h-12 items-center px-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand rail" : "Collapse rail"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          {!collapsed && <span className="label-caps ml-2">Tools</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2" aria-label="Tools">
          {GROUP_ORDER.map((group) => (
            <div key={group} className="mb-4">
              {collapsed ? (
                <div className="mx-2 my-2 h-px bg-hairline" aria-hidden />
              ) : (
                <div className="label-caps px-2 pb-1.5">{group}</div>
              )}
              <ul className="space-y-px">
                {tools
                  .filter((t) => t.group === group)
                  .map((t) => (
                    <NavLeaf key={t.id} tool={t} active={t.id === activeId} collapsed={collapsed} />
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Recent (expanded only) — real, persisted, click-to-navigate */}
        {!collapsed && <RecentList />}

        {/* Footer: settings */}
        <div className={cn("border-t border-hairline p-2", collapsed && "flex justify-center")}>
          <SettingsRow collapsed={collapsed} onClick={onOpenSettings} />
        </div>
      </aside>
    </TooltipProvider>
  );
}

function RecentList() {
  const router = useRouter();
  const recent = useRecent((s) => s.recent);
  // Re-render every minute so relative labels stay fresh.
  const [, tick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="px-3 pb-2">
      <div className="label-caps px-1 pb-1.5">Recent</div>
      {recent.length === 0 ? (
        <p className="px-2 py-1.5 text-[11px] text-muted-foreground/60">
          No recent files yet
        </p>
      ) : (
        <ul className="space-y-px">
          {recent.slice(0, 3).map((r) => {
            const tool = getTool(r.toolId);
            return (
              <li key={`${r.toolId}:${r.fileName}`}>
                <button
                  type="button"
                  onClick={() => tool && router.push(tool.href)}
                  disabled={!tool}
                  title={`${tool?.name ?? r.toolId} · ${r.fileName}`}
                  className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-emerald/50"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald/60" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/80">
                    {r.fileName}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground/70">
                    {tool?.name ?? r.toolId} · {relativeTime(r.at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SettingsRow({ collapsed, onClick }: { collapsed: boolean; onClick?: () => void }) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label="Settings"
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-[13px] outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-emerald/50",
        collapsed ? "h-9 w-9 justify-center" : "w-full px-3 py-[7px]",
        "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      )}
    >
      <Settings className="h-[15px] w-[15px] shrink-0" />
      {!collapsed && (
        <>
          <span>Settings</span>
          <span className="ml-auto text-[11px] text-muted-foreground/60">Ctrl+,</span>
        </>
      )}
    </button>
  );

  if (!collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">Settings</TooltipContent>
    </Tooltip>
  );
}

function NavLeaf({ tool, active, collapsed }: { tool: Tool; active: boolean; collapsed: boolean }) {
  const Icon = tool.icon;

  const linkClass = cn(
    "group relative flex items-center gap-2.5 rounded-lg text-[13px] outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-emerald/50",
    collapsed ? "mx-auto h-9 w-9 justify-center" : "px-3 py-[7px]",
    active
      ? "bg-emerald/10 text-foreground"
      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
  );

  const content = (
    <>
      {active && (
        <motion.span
          layoutId="rail-marker"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <Icon className={cn("h-[15px] w-[15px] shrink-0", active ? "text-emerald" : "")} />
      {!collapsed && <span className="relative truncate">{tool.name}</span>}
    </>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger
            render={
              <Link href={tool.href} aria-label={tool.name} className={linkClass}>
                {content}
              </Link>
            }
          />
          <TooltipContent side="right">{tool.name}</TooltipContent>
        </Tooltip>
      </li>
    );
  }
  return (
    <li>
      <Link href={tool.href} className={linkClass}>
        {content}
      </Link>
    </li>
  );
}
