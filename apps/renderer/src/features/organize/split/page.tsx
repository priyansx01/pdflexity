"use client"

import * as React from "react"
import { useSplitStore } from "@/stores/use-split-store"
import { DropZone } from "./components/drop-zone"
import { PreviewCanvas } from "./components/preview-canvas"
import { ControlPanel } from "./components/control-panel"
import { SuccessCard } from "../merge/components/success-card"

export function SplitPage() {
  const step = useSplitStore(state => state.step)
  const setStep = useSplitStore(state => state.setStep)
  const setFile = useSplitStore(state => state.setFile)
  const reset = useSplitStore(state => state.reset)

  const setError = useSplitStore(state => state.setError)
  const mode = useSplitStore(state => state.mode)
  const ranges = useSplitStore(state => state.ranges)
  const selectedPages = useSplitStore(state => state.selectedPages)
  const mergeOutput = useSplitStore(state => state.mergeOutput)
  const file = useSplitStore(state => state.file)

  const handleSplit = async () => {
    if (!file) return
    setStep("processing")
    setError(null)
    
    try {
      const buffer = await file.arrayBuffer()
      let pageRanges: string[] = []
      
      if (mode === "range") {
        pageRanges = ranges.map(r => r.from === r.to ? `${r.from}` : `${r.from}-${r.to}`)
      } else if (mode === "pages") {
        pageRanges = selectedPages.map(p => `${p}`)
      } else {
        throw new Error("Size mode is not yet implemented.")
      }
      
      const result = await window.electronAPI.pdf.split(buffer, file.name, pageRanges, mergeOutput)
      
      if (!result.success) {
        throw new Error(result.error)
      }
      
      if (result.isMultiple) {
        // Simple fallback: trigger multiple downloads for now,
        // or a ZIP if we want to add JSZip later.
        // For now, downloading them sequentially.
        result.data.forEach((fileObj, index) => {
          setTimeout(() => {
            const blob = new Blob([fileObj.buffer], { type: "application/pdf" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = fileObj.name
            a.click()
            URL.revokeObjectURL(url)
          }, index * 300)
        })
      } else {
        const blob = new Blob([result.data], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = result.fileName
        a.click()
        URL.revokeObjectURL(url)
      }
      
      setStep("success")
    } catch (err: any) {
      setError(err.message || "Failed to split PDF")
      setStep("split")
    }
  }

  if (step === "upload") {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <DropZone onFile={setFile} />
      </div>
    )
  }

  if (step === "success") {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <SuccessCard
          fileName="Split_Documents.pdf"
          downloadUrl="#"
          onReset={reset}
          title="Split Successfully"
          description="Your PDF file has been successfully split."
          primaryActionText="Save Split PDF"
          secondaryActionText="Split More"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      <div className="flex shrink-0 items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Split PDF</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Extract pages, split by range, or split by file size.
          </p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden items-stretch">
        <PreviewCanvas />
        <ControlPanel onSplit={handleSplit} />
      </div>
    </div>
  )
}
