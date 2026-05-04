"use client"

import * as React from "react"
import { Merge, ShieldCheck, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

import type { MergeState, MergeFile } from "./types"
import { DropZone } from "./components/drop-zone"
import { FileList } from "./components/file-list"
import { SuccessCard } from "./components/success-card"

import { useMergeStore } from "@/stores/use-merge-store"

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export default function MergePdfPage() {
  const store = useMergeStore()

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleFilesAdded(newFiles: File[]) {
    const wrappedFiles: MergeFile[] = newFiles.map(f => ({
      id: generateId(),
      file: f
    }))
    store.addFiles(wrappedFiles)
  }

  function handleRemoveFile(id: string) {
    store.removeFile(id)
  }

  function handleReorder(newFiles: MergeFile[]) {
    store.reorderFiles(newFiles)
  }

  function reset() {
    store.reset()
  }

  // ── Engine Call ─────────────────────────────────────────────────────────

  async function runMerge() {
    if (store.files.length < 2) {
      store.setError("Please select at least two PDF files to merge.")
      return
    }

    store.setStep("loading")

    try {
      // 1. Convert all files to ArrayBuffer and pair with name
      const fileData = await Promise.all(store.files.map(async f => ({
        buffer: await f.file.arrayBuffer(),
        name: f.file.name
      })))

      // 2. Call Electron IPC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI?.pdf
      if (!api?.merge) throw new Error("IPC merge not found — is Electron running?")

      const defaultName = "merged_document.pdf"
      const result = await api.merge(fileData, defaultName)

      if (!result.success) {
        throw new Error(result.error ?? "Merge failed")
      }

      // 3. Convert base64 result to Blob URL
      const binary = atob(result.data)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      store.setResult(url, result.fileName)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      store.setError(msg)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col p-8 pb-4">
      {/* Header */}
      <div className="mb-6 shrink-0 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
          <Merge className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Merge PDF Files</h1>
        <p className="mt-2 text-[15px] text-muted-foreground/70">
          Combine multiple PDFs into a single document. Drag cards to reorder.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {store.step === "success" && store.downloadUrl && store.fileName ? (
          <SuccessCard
            fileName={store.fileName}
            downloadUrl={store.downloadUrl}
            onReset={reset}
          />
        ) : (
          <div className="flex flex-1 flex-col min-h-0 space-y-6">
            {store.files.length === 0 ? (
              <DropZone onFiles={handleFilesAdded} />
            ) : (
              <div className="flex flex-1 flex-col gap-6 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex-1 min-h-0">
                  <FileList
                    files={store.files}
                    onReorder={handleReorder}
                    onRemove={handleRemoveFile}
                    onAddMore={handleFilesAdded}
                  />
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-border/50 pt-4 pb-2">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground/60">
                    <ShieldCheck className="h-4 w-4 text-emerald-500/70" />
                    Processed locally on your device
                  </div>

                  <button
                    onClick={runMerge}
                    disabled={store.step === "loading" || store.files.length < 2}
                    className="group relative overflow-hidden rounded-xl bg-emerald-500 px-8 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <span className="relative flex items-center justify-center gap-2">
                      {store.step === "loading" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Merging PDFs...
                        </>
                      ) : (
                        <>
                          <Merge className="h-4 w-4" />
                          Merge {store.files.length} files
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Error message */}
            {(store.errorMessage || (store.files.length === 1 && store.step !== "success")) && (
              <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20 animate-in fade-in duration-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {store.errorMessage || "Please add at least one more PDF file to merge."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
