"use client"

import * as React from "react"
import { FileStack, X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropZonePairProps {
  fileA: File | null
  fileB: File | null
  onFileA: (f: File) => void
  onFileB: (f: File) => void
  onClearA: () => void
  onClearB: () => void
}

function SingleDrop({
  file, label, accent, onFile, onClear, side,
}: {
  file: File | null
  label: string
  accent: string
  onFile: (f: File) => void
  onClear: () => void
  side: "left" | "right"
}) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === "application/pdf") onFile(f)
  }

  if (file) {
    return (
      <div className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-8",
        "bg-muted/20 dark:bg-white/[0.02]",
        side === "left"
          ? "border-blue-500/20 ring-1 ring-blue-500/10"
          : "border-emerald-500/20 ring-1 ring-emerald-500/10"
      )}>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl ring-1",
          side === "left"
            ? "bg-blue-500/10 ring-blue-500/20"
            : "bg-emerald-500/10 ring-emerald-500/20"
        )}>
          <FileStack className={cn("h-5 w-5", side === "left" ? "text-blue-400" : "text-emerald-400")} />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-foreground truncate max-w-[180px]">{file.name}</p>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">
            {(file.size / 1024).toFixed(0)} KB · {label}
          </p>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-muted-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          Replace
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "group relative flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed",
        "min-h-[220px] px-8 py-10 transition-all duration-300 outline-none",
        dragging
          ? cn("scale-[1.01]", accent === "blue"
              ? "border-blue-500 bg-blue-500/8"
              : "border-emerald-500 bg-emerald-500/8")
          : cn("border-border dark:border-white/[0.07]",
              accent === "blue"
                ? "hover:border-blue-500/40 hover:bg-blue-500/[0.03]"
                : "hover:border-emerald-500/40 hover:bg-emerald-500/[0.03]")
      )}
    >
      <div className={cn(
        "flex h-14 w-14 items-center justify-center rounded-xl ring-1 transition-all duration-300",
        dragging
          ? (accent === "blue" ? "bg-blue-500/20 ring-blue-500/40 scale-110" : "bg-emerald-500/20 ring-emerald-500/40 scale-110")
          : (accent === "blue" ? "bg-blue-500/10 ring-blue-500/20 group-hover:scale-105" : "bg-emerald-500/10 ring-emerald-500/20 group-hover:scale-105")
      )}>
        <FileStack className={cn("h-7 w-7", accent === "blue" ? "text-blue-400/80" : "text-emerald-400/80")} />
      </div>
      <div className="text-center">
        <p className={cn(
          "text-[15px] font-semibold tracking-tight transition-colors",
          dragging ? (accent === "blue" ? "text-blue-400" : "text-emerald-400") : "text-foreground/80"
        )}>
          {label}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Drop or{" "}
          <span className={cn(
            "font-medium underline-offset-2 group-hover:underline",
            accent === "blue" ? "text-blue-400" : "text-emerald-400"
          )}>
            browse
          </span>
        </p>
      </div>
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </button>
  )
}

export function DropZonePair({ fileA, fileB, onFileA, onFileB, onClearA, onClearB }: DropZonePairProps) {
  return (
    <div className="flex items-stretch gap-4">
      <SingleDrop file={fileA} label="Original PDF" accent="blue"  side="left"  onFile={onFileA} onClear={onClearA} />

      {/* Divider with VS badge */}
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="h-full w-px bg-border/50 dark:bg-white/[0.06]" />
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.04] text-[11px] font-bold text-muted-foreground/60">
          vs
        </div>
        <div className="h-full w-px bg-border/50 dark:bg-white/[0.06]" />
      </div>

      <SingleDrop file={fileB} label="Modified PDF"  accent="emerald" side="right" onFile={onFileB} onClear={onClearB} />
    </div>
  )
}
