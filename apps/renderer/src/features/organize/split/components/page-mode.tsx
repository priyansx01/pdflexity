import * as React from "react"
import { useSplitStore } from "@/stores/use-split-store"

export function PageMode() {
  const selectedPages = useSplitStore(state => state.selectedPages)

  return (
    <div className="flex flex-col space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Select Pages</h3>
        <p className="text-sm text-muted-foreground">
          Click on the pages in the preview canvas to select them for extraction.
        </p>
      </div>

      <div className="flex flex-col space-y-2 rounded-xl bg-muted/30 p-4 border border-border/50">
        <div className="text-sm font-medium text-foreground">
          {selectedPages.length} {selectedPages.length === 1 ? "page" : "pages"} selected
        </div>
        {selectedPages.length > 0 && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
            {selectedPages.map(p => (
              <span key={p} className="bg-background border rounded px-1.5 py-0.5">{p}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
