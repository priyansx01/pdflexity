"use client"

import { useRef, useState, useCallback, useEffect } from "react"

// ─── pdfjs singleton (legacy build) ───────────────────────────────────────────
import { getPdfjs, type PdfDocument, type PdfRenderTask } from "@/lib/pdf"

// ─── Types for highlight rectangles ───────────────────────────────────────────

export interface HighlightRect {
  x: number
  y: number
  w: number
  h: number
}

export interface PageTextItem {
  str: string
  x: number
  y: number
  w: number
  h: number
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePdfRenderer() {
    const docRef = useRef<PdfDocument | null>(null)
  const renderTaskRef = useRef<PdfRenderTask | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Destroy the pdf.js document (and cancel any in-flight render) on unmount so
  // the worker transport and cached page/font/image data are released.
  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel()
      docRef.current?.destroy().catch(() => {})
      docRef.current = null
    }
  }, [])

  const loadPdf = useCallback(async (buffer: ArrayBuffer): Promise<number> => {
    setIsLoading(true)
    setError(null)
    try {
      const lib = await getPdfjs()
      const data = new Uint8Array(buffer.slice(0))
      const doc = await lib.getDocument({ data }).promise
      // Release the previously loaded document before replacing it.
      const prev = docRef.current
      docRef.current = doc
      if (prev) await prev.destroy().catch(() => {})
      setNumPages(doc.numPages)
      return doc.numPages
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("[pdfjs] loadPdf error:", msg)
      setError(msg)
      return 0
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Render a page to canvas, then paint highlight rectangles over matching text.
   * highlightRects is an array of {x, y, w, h} in PDF-space coordinates — we
   * transform them through the viewport to canvas-space.
   */
  const renderPage = useCallback(async (
    pageNum: number,
    canvas: HTMLCanvasElement,
    scale: number,
    highlightRects?: HighlightRect[],
    highlightColor?: string,
  ): Promise<void> => {
    if (!docRef.current) return
    try {
      // Cancel any render still in flight on this canvas before starting another.
      renderTaskRef.current?.cancel()

      const page = await docRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.height = viewport.height
      canvas.width = viewport.width

      // 1. Render the PDF page
      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task
      await task.promise

      // 2. Paint highlights on top
      if (highlightRects && highlightRects.length > 0 && highlightColor) {
        ctx.save()
        ctx.fillStyle = highlightColor
        ctx.globalCompositeOperation = "multiply"

        for (const rect of highlightRects) {
          // PDF coords → canvas coords through viewport transform
          // viewport.transform = [scaleX, 0, 0, -scaleY, 0, height]
          const t = viewport.transform
          const cx = t[0] * rect.x + t[4]
          const cy = t[3] * rect.y + t[5]
          const cw = rect.w * t[0]
          const ch = Math.abs(rect.h * t[3])

          ctx.fillRect(cx, cy - ch, cw, ch)
        }
        ctx.restore()
      }
    } catch (err) {
      // A cancelled render (dep change / unmount) is expected, not an error.
      if ((err as { name?: string })?.name === "RenderingCancelledException") return
      console.error("[pdfjs] renderPage error:", err)
    }
  }, [])

  /**
   * Extract text items with their bounding boxes from a page.
   * Returns items with PDF-coordinate positions for highlight matching.
   */
  const getPageTextItems = useCallback(async (pageNum: number): Promise<PageTextItem[]> => {
    if (!docRef.current) return []
    try {
      const page = await docRef.current.getPage(pageNum)
      const content = await page.getTextContent()
            return content.items
        .filter((item: { str?: string }) => item.str && item.str.trim())
        .map((item: { str: string; transform: number[]; width: number; height: number }) => ({
          str: item.str,
          x: item.transform[4],     // translateX
          y: item.transform[5],     // translateY
          w: item.width,
          h: item.height,
        }))
    } catch {
      return []
    }
  }, [])

  return { loadPdf, renderPage, getPageTextItems, numPages, isLoading, error }
}
