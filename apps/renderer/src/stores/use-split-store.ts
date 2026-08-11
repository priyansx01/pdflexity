import { create } from 'zustand'
import type { SplitState, SplitMode, Range } from '@/features/organize/split/types'

interface SplitStore extends SplitState {
  setFile: (file: File) => void
  setNumPages: (numPages: number) => void
  setStep: (step: SplitState['step']) => void
  setMode: (mode: SplitMode) => void
  addRange: () => void
  updateRange: (id: string, from: number, to: number) => void
  removeRange: (id: string) => void
  togglePageSelection: (page: number) => void
  setMaxSize: (mb: number) => void
  setMergeOutput: (merge: boolean) => void
  setError: (msg: string | null) => void
  reset: () => void
}

export const useSplitStore = create<SplitStore>((set) => ({
  file: null,
  step: "upload",
  numPages: 0,
  mode: "range",
  ranges: [{ id: crypto.randomUUID(), from: 1, to: 1 }],
  selectedPages: [],
  maxSizeMB: 5,
  mergeOutput: false,
  errorMessage: null,

  setFile: (file) => set({ file, step: "split", errorMessage: null }),
  setNumPages: (numPages) => set((state) => ({
    numPages,
    ranges: [{ id: state.ranges[0]?.id || crypto.randomUUID(), from: 1, to: numPages }]
  })),
  setStep: (step) => set({ step }),
  setMode: (mode) => set({ mode }),
  
  addRange: () => set((state) => {
    const lastRange = state.ranges[state.ranges.length - 1]
    const nextFrom = lastRange ? Math.min(lastRange.to + 1, state.numPages) : 1
    const nextTo = state.numPages
    return {
      ranges: [...state.ranges, { id: crypto.randomUUID(), from: nextFrom, to: nextTo }]
    }
  }),
  
  updateRange: (id, from, to) => set((state) => ({
    ranges: state.ranges.map(r => r.id === id ? { ...r, from, to } : r)
  })),
  
  removeRange: (id) => set((state) => ({
    ranges: state.ranges.filter(r => r.id !== id)
  })),
  
  togglePageSelection: (page) => set((state) => {
    const isSelected = state.selectedPages.includes(page)
    return {
      selectedPages: isSelected
        ? state.selectedPages.filter(p => p !== page)
        : [...state.selectedPages, page].sort((a, b) => a - b)
    }
  }),
  
  setMaxSize: (maxSizeMB) => set({ maxSizeMB }),
  setMergeOutput: (mergeOutput) => set({ mergeOutput }),
  setError: (errorMessage) => set({ errorMessage }),
  
  reset: () => set({
    file: null,
    step: "upload",
    numPages: 0,
    ranges: [{ id: crypto.randomUUID(), from: 1, to: 1 }],
    selectedPages: [],
    errorMessage: null,
  })
}))
