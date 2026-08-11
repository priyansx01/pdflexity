import * as React from "react"
import { useSplitStore } from "@/stores/use-split-store"

export function SizeMode() {
  const maxSizeMB = useSplitStore(state => state.maxSizeMB)
  const setMaxSize = useSplitStore(state => state.setMaxSize)

  return (
    <div className="flex flex-col space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Split by Size</h3>
        <p className="text-sm text-muted-foreground">
          Specify the maximum file size for each split part.
        </p>
      </div>

      <div className="flex flex-col space-y-3 p-4 rounded-xl border border-border/50 bg-muted/10">
        <label className="text-sm font-medium text-foreground">Maximum Size (MB)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={500}
            value={maxSizeMB}
            onChange={(e) => setMaxSize(parseInt(e.target.value) || 1)}
            className="w-24 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <span className="text-sm text-muted-foreground font-medium">MB per file</span>
        </div>
      </div>
      
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg p-3 text-xs font-medium">
        Note: Size-based splitting is an upcoming feature.
      </div>
    </div>
  )
}
