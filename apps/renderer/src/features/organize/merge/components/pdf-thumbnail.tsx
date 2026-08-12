"use client"

import * as React from "react"
import { usePdfRenderer } from "@/features/security/compare/hooks/use-pdf-renderer"

interface PdfThumbnailProps {
  file: File
  className?: string
}

export function PdfThumbnail({ file, className }: PdfThumbnailProps) {
  const { loadPdf, renderPage } = usePdfRenderer()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = React.useState(false)
  const [imgUrl, setImgUrl] = React.useState<string | null>(null)

  const isImage = file.type.startsWith("image/")

  React.useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file)
      setImgUrl(url)
      setLoaded(true)
      return () => URL.revokeObjectURL(url)
    }

    let active = true
    file.arrayBuffer().then(buffer => {
      if (!active) return
      loadPdf(buffer).then(n => {
        if (n > 0 && active) setLoaded(true)
      })
    })
    return () => { active = false }
  }, [file, loadPdf, isImage])

  React.useEffect(() => {
    if (isImage || !loaded || !canvasRef.current) return
    let active = true
    // Scale 0.5 is usually enough for a thumbnail to look crisp but be fast
    renderPage(1, canvasRef.current, 0.5).then(() => {
      // no-op
    })
    return () => { active = false }
  }, [loaded, renderPage, isImage])

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-white ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent opacity-50" />
        </div>
      )}
      {isImage && imgUrl ? (
        <img
          src={imgUrl}
          alt={file.name}
          className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{ boxShadow: "0 0 10px rgba(0,0,0,0.05)" }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{ boxShadow: "0 0 10px rgba(0,0,0,0.05)" }}
        />
      )}
    </div>
  )
}
