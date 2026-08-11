"use client"

import * as React from "react"
import { FileStack } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropZoneProps {
  onFiles: (files: File[]) => void
}

export function DropZone({ onFiles }: DropZoneProps) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => 
      f.type === "application/pdf" || f.type.startsWith("image/")
    )
    if (dropped.length > 0) onFiles(dropped)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    if (selected.length > 0) onFiles(selected)
    e.target.value = "" // Reset input
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed transition-all duration-300 outline-none",
        "min-h-[300px] w-full px-8 py-10",
        dragging
          ? "scale-[1.01] border-emerald-500 bg-emerald-500/8"
          : "border-border dark:border-white/[0.07] hover:border-emerald-500/40 hover:bg-emerald-500/[0.03]"
      )}
    >
      <div className={cn(
        "flex h-16 w-16 items-center justify-center rounded-2xl ring-1 transition-all duration-300",
        dragging
          ? "bg-emerald-500/20 ring-emerald-500/40 scale-110"
          : "bg-emerald-500/10 ring-emerald-500/20 group-hover:scale-105"
      )}>
        <FileStack className="h-8 w-8 text-emerald-400" />
      </div>

      <div className="text-center space-y-1.5">
        <h3 className={cn(
          "text-lg font-semibold tracking-tight transition-colors",
          dragging ? "text-emerald-400" : "text-foreground"
        )}>
          Drop PDFs here
        </h3>
        <p className="text-sm text-muted-foreground/80 max-w-[280px]">
          Drag and drop PDF or image files, or{" "}
          <span className="font-semibold text-emerald-400 underline-offset-4 group-hover:underline">browse</span>
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
