import { create } from "zustand"
import type {
  OCRState,
  OCRStep,
  OCRUploadedFile,
  OCRPageResult,
  OCRTextBlock,
  OCRJobOptions,
  ExportFormat,
} from "@/features/optimize/ocr/types"

interface OCRStore extends OCRState {
  // File actions
  setUploadedFile: (file: OCRUploadedFile | null) => void
  
  // Processing actions
  setStep: (step: OCRStep) => void
  setJobId: (jobId: string | null) => void
  setProgress: (currentPage: number, totalPages: number) => void
  setError: (msg: string | null) => void
  
  // Results actions
  addPageResult: (result: OCRPageResult) => void
  setPageImage: (page: number, imageBase64: string) => void
  setCompletionData: (confidence: number, languages: string[]) => void
  
  // Workspace actions
  setActivePage: (page: number) => void
  setZoom: (zoom: number) => void
  togglePanel: (panel: "original" | "editable" | "intelligence") => void
  
  // Edit actions
  updateTextBlock: (pageNum: number, blockId: string, updates: Partial<OCRTextBlock>) => void
  resetBlockEdits: (blockId: string) => void
  
  // Options
  setOptions: (options: Partial<OCRJobOptions>) => void
  
  // Export
  setExportFormat: (format: ExportFormat | null) => void
  setExportUrl: (url: string | null) => void
  
  // Reset
  reset: () => void
}

const defaultOptions: OCRJobOptions = {
  languages: ["en"],
  dpi: 300,
  enableGpu: false,
}

const initialState: OCRState = {
  uploadedFile: null,
  step: "idle",
  jobId: null,
  currentPage: 0,
  totalPages: 0,
  errorMessage: null,
  pageResults: new Map(),
  pageImages: new Map(),
  overallConfidence: 0,
  detectedLanguages: [],
  activePage: 1,
  zoom: 100,
  showOriginal: true,
  showEditable: true,
  showIntelligence: true,
  editedBlocks: new Map(),
  options: defaultOptions,
  exportFormat: null,
  exportUrl: null,
}

export const useOcrStore = create<OCRStore>((set, get) => ({
  ...initialState,

  setUploadedFile: (uploadedFile) =>
    set({ uploadedFile, step: "idle", errorMessage: null }),

  setStep: (step) =>
    set({ step, errorMessage: step === "error" ? get().errorMessage : null }),

  setJobId: (jobId) => set({ jobId }),

  setProgress: (currentPage, totalPages) =>
    set({ currentPage, totalPages }),

  setError: (errorMessage) =>
    set({ errorMessage, step: "error" }),

  addPageResult: (result) =>
    set((state) => {
      const newResults = new Map(state.pageResults)
      newResults.set(result.page, result)
      return { pageResults: newResults }
    }),

  setPageImage: (page, imageBase64) =>
    set((state) => {
      const newImages = new Map(state.pageImages)
      newImages.set(page, imageBase64)
      return { pageImages: newImages }
    }),

  setCompletionData: (overallConfidence, detectedLanguages) =>
    set({ overallConfidence, detectedLanguages, step: "complete" }),

  setActivePage: (activePage) => set({ activePage }),

  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(400, zoom)) }),

  togglePanel: (panel) => {
    switch (panel) {
      case "original":
        set((s) => ({ showOriginal: !s.showOriginal }))
        break
      case "editable":
        set((s) => ({ showEditable: !s.showEditable }))
        break
      case "intelligence":
        set((s) => ({ showIntelligence: !s.showIntelligence }))
        break
    }
  },

  updateTextBlock: (pageNum, blockId, updates) =>
    set((state) => {
      const pageResult = state.pageResults.get(pageNum)
      if (!pageResult) return state

      const newResults = new Map(state.pageResults)
      const updatedBlocks = pageResult.textBlocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...updates,
              edited: true,
              originalText: block.originalText ?? block.text,
            }
          : block
      )
      newResults.set(pageNum, { ...pageResult, textBlocks: updatedBlocks })

      const newEdited = new Map(state.editedBlocks)
      const existingBlock = pageResult.textBlocks.find((b) => b.id === blockId)
      if (existingBlock) {
        newEdited.set(blockId, { ...existingBlock, ...updates, edited: true })
      }

      return { pageResults: newResults, editedBlocks: newEdited }
    }),

  resetBlockEdits: (blockId) =>
    set((state) => {
      const newEdited = new Map(state.editedBlocks)
      newEdited.delete(blockId)
      // Also revert in page results
      const newResults = new Map(state.pageResults)
      for (const [page, result] of newResults) {
        const updatedBlocks = result.textBlocks.map((block) =>
          block.id === blockId && block.originalText
            ? { ...block, text: block.originalText, edited: false }
            : block
        )
        newResults.set(page, { ...result, textBlocks: updatedBlocks })
      }
      return { editedBlocks: newEdited, pageResults: newResults }
    }),

  setOptions: (options) =>
    set((state) => ({ options: { ...state.options, ...options } })),

  setExportFormat: (exportFormat) => set({ exportFormat }),

  setExportUrl: (exportUrl) => set({ exportUrl }),

  reset: () => {
    const state = get()
    if (state.exportUrl) URL.revokeObjectURL(state.exportUrl)
    set({ ...initialState, pageResults: new Map(), pageImages: new Map(), editedBlocks: new Map() })
  },
}))
