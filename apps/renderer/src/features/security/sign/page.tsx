"use client"

import * as React from "react"
import { useSignStore } from "@/stores/use-sign-store"
import { PDFViewer } from "./components/pdf-viewer"
import { DocumentPanel, CertificatePanel, SignaturePanel } from "./components/sidebar-panels"
import { VerifyPanel } from "./components/verify-panel"
import { SignToolbar } from "./components/toolbar"
import { SuccessCard } from "@/features/security/protect/components/success-card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PenTool, Info, ShieldCheck, FileText, UploadCloud } from "lucide-react"
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
          : "bg-indigo-500/15 text-indigo-500 ring-1 ring-indigo-500/25"
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

export function SignPage() {
  const store = useSignStore()

  const [dragging, setDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = Array.from(e.dataTransfer.files).find(f =>
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    )
    if (file) handleFile(file)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleFile = async (file: File) => {
    const bytes = await file.arrayBuffer()
    store.setPdf(file, bytes)
  }

  // ── Upload screen ───────────────────────────────────────────────────────────

  if (!store.pdfFile) {
    return (
      <TooltipProvider delay={300}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="relative flex shrink-0 items-center justify-between border-b border-border/60 dark:border-white/[0.06] px-8 py-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/25 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <PenTool className="h-4 w-4 text-indigo-500" />
                <div className="absolute inset-0 rounded-xl bg-indigo-500/10 blur-sm" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold text-foreground tracking-tight">Sign PDF</h1>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Digital signatures with X.509 certificates · Local engine</p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger className="flex h-8 w-8 cursor-default items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground">
                <Info className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[220px] text-center text-xs">
                Sign PDFs with your digital certificate (.p12/.pfx). The signature is cryptographically embedded in the file.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Body */}
          <div className="flex flex-1 items-start justify-center px-8 py-10">
            <div className="w-full max-w-[540px]">
              <div className="space-y-6 animate-in fade-in-0 duration-300">
                <div className="relative overflow-hidden rounded-2xl border border-border dark:border-white/[0.07] bg-card dark:bg-white/[0.02]">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

                  <div className="divide-y divide-border/50 dark:divide-white/[0.05]">
                    {/* Step 1: Upload */}
                    <div className="p-6">
                      <StepDetail icon={FileText} text="Upload PDF" hint="Select the PDF you want to sign" />
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                          onDragEnter={() => setDragging(true)}
                          onDragLeave={() => setDragging(false)}
                          onDrop={handleDrop}
                          className={cn(
                            "group relative w-full overflow-hidden rounded-xl border-2 border-dashed",
                            "flex flex-col items-center justify-center gap-3 px-6 py-8",
                            "transition-all duration-300 ease-out outline-none",
                            dragging
                              ? "border-indigo-500 bg-indigo-500/8 scale-[1.01] shadow-[0_0_40px_rgba(99,102,241,0.15)]"
                              : "border-border/50 bg-muted/10 hover:border-indigo-500/40 hover:bg-indigo-500/[0.03]"
                          )}
                        >
                          <div className={cn(
                            "pointer-events-none absolute inset-0 transition-opacity duration-500",
                            "bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1)_0%,transparent_70%)]",
                            dragging ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                          )} />

                          <div className={cn(
                            "relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300",
                            dragging
                              ? "bg-indigo-500/25 ring-2 ring-indigo-500/50 scale-105"
                              : "bg-indigo-500/10 ring-1 ring-indigo-500/20 group-hover:scale-105"
                          )}>
                            <div className="absolute inset-0 rounded-xl bg-indigo-500/10 blur-sm" />
                            <UploadCloud className="relative h-6 w-6 text-indigo-500/80" />
                          </div>

                          <div className="text-center">
                            <p className={cn(
                              "text-sm font-semibold tracking-tight transition-colors duration-200",
                              dragging ? "text-indigo-500" : "text-foreground/80 group-hover:text-foreground"
                            )}>
                              {dragging ? "Release to upload" : "Drop PDF here"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              or{" "}
                              <span className="font-medium text-indigo-500 underline-offset-2 group-hover:underline">
                                browse
                              </span>
                            </p>
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Steps 2-4 */}
                    <div className="p-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                      <StepDetail icon={PenTool} text="Place signature" hint="Load your certificate and position the signature zone" />
                    </div>

                    <div className="p-6 animate-in fade-in-0 slide-in-from-top-2 duration-400">
                      <StepDetail icon={ShieldCheck} text="Apply & save" hint="The digital signature is permanently embedded in the PDF" />
                    </div>
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
        </div>
      </TooltipProvider>
    )
  }

  // ── Editor screen ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <SignToolbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[320px] shrink-0 border-r border-border/50 bg-background/30 flex flex-col overflow-y-auto">
           <DocumentPanel />
           <CertificatePanel />
           <SignaturePanel />
           <VerifyPanel />
        </div>

        {/* Main Canvas */}
        <div className="flex-1 bg-muted/10 relative overflow-hidden flex flex-col">
           {store.step === "success" && store.downloadUrl ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                 <SuccessCard
                   fileName={store.downloadName || "signed_document.pdf"}
                   downloadUrl={store.downloadUrl}
                   onReset={() => store.reset()}
                 />
              </div>
           ) : null}

           {/* Page navigation */}
           {store.pdfFile && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-4 py-2 bg-background/80 backdrop-blur border border-border/50 rounded-full shadow-lg">
                 <button
                    disabled={store.currentPage <= 1}
                    onClick={() => store.setCurrentPage(store.currentPage - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted disabled:opacity-50">
                    ←
                 </button>
                 <span className="text-xs font-medium">Page {store.currentPage} of {store.totalPages}</span>
                 <button
                    disabled={store.currentPage >= store.totalPages}
                    onClick={() => store.setCurrentPage(store.currentPage + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted disabled:opacity-50">
                    →
                 </button>
              </div>
           )}

           <PDFViewer />
        </div>
      </div>
    </div>
  )
}
