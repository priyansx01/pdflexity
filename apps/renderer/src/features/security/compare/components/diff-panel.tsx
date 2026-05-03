"use client"

import * as React from "react"
import { Search, Layers, AlignLeft, Download, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PageDiff, DiffMode, CompareStats } from "../types"
import { ChangeItem } from "./change-item"

interface DiffPanelProps {
  diffs:       PageDiff[]
  stats:       CompareStats | null
  mode:        DiffMode
  searchQuery: string
  currentPage: number
  onModeChange:   (m: DiffMode) => void
  onSearchChange: (q: string) => void
  onJumpPage:     (p: number) => void
  onDownload:     () => void
}

export function DiffPanel({
  diffs, stats, mode, searchQuery, currentPage,
  onModeChange, onSearchChange, onJumpPage, onDownload,
}: DiffPanelProps) {
  const changed = diffs.filter(d => d.addedChars > 0 || d.deletedChars > 0)
  const filtered = searchQuery.trim()
    ? changed.filter(d =>
        d.changes.some(c => c.text.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : changed

  const currentIdx = filtered.findIndex(d => d.page === currentPage)

  function jumpPrev() {
    const prev = filtered[currentIdx - 1]
    if (prev) onJumpPage(prev.page)
  }
  function jumpNext() {
    const next = filtered[currentIdx + 1]
    if (next) onJumpPage(next.page)
  }

  function downloadReport() {
    onDownload()
  }

  return (
    <div className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-border/60 dark:border-white/[0.07] bg-card dark:bg-white/[0.02] overflow-hidden">

      {/* Mode switcher */}
      <div className="shrink-0 p-3 border-b border-border/50 dark:border-white/[0.05]">
        <div className="flex rounded-xl bg-muted/40 dark:bg-white/[0.04] p-1 gap-1">
          {(["semantic", "overlay"] as DiffMode[]).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-all duration-200",
                mode === m
                  ? "bg-background shadow-sm text-foreground ring-1 ring-border dark:ring-white/[0.07]"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
            >
              {m === "semantic" ? <AlignLeft className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
              {m === "semantic" ? "Semantic Text" : "Content Overlay"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="shrink-0 grid grid-cols-3 divide-x divide-border/50 dark:divide-white/[0.05] border-b border-border/50 dark:border-white/[0.05]">
          <StatCell label="Similarity" value={`${stats.similarity}%`}
            color={stats.similarity > 80 ? "text-emerald-400" : stats.similarity > 50 ? "text-amber-400" : "text-red-400"} />
          <StatCell label="Added"   value={`+${stats.totalAdded}`}   color="text-emerald-400" />
          <StatCell label="Deleted" value={`−${stats.totalDeleted}`} color="text-red-400" />
        </div>
      )}

      {/* Search */}
      <div className="shrink-0 p-3 border-b border-border/50 dark:border-white/[0.05]">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search changes…"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-border dark:border-white/[0.07] bg-muted/30 dark:bg-white/[0.03] py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15 transition-all"
          />
        </div>
      </div>

      {/* Change count + prev/next nav */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50 dark:border-white/[0.05]">
        <span className="text-[12px] font-semibold text-foreground/70">
          {filtered.length} change{filtered.length !== 1 ? "s" : ""}
          {stats && ` · ${stats.changedPages} page${stats.changedPages !== 1 ? "s" : ""}`}
        </span>
        <div className="flex gap-1">
          <button
            onClick={jumpPrev}
            disabled={currentIdx <= 0}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={jumpNext}
            disabled={currentIdx >= filtered.length - 1}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Change list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40">
              <AlignLeft className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-[13px] text-muted-foreground/50 text-center">
              {searchQuery ? "No matches found" : "No changes detected"}
            </p>
          </div>
        ) : (
          filtered.map(d => (
            <ChangeItem
              key={d.page}
              page={d.page}
              changes={d.changes}
              added={d.addedChars}
              deleted={d.deletedChars}
              active={d.page === currentPage}
              onClick={() => onJumpPage(d.page)}
            />
          ))
        )}
      </div>

      {/* Download report */}
      <div className="shrink-0 p-3 border-t border-border/50 dark:border-white/[0.05]">
        <button
          onClick={downloadReport}
          disabled={filtered.length === 0}
          className="group relative w-full overflow-hidden rounded-xl bg-violet-500 py-3 text-sm font-bold text-white transition-all hover:bg-violet-600 hover:shadow-[0_0_30px_rgba(139,92,246,0.45)] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </span>
        </button>
      </div>
    </div>
  )
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center py-2.5 px-1">
      <span className={cn("text-[14px] font-bold tabular-nums", color)}>{value}</span>
      <span className="text-[10px] text-muted-foreground/40 mt-0.5">{label}</span>
    </div>
  )
}
