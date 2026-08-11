"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Download, RotateCcw, FileCheck } from "lucide-react"

interface SuccessCardProps {
  fileName: string
  downloadUrl: string
  onReset: () => void
  marksApplied: number
}

export function SuccessCard({ fileName, downloadUrl, onReset, marksApplied }: SuccessCardProps) {
  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = fileName
    a.click()
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border bg-card shadow-lg">
        <div className="flex flex-col items-center gap-6 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#10b981]/20 to-[#10b981]/5 ring-1 ring-[#10b981]/20">
            <CheckCircle2 className="h-8 w-8 text-[#10b981]" />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight">Redaction Complete</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Your PDF has been successfully redacted
            </p>
          </div>

          <div className="w-full rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#10b981]/10">
                <FileCheck className="h-4 w-4 text-[#10b981]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fileName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {marksApplied} redaction{marksApplied !== 1 ? "s" : ""} applied
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={onReset}
              className="flex-1 h-9 text-sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Redact More
            </Button>
            <Button
              onClick={handleDownload}
              className="flex-1 h-9 text-sm bg-[#10b981] hover:bg-[#059669] shadow-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
