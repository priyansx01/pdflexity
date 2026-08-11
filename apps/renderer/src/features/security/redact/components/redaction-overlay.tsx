"use client"

import * as React from "react"
import { useRedactStore } from "@/stores/use-redact-store"
import { canvasRectToPdfPoints } from "@/lib/redaction-utils"

interface RedactionOverlayProps {
  pageHeight: number
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export function RedactionOverlay({ pageHeight, canvasRef }: RedactionOverlayProps) {
  const store = useRedactStore()
  const overlayRef = React.useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [drawStart, setDrawStart] = React.useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const marksOnPage = store.marks.filter(m => m.page === store.currentPage)
  const searchResultsOnPage = store.searchResults.filter(r => r.page === store.currentPage && r.selected)

  React.useEffect(() => {
    const overlay = overlayRef.current
    const pdfCanvas = canvasRef.current
    if (!overlay || !pdfCanvas) return

    const syncSize = () => {
      const cssWidth = pdfCanvas.style.width
      const cssHeight = pdfCanvas.style.height
      overlay.style.width = cssWidth
      overlay.style.height = cssHeight
      overlay.width = parseFloat(cssWidth)
      overlay.height = parseFloat(cssHeight)
    }

    syncSize()

    const observer = new MutationObserver(syncSize)
    observer.observe(pdfCanvas, { attributes: true, attributeFilter: ["style", "width", "height"] })

    return () => observer.disconnect()
  }, [canvasRef])

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const overlay = overlayRef.current
    if (!overlay) return { x: 0, y: 0 }
    const rect = overlay.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!store.drawingMode) return
    const coords = getCanvasCoords(e)
    setIsDrawing(true)
    setDrawStart(coords)
    setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return
    const coords = getCanvasCoords(e)
    const width = coords.x - drawStart.x
    const height = coords.y - drawStart.y
    setCurrentRect({
      x: width > 0 ? drawStart.x : coords.x,
      y: height > 0 ? drawStart.y : coords.y,
      width: Math.abs(width),
      height: Math.abs(height),
    })
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect || currentRect.width < 10 || currentRect.height < 10) {
      setIsDrawing(false)
      setDrawStart(null)
      setCurrentRect(null)
      return
    }

    const pdfRect = canvasRectToPdfPoints(currentRect, pageHeight, store.viewerScale)

    store.addMark({
      page: store.currentPage,
      x: pdfRect.x,
      y: pdfRect.y,
      width: pdfRect.width,
      height: pdfRect.height,
      source: "manual",
    })

    setIsDrawing(false)
    setDrawStart(null)
    setCurrentRect(null)
    store.setDrawingMode(false)
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (store.selectedMarkIds.length > 0) {
          store.removeMarks(store.selectedMarkIds)
        }
      }
      if (e.key === "Escape") {
        store.setDrawingMode(false)
        store.deselectAllMarks()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [store.selectedMarkIds])

  React.useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return

    const ctx = overlay.getContext("2d")
    if (!ctx) return

    const w = overlay.width
    const h = overlay.height

    ctx.clearRect(0, 0, w, h)

    const scale = store.viewerScale

    for (const mark of marksOnPage) {
      const x = mark.x * scale
      const y = (pageHeight - mark.y - mark.height) * scale
      const markW = mark.width * scale
      const markH = mark.height * scale

      const isSelected = store.selectedMarkIds.includes(mark.id)

      ctx.fillStyle = "rgba(0, 0, 0, 0.75)"
      ctx.fillRect(x, y, markW, markH)

      if (isSelected) {
        ctx.strokeStyle = "#10b981"
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.strokeRect(x - 1, y - 1, markW + 2, markH + 2)
        ctx.setLineDash([])

        const handleSize = 8
        ctx.fillStyle = "#10b981"

        const handles = [
          [x, y],
          [x + markW, y],
          [x, y + markH],
          [x + markW, y + markH],
        ]

        for (const [hx, hy] of handles) {
          ctx.beginPath()
          ctx.arc(hx, hy, handleSize / 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    for (const result of searchResultsOnPage) {
      const x = result.x * scale
      const y = (pageHeight - result.y - result.height) * scale
      const markW = result.width * scale
      const markH = result.height * scale

      ctx.fillStyle = "rgba(245, 158, 11, 0.3)"
      ctx.fillRect(x, y, markW, markH)
      ctx.strokeStyle = "#f59e0b"
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.strokeRect(x, y, markW, markH)
      ctx.setLineDash([])
    }

    if (currentRect) {
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)"
      ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height)
      ctx.strokeStyle = "#10b981"
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height)
      ctx.setLineDash([])
    }
  }, [marksOnPage, searchResultsOnPage, currentRect, store.selectedMarkIds, pageHeight, store.viewerScale])

  const cursor = store.drawingMode ? "crosshair" : "default"
  const pointerEvents = store.drawingMode ? "auto" : "none"

  return (
    <canvas
      ref={overlayRef}
      className="absolute left-0 top-0"
      style={{ cursor, pointerEvents }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}
