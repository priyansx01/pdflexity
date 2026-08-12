"use client"

import { FileCheck, RefreshCw } from "lucide-react"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileRowProps {
  file: File
  onReplace: () => void
}

export function FileRow({ file, onReplace }: FileRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#10b981]/10 ring-1 ring-[#10b981]/20">
        <FileCheck className="h-4 w-4 text-[#34d399]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{file.name}</p>
        <p className="text-[11px] text-muted-foreground/50">{formatBytes(file.size)}</p>
      </div>
      <button
        onClick={onReplace}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-muted/60 hover:text-muted-foreground"
        aria-label="Replace file"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
