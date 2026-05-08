// ─── OCR Feature Type Definitions ─────────────────────────────────────────────

/** Bounding box in PDF coordinate space */
export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

/** OCR processing stage identifiers */
export type OCRStep =
  | "idle"
  | "uploading"
  | "rendering"
  | "detecting-layout"
  | "running-ocr"
  | "rebuilding"
  | "complete"
  | "error"

/** Block type classification from layout analysis */
export type BlockType =
  | "heading"
  | "paragraph"
  | "table-cell"
  | "list-item"
  | "caption"
  | "footer"
  | "header"

/** A single OCR-detected text block with layout info */
export interface OCRTextBlock {
  id: string
  text: string
  bbox: BBox
  confidence: number
  type: BlockType
  fontSize: number
  fontWeight: "normal" | "bold"
  fontStyle: "normal" | "italic"
  alignment: "left" | "center" | "right" | "justify"
  lineHeight: number
  color: string
  /** User has modified this block */
  edited?: boolean
  /** Original text before user edits */
  originalText?: string
}

/** A single cell in a detected table */
export interface OCRTableCell {
  row: number
  col: number
  rowSpan: number
  colSpan: number
  text: string
  bbox: BBox
  confidence: number
}

/** A detected table structure */
export interface OCRTable {
  id: string
  bbox: BBox
  rows: number
  cols: number
  cells: OCRTableCell[]
  confidence: number
}

/** A detected image region */
export interface OCRImageRegion {
  id: string
  bbox: BBox
  /** Base64-encoded image data */
  imageData?: string
}

/** Complete OCR result for a single page */
export interface OCRPageResult {
  page: number
  width: number
  height: number
  textBlocks: OCRTextBlock[]
  tables: OCRTable[]
  images: OCRImageRegion[]
  language: string
  avgConfidence: number
  processingTimeMs: number
  /** Base64 page image for preview */
  pageImageBase64?: string
}

/** Progress event streamed from backend */
export interface OCRProgressEvent {
  type: "progress" | "page-result" | "page-image" | "complete" | "error"
  jobId: string
  status?: OCRStep
  currentPage?: number
  totalPages?: number
  /** Included when type === "page-result" */
  pageResult?: OCRPageResult
  /** Included when type === "page-image" */
  pageImage?: { page: number; imageBase64: string; width: number; height: number }
  /** Included when type === "complete" */
  overallConfidence?: number
  detectedLanguages?: string[]
  totalProcessingTimeMs?: number
  /** Included when type === "error" */
  error?: string
}

/** OCR job configuration */
export interface OCRJobOptions {
  languages: string[]
  dpi: number
  enableGpu: boolean
}

/** Export format options */
export type ExportFormat = "editable-pdf" | "searchable-pdf" | "docx" | "json"

/** Uploaded file reference */
export interface OCRUploadedFile {
  name: string
  size: number
  type: string
  buffer: ArrayBuffer
  lastModified: number
}

/** Structure tree node for intelligence panel */
export interface StructureNode {
  id: string
  type: BlockType | "table" | "image" | "page"
  label: string
  page: number
  confidence: number
  children?: StructureNode[]
  blockId?: string
}

/** Full OCR workspace state */
export interface OCRState {
  // File
  uploadedFile: OCRUploadedFile | null
  
  // Processing
  step: OCRStep
  jobId: string | null
  currentPage: number
  totalPages: number
  errorMessage: string | null
  
  // Results
  pageResults: Map<number, OCRPageResult>
  pageImages: Map<number, string> // page -> base64 image
  overallConfidence: number
  detectedLanguages: string[]
  
  // Workspace UI
  activePage: number
  zoom: number
  showOriginal: boolean
  showEditable: boolean
  showIntelligence: boolean
  
  // Edits tracking
  editedBlocks: Map<string, OCRTextBlock> // blockId -> modified block
  
  // Options
  options: OCRJobOptions
  
  // Export
  exportFormat: ExportFormat | null
  exportUrl: string | null
}
