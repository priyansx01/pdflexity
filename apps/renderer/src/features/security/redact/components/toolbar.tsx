"use client"

import * as React from "react"
import { useRedactStore } from "@/stores/use-redact-store"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { 
  Pencil, MousePointer2, ZoomIn, ZoomOut, 
  ChevronLeft, ChevronRight, Eye, Download, Trash2, 
  Undo2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { marksToBackendFormat } from "@/lib/redaction-utils"

interface ToolbarProps {
  onPreview: () => void
}

export function Toolbar({ onPreview }: ToolbarProps) {
  const store = useRedactStore()
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const handleApply = async () => {
    if (!store.pdfBytes || store.marks.length === 0) return

    setIsProcessing(true)
    store.setStep("processing")

    try {
      const marks = marksToBackendFormat(store.marks, store.appearance)
      
      const result = await window.electronAPI?.pdf.redact.apply(
        store.pdfBytes,
        store.pdfFile?.name || "document.pdf",
        marks
      )

      if (!result) throw new Error("Electron API not available")
      if (!result.success) throw new Error(result.error)

      const blob = new Blob([Uint8Array.from(atob(result.data), c => c.charCodeAt(0))], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      store.setResult(url, result.fileName, result.marksApplied)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to apply redactions"
      store.setError(message)
    } finally {
      setIsProcessing(false)
      setShowConfirm(false)
    }
  }

  const handleClear = () => {
    store.clearMarks()
    store.deselectAllMarks()
  }

  const pagesWithMarks = new Set(store.marks.map(m => m.page)).size
  const canApply = store.step === "loaded" && store.marks.length > 0

  return (
    <>
      <div className="flex items-center justify-between px-2">
        {/* Left: Title + File */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#10b981]/10 ring-1 ring-[#10b981]/20 flex items-center justify-center">
              <Eye className="h-4 w-4 text-[#34d399]" />
            </div>
            <h1 className="text-[15px] font-semibold tracking-tight">Redact PDF</h1>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {store.pdfFile?.name || "No file loaded"}
          </span>
        </div>

        {/* Center: Tools */}
        <div className="flex items-center gap-1.5">
          {/* Mode Toggle */}
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={store.drawingMode ? "default" : "ghost"}
              size="sm"
              onClick={() => store.setDrawingMode(true)}
              className={cn(
                "h-7 text-xs px-2.5",
                store.drawingMode
                  ? "bg-[#10b981] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Draw
            </Button>
            <Button
              variant={!store.drawingMode ? "default" : "ghost"}
              size="sm"
              onClick={() => store.setDrawingMode(false)}
              className={cn(
                "h-7 text-xs px-2.5",
                !store.drawingMode
                  ? "bg-[#10b981] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MousePointer2 className="h-3.5 w-3.5 mr-1.5" />
              Select
            </Button>
          </div>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Zoom */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => store.setZoom(Math.max(0.5, store.zoom - 0.25))}
              disabled={store.zoom <= 0.5}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-mono text-muted-foreground min-w-[40px] text-center tabular-nums">
              {Math.round(store.zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => store.setZoom(Math.min(3, store.zoom + 0.25))}
              disabled={store.zoom >= 3}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Page Nav */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => store.setCurrentPage(Math.max(1, store.currentPage - 1))}
              disabled={store.currentPage <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-mono text-muted-foreground min-w-[50px] text-center tabular-nums">
              {store.currentPage}/{store.totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => store.setCurrentPage(Math.min(store.totalPages, store.currentPage + 1))}
              disabled={store.currentPage >= store.totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Marks Actions */}
          {store.selectedMarkIds.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[#ef4444] hover:text-[#ef4444] hover:bg-[#ef4444]/8"
                onClick={() => store.removeMarks(store.selectedMarkIds)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete ({store.selectedMarkIds.length})
              </Button>
              <div className="h-6 w-px bg-border" />
            </>
          )}

          {store.marks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            >
              <Undo2 className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </Button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            onClick={onPreview}
            disabled={store.marks.length === 0 || store.step === "processing"}
            className="h-8 text-xs border-border/50"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Button>

          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!canApply || isProcessing}
            className={cn(
              "h-8 text-xs font-medium shadow-sm",
              "bg-[#ef4444] hover:bg-[#dc2626] text-white",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-1.5">⟳</span>
                Applying...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Apply Redactions
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status bar */}
      {store.marks.length > 0 && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-lg">
          <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
          <span className="text-[11px] text-muted-foreground">
            {store.marks.length} redaction{store.marks.length !== 1 ? "s" : ""}
          </span>
          {pagesWithMarks > 1 && (
            <>
              <span className="text-[11px] text-muted-foreground/50">across</span>
              <span className="text-[11px] font-medium text-[#10b981]">{pagesWithMarks} page{pagesWithMarks !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
                <Trash2 className="h-3.5 w-3.5 text-[#ef4444]" />
              </div>
              Apply Redactions
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action is <strong>permanent and cannot be undone</strong>. The redacted content
              will be completely removed from the PDF byte stream.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Redactions</span>
              <span className="font-semibold tabular-nums">{store.marks.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pages affected</span>
              <span className="font-semibold tabular-nums">{pagesWithMarks}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">File</span>
              <span className="font-semibold truncate ml-2 max-w-[200px]">{store.pdfFile?.name}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApply}
              className="bg-[#ef4444] hover:bg-[#dc2626]"
            >
              Apply Redactions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
