import { create } from 'zustand'
import type { MergeState, MergeFile } from '@/features/organize/merge/types'

interface MergeStore extends MergeState {
  addFiles: (files: MergeFile[]) => void
  removeFile: (id: string) => void
  reorderFiles: (files: MergeFile[]) => void
  setStep: (step: MergeState['step']) => void
  setResult: (downloadUrl: string, fileName: string) => void
  setError: (msg: string | null) => void
  reset: () => void
}

export const useMergeStore = create<MergeStore>((set) => ({
  files: [],
  step: "idle",
  errorMessage: null,
  downloadUrl: null,
  fileName: null,

  addFiles: (newFiles) => set((state) => ({
    files: [...state.files, ...newFiles],
    errorMessage: null,
  })),

  removeFile: (id) => set((state) => ({
    files: state.files.filter(f => f.id !== id),
    errorMessage: null,
  })),

  reorderFiles: (files) => set({ files }),

  setStep: (step) => set({ step, errorMessage: null }),

  setResult: (downloadUrl, fileName) => set({
    step: "success",
    downloadUrl,
    fileName,
    errorMessage: null
  }),

  setError: (errorMessage) => set({ errorMessage, step: "error" }),

  reset: () => set((state) => {
    if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl)
    return {
      files: [],
      step: "idle",
      errorMessage: null,
      downloadUrl: null,
      fileName: null,
    }
  })
}))
