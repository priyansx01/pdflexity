"use client"

import * as React from "react"
import { useRedactStore } from "@/stores/use-redact-store"
import { Loader2 } from "lucide-react"
import { RedactionOverlay } from "./redaction-overlay"

let pdfjsLib: any = null
let pdfjsLibPromise: Promise<any> | null = null

async function getPdfjsLib() {
  if (pdfjsLib) return pdfjsLib
  if (pdfjsLibPromise) return pdfjsLibPromise
  pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then(lib => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    lib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`
    pdfjsLib = lib
    return lib
  })
  return pdfjsLibPromise
}

export function PDFViewer() {
  const store = useRedactStore()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [loading, setLoading] = React.useState(false)
  const [pdfDoc, setPdfDoc] = React.useState<any>(null)
  const [pageDims, setPageDims] = React.useState<{ width: number; height: number } | null>(null)
  const [containerWidth, setContainerWidth] = React.useState(0)

  React.useEffect(() => {
    if (!store.pdfBytes) return

    let active = true

    const loadPdf = async () => {
      setLoading(true)
      try {
        const lib = await getPdfjsLib()
        const data = new Uint8Array(store.pdfBytes!.slice(0))
        const doc = await lib.getDocument({ data }).promise

        if (!active) return

        const firstPage = await doc.getPage(1)
        const firstVp = firstPage.getViewport({ scale: 1.0 })

        const dims: { width: number; height: number; page: number }[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const pg = await doc.getPage(i)
          const v = pg.getViewport({ scale: 1.0 })
          dims.push({ width: v.width, height: v.height, page: i })
        }

        if (!active) return

        setPdfDoc(doc)
        setPageDims({ width: firstVp.width, height: firstVp.height })

        if (store.totalPages === 0) {
          store.setPageInfo(doc.numPages, dims)
        }

        if (store.step === "loading") {
          store.setStep("loaded")
        }
      } catch (err) {
        console.error("Failed to load PDF:", err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPdf()

    return () => { active = false }
  }, [store.pdfBytes])

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth)
    })
    observer.observe(el)
    setContainerWidth(el.clientWidth)

    return () => observer.disconnect()
  }, [store.pdfBytes])

  React.useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !pageDims || containerWidth <= 0) return

    let active = true

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(store.currentPage)

        if (!active || !canvasRef.current) return

        const canvas = canvasRef.current

        const baseScale = containerWidth / pageDims.width
        const scale = baseScale * store.zoom

        store.setViewerScale(scale)

        const viewport = page.getViewport({ scale })

        const dpr = window.devicePixelRatio || 1
        canvas.width = viewport.width * dpr
        canvas.height = viewport.height * dpr
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        const context = canvas.getContext("2d")
        if (!context) return

        await page.render({
          canvasContext: context,
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        }).promise
      } catch (err) {
        console.error("Failed to render page:", err)
      }
    }

    renderPage()

    return () => { active = false }
  }, [pdfDoc, store.currentPage, store.zoom, pageDims, containerWidth])

  if (!store.pdfBytes) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-auto rounded-xl bg-gradient-to-b from-muted/10 to-muted/20 p-6"
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-full bg-background px-4 py-2 shadow-lg ring-1 ring-border">
            <Loader2 className="h-4 w-4 animate-spin text-[#10b981]" />
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      )}

      {pageDims && (
        <div className="relative rounded-lg bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
          <canvas ref={canvasRef} className="block" />
          <RedactionOverlay pageHeight={pageDims.height} canvasRef={canvasRef} />
        </div>
      )}
    </div>
  )
}
