"use client"

import { Download, RotateCcw, Sparkles, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SuccessCardProps } from "../types"

export function SuccessCard({ fileName, downloadUrl, onReset }: SuccessCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-green-500/20",
      "bg-green-500/[0.05] px-8 py-10",
      "animate-in fade-in-0 zoom-in-95 duration-500"
    )}>
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.12)_0%,transparent_65%)]" />
      {/* Top shine line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-400/40 to-transparent" />

      <div className="relative flex flex-col items-center gap-6 text-center">
        {/* Icon ring stack */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* Outer pulse ring */}
          <div className="absolute inset-0 animate-ping rounded-full bg-green-500/15 [animation-duration:2.5s]" />
          <div className="absolute inset-2 rounded-full bg-green-500/10 ring-1 ring-green-500/20" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 ring-2 ring-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <CheckCircle2 className="h-7 w-7 text-green-400" strokeWidth={2} />
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-green-400/70" />
            <h3 className="text-lg font-bold text-foreground tracking-tight">PDF Unlocked!</h3>
            <Sparkles className="h-4 w-4 text-green-400/70" />
          </div>
          <p className="text-sm text-muted-foreground max-w-[320px]">
            <span className="font-semibold text-foreground/80 break-all">{fileName}</span>
            {" "}has been decrypted and is ready to download.
          </p>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2.5">
          <a
            href={downloadUrl}
            download={fileName}
            className={cn(
              "group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-xl px-6 py-3.5",
              "bg-green-600 text-sm font-semibold text-white",
              "transition-all duration-200",
              "hover:bg-green-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]",
              "active:scale-[0.98]"
            )}
          >
            {/* Shine sweep */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Download className="relative h-4 w-4" />
            <span className="relative">Download Unlocked PDF</span>
          </a>

          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-white/5 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Unlock another file
          </button>
        </div>
      </div>
    </div>
  )
}
