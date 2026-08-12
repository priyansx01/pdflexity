"use client";

import { CheckCircle2, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared success card used by the bespoke complex-tool canvases (split /
 * organize / sign). Graphite-styled, superset API so each caller can tailor the
 * copy while sharing one component.
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
}

export function SuccessCard({
  fileName,
  downloadUrl,
  onReset,
  title = "Complete",
  description = "Your file is ready.",
  primaryActionText = "Download",
  secondaryActionText = "Start over",
  className,
}: SuccessCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 rounded-xl border border-hairline bg-surface p-8 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ember-soft">
        <CheckCircle2 className="h-8 w-8 text-ember" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mx-auto max-w-[320px] text-sm text-muted-foreground">{description}</p>
        <p className="truncate text-xs text-muted-foreground/70">{fileName}</p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <a
          href={downloadUrl}
          download={fileName}
          className="flex items-center justify-center gap-2 rounded-lg bg-ember px-5 py-2.5 text-sm font-semibold text-ember-foreground transition hover:brightness-105"
        >
          <Download className="h-4 w-4" />
          {primaryActionText}
        </a>
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
