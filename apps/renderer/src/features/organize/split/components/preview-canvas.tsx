import * as React from "react"
import { usePdfRenderer } from "@/features/security/compare/hooks/use-pdf-renderer"
import { useSplitStore } from "@/stores/use-split-store"
import { cn } from "@/lib/utils"

export function PreviewCanvas() {
  const file = useSplitStore(state => state.file)
  const numPages = useSplitStore(state => state.numPages)
  const setNumPages = useSplitStore(state => state.setNumPages)
  const mode = useSplitStore(state => state.mode)
  const ranges = useSplitStore(state => state.ranges)
  const selectedPages = useSplitStore(state => state.selectedPages)
  const togglePageSelection = useSplitStore(state => state.togglePageSelection)
  
  const { loadPdf, renderPage } = usePdfRenderer()
  const [thumbnails, setThumbnails] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!file) return

    let active = true
    setLoading(true)
    setThumbnails([])

    const load = async () => {
      try {
        const buffer = await file.arrayBuffer()
        const pages = await loadPdf(buffer)
        if (!active) return
        setNumPages(pages)

        const loadedThumbnails: string[] = []
        for (let i = 1; i <= pages; i++) {
          if (!active) break
          const canvas = document.createElement("canvas")
          await renderPage(i, canvas, 0.4)
          loadedThumbnails.push(canvas.toDataURL("image/jpeg", 0.5))
          setThumbnails([...loadedThumbnails]) // Update progressively
        }
      } catch (err) {
        console.error("Failed to load PDF:", err)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [file])

  if (!file) return null

  // Helper to determine if a page is selected/highlighted
  const isPageHighlighted = (pageNum: number) => {
    if (mode === "pages") {
      return selectedPages.includes(pageNum)
    } else if (mode === "range") {
      return ranges.some(r => pageNum >= r.from && pageNum <= r.to)
    }
    return false // Size mode doesn't visually select specific pages
  }

  // Get color index for range mode grouping (so different ranges have different colors)
  const getPageColorClass = (pageNum: number) => {
    if (mode === "pages") {
      return selectedPages.includes(pageNum) ? "ring-emerald-500 bg-emerald-500/10" : ""
    } else if (mode === "range") {
      const rangeIndex = ranges.findIndex(r => pageNum >= r.from && pageNum <= r.to)
      if (rangeIndex === -1) return ""
      
      const colors = [
        "ring-rose-500 bg-rose-500/10",
        "ring-cyan-500 bg-cyan-500/10",
        "ring-amber-500 bg-amber-500/10",
        "ring-purple-500 bg-purple-500/10",
        "ring-emerald-500 bg-emerald-500/10",
      ]
      return colors[rangeIndex % colors.length]
    }
    return ""
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-muted/5 rounded-3xl ring-1 ring-border shadow-inner min-h-0">
      {loading && thumbnails.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <span className="text-sm font-medium">Extracting pages...</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {Array.from({ length: numPages }).map((_, i) => {
          const pageNum = i + 1
          const highlighted = isPageHighlighted(pageNum)
          const colorClass = getPageColorClass(pageNum)
          const thumb = thumbnails[i]

          return (
            <button
              key={pageNum}
              onClick={() => {
                if (mode === "pages") togglePageSelection(pageNum)
              }}
              className={cn(
                "group relative aspect-[1/1.414] overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-200",
                mode === "pages" && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
                mode !== "pages" && "cursor-default",
                highlighted ? cn("ring-2 shadow-md", colorClass) : "ring-transparent hover:border-gray-300"
              )}
            >
              <div className="flex h-full w-full items-center justify-center p-2">
                {thumb ? (
                  <img src={thumb} alt={`Page ${pageNum}`} className="h-full w-full object-contain pointer-events-none" />
                ) : (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent opacity-50" />
                )}
              </div>
              
              {/* Page Number Badge */}
              <div className={cn(
                "absolute bottom-2 right-2 flex min-w-6 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold shadow-sm backdrop-blur-xl transition-colors",
                highlighted 
                  ? "bg-foreground text-background" 
                  : "bg-background/90 text-muted-foreground ring-1 ring-border/50 group-hover:text-foreground"
              )}>
                {pageNum}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
