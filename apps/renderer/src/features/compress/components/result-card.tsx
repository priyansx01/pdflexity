"use client";

import * as React from "react";
import { motion } from "motion/react";
import { CheckCircle2, Download, FolderOpen, RotateCcw } from "lucide-react";

import { savePdfAs, revealInFolder } from "@/lib/desktop";
import type { CompressResult } from "../types";
import { fmtBytes } from "../constants";

export function CompressResultCard({
  result,
  onAnother,
}: {
  result: CompressResult;
  onAnother: () => void;
}) {
  const { stats, pdf, fileName } = result;
  const [savedPath, setSavedPath] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const p = await savePdfAs(fileName, pdf);
      if (p) setSavedPath(p);
    } finally {
      setSaving(false);
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
          <h2 className="text-[16px] font-bold">Compression complete</h2>
          <p className="truncate text-[13px] text-muted-foreground">
            {fmtBytes(stats.originalBytes)} → <span className="font-semibold text-emerald">{fmtBytes(stats.compressedBytes)}</span>
          </p>
        </div>
        <div className="ml-auto shrink-0 rounded-lg bg-emerald-soft px-3 py-1.5 text-center">
          <p className="tnum text-[18px] font-bold leading-none text-emerald">
            {stats.savedPercent.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground">smaller</p>
        </div>
      </div>

      {/* Stat grid */}
      <div className="mt-5 grid grid-cols-4 divide-x divide-hairline overflow-hidden rounded-lg border border-hairline">
        <Stat label="Original" value={fmtBytes(stats.originalBytes)} />
        <Stat label="Compressed" value={fmtBytes(stats.compressedBytes)} />
        <Stat label="Saved" value={fmtBytes(stats.originalBytes - stats.compressedBytes)} />
        <Stat label="Images" value={`${stats.imagesRecompressed}/${stats.imagesSeen || 0}`} />
      </div>

      {/* Honesty line */}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {stats.imagesSkippedCodec > 0 &&
          `${stats.imagesSkippedCodec} image${stats.imagesSkippedCodec === 1 ? "" : "s"} skipped (unsupported format) · `}
        {stats.targetMet === false &&
          `couldn't reach the target size — best effort applied · `}
        processed on-device
      </p>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-emerald px-4 py-2 text-[13px] font-semibold text-emerald-foreground hover:brightness-105 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> {saving ? "Saving…" : "Save as…"}
        </button>
        <button
          type="button"
          disabled={!savedPath}
          onClick={() => savedPath && revealInFolder(savedPath)}
          className="flex items-center gap-1.5 rounded-lg border border-hairline px-4 py-2 text-[13px] hover:bg-surface-raised disabled:opacity-40"
        >
          <FolderOpen className="h-4 w-4" /> Reveal in folder
        </button>
        <button
          type="button"
          onClick={onAnother}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" /> Do another
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
