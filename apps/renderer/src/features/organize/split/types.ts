export type SplitMode = "range" | "pages" | "size"

export type Range = {
  id: string
  from: number
  to: number
}

export type SplitState = {
  file: File | null
  step: "upload" | "split" | "processing" | "success"
  numPages: number
  mode: SplitMode
  ranges: Range[]
  selectedPages: number[]
  maxSizeMB: number
  mergeOutput: boolean
  errorMessage: string | null
}
