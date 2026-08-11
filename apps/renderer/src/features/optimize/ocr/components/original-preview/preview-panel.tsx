"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { RotateCw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOcrStore } from "@/stores/use-ocr-store"
import { ScrollArea } from "@/components/ui/scroll-area"

export function PreviewPanel() {
  const { pageResults, pageImages, activePage, setActivePage, zoom, totalPages } = useOcrStore()
  const totalPagesCount = Math.max(pageResults.size, totalPages)
  const pageImageSrc = pageImages.get(activePage)

  return (
    <div className="flex h-full flex-col">
      {/* Panel Header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/5 px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Original
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActivePage(Math.max(1, activePage - 1))}
            disabled={activePage <= 1}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[50px] text-center text-[11px] font-mono tabular-nums text-muted-foreground">
            {activePage} / {totalPagesCount || "–"}
          </span>
          <button
            onClick={() => setActivePage(Math.min(totalPagesCount, activePage + 1))}
            disabled={activePage >= totalPagesCount}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Thumbnails + Main Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail strip */}
        {totalPagesCount > 1 && (
          <ScrollArea className="w-16 shrink-0 border-r border-white/5 bg-black/10">
            <div className="flex flex-col gap-1.5 p-1.5">
              {Array.from({ length: totalPagesCount }, (_, i) => i + 1).map((pageNum) => {
                const thumbImage = pageImages.get(pageNum)
                const isActive = pageNum === activePage
                return (
                  <button
                    key={pageNum}
                    onClick={() => setActivePage(pageNum)}
                    className={cn(
                      "group relative flex aspect-[0.7] w-full items-center justify-center overflow-hidden rounded-md border transition-all",
                      isActive
                        ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                        : "border-white/5 hover:border-white/15"
                    )}
                  >
                    {thumbImage ? (
                      <img
                        src={`data:image/png;base64,${thumbImage}`}
                        alt={`Page ${pageNum}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/[0.02]">
                        <span className="text-[9px] font-medium text-muted-foreground/30">
                          {pageNum}
                        </span>
                      </div>
                    )}
                    {/* Page number overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5">
                      <span className="text-[8px] font-medium text-white/80">{pageNum}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {/* Main page preview */}
        <ScrollArea className="flex-1">
          <div className="flex min-h-full items-start justify-center p-4">
            {pageImageSrc ? (
              <motion.div
                key={activePage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="relative overflow-hidden rounded-lg border border-white/5 shadow-2xl"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
              >
                <img
                  src={`data:image/png;base64,${pageImageSrc}`}
                  alt={`Page ${activePage}`}
                  className="block max-w-full"
                  draggable={false}
                />
              </motion.div>
            ) : (
              <div className="flex aspect-[0.7] w-full max-w-sm items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.03]">
                    <RotateCw className="h-4 w-4 animate-spin text-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground/40">
                    {pageResults.size > 0 ? "Rendering..." : "Waiting for OCR..."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
