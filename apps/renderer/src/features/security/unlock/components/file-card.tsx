"use client"

import { FileText, Lock, LockOpen, X, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileCardProps } from "../types"

export function FileCard({ uploadedFile, onReplace }: FileCardProps) {
  const encrypted = uploadedFile.isEncrypted

  return (
    <div className={cn(
      "group relative flex items-center gap-4 overflow-hidden rounded-2xl p-4",
      "border transition-all duration-300",
      "animate-in fade-in-0 slide-in-from-bottom-3 duration-400",
      encrypted
        ? "border-amber-500/15 bg-amber-500/[0.04] hover:border-amber-500/25 hover:bg-amber-500/[0.07]"
        : "border-green-500/15 bg-green-500/[0.04] hover:border-green-500/25 hover:bg-green-500/[0.07]"
    )}>
      {/* Subtle background gradient */}
      <div className={cn(
        "pointer-events-none absolute inset-0 opacity-40",
        encrypted
          ? "bg-[radial-gradient(ellipse_at_left,rgba(245,158,11,0.08)_0%,transparent_60%)]"
          : "bg-[radial-gradient(ellipse_at_left,rgba(34,197,94,0.08)_0%,transparent_60%)]"
      )} />

      {/* File icon */}
      <div className={cn(
        "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1",
        encrypted
          ? "bg-amber-500/10 ring-amber-500/20"
          : "bg-green-500/10 ring-green-500/20"
      )}>
        <FileText className={cn(
          "h-5 w-5",
          encrypted ? "text-amber-400" : "text-green-400"
        )} />
        {/* Status dot */}
        <div className={cn(
          "absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-background",
          encrypted ? "bg-amber-500/90" : "bg-green-500/90"
        )}>
          {encrypted
            ? <Lock className="h-2.5 w-2.5 text-white" />
            : <LockOpen className="h-2.5 w-2.5 text-white" />
          }
        </div>
      </div>

      {/* Info */}
      <div className="relative min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{uploadedFile.name}</p>
        <div className="mt-1 flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <HardDrive className="h-3 w-3" />
            {uploadedFile.sizeLabel}
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            encrypted
              ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25"
              : "bg-green-500/15 text-green-400 ring-1 ring-green-500/25"
          )}>
            {encrypted ? "🔒 Locked" : "✓ Unlocked"}
          </div>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onReplace}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 transition-all duration-150 hover:bg-white/8 hover:text-foreground"
        aria-label="Remove file"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
