export type PdfPage = {
  id: string
  fileId: string // 'blank' for blank pages
  pageNumber: number // 1-indexed original page number
  previewUrl?: string
  rotation: number // 0, 90, 180, 270
  isBlank?: boolean
}

export type UploadedFile = {
  id: string
  name: string
  color: { bg: string; border: string; ring: string; text: string }
  file: File
  numPages: number
}

export type OrganizeState = {
  step: "upload" | "organize" | "processing" | "success"
  files: UploadedFile[]
  pages: PdfPage[]
  errorMessage: string | null
}

export type OrganizeAction =
  | { type: "ADD_FILES"; payload: { files: UploadedFile[], pages: PdfPage[] } }
  | { type: "REORDER_PAGES"; payload: PdfPage[] }
  | { type: "REORDER_FILES"; payload: UploadedFile[] }
  | { type: "DELETE_PAGE"; payload: string } // page id
  | { type: "ROTATE_PAGE"; payload: string } // page id
  | { type: "ADD_BLANK_PAGE"; payload: number } // insert at index
  | { type: "DELETE_FILE"; payload: string } // file id
  | { type: "SET_STEP"; payload: OrganizeState["step"] }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" }

export const FILE_COLORS = [
  { bg: "bg-rose-500/15", border: "border-rose-500/30", ring: "ring-rose-500/50", text: "text-rose-600 dark:text-rose-400" },
  { bg: "bg-cyan-500/15", border: "border-cyan-500/30", ring: "ring-cyan-500/50", text: "text-cyan-600 dark:text-cyan-400" },
  { bg: "bg-amber-500/15", border: "border-amber-500/30", ring: "ring-amber-500/50", text: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-indigo-500/15", border: "border-indigo-500/30", ring: "ring-indigo-500/50", text: "text-indigo-600 dark:text-indigo-400" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/30", ring: "ring-emerald-500/50", text: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-purple-500/15", border: "border-purple-500/30", ring: "ring-purple-500/50", text: "text-purple-600 dark:text-purple-400" },
  { bg: "bg-orange-500/15", border: "border-orange-500/30", ring: "ring-orange-500/50", text: "text-orange-600 dark:text-orange-400" },
]
