"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = resolvedTheme === "dark"

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all duration-150 hover:bg-sidebar-accent hover:text-foreground"
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
          {isDark ? <Moon className="h-4 w-4 text-[#34d399]" /> : <Sun className="h-4 w-4 text-amber-500" />}
        </TooltipTrigger>
        <TooltipContent side="right">{isDark ? "Dark mode" : "Light mode"}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className={cn(
      "flex items-center justify-between rounded-xl px-3 py-2.5",
      "bg-muted/40 dark:bg-white/[0.03] ring-1 ring-border dark:ring-white/[0.07]"
    )}>
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "flex h-6 w-6 items-center justify-center rounded-lg",
          isDark ? "bg-[#10b981]/10" : "bg-amber-500/10"
        )}>
          {isDark
            ? <Moon className="h-3.5 w-3.5 text-[#34d399]" />
            : <Sun  className="h-3.5 w-3.5 text-amber-500" />
          }
        </div>
        <span className="text-[12px] font-medium text-muted-foreground">
          {isDark ? "Dark mode" : "Light mode"}
        </span>
      </div>
      <button
        role="switch"
        aria-checked={isDark}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "relative h-5 w-9 rounded-full p-0.5 transition-all duration-300 outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#10b981]/50",
          isDark ? "bg-[#10b981]" : "bg-muted-foreground/20"
        )}
      >
        <span className={cn(
          "block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300",
          isDark ? "translate-x-4" : "translate-x-0"
        )} />
      </button>
    </div>
  )
}
