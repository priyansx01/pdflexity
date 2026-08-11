"use client"

import * as React from "react"
import { useRedactStore } from "@/stores/use-redact-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function SearchRedactPanel() {
  const store = useRedactStore()
  const [caseSensitive, setCaseSensitive] = React.useState(false)
  const [useRegex, setUseRegex] = React.useState(false)

  const handleSearch = async () => {
    if (!store.pdfBytes || !store.searchQuery.trim()) return

    store.setIsSearching(true)
    store.clearSearchResults()

    try {
      const result = await window.electronAPI?.pdf.redact.search(
        store.pdfBytes,
        store.searchQuery,
        caseSensitive,
        useRegex
      )

      if (!result) {
        throw new Error("Electron API not available")
      }

      if (!result.success) {
        throw new Error(result.error)
      }

      const results = result.data.matches.map((match, index) => ({
        id: `search-${index}`,
        page: match.page,
        text: match.text,
        x: match.x,
        y: match.y,
        width: match.width,
        height: match.height,
        selected: true,
      }))

      store.setSearchResults(results)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed"
      store.setError(message)
    } finally {
      store.setIsSearching(false)
    }
  }

  const handleMarkAll = () => {
    store.convertSearchResultsToMarks()
  }

  const handleMarkPageOnly = () => {
    const pageResults = store.searchResults
      .filter(r => r.page === store.currentPage)
      .map(r => ({ ...r, selected: true }))
    
    store.setSearchResults([
      ...store.searchResults.filter(r => r.page !== store.currentPage),
      ...pageResults,
    ])
    
    store.convertSearchResultsToMarks()
  }

  const selectedCount = store.searchResults.filter(r => r.selected).length

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10b981]/10">
            <Search className="h-3.5 w-3.5 text-[#34d399]" />
          </div>
          <h3 className="text-[13px] font-semibold">Search & Redact</h3>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search text..."
            value={store.searchQuery}
            onChange={(e) => store.setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-8 text-sm"
          />
          <Button
            onClick={handleSearch}
            disabled={!store.pdfBytes || !store.searchQuery.trim() || store.isSearching}
            size="icon"
            className="h-8 w-8 shrink-0 bg-[#10b981] hover:bg-[#059669]"
          >
            {store.isSearching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="case"
              checked={caseSensitive}
              onCheckedChange={setCaseSensitive}
              className="data-[state=checked]:bg-[#10b981]"
            />
            <Label htmlFor="case" className="text-[11px]">Case sensitive</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="regex"
              checked={useRegex}
              onCheckedChange={setUseRegex}
              className="data-[state=checked]:bg-[#10b981]"
            />
            <Label htmlFor="regex" className="text-[11px]">Regex</Label>
          </div>
        </div>

        {store.searchResults.length > 0 && (
          <>
            <div className="max-h-[140px] space-y-0.5 overflow-y-auto rounded-lg border bg-muted/30 p-1.5">
              {store.searchResults.map(result => (
                <div
                  key={result.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md p-2 text-xs transition-colors",
                    "hover:bg-muted/50",
                    result.selected && "bg-[#10b981]/8"
                  )}
                  onClick={() => store.toggleSearchResultSelection(result.id)}
                >
                  <Checkbox
                    checked={result.selected}
                    onCheckedChange={() => store.toggleSearchResultSelection(result.id)}
                    className="h-3.5 w-3.5 data-[state=checked]:border-[#10b981] data-[state=checked]:bg-[#10b981]"
                  />
                  <span className="flex-1 truncate">{result.text}</span>
                  <span className="text-[10px] text-muted-foreground">p.{result.page}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAll}
                disabled={selectedCount === 0}
                className="flex-1 h-7 text-xs"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Mark All ({selectedCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkPageOnly}
                disabled={store.searchResults.filter(r => r.page === store.currentPage).length === 0}
                className="flex-1 h-7 text-xs"
              >
                This Page
              </Button>
            </div>
          </>
        )}

        {store.searchResults.length === 0 && store.searchQuery && !store.isSearching && (
          <p className="text-center text-[11px] text-muted-foreground py-3">
            No matches found
          </p>
        )}
      </div>
    </div>
  )
}
