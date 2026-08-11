"use client"

import * as React from "react"
import { useRedactStore } from "@/stores/use-redact-store"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function DocumentPanel() {
  const store = useRedactStore()
  const [dragging, setDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = Array.from(e.dataTransfer.files).find(f => 
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    )
    if (file) handleFile(file)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleFile = async (file: File) => {
    const bytes = await file.arrayBuffer()
    store.setPdf(file, bytes)

    try {
      const result = await window.electronAPI?.pdf.redact.info(bytes)
      if (result?.success) {
        store.setPageInfo(result.data.pageCount, result.data.pages)
      } else {
        store.setStep("loaded")
      }
    } catch (err) {
      console.error("Failed to get PDF info:", err)
      store.setStep("loaded")
    }
  }

  const handleClear = () => {
    store.clearPdf()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (store.pdfBytes) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10b981]/10">
              <FileText className="h-4 w-4 text-[#34d399]" />
            </div>
            <span className="text-[13px] font-semibold">PDF File</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear} className="h-6 w-6">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#10b981]/10 ring-1 ring-[#10b981]/20">
            <FileText className="h-4 w-4 text-[#10b981]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{store.pdfFile?.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {store.totalPages} page{store.totalPages !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex h-14 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-all text-xs",
            "border-border/50 hover:border-[#10b981]/50 hover:bg-[#10b981]/[0.03]"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center gap-2">
            <UploadCloud className="h-3.5 w-3.5 opacity-60" />
            <span className="font-medium">Replace PDF</span>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragEnter={() => setDragging(true)}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border-2 border-dashed",
        "flex flex-col items-center justify-center gap-3 px-6 py-8",
        "transition-all duration-300 ease-out outline-none",
        dragging
          ? "border-[#10b981] bg-[#10b981]/8 scale-[1.01] shadow-[0_0_40px_rgba(16,185,129,0.15)]"
          : "border-border/50 bg-muted/10 hover:border-[#10b981]/40 hover:bg-[#10b981]/[0.03]"
      )}
    >
      <div className={cn(
        "pointer-events-none absolute inset-0 transition-opacity duration-500",
        "bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)]",
        dragging ? "opacity-100" : "opacity-0 group-hover:opacity-50"
      )} />

      <div className={cn(
        "relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300",
        dragging
          ? "bg-[#10b981]/25 ring-2 ring-[#10b981]/50 scale-105"
          : "bg-[#10b981]/10 ring-1 ring-[#10b981]/20 group-hover:scale-105"
      )}>
        <div className="absolute inset-0 rounded-xl bg-[#10b981]/10 blur-sm" />
        <svg className="relative h-6 w-6 text-[#34d399]/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <rect x="8" y="12" width="8" height="6" rx="1" fill="currentColor" opacity="0.3" />
        </svg>
      </div>

      <div className="text-center">
        <p className={cn(
          "text-sm font-semibold tracking-tight transition-colors duration-200",
          dragging ? "text-[#34d399]" : "text-foreground/80 group-hover:text-foreground"
        )}>
          {dragging ? "Release to upload" : "Drop PDF here"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          or{" "}
          <span className="font-medium text-[#34d399] underline-offset-2 group-hover:underline">
            browse
          </span>
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </button>
  )
}
