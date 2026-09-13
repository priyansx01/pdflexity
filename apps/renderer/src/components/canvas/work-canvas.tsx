"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, Lock, ChevronRight, Download, FolderOpen } from "lucide-react";

import { basename } from "@tauri-apps/api/path";
import { getTool, ROTATION_DEGREES } from "@/lib/tools";
import type { RunOutcome } from "@/lib/tools";
import { openPdf, onFileDrop, savePdfAs, savePdfAuto, revealInFolder, type LoadedFile } from "@/lib/desktop";
import { getPdfMeta, renderThumbnail } from "@/lib/pdf";
import { useCanvasState } from "@/stores/use-canvas-state";
import { useWorkspaceStore, emptySession } from "@/stores/use-workspace-store";
import { useRecent } from "@/stores/use-recent-store";
import { OptionsPanel, defaultOptionValues } from "@/components/canvas/options-panel";
import { DocumentList } from "@/components/canvas/document-list";
import { cn } from "@/lib/utils";

type Phase = "empty" | "loaded" | "running" | "done" | "error";

const STEP_SPRING = { type: "spring" as const, stiffness: 420, damping: 34 };

export function WorkCanvas({ toolId }: { toolId: string }) {
  const tool = getTool(toolId);

  // Per-tool session lives in a module-global store so the loaded files and a
  // running job survive navigating to another tool (and back).
  const session = useWorkspaceStore((x) => x.sessions[toolId]);
  const ensureSession = useWorkspaceStore((x) => x.ensureSession);
  const addFiles = useWorkspaceStore((x) => x.addFiles);
  const removeFileAction = useWorkspaceStore((x) => x.removeFile);
  const reorderFiles = useWorkspaceStore((x) => x.reorderFiles);
  const setOptionsAction = useWorkspaceStore((x) => x.setOptions);
  const setErrorAction = useWorkspaceStore((x) => x.setError);
  const runAction = useWorkspaceStore((x) => x.run);
  const resetAction = useWorkspaceStore((x) => x.reset);

  // Fallback for the first render, before the ensureSession effect below runs.
  const s = session ?? emptySession(defaultOptionValues(tool?.options ?? []));
  const { files, phase, result, error, progress, options, durationMs } = s;

  const setCanvasState = useCanvasState((x) => x.setState);

  React.useEffect(() => {
    ensureSession(toolId);
  }, [toolId, ensureSession]);

  // Keep StatusStrip in sync with the phase.
  React.useEffect(() => {
    if (phase === "empty" || phase === "error") setCanvasState("IDLE");
    else if (phase === "loaded") setCanvasState("LOADED");
    else if (phase === "running") setCanvasState("RUNNING");
    else if (phase === "done") setCanvasState("COMPLETE");
  }, [phase, setCanvasState]);

  const hasOptions = !!tool && tool.options.length > 0;
  const runStep = hasOptions ? 3 : 2;
  const isMulti = !!tool?.multiFile;
  const canRun = isMulti ? files.length >= 2 : files.length >= 1;

  // Live preview: tools with previewRotateOption rotate the page-1 thumbnail
  // as the user picks an angle (mirrors the lossless /Rotate output).
  const previewDeg =
    tool?.previewRotateOption != null
      ? ROTATION_DEGREES[String(options[tool.previewRotateOption] ?? "")] ?? 0
      : 0;

  const handleFiles = React.useCallback(
    (incoming: LoadedFile[]) => addFiles(toolId, incoming, isMulti),
    [addFiles, toolId, isMulti]
  );

  const handlePickError = React.useCallback(
    (e: unknown) => setErrorAction(toolId, e instanceof Error ? e.message : String(e)),
    [setErrorAction, toolId]
  );

  const handleRemoveFile = React.useCallback(
    (index: number) => removeFileAction(toolId, index),
    [removeFileAction, toolId]
  );

  const handleReorder = React.useCallback(
    (next: LoadedFile[]) => reorderFiles(toolId, next),
    [reorderFiles, toolId]
  );

  const handleAddMore = React.useCallback(() => {
    openPdf(true).then((f) => f && handleFiles(f)).catch(handlePickError);
  }, [handleFiles, handlePickError]);

  // OS drops anywhere on the canvas add files (empty or loaded state).
  const filesRef = React.useRef(handleFiles);
  filesRef.current = handleFiles;
  const dropEnabled = phase === "empty" || phase === "loaded";
  React.useEffect(() => {
    if (!dropEnabled) return;
    return onFileDrop({ onDrop: (fs) => filesRef.current(fs) });
  }, [dropEnabled]);

  // Early returns come after all hooks so hook order stays stable per render.
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
    const Icon = tool.icon;
    return (
      <Centered>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-emerald/25 bg-emerald-soft">
          <Icon className="h-7 w-7 text-emerald" />
        </div>
        <h2 className="mt-4 text-[16px] font-bold">{tool.name}</h2>
        <p className="mt-1 max-w-[320px] text-[13px] text-muted-foreground">
          {tool.subtitle} — this tool is on the roadmap and needs engine support
          first. Watch the repo for updates.
        </p>
      </Centered>
    );
  }

  // The run itself lives in the workspace store so it keeps going (and settles
  // to "done") even if the user navigates away from this tool mid-run.
  const handleRun = () => runAction(toolId);
  const reset = () => resetAction(toolId);

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
            <EmptyDropzone
              tool={tool}
              onFiles={handleFiles}
              onPickError={handlePickError}
            />
          </motion.div>
        )}

        {(phase === "loaded" || phase === "running") && (
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
            {/* 1 Document */}
            <StepRow
              n={1}
              title="Document"
              hint={isMulti ? `${files.length} loaded — drag to set order` : "Loaded from disk"}
            >
              {isMulti ? (
                <DocumentList
                  files={files}
                  onReorder={handleReorder}
                  onRemove={handleRemoveFile}
                  onAddMore={handleAddMore}
                  disabled={phase === "running"}
                />
              ) : (
                <DocumentCard files={files} onClear={reset} rotationDeg={previewDeg} />
              )}
            </StepRow>

            {/* 2 Options (data-driven primitives) */}
            {hasOptions && (
              <StepRow n={2} title="Options" hint="Per-tool">
                <OptionsPanel
                  options={tool.options}
                  values={options}
                  onChange={(v) => setOptionsAction(toolId, v)}
                  dimmed={phase === "running"}
                />
              </StepRow>
            )}

            {/* Validation hint */}
            {phase === "loaded" && isMulti && files.length < 2 && (
              <p className="text-[12px] text-muted-foreground">
                Add at least {2 - files.length} more PDF{2 - files.length === 1 ? "" : "s"} to run this tool.
              </p>
            )}

            {/* Surface intake / run errors */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-surface px-3 py-2 text-[12px] text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <span className="min-w-0 truncate">{error}</span>
              </div>
            )}

            {/* Run / Running */}
            <StepRow n={runStep} title={phase === "running" ? "Running" : "Run"} hint="On-device">
              {phase === "running" ? (
                <ProgressCard verb={tool.runningVerb} progress={progress} />
              ) : (
                <RunButton cta={tool.cta} disabled={!canRun} />
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
            <DoneCard toolId={toolId} toolName={tool.name} engine={tool.engine} durationMs={durationMs} result={result} onAnother={reset} />
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

// ── Minimal phase bodies (Steps 11–14 polish these) ──────────────────────────

function EmptyDropzone({
  tool,
  onFiles,
  onPickError,
}: {
  tool: { accepts: string; cta: string; multiFile?: boolean };
  onFiles: (files: LoadedFile[]) => void;
  onPickError: (e: unknown) => void;
}) {
  const [hovering, setHovering] = React.useState(false);
  React.useEffect(() => {
    // Hover visuals only — WorkCanvas owns the drop handling.
    return onFileDrop({
      onOver: () => setHovering(true),
      onLeave: () => setHovering(false),
      onDrop: () => setHovering(false),
    });
  }, []);

  const handleBrowse = () => {
    openPdf(!!tool.multiFile)
      .then((f) => f && onFiles(f))
      .catch(onPickError);
  };

  return (
    <button
      type="button"
      onClick={handleBrowse}
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
        <Upload className="h-7 w-7 text-emerald" />
      </motion.div>
      <p className="text-[15px] font-medium">Drop your PDF here</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        or <span className="text-emerald">open a file</span>
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
  rotationDeg = 0,
}: {
  files: LoadedFile[];
  onClear: () => void;
  rotationDeg?: number;
}) {
  const f = files[0];
  const [meta, setMeta] = React.useState<{ pages: number | null; encrypted: boolean }>({
    pages: null,
    encrypted: false,
  });
  const [thumb, setThumb] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (f) {
      getPdfMeta(f.buffer).then((m) => !cancelled && setMeta(m));
      renderThumbnail(f.buffer, 224).then((t) => !cancelled && setThumb(t));
    }
    return () => {
      cancelled = true;
    };
  }, [f]);

  const empty = (f?.buffer.byteLength ?? 0) === 0;
  const quarterTurn = rotationDeg % 180 !== 0;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-hairline bg-surface px-4 py-3.5">
      {/* Large page-1 preview — mirrors the chosen rotation live */}
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface-raised",
          quarterTurn ? "h-24 w-32" : "h-32 w-24"
        )}
      >
        {thumb ? (
          <motion.img
            initial={false}
            animate={{ rotate: rotationDeg }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            src={thumb}
            alt={`Page 1 of ${f?.name ?? "document"}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground/60" />
        )}
        {meta.pages != null && meta.pages > 1 && (
          <span className="absolute bottom-1 right-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
            1/{meta.pages}
          </span>
        )}
        {rotationDeg !== 0 && (
          <motion.span
            key={rotationDeg}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1 top-1 rounded bg-emerald-soft px-1.5 py-0.5 text-[10px] font-semibold text-emerald"
          >
            +{rotationDeg}°
          </motion.span>
        )}
      </div>

      {/* Meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{f?.name ?? "document.pdf"}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {meta.pages ? `${meta.pages} ${meta.pages === 1 ? "page" : "pages"} · ` : ""}
          {fmtSize(f?.buffer.byteLength ?? 0)}
        </p>
        {meta.encrypted && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-soft px-2 py-0.5 text-[10px] font-medium text-emerald">
            <Lock className="h-3 w-3" /> AES-256 encrypted
          </span>
        )}
        {empty && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
            Empty file — reload the PDF
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

function RunButton({
  cta,
  disabled,
}: {
  cta: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="group flex w-full items-center justify-center gap-2 rounded-lg bg-emerald px-6 py-3 text-[14px] font-semibold text-emerald-foreground transition-transform hover:brightness-105 active:scale-[0.995] disabled:opacity-40"
    >
      {cta}
      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function ProgressCard({ verb, progress }: { verb: string; progress: number }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface px-4 py-4">
      <div className="mb-2 flex items-center justify-between text-[13px]">
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-emerald" />
          {verb}…
        </span>
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
  );
}

function DoneCard({
  toolId,
  toolName,
  engine,
  durationMs,
  result,
  onAnother,
}: {
  toolId: string;
  toolName: string;
  engine: string;
  durationMs: number;
  result: RunOutcome;
  onAnother: () => void;
}) {
  const [savedPaths, setSavedPaths] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const name = result.kind === "file" ? result.fileName : `${result.files.length} files`;
  const size =
    result.kind === "file"
      ? approxBase64Size(result.dataB64)
      : result.files.reduce((a, f) => a + approxBase64Size(f.dataB64), 0);

  // Record in Recent only once something is actually on disk.
  const recordSaved = React.useCallback(
    async (paths: string[]) => {
      if (!paths.length) return;
      const { add } = useRecent.getState();
      for (const p of paths) {
        add({ toolId, fileName: await basename(p), path: p });
      }
    },
    [toolId],
  );

  /** One-click save: straight to the configured folder (or dialog fallback). */
  const handleSave = async () => {
    setSaving(true);
    try {
      const paths: string[] = [];
      if (result.kind === "file") {
        const p = await savePdfAuto(result.fileName, result.dataB64);
        if (p) paths.push(p);
      } else {
        for (const f of result.files) {
          const p = await savePdfAuto(f.name, f.dataB64);
          if (p) paths.push(p);
        }
      }
      setSavedPaths(paths);
      void recordSaved(paths);
    } catch {
      /* ignore — the dialog fallback surfaces its own errors */
    } finally {
      setSaving(false);
    }
  };

  /** Always-open dialog save for picking a different location. */
  const handleSaveAs = async () => {
    try {
      const paths: string[] = [];
      if (result.kind === "file") {
        const p = await savePdfAs(result.fileName, result.dataB64);
        if (p) paths.push(p);
      } else {
        for (const f of result.files) {
          const p = await savePdfAs(f.name, f.dataB64);
          if (p) paths.push(p);
        }
      }
      setSavedPaths(paths);
      void recordSaved(paths);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="w-full rounded-xl border border-hairline bg-surface p-6">
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-soft"
        >
          <CheckCircle2 className="h-6 w-6 text-emerald" />
        </motion.div>
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold">{toolName} complete</h2>
          <p className="truncate text-[13px] text-muted-foreground">
            {name} · {fmtSize(size)}
          </p>
        </div>
      </div>

      {/* Stat grid */}
      <div className="mt-5 grid grid-cols-3 divide-x divide-hairline overflow-hidden rounded-lg border border-hairline">
        <Stat label="Duration" value={durationMs > 0 ? `${(durationMs / 1000).toFixed(1)}s` : "—"} />
        <Stat label="Engine" value={engine} />
        <Stat label="Uploads" value="0" />
      </div>

      {/* Saved location feedback */}
      {savedPaths.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-hairline bg-surface-raised/40 px-3 py-2 text-[12px] text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald" />
          <span className="min-w-0 flex-1 truncate" title={savedPaths.join("\n")}>
            {savedPaths.length === 1 ? savedPaths[0] : `${savedPaths.length} files saved`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-emerald px-4 py-2 text-[13px] font-semibold text-emerald-foreground hover:brightness-105 disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> {saving ? "Saving…" : savedPaths.length ? "Save again" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleSaveAs}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg border border-hairline px-4 py-2 text-[13px] hover:bg-surface-raised disabled:opacity-40"
        >
          Save as…
        </button>
        <button
          type="button"
          disabled={!savedPaths.length}
          onClick={() => savedPaths.length && revealInFolder(savedPaths[savedPaths.length - 1])}
          className="flex items-center gap-1.5 rounded-lg border border-hairline px-4 py-2 text-[13px] hover:bg-surface-raised disabled:opacity-40"
        >
          <FolderOpen className="h-4 w-4" /> Reveal in folder
        </button>
        <button
          type="button"
          onClick={onAnother}
          className="rounded-lg px-4 py-2 text-[13px] text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        >
          Do another
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-raised/40 px-3 py-2.5">
      <p className="label-caps">{label}</p>
      <p className="tnum mt-0.5 truncate text-[13px] font-semibold">{value}</p>
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
