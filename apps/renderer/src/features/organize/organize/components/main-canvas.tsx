import * as React from "react"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import { PageCard } from "./page-card"
import { PdfPage, UploadedFile } from "../types"

interface MainCanvasProps {
  pages: PdfPage[]
  files: UploadedFile[]
  onDeletePage: (id: string) => void
  onRotatePage: (id: string) => void
  onAddBlank: (afterId: string) => void
}

export function MainCanvas({ pages, files, onDeletePage, onRotatePage, onAddBlank }: MainCanvasProps) {
  // Create a map of fileId to color object
  const colorMap = React.useMemo(() => {
    const map = new Map<string, { bg: string; border: string; ring: string; text: string }>()
    files.forEach(f => map.set(f.id, f.color))
    return map
  }, [files])

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-muted/5 rounded-3xl ring-1 ring-border shadow-inner min-h-0 relative">
      <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
          {pages.map(page => (
            <PageCard
              key={page.id}
              page={page}
              colorInfo={colorMap.get(page.fileId)}
              onDelete={onDeletePage}
              onRotate={onRotatePage}
              onAddBlank={onAddBlank}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
