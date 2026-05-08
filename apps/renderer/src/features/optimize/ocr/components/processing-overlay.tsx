"use client"

import { motion } from "framer-motion"
import { ScanSearch, FileText, LayoutGrid, Cpu, Layers, CheckCircle2, Loader2, X } from "lucide-react"
import { useOcrStore } from "@/stores/use-ocr-store"
import type { OCRStep } from "@/features/optimize/ocr/types"

const pipelineStages: { step: OCRStep; label: string; icon: React.ElementType; description: string }[] = [
  { step: "uploading",        label: "Uploading",          icon: FileText,    description: "Reading PDF file..." },
  { step: "rendering",        label: "Rendering Pages",    icon: Layers,      description: "Converting pages to images..." },
  { step: "detecting-layout", label: "Layout Detection",   icon: LayoutGrid,  description: "Analyzing document structure..." },
  { step: "running-ocr",      label: "Running OCR",        icon: ScanSearch,  description: "Extracting text with PaddleOCR..." },
  { step: "rebuilding",       label: "Rebuilding Document",icon: Cpu,         description: "Reconstructing editable layer..." },
]

function getStageIndex(step: OCRStep): number {
  return pipelineStages.findIndex((s) => s.step === step)
}

export function ProcessingOverlay({ onCancel }: { onCancel: () => void }) {
  const { step, currentPage, totalPages } = useOcrStore()
  const activeIndex = getStageIndex(step)
  const progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0

  return (
    <div className="flex h-full w-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg"
      >
        {/* Background glow */}
        <div className="absolute inset-0 -z-10 rounded-3xl bg-emerald-500/5 blur-3xl" />

        <div className="overflow-hidden rounded-2xl border border-white/5 bg-card/80 backdrop-blur-xl">
          {/* Header */}
          <div className="border-b border-white/5 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10"
                  >
                    <ScanSearch className="h-5 w-5 text-emerald-400" />
                  </motion.div>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Processing Document</h2>
                  <p className="text-xs text-muted-foreground">
                    {totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : "Initializing..."}
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Pipeline Stages */}
          <div className="px-6 py-5">
            <div className="space-y-1">
              {pipelineStages.map((stage, index) => {
                const isActive = index === activeIndex
                const isComplete = index < activeIndex
                const isPending = index > activeIndex

                return (
                  <motion.div
                    key={stage.step}
                    initial={false}
                    animate={{
                      opacity: isPending ? 0.35 : 1,
                    }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                  >
                    {/* Status icon */}
                    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                      {isComplete ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </motion.div>
                      ) : isActive ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-5 w-5 text-emerald-400" />
                        </motion.div>
                      ) : (
                        <stage.icon className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${isActive ? "text-foreground" : isComplete ? "text-foreground/60" : "text-muted-foreground/40"}`}>
                        {stage.label}
                      </p>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-muted-foreground"
                        >
                          {stage.description}
                        </motion.p>
                      )}
                    </div>

                    {/* Checkmark for completed */}
                    {isComplete && (
                      <span className="text-[10px] font-medium text-emerald-400/60">Done</span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Progress Bar */}
          {totalPages > 0 && (
            <div className="border-t border-white/5 px-6 py-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Overall progress</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
