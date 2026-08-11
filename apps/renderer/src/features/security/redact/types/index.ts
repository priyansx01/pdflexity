export type RedactionStep = "idle" | "loading" | "loaded" | "preview" | "processing" | "success" | "error"

export interface RedactionMark {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  label?: string
  source: "manual" | "search"
  searchTerm?: string
}

export interface SearchResult {
  id: string
  page: number
  text: string
  x: number
  y: number
  width: number
  height: number
  selected: boolean
}

export interface PageDimension {
  width: number
  height: number
}

export interface RedactionAppearance {
  fillColor: string
  overlayLabel: string
  labelColor: string
}

export interface RedactionState {
  pdfFile: File | null
  pdfBytes: ArrayBuffer | null
  pdfPath: string | null
  totalPages: number
  pageDimensions: PageDimension[]
  currentPage: number
  zoom: number
  viewerScale: number
  marks: RedactionMark[]
  selectedMarkIds: string[]
  drawingMode: boolean
  appearance: RedactionAppearance
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean
  step: RedactionStep
  error: string | null
  resultUrl: string | null
  resultFileName: string | null
  marksApplied: number
}
