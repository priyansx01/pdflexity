"use client"

import { useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useOcrStore } from "@/stores/use-ocr-store"
import { useOcrPipeline } from "@/features/optimize/ocr/hooks/use-ocr-pipeline"
import { UploadZone } from "@/features/optimize/ocr/components/upload-zone"
import { ProcessingOverlay } from "@/features/optimize/ocr/components/processing-overlay"
import { WorkspaceHeader } from "@/features/optimize/ocr/components/workspace-header"
import { PreviewPanel } from "@/features/optimize/ocr/components/original-preview/preview-panel"
import { CanvasPanel } from "@/features/optimize/ocr/components/editable-canvas/canvas-panel"
import { IntelPanel } from "@/features/optimize/ocr/components/intelligence-panel/intel-panel"
import type { ExportFormat } from "@/features/optimize/ocr/types"

const isProcessing = (step: string) =>
  ["uploading", "rendering", "detecting-layout", "running-ocr", "rebuilding"].includes(step)

export default function OcrPage() {
  const { step, reset } = useOcrStore()
  const { startOcr, cancelOcr, exportResults } = useOcrPipeline()

  const handleFileSelected = useCallback(() => {
    startOcr()
  }, [startOcr])

  const handleExport = useCallback(
    (format: ExportFormat) => {
      exportResults(format)
    },
    [exportResults]
  )

  const handleCancel = useCallback(() => {
    cancelOcr()
    reset()
  }, [cancelOcr, reset])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {/* State 1: Upload */}
        {step === "idle" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <UploadZone onFileSelected={handleFileSelected} />
          </motion.div>
        )}

        {/* State 2: Processing */}
        {isProcessing(step) && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <ProcessingOverlay onCancel={handleCancel} />
          </motion.div>
        )}

        {/* State 3: Error */}
        {step === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 items-center justify-center"
          >
            <ErrorState onReset={reset} />
          </motion.div>
        )}

        {/* State 4: Complete — Workspace */}
        {step === "complete" && (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <WorkspaceHeader onExport={handleExport} />
            <WorkspacePanels />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Three-panel workspace with resizable dividers */
function WorkspacePanels() {
  const { showOriginal, showEditable, showIntelligence } = useOcrStore()

  const visibleCount = [showOriginal, showEditable, showIntelligence].filter(Boolean).length

  if (visibleCount === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground/40">Toggle panels from the toolbar above</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Original Preview */}
      {showOriginal && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "shrink-0 overflow-hidden border-r border-white/5",
            visibleCount === 1 ? "flex-1" : visibleCount === 2 ? "w-1/2" : "w-[28%]"
          )}
        >
          <PreviewPanel />
        </motion.div>
      )}

      {/* Center: Editable Canvas */}
      {showEditable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "overflow-hidden",
            visibleCount === 1 ? "flex-1" : "flex-1"
          )}
        >
          <CanvasPanel />
        </motion.div>
      )}

      {/* Right: Intelligence Panel */}
      {showIntelligence && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "shrink-0 overflow-hidden border-l border-white/5",
            visibleCount === 1 ? "flex-1" : visibleCount === 2 ? "w-1/3" : "w-[24%]"
          )}
        >
          <IntelPanel />
        </motion.div>
      )}
    </div>
  )
}

function ErrorState({ onReset }: { onReset: () => void }) {
  const { errorMessage } = useOcrStore()

  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground">OCR Processing Failed</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {errorMessage || "An unknown error occurred during processing."}
      </p>
      <button
        onClick={onReset}
        className="mt-6 rounded-lg bg-white/5 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
      >
        Try Again
      </button>
    </div>
  )
}
