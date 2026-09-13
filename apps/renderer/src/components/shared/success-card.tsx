"use client";

import * as React from "react";
import { CheckCircle2, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared success card used by the bespoke complex-tool canvases (split /
 * organize / sign). Graphite-styled, superset API so each caller can tailor the
 * copy while sharing one component.
 *
 * When `onSave` is provided the primary action saves through the app's
 * desktop adapter (direct-to-folder / dialog fallback) instead of a browser
 * download; callers record the returned path in Recent themselves.
 */
interface SuccessCardProps {
  fileName: string;
  downloadUrl: string;
  onReset: () => void;
  title?: string;
  description?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
  className?: string;
  onSave?: () => Promise<string | null>;
}

export function SuccessCard({
  fileName,
  downloadUrl,
  onReset,
  title = "Complete",
  description = "Your file is ready.",
  primaryActionText = "Save",
  secondaryActionText = "Start over",
  className,
  onSave,
}: SuccessCardProps) {
  const [saving, setSaving] = React.useState(false);

  const handleSave = React.useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  const primary = onSave ? (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      className="flex items-center justify-center gap-2 rounded-lg bg-emerald px-5 py-2.5 text-sm font-semibold text-emerald-foreground transition hover:brightness-105 disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {saving ? "Saving…" : primaryActionText}
    </button>
  ) : (
    <a
      href={downloadUrl}
      download={fileName}
      className="flex items-center justify-center gap-2 rounded-lg bg-emerald px-5 py-2.5 text-sm font-semibold text-emerald-foreground transition hover:brightness-105"
    >
      <Download className="h-4 w-4" />
      {primaryActionText}
    </a>
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 rounded-xl border border-hairline bg-surface p-8 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-soft">
        <CheckCircle2 className="h-8 w-8 text-emerald" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mx-auto max-w-[320px] text-sm text-muted-foreground">{description}</p>
        <p className="truncate text-xs text-muted-foreground/70">{fileName}</p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        {primary}
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-lg border border-hairline px-5 py-2.5 text-sm transition hover:bg-surface-raised"
        >
          <RefreshCw className="h-4 w-4" />
          {secondaryActionText}
        </button>
      </div>
    </div>
  );
}
