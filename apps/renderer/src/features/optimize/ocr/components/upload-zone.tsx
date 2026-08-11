"use client"

import { useCallback, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, ScanSearch, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOcrStore } from "@/stores/use-ocr-store"
import type { OCRUploadedFile } from "@/features/optimize/ocr/types"

export function UploadZone({ onFileSelected }: { onFileSelected: () => void }) {
  const { uploadedFile, setUploadedFile } = useOcrStore()
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) return

      const reader = new FileReader()
      reader.onload = () => {
        const uploaded: OCRUploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          buffer: reader.result as ArrayBuffer,
          lastModified: file.lastModified,
        }
        setUploadedFile(uploaded)
      }
      reader.readAsArrayBuffer(file)
    },
    [setUploadedFile]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-400"
          >
            <Sparkles className="h-3 w-3" />
            AI-Powered OCR
          </motion.div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Make Scanned PDFs Editable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a scanned PDF — OCR processes locally on your device for complete privacy.
          </p>
        </div>

        {/* Drop Zone */}
        <motion.div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !uploadedFile && inputRef.current?.click()}
          whileHover={{ scale: uploadedFile ? 1 : 1.005 }}
          whileTap={{ scale: uploadedFile ? 1 : 0.995 }}
          className={cn(
            "relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
            isDragging
              ? "border-emerald-400/60 bg-emerald-500/5 shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]"
              : uploadedFile
                ? "border-emerald-500/30 bg-card/50"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
          )}
        >
          {/* Ambient glow when dragging */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5"
              />
            )}
          </AnimatePresence>

          <div className="relative z-10 flex flex-col items-center gap-4 px-8 py-12">
            <AnimatePresence mode="wait">
              {!uploadedFile ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="relative">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <ScanSearch className="h-8 w-8 text-emerald-400/70" />
                    </div>
                    {/* Pulse ring */}
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-2xl border border-emerald-400/20"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground/80">
                      Drop your scanned PDF here
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      or click to browse • PDF files only
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex w-full items-center gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                    <FileText className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(uploadedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setUploadedFile(null)
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={onFileChange}
            className="hidden"
          />
        </motion.div>

        {/* Start Button */}
        <AnimatePresence>
          {uploadedFile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4"
            >
              <button
                onClick={onFileSelected}
                className="group relative w-full overflow-hidden rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:bg-emerald-400 hover:shadow-emerald-500/30 active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <ScanSearch className="h-4 w-4" />
                  Start OCR Processing
                </span>
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />
              </button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground/60">
                Processing happens entirely on your device • No data leaves your computer
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
