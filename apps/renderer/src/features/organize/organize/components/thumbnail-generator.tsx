"use client"

import * as React from "react"
import { usePdfRenderer } from "@/features/security/compare/hooks/use-pdf-renderer"
import { UploadedFile } from "../types"

interface ThumbnailGeneratorProps {
  file: UploadedFile
  onPagesExtracted: (fileId: string, pageThumbnails: string[]) => void
}

export function ThumbnailGenerator({ file, onPagesExtracted }: ThumbnailGeneratorProps) {
  const { loadPdf, renderPage, numPages } = usePdfRenderer()
  const [extracted, setExtracted] = React.useState(false)

  React.useEffect(() => {
    let active = true
    file.file.arrayBuffer().then(buffer => {
      if (active) loadPdf(buffer)
    })
    return () => { active = false }
  }, [file, loadPdf])

  const onPagesExtractedRef = React.useRef(onPagesExtracted)
  React.useEffect(() => {
    onPagesExtractedRef.current = onPagesExtracted
  }, [onPagesExtracted])

  React.useEffect(() => {
    if (numPages === 0 || extracted) return
    let active = true

    const extractThumbnails = async () => {
      const thumbnails: string[] = []
      // Render pages one by one to avoid locking the UI thread entirely
      for (let i = 1; i <= numPages; i++) {
        if (!active) break
        const canvas = document.createElement("canvas")
        await renderPage(i, canvas, 0.4) // Scale 0.4 for thumbnail
        thumbnails.push(canvas.toDataURL("image/jpeg", 0.5)) // compressed jpeg for memory
      }
      if (active) {
        setExtracted(true)
        onPagesExtractedRef.current(file.id, thumbnails)
      }
    }

    extractThumbnails()

    return () => { active = false }
  }, [numPages, extracted, renderPage, file.id])

  return null
}
