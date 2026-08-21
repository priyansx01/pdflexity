"use client";

import * as React from "react";
import { invoke } from "@tauri-apps/api/core";

import { onJobProgress } from "@/lib/desktop";
import type { CompressResult, CompressSettings, CompressStats, LoadedDoc } from "../types";

/**
 * Orchestrates pdf_compress: invokes the Rust command, surfaces live
 * progress/stage via the job:progress channel, returns typed results.
 */
export function useCompress() {
  const [progress, setProgress] = React.useState(0);
  const [stage, setStage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Subscribe to engine progress once.
  React.useEffect(() => {
    let un: (() => void) | undefined;
    onJobProgress((pct) => setProgress(Math.max(0, Math.min(100, pct)))).then((u) => (un = u));
    return () => un?.();
  }, []);

  const compress = React.useCallback(
    async (
      doc: LoadedDoc,
      settings: CompressSettings,
      onStage?: (stage: string | null) => void,
    ): Promise<CompressResult> => {
      setProgress(0);
      setStage(null);
      setError(null);

      // b64 encode (chunked)
      const u8 = new Uint8Array(doc.buffer);
      const CHUNK = 0x8000;
      let binary = "";
      for (let i = 0; i < u8.length; i += CHUNK) {
        binary += String.fromCharCode(...u8.subarray(i, Math.min(i + CHUNK, u8.length)));
      }
      const bufferB64 = btoa(binary);

      try {
        const targetBytes =
          settings.preset === "custom"
            ? Math.round(settings.targetSizeMb * 1024 * 1024)
            : null;

        const r = await invoke<{
          success: boolean;
          data?: { stats: CompressStats; pdf: string };
          fileName?: string;
          error?: string;
        }>("pdf_compress", {
          bufferB64,
          fileName: doc.name,
          preset: settings.preset,
          targetSizeBytes: targetBytes,
        });

        if (!r.success || !r.data) {
          throw new Error(r.error ?? "Compression failed");
        }
        setProgress(100);
        onStage?.(null);
        return {
          stats: r.data.stats,
          pdf: r.data.pdf,
          fileName: r.fileName ?? `compressed_${doc.name}`,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      }
    },
    [],
  );

  // Stage name translation for UI copy.
  const stageLabel = React.useCallback((s: string | null): string => {
    switch (s) {
      case "Reading document":
        return "Reading document…";
      case "Optimizing structure":
        return "Optimizing structure…";
      case "Recompressing images":
        return "Recompressing images…";
      case "Saving":
        return "Saving…";
      case "Done":
        return "Done";
      default:
        return s ? `${s}…` : "Compressing…";
    }
  }, []);

  return { compress, progress, stage, setStage, stageLabel, error, setError };
}
