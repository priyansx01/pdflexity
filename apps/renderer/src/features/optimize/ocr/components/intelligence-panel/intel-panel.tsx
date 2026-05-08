"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useOcrStore } from "@/stores/use-ocr-store"
import type { OCRTextBlock, StructureNode, BlockType } from "@/features/optimize/ocr/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronRight, ChevronDown, Heading1, Type, List, Table2, Image,
  AlertTriangle, RefreshCw, Wand2, ShieldCheck, BarChart3, FileText, Globe,
} from "lucide-react"

export function IntelPanel() {
  const { pageResults, activePage, overallConfidence, detectedLanguages, editedBlocks } = useOcrStore()
  const pageResult = pageResults.get(activePage)
  const [activeTab, setActiveTab] = useState<"structure" | "confidence" | "metadata">("structure")

  const tabs = [
    { id: "structure" as const, label: "Structure", icon: FileText },
    { id: "confidence" as const, label: "Confidence", icon: ShieldCheck },
    { id: "metadata" as const, label: "Info", icon: BarChart3 },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center border-b border-white/5 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white/5 text-foreground"
                : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {activeTab === "structure" && <StructureTab pageResult={pageResult} />}
          {activeTab === "confidence" && <ConfidenceTab pageResult={pageResult} />}
          {activeTab === "metadata" && (
            <MetadataTab
              pageResult={pageResult}
              overallConfidence={overallConfidence}
              detectedLanguages={detectedLanguages}
              editCount={editedBlocks.size}
              totalPages={pageResults.size}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function StructureTab({ pageResult }: { pageResult: any }) {
  if (!pageResult) {
    return <EmptyState text="Complete OCR to see structure" />
  }

  const blocks: OCRTextBlock[] = pageResult.textBlocks || []
  const grouped = useMemo(() => {
    const groups: Record<string, OCRTextBlock[]> = {}
    blocks.forEach((b) => {
      const key = b.type || "paragraph"
      if (!groups[key]) groups[key] = []
      groups[key].push(b)
    })
    return groups
  }, [blocks])

  const typeIcons: Record<string, React.ElementType> = {
    heading: Heading1, paragraph: Type, "list-item": List,
    "table-cell": Table2, caption: Type, footer: Type, header: Type,
  }

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([type, items]) => (
        <TreeGroup key={type} type={type} items={items} icon={typeIcons[type] || Type} />
      ))}
    </div>
  )
}

function TreeGroup({ type, items, icon: Icon }: { type: string; items: OCRTextBlock[]; icon: React.ElementType }) {
  const [expanded, setExpanded] = useState(type === "heading" || type === "paragraph")

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.01]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/40" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-[11px] font-medium text-foreground/80 capitalize">{type.replace("-", " ")}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/30">{items.length}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-px px-2 pb-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.03]">
                  <ConfidenceDot confidence={item.confidence} />
                  <span className="text-[11px] text-foreground/70 truncate flex-1">{item.text.substring(0, 50)}{item.text.length > 50 ? "..." : ""}</span>
                  {item.edited && <span className="text-[9px] text-emerald-400">edited</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ConfidenceTab({ pageResult }: { pageResult: any }) {
  if (!pageResult) return <EmptyState text="Complete OCR to see confidence" />

  const blocks: OCRTextBlock[] = pageResult.textBlocks || []
  const low = blocks.filter((b) => b.confidence < 0.7)
  const medium = blocks.filter((b) => b.confidence >= 0.7 && b.confidence < 0.9)
  const high = blocks.filter((b) => b.confidence >= 0.9)

  return (
    <div className="space-y-4">
      {/* Summary bars */}
      <div className="space-y-2">
        <ConfBar label="High (90%+)" count={high.length} total={blocks.length} color="bg-emerald-500" />
        <ConfBar label="Medium (70-90%)" count={medium.length} total={blocks.length} color="bg-amber-500" />
        <ConfBar label="Low (<70%)" count={low.length} total={blocks.length} color="bg-red-500" />
      </div>

      {/* Low confidence warnings */}
      {low.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Low confidence blocks
          </div>
          {low.map((block) => (
            <div key={block.id} className="rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2">
              <p className="text-[11px] text-foreground/80 truncate">{block.text.substring(0, 60)}...</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[10px] text-red-400 font-mono">{Math.round(block.confidence * 100)}%</span>
                <button className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300">
                  <RefreshCw className="h-2.5 w-2.5" /> Re-OCR
                </button>
                <button className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
                  <Wand2 className="h-2.5 w-2.5" /> Auto-fix
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 mb-1">
        <span>{label}</span>
        <span className="font-mono">{count}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={cn("h-full rounded-full", color)} />
      </div>
    </div>
  )
}

function MetadataTab({ pageResult, overallConfidence, detectedLanguages, editCount, totalPages }: any) {
  const stats = [
    { label: "Total Pages", value: totalPages },
    { label: "Overall Confidence", value: `${Math.round(overallConfidence * 100)}%` },
    { label: "Languages", value: detectedLanguages.join(", ").toUpperCase() || "—" },
    { label: "User Edits", value: editCount },
  ]

  if (pageResult) {
    stats.push(
      { label: "Page Text Blocks", value: pageResult.textBlocks?.length ?? 0 },
      { label: "Page Confidence", value: `${Math.round((pageResult.avgConfidence ?? 0) * 100)}%` },
      { label: "Processing Time", value: `${pageResult.processingTimeMs ?? 0}ms` }
    )
  }

  return (
    <div className="space-y-1.5">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-white/[0.02]">
          <span className="text-[11px] text-muted-foreground/60">{s.label}</span>
          <span className="text-[11px] font-medium text-foreground/80 font-mono">{String(s.value)}</span>
        </div>
      ))}
    </div>
  )
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const color = confidence >= 0.9 ? "bg-emerald-400" : confidence >= 0.7 ? "bg-amber-400" : "bg-red-400"
  return <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", color)} />
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-32 items-center justify-center">
      <p className="text-[11px] text-muted-foreground/30">{text}</p>
    </div>
  )
}
