import type { PresetId } from "./types";

/** Preset metadata — copy is user-facing, tune freely. */
export const PRESETS: {
  id: Exclude<PresetId, "custom">;
  label: string;
  description: string;
  /** Slider position 0–100. */
  position: number;
}[] = [
  {
    id: "less",
    label: "Less compression",
    description: "High quality, less compression — structure optimization only",
    position: 0,
  },
  {
    id: "recommended",
    label: "Recommended Compression",
    description: "Good quality, good compression — images re-encoded at high quality",
    position: 50,
  },
  {
    id: "extreme",
    label: "Extreme Compression",
    description: "Less quality, high compression — images downsampled and re-encoded",
    position: 100,
  },
];

export const DEFAULT_SETTINGS: { preset: PresetId; targetSizeMb: number } = {
  preset: "recommended",
  targetSizeMb: 1,
};

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
