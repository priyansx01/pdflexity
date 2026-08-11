import * as React from "react"
import { Plus, X } from "lucide-react"
import { useSplitStore } from "@/stores/use-split-store"
import { cn } from "@/lib/utils"

export function RangeMode() {
  const numPages = useSplitStore(state => state.numPages)
  const ranges = useSplitStore(state => state.ranges)
  const addRange = useSplitStore(state => state.addRange)
  const updateRange = useSplitStore(state => state.updateRange)
  const removeRange = useSplitStore(state => state.removeRange)

  const colors = [
    "border-rose-500 text-rose-600 bg-rose-500/10",
    "border-cyan-500 text-cyan-600 bg-cyan-500/10",
    "border-amber-500 text-amber-600 bg-amber-500/10",
    "border-purple-500 text-purple-600 bg-purple-500/10",
    "border-emerald-500 text-emerald-600 bg-emerald-500/10",
  ]

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Custom Ranges</h3>
        <button
          onClick={addRange}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-md transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add Range
        </button>
      </div>

      <div className="flex flex-col space-y-3">
        {ranges.map((range, idx) => {
          const colorClass = colors[idx % colors.length]
          
          return (
            <div key={range.id} className={cn("flex items-center gap-3 p-3 rounded-xl border", colorClass.split(" ")[0] + "/30")}>
              <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold", colorClass)}>
                {idx + 1}
              </div>
              
              <div className="flex flex-1 items-center gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground ml-1">From</span>
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={range.from}
                    onChange={(e) => updateRange(range.id, parseInt(e.target.value) || 1, range.to)}
                    className="w-16 rounded-md border bg-background px-2 py-1 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="mt-4 text-muted-foreground">-</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground ml-1">To</span>
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={range.to}
                    onChange={(e) => updateRange(range.id, range.from, parseInt(e.target.value) || 1)}
                    className="w-16 rounded-md border bg-background px-2 py-1 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {ranges.length > 1 && (
                <button
                  onClick={() => removeRange(range.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
