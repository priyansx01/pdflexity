import * as React from "react"
import { Plus, ArrowDownAZ, ArrowDown01, Settings2, Download } from "lucide-react"

interface ActionControlsProps {
  onAddFiles: () => void
  onSortAZ: () => void
  onSort19: () => void
  onExport: () => void
  isProcessing: boolean
  hasFiles: boolean
}

export function ActionControls({ onAddFiles, onSortAZ, onSort19, onExport, isProcessing, hasFiles }: ActionControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSortAZ}
        disabled={!hasFiles || isProcessing}
        className="flex h-9 items-center gap-2 rounded-lg bg-muted/50 px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        title="Sort A-Z"
      >
        <ArrowDownAZ className="h-4 w-4" />
      </button>

      <button
        onClick={onSort19}
        disabled={!hasFiles || isProcessing}
        className="flex h-9 items-center gap-2 rounded-lg bg-muted/50 px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        title="Sort 1-9"
      >
        <ArrowDown01 className="h-4 w-4" />
      </button>

      <button
        onClick={onAddFiles}
        disabled={isProcessing}
        className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500/10 px-4 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400 disabled:opacity-50 ml-2"
      >
        <Plus className="h-4 w-4" />
        Add Files
      </button>

      <button
        onClick={onExport}
        disabled={!hasFiles || isProcessing}
        className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 disabled:opacity-50 ml-2"
      >
        {isProcessing ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export
      </button>
    </div>
  )
}
