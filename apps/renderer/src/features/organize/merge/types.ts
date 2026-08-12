export type MergeStep = "idle" | "loading" | "error" | "success"

export interface MergeFile {
  id: string
  file: File
}

export interface MergeState {
  files: MergeFile[]
  step: MergeStep
  errorMessage: string | null
  downloadUrl: string | null
  fileName: string | null
}
