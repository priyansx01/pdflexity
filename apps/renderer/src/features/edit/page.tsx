"use client";

import * as React from "react";
import { basename } from "@tauri-apps/api/path";
import { PenSquare, UploadCloud, Download, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { getElectronAPI, type EditPage as EditPageModel } from "@/lib/backend-types";
import { getErrorMessage } from "@/lib/utils";
import { savePdfAuto } from "@/lib/desktop";
import { useRecent } from "@/stores/use-recent-store";
import { useEditStore } from "@/stores/use-edit-store";
import { useFeatureInstall } from "@/features/optimize/ocr/hooks/use-feature-install";
import { InstallGate } from "@/features/optimize/ocr/components/install-gate";
import { EditorCanvas } from "./components/editor-canvas";

export function EditPage() {
  const store = useEditStore();
  const ocrFeature = useFeatureInstall("ocr"); // fitz lives in the OCR pack
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // NOTE: the document is intentionally kept when leaving the tool (like the
  // other persisted tools) — resetting on unmount raced with React StrictMode's
  // double-mount and wiped a handed-off doc. Use the "New" button to clear.

  // Extract the real text layer via fitz (crisp fonts/positions/spacing). Only
  // fall back to OCR-recognized text (fallbackPages) when the PDF has no text
  // layer of its own — i.e. a scan.
  const openBuffer = React.useCallback(
    async (name: string, buffer: ArrayBuffer, fallbackPages?: EditPageModel[]) => {
      const api = getElectronAPI()?.edit;
      if (!api) return;
      useEditStore.getState().setLoading();
      try {
        const res = await api.extract(buffer);
        if (res.success) {
          const total = res.data.pages.reduce((n, p) => n + p.blocks.length, 0);
          const pages = total > 0 ? res.data.pages : (fallbackPages ?? res.data.pages);
          useEditStore.getState().setDocument(name, buffer, pages);
        } else if (fallbackPages?.length) {
          useEditStore.getState().setDocument(name, buffer, fallbackPages);
        } else {
          useEditStore.getState().setError(res.error || "Couldn't read the PDF.");
        }
      } catch (e) {
        if (fallbackPages?.length) {
          useEditStore.getState().setDocument(name, buffer, fallbackPages);
        } else {
          useEditStore.getState().setError(getErrorMessage(e) || "Couldn't read the PDF.");
        }
      }
    },
    []
  );

  const handleFile = React.useCallback(
    async (file: File) => openBuffer(file.name, await file.arrayBuffer()),
    [openBuffer]
  );

  // A document handed off from another tool (e.g. OCR "Edit") auto-loads here.
  React.useEffect(() => {
    const pending = useEditStore.getState().pendingOpen;
    if (pending && useEditStore.getState().step === "idle") {
      useEditStore.getState().clearPendingOpen();
      // Prefer the crisp fitz text layer; use OCR's recognized text only as a
      // fallback for scans that have no text layer of their own.
      openBuffer(pending.name, pending.buffer, pending.pages);
    }
  }, [openBuffer]);

  const handleSave = React.useCallback(async () => {
    const api = getElectronAPI()?.edit;
    const { pdfBytes, fileName, collectEdits } = useEditStore.getState();
    if (!api || !pdfBytes || !fileName) return;
    setSaving(true);
    try {
      const res = await api.apply(pdfBytes, fileName, collectEdits());
      if (res.success) {
        const saved = await savePdfAuto(`${fileName.replace(/\.pdf$/i, "")}-edited.pdf`, res.data);
        if (saved) {
          useRecent.getState().add({ toolId: "edit", fileName: await basename(saved), path: saved });
        }
      } else {
        useEditStore.getState().setError(res.error || "Save failed.");
      }
    } catch (e) {
      useEditStore.getState().setError(getErrorMessage(e) || "Save failed.");
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Install gate (fitz pack) ──
  if (ocrFeature.installed === false) {
    return (
      <div className="flex h-full flex-col">
        <Header />
        <InstallGate
          installing={ocrFeature.installing}
          phase={ocrFeature.phase}
          pct={ocrFeature.pct}
          error={ocrFeature.error}
          onInstall={ocrFeature.install}
        />
      </div>
    );
  }

  // ── Upload screen ──
  if (store.step === "idle" || store.step === "loading") {
    return (
      <div className="flex h-full flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-soft">
              <PenSquare className="h-7 w-7 text-emerald" />
            </div>
            <h2 className="text-lg font-semibold">Edit a PDF</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Open a PDF to edit its text directly — change words, font size, color, and style, then save.
            </p>
            {store.step === "loading" ? (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-emerald" /> Reading document…
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald px-5 py-2.5 text-sm font-semibold text-emerald-foreground transition hover:brightness-105"
              >
                <UploadCloud className="h-4 w-4" /> Open PDF
              </button>
            )}
            {store.error && <p className="mt-3 text-[12px] text-red-400">{store.error}</p>}
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Editor ──
  const hasEdits = store.pages.some((p) => p.blocks.some((b) => b.edited));
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-surface/50 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <PenSquare className="h-4 w-4 text-emerald shrink-0" />
          <span className="truncate text-sm font-medium">{store.fileName}</span>
        </div>

        <div className="flex items-center gap-1">
          <IconBtn onClick={() => store.setCurrentPage(Math.max(1, store.currentPage - 1))} disabled={store.currentPage <= 1} title="Previous page"><ChevronLeft className="h-4 w-4" /></IconBtn>
          <span className="min-w-[64px] text-center text-xs tabular-nums text-muted-foreground">{store.currentPage} / {store.pages.length}</span>
          <IconBtn onClick={() => store.setCurrentPage(Math.min(store.pages.length, store.currentPage + 1))} disabled={store.currentPage >= store.pages.length} title="Next page"><ChevronRight className="h-4 w-4" /></IconBtn>
          <div className="mx-2 h-4 w-px bg-hairline" />
          <IconBtn onClick={() => store.setZoom(store.zoom - 25)} title="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></IconBtn>
          <span className="min-w-[42px] text-center text-xs tabular-nums text-muted-foreground">{store.zoom}%</span>
          <IconBtn onClick={() => store.setZoom(store.zoom + 25)} title="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></IconBtn>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => store.reset()} className="flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-surface-raised hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> New
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !hasEdits}
            className="flex items-center gap-1.5 rounded-lg bg-emerald px-3 py-1.5 text-xs font-semibold text-emerald-foreground shadow-lg shadow-emerald/20 transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
            title={hasEdits ? "Save the edited PDF" : "Make an edit to enable saving"}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : "Save PDF"}
          </button>
        </div>
      </div>

      {store.error && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-1.5 text-[12px] text-red-400">{store.error}</div>
      )}

      <div className="min-h-0 flex-1"><EditorCanvas /></div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-hairline px-6 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-soft">
        <PenSquare className="h-4 w-4 text-emerald" />
      </div>
      <div>
        <h1 className="text-[15px] font-bold tracking-tight">Edit PDF</h1>
        <p className="text-[11px] text-muted-foreground/60">Edit text directly in the document · Local engine</p>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, disabled, title }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-surface-raised hover:text-foreground disabled:opacity-40">
      {children}
    </button>
  );
}
