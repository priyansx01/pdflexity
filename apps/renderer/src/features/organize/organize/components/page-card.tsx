import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Trash2, RotateCw, FilePlus } from "lucide-react"
import { PdfPage } from "../types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface PageCardProps {
  page: PdfPage
  colorInfo?: { bg: string; border: string; ring: string; text: string }
  onDelete: (id: string) => void
  onRotate: (id: string) => void
  onAddBlank: (afterId: string) => void
}

export function PageCard({ page, colorInfo, onDelete, onRotate, onAddBlank }: PageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
    data: { type: "Page", page },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isBlank = page.isBlank

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-[1/1.414] overflow-visible rounded-2xl bg-white shadow-sm transition-shadow",
        "border-4", colorInfo ? colorInfo.border : "border-gray-200",
        isDragging && cn("z-50 scale-105 shadow-2xl", colorInfo?.ring),
        "hover:shadow-md"
      )}
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail or Blank Content */}
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-white">
        {isBlank ? (
          <div className="text-muted-foreground/30 font-medium select-none text-sm">Blank Page</div>
        ) : page.previewUrl ? (
          <img
            src={page.previewUrl}
            alt={`Page ${page.pageNumber}`}
            className="pointer-events-none h-full w-full object-contain p-2 transition-transform duration-200"
            style={{ transform: `rotate(${page.rotation || 0}deg)` }}
          />
        ) : (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent opacity-50" />
        )}
      </div>

      {/* File Color Indicator & Page Number */}
      <div className={cn(
        "absolute bottom-2 right-2 flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-bold shadow-sm backdrop-blur-xl ring-1",
        colorInfo ? cn("bg-background/90", colorInfo.text, colorInfo.ring) : "bg-background/90 text-muted-foreground ring-border/50"
      )}>
        {isBlank ? "Blank" : page.pageNumber}
      </div>

      {/* Top Actions (visible on hover) */}
      <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        {!isBlank && (
          <button
            onClick={(e) => { e.stopPropagation(); onRotate(page.id) }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-500 shadow hover:bg-red-50 transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(page.id) }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-700 shadow hover:bg-gray-100 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Add Blank Page (floating on the right border) */}
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger
            onClick={(e) => { e.stopPropagation(); onAddBlank(page.id) }}
            className="absolute -right-4 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-500 shadow-md opacity-0 transition-all hover:scale-110 hover:text-red-500 group-hover:opacity-100 border border-gray-100"
          >
            <div className="relative pointer-events-none">
              <FilePlus className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-gray-800 text-white font-medium text-xs px-3 py-1.5 rounded-md border-none">
            Add a blank page
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
