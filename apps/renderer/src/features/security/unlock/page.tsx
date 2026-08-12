"use client"

import * as React from "react"
import {
  LockOpen, Lock, Loader2, ShieldCheck,
  ArrowRight, Info, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { UnlockState, UploadedFile } from "./types"
import { DropZone }            from "./components/drop-zone"
import { FileCard }            from "./components/file-card"
import { PasswordInput }       from "./components/password-input"
import { SuccessCard }         from "./components/success-card"
import { AlreadyUnlockedCard } from "./components/already-unlocked-card"

import { useUnlockStore } from "@/stores/use-unlock-store"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function base64ToObjectUrl(b64: string, mimeType = "application/pdf"): string {
  const binary = atob(b64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}

async function isPdfEncrypted(file: File): Promise<boolean> {
  const tailSize  = Math.min(file.size, 8192)
  const buf       = await file.slice(file.size - tailSize).arrayBuffer()
  return new TextDecoder("latin1").decode(buf).includes("/Encrypt")
}

// ─── Trust badges ─────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { icon: ShieldCheck, text: "100% local — no uploads" },
  { icon: Zap,         text: "Powered by pdfcpu" },
  { icon: LockOpen,    text: "All encryption types" },
] as const

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function UnlockPdfPage() {
  const store = useUnlockStore()
  const [isDragging, setIsDragging]     = React.useState(false)
  const [downloadName, setDownloadName] = React.useState("")

  // ── File select ────────────────────────────────────────────────────────────

  async function handleFileSelect(file: File) {
    store.setStep("checking")

    const encrypted = await isPdfEncrypted(file)
    const uploadedFile: UploadedFile = {
      file,
      name: file.name,
      sizeLabel: formatBytes(file.size),
      isEncrypted: encrypted,
    }

    if (!encrypted) {
      store.setAlreadyUnlocked(uploadedFile, URL.createObjectURL(file))
    } else {
      store.setUploadedFile(uploadedFile)
    }
  }

  // ── Unlock ─────────────────────────────────────────────────────────────────

  async function handleUnlock() {
    if (!store.uploadedFile || !store.password.trim()) return
    store.setStep("unlocking")

    try {
      const buffer = await store.uploadedFile.file.arrayBuffer()
      const api = window.electronAPI
      if (!api?.pdf?.unlock) throw new Error("Electron IPC not available. Run the app in Electron.")

      const result = await api.pdf.unlock(buffer, store.password, store.uploadedFile.name)
      if (!result.success) throw new Error(result.error)

      setDownloadName(result.fileName)
      store.setResult(base64ToObjectUrl(result.data))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred"
      const isWrongPassword =
        msg.toLowerCase().includes("wrong") ||
        msg.toLowerCase().includes("incorrect") ||
        msg.toLowerCase().includes("password") ||
        msg.toLowerCase().includes("decrypt")
      
      store.setError(isWrongPassword ? "Incorrect password. Please try again." : `Error: ${msg}`)
    }
  }

  React.useEffect(() => {
    return () => { if (store.downloadUrl) URL.revokeObjectURL(store.downloadUrl) }
  }, [store.downloadUrl])

  // ── Derived ────────────────────────────────────────────────────────────────

  const isChecking    = store.step === "checking"
  const isLoading     = store.step === "unlocking"
  const isSuccess     = store.step === "success"
  const isAlreadyOpen = store.step === "alreadyUnlocked"
  const hasError      = store.step === "error"
  const canUnlock     = !!store.uploadedFile?.isEncrypted && store.password.trim().length > 0 && !isLoading

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delay={300}>
      <div className="flex h-full flex-col overflow-y-auto">

        {/* ─── Header ──────────────────────────────────────────────── */}
        <div className="relative flex shrink-0 items-center justify-between border-b border-border/60 dark:border-white/[0.06] px-8 py-5">
          {/* Subtle top gradient */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/30 to-transparent" />

          <div className="flex items-center gap-3.5">
            {/* Icon badge */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#10b981]/15 ring-1 ring-[#10b981]/25 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <LockOpen className="h-4 w-4 text-[#34d399]" />
              <div className="absolute inset-0 rounded-xl bg-[#10b981]/10 blur-sm" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground tracking-tight">Unlock PDF</h1>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Remove password protection · Local engine
              </p>
            </div>
          </div>

          {/* Trust + info */}
          <div className="flex items-center gap-3">
            {/* Trust chips */}
            <div className="hidden sm:flex items-center gap-2">
              {TRUST_ITEMS.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 rounded-full border border-border/50 dark:border-white/[0.07] bg-muted/30 dark:bg-white/[0.03] px-3 py-1.5"
                >
                  <Icon className="h-3 w-3 text-[#34d399]/70" />
                  <span className="text-[10px] font-medium text-muted-foreground/60">{text}</span>
                </div>
              ))}
            </div>

            <Tooltip>
              <TooltipTrigger
                className="flex h-8 w-8 cursor-default items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-muted/50 dark:hover:bg-white/5 hover:text-muted-foreground"
              >
                <Info className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px] text-center text-xs">
                Powered by a <strong>local Go engine</strong>. Your file never leaves this device.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ─── Body ────────────────────────────────────────────────── */}
        <div className="flex flex-1 items-start justify-center px-8 py-10">
          <div className="w-full max-w-[540px]">

            {/* ── Checking spinner ── */}
            {isChecking && (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/50 dark:border-white/[0.06] bg-muted/20 dark:bg-white/[0.02] py-16 text-center animate-in fade-in-0 zoom-in-95 duration-300">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#10b981]/10 ring-1 ring-[#10b981]/20">
                  <Loader2 className="h-6 w-6 animate-spin text-[#34d399]" />
                  <div className="absolute inset-0 animate-ping rounded-full bg-[#10b981]/10 [animation-duration:1.5s]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground/80">Analysing PDF…</p>
                  <p className="mt-1 text-xs text-muted-foreground/50">Detecting encryption status</p>
                </div>
              </div>
            )}

            {/* ── Already unlocked ── */}
            {isAlreadyOpen && store.uploadedFile && store.downloadUrl && (
              <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-3 duration-400">
                <FileCard
                  uploadedFile={store.uploadedFile}
                  onReplace={() => {
                    store.reset()
                  }}
                />
                <AlreadyUnlockedCard
                  fileName={store.uploadedFile.name}
                  downloadUrl={store.downloadUrl}
                  onReset={() => {
                    store.reset()
                  }}
                />
              </div>
            )}

            {/* ── Success ── */}
            {isSuccess && store.downloadUrl && (
              <SuccessCard
                fileName={downloadName || (store.uploadedFile?.name ?? "unlocked.pdf")}
                downloadUrl={store.downloadUrl}
                onReset={() => {
                  store.reset()
                }}
              />
            )}

            {/* ── Main flow (idle / error / unlocking) ── */}
            {!isChecking && !isAlreadyOpen && !isSuccess && (
              <div className="space-y-6 animate-in fade-in-0 duration-300">

                {/* Card shell */}
                <div className="relative overflow-hidden rounded-2xl border border-border dark:border-white/[0.07] bg-card dark:bg-white/[0.02]">
                  {/* Top accent line */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />

                  <div className="space-y-0 divide-y divide-border/50 dark:divide-white/[0.05]">

                    {/* ─ Step 1: Upload ─ */}
                    <div className="p-6">
                      <StepLabel
                        n={1}
                        active
                        done={!!store.uploadedFile}
                        text="Upload your PDF"
                        hint="Drag & drop or click to browse"
                      />
                      <div className="mt-4">
                        {store.uploadedFile ? (
                          <FileCard
                            uploadedFile={store.uploadedFile}
                            onReplace={() => store.reset()}
                          />
                        ) : (
                          <DropZone
                            onFileSelect={handleFileSelect}
                            isDragging={isDragging}
                            onDragEnter={() => setIsDragging(true)}
                            onDragLeave={() => setIsDragging(false)}
                          />
                        )}
                      </div>
                    </div>

                    {/* ─ Steps 2 + 3: only shown after file upload ─ */}
                    {store.uploadedFile?.isEncrypted && (
                      <>
                        {/* ─ Step 2: Password ─ */}
                        <div className="p-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                          <StepLabel
                            n={2}
                            active
                            done={store.password.trim().length > 0 && !hasError}
                            text="Enter password"
                            hint="The password used to protect this PDF"
                          />
                          <div className="mt-4">
                            <PasswordInput
                              value={store.password}
                              onChange={val => store.setPassword(val)}
                              showPassword={store.showPassword}
                              onToggleShow={() => store.setShowPassword(!store.showPassword)}
                              hasError={hasError}
                              errorMessage={store.errorMessage}
                              disabled={isLoading}
                              onSubmit={handleUnlock}
                            />
                          </div>
                        </div>

                        {/* ─ Step 3: Unlock button ─ */}
                        <div className="p-6 animate-in fade-in-0 slide-in-from-top-2 duration-400">
                          <StepLabel
                            n={3}
                            active={canUnlock || isLoading}
                            done={isSuccess}
                            text="Remove protection"
                            hint="Decrypt and save a clean copy"
                          />
                          <div className="mt-4">
                            <button
                              onClick={handleUnlock}
                              disabled={!canUnlock}
                              className={cn(
                                "group relative w-full overflow-hidden rounded-xl px-6 py-3.5",
                                "text-sm font-bold text-white tracking-wide",
                                "transition-all duration-200 outline-none",
                                "focus-visible:ring-2 focus-visible:ring-[#10b981]/60",
                                canUnlock
                                  ? "bg-[#10b981] hover:bg-[#059669] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] active:scale-[0.99]"
                                  : "cursor-not-allowed bg-muted/60 dark:bg-white/[0.06] text-foreground/25"
                              )}
                            >
                              {canUnlock && (
                                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                              )}
                              <span className="relative flex items-center justify-center gap-2.5">
                                {isLoading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Unlocking…
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-4 w-4" />
                                    Unlock PDF
                                    {canUnlock && <ArrowRight className="h-4 w-4 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5" />}
                                  </>
                                )}
                              </span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom trust bar */}
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px flex-1 bg-border/40 dark:bg-white/[0.05]" />
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                    <ShieldCheck className="h-3 w-3" />
                    <span>File never leaves your device</span>
                  </div>
                  <div className="h-px flex-1 bg-border/40 dark:bg-white/[0.05]" />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ─── Step Label ───────────────────────────────────────────────────────────────

interface StepLabelProps {
  n: number
  text: string
  hint?: string
  active?: boolean
  done?: boolean
}

function StepLabel({ n, text, hint, active = false, done = false }: StepLabelProps) {
  return (
    <div className="flex items-start gap-3">
      {/* Number badge */}
      <div className={cn(
        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300",
        done
          ? "bg-[#10b981]/30 text-[#34d399] ring-1 ring-[#10b981]/40"
          : active
            ? "bg-[#10b981]/20 text-[#34d399] ring-1 ring-[#10b981]/30"
            : "bg-muted/50 dark:bg-white/5 text-muted-foreground/40 ring-1 ring-border dark:ring-white/10"
      )}>
        {done ? "✓" : n}
      </div>
      <div>
        <p className={cn(
          "text-[13px] font-semibold transition-colors duration-200",
          active || done ? "text-foreground/90" : "text-muted-foreground/50"
        )}>
          {text}
        </p>
        {hint && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/40">{hint}</p>
        )}
      </div>
    </div>
  )
}
