"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileText, Lock, X } from "lucide-react";

import { openPdf, onFileDrop } from "@/lib/desktop";
import { getPdfMeta, renderThumbnail } from "@/lib/pdf";
import { useCanvasState } from "@/stores/use-canvas-state";
import { cn } from "@/lib/utils";

import type { LoadedDoc } from "@/features/compress/types";
import { PresetPanel } from "@/features/compress/components/preset-panel";
import { CompressResultCard } from "@/features/compress/components/result-card";
import { useCompress } from "@/features/compress/hooks/use-compress";
import { DEFAULT_SETTINGS } from "@/features/compress/constants";

const STEP_SPRING = { type: "spring" as const, stiffness: 420, damping: 34 };

export default function CompressPage() {
  const [doc, setDoc] = React.useState<LoadedDoc | null>(null);
  const [phase, setPhase] = React.useState<"empty" | "loaded" | "running" | "done" | "error">("empty");
  const [error, setError] = React.useState<string | null>(null);
  const setCanvasState = useCanvasState((s) => s.setState);
  const resetCanvasState = useCanvasState((s) => s.reset);

  const { compress, progress, stage, setStage, stageLabel } = useCompress();

  // Reset canvas state marker.
  React.useEffect(() => {
    resetCanvasState();
  }, [resetCanvasState]);

  React.useEffect(() => {
    if (phase === "empty") setCanvasState("IDLE");
    else if (phase === "loaded") setCanvasState("LOADED");
    else if (phase === "running") setCanvasState("RUNNING");
    else setCanvasState("COMPLETE");
  }, [phase, setCanvasState]);

  const handleFiles = React.useCallback(async (files: { buffer: ArrayBuffer; name: string }[]) => {
    const f = files[0];
    if (!f) return;
    const meta = await getPdfMeta(f.buffer);
    setDoc({ buffer: f.buffer, name: f.name, size: f.buffer.byteLength, pages: meta.pages });
    setError(null);
    setPhase("loaded");
  }, []);

  // OS drops anywhere on the canvas.
  const filesRef = React.useRef(handleFiles);
  filesRef.current = handleFiles;
  React.useEffect(() => {
    if (phase === "running") return;
    return onFileDrop({ onDrop: (fs) => filesRef.current(fs) });
  }, [phase]);

  const [settings, setSettings] = React.useState(DEFAULT_SETTINGS);
  const [result, setResult] = React.useState<Awaited<ReturnType<typeof compress>> | null>(null);

  const handleRun = async () => {
    if (!doc) return;
    setPhase("running");
    try {
      const r = await compress(doc, settings, setStage);
      setResult(r);
      setTimeout(() => setPhase("done"), 120);
    } catch {
      setPhase("error");
    }
  };

  const reset = () => {
    setDoc(null);
    setResult(null);
    setError(null);
    setPhase("empty");
    resetCanvasState();
  };

  return (
    <div
      className="mx-auto flex h-full w-full max-w-3xl flex-col px-6 py-8"
      onKeyDown={(e) => {
        if (e.key === "Escape" && phase === "loaded") reset();
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {phase === "empty" && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={STEP_SPRING}
            className="flex flex-1 items-center"
          >
            <EmptyZone onFiles={handleFiles} />
          </motion.div>
        )}

        {(phase === "loaded" || phase === "running") && doc && (
          <motion.form
            key="flow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={STEP_SPRING}
            className="flex flex-1 flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (phase === "loaded") handleRun();
            }}
          >
            <StepRow n={1} title="Document" hint="Loaded from disk">
              <DocCard doc={doc} onClear={reset} />
            </StepRow>

            <StepRow n={2} title="Compression" hint="Pick a level">
              <PresetPanel
                settings={settings}
                onChange={setSettings}
                originalBytes={doc.size}
                disabled={phase === "running"}
              />
            </StepRow>

            <StepRow n={3} title={phase === "running" ? "Running" : "Run"} hint="On-device">
              {phase === "running" ? (
                <div className="rounded-lg border border-hairline bg-surface px-4 py-4">
                  <div className="mb-2 flex items-center justify-between text-[13px]">
                    <span className="text-foreground">{stageLabel(stage)}</span>
                    <span className="tnum font-semibold">{progress}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full rounded-full bg-emerald transition-[width] duration-[120ms] ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Working on-device · nothing is being uploaded
                  </p>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={!doc}
                  className="flex w-full items-center justify-center rounded-lg bg-emerald px-6 py-3 text-[14px] font-semibold text-emerald-foreground transition-transform hover:brightness-105 active:scale-[0.995] disabled:opacity-40"
                >
                  Compress PDF
                </button>
              )}
            </StepRow>
          </motion.form>
        )}

        {phase === "done" && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={STEP_SPRING}
            className="flex flex-1 items-center"
          >
            <CompressResultCard result={result} onAnother={reset} />
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={STEP_SPRING}
            className="flex flex-1 items-center"
          >
            <div className="w-full rounded-xl border border-destructive/40 bg-surface p-6">
              <h2 className="text-[15px] font-semibold text-destructive">Couldn’t complete</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {error ?? "Compression failed. Please try again."}
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 rounded-lg border border-hairline px-4 py-2 text-[13px] hover:bg-surface-raised"
              >
                Try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepRow({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald/60 text-[11px] font-semibold text-emerald">
          {n}
        </span>
        <h2 className="text-[14px] font-semibold">{title}</h2>
        <span className="h-px flex-1 bg-hairline" aria-hidden />
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyZone({ onFiles }: { onFiles: (f: { buffer: ArrayBuffer; name: string }[]) => void }) {
  const [hovering, setHovering] = React.useState(false);
  React.useEffect(() => {
    return onFileDrop({
      onOver: () => setHovering(true),
      onLeave: () => setHovering(false),
      onDrop: () => setHovering(false),
    });
  }, []);
  return (
    <button
      type="button"
      onClick={() => openPdf(false).then((f) => f && onFiles(f)).catch(() => {})}
      className={cn(
        "flex w-full flex-col items-center rounded-xl border border-dashed bg-surface/60 px-6 py-16 text-center transition-colors",
        hovering ? "border-emerald bg-emerald-soft/40" : "border-hairline hover:border-emerald/50"
      )}
    >
      <motion.div
        animate={hovering ? { y: -4, scale: 1.04 } : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-soft"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-emerald" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 9V6a2 2 0 0 1 2-2h2M4 15v3a2 2 0 0 0 2 2h2M20 9V6a2 2 0 0 0-2-2h-2M20 15v3a2 2 0 0 1-2 2h-2" strokeLinecap="round" />
          <path d="M9 12h6" strokeLinecap="round" />
        </svg>
      </motion.div>
      <p className="text-[15px] font-medium">Drop your PDF here</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        or <span className="text-emerald">browse your files</span>
      </p>
      <span className="mt-4 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-muted-foreground">
        PDF only · all sizes
      </span>
    </button>
  );
}

function DocCard({ doc, onClear }: { doc: LoadedDoc; onClear: () => void }) {
  const [thumb, setThumb] = React.useState<string | null>(null);
  const [encrypted, setEncrypted] = React.useState(false);
  React.useEffect(() => {
    let c = false;
    renderThumbnail(doc.buffer, 224).then((t) => !c && setThumb(t));
    getPdfMeta(doc.buffer).then((m) => !c && setEncrypted(m.encrypted));
    return () => {
      c = true;
    };
  }, [doc]);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-hairline bg-surface px-4 py-3.5">
      <div className="relative flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface-raised">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={`Page 1 of ${doc.name}`} className="h-full w-full object-contain" />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground/60" />
        )}
        {doc.pages != null && doc.pages > 1 && (
          <span className="absolute bottom-1 right-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
            1/{doc.pages}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{doc.name}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {doc.pages ? `${doc.pages} ${doc.pages === 1 ? "page" : "pages"} · ` : ""}
          {fmt(doc.size)}
        </p>
        {encrypted && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-soft px-2 py-0.5 text-[10px] font-medium text-emerald">
            <Lock className="h-3 w-3" /> AES-256 encrypted
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
