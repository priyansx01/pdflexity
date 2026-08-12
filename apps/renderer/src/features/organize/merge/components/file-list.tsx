"use client"

import * as React from "react"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import type { MergeFile } from "../types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PdfThumbnail } from "./pdf-thumbnail"

interface FileListProps {
  files: MergeFile[]
  onReorder: (files: MergeFile[]) => void
  onRemove: (id: string) => void
  onAddMore: (files: File[]) => void
}

export function FileList({ files, onReorder, onRemove, onAddMore }: FileListProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [nativeDragging, setNativeDragging] = React.useState(false)

  // Use mouse and touch sensors explicitly instead of PointerSensor to fix the Electron/Chrome "stuck drag" bug
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Native File Drag & Drop ──
  function handleNativeDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault()
      setNativeDragging(true)
    }
  }

  function handleNativeDrop(e: React.DragEvent) {
    e.preventDefault()
    setNativeDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files).filter(f => 
        f.type === "application/pdf" || f.type.startsWith("image/")
      )
      if (dropped.length > 0) onAddMore(dropped)
    }
  }

  // ── Dnd-Kit Reordering ──
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex(f => f.id === active.id)
      const newIndex = files.findIndex(f => f.id === over.id)
      onReorder(arrayMove(files, oldIndex, newIndex))
    }
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  const activeFile = activeId ? files.find(f => f.id === activeId) : null

  return (
    <div 
      className={cn(
        "flex h-full w-full flex-col space-y-4 min-h-0 rounded-3xl transition-colors duration-300",
        nativeDragging && "bg-emerald-500/5 ring-2 ring-emerald-500/50 p-4 -m-4"
      )}
      onDragOver={handleNativeDragOver}
      onDragLeave={() => setNativeDragging(false)}
      onDrop={handleNativeDrop}
    >
      <div className="flex shrink-0 items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/80">
          {files.length} file{files.length === 1 ? "" : "s"} selected
        </h3>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add More
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,image/*"
          className="hidden"
          onChange={e => {
            const selected = Array.from(e.target.files || [])
            if (selected.length > 0) onAddMore(selected)
            e.target.value = ""
          }}
        />
      </div>

      <ScrollArea className="flex-1 w-full min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={files.map(f => f.id)} strategy={rectSortingStrategy}>
            <div className={cn(
              "pb-4",
              files.length < 4 
                ? "flex flex-wrap justify-center gap-6" 
                : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            )}>
              {files.map((file, index) => (
                <div key={file.id} className={cn(files.length < 4 && "w-64")}>
                  <SortableCard
                    file={file}
                    index={index}
                    onRemove={() => onRemove(file.id)}
                  />
                </div>
              ))}
            </div>
          </SortableContext>

          <DragOverlay 
            adjustScale={false}
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
            }}
          >
            {activeFile ? (
              <CardContent
                file={activeFile}
                index={files.findIndex(f => f.id === activeId)}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </ScrollArea>
    </div>
  )
}

// ─── Sortable Item Wrapper ───────────────────────────────────────────────────

function SortableCard({ file, index, onRemove }: { file: MergeFile; index: number; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group h-full cursor-grab active:cursor-grabbing outline-none touch-none"
    >
      <CardContent file={file} index={index} />
      
      {!isDragging && (
        <button
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault() }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove() }}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-red-600 group-hover:opacity-100 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ─── Visual Card Content ─────────────────────────────────────────────────────

function CardContent({
  file,
  isDragging,
}: {
  file: MergeFile
  index: number
  isDragging?: boolean
}) {
  return (
    <div
      className={cn(
        "flex h-[280px] w-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-300 ring-1 ring-border/50",
        !isDragging && "hover:shadow-lg hover:-translate-y-1 hover:ring-border",
        isDragging && "shadow-2xl ring-2 ring-emerald-500 scale-105 opacity-100" // Overlay needs full opacity
      )}
    >
      {/* Top Preview Section */}
      <div className="relative flex-1 min-h-0 p-2 pb-0">
        <div className="h-full w-full rounded-xl overflow-hidden bg-white flex items-center justify-center">
          <PdfThumbnail file={file.file} className="h-full w-full" />
        </div>
      </div>

      {/* Bottom Label Section */}
      <div className="flex shrink-0 items-center justify-center p-3">
        <span className="truncate text-[13px] font-medium text-muted-foreground">
          {file.file.name}
        </span>
      </div>
    </div>
  )
}
