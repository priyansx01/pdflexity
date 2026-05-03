"use client"

import { cn } from "@/lib/utils"
import type { DiffChange } from "../types"

interface ChangeItemProps {
  page:    number
  changes: DiffChange[]
  added:   number
  deleted: number
  active?: boolean
  onClick: () => void
}

export function ChangeItem({ page, changes, added, deleted, active, onClick }: ChangeItemProps) {
  const edits = changes.filter(c => c.type !== "equal")
  if (edits.length === 0) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full rounded-xl border p-3.5 text-left transition-all duration-200",
        active
          ? "border-violet-500/30 bg-violet-500/[0.08] ring-1 ring-violet-500/20"
          : "border-border/50 dark:border-white/[0.06] bg-muted/20 dark:bg-white/[0.02] hover:border-violet-500/20 hover:bg-violet-500/[0.04]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className={cn(
          "text-[11px] font-bold uppercase tracking-widest",
          active ? "text-violet-400" : "text-muted-foreground/50 group-hover:text-muted-foreground"
        )}>
          Page {page}
        </span>
        <div className="flex items-center gap-1.5">
          {added > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
              +{added}
            </span>
          )}
          {deleted > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-500/20">
              −{deleted}
            </span>
          )}
        </div>
      </div>

      {/* Inline diff preview */}
      <p className="line-clamp-3 text-[12px] leading-5 text-muted-foreground/70">
        {changes.map((c, i) => (
          <span
            key={i}
            className={cn(
              c.type === "insert" ? "bg-emerald-500/20 text-emerald-300 rounded px-0.5"
              : c.type === "delete" ? "bg-red-500/20 text-red-300 rounded px-0.5 line-through"
              : ""
            )}
          >
            {c.text}
          </span>
        ))}
      </p>
    </button>
  )
}
