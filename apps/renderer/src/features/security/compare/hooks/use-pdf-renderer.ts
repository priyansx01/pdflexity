"use client"

import { useRef, useState, useCallback } from "react"

// ─── pdfjs singleton (legacy build for Electron compatibility) ────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _lib: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _libPromise: Promise<any> | null = null

async function getPdfjsLib() {
  if (_lib) return _lib
  if (_libPromise) return _libPromise
  _libPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then(lib => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    lib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`
    _lib = lib
    return lib
  })
  return _libPromise
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docRef = useRef<any>(null)
  const [numPages, setNumPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPdf = useCallback(async (buffer: ArrayBuffer): Promise<number> => {
    setIsLoading(true)
    setError(null)
    try {
      const lib = await getPdfjsLib()
      const data = new Uint8Array(buffer.slice(0))
      const doc = await lib.getDocument({ data }).promise
      docRef.current = doc
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
      const page = await docRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.height = viewport.height
      canvas.width = viewport.width

      // 1. Render the PDF page
      await page.render({ canvasContext: ctx, viewport }).promise

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
