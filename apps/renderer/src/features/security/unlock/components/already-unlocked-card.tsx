"use client"

import { Download, RotateCcw, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AlreadyUnlockedCardProps } from "../types"

export function AlreadyUnlockedCard({ fileName, downloadUrl, onReset }: AlreadyUnlockedCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-[#10b981]/20",
      "bg-[#10b981]/[0.05] px-8 py-10",
      "animate-in fade-in-0 zoom-in-95 duration-500"
    )}>
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12)_0%,transparent_65%)]" />
      {/* Top shine */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#34d399]/40 to-transparent" />

      <div className="relative flex flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#10b981]/10 ring-1 ring-[#10b981]/20" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#10b981]/20 ring-2 ring-[#10b981]/35 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="h-7 w-7 text-[#34d399]" strokeWidth={2} />
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Already Unlocked</h3>
          <p className="text-sm text-muted-foreground max-w-[320px]">
            <span className="font-semibold text-foreground/80 break-all">{fileName}</span>
            {" "}has no password protection — you can download it directly.
          </p>
        </div>

        {/* Info chip */}
        <div className="flex items-center gap-2 rounded-full border border-[#10b981]/20 bg-[#10b981]/10 px-4 py-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
          <span className="text-xs font-medium text-[#6ee7b7]/80">No password needed</span>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2.5">
          <a
            href={downloadUrl}
            download={fileName}
            className={cn(
              "group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-xl px-6 py-3.5",
              "bg-[#10b981] text-sm font-semibold text-white",
              "transition-all duration-200",
              "hover:bg-[#059669] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)]",
              "active:scale-[0.98]"
            )}
          >
            {/* Shine sweep */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Download className="relative h-4 w-4" />
            <span className="relative">Download PDF</span>
          </a>

          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-white/5 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try another file
          </button>
        </div>
      </div>
    </div>
  )
}
