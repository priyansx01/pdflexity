import * as React from "react"
import { useSplitStore } from "@/stores/use-split-store"
import { RangeMode } from "./range-mode"
import { PageMode } from "./page-mode"
import { SizeMode } from "./size-mode"
import { Scissors, FileDigit, HardDrive, Download, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function ControlPanel({ onSplit }: { onSplit: () => void }) {
  const mode = useSplitStore(state => state.mode)
  const setMode = useSplitStore(state => state.setMode)
  const mergeOutput = useSplitStore(state => state.mergeOutput)
  const setMergeOutput = useSplitStore(state => state.setMergeOutput)
  const ranges = useSplitStore(state => state.ranges)
  const selectedPages = useSplitStore(state => state.selectedPages)
  const errorMessage = useSplitStore(state => state.errorMessage)
  
  // Calculate how many files will be created
  let outputCount = 0
  if (mergeOutput) {
    outputCount = 1
  } else if (mode === "range") {
    outputCount = ranges.length
  } else if (mode === "pages") {
    outputCount = selectedPages.length
  } else if (mode === "size") {
    outputCount = 2 // estimate
  }

  const isValid = mode === "range" ? ranges.length > 0 : mode === "pages" ? selectedPages.length > 0 : true

  return (
    <div className="flex flex-col w-80 shrink-0 bg-sidebar/50 rounded-2xl shadow-sm ring-1 ring-border/50 h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex p-2 bg-muted/20 border-b border-border/50 shrink-0">
        <button
          onClick={() => setMode("range")}
          className={cn("flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all duration-200", mode === "range" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
        >
          <Scissors className="h-4 w-4" />
          By Range
        </button>
        <button
          onClick={() => setMode("pages")}
          className={cn("flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all duration-200", mode === "pages" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
        >
          <FileDigit className="h-4 w-4" />
          Extract
        </button>
        <button
          onClick={() => setMode("size")}
          className={cn("flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg text-xs font-medium transition-all duration-200", mode === "size" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
        >
          <HardDrive className="h-4 w-4" />
          By Size
        </button>
      </div>

      {/* Dynamic Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {mode === "range" && <RangeMode />}
        {mode === "pages" && <PageMode />}
        {mode === "size" && <SizeMode />}
        
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="p-4 bg-background/50 backdrop-blur-md border-t border-border/50 shrink-0 space-y-4">
        {mode !== "size" && (
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={mergeOutput}
                onChange={(e) => setMergeOutput(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-5 rounded border border-input bg-background peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all" />
              <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.5 5L4.5 8L10.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <span className="text-sm font-medium text-foreground group-hover:text-emerald-500 transition-colors">
              Merge extracted pages
            </span>
          </label>
        )}

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-xs text-emerald-600 font-medium text-center">
            {outputCount === 1 ? "1 PDF file will be created" : `${outputCount} PDF files will be created`}
          </p>
        </div>

        <button
          onClick={onSplit}
          disabled={!isValid}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all shadow-md",
            isValid 
              ? "bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg active:scale-[0.98]" 
              : "bg-muted-foreground/30 cursor-not-allowed text-muted-foreground shadow-none"
          )}
        >
          <Download className="h-4 w-4" />
          Split PDF
        </button>
      </div>
    </div>
  )
}
