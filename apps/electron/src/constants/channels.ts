// ─── IPC Channel Name Constants ───────────────────────────────────────────────
// Single source of truth — used in both preload and ipc handlers.

export const Channels = {
  // App
  APP_GET_PLATFORM:  "app:get-platform",
  APP_GET_VERSION:   "app:get-version",
  // Shell
  SHELL_OPEN_EXTERNAL: "shell:open-external",
  // PDF operations
  PDF_UNLOCK:  "pdf:unlock",
  PDF_PROTECT: "pdf:protect",
  PDF_COMPARE: "pdf:compare",
  PDF_MERGE:   "pdf:merge",
  PDF_SPLIT:   "pdf:split",
  PDF_SIGN:    "pdf:sign",
  PDF_VERIFY:  "pdf:verify",
  PDF_CERT_INFO: "pdf:cert-info",
  // PDF Redaction
  PDF_REDACT_INFO:   "pdf:redact-info",
  PDF_REDACT_SEARCH: "pdf:redact-search",
  PDF_REDACT_PREVIEW: "pdf:redact-preview",
  PDF_REDACT:       "pdf:redact",
  // OCR operations
  PDF_OCR_START:       "pdf:ocr-start",
  PDF_OCR_CANCEL:      "pdf:ocr-cancel",
  PDF_OCR_PROGRESS:    "pdf:ocr-progress",
  PDF_OCR_PAGE_RESULT: "pdf:ocr-page-result",
  PDF_OCR_RENDER_PAGE: "pdf:ocr-render-page",
  PDF_OCR_EXPORT:      "pdf:ocr-export",
} as const

export type ChannelName = (typeof Channels)[keyof typeof Channels]
