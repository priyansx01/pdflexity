"use client"

import * as React from "react"
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw, Link2, Link2Off } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToolbarProps {
  fileA:        File | null
  fileB:        File | null
  currentPage:  number
  totalPages:   number
  scale:        number
  syncScroll:   boolean
  onPagePrev:   () => void
  onPageNext:   () => void
  onZoomIn:     () => void
  onZoomOut:    () => void
  onZoomReset:  () => void
  onSyncToggle: () => void
}

export function Toolbar({
  fileA, fileB, currentPage, totalPages, scale,
  syncScroll, onPagePrev, onPageNext, onZoomIn, onZoomOut, onZoomReset, onSyncToggle,
}: ToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border/60 dark:border-white/[0.07] bg-card dark:bg-white/[0.02] px-4 py-2.5">
      {/* File names */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 ring-1 ring-blue-500/20">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <span className="text-[11px] font-medium text-blue-400 truncate max-w-[120px]">
            {fileA?.name ?? "—"}
          </span>
        </div>
        <div className="h-3 w-px bg-border/50" />
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 ring-1 ring-emerald-500/20">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-medium text-emerald-400 truncate max-w-[120px]">
            {fileB?.name ?? "—"}
          </span>
        </div>
      </div>

      {/* Page nav */}
      <div className="flex items-center gap-1">
        <ToolbarBtn onClick={onPagePrev} disabled={currentPage <= 1}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <span className="min-w-[60px] text-center text-[12px] font-medium tabular-nums text-foreground/70">
          {currentPage} / {totalPages || "—"}
        </span>
        <ToolbarBtn onClick={onPageNext} disabled={currentPage >= totalPages}>
          <ChevronRight className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      <div className="h-4 w-px bg-border/50" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <ToolbarBtn onClick={onZoomOut} disabled={scale <= 0.5}>
          <ZoomOut className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <button
          onClick={onZoomReset}
          className="min-w-[48px] rounded-lg px-2 py-1 text-center text-[12px] font-medium tabular-nums text-foreground/70 transition-colors hover:bg-muted/60"
        >
          {Math.round(scale * 100)}%
        </button>
        <ToolbarBtn onClick={onZoomIn} disabled={scale >= 3}>
          <ZoomIn className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={onZoomReset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      <div className="h-4 w-px bg-border/50" />

      {/* Sync scroll toggle */}
      <button
        onClick={onSyncToggle}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all",
          syncScroll
            ? "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30"
            : "text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground"
        )}
      >
        {syncScroll ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
        Sync
      </button>
    </div>
  )
}

function ToolbarBtn({
  onClick, disabled, children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/60 transition-all hover:bg-muted/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}
