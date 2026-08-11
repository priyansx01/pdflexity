"use client"

import * as React from "react"
import { useRedactStore } from "@/stores/use-redact-store"
import { PDFViewer } from "@/features/security/redact/components/pdf-viewer"
import { Toolbar } from "@/features/security/redact/components/toolbar"
import { DocumentPanel } from "@/features/security/redact/components/document-panel"
import { RedactionListPanel } from "@/features/security/redact/components/redaction-list-panel"
import { SearchRedactPanel } from "@/features/security/redact/components/search-redact-panel"
import { AppearancePanel } from "@/features/security/redact/components/appearance-panel"
import { PreviewModal } from "@/features/security/redact/components/preview-modal"
import { SuccessCard } from "@/features/security/redact/components/success-card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertCircle, EyeOff, Info, RotateCcw, ShieldCheck, Pencil, Search, Download } from "lucide-react"
import { cn } from "@/lib/utils"

function StepDetail({ icon: Icon, text, hint, done = false }: {
  icon: React.ElementType; text: string; hint?: string; done?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300",
        done
          ? "bg-[#10b981]/30 text-[#34d399] ring-1 ring-[#10b981]/40"
          : "bg-[#10b981]/15 text-[#34d399] ring-1 ring-[#10b981]/25"
      )}>
        <Icon className="h-3 w-3" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-foreground/90">{text}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/40">{hint}</p>}
      </div>
    </div>
  )
}

export default function RedactPage() {
  const step = useRedactStore((s) => s.step)
  const pdfBytes = useRedactStore((s) => s.pdfBytes)
  const error = useRedactStore((s) => s.error)
  const reset = useRedactStore((s) => s.reset)
  const resultUrl = useRedactStore((s) => s.resultUrl)
  const resultFileName = useRedactStore((s) => s.resultFileName)
  const marksApplied = useRedactStore((s) => s.marksApplied)

  const [showPreview, setShowPreview] = React.useState(false)

  if (step === "success") {
    return (
      <div className="flex h-full flex-col">
        <div className="relative flex shrink-0 items-center justify-between border-b border-border/60 dark:border-white/[0.06] px-8 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/30 to-transparent" />
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#10b981]/15 ring-1 ring-[#10b981]/25 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <EyeOff className="h-4 w-4 text-[#34d399]" />
              <div className="absolute inset-0 rounded-xl bg-[#10b981]/10 blur-sm" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground tracking-tight">Redact PDF</h1>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">Permanently remove sensitive content</p>
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <SuccessCard
            fileName={resultFileName || "redacted.pdf"}
            downloadUrl={resultUrl || "#"}
            onReset={reset}
            marksApplied={marksApplied}
          />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <div className="relative flex shrink-0 items-center justify-between border-b border-border/60 dark:border-white/[0.06] px-8 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/30 to-transparent" />
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#10b981]/15 ring-1 ring-[#10b981]/25 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <EyeOff className="h-4 w-4 text-[#34d399]" />
              <div className="absolute inset-0 rounded-xl bg-[#10b981]/10 blur-sm" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground tracking-tight">Redact PDF</h1>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">Permanently remove sensitive content</p>
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ef4444]/10">
              <AlertCircle className="h-7 w-7 text-[#ef4444]" />
            </div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button onClick={reset} className="mt-6 h-9 bg-[#10b981] hover:bg-[#059669]">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider delay={300}>
      <div className="flex h-full flex-col">
        {step === "idle" || step === "loading" ? (
          <>
            {/* Header */}
            <div className="relative flex shrink-0 items-center justify-between border-b border-border/60 dark:border-white/[0.06] px-8 py-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/30 to-transparent" />
              <div className="flex items-center gap-3.5">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#10b981]/15 ring-1 ring-[#10b981]/25 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <EyeOff className="h-4 w-4 text-[#34d399]" />
                  <div className="absolute inset-0 rounded-xl bg-[#10b981]/10 blur-sm" />
                </div>
                <div>
                  <h1 className="text-[15px] font-bold text-foreground tracking-tight">Redact PDF</h1>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">Permanently remove sensitive content · Local engine</p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger className="flex h-8 w-8 cursor-default items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground">
                  <Info className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[220px] text-center text-xs">
                  Draw redaction marks or search for text to permanently erase. Your file never leaves this device.
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Body */}
            <div className="flex flex-1 items-start justify-center px-8 py-10">
              <div className="w-full max-w-[540px]">
                <div className="space-y-6 animate-in fade-in-0 duration-300">
                  <div className="relative overflow-hidden rounded-2xl border border-border dark:border-white/[0.07] bg-card dark:bg-white/[0.02]">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />

                    <div className="divide-y divide-border/50 dark:divide-white/[0.05]">
                      {/* Step 1: Upload */}
                      <div className="p-6">
                        <StepDetail icon={EyeOff} text="Upload PDF" hint="Select the PDF you want to redact" />
                        <div className="mt-4">
                          <DocumentPanel />
                        </div>
                      </div>

                      {/* Steps 2-4: only shown after file upload */}
                      {pdfBytes && (
                        <>
                          {/* Step 2: Mark */}
                          <div className="p-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                            <StepDetail icon={Pencil} text="Mark sensitive content" hint="Draw redaction boxes or search for text patterns" />
                            <div className="mt-4 flex items-center gap-4">
                              <div className="flex-1 rounded-lg bg-muted/40 p-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-5 w-5 rounded bg-[#10b981]/15 flex items-center justify-center">
                                    <Pencil className="h-2.5 w-2.5 text-[#34d399]" />
                                  </div>
                                  <div>
                                    <p className="text-[12px] font-medium">Draw manually</p>
                                    <p className="text-[10px] text-muted-foreground/50">Click & drag to mark areas</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1 rounded-lg bg-muted/40 p-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-5 w-5 rounded bg-[#10b981]/15 flex items-center justify-center">
                                    <Search className="h-2.5 w-2.5 text-[#34d399]" />
                                  </div>
                                  <div>
                                    <p className="text-[12px] font-medium">Search & redact</p>
                                    <p className="text-[10px] text-muted-foreground/50">Find and mark text patterns</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Step 3: Customize */}
                          <div className="p-6 animate-in fade-in-0 slide-in-from-top-2 duration-400">
                            <StepDetail icon={ShieldCheck} text="Customize appearance" hint="Adjust redaction color, add labels, and preview" />
                          </div>

                          {/* Step 4: Apply */}
                          <div className="p-6 animate-in fade-in-0 slide-in-from-top-2 duration-500">
                            <StepDetail icon={Download} text="Apply & save" hint="Redactions are permanently burned into the PDF" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trust bar */}
                <div className="mt-6 flex items-center justify-center gap-4">
                  <div className="h-px flex-1 bg-border/40 dark:bg-white/[0.05]" />
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                    <ShieldCheck className="h-3 w-3" />
                    <span>File never leaves your device</span>
                  </div>
                  <div className="h-px flex-1 bg-border/40 dark:bg-white/[0.05]" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header with toolbar */}
            <div className="shrink-0 border-b bg-card/50 px-6 py-3">
              <Toolbar onPreview={() => setShowPreview(true)} />
            </div>

            {/* Editor */}
            <div className="flex flex-1 gap-0 min-h-0 overflow-hidden">
              <div className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r bg-card/30 p-4">
                <div className="rounded-xl border bg-card p-4">
                  <DocumentPanel />
                </div>
                <RedactionListPanel />
                <SearchRedactPanel />
                <AppearancePanel />
              </div>
              <div className="flex-1 min-w-0 p-4">
                <PDFViewer />
              </div>
            </div>
          </>
        )}

        {showPreview && <PreviewModal onClose={() => setShowPreview(false)} />}
      </div>
    </TooltipProvider>
  )
}
