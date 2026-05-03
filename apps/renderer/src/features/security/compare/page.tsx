"use client"

import * as React from "react"
import { GitCompare, ShieldCheck, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

import type { CompareState, CompareStats, PageDiff } from "./types"
import { INITIAL_STATE } from "./types"
import { DropZonePair } from "./components/drop-zone-pair"
import { PdfViewer }   from "./components/pdf-viewer"
import { DiffPanel }   from "./components/diff-panel"
import { Toolbar }     from "./components/toolbar"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTextReport(state: CompareState): string {
  const lines: string[] = []
  lines.push("PDF Comparison Report")
  lines.push("=".repeat(40))
  lines.push(`Original : ${state.fileA?.name ?? "—"}`)
  lines.push(`Modified : ${state.fileB?.name ?? "—"}`)
  lines.push(`Generated: ${new Date().toLocaleString()}`)
  if (state.stats) {
    lines.push("")
    lines.push(`Overall Similarity : ${state.stats.similarity}%`)
    lines.push(`Changed Pages      : ${state.stats.changedPages} / ${state.stats.totalPages}`)
    lines.push(`Total Added Chars  : +${state.stats.totalAdded}`)
    lines.push(`Total Deleted Chars: -${state.stats.totalDeleted}`)
  }
  lines.push("")
  lines.push("=".repeat(40))
  lines.push("CHANGES")
  lines.push("=".repeat(40))
  state.diffs
    .filter(d => d.addedChars > 0 || d.deletedChars > 0)
    .forEach(d => {
      lines.push(`\n[Page ${d.page}] +${d.addedChars} / -${d.deletedChars} chars  (${d.similarity}% match)`)
      d.changes.forEach(c => {
        if (c.type === "insert") lines.push(`  [+] ${c.text.trim()}`)
        if (c.type === "delete") lines.push(`  [-] ${c.text.trim()}`)
      })
    })
  return lines.join("\n")
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparePdfPage() {
  const [state, setState] = React.useState<CompareState>(INITIAL_STATE)
  const patch = (p: Partial<CompareState>) => setState(s => ({ ...s, ...p }))

  // Scroll sync refs
  const scrollRefA = React.useRef<HTMLDivElement>(null!)
  const scrollRefB = React.useRef<HTMLDivElement>(null!)

  // ── Scroll sync ────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!state.syncScroll) return
    const a = scrollRefA.current
    const b = scrollRefB.current
    if (!a || !b) return

    let lockA = false, lockB = false
    const syncFromA = () => {
      if (lockA) return; lockB = true
      b.scrollTop = a.scrollTop
      requestAnimationFrame(() => { lockB = false })
    }
    const syncFromB = () => {
      if (lockB) return; lockA = true
      a.scrollTop = b.scrollTop
      requestAnimationFrame(() => { lockA = false })
    }
    a.addEventListener("scroll", syncFromA)
    b.addEventListener("scroll", syncFromB)
    return () => {
      a.removeEventListener("scroll", syncFromA)
      b.removeEventListener("scroll", syncFromB)
    }
  }, [state.syncScroll, state.step])

  // ── File loading ───────────────────────────────────────────────────────────

  async function loadFile(file: File, side: "A" | "B") {
    const buffer = await file.arrayBuffer()
    const next = side === "A"
      ? { fileA: file, bufferA: buffer }
      : { fileB: file, bufferB: buffer }
    // Update state — trigger compare if both are now set
    setState(s => {
      const merged = { ...s, ...next }
      if (merged.bufferA && merged.bufferB) {
        // Kick off Go comparison after this state update
        setTimeout(() => runCompare(merged.bufferA!, merged.bufferB!), 0)
        return { ...merged, step: "loading" }
      }
      return merged
    })
  }

  // ── Go comparison (replaces JS text extraction + diff) ────────────────────

  async function runCompare(bufA: ArrayBuffer, bufB: ArrayBuffer) {
    patch({ step: "loading" })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI?.pdf
      if (!api?.compare) {
        throw new Error("pdf:compare IPC not available — is Electron running?")
      }

      const result = await api.compare(bufA, bufB)

      if (!result.success) {
        patch({ step: "error", errorMessage: result.error })
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = result.data as any
      const diffs: PageDiff[] = raw.pages
      const stats: CompareStats = {
        totalAdded:   raw.totalAdded,
        totalDeleted: raw.totalDeleted,
        changedPages: raw.changedPages,
        totalPages:   raw.totalPages,
        similarity:   raw.similarity,
      }

      patch({ step: "ready", diffs, stats, totalPages: raw.totalPages })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      patch({ step: "error", errorMessage: msg })
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const bothLoaded = !!state.bufferA && !!state.bufferB
  const isLoading  = state.step === "loading"

  function handleDownload() {
    const text = generateTextReport(state)
    const blob = new Blob([text], { type: "text/plain" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = "comparison-report.txt"; a.click()
    URL.revokeObjectURL(url)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative flex shrink-0 items-center justify-between border-b border-border/60 dark:border-white/[0.06] px-8 py-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

        <div className="flex items-center gap-3.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <GitCompare className="h-4 w-4 text-violet-400" />
            <div className="absolute inset-0 rounded-xl bg-violet-500/10 blur-sm" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-foreground tracking-tight">Compare PDF</h1>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Go-powered diff engine · Side by side · Local only
            </p>
          </div>
        </div>

        {/* Similarity badge */}
        {state.stats && (
          <div className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 ring-1 animate-in fade-in-0 duration-300",
            state.stats.similarity >= 80
              ? "bg-emerald-500/10 ring-emerald-500/20"
              : state.stats.similarity >= 50
              ? "bg-amber-500/10 ring-amber-500/20"
              : "bg-red-500/10 ring-red-500/20"
          )}>
            <div className={cn(
              "text-xl font-black tabular-nums",
              state.stats.similarity >= 80 ? "text-emerald-400"
              : state.stats.similarity >= 50 ? "text-amber-400"
              : "text-red-400"
            )}>
              {state.stats.similarity}%
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground/80">Match</p>
              <p className="text-[10px] text-muted-foreground/50">
                {state.stats.changedPages} page{state.stats.changedPages !== 1 ? "s" : ""} changed
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6">

        {/* Drop zone */}
        {!bothLoaded && (
          <div className="flex flex-1 flex-col justify-center animate-in fade-in-0 duration-300">
            <DropZonePair
              fileA={state.fileA} fileB={state.fileB}
              onFileA={f => loadFile(f, "A")}
              onFileB={f => loadFile(f, "B")}
              onClearA={() => patch({ fileA: null, bufferA: null, diffs: [], stats: null, step: "idle" })}
              onClearB={() => patch({ fileB: null, bufferB: null, diffs: [], stats: null, step: "idle" })}
            />

            {(state.fileA || state.fileB) && (
              <div className="mt-6 flex items-center justify-center gap-2 animate-in fade-in-0 duration-300">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400/60" />
                <p className="text-sm text-muted-foreground/50">
                  {state.fileA ? "Now drop the modified PDF →" : "← Now drop the original PDF"}
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="h-px flex-1 bg-border/40 dark:bg-white/[0.05] max-w-[120px]" />
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                <ShieldCheck className="h-3 w-3" />
                <span>Files never leave your device · Go-powered diff engine</span>
              </div>
              <div className="h-px flex-1 bg-border/40 dark:bg-white/[0.05] max-w-[120px]" />
            </div>
          </div>
        )}

        {/* Viewer layout */}
        {bothLoaded && (
          <div className="flex flex-1 flex-col gap-4 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-400">

            <Toolbar
              fileA={state.fileA} fileB={state.fileB}
              currentPage={state.currentPage}  totalPages={state.totalPages}
              scale={state.scale}              syncScroll={state.syncScroll}
              onPagePrev={()  => patch({ currentPage: Math.max(1, state.currentPage - 1) })}
              onPageNext={()  => patch({ currentPage: Math.min(state.totalPages, state.currentPage + 1) })}
              onZoomIn={()    => patch({ scale: Math.min(3, state.scale + 0.25) })}
              onZoomOut={()   => patch({ scale: Math.max(0.5, state.scale - 0.25) })}
              onZoomReset={() => patch({ scale: 1.0 })}
              onSyncToggle={() => patch({ syncScroll: !state.syncScroll })}
            />

            <div className="relative flex flex-1 gap-4 overflow-hidden">

              {/* Go analysis loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                    <p className="text-sm font-medium text-violet-400">Go engine analysing…</p>
                    <p className="text-[11px] text-muted-foreground/50">Extracting text & computing diff</p>
                  </div>
                </div>
              )}

              <PdfViewer
                buffer={state.bufferA}
                side="left"
                diffs={state.diffs}
                currentPage={state.currentPage}
                scale={state.scale}
                mode={state.mode}
                scrollRef={scrollRefA}
                onLoad={n => patch({ totalPages: Math.max(n, state.totalPages) })}
              />

              <PdfViewer
                buffer={state.bufferB}
                side="right"
                diffs={state.diffs}
                currentPage={state.currentPage}
                scale={state.scale}
                mode={state.mode}
                scrollRef={scrollRefB}
                onLoad={n => patch({ totalPages: Math.max(n, state.totalPages) })}
              />

              <DiffPanel
                diffs={state.diffs}
                stats={state.stats}
                mode={state.mode}
                searchQuery={state.searchQuery}
                currentPage={state.currentPage}
                onModeChange={m  => patch({ mode: m })}
                onSearchChange={q => patch({ searchQuery: q })}
                onJumpPage={p    => patch({ currentPage: p })}
                onDownload={handleDownload}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {state.step === "error" && state.errorMessage && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/8 px-4 py-3 ring-1 ring-red-500/15">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">{state.errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}
