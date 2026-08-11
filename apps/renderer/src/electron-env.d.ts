// Type definitions for Electron APIs exposed via preload contextBridge
// Keep in sync with apps/electron/src/preload.ts

type PdfUnlockResult =
  | { success: true;  data: string; fileName: string }
  | { success: false; error: string }

type PdfProtectResult =
  | { success: true;  data: string; fileName: string }
  | { success: false; error: string }

type PdfCompareResult =
  | { success: true; data: unknown }
  | { success: false; error: string }

type PdfMergeResult =
  | { success: true; data: string; fileName: string }
  | { success: false; error: string }

type PdfSplitResult =
  | { success: true; data: ArrayBuffer; fileName: string; isMultiple?: false }
  | { success: true; data: { name: string; buffer: ArrayBuffer }[]; isMultiple: true }
  | { success: false; error: string }

type PdfSignResult =
  | { success: true; data: string; fileName: string }
  | { success: false; error: string }

type PdfVerifyResult =
  | { success: true; data: unknown }
  | { success: false; error: string }

type PdfCertInfoResult =
  | { success: true; data: unknown }
  | { success: false; error: string }

// Redaction types
interface RedactionMark {
  page: number
  x: number
  y: number
  width: number
  height: number
  fillColor?: string
  label?: string
  labelColor?: string
}

interface RedactionInfo {
  pageCount: number
  pages: { page: number; width: number; height: number }[]
}

interface SearchMatch {
  page: number
  text: string
  x: number
  y: number
  width: number
  height: number
}

interface SearchResult {
  matches: SearchMatch[]
  total: number
}

interface PreviewResult {
  imageBase64: string
  width: number
  height: number
}

interface RedactApplyResult {
  success: true
  data: string
  fileName: string
  marksApplied: number
  pagesAffected: number[]
}

interface ElectronAPI {
  getPlatform: () => Promise<string>
  getVersion: () => Promise<string>
  openExternal: (url: string) => Promise<void>
  pdf: {
    unlock: (buffer: ArrayBuffer, password: string, fileName: string) => Promise<PdfUnlockResult>
    protect: (buffer: ArrayBuffer, password: string, fileName: string) => Promise<PdfProtectResult>
    compare: (bufferA: ArrayBuffer, bufferB: ArrayBuffer) => Promise<PdfCompareResult>
    merge: (files: { buffer: ArrayBuffer; name: string }[], fileName: string) => Promise<PdfMergeResult>
    split: (buffer: ArrayBuffer, fileName: string, pageRanges: string[], mergeOutput: boolean) => Promise<PdfSplitResult>
    sign: (options: unknown) => Promise<PdfSignResult>
    verify: (buffer: ArrayBuffer) => Promise<PdfVerifyResult>
    certInfo: (certPath: string, passphrase: string) => Promise<PdfCertInfoResult>
    redact: {
      info: (buffer: ArrayBuffer) => Promise<{ success: true; data: RedactionInfo } | { success: false; error: string }>
      search: (buffer: ArrayBuffer, query: string, caseSensitive?: boolean, regex?: boolean) => Promise<{ success: true; data: SearchResult } | { success: false; error: string }>
      preview: (buffer: ArrayBuffer, page: number, scale?: number, marks?: RedactionMark[]) => Promise<{ success: true; data: PreviewResult } | { success: false; error: string }>
      apply: (buffer: ArrayBuffer, fileName: string, marks: RedactionMark[]) => Promise<RedactApplyResult | { success: false; error: string }>
    }
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
