"use client"

import * as React from "react"
import { useRedactStore } from "@/stores/use-redact-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react"

interface PreviewModalProps {
  onClose: () => void
}

export function PreviewModal({ onClose }: PreviewModalProps) {
  const store = useRedactStore()
  const [previewImage, setPreviewImage] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const marksOnCurrentPage = store.marks.filter(m => m.page === store.currentPage)

  const loadPreview = async () => {
    if (!store.pdfBytes || marksOnCurrentPage.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const backendMarks = marksOnCurrentPage.map(mark => ({
        page: mark.page,
        x: mark.x,
        y: mark.y,
        width: mark.width,
        height: mark.height,
        fillColor: store.appearance.fillColor,
        label: store.appearance.overlayLabel || undefined,
        labelColor: store.appearance.labelColor || undefined,
      }))

      const result = await window.electronAPI?.pdf.redact.preview(
        store.pdfBytes,
        store.currentPage,
        1.5,
        backendMarks
      )

      if (!result) {
        throw new Error("Electron API not available")
      }

      if (!result.success) {
        throw new Error(result.error)
      }

      setPreviewImage(`data:image/png;base64,${result.data.imageBase64}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate preview"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadPreview()
  }, [store.currentPage])

  const handlePrevPage = () => {
    if (store.currentPage > 1) {
      store.setCurrentPage(store.currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (store.currentPage < store.totalPages) {
      store.setCurrentPage(store.currentPage + 1)
    }
  }

  const pagesWithMarks = new Set(store.marks.map(m => m.page))
  const hasPrev = store.currentPage > 1
  const hasNext = store.currentPage < store.totalPages

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10b981]/10">
              <Eye className="h-4 w-4 text-[#34d399]" />
            </div>
            Preview Redactions
          </DialogTitle>
          <DialogDescription>
            See how your redactions will appear in the final PDF
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevPage}
            disabled={!hasPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[12px] font-medium tabular-nums">
            Page {store.currentPage} of {store.totalPages}
            {pagesWithMarks.has(store.currentPage) && (
              <span className="ml-1.5 text-muted-foreground font-normal">
                ({marksOnCurrentPage.length} redaction{marksOnCurrentPage.length !== 1 ? "s" : ""})
              </span>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextPage}
            disabled={!hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-[400px] flex-1 items-center justify-center rounded-xl border bg-gradient-to-b from-muted/10 to-muted/20">
          {isLoading && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b981]/10">
                <Loader2 className="h-5 w-5 animate-spin text-[#10b981]" />
              </div>
              <span className="text-sm text-muted-foreground">Generating preview...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full bg-[#ef4444]/10 px-3 py-1.5">
                <span className="text-sm text-[#ef4444]">{error}</span>
              </div>
            </div>
          )}

          {previewImage && !isLoading && (
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[500px] max-w-full object-contain"
            />
          )}

          {!previewImage && !isLoading && !error && marksOnCurrentPage.length === 0 && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <p className="text-sm">No redactions on this page</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose} className="h-8 text-sm">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
