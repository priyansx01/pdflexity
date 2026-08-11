"use client"

import { motion } from "framer-motion"
import {
  Download, Undo2, Redo2, ZoomIn, ZoomOut, Eye, EyeOff,
  Columns3, PanelLeft, PanelRight, ChevronDown, Globe, ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useOcrStore } from "@/stores/use-ocr-store"
import type { ExportFormat } from "@/features/optimize/ocr/types"
import { useState } from "react"

const exportFormats: { value: ExportFormat; label: string; desc: string }[] = [
  { value: "editable-pdf",   label: "Editable PDF",    desc: "PDF with real text objects" },
  { value: "searchable-pdf", label: "Searchable PDF",   desc: "Original with invisible text layer" },
  { value: "docx",           label: "Word Document",    desc: "DOCX with preserved layout" },
  { value: "json",           label: "JSON Structure",   desc: "Raw OCR data export" },
]

export function WorkspaceHeader({
  onExport,
}: {
  onExport: (format: ExportFormat) => void
}) {
  const {
    uploadedFile, overallConfidence, detectedLanguages,
    zoom, setZoom, showOriginal, showEditable, showIntelligence, togglePanel,
    step,
  } = useOcrStore()
  const [showExportMenu, setShowExportMenu] = useState(false)

  const confidenceColor =
    overallConfidence >= 0.9
      ? "text-emerald-400"
      : overallConfidence >= 0.7
        ? "text-amber-400"
        : "text-red-400"

  const confidenceBg =
    overallConfidence >= 0.9
      ? "bg-emerald-500/10 border-emerald-500/20"
      : overallConfidence >= 0.7
        ? "bg-amber-500/10 border-amber-500/20"
        : "bg-red-500/10 border-red-500/20"

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-12 shrink-0 items-center justify-between border-b border-white/5 bg-card/50 px-4 backdrop-blur-sm"
    >
      {/* Left: File info + confidence */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-sm font-medium text-foreground/90 max-w-[200px] truncate">
            {uploadedFile?.name ?? "Untitled"}
          </span>
        </div>

        {step === "complete" && (
          <>
            {/* Confidence badge */}
            <div className={cn("flex items-center gap-1.5 rounded-md border px-2 py-0.5", confidenceBg)}>
              <ShieldCheck className={cn("h-3 w-3", confidenceColor)} />
              <span className={cn("text-xs font-semibold tabular-nums", confidenceColor)}>
                {Math.round(overallConfidence * 100)}%
              </span>
            </div>

            {/* Language badges */}
            {detectedLanguages.length > 0 && (
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3 text-muted-foreground/50" />
                {detectedLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Center: Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoom(zoom - 25)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[40px] text-center text-xs font-mono tabular-nums text-muted-foreground">
          {zoom}%
        </span>
        <button
          onClick={() => setZoom(zoom + 25)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>

        <div className="mx-2 h-4 w-px bg-white/5" />

        {/* Panel toggles */}
        <button
          onClick={() => togglePanel("original")}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            showOriginal ? "bg-white/5 text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
          title="Toggle original preview"
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => togglePanel("editable")}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            showEditable ? "bg-white/5 text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
          title="Toggle editable canvas"
        >
          <Columns3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => togglePanel("intelligence")}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            showIntelligence ? "bg-white/5 text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
          title="Toggle intelligence panel"
        >
          <PanelRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Right: Export */}
      <div className="flex items-center gap-2">
        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
          >
            <Download className="h-3.5 w-3.5" />
            Export
            <ChevronDown className="h-3 w-3" />
          </button>

          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-white/10 bg-card/95 shadow-2xl backdrop-blur-xl"
              >
                {exportFormats.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => {
                      onExport(fmt.value)
                      setShowExportMenu(false)
                    }}
                    className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="text-xs font-medium text-foreground">{fmt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{fmt.desc}</span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.header>
  )
}
