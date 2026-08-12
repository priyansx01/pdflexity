"use client"

import * as React from "react"
import {
  Shield, Lock, Loader2, ShieldCheck,
  ArrowRight, AlertCircle, Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import type { ProtectState } from "./types"
import { INITIAL_STATE }   from "./types"
import { DropZone }        from "./components/drop-zone"
import { FileRow }         from "./components/file-row"
import { PasswordField }   from "./components/password-field"
import { SuccessCard }     from "./components/success-card"

import { useProtectStore } from "@/stores/use-protect-store"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64ToObjectUrl(b64: string): string {
  const binary = atob(b64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }))
}

// ─── Step Label ───────────────────────────────────────────────────────────────

function StepLabel({ n, text, hint, active = false, done = false }: {
  n: number; text: string; hint?: string; active?: boolean; done?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn(
        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300",
        done    ? "bg-[#10b981]/30 text-[#34d399] ring-1 ring-[#10b981]/40"
        : active ? "bg-[#10b981]/20 text-[#34d399] ring-1 ring-[#10b981]/30"
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
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/40">{hint}</p>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProtectPdfPage() {
  const store = useProtectStore()
  const [isDragging, setIsDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    return () => { if (store.downloadUrl) URL.revokeObjectURL(store.downloadUrl) }
  }, [store.downloadUrl])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === "application/pdf") store.setFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) store.setFile(file)
  }

  async function handleProtect() {
    if (!store.file || !store.password.trim()) return
    if (store.password !== store.confirmPassword) {
      store.setError("Passwords don't match.")
      return
    }

    store.setStep("protecting")

    try {
      const buffer = await store.file.arrayBuffer()
      const api = window.electronAPI
      if (!api?.pdf?.protect) throw new Error("Electron IPC not available.")

      const result = await api.pdf.protect(buffer, store.password, store.file.name)
      if (!result.success) throw new Error(result.error)

      store.setResult(base64ToObjectUrl(result.data), result.fileName)
    } catch (err: unknown) {
      store.setError(err instanceof Error ? err.message : "Unexpected error")
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const isProtecting   = store.step === "protecting"
  const isSuccess      = store.step === "success"
  const hasError       = store.step === "error"
  const passwordsMatch = store.password === store.confirmPassword
  const canProtect     = !!store.file && store.password.trim().length >= 1
                          && passwordsMatch && !isProtecting

  const len = store.password.length
  const strength = len === 0 ? 0 : len < 5 ? 1 : len < 8 ? 2 : len < 12 ? 3 : 4
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength]
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-[#10b981]"][strength]

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delay={300}>
      <div className="flex h-full flex-col overflow-y-auto">

        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-between border-b border-border/60 dark:border-white/[0.06] px-8 py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/30 to-transparent" />

          <div className="flex items-center gap-3.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#10b981]/15 ring-1 ring-[#10b981]/25 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <Shield className="h-4 w-4 text-[#34d399]" />
              <div className="absolute inset-0 rounded-xl bg-[#10b981]/10 blur-sm" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground tracking-tight">Protect PDF</h1>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">AES-256 encryption · Local engine</p>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger className="flex h-8 w-8 cursor-default items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground">
              <Info className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[200px] text-center text-xs">
              AES-256 encryption via <strong>pdfcpu</strong>. Your file never leaves this device.
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Body */}
        <div className="flex flex-1 items-start justify-center px-8 py-10">
          <div className="w-full max-w-[540px]">

            {/* Success */}
            {isSuccess && store.downloadUrl && (
              <SuccessCard
                fileName={store.downloadName}
                downloadUrl={store.downloadUrl}
                onReset={() => {
                  store.reset()
                }}
              />
            )}

            {/* Main form */}
            {!isSuccess && (
              <div className="space-y-6 animate-in fade-in-0 duration-300">
                <div className="relative overflow-hidden rounded-2xl border border-border dark:border-white/[0.07] bg-card dark:bg-white/[0.02]">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#10b981]/40 to-transparent" />

                  <div className="divide-y divide-border/50 dark:divide-white/[0.05]">

                    {/* Step 1: Upload */}
                    <div className="p-6">
                      <StepLabel n={1} active done={!!store.file} text="Upload PDF" hint="Select the PDF you want to protect" />
                      <div className="mt-4">
                        {store.file ? (
                          <FileRow
                            file={store.file}
                            onReplace={() => store.reset()}
                          />
                        ) : (
                          <DropZone
                            isDragging={isDragging}
                            inputRef={inputRef}
                            onDragEnter={() => setIsDragging(true)}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleFileDrop}
                            onChange={handleFileChange}
                          />
                        )}
                      </div>
                    </div>

                    {/* Steps 2+3: only after file upload */}
                    {store.file && (
                      <>
                        {/* Step 2: Password */}
                        <div className="p-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                          <StepLabel n={2} active done={store.password.length > 0 && passwordsMatch} text="Set password" hint="This password will be required to open the PDF" />
                          <div className="mt-4 space-y-3">

                            <PasswordField
                              id="protect-password"
                              placeholder="Create a strong password…"
                              value={store.password}
                              show={store.showPassword}
                              onToggleShow={() => store.setShowPassword(!store.showPassword)}
                              onChange={v => store.setPassword(v)}
                            />

                            {/* Strength bar */}
                            {store.password.length > 0 && (
                              <div className="flex items-center gap-2 animate-in fade-in-0 duration-200">
                                <div className="flex flex-1 gap-1">
                                  {[1, 2, 3, 4].map(n => (
                                    <div key={n} className={cn("h-1 flex-1 rounded-full transition-all duration-300", strength >= n ? strengthColor : "bg-border dark:bg-white/10")} />
                                  ))}
                                </div>
                                <span className="text-[11px] text-muted-foreground/60 w-12 text-right">{strengthLabel}</span>
                              </div>
                            )}

                            <PasswordField
                              id="protect-confirm"
                              placeholder="Confirm password…"
                              value={store.confirmPassword}
                              show={store.showConfirm}
                              onToggleShow={() => store.setShowConfirm(!store.showConfirm)}
                              onChange={v => store.setConfirmPassword(v)}
                              hasError={store.confirmPassword.length > 0 && !passwordsMatch}
                            />

                            {store.confirmPassword.length > 0 && !passwordsMatch && (
                              <div className="flex items-center gap-2 rounded-lg bg-red-500/8 px-3 py-2 ring-1 ring-red-500/15 animate-in fade-in-0 duration-200">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                <span className="text-xs text-red-600 dark:text-red-400/90">Passwords don't match</span>
                              </div>
                            )}

                            {hasError && store.errorMessage && (
                              <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-500/8 px-3 py-2 ring-1 ring-red-500/15 animate-in fade-in-0 duration-200">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                <span className="text-xs text-red-600 dark:text-red-400/90">{store.errorMessage}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step 3: Protect button */}
                        <div className="p-6 animate-in fade-in-0 slide-in-from-top-2 duration-400">
                          <StepLabel n={3} active={canProtect || isProtecting} done={isSuccess} text="Encrypt & save" hint="AES-256 password protection applied locally" />
                          <div className="mt-4">
                            <button
                              onClick={handleProtect}
                              disabled={!canProtect}
                              className={cn(
                                "group relative w-full overflow-hidden rounded-xl px-6 py-3.5",
                                "text-sm font-bold text-white tracking-wide",
                                "transition-all duration-200 outline-none",
                                "focus-visible:ring-2 focus-visible:ring-[#10b981]/60",
                                canProtect
                                  ? "bg-[#10b981] hover:bg-[#059669] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] active:scale-[0.99]"
                                  : "cursor-not-allowed bg-muted/60 dark:bg-white/[0.06] text-foreground/25"
                              )}
                            >
                              {canProtect && (
                                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                              )}
                              <span className="relative flex items-center justify-center gap-2.5">
                                {isProtecting ? (
                                  <><Loader2 className="h-4 w-4 animate-spin" />Encrypting…</>
                                ) : (
                                  <>
                                    <Lock className="h-4 w-4" />
                                    Protect PDF
                                    {canProtect && <ArrowRight className="h-4 w-4 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5" />}
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

                {/* Trust bar */}
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
