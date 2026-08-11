import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { UploadedFile } from "../types"
import { cn } from "@/lib/utils"

interface FileCardProps {
  file: UploadedFile
  index: number
}

function FileCard({ file, index }: FileCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `file-${file.id}`,
    data: { type: "File", file },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const letter = String.fromCharCode(65 + index) // A, B, C...

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all overflow-hidden",
        file.color.bg,
        file.color.border,
        isDragging ? "z-50 shadow-2xl ring-2 scale-[1.02] border-opacity-100" : "hover:border-opacity-100 hover:shadow-md"
      )}
    >
      <div
        className={cn("cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-opacity shrink-0", file.color.text)}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div className="flex flex-1 items-center truncate min-w-0">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] font-bold mr-3 text-[14px] border bg-background/80 backdrop-blur-md shadow-sm",
          file.color.text, file.color.border
        )}>
          {letter}
        </div>
        <div className="flex flex-col truncate leading-tight space-y-0.5">
          <span className="truncate font-semibold text-foreground/90 text-[13px]">
            {file.name}
          </span>
          <span className={cn("text-[11px] font-medium opacity-80", file.color.text)}>
            {file.numPages > 0 ? `${file.numPages} pages` : "Loading..."}
          </span>
        </div>
      </div>
    </div>
  )
}

interface FileStackProps {
  files: UploadedFile[]
  onResetAll: () => void
}

export function FileStack({ files, onResetAll }: FileStackProps) {
  return (
    <div className="flex flex-col w-80 shrink-0 bg-sidebar/50 rounded-2xl shadow-sm ring-1 ring-border/50 p-4 gap-3 h-full overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-1 pb-2 border-b border-border/40">
        <h3 className="text-[13px] font-semibold tracking-wider uppercase text-muted-foreground">Files:</h3>
        <button 
          onClick={onResetAll}
          className="text-[13px] font-medium text-destructive hover:text-destructive/80 transition-colors"
        >
          Reset all
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1">
        <SortableContext items={files.map(f => `file-${f.id}`)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 pb-2">
            {files.map((file, i) => (
              <FileCard key={file.id} file={file} index={i} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
