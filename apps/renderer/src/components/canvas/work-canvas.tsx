"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";

import { getTool } from "@/lib/tools";
import type { RunOutcome } from "@/lib/tools";
import { pickPdf, onPdfDragDrop, type LoadedFile } from "@/lib/file-intake";
import { getPdfMeta } from "@/lib/pdf";
import { useCanvasState } from "@/stores/use-canvas-state";
import { cn } from "@/lib/utils";

type Phase = "empty" | "loaded" | "running" | "done" | "error";

const STEP_SPRING = { type: "spring" as const, stiffness: 420, damping: 34 };

export function WorkCanvas({ toolId }: { toolId: string }) {
  const tool = getTool(toolId);
  const [files, setFiles] = React.useState<LoadedFile[]>([]);
  const [phase, setPhase] = React.useState<Phase>("empty");
  const [result, setResult] = React.useState<RunOutcome | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);

  const setCanvasState = useCanvasState((s) => s.setState);
  const resetCanvasState = useCanvasState((s) => s.reset);

  // Reset everything when the tool changes.
  React.useEffect(() => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setPhase("empty");
    resetCanvasState();
  }, [toolId, resetCanvasState]);

  // Keep StatusStrip in sync with the phase.
  React.useEffect(() => {
    if (phase === "empty") setCanvasState("IDLE");
    else if (phase === "loaded") setCanvasState("LOADED");
    else if (phase === "running") setCanvasState("RUNNING");
    else if (phase === "done") setCanvasState("COMPLETE");
  }, [phase, setCanvasState]);

  if (!tool) {
    return <Centered>Unknown tool.</Centered>;
  }
  if (tool.complex) {
    return (
      <Centered>
        <p className="text-muted-foreground">
          {tool.name} uses a bespoke canvas — wired in a follow-up step.
        </p>
      </Centered>
    );
  }
  if (tool.available === false) {
    return (
      <Centered>
        <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">{tool.name} isn’t wired to the engine yet.</p>
      </Centered>
    );
  }

  const handleFiles = (incoming: LoadedFile[]) => {
    setFiles(tool.multiFile ? incoming : [incoming[0]]);
    setError(null);
    setPhase("loaded");
  };

  const handleRun = async () => {
    if (!files.length) return;
    setPhase("running");
    setError(null);
    setProgress(0);
    const startedAt = performance.now();
    try {
      const outcome = await tool.run({
        files,
        options: {},
        onProgress: (pct) => setProgress(pct),
      });
      setProgress(100);
      // Spec: 100% + 260ms -> done.
      setTimeout(() => {
        setResult(outcome);
        setPhase("done");
      }, 260);
      void startedAt;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setPhase("empty");
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-6 py-8">
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
            <EmptyDropzone tool={tool} onFiles={handleFiles} />
          </motion.div>
        )}

        {(phase === "loaded" || phase === "running") && (
          <motion.div
            key="flow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={STEP_SPRING}
            className="flex flex-1 flex-col gap-4"
          >
            {/* 1 Document */}
            <StepRow n={1} title="Document" hint="Loaded from disk">
              <DocumentCard files={files} onClear={reset} />
            </StepRow>

            {/* 2 Options (minimal — Step 12 renders the primitives) */}
            <StepRow n={2} title="Options" hint="Per-tool">
              <div className="rounded-lg border border-hairline bg-surface px-4 py-3 text-[13px] text-muted-foreground">
                {tool.options.length ? "Options panel (step 12)" : "No options for this tool."}
              </div>
            </StepRow>

            {/* 3 Run / Running */}
            <StepRow n={3} title={phase === "running" ? "Running" : "Run"} hint="On-device">
              {phase === "running" ? (
                <ProgressCard verb={tool.runningVerb} progress={progress} />
              ) : (
                <RunButton cta={tool.cta} disabled={!files.length} onClick={handleRun} />
              )}
            </StepRow>
          </motion.div>
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
            <DoneCard toolName={tool.name} result={result} onAnother={reset} />
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
            <ErrorCard message={error ?? "Something went wrong"} onRetry={reset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Numbered step chrome ─────────────────────────────────────────────────────

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
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ember/60 text-[11px] font-semibold text-ember">
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

// ── Minimal phase bodies (Steps 11–14 polish these) ──────────────────────────

function EmptyDropzone({
  tool,
  onFiles,
}: {
  tool: { accepts: string; cta: string; multiFile?: boolean };
  onFiles: (files: LoadedFile[]) => void;
}) {
  const [hovering, setHovering] = React.useState(false);
  React.useEffect(() => {
    return onPdfDragDrop({
      onOver: () => setHovering(true),
      onLeave: () => setHovering(false),
      onDrop: (files) => {
        setHovering(false);
        onFiles(files);
      },
    });
  }, [onFiles]);

  return (
    <button
      type="button"
      onClick={() => pickPdf(!!tool.multiFile).then((f) => f && onFiles(f))}
      className={cn(
        "flex w-full flex-col items-center rounded-xl border border-dashed bg-surface/60 px-6 py-16 text-center transition-colors",
        hovering ? "border-ember bg-ember-soft/40" : "border-hairline hover:border-ember/50"
      )}
    >
      <motion.div
        animate={hovering ? { y: -4, scale: 1.04 } : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ember-soft"
      >
        <Upload className="h-7 w-7 text-ember" />
      </motion.div>
      <p className="text-[15px] font-medium">Drop your PDF here</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        or <span className="text-ember">browse your files</span>
      </p>
      <span className="mt-4 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-muted-foreground">
        {tool.accepts}
      </span>
    </button>
  );
}

function DocumentCard({
  files,
  onClear,
}: {
  files: LoadedFile[];
  onClear: () => void;
}) {
  const f = files[0];
  const [meta, setMeta] = React.useState<{ pages: number | null; encrypted: boolean }>({
    pages: null,
    encrypted: false,
  });
  React.useEffect(() => {
    let cancelled = false;
    if (f) getPdfMeta(f.buffer).then((m) => !cancelled && setMeta(m));
    return () => {
      cancelled = true;
    };
  }, [f]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-hairline bg-surface px-4 py-3">
      <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md bg-surface-raised">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold">{f?.name ?? "document.pdf"}</p>
          {meta.encrypted && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ember-soft px-2 py-0.5 text-[10px] font-medium text-ember">
              <Lock className="h-3 w-3" /> AES-256
            </span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground">
          {meta.pages ? `${meta.pages} ${meta.pages === 1 ? "page" : "pages"} · ` : ""}
          {files.length > 1 ? `${files.length} files` : fmtSize(f?.buffer.byteLength ?? 0)}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function RunButton({
  cta,
  disabled,
  onClick,
}: {
  cta: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-ember px-6 py-3 text-[14px] font-semibold text-ember-foreground transition-transform hover:brightness-105 active:scale-[0.995] disabled:opacity-40"
    >
      {cta}
    </button>
  );
}

function ProgressCard({ verb, progress }: { verb: string; progress: number }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface px-4 py-4">
      <div className="mb-2 flex items-center justify-between text-[13px]">
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-ember" />
          {verb}…
        </span>
        <span className="tnum font-semibold">{progress}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-ember transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Working on-device · nothing is being uploaded
      </p>
    </div>
  );
}

function DoneCard({
  toolName,
  result,
  onAnother,
}: {
  toolName: string;
  result: RunOutcome;
  onAnother: () => void;
}) {
  const name = result.kind === "file" ? result.fileName : `${result.files.length} files`;
  const size =
    result.kind === "file"
      ? approxBase64Size(result.dataB64)
      : result.files.reduce((a, f) => a + approxBase64Size(f.dataB64), 0);
  return (
    <div className="w-full rounded-xl border border-hairline bg-surface p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ember-soft">
        <CheckCircle2 className="h-6 w-6 text-ember" />
      </div>
      <h2 className="text-[16px] font-bold">{toolName} complete</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {name} · {fmtSize(size)}
      </p>
      <button
        type="button"
        onClick={onAnother}
        className="mt-5 rounded-lg border border-hairline px-4 py-2 text-[13px] hover:bg-surface-raised"
      >
        Do another
      </button>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="w-full rounded-xl border border-destructive/40 bg-surface p-6">
      <div className="mb-2 flex items-center gap-2 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <h2 className="text-[15px] font-semibold">Couldn’t complete</h2>
      </div>
      <p className="text-[13px] text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-hairline px-4 py-2 text-[13px] hover:bg-surface-raised"
      >
        Try again
      </button>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center text-center">{children}</div>;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function approxBase64Size(b64: string): number {
  return Math.floor((b64.length * 3) / 4);
}
