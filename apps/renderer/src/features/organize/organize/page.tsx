"use client"

import * as React from "react"
import { DndContext, DragEndEvent, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"

import { OrganizeState, UploadedFile, PdfPage, FILE_COLORS } from "./types"
import { DropZone } from "./components/drop-zone"
import { MainCanvas } from "./components/main-canvas"
import { FileStack } from "./components/file-stack"
import { ActionControls } from "./components/action-controls"
import { ThumbnailGenerator } from "./components/thumbnail-generator"
import { SuccessCard } from "../merge/components/success-card" // Reusing success card

import { useOrganizeStore } from "@/stores/use-organize-store"

export function OrganizePage() {
  const store = useOrganizeStore()

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleFiles = async (newFiles: File[]) => {
    const filesToAdd = newFiles.map((file, i) => {
      const fileId = crypto.randomUUID()
      const color = FILE_COLORS[(store.files.length + i) % FILE_COLORS.length]
      
      return {
        id: fileId,
        name: file.name,
        color,
        file,
        numPages: 0 // Will be updated by ThumbnailGenerator when loaded
      }
    })
    
    store.addFiles(filesToAdd)
  }

  const handlePagesExtracted = (fileId: string, thumbnails: string[]) => {
    const newPages: PdfPage[] = thumbnails.map((thumb, i) => ({
      id: `${fileId}-p${i + 1}`,
      fileId,
      pageNumber: i + 1,
      previewUrl: thumb,
      rotation: 0
    }))

    store.updateFilePages(fileId, thumbnails.length, newPages)
  }

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const activeType = active.data.current?.type
    
    if (activeType === "Page") {
      const oldIndex = store.pages.findIndex(p => p.id === active.id)
      const newIndex = store.pages.findIndex(p => p.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        store.reorderPages(oldIndex, newIndex)
      }
    } else if (activeType === "File") {
      const activeFileId = (active.id as string).replace("file-", "")
      const overFileId = (over.id as string).replace("file-", "")
      
      const oldIndex = store.files.findIndex(f => f.id === activeFileId)
      const newIndex = store.files.findIndex(f => f.id === overFileId)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        store.reorderFiles(oldIndex, newIndex)
      }
    }
  }

  const handleRotatePage = (pageId: string) => {
    store.rotatePage(pageId)
  }

  const handleAddBlankPage = (afterId: string) => {
    store.addBlankPage(afterId)
  }

  const handleDeletePage = (pageId: string) => {
    store.deletePage(pageId)
  }

  const handleDeleteFile = (fileId: string) => {
    store.deleteFile(fileId)
  }

  const handleSortAZ = () => {
    store.sortAZ()
  }

  const handleSort19 = () => {
    store.sort19()
  }

  const handleExport = async () => {
    // Implement actual export using IPC / Go backend later
    store.setStep("processing")
    setTimeout(() => {
      store.setStep("success")
    }, 1500)
  }

  const reset = () => {
    store.reset()
  }

  if (store.step === "upload") {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <DropZone onFiles={handleFiles} />
      </div>
    )
  }

  if (store.step === "success") {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <SuccessCard
          fileName="Organized_Document.pdf"
          downloadUrl="#"
          onReset={reset}
          title="Organized Successfully"
          description="Your PDF file has been successfully organized."
          primaryActionText="Save Organized PDF"
          secondaryActionText="Organize More"
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      {/* Invisible Thumbnail Generators */}
      {store.files.map(file => (
        <ThumbnailGenerator
          key={file.id}
          file={file}
          onPagesExtracted={handlePagesExtracted}
        />
      ))}

      {/* Header & Controls */}
      <div className="flex shrink-0 items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organize PDF</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag pages to reorder, or organize entire files at once.
          </p>
        </div>
        <ActionControls
          onAddFiles={() => inputRef.current?.click()}
          onSortAZ={handleSortAZ}
          onSort19={handleSort19}
          onExport={handleExport}
          isProcessing={store.step === "processing"}
          hasFiles={store.files.length > 0}
        />
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files || [])
            if (files.length > 0) handleFiles(files)
            if (inputRef.current) inputRef.current.value = ""
          }}
        />
      </div>

      {/* Main Workspace */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-6 min-h-0 overflow-hidden items-stretch">
          <MainCanvas
            pages={store.pages}
            files={store.files}
            onDeletePage={handleDeletePage}
            onRotatePage={handleRotatePage}
            onAddBlank={handleAddBlankPage}
          />
          <FileStack
            files={store.files}
            onResetAll={reset}
          />
        </div>
      </DndContext>
    </div>
  )
}
