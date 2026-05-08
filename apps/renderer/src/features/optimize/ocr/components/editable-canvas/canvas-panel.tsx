"use client"

import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useOcrStore } from "@/stores/use-ocr-store"
import type { OCRTextBlock, OCRTable } from "@/features/optimize/ocr/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Type, AlignLeft, AlignCenter, AlignRight, Bold } from "lucide-react"

export function CanvasPanel() {
  const { pageResults, activePage, zoom, updateTextBlock } = useOcrStore()
  const pageResult = pageResults.get(activePage)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  if (!pageResult) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02]">
            <Type className="h-5 w-5 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground/40">Editable layer appears here</p>
          <p className="mt-1 text-xs text-muted-foreground/25">Complete OCR to begin editing</p>
        </div>
      </div>
    )
  }

  const scale = zoom / 100

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/5 px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Editable</span>
        <span className="text-[10px] text-muted-foreground/30">{pageResult.textBlocks.length} blocks</span>
      </div>

      <AnimatePresence>
        {selectedBlockId && <BlockToolbar block={pageResult.textBlocks.find((b: OCRTextBlock) => b.id === selectedBlockId)} />}
      </AnimatePresence>

      <ScrollArea className="flex-1">
        <div className="flex min-h-full items-start justify-center p-4">
          <div
            className="relative bg-white dark:bg-[#1a1a2e] rounded-lg shadow-2xl border border-white/5 overflow-hidden"
            style={{ width: pageResult.width * scale, height: pageResult.height * scale }}
          >
            {pageResult.textBlocks.map((block: OCRTextBlock) => (
              <EditableBlock
                key={block.id}
                block={block}
                scale={scale}
                isSelected={selectedBlockId === block.id}
                onSelect={() => setSelectedBlockId(block.id)}
                onDeselect={() => { if (selectedBlockId === block.id) setSelectedBlockId(null) }}
                onUpdate={(u) => updateTextBlock(activePage, block.id, u)}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function EditableBlock({ block, scale, isSelected, onSelect, onDeselect, onUpdate }: {
  block: OCRTextBlock; scale: number; isSelected: boolean
  onSelect: () => void; onDeselect: () => void; onUpdate: (u: Partial<OCRTextBlock>) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleBlur = useCallback(() => {
    if (ref.current) {
      const newText = ref.current.innerText
      if (newText !== block.text) onUpdate({ text: newText })
    }
    setIsEditing(false)
    onDeselect()
  }, [block.text, onUpdate, onDeselect])

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
    onSelect()
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus()
        const range = document.createRange()
        range.selectNodeContents(ref.current)
        range.collapse(false)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
    }, 0)
  }, [onSelect])

  const lowConf = block.confidence < 0.7
  const medConf = block.confidence >= 0.7 && block.confidence < 0.9

  return (
    <div
      className={cn(
        "absolute cursor-text select-text transition-all duration-100",
        isSelected ? "ring-2 ring-emerald-500/40 z-20" : "hover:ring-1 hover:ring-white/10 z-10",
        block.edited && "bg-emerald-500/5",
        lowConf && "border border-red-500/30",
        medConf && "border border-amber-500/20"
      )}
      style={{
        left: block.bbox.x * scale, top: block.bbox.y * scale,
        width: block.bbox.width * scale, minHeight: block.bbox.height * scale,
      }}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      {block.edited && <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400 z-30" />}
      {lowConf && <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-400 z-30" title={`Low: ${Math.round(block.confidence * 100)}%`} />}
      <div
        ref={ref}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className={cn("outline-none w-full h-full", isEditing && "bg-white/5 rounded-sm")}
        style={{
          fontSize: block.fontSize * scale, fontWeight: block.fontWeight === "bold" ? 700 : 400,
          fontStyle: block.fontStyle, textAlign: block.alignment,
          lineHeight: `${block.lineHeight * scale}px`,
          color: block.type === "footer" || block.type === "header" ? "#888" : "currentColor",
        }}
      >
        {block.text}
      </div>
    </div>
  )
}

function BlockToolbar({ block }: { block?: OCRTextBlock }) {
  if (!block) return null
  const confColor = block.confidence >= 0.9 ? "text-emerald-400" : block.confidence >= 0.7 ? "text-amber-400" : "text-red-400"

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
      className="absolute left-1/2 top-12 z-50 -translate-x-1/2 flex items-center gap-0.5 rounded-lg border border-white/10 bg-card/95 px-1.5 py-1 shadow-2xl backdrop-blur-xl"
    >
      <span className="mr-2 text-[10px] text-muted-foreground/50 max-w-[80px] truncate">{block.type}</span>
      <div className="h-4 w-px bg-white/5" />
      <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:bg-white/5"><Bold className="h-3 w-3" /></button>
      <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:bg-white/5"><AlignLeft className="h-3 w-3" /></button>
      <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:bg-white/5"><AlignCenter className="h-3 w-3" /></button>
      <button className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:bg-white/5"><AlignRight className="h-3 w-3" /></button>
      <div className="h-4 w-px bg-white/5" />
      <span className={cn("text-[10px] font-mono tabular-nums px-1.5", confColor)}>{Math.round(block.confidence * 100)}%</span>
    </motion.div>
  )
}
