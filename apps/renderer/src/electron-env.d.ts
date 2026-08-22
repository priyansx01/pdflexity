/**
 * Type declarations for the backend adapter installed on `window.electronAPI`
 * by `lib/backend.ts`. Single source of truth: `lib/backend-types.ts`.
 */

export type {
  ElectronAPI,
  PdfAPI,
  PdfBytesResult,
  DataResult,
  SplitResult,
  RedactionMark,
  RedactionInfo,
  SearchMatch,
  SearchResult,
  PreviewResult,
  RedactApplyResult,
  SignatureZone,
  SignatureAppearance,
  SignOptions,
  SignatureEntry,
  VerifyData,
  CertInfo,
  CompareChange,
  CompareData,
  OCRCompletionData,
  OCRStartResult,
  OCRProgressEvent,
  OCRPagePayload,
  OCRCancelResult,
  OCRExportResult,
} from "@/lib/backend-types";
