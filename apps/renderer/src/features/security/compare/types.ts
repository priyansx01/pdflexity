// ─── Compare PDF — Shared Types ───────────────────────────────────────────────

export type CompareStep = "idle" | "loading" | "ready" | "error"
export type DiffMode   = "semantic" | "overlay"

export interface TextItem {
  str:       string
  transform: number[]   // [scaleX, skewX, skewY, scaleY, translateX, translateY]
  width:     number
  height:    number
  fontName?: string
}

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export interface DiffChange {
  type:      "insert" | "delete" | "equal"
  text:      string
  leftBbox?: BBox
  rightBbox?: BBox
}

export interface PageDiff {
  page:         number
  changes:      DiffChange[]
  addedChars:   number
  deletedChars: number
  similarity:   number   // 0–100
}

export interface CompareStats {
  totalAdded:   number
  totalDeleted: number
  changedPages: number
  totalPages:   number
  similarity:   number   // 0–100 overall
}

export interface CompareState {
  step:         CompareStep
  fileA:        File | null
  fileB:        File | null
  bufferA:      ArrayBuffer | null
  bufferB:      ArrayBuffer | null
  diffs:        PageDiff[]
  stats:        CompareStats | null
  currentPage:  number
  totalPages:   number
  scale:        number
  mode:         DiffMode
  searchQuery:  string
  errorMessage: string | null
  syncScroll:   boolean
}

export const INITIAL_STATE: CompareState = {
  step:         "idle",
  fileA:        null,
  fileB:        null,
  bufferA:      null,
  bufferB:      null,
  diffs:        [],
  stats:        null,
  currentPage:  1,
  totalPages:   0,
  scale:        1.0,
  mode:         "overlay",
  searchQuery:  "",
  errorMessage: null,
  syncScroll:   true,
}
