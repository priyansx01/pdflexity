/**
 * The single typed surface of the backend adapter (`window.electronAPI`),
 * installed by `lib/backend.ts`. Every component imports these types instead
 * of casting to `any`. Keep in sync with `src-tauri/src/commands/*` return
 * shapes (they serialize as camelCase JSON).
 */

// ─── Result envelopes ─────────────────────────────────────────────────────────

/** File-producing op: base64 PDF + output filename. */
export type PdfBytesResult =
  | { success: true; data: string; fileName: string }
  | { success: false; error: string };

/** Arbitrary-JSON-producing op (verify, certInfo, redact info/search/preview…). */
export type DataResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Split: one merged file, or many extracted files. */
export type SplitResult =
  | { success: true; data: ArrayBuffer; fileName: string; isMultiple?: false }
  | {
      success: true;
      data: { name: string; buffer: ArrayBuffer }[];
      isMultiple: true;
    }
  | { success: false; error: string };

// ─── Redaction shapes ─────────────────────────────────────────────────────────

export interface RedactionMark {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  label?: string;
  labelColor?: string;
}

export interface RedactionInfo {
  pageCount: number;
  pages: { page: number; width: number; height: number }[];
}

export interface SearchMatch {
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SearchResult {
  matches: SearchMatch[];
  total: number;
}

export interface PreviewResult {
  imageBase64: string;
  width: number;
  height: number;
}

export interface RedactApplyResult {
  success: true;
  data: string;
  fileName: string;
  marksApplied: number;
  pagesAffected: number[];
}

// ─── Sign / Compare shapes ────────────────────────────────────────────────────

export interface SignatureZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignatureAppearance {
  showName: boolean;
  showDate: boolean;
  showReason: boolean;
}

export interface SignOptions {
  pdfBytes: ArrayBuffer;
  certPath: string;
  passphrase: string;
  page: number;
  zone: SignatureZone;
  reason: string;
  location: string;
  contact: string;
  appearance: SignatureAppearance | null;
  fileName?: string;
}

export interface SignatureEntry {
  name?: string;
  reason?: string;
  location?: string;
  contact?: string;
  date?: string;
  valid?: boolean;
  [key: string]: unknown; // engine may add fields; callers use known ones
}

export interface VerifyData {
  signatures: SignatureEntry[];
  signed?: boolean;
  [key: string]: unknown;
}

export interface CertInfo {
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  [key: string]: unknown;
}

export interface CompareChange {
  page: number;
  type: string;
  [key: string]: unknown;
}

export interface CompareData {
  pages: CompareChange[];
  totalAdded: number;
  totalDeleted: number;
  changedPages: number;
  totalPages: number;
  similarity: number;
  [key: string]: unknown;
}

// ─── OCR shapes ───────────────────────────────────────────────────────────────

export interface OCRCompletionData {
  totalPages?: number;
  overallConfidence?: number;
  detectedLanguages?: string[];
  [key: string]: unknown;
}

export type OCRStartResult =
  | { success: true; jobId: string; data: OCRCompletionData }
  | { success: false; error: string };

export interface OCRProgressEvent {
  type?: string;
  status?: string;
  currentPage?: number;
  totalPages?: number;
  jobId?: string;
}

export interface OCRPagePayload {
  type: "page-result" | "page-image";
  jobId?: string;
  pageResult?: {
    page: number;
    width: number;
    height: number;
    textBlocks: unknown[];
    avgConfidence: number;
    processingTimeMs: number;
    language: string;
  };
  pageImage?: { page: number; imageBase64: string };
}

export type OCRCancelResult =
  | { success: true }
  | { success: false; error?: string };

export type OCRExportResult = PdfBytesResult;

// ─── The API object installed on window ──────────────────────────────────────

export interface PdfAPI {
  unlock: (buffer: ArrayBuffer, password: string, fileName: string) => Promise<PdfBytesResult>;
  protect: (buffer: ArrayBuffer, password: string, fileName: string) => Promise<PdfBytesResult>;
  compare: (bufferA: ArrayBuffer, bufferB: ArrayBuffer) => Promise<DataResult<CompareData>>;
  merge: (
    files: { buffer: ArrayBuffer; name: string }[],
    fileName: string,
  ) => Promise<PdfBytesResult>;
  split: (
    buffer: ArrayBuffer,
    fileName: string,
    pageRanges: string[],
    mergeOutput: boolean,
  ) => Promise<SplitResult>;
  rotate: (
    buffer: ArrayBuffer,
    fileName: string,
    angle: number,
    pages?: string,
  ) => Promise<PdfBytesResult>;
  repair: (buffer: ArrayBuffer, fileName: string) => Promise<PdfBytesResult>;
  sign: (options: SignOptions) => Promise<PdfBytesResult>;
  verify: (buffer: ArrayBuffer) => Promise<DataResult<VerifyData>>;
  certInfo: (certPath: string, passphrase: string) => Promise<DataResult<CertInfo>>;
  redact: {
    info: (buffer: ArrayBuffer) => Promise<DataResult<RedactionInfo>>;
    search: (
      buffer: ArrayBuffer,
      query: string,
      caseSensitive?: boolean,
      regex?: boolean,
    ) => Promise<DataResult<SearchResult>>;
    preview: (
      buffer: ArrayBuffer,
      page: number,
      scale?: number,
      marks?: RedactionMark[],
    ) => Promise<DataResult<PreviewResult>>;
    apply: (
      buffer: ArrayBuffer,
      fileName: string,
      marks: RedactionMark[],
    ) => Promise<RedactApplyResult | { success: false; error: string }>;
  };
  ocr: {
    start: (
      buffer: ArrayBuffer,
      fileName: string,
      languages: string[],
      dpi: number,
    ) => Promise<OCRStartResult>;
    cancel: (jobId: string) => Promise<OCRCancelResult>;
    renderPage: (
      buffer: ArrayBuffer,
      page: number,
      scale: number,
    ) => Promise<DataResult<{ page: number; imageBase64: string; width: number; height: number }>>;
    export: (
      buffer: ArrayBuffer,
      fileName: string,
      format: string,
      ocrData: unknown,
      edits?: unknown,
    ) => Promise<OCRExportResult>;
    onProgress: (callback: (event: unknown, data: OCRProgressEvent) => void) => void;
    onPageResult: (callback: (event: unknown, data: OCRPagePayload) => void) => void;
    removeListeners: () => void;
  };
}

export interface ElectronAPI {
  getPlatform: () => Promise<string>;
  getVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  pdf: PdfAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/** Typed accessor for the backend adapter (null when not installed yet). */
export function getElectronAPI(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  return window.electronAPI ?? null;
}
