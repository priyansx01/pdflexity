"use client"

import * as React from "react"
import { CheckCircle2, Download, RefreshCw } from "lucide-react"

interface SuccessCardProps {
  fileName: string
  downloadUrl: string
  onReset: () => void
}

export function SuccessCard({ fileName, downloadUrl, onReset }: SuccessCardProps) {
  function handleDownload() {
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = fileName
    a.click()
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.02] p-8 text-center ring-1 ring-emerald-500/10 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Merged Successfully</h2>
        <p className="text-sm text-muted-foreground max-w-[300px]">
          Your PDF files have been combined into a single document.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/30 active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          Save Merged PDF
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-xl bg-muted/50 px-6 py-3 font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
        >
          <RefreshCw className="h-4 w-4" />
          Merge More
        </button>
      </div>
    </div>
  )
}
