"use client";

import { motion } from "motion/react";
import { ScanSearch, Download, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstallGateProps {
  installing: boolean;
  phase: "download" | "extract";
  pct: number;
  error: string | null;
  onInstall: () => void;
}

/**
 * Shown on the OCR page when the OCR feature pack isn't installed. OCR ships as
 * an optional download (PaddleOCR is large and platform-specific), so the user
 * installs it once on first use — VS Code-extension style.
 */
export function InstallGate({ installing, phase, pct, error, onInstall }: InstallGateProps) {
  const phaseLabel = phase === "download" ? "Downloading" : "Installing";

  return (
    <div className="flex h-full items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald/20 bg-emerald/10">
          <ScanSearch className="h-7 w-7 text-emerald" />
        </div>

        <h2 className="text-lg font-semibold text-foreground">Install OCR</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          OCR runs a local text-recognition engine (PaddleOCR). It&apos;s an optional,
          one-time download of about 1–2 GB — everything still processes on your device.
        </p>

        {installing ? (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald" />
                {phaseLabel}…
              </span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-emerald"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground/60">
              You can keep working in other tools while this installs.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onInstall}
            className={cn(
              "mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald px-5 py-2.5",
              "text-sm font-semibold text-emerald-foreground transition hover:brightness-105"
            )}
          >
            <Download className="h-4 w-4" />
            Install OCR
          </button>
        )}

        {error && !installing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
