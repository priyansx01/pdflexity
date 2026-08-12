"use client"

import * as React from "react"
import { Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DropZoneProps } from "../types"

export function DropZone({ isDragging, inputRef, onDragEnter, onDragLeave, onDrop, onChange }: DropZoneProps) {
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); onDragEnter() }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border-2 border-dashed",
        "flex flex-col items-center justify-center gap-4 px-8 py-12",
        "transition-all duration-300 ease-out outline-none",
        isDragging
          ? "border-[#10b981] bg-[#10b981]/8 scale-[1.01] shadow-[0_0_60px_rgba(16,185,129,0.2)]"
          : "border-border dark:border-white/[0.08] bg-muted/20 dark:bg-white/[0.02] hover:border-[#10b981]/40 hover:bg-[#10b981]/[0.03] hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]"
      )}
    >
      {/* Radial glow */}
      <div className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-500",
        "bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)]",
        isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-50"
      )} />

      {/* Icon */}
      <div className={cn(
        "relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
        isDragging
          ? "bg-[#10b981]/25 ring-2 ring-[#10b981]/50 scale-110 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
          : "bg-[#10b981]/10 ring-1 ring-[#10b981]/20 group-hover:bg-[#10b981]/15 group-hover:scale-105"
      )}>
        <Shield className="h-8 w-8 text-[#34d399]/80" />
      </div>

      {/* Text */}
      <div className="text-center">
        <p className={cn(
          "text-[15px] font-semibold tracking-tight transition-colors duration-200",
          isDragging ? "text-[#34d399]" : "text-foreground/80 group-hover:text-foreground"
        )}>
          {isDragging ? "Release to upload" : "Drop your PDF here"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          or{" "}
          <span className="font-medium text-[#34d399] underline-offset-2 group-hover:underline">
            click to browse
          </span>
        </p>
      </div>

      {/* Badge */}
      <div className="flex items-center gap-2 rounded-full border border-border dark:border-white/8 bg-muted/40 dark:bg-white/[0.04] px-4 py-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
          PDF only · All sizes
        </span>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onChange} />
    </button>
  )
}
