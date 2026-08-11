"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { PageDiff, DiffChange } from "../types"
import { usePdfRenderer } from "../hooks/use-pdf-renderer"
import type { HighlightRect, PageTextItem } from "../hooks/use-pdf-renderer"

// ─── Highlight matching ──────────────────────────────────────────────────────
//
// Walks Go's diff changes and matches them against the pdfjs text items (which
// carry bounding boxes in PDF coordinates).  When a change's text overlaps one
// or more items we collect their rects for painting on the canvas.

function computeHighlightRects(
  textItems: PageTextItem[],
  changes: DiffChange[],
  side: "left" | "right",
): HighlightRect[] {
  if (!textItems.length || !changes.length) return []

  // Build a concatenated string + position map for fuzzy matching
  const map: { start: number; end: number; item: PageTextItem }[] = []
  let pos = 0
  for (const item of textItems) {
    map.push({ start: pos, end: pos + item.str.length, item })
    pos += item.str.length + 1 // +1 for implicit space
  }
  const fullText = textItems.map(t => t.str).join(" ")

  const rects: HighlightRect[] = []
  let cursor = 0

  for (const change of changes) {
    // On the left pane highlight deletions, on the right pane highlight insertions
    const isTarget =
      (side === "left" && change.type === "delete") ||
      (side === "right" && change.type === "insert")

    if (!isTarget) {
      if (change.type === "equal") {
        // Advance cursor to stay in sync
        const idx = fullText.indexOf(change.text, cursor)
        if (idx !== -1) cursor = idx + change.text.length
      }
      continue
    }

    const needle = change.text.trim()
    if (!needle) continue

    // Try to find the text in the concatenated string
    const idx = fullText.indexOf(needle, Math.max(0, cursor - 50))
    if (idx === -1) {
      // Fallback: try a shorter substring match (first 30 chars)
      const short = needle.substring(0, 30)
      const shortIdx = fullText.indexOf(short, Math.max(0, cursor - 50))
      if (shortIdx === -1) continue
      // Match found with shortened text
      const end = shortIdx + short.length
      for (const entry of map) {
        if (entry.end > shortIdx && entry.start < end) {
          rects.push({ x: entry.item.x, y: entry.item.y, w: entry.item.w, h: entry.item.h })
        }
      }
      continue
    }

    const end = idx + needle.length
    cursor = end

    for (const entry of map) {
      if (entry.end > idx && entry.start < end) {
        rects.push({ x: entry.item.x, y: entry.item.y, w: entry.item.w, h: entry.item.h })
      }
    }
  }

  return rects
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PdfViewerProps {
  buffer:      ArrayBuffer | null
  side:        "left" | "right"
  diffs:       PageDiff[]
  currentPage: number
  scale:       number
  mode:        "semantic" | "overlay"
  onLoad:      (numPages: number) => void
  scrollRef:   React.RefObject<HTMLDivElement>
}

export function PdfViewer({
  buffer, side, diffs, currentPage, scale, mode, onLoad, scrollRef,
}: PdfViewerProps) {
  const { loadPdf, renderPage, getPageTextItems, numPages, isLoading, error } = usePdfRenderer()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = React.useState(false)
  const [textItemsCache, setTextItemsCache] = React.useState<Record<number, PageTextItem[]>>({})

  // Render guard — prevents concurrent render() on the same canvas
  const renderingRef = React.useRef(false)
  const renderIdRef  = React.useRef(0)

  // Current page diff
  const pageDiff = diffs.find(d => d.page === currentPage)

  // ── Load PDF ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!buffer) return
    setLoaded(false)
    setTextItemsCache({})
    loadPdf(buffer).then(n => {
      if (n > 0) {
        setLoaded(true)
        onLoad(n)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer])

  // ── Render page with highlights ────────────────────────────────────────────
  React.useEffect(() => {
    if (!loaded || !canvasRef.current) return

    // Increment render ID so stale paints are skipped
    const thisRender = ++renderIdRef.current

    const paint = async () => {
      // Wait for any in-progress render to finish
      if (renderingRef.current) return
      renderingRef.current = true

      try {
        // Bail if a newer render was requested while we waited
        if (thisRender !== renderIdRef.current) return

        const canvas = canvasRef.current!
        let highlightRects: HighlightRect[] = []
        let highlightColor: string | undefined

        if (mode === "overlay" && pageDiff && pageDiff.changes.length > 0) {
          let items = textItemsCache[currentPage]
          if (!items) {
            items = await getPageTextItems(currentPage)
            setTextItemsCache(prev => ({ ...prev, [currentPage]: items }))
          }

          highlightRects = computeHighlightRects(items, pageDiff.changes, side)
          highlightColor = side === "left"
            ? "rgba(239, 68, 68, 0.30)"
            : "rgba(34, 197, 94, 0.30)"
        }

        if (thisRender !== renderIdRef.current) return
        await renderPage(currentPage, canvas, scale, highlightRects, highlightColor)
      } finally {
        renderingRef.current = false
      }
    }

    paint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, currentPage, scale, mode, pageDiff, side])

  // ── Styles ────────────────────────────────────────────────────────────────
  const accentRing = side === "left" ? "ring-blue-500/30" : "ring-emerald-500/30"
  const accentShadow = side === "left"
    ? "shadow-[0_0_40px_rgba(59,130,246,0.08)]"
    : "shadow-[0_0_40px_rgba(16,185,129,0.08)]"

  // ── Empty / error states ──────────────────────────────────────────────────
  if (!buffer) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl ring-1 ring-border/20 bg-muted/5">
        <p className="text-sm text-muted-foreground/30">No PDF loaded</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center gap-2 rounded-xl ring-1 p-6", accentRing)}>
        <p className="text-[13px] font-semibold text-red-400">Failed to load PDF</p>
        <p className="text-[11px] text-muted-foreground/50 text-center max-w-[240px] break-all">{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "relative flex flex-1 flex-col items-center overflow-y-auto rounded-xl ring-1",
        "bg-muted/5 dark:bg-white/[0.015]",
        accentRing, accentShadow,
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
          <div className={cn(
            "h-8 w-8 rounded-full border-2 border-t-transparent animate-spin",
            side === "left" ? "border-blue-400" : "border-emerald-400"
          )} />
        </div>
      )}

      <div className="p-4">
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-xl ring-1 ring-black/10 dark:ring-white/10 max-w-full block"
        />
      </div>

      {loaded && (
        <div className="sticky bottom-3 mb-3 z-10">
          <div className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium",
            "bg-background/80 backdrop-blur-sm ring-1",
            side === "left"
              ? "text-blue-400 ring-blue-500/20"
              : "text-emerald-400 ring-emerald-500/20"
          )}>
            <span className="opacity-60">{side === "left" ? "Original" : "Modified"}</span>
            <span className="opacity-30">·</span>
            <span className="tabular-nums">Page {currentPage} / {numPages}</span>
          </div>
        </div>
      )}
    </div>
  )
}
