/** Compress feature types. */

export type PresetId = "less" | "recommended" | "extreme" | "custom";

export interface CompressSettings {
  preset: PresetId;
  /** MB; only used when preset === "custom". */
  targetSizeMb: number;
}

export interface CompressStats {
  originalBytes: number;
  compressedBytes: number;
  savedPercent: number;
  imagesSeen: number;
  imagesRecompressed: number;
  imagesSkippedCodec: number;
  imagesSkippedOptimal: number;
  preset: string;
  targetMet: boolean;
  targetSizeBytes: number | null;
}

export interface CompressResult {
  stats: CompressStats;
  /** base64 PDF — saved via savePdfAs on demand. */
  pdf: string;
  fileName: string;
}

export type CompressPhase = "empty" | "loaded" | "running" | "done" | "error";

export interface LoadedDoc {
  buffer: ArrayBuffer;
  name: string;
  size: number;
  pages: number | null;
}
