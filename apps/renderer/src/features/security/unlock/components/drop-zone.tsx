"use client"

import * as React from "react"
import { CloudUpload, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DropZoneProps } from "../types"

export function DropZone({ onFileSelect, isDragging, onDragEnter, onDragLeave }: DropZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    onDragLeave()
    const file = e.dataTransfer.files[0]
    if (file?.type === "application/pdf") onFileSelect(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); onDragEnter() }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border-2 border-dashed",
        "flex flex-col items-center justify-center gap-5 px-8 py-16",
        "transition-all duration-300 ease-out outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#10b981]/60",
        isDragging
          ? "scale-[1.01] border-[#10b981] bg-[#10b981]/8 shadow-[0_0_60px_rgba(16,185,129,0.2),inset_0_0_60px_rgba(16,185,129,0.05)]"
          : "border-border dark:border-white/[0.08] bg-muted/20 dark:bg-white/[0.02] hover:border-[#10b981]/40 hover:bg-[#10b981]/[0.03] hover:shadow-[0_0_40px_rgba(16,185,129,0.1)]"
      )}
    >
      <div className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-500",
        "bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)]",
        isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-50"
      )} />

      <div className="relative">
        <div className={cn(
          "absolute -left-8 -top-4 flex h-8 w-8 items-center justify-center rounded-xl",
          "bg-muted/50 dark:bg-white/5 ring-1 ring-border dark:ring-white/10 backdrop-blur-sm",
          "transition-all duration-500",
          isDragging ? "translate-x-1 -translate-y-1 opacity-100" : "opacity-0 group-hover:opacity-60"
        )}>
          <FileText className="h-4 w-4 text-[#10b981]/70" />
        </div>
        <div className={cn(
          "absolute -right-8 -top-2 flex h-7 w-7 items-center justify-center rounded-lg",
          "bg-muted/50 dark:bg-white/5 ring-1 ring-border dark:ring-white/10 backdrop-blur-sm",
          "transition-all duration-500 delay-75",
          isDragging ? "-translate-x-1 -translate-y-1 opacity-100" : "opacity-0 group-hover:opacity-40"
        )}>
          <FileText className="h-3.5 w-3.5 text-[#34d399]/70" />
        </div>

        <div className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300",
          isDragging
            ? "scale-110 bg-[#10b981]/25 ring-2 ring-[#10b981]/50 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
            : "bg-[#10b981]/10 ring-1 ring-[#10b981]/20 group-hover:bg-[#10b981]/15 group-hover:ring-[#10b981]/35 group-hover:scale-105"
        )}>
          <CloudUpload className={cn(
            "transition-all duration-300",
            isDragging ? "h-9 w-9 text-[#34d399]" : "h-8 w-8 text-[#34d399]/80 group-hover:text-[#34d399]"
          )} />
          <div className={cn(
            "absolute inset-0 rounded-2xl blur-md transition-opacity duration-300 bg-[#10b981]/20",
            isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-70"
          )} />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <p className={cn(
          "text-[15px] font-semibold tracking-tight transition-colors duration-200",
          isDragging ? "text-[#34d399]" : "text-foreground/80 group-hover:text-foreground"
        )}>
          {isDragging ? "Release to upload" : "Drop your PDF here"}
        </p>
        <p className="text-sm text-muted-foreground">
          or{" "}
          <span className="font-medium text-[#34d399] underline-offset-2 group-hover:underline">
            click to browse
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border dark:border-white/8 bg-muted/40 dark:bg-white/[0.04] px-4 py-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
          PDF only · All sizes
        </span>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleChange} />
    </button>
  )
}
