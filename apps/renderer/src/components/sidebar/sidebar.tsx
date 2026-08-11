"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight, Merge, Scissors, ListOrdered,
  ScanLine, PenTool, LockOpen, Shield, FileStack, EyeOff,
  Minimize2, Wrench, ScanSearch, PanelLeftClose, PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ThemeToggle } from "@/components/theme-toggle"

type NavItem  = { label: string; href: string; icon: React.ElementType }
type NavGroup = { title: string; icon: React.ElementType; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    title: "Organize", icon: ListOrdered,
    items: [
      { label: "Merge PDF",    href: "/organize/merge",    icon: Merge       },
      { label: "Split PDF",    href: "/organize/split",    icon: Scissors    },
      { label: "Organize PDF", href: "/organize/organize", icon: ListOrdered },
    ],
  },
  {
    title: "Security", icon: Shield,
    items: [
      { label: "Sign PDF",    href: "/security/sign",    icon: PenTool  },
      { label: "Unlock PDF",  href: "/security/unlock",  icon: LockOpen },
      { label: "Protect PDF", href: "/security/protect", icon: Shield   },
      { label: "Compare PDF", href: "/security/compare", icon: FileStack},
      { label: "Redact PDF",  href: "/security/redact",  icon: EyeOff   },
    ],
  },
  {
    title: "Optimize", icon: Wrench,
    items: [
      { label: "Compress PDF", href: "/optimize/compress", icon: Minimize2  },
      { label: "Repair PDF",   href: "/optimize/repair",   icon: Wrench     },
      { label: "OCR PDF",      href: "/optimize/ocr",      icon: ScanSearch },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const [activeGroup, setActiveGroup] = React.useState("Security")

  return (
    <TooltipProvider delay={300}>
      <aside className={cn(
        "relative flex h-screen flex-col transition-all duration-300 ease-in-out",
        "border-r border-sidebar-border",
        "bg-sidebar dark:bg-[linear-gradient(180deg,#0B0F14_0%,#0d1120_50%,#111827_100%)]",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}>
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-20 h-64 bg-[#10b981]/[0.06] dark:bg-[#10b981]/[0.04] blur-3xl" />

        {/* Electron drag region */}
        <div className="app-drag h-8 w-full shrink-0" />

        {/* Brand */}
        {!collapsed && (
          <div className="flex shrink-0 items-center justify-between px-3 pb-4 ml-2">
            <span className="truncate text-[22px] font-bold text-sidebar-foreground tracking-[0.1em]">
              pdflexity
            </span>
          </div>
        )}

        {collapsed && (
          <div className="flex shrink-0 items-center justify-center py-4">
            <span className="text-[22px] font-bold text-sidebar-foreground tracking-[0.1em]">P</span>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 overflow-hidden px-3">
          <nav className="space-y-1 pb-4" aria-label="Main navigation">
            {navGroups.map((group) => (
              <NavGroup
                key={group.title}
                group={group}
                collapsed={collapsed}
                pathname={pathname}
                onActivate={() => setActiveGroup(group.title)}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className={cn(
          "shrink-0 border-t border-sidebar-border p-3",
          collapsed ? "flex flex-col items-center gap-2" : "space-y-2"
        )}>
          <ThemeToggle collapsed={collapsed} />
          <Tooltip>
            <TooltipTrigger
              onClick={() => setCollapsed(!collapsed)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed
                ? <PanelLeftOpen className="h-4 w-4" />
                : <PanelLeftClose className="h-4 w-4" />
              }
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}

function NavGroup({ group, collapsed, pathname, onActivate }: {
  group: NavGroup; collapsed: boolean; pathname: string; onActivate: () => void
}) {
  const hasActiveChild = group.items.some((item) => pathname === item.href)
  const [open, setOpen] = React.useState(true)
  const GroupIcon = group.icon

  if (collapsed) {
    return (
      <div className="space-y-1">
        <div className="mx-1 my-3 h-px bg-sidebar-border" />
        {group.items.map((item) => (
          <NavLeaf key={item.href} item={item} active={pathname === item.href} collapsed />
        ))}
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        onClick={onActivate}
        className={cn(
          "group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] transition-all duration-150",
          hasActiveChild
            ? "text-[#34d399]"
            : "text-muted-foreground/50 hover:text-foreground/70"
        )}
      >
        <div className="flex items-center gap-2">
          <GroupIcon className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            hasActiveChild
              ? "text-[#34d399]"
              : "text-muted-foreground/40 group-hover:text-muted-foreground/70"
          )} />
          <span>{group.title}</span>
        </div>
        <ChevronRight className={cn(
          "h-3 w-3 shrink-0 text-muted-foreground/20 transition-transform duration-200",
          open && "rotate-90"
        )} />
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden">
        <div className="ml-[6px] space-y-px pt-1 pb-1">
          {group.items.map((item) => (
            <NavLeaf key={item.href} item={item} active={pathname === item.href} collapsed={false} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function NavLeaf({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon

  const inner = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg text-[13px] transition-all duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#10b981]/50",
        collapsed ? "h-9 w-9 justify-center mx-auto" : "px-3 py-[7px]",
        active
          ? "bg-[#10b981]/10 text-foreground"
          : "text-foreground/60 hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-[#10b981]" />
      )}
      <Icon className={cn(
        "relative shrink-0 h-[14px] w-[14px] transition-colors duration-150",
        active ? "text-[#34d399]" : "text-muted-foreground/40 group-hover:text-foreground/60"
      )} />
      {!collapsed && <span className="relative truncate font-normal">{item.label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>{inner}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return inner
}
