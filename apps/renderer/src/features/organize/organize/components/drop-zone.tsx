import * as React from "react"
import { UploadCloud, FilePlus2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DropZoneProps {
  onFiles: (files: File[]) => void
  isCompact?: boolean
}

export function DropZone({ onFiles, isCompact }: DropZoneProps) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => 
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    )
    if (dropped.length > 0) onFiles(dropped)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    if (selected.length > 0) onFiles(selected)
  }

  if (isCompact) {
    return (
      <div
        className={cn(
          "flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-all",
          dragging
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
            : "border-sidebar-border bg-sidebar hover:border-emerald-500/50 hover:bg-emerald-500/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex items-center gap-3">
          <FilePlus2 className="h-5 w-5 opacity-70" />
          <span className="text-sm font-medium">Add more PDFs...</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group relative flex min-h-[400px] w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300",
        dragging
          ? "scale-[1.02] border-emerald-500 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10"
          : "border-muted-foreground/20 bg-background/50 hover:border-emerald-500/50 hover:bg-emerald-500/5"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <div className="rounded-full bg-emerald-500/10 p-5 ring-1 ring-emerald-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:bg-emerald-500/20">
          <UploadCloud className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            Drop PDFs to Organize
          </h3>
          <p className="text-sm text-muted-foreground/80 max-w-[280px]">
            Drag and drop your PDF files here, or{" "}
            <span className="font-semibold text-emerald-400 underline-offset-4 group-hover:underline">browse</span>
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
