"use client"

import { Lock, Download } from "lucide-react"

interface SuccessCardProps {
  fileName: string
  downloadUrl: string
  onReset: () => void
}

export function SuccessCard({ fileName, downloadUrl, onReset }: SuccessCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#10b981]/20 bg-[#10b981]/[0.05] px-8 py-10 text-center animate-in fade-in-0 zoom-in-95 duration-400">
      {/* Top line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#34d399]/40 to-transparent" />
      {/* Radial bloom */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.12)_0%,transparent_65%)]" />

      {/* Pulsing lock icon */}
      <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#10b981]/10 ring-1 ring-[#10b981]/20 animate-ping [animation-duration:2s]" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#10b981]/20 ring-2 ring-[#10b981]/35 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <Lock className="h-7 w-7 text-[#34d399]" strokeWidth={2} />
        </div>
      </div>

      <h2 className="text-lg font-bold text-foreground">PDF Protected!</h2>
      <p className="mt-1 text-sm text-muted-foreground/60">AES-256 encryption applied successfully</p>
      <p className="mt-3 truncate text-[12px] font-medium text-[#34d399]/70">{fileName}</p>

      {/* Download button with shine sweep */}
      <a
        href={downloadUrl}
        download={fileName}
        className="group relative mt-6 inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-[#10b981] px-6 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:bg-[#059669] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] active:scale-[0.99]"
      >
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <Download className="h-4 w-4" />
        Download Protected PDF
      </a>

      <button
        onClick={onReset}
        className="mt-3 w-full rounded-xl py-2.5 text-sm text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-muted-foreground"
      >
        Protect another PDF
      </button>
    </div>
  )
}
