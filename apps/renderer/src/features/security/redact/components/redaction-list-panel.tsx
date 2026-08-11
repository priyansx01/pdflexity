"use client"

import * as React from "react"
import { useRedactStore } from "@/stores/use-redact-store"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ChevronDown, ChevronRight, Trash2, MousePointer2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { groupMarksByPage } from "@/lib/redaction-utils"

export function RedactionListPanel() {
  const store = useRedactStore()
  const [expandedPages, setExpandedPages] = React.useState<Set<number>>(new Set([1]))
  const [showClearConfirm, setShowClearConfirm] = React.useState(false)

  const groupedMarks = groupMarksByPage(store.marks)
  const pages = Array.from(groupedMarks.keys()).sort((a, b) => a - b)

  const togglePage = (page: number) => {
    const newExpanded = new Set(expandedPages)
    if (newExpanded.has(page)) {
      newExpanded.delete(page)
    } else {
      newExpanded.add(page)
    }
    setExpandedPages(newExpanded)
  }

  const handleSelectAll = () => {
    store.selectAllMarks()
  }

  const handleClearAll = () => {
    store.clearMarks()
    setShowClearConfirm(false)
  }

  if (store.marks.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <div className="flex flex-col items-center justify-center gap-2 py-8 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
            <MousePointer2 className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-[13px] font-medium">No redactions yet</p>
          <p className="text-[11px] text-muted-foreground text-center">Draw on the PDF to add redaction marks</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10b981]/10">
                <div className="h-3 w-3 rounded-sm bg-[#10b981]/60" />
              </div>
              <h3 className="text-[13px] font-semibold">
                Redactions
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">({store.marks.length})</span>
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-6 text-[11px]"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-[#ef4444]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-[280px] space-y-0.5 overflow-y-auto p-2">
          {pages.map(pageNum => {
            const marks = groupedMarks.get(pageNum) || []
            const isExpanded = expandedPages.has(pageNum)

            return (
              <div key={pageNum} className="rounded-lg overflow-hidden">
                <div
                  className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => togglePage(pageNum)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-[12px] font-medium">Page {pageNum}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {marks.length}
                  </span>
                </div>

                {isExpanded && (
                  <div className="ml-4 space-y-0.5 pb-1">
                    {marks.map(mark => {
                      const isSelected = store.selectedMarkIds.includes(mark.id)

                      return (
                        <div
                          key={mark.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md p-2 text-xs transition-colors",
                            "hover:bg-muted/50",
                            isSelected && "bg-[#10b981]/8 ring-1 ring-[#10b981]/20"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            store.toggleMarkSelection(mark.id)
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => store.toggleMarkSelection(mark.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 data-[state=checked]:border-[#10b981] data-[state=checked]:bg-[#10b981]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-mono text-muted-foreground truncate">
                              {mark.width.toFixed(0)} × {mark.height.toFixed(0)}
                            </p>
                          </div>
                          {mark.source === "search" && (
                            <span className="text-[9px] rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              search
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ef4444]/10">
                <Trash2 className="h-3.5 w-3.5 text-[#ef4444]" />
              </div>
              Clear All Redactions
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {store.marks.length} redaction mark{store.marks.length !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-[#ef4444] hover:bg-[#dc2626]"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
