"use client"

import * as React from "react"
import { basename } from "@tauri-apps/api/path"
import { getErrorMessage } from "@/lib/utils"
import { savePdfAuto, bytesToB64 } from "@/lib/desktop"
import { useSplitStore } from "@/stores/use-split-store"
import { useRecent } from "@/stores/use-recent-store"
import { DropZone } from "./components/drop-zone"
import { PreviewCanvas } from "./components/preview-canvas"
import { ControlPanel } from "./components/control-panel"
import { SuccessCard } from "@/components/shared/success-card"

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

  // Outputs awaiting save: name + base64 payload (Recent records the path
  // only once something is actually written to disk).
  const [outputs, setOutputs] = React.useState<{ name: string; b64: string }[]>([])

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

      const result = await window.electronAPI?.pdf.split(buffer, file.name, pageRanges, mergeOutput)

      if (!result) throw new Error("Electron API is not available")
      if (!result.success) {
        throw new Error(result.error)
      }

      if (result.isMultiple) {
        setOutputs(result.data.map(f => ({ name: f.name, b64: bytesToB64(f.buffer) })))
      } else {
        setOutputs([{ name: result.fileName, b64: bytesToB64(result.data) }])
      }
      setStep("success")
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to split PDF")
      setStep("split")
    }
  }

  /** Save every output through the desktop adapter; record paths in Recent. */
  const handleSaveOutputs = async (): Promise<string | null> => {
    let last: string | null = null
    for (const out of outputs) {
      const p = await savePdfAuto(out.name, out.b64)
      if (!p) continue
      last = p
      useRecent.getState().add({ toolId: "split", fileName: await basename(p), path: p })
    }
    return last
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
          fileName={outputs.length === 1 ? outputs[0].name : `${outputs.length} documents`}
          downloadUrl="#"
          onReset={reset}
          title="Split Successfully"
          description={
            outputs.length === 1
              ? "Your PDF file has been successfully split."
              : `Split into ${outputs.length} documents — they will be saved one by one.`
          }
          primaryActionText="Save Split PDF"
          secondaryActionText="Split More"
          onSave={handleSaveOutputs}
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
