"use client"

import * as React from "react"
import { useSignStore } from "@/stores/use-sign-store"
import { Loader2 } from "lucide-react"

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
  const store = useSignStore()
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

        if (store.totalPages === 0) {
          store.setTotalPages(doc.numPages)
        }

        const firstPage = await doc.getPage(1)
        const vp = firstPage.getViewport({ scale: 1.0 })

        if (!active) return

        setPdfDoc(doc)
        setPageDims({ width: vp.width, height: vp.height })
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

        const scale = (containerWidth - 48) / pageDims.width
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
  }, [pdfDoc, store.currentPage, pageDims, containerWidth])

  if (!store.pdfBytes) {
    return null
  }

  return (
    <div ref={containerRef} className="relative flex h-full w-full flex-col items-center justify-center overflow-auto bg-background/50 p-8">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {pageDims && (
        <div className="relative shadow-2xl ring-1 ring-border/50 bg-white">
          <canvas ref={canvasRef} className="block max-w-full" />
          <SignatureOverlay canvasRef={canvasRef} pageDims={pageDims} />
        </div>
      )}
    </div>
  )
}

import { Rnd } from "react-rnd"

function SignatureOverlay({ canvasRef, pageDims }: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  pageDims: { width: number; height: number } | null
}) {
  const store = useSignStore()
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const [containerScale, setContainerScale] = React.useState(1)

  React.useEffect(() => {
    if (!canvasRef.current || !pageDims) return

    const canvas = canvasRef.current
    const syncScale = () => {
      const rect = canvas.getBoundingClientRect()
      setContainerScale(rect.width / pageDims.width)
    }

    syncScale()
    const observer = new MutationObserver(syncScale)
    observer.observe(canvas, { attributes: true, attributeFilter: ["style", "width", "height"] })

    window.addEventListener("resize", syncScale)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncScale)
    }
  }, [canvasRef, pageDims])

  if (!store.signatureZone || store.signatureZone.page !== store.currentPage || !pageDims) return null

  return (
    <div ref={overlayRef} className="absolute left-0 top-0" style={{ pointerEvents: "none" }}>
      <Rnd
        className="border-2 border-dashed border-indigo-500 bg-indigo-500/20 flex items-center justify-center group"
        size={{
          width: store.signatureZone.width * containerScale,
          height: store.signatureZone.height * containerScale,
        }}
        position={{
          x: store.signatureZone.x * containerScale,
          y: store.signatureZone.y * containerScale,
        }}
        onDragStop={(e, d) => {
          store.setSignatureZone({
            ...store.signatureZone!,
            x: d.x / containerScale,
            y: d.y / containerScale,
          })
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          store.setSignatureZone({
            ...store.signatureZone!,
            width: parseInt(ref.style.width) / containerScale,
            height: parseInt(ref.style.height) / containerScale,
            ...position,
          })
        }}
        bounds="parent"
      >
        <span className="text-indigo-700 dark:text-indigo-300 font-medium text-sm px-2 text-center pointer-events-none select-none">
          Signature Zone
        </span>
        <div className="absolute -top-3 -right-3 hidden group-hover:flex h-6 w-6 items-center justify-center bg-indigo-500 text-white rounded-full cursor-pointer shadow-sm"
             onClick={(e) => {
               e.stopPropagation()
               store.setSignatureZone(null)
             }}>
          ×
        </div>
      </Rnd>
    </div>
  )
}
