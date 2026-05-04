import { create } from 'zustand'
import type { CompareState, PageDiff, CompareStats, DiffMode } from '@/features/security/compare/types'

interface CompareStore extends CompareState {
  setFileA: (fileA: File | null, bufferA: ArrayBuffer | null) => void
  setFileB: (fileB: File | null, bufferB: ArrayBuffer | null) => void
  setStep: (step: CompareState['step']) => void
  setResult: (diffs: PageDiff[], stats: CompareStats, totalPages: number) => void
  setCurrentPage: (currentPage: number) => void
  setTotalPages: (totalPages: number) => void
  setScale: (scale: number) => void
  setMode: (mode: DiffMode) => void
  setSearchQuery: (searchQuery: string) => void
  setSyncScroll: (syncScroll: boolean) => void
  setError: (msg: string | null) => void
  clearA: () => void
  clearB: () => void
}

export const useCompareStore = create<CompareStore>((set) => ({
  step:         "idle",
  fileA:        null,
  fileB:        null,
  bufferA:      null,
  bufferB:      null,
  diffs:        [],
  stats:        null,
  currentPage:  1,
  totalPages:   0,
  scale:        1.0,
  mode:         "overlay",
  searchQuery:  "",
  errorMessage: null,
  syncScroll:   true,

  setFileA: (fileA, bufferA) => set({ fileA, bufferA }),
  setFileB: (fileB, bufferB) => set({ fileB, bufferB }),
  setStep: (step) => set({ step }),

  setResult: (diffs, stats, totalPages) => set({
    step: "ready",
    diffs,
    stats,
    totalPages,
    errorMessage: null
  }),

  setCurrentPage: (currentPage) => set({ currentPage }),
  setTotalPages: (totalPages) => set((state) => ({ totalPages: Math.max(totalPages, state.totalPages) })),
  setScale: (scale) => set({ scale }),
  setMode: (mode) => set({ mode }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSyncScroll: (syncScroll) => set({ syncScroll }),
  
  setError: (errorMessage) => set({ errorMessage, step: "error" }),

  clearA: () => set({ fileA: null, bufferA: null, diffs: [], stats: null, step: "idle" }),
  clearB: () => set({ fileB: null, bufferB: null, diffs: [], stats: null, step: "idle" }),
}))
